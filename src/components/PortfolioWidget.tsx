import React from 'react';
import { Card, CardContent } from './ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const MOCK_ASSETS = [
  { name: 'BTC', value: 45000, color: '#F7931A', amount: '0.65' },
  { name: 'ETH', value: 28000, color: '#627EEA', amount: '8.4' },
  { name: 'SOL', value: 12000, color: '#14F195', amount: '85.2' },
  { name: 'USDT', value: 15000, color: '#26A17B', amount: '15000' },
];

export const PortfolioWidget: React.FC = () => {
  const totalValue = MOCK_ASSETS.reduce((acc, curr) => acc + curr.value, 0);
  const dailyPnL = 1245.50;
  const pnlPercent = 1.25;

  return (
    <div className="flex flex-col h-full bg-zinc-950/20 p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <Wallet className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Equity</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white tabular-nums">
            ${totalValue.toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1 text-xs font-bold ${dailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {dailyPnL >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>${dailyPnL.toFixed(2)}</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-bold">Today's PnL</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1">
        <div className="h-full min-h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={MOCK_ASSETS}
                innerRadius={35}
                outerRadius={55}
                paddingAngle={5}
                dataKey="value"
              >
                {MOCK_ASSETS.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                itemStyle={{ color: '#fff', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {MOCK_ASSETS.map((asset) => (
            <div key={asset.name} className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: asset.color }} />
                <span className="text-[10px] font-bold text-zinc-300">{asset.name}</span>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono font-bold text-white">${asset.value.toLocaleString()}</div>
                <div className="text-[8px] text-zinc-500">{asset.amount} {asset.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-zinc-800">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-zinc-500 font-bold uppercase tracking-tighter">Daily Target</span>
          <span className="text-green-500 font-bold">85% Achieved</span>
        </div>
        <div className="w-full h-1 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: '85%' }} />
        </div>
      </div>
    </div>
  );
};
