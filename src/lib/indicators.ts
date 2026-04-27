import { RSI, MACD, EMA, BollingerBands } from 'technicalindicators';

export interface IndicatorSettings {
  rsiPeriod: number;
  emaFast: number;
  emaSlow: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  bbPeriod: number;
  bbStdDev: number;
}

export const DEFAULT_SETTINGS: IndicatorSettings = {
  rsiPeriod: 14,
  emaFast: 20,
  emaSlow: 50,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  bbPeriod: 20,
  bbStdDev: 2,
};

export interface IndicatorData {
  rsi: number;
  macd: {
    MACD: number;
    signal: number;
    histogram: number;
  };
  emaFast: number;
  emaSlow: number;
  bb: {
    upper: number;
    middle: number;
    lower: number;
  };
}

export function calculateIndicators(candles: { close: number }[], settings: IndicatorSettings = DEFAULT_SETTINGS): IndicatorData | null {
  if (candles.length < Math.max(50, settings.macdSlow)) return null;

  const closes = candles.map(c => c.close);

  const rsiValues = RSI.calculate({ values: closes, period: settings.rsiPeriod });
  const macdValues = MACD.calculate({
    values: closes,
    fastPeriod: settings.macdFast,
    slowPeriod: settings.macdSlow,
    signalPeriod: settings.macdSignal,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const emaFastValues = EMA.calculate({ values: closes, period: settings.emaFast });
  const emaSlowValues = EMA.calculate({ values: closes, period: settings.emaSlow });
  const bbValues = BollingerBands.calculate({ values: closes, period: settings.bbPeriod, stdDev: settings.bbStdDev });

  return {
    rsi: rsiValues[rsiValues.length - 1],
    macd: macdValues[macdValues.length - 1] as any,
    emaFast: emaFastValues[emaFastValues.length - 1],
    emaSlow: emaSlowValues[emaSlowValues.length - 1],
    bb: bbValues[bbValues.length - 1],
  };
}
