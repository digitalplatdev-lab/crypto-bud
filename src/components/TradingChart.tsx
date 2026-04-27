import React from 'react';
import { AdvancedRealTimeChart } from 'react-ts-tradingview-widgets';
import { GhostDrawingOverlay, GhostAction } from './GhostDrawingOverlay';

interface TradingChartProps {
  symbol: string;
  ghostActions?: GhostAction[];
  isGhostActive?: boolean;
  onGhostComplete?: () => void;
}

export const TradingChart: React.FC<TradingChartProps> = ({ 
  symbol, 
  ghostActions = [], 
  isGhostActive = false, 
  onGhostComplete = () => {} 
}) => {
  // TradingView uses BINANCE:BTCUSDT.P for futures or BINANCE:BTCUSDT for spot
  const tvSymbol = `BINANCE:${symbol}`;

  return (
    <div className="relative w-full h-full border border-zinc-800 rounded-lg overflow-hidden bg-black shadow-2xl">
      <AdvancedRealTimeChart
        symbol={tvSymbol}
        theme="dark"
        autosize
        interval="15"
        timezone="Etc/UTC"
        style="1"
        locale="en"
        toolbar_bg="#000000"
        enable_publishing={false}
        hide_side_toolbar={false}
        allow_symbol_change={false}
        container_id="tradingview_chart"
        details={true}
        hotlist={true}
        calendar={true}
        show_popup_button={true}
        popup_width="1000"
        popup_height="650"
      />
      
      <GhostDrawingOverlay 
        actions={ghostActions} 
        isActive={isGhostActive} 
        onComplete={onGhostComplete} 
      />
    </div>
  );
};
