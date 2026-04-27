import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries } from 'lightweight-charts';
import { Candle } from '../lib/binance';
import { TradingSignal } from '../services/gemini';

interface AnalysisChartProps {
  data: Candle[];
  signal: TradingSignal;
}

export const AnalysisChart: React.FC<AnalysisChartProps> = ({ data, signal }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Add Price Lines for Signal
    candlestickSeries.createPriceLine({
      price: signal.entry,
      color: '#3b82f6',
      lineWidth: 2,
      lineStyle: 0, // Solid
      axisLabelVisible: true,
      title: 'ENTRY',
    });

    candlestickSeries.createPriceLine({
      price: signal.takeProfit,
      color: '#22c55e',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: 'TAKE PROFIT',
    });

    candlestickSeries.createPriceLine({
      price: signal.stopLoss,
      color: '#ef4444',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: 'STOP LOSS',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    seriesRef.current.setData(data as any);

    // Fit content
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [data, signal]);

  return (
    <div className="w-full h-[400px] bg-black rounded-lg overflow-hidden border border-zinc-800">
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
};
