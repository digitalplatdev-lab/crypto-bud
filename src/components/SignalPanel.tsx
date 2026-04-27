import React, { useState } from 'react';
import { TradingSignal } from '../services/gemini';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown, Clock, Target, ShieldAlert, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AnalysisChart } from './AnalysisChart';
import { Candle } from '../lib/binance';
import { Button } from './ui/button';

interface SignalPanelProps {
  signals: (TradingSignal & { 
    id: string; 
    timestamp: number; 
    status: 'ACTIVE' | 'TP' | 'SL' | 'EXPIRED';
    profit?: number;
  })[];
  candles: Candle[];
}

export const SignalPanel: React.FC<SignalPanelProps> = ({ signals, candles }) => {
  const stats = React.useMemo(() => {
    const completed = signals.filter(s => s.status === 'TP' || s.status === 'SL');
    const wins = completed.filter(s => s.status === 'TP').length;
    const totalPnL = completed.reduce((acc, curr) => acc + (curr.profit || 0), 0);
    const winRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;
    const avgPnL = completed.length > 0 ? totalPnL / completed.length : 0;
    return { winRate, avgPnL, total: completed.length };
  }, [signals]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">AI Signals</h3>
        <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
          Live Monitoring
        </Badge>
      </div>

      {stats.total > 0 && (
        <div className="grid grid-cols-2 gap-2 pb-2">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-2 flex flex-col justify-center">
            <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest text-center">Win Rate</div>
            <div className="text-sm font-mono font-bold text-blue-500 text-center">{stats.winRate.toFixed(1)}%</div>
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-2 flex flex-col justify-center">
            <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest text-center">Avg PnL</div>
            <div className={`text-sm font-mono font-bold text-center ${stats.avgPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.avgPnL >= 0 ? '+' : ''}{stats.avgPnL.toFixed(2)}%
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {signals.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm italic">
              Waiting for market triggers...
            </div>
          ) : (
            signals.map((signal) => (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors overflow-hidden">
                  <div className={`h-1 w-full ${
                    signal.action === 'LONG' ? 'bg-green-500' : 
                    signal.action === 'SHORT' ? 'bg-red-500' : 'bg-zinc-600'
                  }`} />
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        {signal.action === 'LONG' ? (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : signal.action === 'SHORT' ? (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-zinc-400" />
                        )}
                        <span className={`font-bold text-lg ${
                          signal.action === 'LONG' ? 'text-green-500' : 
                          signal.action === 'SHORT' ? 'text-red-500' : 'text-zinc-400'
                        }`}>
                          {signal.action}
                        </span>
                      </div>
                      <Badge className={`${
                        signal.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        signal.status === 'TP' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        signal.status === 'SL' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                      }`}>
                        {signal.status}
                        {signal.profit !== undefined && (
                          <span className="ml-1.5 border-l border-current pl-1.5 font-mono">
                            {signal.profit >= 0 ? '+' : ''}{signal.profit.toFixed(1)}%
                          </span>
                        )}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-black/30 p-2 rounded border border-zinc-800/50">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Entry</div>
                        <div className="text-sm font-mono text-white">{signal.entry.toFixed(2)}</div>
                      </div>
                      <div className="bg-black/30 p-2 rounded border border-zinc-800/50">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1">
                          <Target className="w-3 h-3 text-green-500" /> TP
                        </div>
                        <div className="text-sm font-mono text-green-400">{signal.takeProfit.toFixed(2)}</div>
                      </div>
                      <div className="bg-black/30 p-2 rounded border border-zinc-800/50">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-red-500" /> SL
                        </div>
                        <div className="text-sm font-mono text-red-400">{signal.stopLoss.toFixed(2)}</div>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed italic mb-4">
                      "{signal.reasoning}"
                    </p>

                    <Dialog>
                      <DialogTrigger 
                        render={
                          <Button variant="outline" size="sm" className="w-full bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700 text-xs gap-2" />
                        }
                      >
                        <BarChart3 className="w-3 h-3" /> Visual Analysis
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl bg-zinc-950 border-zinc-800">
                        <DialogHeader>
                          <DialogTitle className="text-white flex items-center gap-2">
                            {signal.action} Signal Analysis - {new Date(signal.timestamp).toLocaleString()}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          <AnalysisChart data={candles} signal={signal} />
                          <div className="mt-4 grid grid-cols-3 gap-4">
                            <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                              <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Risk/Reward</div>
                              <div className="text-lg font-mono text-white">
                                {(Math.abs(signal.takeProfit - signal.entry) / Math.abs(signal.entry - signal.stopLoss)).toFixed(2)}
                              </div>
                            </div>
                            <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                              <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Confidence</div>
                              <div className="text-lg font-mono text-white">{(signal.confidence * 100).toFixed(0)}%</div>
                            </div>
                            <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                              <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Status</div>
                              <div className={`text-lg font-bold ${
                                signal.status === 'TP' ? 'text-green-500' : 
                                signal.status === 'SL' ? 'text-red-500' : 'text-blue-500'
                              }`}>{signal.status}</div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-600">
                      <span>Confidence: {(signal.confidence * 100).toFixed(0)}%</span>
                      <span>{new Date(signal.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
