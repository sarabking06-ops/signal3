import { i as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Check, i as RefreshCw, o as Activity, r as Search, t as X } from "../_libs/lucide-react.mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DBIuT9Bg.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var BUY = "#3dba7a";
var SELL = "#e36a5d";
var ACCENT = "#e0b15a";
var MUTED = "#8e9c93";
var GRID = "#2c3832";
var SURFACE = "#171d1a";
function precisionFor(price) {
	const abs = Math.abs(price);
	if (abs >= 100) return 2;
	if (abs >= 1) return 4;
	if (abs >= .01) return 5;
	if (abs >= 1e-4) return 6;
	return 8;
}
function CandleChart({ coin, interval }) {
	const host = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!host.current) return;
		let removed = false;
		let chart = null;
		(async () => {
			const lc = await import("../_libs/lightweight-charts.mjs").then((n) => n.t);
			if (removed || !host.current) return;
			const precision = precisionFor(coin.last || coin.candles[coin.candles.length - 1]?.close || 1);
			const instance = lc.createChart(host.current, {
				autoSize: true,
				layout: {
					background: {
						type: lc.ColorType.Solid,
						color: SURFACE
					},
					textColor: MUTED,
					fontFamily: "Vazirmatn, sans-serif"
				},
				grid: {
					vertLines: { color: GRID },
					horzLines: { color: GRID }
				},
				rightPriceScale: { borderColor: GRID },
				timeScale: {
					borderColor: GRID,
					timeVisible: interval !== "1d",
					secondsVisible: false,
					rightOffset: 2
				},
				crosshair: {
					vertLine: {
						color: "#e0b15a55",
						labelBackgroundColor: "#212925"
					},
					horzLine: {
						color: "#e0b15a55",
						labelBackgroundColor: "#212925"
					}
				},
				localization: { priceFormatter: (value) => {
					return value.toLocaleString("en-US", {
						maximumFractionDigits: precision,
						minimumFractionDigits: precision > 4 ? 2 : 0
					});
				} }
			});
			chart = instance;
			const candles = instance.addSeries(lc.CandlestickSeries, {
				upColor: BUY,
				downColor: SELL,
				borderUpColor: BUY,
				borderDownColor: SELL,
				wickUpColor: BUY,
				wickDownColor: SELL,
				priceFormat: {
					type: "price",
					precision,
					minMove: 10 ** -precision
				}
			});
			candles.setData(coin.candles.map((candle) => ({
				time: candle.time,
				open: candle.open,
				high: candle.high,
				low: candle.low,
				close: candle.close
			})));
			const zigzag = coin.analysis.swings.slice().sort((a, b) => a.time - b.time).filter((point, index, list) => index === 0 || point.time !== list[index - 1].time);
			if (zigzag.length >= 2) instance.addSeries(lc.LineSeries, {
				color: ACCENT,
				lineWidth: 2,
				priceLineVisible: false,
				lastValueVisible: false,
				crosshairMarkerVisible: false,
				priceFormat: {
					type: "price",
					precision,
					minMove: 10 ** -precision
				}
			}).setData(zigzag.map((point) => ({
				time: point.time,
				value: point.price
			})));
			const { majorHigh, majorLow, signal } = coin.analysis;
			if (majorLow) candles.createPriceLine({
				price: majorLow.price,
				color: BUY,
				lineWidth: 1,
				lineStyle: lc.LineStyle.Solid,
				axisLabelVisible: true,
				title: "کف"
			});
			if (majorHigh) candles.createPriceLine({
				price: majorHigh.price,
				color: SELL,
				lineWidth: 1,
				lineStyle: lc.LineStyle.Solid,
				axisLabelVisible: true,
				title: "سقف"
			});
			if (signal) {
				candles.createPriceLine({
					price: signal.stop,
					color: SELL,
					lineWidth: 1,
					lineStyle: lc.LineStyle.Dashed,
					axisLabelVisible: true,
					title: "ضرر"
				});
				candles.createPriceLine({
					price: signal.takeProfit,
					color: BUY,
					lineWidth: 1,
					lineStyle: lc.LineStyle.Dashed,
					axisLabelVisible: true,
					title: "سود"
				});
				candles.createPriceLine({
					price: signal.entry,
					color: MUTED,
					lineWidth: 1,
					lineStyle: lc.LineStyle.Dotted,
					axisLabelVisible: true,
					title: "ورود"
				});
			}
			instance.timeScale().fitContent();
		})();
		return () => {
			removed = true;
			chart?.remove();
		};
	}, [coin, interval]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: host,
		className: "chart-frame w-full",
		dir: "ltr"
	});
}
function formatPrice(value) {
	if (!Number.isFinite(value)) return "—";
	const abs = Math.abs(value);
	const digits = abs >= 100 ? 2 : abs >= 1 ? 4 : abs >= .01 ? 5 : abs >= 1e-4 ? 6 : 8;
	return value.toLocaleString("en-US", {
		maximumFractionDigits: digits,
		minimumFractionDigits: abs >= 100 ? 2 : 0
	});
}
function formatPercent(value, digits = 2) {
	if (!Number.isFinite(value)) return "—";
	return `${value > 0 ? "+" : ""}${value.toFixed(Math.abs(value) >= 10 ? 1 : digits)}%`;
}
function formatCompact(value) {
	if (!Number.isFinite(value)) return "—";
	const abs = Math.abs(value);
	if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
	if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
	if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
	return value.toFixed(0);
}
function formatClock(timestamp) {
	return new Date(timestamp).toLocaleTimeString("fa-IR", {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Asia/Tehran"
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var scanMarket = createServerFn({ method: "POST" }).validator((input) => {
	const interval = input?.interval;
	if (interval !== "1h" && interval !== "4h" && interval !== "1d") throw new Error("بازه زمانی نامعتبر است");
	return {
		interval,
		force: Boolean(input?.force)
	};
}).handler(createSsrRpc("ded358c739c47cb86338f0ab81cd427e8c391109d3ed20875ab312663957e738"));
var INTERVALS = [
	{
		id: "1h",
		label: "۱ ساعته"
	},
	{
		id: "4h",
		label: "۴ ساعته"
	},
	{
		id: "1d",
		label: "روزانه"
	}
];
var FILTERS = [
	{
		id: "all",
		label: "همه"
	},
	{
		id: "signal",
		label: "سیگنال"
	},
	{
		id: "buy",
		label: "خرید"
	},
	{
		id: "sell",
		label: "فروش"
	}
];
function Scanner() {
	const [interval, setInterval] = (0, import_react.useState)("1h");
	const [nonce, setNonce] = (0, import_react.useState)(0);
	const [data, setData] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)(null);
	const [query, setQuery] = (0, import_react.useState)("");
	const [filter, setFilter] = (0, import_react.useState)("all");
	const [selected, setSelected] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		const controller = new AbortController();
		setLoading(true);
		setError(null);
		scanMarket({
			data: {
				interval,
				force: nonce > 0
			},
			signal: controller.signal
		}).then((result) => {
			if (controller.signal.aborted) return;
			setData(result);
			setLoading(false);
		}).catch((reason) => {
			if (controller.signal.aborted) return;
			const message = reason instanceof Error ? reason.message : "اسکن بازار ناموفق بود";
			setError(message);
			setLoading(false);
		});
		return () => controller.abort();
	}, [interval, nonce]);
	(0, import_react.useEffect)(() => {
		if (!data) return;
		if (selected && data.coins.some((coin) => coin.pair === selected)) return;
		const next = data.coins.find((coin) => coin.signal) ?? data.coins[0];
		setSelected(next?.pair ?? null);
	}, [data, selected]);
	const visible = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		return (data?.coins ?? []).filter((coin) => {
			if (filter === "signal" && !coin.signal) return false;
			if (filter === "buy" && coin.signal?.side !== "buy") return false;
			if (filter === "sell" && coin.signal?.side !== "sell") return false;
			if (!q) return true;
			return coin.symbol.toLowerCase().includes(q) || coin.name.toLowerCase().includes(q);
		});
	}, [
		data,
		filter,
		query
	]);
	const coin = data?.coins.find((item) => item.pair === selected) ?? visible[0] ?? null;
	const buys = data?.coins.filter((item) => item.signal?.side === "buy").length ?? 0;
	const sells = data?.coins.filter((item) => item.signal?.side === "sell").length ?? 0;
	const wickRejects = data?.coins.filter((item) => !item.analysis.wickPass).length ?? 0;
	const zigzagRejects = data?.coins.filter((item) => !item.analysis.zigzagPass).length ?? 0;
	const stale = Boolean(data && data.interval !== interval);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "min-h-screen bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "border-b border-border",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-end lg:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "flex items-center gap-2 text-xs font-medium text-accent",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, {
								className: "size-4",
								"aria-hidden": "true"
							}), "۶۰ کندل آخر · سقف و کف سوینگ"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-1 text-2xl font-semibold tracking-tight",
							children: "سوینگ‌اسکن"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 max-w-2xl text-sm text-muted",
							children: "روی صد ارز برتر بدون استیبل، پولبک کندل به سوینگ‌لو سیگنال خرید است و پولبک به سوینگ‌های سیگنال فروش. حد ضرر پشت همان سوینگ می‌نشیند و حد سود با نسبت یک به دو محاسبه می‌شود."
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-2 sm:flex-row sm:items-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-3 rounded-lg border border-border bg-surface p-1",
						role: "tablist",
						"aria-label": "تایم‌فریم",
						children: INTERVALS.map((item) => {
							const active = interval === item.id;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								role: "tab",
								"aria-selected": active,
								onClick: () => setInterval(item.id),
								className: active ? "min-h-11 rounded-md bg-accent px-3 text-sm font-semibold text-ink" : "min-h-11 rounded-md px-3 text-sm text-muted transition-colors hover:text-fg",
								children: item.label
							}, item.id);
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setNonce((value) => value + 1),
						disabled: loading,
						className: "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm text-fg transition-colors hover:bg-surface-2 disabled:opacity-60",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
							className: loading ? "size-4 animate-spin" : "size-4",
							"aria-hidden": "true"
						}), "اسکن دوباره"]
					})]
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "grid grid-cols-2 gap-2 lg:grid-cols-4",
					"aria-label": "خلاصه اسکن",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "سیگنال خرید",
							value: String(buys),
							tone: "buy"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "سیگنال فروش",
							value: String(sells),
							tone: "sell"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "رد به‌خاطر سایه",
							value: String(wickRejects)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "رد به‌خاطر زیگزاگ",
							value: String(zigzagRejects)
						})
					]
				}),
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-lg border border-sell/40 bg-surface px-4 py-3 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: error }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setNonce((value) => value + 1),
						className: "mt-3 min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-ink",
						children: "تلاش دوباره"
					})]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "workspace",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex min-w-0 flex-col gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "relative block",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "sr-only",
										children: "جستجوی ارز"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
										className: "pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted",
										"aria-hidden": "true"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: query,
										onChange: (event) => setQuery(event.target.value),
										placeholder: "نماد یا نام ارز",
										className: "min-h-11 w-full rounded-lg border border-border bg-surface pr-10 pl-3 text-sm text-fg placeholder:text-muted"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-2",
								children: FILTERS.map((item) => {
									const active = filter === item.id;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setFilter(item.id),
										className: active ? "min-h-11 rounded-lg bg-surface-2 px-3 text-sm text-fg" : "min-h-11 rounded-lg border border-border px-3 text-sm text-muted",
										children: item.label
									}, item.id);
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "list-frame overflow-y-auto rounded-lg border border-border bg-surface",
								children: loading && !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "divide-y divide-border",
									children: Array.from({ length: 8 }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: "px-3 py-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4 w-24 animate-pulse rounded bg-surface-2" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-2 h-3 w-40 animate-pulse rounded bg-surface-2" })]
									}, index))
								}) : visible.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "px-4 py-8 text-center text-sm text-muted",
									children: "ارزی با این فیلتر پیدا نشد."
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "divide-y divide-border",
									children: visible.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoinRow, {
										coin: item,
										active: item.pair === coin?.pair,
										onSelect: () => setSelected(item.pair)
									}) }, item.pair))
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted",
								children: [data ? `${data.universe.toLocaleString("fa-IR")} ارز · ${data.source} · ${formatClock(data.scannedAt)}` : loading ? "در حال خواندن ۶۰ کندل از ارزهای برتر…" : "اسکنی انجام نشده", stale && loading ? " · در حال به‌روزرسانی" : ""]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "min-w-0",
						children: coin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Detail, {
							coin,
							interval: data?.interval ?? interval
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-lg border border-border bg-surface px-4 py-16 text-center text-sm text-muted",
							children: loading ? "چارت بعد از رسیدن کندل‌ها اینجا می‌آید." : "ارزی برای نمایش نیست."
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "pb-6 text-xs leading-6 text-muted",
					children: "سیگنال فقط وقتی صادر می‌شود که سایه ۶۰ کندل زیاد نباشد، زیگزاگ تمیز باشد، برای خرید قله بالاتر از دره و برای فروش دره پایین‌تر از قله باشد، و کندل به همان سطح پولبک زده باشد. این ابزار توصیه معامله نیست."
				})
			]
		})]
	});
}
function Stat({ label, value, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-border bg-surface px-3 py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: `mt-1 font-mono text-xl ${tone === "buy" ? "text-buy" : tone === "sell" ? "text-sell" : "text-fg"}`,
			dir: "ltr",
			children: value
		})]
	});
}
function CoinRow({ coin, active, onSelect }) {
	const up = coin.change24h >= 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: onSelect,
		"aria-pressed": active,
		className: active ? "flex w-full items-start justify-between gap-3 bg-surface-2 px-3 py-3 text-right" : "flex w-full items-start justify-between gap-3 px-3 py-3 text-right transition-colors hover:bg-surface-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold",
						children: coin.symbol
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-xs text-muted",
						children: ["#", coin.rank]
					}),
					coin.signal ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: coin.signal.side === "buy" ? "rounded bg-buy/15 px-2 py-0.5 text-xs font-medium text-buy" : "rounded bg-sell/15 px-2 py-0.5 text-xs font-medium text-sell",
						children: coin.signal.side === "buy" ? "خرید" : "فروش"
					}) : null
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mt-1 block truncate text-xs text-muted",
				children: rowHint(coin)
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "shrink-0 text-left",
			dir: "ltr",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block font-mono text-sm",
				children: formatPrice(coin.last)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: up ? "block font-mono text-xs text-buy" : "block font-mono text-xs text-sell",
				children: formatPercent(coin.change24h)
			})]
		})]
	});
}
function rowHint(coin) {
	if (coin.signal) return coin.signal.side === "buy" ? `پولبک به سوینگ‌لو · ریوارد ${formatPrice(coin.signal.takeProfit)}` : `پولبک به سوینگ‌های · ریوارد ${formatPrice(coin.signal.takeProfit)}`;
	if (!coin.analysis.wickPass) return "رد شد: سایه زیاد";
	if (!coin.analysis.zigzagPass) return "رد شد: زیگزاگ نامرتب";
	const low = coin.analysis.distanceToLow;
	const high = coin.analysis.distanceToHigh;
	return [low != null ? `تا کف ${formatPercent(low * 100, 2)}` : null, high != null ? `تا سقف ${formatPercent(high * 100, 2)}` : null].filter(Boolean).join(" · ") || coin.analysis.blockReason || coin.name;
}
function Detail({ coin, interval }) {
	const analysis = coin.analysis;
	const signal = coin.signal;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "overflow-hidden rounded-lg border border-border bg-surface",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "text-lg font-semibold",
						children: [coin.symbol, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mr-2 text-sm font-normal text-muted",
							children: coin.name
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-xs text-muted",
						children: [
							"حجم ۲۴س ",
							formatCompact(coin.quoteVolume),
							" تتر · رتبه ",
							coin.rank.toLocaleString("fa-IR")
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-mono text-xl",
					dir: "ltr",
					children: [formatPrice(coin.last), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: coin.change24h >= 0 ? "mr-2 text-sm text-buy" : "mr-2 text-sm text-sell",
						children: formatPercent(coin.change24h)
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CandleChart, {
				coin,
				interval
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 border-t border-border p-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "flex flex-col gap-2 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckRow, {
							ok: analysis.wickPass,
							label: "نقدینگی کندل‌ها",
							detail: wickDetail(analysis.wickAvg, analysis.wickHeavyShare)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckRow, {
							ok: analysis.zigzagPass,
							label: "زیگزاگ تمیز",
							detail: analysis.zigzagNote
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckRow, {
							ok: signal ? signal.side === "buy" ? analysis.buyStructure : analysis.sellStructure : analysis.buyStructure || analysis.sellStructure,
							label: "ساختار قله و دره",
							detail: analysis.structureNote
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckRow, {
							ok: Boolean(signal),
							label: "پولبک به سوینگ",
							detail: signal ? signal.side === "buy" ? "کندل روی سوینگ‌لو برگشته است" : "کندل به سوینگ‌های برگشته است" : analysis.blockReason ?? "پولبک فعال نیست"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckRow, {
							ok: Boolean(signal),
							label: "ریسک به ریوارد",
							detail: signal ? "یک به دو، از روی حد ضرر محاسبه‌شده" : "بعد از تأیید پولبک حساب می‌شود"
						})
					]
				}), signal ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticket, { signal }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Levels, { coin })]
			})
		]
	});
}
function wickDetail(avg, share) {
	return `میانگین سایه ${Math.round(avg * 100).toLocaleString("fa-IR")}٪ · کندل سایه‌سنگین ${Math.round(share * 100).toLocaleString("fa-IR")}٪`;
}
function CheckRow({ ok, label, detail }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "flex gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: ok ? "mt-0.5 text-buy" : "mt-0.5 text-sell",
			"aria-hidden": "true",
			children: ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "block font-medium",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "block text-xs text-muted",
			children: detail
		})] })]
	});
}
function Ticket({ signal }) {
	const buy = signal.side === "buy";
	const rows = [
		["ورود", formatPrice(signal.entry)],
		[buy ? "حد ضرر زیر سوینگ‌لو" : "حد ضرر بالای سوینگ‌های", formatPrice(signal.stop)],
		["حد سود ۱ به ۲", formatPrice(signal.takeProfit)],
		["ریسک", `${formatPrice(signal.risk)} (${formatPercent(signal.risk / signal.entry * 100)})`],
		["ریوارد", formatPrice(signal.reward)],
		[buy ? "سوینگ‌لو" : "سوینگ‌های", formatPrice(signal.level)],
		[buy ? "قله بالاتر" : "دره پایین‌تر", formatPrice(signal.counterpart)]
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: buy ? "rounded-lg border border-buy/30 bg-bg p-3" : "rounded-lg border border-sell/30 bg-bg p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: buy ? "text-sm font-semibold text-buy" : "text-sm font-semibold text-sell",
			children: [buy ? "سیگنال خرید" : "سیگنال فروش", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mr-2 font-normal text-muted",
				children: "نسبت ۱:۲"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
			className: "mt-3 flex flex-col gap-2",
			children: rows.map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline justify-between gap-3 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
					className: "text-muted",
					children: label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
					className: "font-mono text-fg",
					dir: "ltr",
					children: value
				})]
			}, label))
		})]
	});
}
function Levels({ coin }) {
	const { majorHigh, majorLow, distanceToHigh, distanceToLow } = coin.analysis;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-border bg-bg p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-semibold",
				children: "سطوح ۶۰ کندل"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "mt-3 flex flex-col gap-2 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelRow, {
					label: "بالاترین سوینگ‌های",
					price: majorHigh?.price ?? null,
					distance: distanceToHigh
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelRow, {
					label: "پایین‌ترین سوینگ‌لو",
					price: majorLow?.price ?? null,
					distance: distanceToLow
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-xs text-muted",
				children: coin.analysis.blockReason
			})
		]
	});
}
function LevelRow({ label, price, distance }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-baseline justify-between gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
			className: "font-mono",
			dir: "ltr",
			children: [price == null ? "—" : formatPrice(price), distance != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mr-2 text-xs text-muted",
				children: formatPercent(distance * 100)
			}) : null]
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scanner, {});
}
//#endregion
export { Home as component };
