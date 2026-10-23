import { createServerFn } from "@tanstack/react-start";
import { analyzeCandles, type Analysis, type Candle, type TradeSignal } from "@/lib/swing";

export type Interval = "1h" | "4h" | "1d";

export type CoinScan = {
  symbol: string;
  pair: string;
  name: string;
  rank: number;
  last: number;
  change24h: number;
  quoteVolume: number;
  candles: Candle[];
  analysis: Analysis;
  signal: TradeSignal | null;
};

export type ScanResult = {
  interval: Interval;
  scannedAt: number;
  universe: number;
  source: string;
  coins: CoinScan[];
};

const BINANCE = "https://data-api.binance.vision";
const TTL_MS = 45_000;

const STABLES = new Set([
  "USDT", "USDC", "DAI", "FDUSD", "TUSD", "USDP", "USDD", "BUSD", "PYUSD", "USD1",
  "USDE", "USDS", "USDG", "USD0", "RLUSD", "GUSD", "FRAX", "LUSD", "CRVUSD", "GHO",
  "SUSD", "MIM", "ALUSD", "DOLA", "USDY", "USDM", "USTC", "EURC", "EURT", "EURS",
  "AEUR", "EURI", "USDB", "BFUSD", "USDN", "FEI", "USDX", "XUSD", "USDR", "AUSD",
  "USDK", "VAI", "USDJ", "HUSD", "CUSD", "OUSD", "ZUSD", "MUSD", "USN", "RSV",
  "USX", "USDAI", "USDA", "DEUSD", "USDQ", "USR", "LISUSD", "MKUSD", "EUSD",
  "BOLD", "HYUSD", "USDT0", "SATUSD", "USDAT", "SUSDE", "SUSDS", "STABLE", "USDP",
  "PAX", "USDD", "TUSD", "PYUSD",
]);

const ALIAS: Record<string, string> = {
  MATIC: "POL",
  MIOTA: "IOTA",
  XDCE: "XDC",
  RNDR: "RENDER",
  BCHSV: "BSV",
};

type UniverseCoin = { symbol: string; pair: string; name: string; rank: number };
type Ticker = { last: number; change24h: number; quoteVolume: number };

const resultCache = new Map<Interval, { at: number; data: ScanResult }>();
const inflight = new Map<Interval, Promise<ScanResult>>();

function isStable(symbol: string, name: string): boolean {
  const sym = symbol.toUpperCase();
  if (STABLES.has(sym)) return true;
  const label = name.toLowerCase();
  if (label.includes("gold")) return false;
  if (label.includes("stablecoin") || label.includes("stable coin")) return true;
  if (/\busd\b/.test(label) && /(dollar|coin|paypal|ripple|ethena|digital|trueusd|binance)/.test(label)) {
    return true;
  }
  return false;
}

function isLeveraged(symbol: string): boolean {
  return /(UP|DOWN|BULL|BEAR)$/.test(symbol) && symbol.length > 4;
}

