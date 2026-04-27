/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { fetchKlines, subscribeKlines, Candle } from './lib/binance';
import { calculateIndicators, IndicatorData, IndicatorSettings, DEFAULT_SETTINGS } from './lib/indicators';
import { getTradingAnalysis, TradingSignal } from './services/gemini';
import { TradingChart } from './components/TradingChart';
import { SignalPanel } from './components/SignalPanel';
import { AIChat } from './components/AIChat';
import { MarketScreener } from './components/MarketScreener';
import { NewsFeed } from './components/NewsFeed';
import { OrderBook } from './components/OrderBook';
import { PortfolioWidget } from './components/PortfolioWidget';
import { Card, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { 
  Activity, Wallet, TrendingUp, TrendingDown, RefreshCw, 
  AlertCircle, LayoutDashboard, Newspaper, Filter, Search, 
  Settings, GripVertical, Maximize2, History as HistoryIcon,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SignalHistory } from './components/SignalHistory';
import { AlertManager } from './components/AlertManager';
import { GhostAction } from './components/GhostDrawingOverlay';

const ResponsiveGridLayout = WidthProvider(Responsive);

type SignalStatus = 'ACTIVE' | 'TP' | 'SL' | 'EXPIRED';

interface TradingAlert {
  id: string;
  symbol: string;
  type: 'PRICE_ABOVE' | 'PRICE_BELOW' | 'RSI_ABOVE' | 'RSI_BELOW' | 'MACD_CROSS';
  value?: number;
  active: boolean;
  createdAt: number;
}

interface SignalWithMetadata extends TradingSignal {
  id: string;
  timestamp: number;
  status: SignalStatus;
  symbol: string;
  profit?: number;
}

const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'chart', x: 0, y: 0, w: 9, h: 14, minW: 4, minH: 6 },
    { i: 'signals', x: 9, y: 0, w: 3, h: 7, minW: 2, minH: 4 },
    { i: 'chat', x: 9, y: 7, w: 3, h: 7, minW: 2, minH: 4 },
    { i: 'health', x: 0, y: 14, w: 3, h: 5, minW: 2, minH: 2 },
    { i: 'news', x: 3, y: 14, w: 6, h: 5, minW: 3, minH: 2 },
    { i: 'stats', x: 9, y: 14, w: 3, h: 5, minW: 2, minH: 2 },
    { i: 'orderbook', x: 0, y: 19, w: 3, h: 8, minW: 2, minH: 4 },
    { i: 'portfolio', x: 3, y: 19, w: 9, h: 8, minW: 4, minH: 4 },
  ]
};

