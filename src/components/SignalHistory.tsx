import React, { useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  History, 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  Clock, 
  Target, 
  ShieldCheck,
  Percent
} from 'lucide-react';
import { motion } from 'motion/react';

interface HistoricalSignal {
  id: string;
  symbol: string;
  action: 'LONG' | 'SHORT' | 'WAIT';
  entry: number;
  takeProfit: number;
  stopLoss: number;
  reasoning: string;
  timestamp: number;
  status: 'ACTIVE' | 'TP' | 'SL' | 'EXPIRED';
  profit?: number;
}

interface SignalHistoryProps {
  history: HistoricalSignal[];
}

export const SignalHistory: React.FC<SignalHistoryProps> = ({ history }) => {
  const stats = useMemo(() => {
    const completed = history.filter(s => s.status === 'TP' || s.status === 'SL');
    const wins = completed.filter(s => s.status === 'TP').length;
    const losses = completed.filter(s => s.status === 'SL').length;
    const totalPnL = completed.reduce((acc, curr) => acc + (curr.profit || 0), 0);
    const winRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;
    const avgPnL = completed.length > 0 ? totalPnL / completed.length : 0;

    return {
      total: completed.length,
      wins,
      losses,
      totalPnL,
      winRate,
      avgPnL
    };
  }, [history]);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto overflow-y-auto h-full pb-20">
      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
              <History className="w-3 h-3" /> Total Closed
            </div>
            <div className="text-2xl font-mono font-bold text-white">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
              <Percent className="w-3 h-3" /> Win Rate
            </div>
            <div className="text-2xl font-mono font-bold text-blue-500">{stats.winRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
              <BarChart2 className="w-3 h-3" /> Avg PnL
            </div>
            <div className={`text-2xl font-mono font-bold ${stats.avgPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.avgPnL >= 0 ? '+' : ''}{stats.avgPnL.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
              <Target className="w-3 h-3" /> Total Profit
            </div>
            <div className={`text-2xl font-mono font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Clock className="w-3 h-3" /> Closed Positions
        </h3>
        
        <div className="grid grid-cols-1 gap-3">
          {history.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
              <p className="text-zinc-500 text-sm">No historical signals yet. Let the AI find some opportunities!</p>
            </div>
          ) : (
            history.slice().reverse().map((signal) => (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`relative overflow-hidden rounded-xl border ${
                  signal.status === 'TP' ? 'bg-green-500/5 border-green-500/20' : 
                  signal.status === 'SL' ? 'bg-red-500/5 border-red-500/20' : 
                  'bg-zinc-900/40 border-zinc-800'
                } p-4 transition-all hover:bg-zinc-900/60`}
              >
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <Badge className={signal.action === 'LONG' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
                        {signal.action}
                      </Badge>
                      <span className="font-bold text-white tracking-widest">{signal.symbol}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(signal.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2 italic leading-relaxed">
                      "{signal.reasoning}"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-4 md:border-l md:border-zinc-800/50">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter block">Entry</span>
                      <span className="text-xs font-mono font-bold text-white">${signal.entry.toLocaleString()}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter block">Result</span>
                      <span className={`text-xs font-mono font-bold ${
                        signal.status === 'TP' ? 'text-green-500' : 
                        signal.status === 'SL' ? 'text-red-500' : 
                        'text-zinc-500'
                      }`}>
                        {signal.status === 'TP' ? 'Profit Target' : signal.status === 'SL' ? 'Stop Loss' : signal.status}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter block">Closed At</span>
                      <span className="text-xs font-mono font-bold text-white">
                        ${(signal.status === 'TP' ? signal.takeProfit : signal.stopLoss).toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter block">PnL</span>
                      <span className={`text-sm font-mono font-bold ${
                        (signal.profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {(signal.profit || 0) >= 0 ? '+' : ''}{(signal.profit || 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
