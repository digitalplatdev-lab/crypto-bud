import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Search, TrendingUp, TrendingDown, Filter } from 'lucide-react';

interface MarketData {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
}

export const MarketScreener: React.FC<{ onSelect: (symbol: string) => void }> = ({ onSelect }) => {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
        const data = await response.json();
        // Filter for USDT pairs and sort by volume
        const filtered = data
          .filter((m: any) => m.symbol.endsWith('USDT'))
          .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
          .slice(0, 50);
        setMarkets(filtered);
      } catch (error) {
        console.error('Error fetching markets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredMarkets = markets.filter(m => 
    m.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800">
      <div className="p-4 border-b border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-500" />
            Market Screener
          </h3>
          <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-500">
            Top 50 Vol
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input 
            placeholder="Search symbols..." 
            className="pl-9 bg-zinc-900/50 border-zinc-800 text-sm h-9 focus-visible:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading ? (
            Array(10).fill(0).map((_, i) => (
              <div key={i} className="h-12 bg-zinc-900/20 animate-pulse rounded m-2" />
            ))
          ) : (
            filteredMarkets.map((m) => {
              const change = parseFloat(m.priceChangePercent);
              return (
                <button
                  key={m.symbol}
                  onClick={() => onSelect(m.symbol)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-zinc-900/50 transition-colors group text-left"
                >
                  <div>
                    <div className="font-bold text-zinc-200 group-hover:text-white transition-colors">
                      {m.symbol.replace('USDT', '')}
                      <span className="text-[10px] text-zinc-600 ml-1">/USDT</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      Vol: {Math.round(parseFloat(m.quoteVolume) / 1000000)}M
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-white">
                      {parseFloat(m.lastPrice).toLocaleString()}
                    </div>
                    <div className={`flex items-center justify-end gap-1 text-xs font-bold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