export default function App() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [searchInput, setSearchInput] = useState('');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [indicators, setIndicators] = useState<IndicatorData | null>(null);
  const [indicatorSettings, setIndicatorSettings] = useState<IndicatorSettings>(DEFAULT_SETTINGS);
  const [signals, setSignals] = useState<SignalWithMetadata[]>([]);
  const [pnl, setPnl] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisPrice, setLastAnalysisPrice] = useState<number | null>(null);
  const [lastAnalysisRsi, setLastAnalysisRsi] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'screener' | 'history'>('chart');
  const [alerts, setAlerts] = useState<TradingAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [ghostActions, setGhostActions] = useState<GhostAction[]>([]);
  const [isGhostActive, setIsGhostActive] = useState(false);
  const [layouts, setLayouts] = useState(() => {
    const saved = localStorage.getItem('dashboard-layout');
    return saved ? JSON.parse(saved) : DEFAULT_LAYOUTS;
  });
  const [showSettings, setShowSettings] = useState(false);

  // Persistence for signals & alerts
  useEffect(() => {
    const savedSignals = localStorage.getItem('trading-signals');
    if (savedSignals) setSignals(JSON.parse(savedSignals));
    
    const savedAlerts = localStorage.getItem('trading-alerts');
    if (savedAlerts) setAlerts(JSON.parse(savedAlerts));

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('trading-signals', JSON.stringify(signals));
  }, [signals]);

  useEffect(() => {
    localStorage.setItem('trading-alerts', JSON.stringify(alerts));
  }, [alerts]);

  const candlesRef = useRef<Candle[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Initial Data Fetch
  useEffect(() => {
    const init = async () => {
      setCandles([]);
      setIndicators(null);
      setSignals([]);
      setLastAnalysisPrice(null);
      setLastAnalysisRsi(null);

      const data = await fetchKlines(symbol);
      setCandles(data);
      candlesRef.current = data;
      
      const ind = calculateIndicators(data, indicatorSettings);
      setIndicators(ind);
    };
    init();

    wsRef.current = subscribeKlines(symbol, '15m', (newCandle) => {
      setCandles(prev => {
        const last = prev[prev.length - 1];
        let updated;
        if (last && last.time === newCandle.time) {
          updated = [...prev.slice(0, -1), newCandle];
        } else {
          updated = [...prev, newCandle].slice(-200);
        }
        candlesRef.current = updated;
        return updated;
      });
    });

    return () => {
      wsRef.current?.close();
    };
  }, [symbol, indicatorSettings]);

  // Indicator Calculation & AI Trigger Logic
  useEffect(() => {
    if (candles.length < Math.max(50, indicatorSettings.macdSlow)) return;

    const ind = calculateIndicators(candles, indicatorSettings);
    setIndicators(ind);

    if (!ind) return;

    const currentPrice = candles[candles.length - 1].close;
    
    const shouldAnalyze = () => {
      if (isAnalyzing) return false;
      if (lastAnalysisPrice === null) return true;

      const priceMove = Math.abs((currentPrice - lastAnalysisPrice) / lastAnalysisPrice);
      if (priceMove > 0.003) return true;

      if (lastAnalysisRsi !== null) {
        const crossed70 = (lastAnalysisRsi < 70 && ind.rsi >= 70) || (lastAnalysisRsi > 70 && ind.rsi <= 70);
        const crossed30 = (lastAnalysisRsi > 30 && ind.rsi <= 30) || (lastAnalysisRsi < 30 && ind.rsi >= 30);
        if (crossed70 || crossed30) return true;
      }

      // MACD Crossover Detection
      if (candles.length > 2) {
        const prevInd = calculateIndicators(candles.slice(0, -1), indicatorSettings);
        if (prevInd) {
          const crossedUp = prevInd.macd.histogram < 0 && ind.macd.histogram >= 0;
          const crossedDown = prevInd.macd.histogram > 0 && ind.macd.histogram <= 0;
          if (crossedUp || crossedDown) return true;
        }
      }

      return false;
    };

    if (shouldAnalyze()) {
      triggerAnalysis(currentPrice, ind);
    }

    checkAlerts(currentPrice, ind);
    checkSignals(currentPrice);
  }, [candles]);

  const checkAlerts = useCallback((price: number, ind: IndicatorData) => {
    const triggered = alerts.filter(alert => {
      if (!alert.active || alert.symbol !== symbol) return false;
      
      switch (alert.type) {
        case 'PRICE_ABOVE': return price >= (alert.value || 0);
        case 'PRICE_BELOW': return price <= (alert.value || 0);
        case 'RSI_ABOVE': return ind.rsi >= (alert.value || 0);
        case 'RSI_BELOW': return ind.rsi <= (alert.value || 0);
        case 'MACD_CROSS': {
          // Simplified: any histogram sign change counts as a cross for alert purposes if typed as such
          const prevInd = candles.length > 1 ? calculateIndicators(candles.slice(0, -1), indicatorSettings) : null;
          return prevInd && ((prevInd.macd.histogram < 0 && ind.macd.histogram >= 0) || (prevInd.macd.histogram > 0 && ind.macd.histogram <= 0));
        }
        default: return false;
      }
    });

    triggered.forEach(alert => {
      if (Notification.permission === 'granted') {
        new Notification(`CryptoAI Alert: ${alert.symbol}`, {
          body: `${alert.type.replace('_', ' ')} triggered at ${price}`,
          icon: '/favicon.ico'
        });
      }
      // Deactivate alert after triggering
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, active: false } : a));
    });
  }, [alerts, symbol, candles, indicatorSettings]);

  const triggerAnalysis = async (price: number, ind: IndicatorData) => {
    setIsAnalyzing(true);
    try {
      const signal = await getTradingAnalysis(symbol, price, ind, candlesRef.current, indicatorSettings);
      if (signal.action !== 'WAIT') {
        const newSignal: SignalWithMetadata = {
          ...signal,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          status: 'ACTIVE',
          symbol: symbol
        };
        setSignals(prev => [newSignal, ...prev].slice(0, 50));
      }
      setLastAnalysisPrice(price);
      setLastAnalysisRsi(ind.rsi);
    } catch (error) {
      console.error("Analysis trigger failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const checkSignals = useCallback((currentPrice: number) => {
    setSignals(prev => prev.map(sig => {
      if (sig.status !== 'ACTIVE') return sig;

      let newStatus: SignalStatus = 'ACTIVE';
      let profit = 0;

      if (sig.action === 'LONG') {
        if (currentPrice >= sig.takeProfit) {
          newStatus = 'TP';
          profit = (sig.takeProfit - sig.entry) / sig.entry * 100 * 10;
        } else if (currentPrice <= sig.stopLoss) {
          newStatus = 'SL';
          profit = (sig.stopLoss - sig.entry) / sig.entry * 100 * 10;
        }
      } else if (sig.action === 'SHORT') {
        if (currentPrice <= sig.takeProfit) {
          newStatus = 'TP';
          profit = (sig.entry - sig.takeProfit) / sig.entry * 100 * 10;
        } else if (currentPrice >= sig.stopLoss) {
          newStatus = 'SL';
          profit = (sig.entry - sig.stopLoss) / sig.entry * 100 * 10;
        }
      }

      if (newStatus !== 'ACTIVE') {
        setPnl(p => p + profit);
        return { ...sig, status: newStatus, profit };
      }
      return sig;
    }));
  }, []);

  const onLayoutChange = (currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    localStorage.setItem('dashboard-layout', JSON.stringify(allLayouts));
  };

  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-blue-500/30">
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">CRYPTO<span className="text-blue-500">AI</span></h1>
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
            <button 
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'chart' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <LayoutDashboard className="w-3 h-3" /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('screener')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'screener' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Filter className="w-3 h-3" /> Screener
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <HistoryIcon className="w-3 h-3" /> History
            </button>
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="relative group">
            <button 
              onClick={() => {
                if (searchInput) {
                  const val = searchInput.toUpperCase();
                  setSymbol(val.includes('USDT') ? val : `${val}USDT`);
                  setSearchInput('');
                }
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-blue-500 transition-colors z-10"
            >
              <Search className="w-3 h-3" />
            </button>
            <input 
              type="text"
              placeholder="Search symbol..."
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 focus:bg-zinc-900 transition-all w-40"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = searchInput.toUpperCase();
                  if (val) {
                    setSymbol(val.includes('USDT') ? val : `${val}USDT`);
                    setSearchInput('');
                  }
                }
              }}
            />
          </div>
          <button 
            onClick={() => setShowAlerts(!showAlerts)}
            className={`p-2 hover:bg-zinc-800 rounded-lg transition-colors ${showAlerts ? 'text-blue-500 bg-zinc-800' : 'text-zinc-500 hover:text-white'}`}
          >
            <Bell className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Tracking: {symbol}</span>
            <span className="text-xl font-mono font-bold text-white tabular-nums">
              {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Session PnL (10x)</span>
            <span className={`text-xl font-mono font-bold tabular-nums ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
            </span>
          </div>
        </div>
      </header>

      <main className="flex h-[calc(100vh-64px)] overflow-hidden relative">
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -1000 }}
              className="absolute left-0 top-0 bottom-0 w-80 bg-zinc-950 border-r border-zinc-800 z-[100] p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Indicator Settings</h2>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
                  <AlertCircle className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter block mb-3">RSI Period</label>
                  <input 
                    type="range" min="2" max="50" step="1"
                    value={indicatorSettings.rsiPeriod}
                    onChange={(e) => setIndicatorSettings(p => ({ ...p, rsiPeriod: parseInt(e.target.value) }))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between mt-2 font-mono text-[10px] text-zinc-400">
                    <span>2</span>
                    <span className="text-blue-500 font-bold">{indicatorSettings.rsiPeriod}</span>
                    <span>50</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter block mb-2">EMA Fast</label>
                    <input 
                      type="number"
                      value={indicatorSettings.emaFast}
                      onChange={(e) => setIndicatorSettings(p => ({ ...p, emaFast: parseInt(e.target.value) }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter block mb-2">EMA Slow</label>
                    <input 
                      type="number"
                      value={indicatorSettings.emaSlow}
                      onChange={(e) => setIndicatorSettings(p => ({ ...p, emaSlow: parseInt(e.target.value) }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter block">MACD Configuration</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-600">Fast</span>
                      <input type="number" value={indicatorSettings.macdFast} onChange={(e) => setIndicatorSettings(p => ({ ...p, macdFast: parseInt(e.target.value) }))} className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-xs text-white" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-600">Slow</span>
                      <input type="number" value={indicatorSettings.macdSlow} onChange={(e) => setIndicatorSettings(p => ({ ...p, macdSlow: parseInt(e.target.value) }))} className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-xs text-white" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-600">Sig</span>
                      <input type="number" value={indicatorSettings.macdSignal} onChange={(e) => setIndicatorSettings(p => ({ ...p, macdSignal: parseInt(e.target.value) }))} className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-xs text-white" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800">
                  <button 
                    onClick={() => {
                      setIndicatorSettings(DEFAULT_SETTINGS);
                      localStorage.removeItem('indicator-settings');
                    }}
                    className="text-[10px] text-zinc-500 hover:text-white underline"
                  >
                    Reset defaults
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alerts Panel */}
        <AnimatePresence>
          {showAlerts && (
            <motion.div 
              initial={{ x: -400 }}
              animate={{ x: 0 }}
              exit={{ x: -1000 }}
              className="absolute left-0 top-0 bottom-0 w-80 bg-zinc-950 border-r border-zinc-800 z-[100] p-0 flex flex-col"
            >
              <AlertManager 
                alerts={alerts} 
                symbol={symbol}
                onAdd={(newAlert) => setAlerts(prev => [...prev, { ...newAlert, id: Date.now().toString(), active: true, createdAt: Date.now() }])}
                onDelete={(id) => setAlerts(prev => prev.filter(a => a.id !== id))}
                onToggle={(id) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a))}
                onClose={() => setShowAlerts(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-x-hidden overflow-y-auto w-full">
          <AnimatePresence mode="wait">
            {activeTab === 'chart' && (
              <motion.div 
                key="chart"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                <ResponsiveGridLayout
                  className="layout"
                  layouts={layouts}
                  breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                  cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                  rowHeight={40}
                  draggableHandle=".drag-handle"
                  onLayoutChange={onLayoutChange}
                >
                  <div key="chart" className="flex flex-col">
                    <Card className="flex-1 bg-zinc-950 border-zinc-800 overflow-hidden flex flex-col group relative">
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-3 py-1 rounded-full cursor-move drag-handle">
                        <GripVertical className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Move Chart</span>
                      </div>
                      <TradingChart 
                        key={symbol} 
                        symbol={symbol} 
                        ghostActions={ghostActions}
                        isGhostActive={isGhostActive}
                        onGhostComplete={() => setIsGhostActive(false)}
                      />
                    </Card>
                  </div>

                  <div key="signals">
                    <Card className="h-full bg-zinc-950 border-zinc-800 overflow-hidden flex flex-col group relative">
                      <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
                        <div className="flex items-center gap-2 drag-handle cursor-move">
                          <Activity className="w-3 h-3 text-blue-500" />
                          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Signals</h3>
                        </div>
                        <GripVertical className="w-3 h-3 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        <SignalPanel signals={signals} candles={candles} />
                      </div>
                    </Card>
                  </div>

                  <div key="chat">
                    <Card className="h-full bg-zinc-950 border-zinc-800 overflow-hidden flex flex-col group relative">
                      <div className="flex-1">
                        <AIChat 
                          marketContext={{
                            symbol,
                            price: currentPrice,
                            indicators,
                            pnl,
                            activeSignals: signals.filter(s => s.status === 'ACTIVE')
                          }} 
                          onGhostAnalysis={(actions) => {
                            setGhostActions(actions);
                            setIsGhostActive(true);
                          }}
                        />
                      </div>
                      <div className="absolute top-4 left-4 drag-handle opacity-0 group-hover:opacity-100 transition-opacity cursor-move bg-zinc-950 p-1 border border-zinc-800 rounded">
                        <GripVertical className="w-3 h-3 text-zinc-500" />
                      </div>
                    </Card>
                  </div>

                  <div key="health">
                    <Card className="h-full bg-zinc-950 border-zinc-800 overflow-hidden group">
                      <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20 drag-handle cursor-move">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Health</h3>
                        <GripVertical className="w-3 h-3 text-zinc-700 opacity-0 group-hover:opacity-100" />
                      </div>
                      <div className="p-4 space-y-3">
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold">RSI</span>
                            <span className={`font-mono text-xs font-bold ${!indicators ? 'text-zinc-700' : indicators.rsi > 70 ? 'text-red-500' : indicators.rsi < 30 ? 'text-green-500' : 'text-blue-500'}`}>
                              {indicators ? indicators.rsi.toFixed(2) : '---'}
                            </span>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold">EMA Cross</span>
                            <Badge variant="outline" className={`text-[9px] h-4 px-1 ${
                              !indicators ? 'border-zinc-800 text-zinc-700' :
                              indicators.emaFast > indicators.emaSlow ? 'border-green-500/30 text-green-500' : 'border-red-500/30 text-red-500'
                            }`}>
                              {!indicators ? '---' : indicators.emaFast > indicators.emaSlow ? 'UP' : 'DOWN'}
                            </Badge>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold">MACD</span>
                            <span className={`font-mono text-xs font-bold ${!indicators ? 'text-zinc-700' : indicators.macd.histogram > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {indicators ? indicators.macd.histogram.toFixed(4) : '---'}
                            </span>
                         </div>
                      </div>
                    </Card>
                  </div>

                  <div key="news">
                    <Card className="h-full bg-zinc-950 border-zinc-800 overflow-hidden group flex flex-col">
                      <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20 drag-handle cursor-move">
                         <div className="flex items-center gap-2">
                            <Newspaper className="w-3 h-3 text-blue-500" />
                            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Market News</h3>
                         </div>
                         <GripVertical className="w-3 h-3 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        <NewsFeed />
                      </div>
                    </Card>
                  </div>

                  <div key="stats">
                    <Card className="h-full bg-zinc-950 border-zinc-800 overflow-hidden group">
                      <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20 drag-handle cursor-move">
                         <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Account Stats</h3>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <div className="text-[10px] text-zinc-500 leading-none">EQUITY</div>
                            <div className="text-lg font-bold text-white leading-tight">$10,000</div>
                         </div>
                         <div className="space-y-1 text-right">
                            <div className="text-[10px] text-zinc-500 leading-none">TOTAL PNL</div>
                            <div className={`text-lg font-bold leading-tight ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                               {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                            </div>
                         </div>
                      </div>
                    </Card>
                  </div>

                  <div key="orderbook">
                    <Card className="h-full bg-zinc-950 border-zinc-800 overflow-hidden flex flex-col group relative">
                      <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
                        <div className="flex items-center gap-2 drag-handle cursor-move">
                          <LayoutDashboard className="w-3 h-3 text-red-500" />
                          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Order Book</h3>
                        </div>
                        <GripVertical className="w-3 h-3 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <OrderBook symbol={symbol} />
                      </div>
                    </Card>
                  </div>

                  <div key="portfolio">
                    <Card className="h-full bg-zinc-950 border-zinc-800 overflow-hidden flex flex-col group relative">
                      <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
                        <div className="flex items-center gap-2 drag-handle cursor-move">
                          <Wallet className="w-3 h-3 text-green-500" />
                          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Portfolio Performance</h3>
                        </div>
                        <GripVertical className="w-3 h-3 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <PortfolioWidget />
                      </div>
                    </Card>
                  </div>
                </ResponsiveGridLayout>
              </motion.div>
            )}

            {activeTab === 'screener' && (
              <motion.div 
                key="screener"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <MarketScreener onSelect={(s) => {
                  setSymbol(s);
                  setActiveTab('chart');
                }} />
              </motion.div>
            )}
            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <SignalHistory history={signals} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
