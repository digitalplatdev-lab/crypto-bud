import React, { useState } from 'react';
import { 
  Bell, 
  Trash2, 
  Plus, 
  X, 
  Activity, 
  TrendingUp, 
  ChevronRight,
  RefreshCw,
  BellRing
} from 'lucide-react';
import { Badge } from './ui/badge';

interface Alert {
  id: string;
  symbol: string;
  type: 'PRICE_ABOVE' | 'PRICE_BELOW' | 'RSI_ABOVE' | 'RSI_BELOW' | 'MACD_CROSS';
  value?: number;
  active: boolean;
  createdAt: number;
}

interface AlertManagerProps {
  alerts: Alert[];
  symbol: string;
  onAdd: (alert: Omit<Alert, 'id' | 'active' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onClose: () => void;
}

export const AlertManager: React.FC<AlertManagerProps> = ({ 
  alerts, 
  symbol, 
  onAdd, 
  onDelete, 
  onToggle, 
  onClose 
}) => {
  const [newType, setNewType] = useState<Alert['type']>('PRICE_ABOVE');
  const [newValue, setNewValue] = useState<string>('');

  const handleAdd = () => {
    if (newType === 'MACD_CROSS' || newValue !== '') {
      onAdd({
        symbol,
        type: newType,
        value: newValue ? parseFloat(newValue) : undefined
      });
      setNewValue('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-500" />
          <h2 className="text-xs font-bold text-white uppercase tracking-widest">Alerts</h2>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 border-b border-zinc-800 space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Alert Type</label>
          <select 
            value={newType}
            onChange={(e) => setNewType(e.target.value as Alert['type'])}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500/50 outline-none"
          >
            <option value="PRICE_ABOVE">Price Above</option>
            <option value="PRICE_BELOW">Price Below</option>
            <option value="RSI_ABOVE">RSI Above</option>
            <option value="RSI_BELOW">RSI Below</option>
            <option value="MACD_CROSS">MACD Crossover</option>
          </select>
        </div>

        {newType !== 'MACD_CROSS' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Value</label>
            <input 
              type="number"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={newType.includes('PRICE') ? 'e.g. 65000' : 'e.g. 70'}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500/50 outline-none"
            />
          </div>
        )}

        <button 
          onClick={handleAdd}
          className="w-full h-8 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest rounded transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-3 h-3" /> Add Alert
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {alerts.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-10 h-10 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell className="w-4 h-4 text-zinc-700" />
            </div>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">No alerts active</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className={`p-3 rounded-lg border transition-all ${alert.active ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-950 border-zinc-900 opacity-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className={`w-3 h-3 ${alert.active ? 'text-blue-500' : 'text-zinc-600'}`} />
                  <span className="text-[10px] font-bold text-white tracking-widest">{alert.symbol}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => onToggle(alert.id)}
                    className={`p-1 rounded hover:bg-zinc-800 transition-colors ${alert.active ? 'text-green-500' : 'text-zinc-600'}`}
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => onDelete(alert.id)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                  {alert.type.replace('_', ' ')}
                </span>
                <span className="text-xs font-mono font-bold text-zinc-300">
                  {alert.type === 'MACD_CROSS' ? '---' : alert.value}
                </span>
              </div>

              {!alert.active && (
                <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                  <BellRing className="w-2.5 h-2.5" /> Triggered
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
