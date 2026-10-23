import { useEffect, useMemo, useState } from "react";
import { Activity, Check, Minus, RefreshCw, Search, X } from "lucide-react";
import { CandleChart } from "@/components/candle-chart";
import { formatClock, formatCompact, formatPercent, formatPrice } from "@/lib/format";
import { scanMarket, type CoinScan, type Interval, type ScanResult } from "@/lib/scan.functions";

const INTERVALS: Array<{ id: Interval; label: string }> = [
  { id: "1h", label: "۱ ساعته" },
  { id: "4h", label: "۴ ساعته" },
  { id: "1d", label: "روزانه" },
];

const FILTERS = [
  { id: "all", label: "همه" },
  { id: "signal", label: "سیگنال" },
  { id: "buy", label: "خرید" },
  { id: "sell", label: "فروش" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function Scanner() {
  const [interval, setInterval] = useState<Interval>("1h");
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void scanMarket({ data: { interval, force: nonce > 0 }, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const message = reason instanceof Error ? reason.message : "اسکن بازار ناموفق بود";
        setError(message);
        setLoading(false);
      });
    return () => controller.abort();
  }, [interval, nonce]);

  useEffect(() => {
    if (!data) return;
    if (selected && data.coins.some((coin) => coin.pair === selected)) return;
    const next = data.coins.find((coin) => coin.signal) ?? data.coins[0];
    setSelected(next?.pair ?? null);
  }, [data, selected]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.coins ?? []).filter((coin) => {
      if (filter === "signal" && !coin.signal) return false;
      if (filter === "buy" && coin.signal?.side !== "buy") return false;
      if (filter === "sell" && coin.signal?.side !== "sell") return false;
      if (!q) return true;
      return coin.symbol.toLowerCase().includes(q) || coin.name.toLowerCase().includes(q);
    });
  }, [data, filter, query]);

  const coin = data?.coins.find((item) => item.pair === selected) ?? visible[0] ?? null;
  const buys = data?.coins.filter((item) => item.signal?.side === "buy").length ?? 0;
  const sells = data?.coins.filter((item) => item.signal?.side === "sell").length ?? 0;
  const wickRejects = data?.coins.filter((item) => !item.analysis.wickPass).length ?? 0;
  const zigzagRejects = data?.coins.filter((item) => !item.analysis.zigzagPass).length ?? 0;
  const stale = Boolean(data && data.interval !== interval);

  return (
    <main className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium text-accent">
              <Activity className="size-4" aria-hidden="true" />
              ۶۰ کندل آخر · سقف و کف سوینگ
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">سوینگ‌اسکن</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              روی صد ارز برتر بدون استیبل، پولبک کندل به سوینگ‌لو سیگنال خرید است و پولبک به سوینگ‌های سیگنال فروش.
              حد ضرر پشت همان سوینگ می‌نشیند و حد سود با نسبت یک به دو محاسبه می‌شود.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="grid grid-cols-3 rounded-lg border border-border bg-surface p-1" role="tablist" aria-label="تایم‌فریم">
              {INTERVALS.map((item) => {
                const active = interval === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setInterval(item.id)}
                    className={
                      active
                        ? "min-h-11 rounded-md bg-accent px-3 text-sm font-semibold text-ink"
                        : "min-h-11 rounded-md px-3 text-sm text-muted transition-colors hover:text-fg"
                    }
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setNonce((value) => value + 1)}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm text-fg transition-colors hover:bg-surface-2 disabled:opacity-60"
            >
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
              اسکن دوباره
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
        <section className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="خلاصه اسکن">
          <Stat label="سیگنال خرید" value={String(buys)} tone="buy" />
          <Stat label="سیگنال فروش" value={String(sells)} tone="sell" />
          <Stat label="رد به‌خاطر سایه" value={String(wickRejects)} />
          <Stat label="رد به‌خاطر زیگزاگ" value={String(zigzagRejects)} />
        </section>

        {error ? (
          <div className="rounded-lg border border-sell/40 bg-surface px-4 py-3 text-sm">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setNonce((value) => value + 1)}
              className="mt-3 min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-ink"
            >
              تلاش دوباره
            </button>
          </div>
        ) : null}

        <section className="workspace">
          <div className="flex min-w-0 flex-col gap-3">
            <label className="relative block">
              <span className="sr-only">جستجوی ارز</span>
              <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="نماد یا نام ارز"
                className="min-h-11 w-full rounded-lg border border-border bg-surface pr-10 pl-3 text-sm text-fg placeholder:text-muted"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => {
                const active = filter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={
                      active
                        ? "min-h-11 rounded-lg bg-surface-2 px-3 text-sm text-fg"
                        : "min-h-11 rounded-lg border border-border px-3 text-sm text-muted"
                    }
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="list-frame overflow-y-auto rounded-lg border border-border bg-surface">
              {loading && !data ? (
                <ul className="divide-y divide-border">
                  {Array.from({ length: 8 }, (_, index) => (
                    <li key={index} className="px-3 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
                      <div className="mt-2 h-3 w-40 animate-pulse rounded bg-surface-2" />
                    </li>
                  ))}
                </ul>
              ) : visible.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">ارزی با این فیلتر پیدا نشد.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {visible.map((item) => (
                    <li key={item.pair}>
                      <CoinRow
                        coin={item}
                        active={item.pair === coin?.pair}
                        onSelect={() => setSelected(item.pair)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs text-muted">
              {data
                ? `${data.universe.toLocaleString("fa-IR")} ارز · ${data.source} · ${formatClock(data.scannedAt)}`
                : loading
                  ? "در حال خواندن ۶۰ کندل از ارزهای برتر…"
                  : "اسکنی انجام نشده"}
              {stale && loading ? " · در حال به‌روزرسانی" : ""}
            </p>
          </div>

          <div className="min-w-0">
            {coin ? (
              <Detail coin={coin} interval={data?.interval ?? interval} />
            ) : (
              <div className="rounded-lg border border-border bg-surface px-4 py-16 text-center text-sm text-muted">
                {loading ? "چارت بعد از رسیدن کندل‌ها اینجا می‌آید." : "ارزی برای نمایش نیست."}
              </div>
            )}
          </div>
        </section>

        <p className="pb-6 text-xs leading-6 text-muted">
          سیگنال فقط وقتی صادر می‌شود که سایه ۶۰ کندل زیاد نباشد، زیگزاگ تمیز باشد، برای خرید قله بالاتر از دره و برای فروش دره پایین‌تر از قله باشد، و کندل به همان سطح پولبک زده باشد. این ابزار توصیه معامله نیست.
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "buy" | "sell" }) {
  const color = tone === "buy" ? "text-buy" : tone === "sell" ? "text-sell" : "text-fg";
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 font-mono text-xl ${color}`} dir="ltr">
        {value}
      </p>
    </div>
  );
}

function CoinRow({ coin, active, onSelect }: { coin: CoinScan; active: boolean; onSelect: () => void }) {
  const up = coin.change24h >= 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={
        active
          ? "flex w-full items-start justify-between gap-3 bg-surface-2 px-3 py-3 text-right"
          : "flex w-full items-start justify-between gap-3 px-3 py-3 text-right transition-colors hover:bg-surface-2"
      }
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-semibold">{coin.symbol}</span>
          <span className="text-xs text-muted">#{coin.rank}</span>
          {coin.signal ? (
            <span
              className={
                coin.signal.side === "buy"
                  ? "rounded bg-buy/15 px-2 py-0.5 text-xs font-medium text-buy"
                  : "rounded bg-sell/15 px-2 py-0.5 text-xs font-medium text-sell"
              }
            >
              {coin.signal.side === "buy" ? "خرید" : "فروش"}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block truncate text-xs text-muted">{rowHint(coin)}</span>
      </span>
      <span className="shrink-0 text-left" dir="ltr">
        <span className="block font-mono text-sm">{formatPrice(coin.last)}</span>
        <span className={up ? "block font-mono text-xs text-buy" : "block font-mono text-xs text-sell"}>
          {formatPercent(coin.change24h)}
        </span>
      </span>
    </button>
  );
}

function rowHint(coin: CoinScan): string {
  if (coin.signal) {
    return coin.signal.side === "buy"
      ? `پولبک به سوینگ‌لو · ریوارد ${formatPrice(coin.signal.takeProfit)}`
      : `پولبک به سوینگ‌های · ریوارد ${formatPrice(coin.signal.takeProfit)}`;
  }
  if (!coin.analysis.wickPass) return "رد شد: سایه زیاد";
  if (!coin.analysis.zigzagPass) return "رد شد: زیگزاگ نامرتب";
  const low = coin.analysis.distanceToLow;
  const high = coin.analysis.distanceToHigh;
  const parts = [
    low != null ? `تا کف ${formatPercent(low * 100, 2)}` : null,
    high != null ? `تا سقف ${formatPercent(high * 100, 2)}` : null,
  ].filter(Boolean);
  return parts.join(" · ") || coin.analysis.blockReason || coin.name;
}

function Detail({ coin, interval }: { coin: CoinScan; interval: Interval }) {
  const analysis = coin.analysis;
  const signal = coin.signal;
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">
            {coin.symbol}
            <span className="mr-2 text-sm font-normal text-muted">{coin.name}</span>
          </h2>
          <p className="mt-1 text-xs text-muted">
            حجم ۲۴س {formatCompact(coin.quoteVolume)} تتر · رتبه {coin.rank.toLocaleString("fa-IR")}
          </p>
        </div>
        <p className="font-mono text-xl" dir="ltr">
          {formatPrice(coin.last)}
          <span className={coin.change24h >= 0 ? "mr-2 text-sm text-buy" : "mr-2 text-sm text-sell"}>
            {formatPercent(coin.change24h)}
          </span>
        </p>
      </div>
      <CandleChart coin={coin} interval={interval} />
      <div className="grid gap-3 border-t border-border p-4 lg:grid-cols-2">
        <ul className="flex flex-col gap-2 text-sm">
          <CheckRow
            state={analysis.wickPass ? "pass" : "fail"}
            label="نقدینگی کندل‌ها"
            detail={wickDetail(analysis.wickAvg, analysis.wickHeavyShare)}
          />
          <CheckRow
            state={analysis.zigzagPass ? "pass" : "fail"}
            label="زیگزاگ تمیز"
            detail={analysis.zigzagNote}
          />
          <CheckRow
            state={structureState(analysis, signal)}
            label="ساختار قله و دره"
            detail={analysis.structureNote}
          />
          <CheckRow
            state={signal ? "pass" : "wait"}
            label="پولبک به سوینگ"
            detail={
              signal
                ? signal.side === "buy"
                  ? "کندل روی سوینگ‌لو برگشته است"
                  : "کندل به سوینگ‌های برگشته است"
                : (analysis.blockReason ?? "پولبک فعال نیست")
            }
          />
          <CheckRow
            state={signal ? "pass" : "wait"}
            label="ریسک به ریوارد"
            detail={signal ? "یک به دو؛ حد ضرر پشت سوینگ و حد سود دو برابر ریسک" : "بعد از پولبک معتبر حساب می‌شود"}
          />
        </ul>
        {signal ? <Ticket signal={signal} /> : <Levels coin={coin} />}
      </div>
    </article>
  );
}

function wickDetail(avg: number, share: number) {
  return `میانگین سایه ${Math.round(avg * 100).toLocaleString("fa-IR")}٪ · کندل سایه‌سنگین ${Math.round(share * 100).toLocaleString("fa-IR")}٪`;
}

function structureState(analysis: CoinScan["analysis"], signal: CoinScan["signal"]): "pass" | "fail" | "wait" {
  if (signal?.side === "buy") return analysis.buyStructure ? "pass" : "fail";
  if (signal?.side === "sell") return analysis.sellStructure ? "pass" : "fail";
  if (analysis.buyStructure || analysis.sellStructure) return "pass";
  return analysis.zigzagPass ? "wait" : "fail";
}

function CheckRow({ state, label, detail }: { state: "pass" | "fail" | "wait"; label: string; detail: string }) {
  const tone = state === "pass" ? "text-buy" : state === "fail" ? "text-sell" : "text-muted";
  return (
    <li className="flex gap-2">
      <span className={`mt-0.5 ${tone}`} aria-hidden="true">
        {state === "pass" ? <Check className="size-4" /> : state === "fail" ? <X className="size-4" /> : <Minus className="size-4" />}
      </span>
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-muted">{detail}</span>
      </span>
    </li>
  );
}

function Ticket({ signal }: { signal: NonNullable<CoinScan["signal"]> }) {
  const buy = signal.side === "buy";
  const rows = [
    ["ورود", formatPrice(signal.entry)],
    [buy ? "حد ضرر زیر سوینگ‌لو" : "حد ضرر بالای سوینگ‌های", formatPrice(signal.stop)],
    ["حد سود ۱ به ۲", formatPrice(signal.takeProfit)],
    ["ریسک", `${formatPrice(signal.risk)} (${formatPercent((signal.risk / signal.entry) * 100)})`],
    ["ریوارد", formatPrice(signal.reward)],
    [buy ? "سوینگ‌لو" : "سوینگ‌های", formatPrice(signal.level)],
    [buy ? "قله بالاتر" : "دره پایین‌تر", formatPrice(signal.counterpart)],
  ] as const;
  return (
    <div className={buy ? "rounded-lg border border-buy/30 bg-bg p-3" : "rounded-lg border border-sell/30 bg-bg p-3"}>
      <p className={buy ? "text-sm font-semibold text-buy" : "text-sm font-semibold text-sell"}>
        {buy ? "سیگنال خرید" : "سیگنال فروش"}
        <span className="mr-2 font-normal text-muted">نسبت ۱:۲</span>
      </p>
      <dl className="mt-3 flex flex-col gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-muted">{label}</dt>
            <dd className="font-mono text-fg" dir="ltr">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Levels({ coin }: { coin: CoinScan }) {
  const { majorHigh, majorLow, distanceToHigh, distanceToLow } = coin.analysis;
  return (
    <div className="rounded-lg border border-border bg-bg p-3">
      <p className="text-sm font-semibold">سطوح ۶۰ کندل</p>
      <dl className="mt-3 flex flex-col gap-2 text-sm">
        <LevelRow label="بالاترین سوینگ‌های" price={majorHigh?.price ?? null} distance={distanceToHigh} />
        <LevelRow label="پایین‌ترین سوینگ‌لو" price={majorLow?.price ?? null} distance={distanceToLow} />
      </dl>
      <p className="mt-3 text-xs text-muted">{coin.analysis.blockReason}</p>
    </div>
  );
}

function LevelRow({ label, price, distance }: { label: string; price: number | null; distance: number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono" dir="ltr">
        {price == null ? "—" : formatPrice(price)}
        {distance != null ? <span className="mr-2 text-xs text-muted">{formatPercent(distance * 100)}</span> : null}
      </dd>
    </div>
  );
}
