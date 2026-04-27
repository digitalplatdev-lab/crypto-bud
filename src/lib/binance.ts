/**
 * Binance Futures API Service
 */

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchKlines(symbol: string, interval: string = '15m', limit: number = 100): Promise<Candle[]> {
  try {
    const response = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    const data = await response.json();
    
    return data.map((d: any) => ({
      time: d[0] / 1000,
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5]),
    }));
  } catch (error) {
    console.error('Error fetching klines:', error);
    return [];
  }
}

export function subscribeKlines(symbol: string, interval: string, onMessage: (candle: Candle) => void) {
  const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const k = data.k;
    onMessage({
      time: k.t / 1000,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
    });
  };
  
  return ws;
}

export interface DepthData {
  bids: [string, string][];
  asks: [string, string][];
}

export function subscribeDepth(symbol: string, onMessage: (depth: DepthData) => void) {
  const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@depth10@100ms`);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage({
      bids: data.b,
      asks: data.a,
    });
  };
  
  return ws;
}
