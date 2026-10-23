import { useEffect, useRef } from "react";
import type { CoinScan, Interval } from "@/lib/scan.functions";

const BUY = "#3dba7a";
const SELL = "#e36a5d";
const ACCENT = "#e0b15a";
const MUTED = "#8e9c93";
const GRID = "#2c3832";
const SURFACE = "#171d1a";

function precisionFor(price: number) {
  const abs = Math.abs(price);
  if (abs >= 100) return 2;
  if (abs >= 1) return 4;
  if (abs >= 0.01) return 5;
  if (abs >= 0.0001) return 6;
  return 8;
}

export function CandleChart({ coin, interval }: { coin: CoinScan; interval: Interval }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let removed = false;
    let chart: { remove: () => void } | null = null;

    void (async () => {
      const lc = await import("lightweight-charts");
      if (removed || !host.current) return;
      const price = coin.last || coin.candles[coin.candles.length - 1]?.close || 1;
      const precision = precisionFor(price);
      const instance = lc.createChart(host.current, {
        autoSize: true,
        layout: {
          background: { type: lc.ColorType.Solid, color: SURFACE },
          textColor: MUTED,
          fontFamily: "Vazirmatn, sans-serif",
        },
        grid: {
          vertLines: { color: GRID },
          horzLines: { color: GRID },
        },
        rightPriceScale: { borderColor: GRID },
        timeScale: {
          borderColor: GRID,
          timeVisible: interval !== "1d",
          secondsVisible: false,
          rightOffset: 2,
        },
        crosshair: {
          vertLine: { color: "#e0b15a55", labelBackgroundColor: "#212925" },
          horzLine: { color: "#e0b15a55", labelBackgroundColor: "#212925" },
        },
        localization: {
          priceFormatter: (value: number) => {
            return value.toLocaleString("en-US", {
              maximumFractionDigits: precision,
              minimumFractionDigits: precision > 4 ? 2 : 0,
            });
          },
        },
      });
      chart = instance;

      const candles = instance.addSeries(lc.CandlestickSeries, {
        upColor: BUY,
        downColor: SELL,
        borderUpColor: BUY,
        borderDownColor: SELL,
        wickUpColor: BUY,
        wickDownColor: SELL,
        priceFormat: { type: "price", precision, minMove: 10 ** -precision },
      });
      candles.setData(
        coin.candles.map((candle) => ({
          time: candle.time as never,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        })),
      );

      const zigzag = coin.analysis.swings
        .slice()
        .sort((a, b) => a.time - b.time)
        .filter((point, index, list) => index === 0 || point.time !== list[index - 1]!.time);
      if (zigzag.length >= 2) {
        const line = instance.addSeries(lc.LineSeries, {
          color: ACCENT,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
          priceFormat: { type: "price", precision, minMove: 10 ** -precision },
        });
        line.setData(zigzag.map((point) => ({ time: point.time as never, value: point.price })));
      }

      const { majorHigh, majorLow, signal } = coin.analysis;
      if (majorLow) {
        candles.createPriceLine({
          price: majorLow.price,
          color: BUY,
          lineWidth: 1,
          lineStyle: lc.LineStyle.Solid,
          axisLabelVisible: true,
          title: "کف",
        });
      }
      if (majorHigh) {
        candles.createPriceLine({
          price: majorHigh.price,
          color: SELL,
          lineWidth: 1,
          lineStyle: lc.LineStyle.Solid,
          axisLabelVisible: true,
          title: "سقف",
        });
      }
      if (signal) {
        candles.createPriceLine({
          price: signal.stop,
          color: SELL,
          lineWidth: 1,
          lineStyle: lc.LineStyle.Dashed,
          axisLabelVisible: true,
          title: "ضرر",
        });
        candles.createPriceLine({
          price: signal.takeProfit,
          color: BUY,
          lineWidth: 1,
          lineStyle: lc.LineStyle.Dashed,
          axisLabelVisible: true,
          title: "سود",
        });
        candles.createPriceLine({
          price: signal.entry,
          color: MUTED,
          lineWidth: 1,
          lineStyle: lc.LineStyle.Dotted,
          axisLabelVisible: true,
          title: "ورود",
        });
      }
      instance.timeScale().fitContent();
    })();

    return () => {
      removed = true;
      chart?.remove();
    };
  }, [coin, interval]);

  return <div ref={host} className="chart-frame w-full" dir="ltr" />;
}
