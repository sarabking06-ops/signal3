export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type SwingPoint = {
  index: number;
  time: number;
  price: number;
  kind: "high" | "low";
  developing: boolean;
};

export type Side = "buy" | "sell";

export type TradeSignal = {
  side: Side;
  entry: number;
  stop: number;
  takeProfit: number;
  risk: number;
  reward: number;
  rr: 2;
  level: number;
  levelTime: number;
  counterpart: number;
};

export type LevelRef = {
  price: number;
  time: number;
  index: number;
};

export type Analysis = {
  swings: SwingPoint[];
  atr: number;
  wickAvg: number;
  wickHeavyShare: number;
  wickPass: boolean;
  zigzagPass: boolean;
  zigzagNote: string;
  majorHigh: LevelRef | null;
  majorLow: LevelRef | null;
  buyStructure: boolean;
  sellStructure: boolean;
  structureNote: string;
  pullbackSide: Side | null;
  signal: TradeSignal | null;
  blockReason: string | null;
  distanceToLow: number | null;
  distanceToHigh: number | null;
};

const REV_MULT = 2.15;
const WICK_HEAVY = 0.72;
const WICK_AVG_MAX = 0.645;
const WICK_SHARE_MAX = 0.45;
const MIN_PIVOTS = 3;
const MAX_PIVOTS = 10;

function averageTrueRange(candles: Candle[], period = 14): number {
  if (candles.length === 0) return 0;
  const trs: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i]!;
    if (i === 0) {
      trs.push(candle.high - candle.low);
      continue;
    }
    const prev = candles[i - 1]!.close;
    trs.push(
      Math.max(candle.high - candle.low, Math.abs(candle.high - prev), Math.abs(candle.low - prev)),
    );
  }
  const slice = trs.slice(-Math.min(period, trs.length));
  return slice.reduce((sum, value) => sum + value, 0) / slice.length;
}

function buildZigZag(candles: Candle[], reversal: number): SwingPoint[] {
  const pivots: SwingPoint[] = [];
  if (candles.length === 0 || reversal <= 0) return pivots;

  let hi = candles[0]!.high;
  let lo = candles[0]!.low;
  let hiIndex = 0;
  let loIndex = 0;
  let direction = 0;
  let extremeIndex = 0;
  let extremePrice = 0;

  const push = (kind: "high" | "low", index: number, price: number, developing: boolean) => {
    const candle = candles[index];
    if (!candle) return;
    pivots.push({ index, time: candle.time, price, kind, developing });
  };

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i]!;
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

  if (direction !== 0 && (pivots.length === 0 || pivots[pivots.length - 1]!.index !== extremeIndex)) {
    push(direction === 1 ? "high" : "low", extremeIndex, extremePrice, true);
  }
  return pivots;
}

function wickStats(candles: Candle[]) {
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
  return { avg, share, pass: avg <= WICK_AVG_MAX && share <= WICK_SHARE_MAX };
}

function extreme(points: SwingPoint[], kind: "high" | "low"): LevelRef | null {
  const pool = points.filter((point) => point.kind === kind && !point.developing);
  if (pool.length === 0) return null;
  const best = pool.reduce((winner, point) => {
    if (kind === "high") return point.price > winner.price ? point : winner;
    return point.price < winner.price ? point : winner;
  });
  return { price: best.price, time: best.time, index: best.index };
}