async function fetchJson(url: string, attempts = 3): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (response.status === 429 || response.status === 418 || response.status >= 500) {
        await delay(350 * (attempt + 1));
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      await delay(280 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("دریافت داده بازار ناموفق بود");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapPool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      out[index] = await task(items[index]!);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return out;
}

async function loadSpotBases(): Promise<Set<string>> {
  const payload = (await fetchJson(`${BINANCE}/api/v3/exchangeInfo`)) as {
    symbols?: Array<{ status: string; quoteAsset: string; baseAsset: string; isSpotTradingAllowed?: boolean }>;
  };
  const bases = new Set<string>();
  for (const item of payload.symbols ?? []) {
    if (item.status === "TRADING" && item.quoteAsset === "USDT" && item.isSpotTradingAllowed !== false) {
      bases.add(item.baseAsset);
    }
  }
  return bases;
}

async function loadTickers(): Promise<Map<string, Ticker>> {
  const payload = (await fetchJson(`${BINANCE}/api/v3/ticker/24hr`)) as Array<{
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
    quoteVolume: string;
  }>;
  const map = new Map<string, Ticker>();
  for (const item of payload) {
    if (!item.symbol.endsWith("USDT")) continue;
    map.set(item.symbol, {
      last: Number(item.lastPrice),
      change24h: Number(item.priceChangePercent),
      quoteVolume: Number(item.quoteVolume),
    });
  }
  return map;
}

async function loadCoinlorePage(start: number) {
  const payload = (await fetchJson(
    `https://api.coinlore.net/api/tickers/?start=${start}&limit=100`,
  )) as { data?: Array<{ symbol: string; name: string; rank: number | string }> };
  return payload.data ?? [];
}

async function loadUniverse(bases: Set<string>): Promise<{ coins: UniverseCoin[]; source: string }> {
  const coins: UniverseCoin[] = [];
  const seen = new Set<string>();
  try {
    for (let start = 0; start < 800 && coins.length < 100; start += 100) {
      const page = await loadCoinlorePage(start);
      if (page.length === 0) break;
      for (const row of page) {
        if (isStable(row.symbol, row.name)) continue;
        let base = row.symbol.toUpperCase();
        if (!bases.has(base) && ALIAS[base] && bases.has(ALIAS[base])) base = ALIAS[base]!;
        if (!bases.has(base) || seen.has(base) || isLeveraged(base)) continue;
        seen.add(base);
        coins.push({
          symbol: base,
          pair: `${base}USDT`,
          name: row.name,
          rank: Number(row.rank) || coins.length + 1,
        });
        if (coins.length >= 100) break;
      }
      if (page.length < 100) break;
    }
  } catch {
    coins.length = 0;
  }

  if (coins.length >= 80) return { coins, source: "ارزش بازار، بدون استیبل‌کوین" };

  const tickers = await loadTickers();
  const ranked = [...tickers.entries()]
    .filter(([pair]) => pair.endsWith("USDT"))
    .map(([pair, ticker]) => ({ pair, base: pair.slice(0, -4), ticker }))
    .filter((item) => bases.has(item.base) && !isStable(item.base, item.base) && !isLeveraged(item.base))
    .sort((a, b) => b.ticker.quoteVolume - a.ticker.quoteVolume);

  const fallback: UniverseCoin[] = [];
  for (const item of ranked) {
    if (fallback.length >= 100) break;
    fallback.push({
      symbol: item.base,
      pair: item.pair,
      name: item.base,
      rank: fallback.length + 1,
    });
  }
  return { coins: fallback, source: "حجم معامله اسپات، بدون استیبل‌کوین" };
}

function parseKlines(payload: unknown): Candle[] {
  if (!Array.isArray(payload)) return [];
  const candles: Candle[] = [];
  for (const row of payload) {
    if (!Array.isArray(row) || row.length < 5) continue;
    candles.push({
      time: Math.floor(Number(row[0]) / 1000),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
    });
  }
  return candles.filter((candle) => Number.isFinite(candle.close) && candle.close > 0);
}

async function loadKlines(pair: string, interval: Interval): Promise<Candle[]> {
  const payload = await fetchJson(
    `${BINANCE}/api/v3/klines?symbol=${pair}&interval=${interval}&limit=60`,
  );
  return parseKlines(payload);
}

function nearestDistance(coin: CoinScan): number {
  const distances = [coin.analysis.distanceToLow, coin.analysis.distanceToHigh].filter(
    (value): value is number => value != null && Number.isFinite(value),
  );
  if (distances.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...distances.map((value) => Math.abs(value)));
}

async function runScan(interval: Interval): Promise<ScanResult> {
  const [bases, tickers] = await Promise.all([loadSpotBases(), loadTickers()]);
  if (bases.size < 50 || tickers.size < 50) {
    throw new Error("داده بازار در دسترس نیست. کمی بعد دوباره اسکن کنید.");
  }
  const { coins: universe, source } = await loadUniverse(bases);
  if (universe.length < 20) {
    throw new Error("فهرست ارزهای برتر ساخته نشد. دوباره تلاش کنید.");
  }

  const scanned = await mapPool(universe, 12, async (coin) => {
    try {
      const candles = await loadKlines(coin.pair, interval);
      if (candles.length < 40) return null;
      const analysis = analyzeCandles(candles);
      const ticker = tickers.get(coin.pair);
      const last = candles[candles.length - 1]!.close;
      return {
        symbol: coin.symbol,
        pair: coin.pair,
        name: coin.name,
        rank: coin.rank,
        last: ticker?.last && ticker.last > 0 ? ticker.last : last,
        change24h: ticker?.change24h ?? 0,
        quoteVolume: ticker?.quoteVolume ?? 0,
        candles,
        analysis,
        signal: analysis.signal,
      } satisfies CoinScan;
    } catch {
      return null;
    }
  });

  const coins = scanned.filter((coin): coin is CoinScan => coin != null);
  if (coins.length < 20) {
    throw new Error("کندل‌ها کامل نرسیدند. یک بار دیگر اسکن کنید.");
  }
  coins.sort((a, b) => {
    const aSignal = a.signal ? 0 : 1;
    const bSignal = b.signal ? 0 : 1;
    if (aSignal !== bSignal) return aSignal - bSignal;
    if (a.signal && b.signal && a.signal.side !== b.signal.side) {
      return a.signal.side === "buy" ? -1 : 1;
    }
    const distance = nearestDistance(a) - nearestDistance(b);
    if (distance !== 0) return distance;
    return a.rank - b.rank;
  });

  return {
    interval,
    scannedAt: Date.now(),
    universe: coins.length,
    source,
    coins,
  };
}

export const scanMarket = createServerFn({ method: "POST" })
  .validator((input: { interval: Interval; force?: boolean }) => {
    const interval = input?.interval;
    if (interval !== "1h" && interval !== "4h" && interval !== "1d") {
      throw new Error("بازه زمانی نامعتبر است");
    }
    return { interval, force: Boolean(input?.force) };
  })
  .handler(async ({ data }) => {
    if (!data.force) {
      const cached = resultCache.get(data.interval);
      if (cached && Date.now() - cached.at < TTL_MS) return cached.data;
      const pending = inflight.get(data.interval);
      if (pending) return pending;
    }
    const job = runScan(data.interval)
      .then((result) => {
        resultCache.set(data.interval, { at: Date.now(), data: result });
        inflight.delete(data.interval);
        return result;
      })
      .catch((error: unknown) => {
        inflight.delete(data.interval);
        throw error;
      });
    inflight.set(data.interval, job);
    return job;
  });
