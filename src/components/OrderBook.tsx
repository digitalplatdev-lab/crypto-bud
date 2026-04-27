import React, { useEffect, useState, useRef } from 'react';
import { subscribeDepth, DepthData } from '../lib/binance';

interface OrderBookProps {
  symbol: string;
}

export const OrderBook: React.FC<OrderBookProps> = ({ symbol }) => {
  const [depth, setDepth] = useState<DepthData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    wsRef.current = subscribeDepth(symbol, (newDepth) => {
      setDepth(newDepth);
    });
    return () => {
      wsRef.current?.close();
    };
  }, [symbol]);

  if (!depth) return <div className="p-4 text-zinc-500 font-mono text-xs">Loading Order Book...</div>;

  const maxTotal = Math.max(
    ...depth.bids.map(b => parseFloat(b[1])),
    ...depth.asks.map(a => parseFloat(a[1]))
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950/50 overflow-hidden font-mono text-[10px]">
      <div className="grid grid-cols-3 p-2 text-zinc-500 border-b border-zinc-800 uppercase font-bold tracking-tighter">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Sum</span>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Asks (Sell) */}
        <div className="flex flex-col-reverse">
          {depth.asks.slice(0, 8).map((ask, i) => {
            const price = parseFloat(ask[0]);
            const size = parseFloat(ask[1]);
            const perc = (size / maxTotal) * 100;
            return (
              <div key={`ask-${i}`} className="relative grid grid-cols-3 px-2 py-0.5 hover:bg-zinc-900 transition-colors">
                <div className="absolute right-0 top-0 bottom-0 bg-red-500/10 pointer-events-none transition-all duration-300" style={{ width: `${perc}%` }} />
                <span className="text-red-400 z-10">{price.toFixed(2)}</span>
                <span className="text-right text-zinc-300 z-10">{size.toFixed(3)}</span>
                <span className="text-right text-zinc-500 z-10">---</span>
              </div>
            );
          })}
        </div>

        {/* Spread */}
        <div className="py-2 px-2 border-y border-zinc-800 bg-zinc-900/30 flex justify-between items-center">
          <span className="text-xs font-bold text-white">
            {depth.bids.length > 0 && depth.asks.length > 0 
              ? (parseFloat(depth.asks[0][0]) - parseFloat(depth.bids[0][0])).toFixed(2)
              : '0.00'
            }
          </span>
          <span className="text-zinc-500 text-[8px]">SPREAD</span>
        </div>

        {/* Bids (Buy) */}
        <div>
          {depth.bids.slice(0, 8).map((bid, i) => {
            const price = parseFloat(bid[0]);
            const size = parseFloat(bid[1]);
            const perc = (size / maxTotal) * 100;
            return (
              <div key={`bid-${i}`} className="relative grid grid-cols-3 px-2 py-0.5 hover:bg-zinc-900 transition-colors">
                <div className="absolute right-0 top-0 bottom-0 bg-green-500/10 pointer-events-none transition-all duration-300" style={{ width: `${perc}%` }} />
                <span className="text-green-400 z-10">{price.toFixed(2)}</span>
                <span className="text-right text-zinc-300 z-10">{size.toFixed(3)}</span>
                <span className="text-right text-zinc-500 z-10">---</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