export function analyzeCandles(candles: Candle[]): Analysis {
  const base: Analysis = {
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
    distanceToHigh: null,
  };
  if (candles.length < 30) return base;

  const atr = averageTrueRange(candles);
  const last = candles[candles.length - 1]!;
  const wick = wickStats(candles);
  const reversal = Math.max(atr * REV_MULT, last.close * 0.004);
  const swings = buildZigZag(candles, reversal);
  const confirmed = swings.filter((point) => !point.developing);

  let zigzagPass = swings.length >= MIN_PIVOTS && swings.length <= MAX_PIVOTS;
  let zigzagNote = zigzagPass
    ? `زیگزاگ تمیز با ${toFaDigits(swings.length)} سوینگ`
    : swings.length < MIN_PIVOTS
      ? "زیگزاگ ناکافی است؛ قله و دره تمیز شکل نگرفته"
      : "زیگزاگ شلوغ است؛ لگ‌ها ریز و نامرتب‌اند";

  let tinyLegs = 0;
  for (let i = 1; i < confirmed.length; i++) {
    const leg = Math.abs(confirmed[i]!.price - confirmed[i - 1]!.price);
    if (leg < reversal * 0.75) tinyLegs += 1;
  }
  if (zigzagPass && tinyLegs > 0) {
    zigzagPass = false;
    zigzagNote = "لگ‌های زیگزاگ ریزند و خط تمیز نیست";
  }

  const majorHigh = extreme(swings, "high");
  const majorLow = extreme(swings, "low");
  const prox = Math.max(atr * 0.55, last.close * 0.003);

  const peakAfterLow = majorLow
    ? swings.find(
        (point) =>
          point.kind === "high" &&
          point.index > majorLow.index &&
          point.price > majorLow.price &&
          point.price - majorLow.price >= reversal * 0.8,
      )
    : undefined;
  const valleyAfterHigh = majorHigh
    ? swings.find(
        (point) =>
          point.kind === "low" &&
          point.index > majorHigh.index &&
          point.price < majorHigh.price &&
          majorHigh.price - point.price >= reversal * 0.8,
      )
    : undefined;

  const buyStructure = Boolean(peakAfterLow && majorLow && peakAfterLow.price > majorLow.price);
  const sellStructure = Boolean(valleyAfterHigh && majorHigh && valleyAfterHigh.price < majorHigh.price);

  let structureNote = "قله و دره هنوز جفت نشده‌اند";
  if (buyStructure && sellStructure) {
    structureNote = "قله بالاتر از دره است و برای ریزش، دره پایین‌تر از قله است";
  } else if (buyStructure) {
    structureNote = "قله بالاتر از دره است";
  } else if (sellStructure) {
    structureNote = "دره پایین‌تر از قله است";
  }

  const buyTouch = Boolean(
    majorLow &&
      last.close + prox * 0.2 >= majorLow.price &&
      last.close <= majorLow.price + prox &&
      last.low <= majorLow.price + prox * 0.35,
  );
  const sellTouch = Boolean(
    majorHigh &&
      last.close - prox * 0.2 <= majorHigh.price &&
      last.close >= majorHigh.price - prox &&
      last.high >= majorHigh.price - prox * 0.35,
  );

  let pullbackSide: Side | null = null;
  if (buyTouch && sellTouch && majorLow && majorHigh) {
    const toLow = Math.abs(last.close - majorLow.price);
    const toHigh = Math.abs(majorHigh.price - last.close);
    pullbackSide = toLow <= toHigh ? "buy" : "sell";
  } else if (buyTouch) pullbackSide = "buy";
  else if (sellTouch) pullbackSide = "sell";

  const distanceToLow = majorLow ? (last.close - majorLow.price) / last.close : null;
  const distanceToHigh = majorHigh ? (majorHigh.price - last.close) / last.close : null;

  const bufferFor = (level: number) => Math.max(level * 0.0012, atr * 0.22);

  let signal: TradeSignal | null = null;
  let blockReason: string | null = null;

  const structureOk =
    pullbackSide === "buy" ? buyStructure : pullbackSide === "sell" ? sellStructure : false;

  if (!zigzagPass) blockReason = zigzagNote;
  else if (!wick.pass) blockReason = "سایه ۶۰ کندل آخر زیاد است؛ بازار نقدینگی تمیز ندارد";
  else if (!pullbackSide) blockReason = "کندل‌ها هنوز به سوینگ‌لو یا سوینگ‌های پولبک نزده‌اند";
  else if (!structureOk && pullbackSide === "buy") blockReason = "برای خرید، قله باید بالاتر از دره باشد";
  else if (!structureOk && pullbackSide === "sell") blockReason = "برای فروش، دره باید پایین‌تر از قله باشد";
  else if (pullbackSide === "buy" && majorLow && peakAfterLow) {
    const entry = last.close;
    const stop = majorLow.price - bufferFor(majorLow.price);
    const risk = entry - stop;
    if (risk > 0 && stop < majorLow.price) {
      signal = {
        side: "buy",
        entry,
        stop,
        takeProfit: entry + risk * 2,
        risk,
        reward: risk * 2,
        rr: 2,
        level: majorLow.price,
        levelTime: majorLow.time,
        counterpart: peakAfterLow.price,
      };
    } else blockReason = "حد ضرر پایین‌تر از سوینگ‌لو جا نمی‌شود";
  } else if (pullbackSide === "sell" && majorHigh && valleyAfterHigh) {
    const entry = last.close;
    const stop = majorHigh.price + bufferFor(majorHigh.price);
    const risk = stop - entry;
    if (risk > 0 && stop > majorHigh.price) {
      signal = {
        side: "sell",
        entry,
        stop,
        takeProfit: entry - risk * 2,
        risk,
        reward: risk * 2,
        rr: 2,
        level: majorHigh.price,
        levelTime: majorHigh.time,
        counterpart: valleyAfterHigh.price,
      };
    } else blockReason = "حد ضرر بالاتر از سوینگ‌های جا نمی‌شود";
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
    distanceToHigh,
  };
}

function toFaDigits(value: number): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
}
