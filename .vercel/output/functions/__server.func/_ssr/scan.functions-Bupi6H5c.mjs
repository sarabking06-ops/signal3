import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/scan.functions-Bupi6H5c.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var REV_MULT = 2.15;
var WICK_HEAVY = .72;
var WICK_AVG_MAX = .645;
var WICK_SHARE_MAX = .45;
var MIN_PIVOTS = 3;
var MAX_PIVOTS = 10;
function averageTrueRange(candles, period = 14) {
	if (candles.length === 0) return 0;
	const trs = [];
	for (let i = 0; i < candles.length; i++) {
		const candle = candles[i];
		if (i === 0) {
			trs.push(candle.high - candle.low);
			continue;
		}
		const prev = candles[i - 1].close;
		trs.push(Math.max(candle.high - candle.low, Math.abs(candle.high - prev), Math.abs(candle.low - prev)));
	}
	const slice = trs.slice(-Math.min(period, trs.length));
	return slice.reduce((sum, value) => sum + value, 0) / slice.length;
}
function buildZigZag(candles, reversal) {
	const pivots = [];
	if (candles.length === 0 || reversal <= 0) return pivots;
	let hi = candles[0].high;
	let lo = candles[0].low;
	let hiIndex = 0;
	let loIndex = 0;
	let direction = 0;
	let extremeIndex = 0;
	let extremePrice = 0;
	const push = (kind, index, price, developing) => {
		const candle = candles[index];
		if (!candle) return;
		pivots.push({
			index,
			time: candle.time,
			price,
			kind,
			developing
		});
	};
	for (let i = 0; i < candles.length; i++) {
		const candle = candles[i];
		if (direction === 0) {
			if (candle.high >= hi) {
				hi = candle.high;
				hiIndex = i;
			}
			if (candle.low <= lo) {
				lo = candle.low;
				loIndex = i;
			}
			if (hi - lo >= reversal && hiIndex !== loIndex) {
				if (loIndex < hiIndex) {
					push("low", loIndex, lo, false);
					direction = 1;
					extremeIndex = hiIndex;
					extremePrice = hi;
				} else {
					push("high", hiIndex, hi, false);
					direction = -1;
					extremeIndex = loIndex;
					extremePrice = lo;
				}
			}
			continue;
		}
		if (direction === 1) {
			if (candle.high >= extremePrice) {
				extremePrice = candle.high;
				extremeIndex = i;
			} else if (extremePrice - candle.low >= reversal && i !== extremeIndex) {
				push("high", extremeIndex, extremePrice, false);
				direction = -1;
				extremePrice = candle.low;
				extremeIndex = i;
			}
		} else if (candle.low <= extremePrice) {
			extremePrice = candle.low;
			extremeIndex = i;
		} else if (candle.high - extremePrice >= reversal && i !== extremeIndex) {
			push("low", extremeIndex, extremePrice, false);
			direction = 1;
			extremePrice = candle.high;
			extremeIndex = i;
		}
	}
	if (direction !== 0 && (pivots.length === 0 || pivots[pivots.length - 1].index !== extremeIndex)) push(direction === 1 ? "high" : "low", extremeIndex, extremePrice, true);
	return pivots;
}
function wickStats(candles) {
	let sum = 0;
	let heavy = 0;
	for (const candle of candles) {
		const range = candle.high - candle.low;
		if (range <= 0) {
			sum += 1;
			heavy += 1;
			continue;
		}
		const ratio = (range - Math.abs(candle.close - candle.open)) / range;
		sum += ratio;
		if (ratio >= WICK_HEAVY) heavy += 1;
	}
	const avg = sum / candles.length;
	const share = heavy / candles.length;
	return {
		avg,
		share,
		pass: avg <= WICK_AVG_MAX && share <= WICK_SHARE_MAX
	};
}
function extreme(points, kind) {
	const pool = points.filter((point) => point.kind === kind && !point.developing);
	if (pool.length === 0) return null;
	const best = pool.reduce((winner, point) => {
		if (kind === "high") return point.price > winner.price ? point : winner;
		return point.price < winner.price ? point : winner;
	});
	return {
		price: best.price,
		time: best.time,
		index: best.index
	};
}
function analyzeCandles(candles) {
	const base = {
		swings: [],
		atr: 0,
		wickAvg: 1,
		wickHeavyShare: 1,
		wickPass: false,
		zigzagPass: false,
		zigzagNote: "کندل کافی برای سوینگ نیست",
		majorHigh: null,
		majorLow: null,
		buyStructure: false,
		sellStructure: false,
		structureNote: "ساختار قله و دره هنوز مشخص نیست",
		pullbackSide: null,
		signal: null,
		blockReason: "کندل کافی برای سوینگ نیست",
		distanceToLow: null,
		distanceToHigh: null
	};
	if (candles.length < 30) return base;
	const atr = averageTrueRange(candles);
	const last = candles[candles.length - 1];
	const wick = wickStats(candles);
	const reversal = Math.max(atr * REV_MULT, last.close * .004);
	const swings = buildZigZag(candles, reversal);
	const confirmed = swings.filter((point) => !point.developing);
	let zigzagPass = swings.length >= MIN_PIVOTS && swings.length <= MAX_PIVOTS;
	let zigzagNote = zigzagPass ? `زیگزاگ تمیز با ${toFaDigits(swings.length)} سوینگ` : swings.length < MIN_PIVOTS ? "زیگزاگ ناکافی است؛ قله و دره تمیز شکل نگرفته" : "زیگزاگ شلوغ است؛ لگ‌ها ریز و نامرتب‌اند";
	let tinyLegs = 0;
	for (let i = 1; i < confirmed.length; i++) if (Math.abs(confirmed[i].price - confirmed[i - 1].price) < reversal * .75) tinyLegs += 1;
	if (zigzagPass && tinyLegs > 0) {
		zigzagPass = false;
		zigzagNote = "لگ‌های زیگزاگ ریزند و خط تمیز نیست";
	}
	const majorHigh = extreme(swings, "high");
	const majorLow = extreme(swings, "low");
	const prox = Math.max(atr * .38, last.close * .002);
	const peakAfterLow = majorLow ? swings.find((point) => point.kind === "high" && point.index > majorLow.index && point.price > majorLow.price && point.price - majorLow.price >= reversal * .8) : void 0;
	const valleyAfterHigh = majorHigh ? swings.find((point) => point.kind === "low" && point.index > majorHigh.index && point.price < majorHigh.price && majorHigh.price - point.price >= reversal * .8) : void 0;
	const buyStructure = Boolean(peakAfterLow && majorLow && peakAfterLow.price > majorLow.price);
	const sellStructure = Boolean(valleyAfterHigh && majorHigh && valleyAfterHigh.price < majorHigh.price);
	let structureNote = "قله و دره هنوز جفت نشده‌اند";
	if (buyStructure && sellStructure) structureNote = "قله بالاتر از دره است و برای ریزش، دره پایین‌تر از قله است";
	else if (buyStructure) structureNote = "قله بالاتر از دره است";
	else if (sellStructure) structureNote = "دره پایین‌تر از قله است";
	const developing = swings.find((point) => point.developing);
	const lowBroken = Boolean(majorLow && developing?.kind === "low" && developing.price < majorLow.price - prox * .35);
	const highBroken = Boolean(majorHigh && developing?.kind === "high" && developing.price > majorHigh.price + prox * .35);
	const buyTouch = Boolean(majorLow && !lowBroken && last.close >= majorLow.price && last.close <= majorLow.price + prox && last.low <= majorLow.price + prox);
	const sellTouch = Boolean(majorHigh && !highBroken && last.close <= majorHigh.price && last.close >= majorHigh.price - prox && last.high >= majorHigh.price - prox);
	let pullbackSide = null;
	if (buyTouch && sellTouch && majorLow && majorHigh) pullbackSide = Math.abs(last.close - majorLow.price) <= Math.abs(majorHigh.price - last.close) ? "buy" : "sell";
	else if (buyTouch) pullbackSide = "buy";
	else if (sellTouch) pullbackSide = "sell";
	const distanceToLow = majorLow ? (last.close - majorLow.price) / last.close : null;
	const distanceToHigh = majorHigh ? (majorHigh.price - last.close) / last.close : null;
	const bufferFor = (level) => Math.max(level * .0012, atr * .22);
	let signal = null;
	let blockReason = null;
	const structureOk = pullbackSide === "buy" ? buyStructure : pullbackSide === "sell" ? sellStructure : false;
	if (!zigzagPass) blockReason = zigzagNote;
	else if (!wick.pass) blockReason = "سایه ۶۰ کندل آخر زیاد است؛ بازار نقدینگی تمیز ندارد";
	else if (!pullbackSide) blockReason = "کندل‌ها هنوز به سوینگ‌لو یا سوینگ‌های پولبک نزده‌اند";
	else if (!structureOk && pullbackSide === "buy") blockReason = "برای خرید، قله باید بالاتر از دره باشد";
	else if (!structureOk && pullbackSide === "sell") blockReason = "برای فروش، دره باید پایین‌تر از قله باشد";
	else if (pullbackSide === "buy" && majorLow && peakAfterLow) {
		const entry = last.close;
		const stop = majorLow.price - bufferFor(majorLow.price);
		const risk = entry - stop;
		if (risk > 0 && stop < majorLow.price) signal = {
			side: "buy",
			entry,
			stop,
			takeProfit: entry + risk * 2,
			risk,
			reward: risk * 2,
			rr: 2,
			level: majorLow.price,
			levelTime: majorLow.time,
			counterpart: peakAfterLow.price
		};
		else blockReason = "حد ضرر پایین‌تر از سوینگ‌لو جا نمی‌شود";
	} else if (pullbackSide === "sell" && majorHigh && valleyAfterHigh) {
		const entry = last.close;
		const stop = majorHigh.price + bufferFor(majorHigh.price);
		const risk = stop - entry;
		if (risk > 0 && stop > majorHigh.price) signal = {
			side: "sell",
			entry,
			stop,
			takeProfit: entry - risk * 2,
			risk,
			reward: risk * 2,
			rr: 2,
			level: majorHigh.price,
			levelTime: majorHigh.time,
			counterpart: valleyAfterHigh.price
		};
		else blockReason = "حد ضرر بالاتر از سوینگ‌های جا نمی‌شود";
	}
	return {
		swings,
		atr,
		wickAvg: wick.avg,
		wickHeavyShare: wick.share,
		wickPass: wick.pass,
		zigzagPass,
		zigzagNote,
		majorHigh,
		majorLow,
		buyStructure,
		sellStructure,
		structureNote,
		pullbackSide,
		signal,
		blockReason: signal ? null : blockReason,
		distanceToLow,
		distanceToHigh
	};
}
function toFaDigits(value) {
	return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
}
var BINANCE = "https://data-api.binance.vision";
var TTL_MS = 45e3;
var STABLES = /* @__PURE__ */ new Set([
	"USDT",
	"USDC",
	"DAI",
	"FDUSD",
	"TUSD",
	"USDP",
	"USDD",
	"BUSD",
	"PYUSD",
	"USD1",
	"USDE",
	"USDS",
	"USDG",
	"USD0",
	"RLUSD",
	"GUSD",
	"FRAX",
	"LUSD",
	"CRVUSD",
	"GHO",
	"SUSD",
	"MIM",
	"ALUSD",
	"DOLA",
	"USDY",
	"USDM",
	"USTC",
	"EURC",
	"EURT",
	"EURS",
	"AEUR",
	"EURI",
	"USDB",
	"BFUSD",
	"USDN",
	"FEI",
	"USDX",
	"XUSD",
	"USDR",
	"AUSD",
	"USDK",
	"VAI",
	"USDJ",
	"HUSD",
	"CUSD",
	"OUSD",
	"ZUSD",
	"MUSD",
	"USN",
	"RSV",
	"USX",
	"USDAI",
	"USDA",
	"DEUSD",
	"USDQ",
	"USR",
	"LISUSD",
	"MKUSD",
	"EUSD",
	"BOLD",
	"HYUSD",
	"USDT0",
	"SATUSD",
	"USDAT",
	"SUSDE",
	"SUSDS",
	"STABLE",
	"USDP",
	"PAX",
	"USDD",
	"TUSD",
	"PYUSD"
]);
var ALIAS = {
	MATIC: "POL",
	MIOTA: "IOTA",
	XDCE: "XDC",
	RNDR: "RENDER",
	BCHSV: "BSV"
};
var resultCache = /* @__PURE__ */ new Map();
var inflight = /* @__PURE__ */ new Map();
function isStable(symbol, name) {
	const sym = symbol.toUpperCase();
	if (STABLES.has(sym)) return true;
	const label = name.toLowerCase();
	if (label.includes("gold")) return false;
	if (label.includes("stablecoin") || label.includes("stable coin")) return true;
	if (/\busd\b/.test(label) && /(dollar|coin|paypal|ripple|ethena|digital|trueusd|binance)/.test(label)) return true;
	return false;
}
function isLeveraged(symbol) {
	return /(UP|DOWN|BULL|BEAR)$/.test(symbol) && symbol.length > 4;
}
async function fetchJson(url, attempts = 3) {
	let lastError;
	for (let attempt = 0; attempt < attempts; attempt++) try {
		const response = await fetch(url, { headers: { accept: "application/json" } });
		if (response.status === 429 || response.status === 418 || response.status >= 500) {
			await delay(350 * (attempt + 1));
			lastError = /* @__PURE__ */ new Error(`HTTP ${response.status}`);
			continue;
		}
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return await response.json();
	} catch (error) {
		lastError = error;
		await delay(280 * (attempt + 1));
	}
	throw lastError instanceof Error ? lastError : /* @__PURE__ */ new Error("دریافت داده بازار ناموفق بود");
}
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
async function mapPool(items, limit, task) {
	const out = new Array(items.length);
	let cursor = 0;
	async function worker() {
		for (;;) {
			const index = cursor;
			cursor += 1;
			if (index >= items.length) return;
			out[index] = await task(items[index]);
		}
	}
	const workers = Math.min(limit, items.length);
	await Promise.all(Array.from({ length: workers }, () => worker()));
	return out;
}
async function loadSpotBases() {
	const payload = await fetchJson(`${BINANCE}/api/v3/exchangeInfo`);
	const bases = /* @__PURE__ */ new Set();
	for (const item of payload.symbols ?? []) if (item.status === "TRADING" && item.quoteAsset === "USDT" && item.isSpotTradingAllowed !== false) bases.add(item.baseAsset);
	return bases;
}
async function loadTickers() {
	const payload = await fetchJson(`${BINANCE}/api/v3/ticker/24hr`);
	const map = /* @__PURE__ */ new Map();
	for (const item of payload) {
		if (!item.symbol.endsWith("USDT")) continue;
		map.set(item.symbol, {
			last: Number(item.lastPrice),
			change24h: Number(item.priceChangePercent),
			quoteVolume: Number(item.quoteVolume)
		});
	}
	return map;
}
async function loadCoinlorePage(start) {
	return (await fetchJson(`https://api.coinlore.net/api/tickers/?start=${start}&limit=100`)).data ?? [];
}
async function loadUniverse(bases) {
	const coins = [];
	const seen = /* @__PURE__ */ new Set();
	try {
		for (let start = 0; start < 800 && coins.length < 100; start += 100) {
			const page = await loadCoinlorePage(start);
			if (page.length === 0) break;
			for (const row of page) {
				if (isStable(row.symbol, row.name)) continue;
				let base = row.symbol.toUpperCase();
				if (!bases.has(base) && ALIAS[base] && bases.has(ALIAS[base])) base = ALIAS[base];
				if (!bases.has(base) || seen.has(base) || isLeveraged(base)) continue;
				seen.add(base);
				coins.push({
					symbol: base,
					pair: `${base}USDT`,
					name: row.name,
					rank: Number(row.rank) || coins.length + 1
				});
				if (coins.length >= 100) break;
			}
			if (page.length < 100) break;
		}
	} catch {
		coins.length = 0;
	}
	if (coins.length >= 80) return {
		coins,
		source: "ارزش بازار، بدون استیبل‌کوین"
	};
	const ranked = [...(await loadTickers()).entries()].filter(([pair]) => pair.endsWith("USDT")).map(([pair, ticker]) => ({
		pair,
		base: pair.slice(0, -4),
		ticker
	})).filter((item) => bases.has(item.base) && !isStable(item.base, item.base) && !isLeveraged(item.base)).sort((a, b) => b.ticker.quoteVolume - a.ticker.quoteVolume);
	const fallback = [];
	for (const item of ranked) {
		if (fallback.length >= 100) break;
		fallback.push({
			symbol: item.base,
			pair: item.pair,
			name: item.base,
			rank: fallback.length + 1
		});
	}
	return {
		coins: fallback,
		source: "حجم معامله اسپات، بدون استیبل‌کوین"
	};
}
function parseKlines(payload) {
	if (!Array.isArray(payload)) return [];
	const candles = [];
	for (const row of payload) {
		if (!Array.isArray(row) || row.length < 5) continue;
		candles.push({
			time: Math.floor(Number(row[0]) / 1e3),
			open: Number(row[1]),
			high: Number(row[2]),
			low: Number(row[3]),
			close: Number(row[4])
		});
	}
	return candles.filter((candle) => Number.isFinite(candle.close) && candle.close > 0);
}
async function loadKlines(pair, interval) {
	return parseKlines(await fetchJson(`${BINANCE}/api/v3/klines?symbol=${pair}&interval=${interval}&limit=60`));
}
function nearestDistance(coin) {
	const distances = [coin.analysis.distanceToLow, coin.analysis.distanceToHigh].filter((value) => value != null && Number.isFinite(value));
	if (distances.length === 0) return Number.POSITIVE_INFINITY;
	return Math.min(...distances.map((value) => Math.abs(value)));
}
async function runScan(interval) {
	const [bases, tickers] = await Promise.all([loadSpotBases(), loadTickers()]);
	if (bases.size < 50 || tickers.size < 50) throw new Error("داده بازار در دسترس نیست. کمی بعد دوباره اسکن کنید.");
	const { coins: universe, source } = await loadUniverse(bases);
	if (universe.length < 20) throw new Error("فهرست ارزهای برتر ساخته نشد. دوباره تلاش کنید.");
	const coins = (await mapPool(universe, 12, async (coin) => {
		try {
			const candles = await loadKlines(coin.pair, interval);
			if (candles.length < 40) return null;
			const analysis = analyzeCandles(candles);
			const ticker = tickers.get(coin.pair);
			const last = candles[candles.length - 1].close;
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
				signal: analysis.signal
			};
		} catch {
			return null;
		}
	})).filter((coin) => coin != null);
	if (coins.length < 20) throw new Error("کندل‌ها کامل نرسیدند. یک بار دیگر اسکن کنید.");
	coins.sort((a, b) => {
		const aSignal = a.signal ? 0 : 1;
		const bSignal = b.signal ? 0 : 1;
		if (aSignal !== bSignal) return aSignal - bSignal;
		if (a.signal && b.signal && a.signal.side !== b.signal.side) return a.signal.side === "buy" ? -1 : 1;
		const distance = nearestDistance(a) - nearestDistance(b);
		if (distance !== 0) return distance;
		return a.rank - b.rank;
	});
	return {
		interval,
		scannedAt: Date.now(),
		universe: coins.length,
		source,
		coins
	};
}
var scanMarket_createServerFn_handler = createServerRpc({
	id: "ded358c739c47cb86338f0ab81cd427e8c391109d3ed20875ab312663957e738",
	name: "scanMarket",
	filename: "src/lib/scan.functions.ts"
}, (opts) => scanMarket.__executeServer(opts));
var scanMarket = createServerFn({ method: "POST" }).validator((input) => {
	const interval = input?.interval;
	if (interval !== "1h" && interval !== "4h" && interval !== "1d") throw new Error("بازه زمانی نامعتبر است");
	return {
		interval,
		force: Boolean(input?.force)
	};
}).handler(scanMarket_createServerFn_handler, async ({ data }) => {
	if (!data.force) {
		const cached = resultCache.get(data.interval);
		if (cached && Date.now() - cached.at < TTL_MS) return cached.data;
		const pending = inflight.get(data.interval);
		if (pending) return pending;
	}
	const job = runScan(data.interval).then((result) => {
		resultCache.set(data.interval, {
			at: Date.now(),
			data: result
		});
		inflight.delete(data.interval);
		return result;
	}).catch((error) => {
		inflight.delete(data.interval);
		throw error;
	});
	inflight.set(data.interval, job);
	return job;
});
//#endregion
export { scanMarket_createServerFn_handler };
