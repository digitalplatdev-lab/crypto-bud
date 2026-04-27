import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface TradingSignal {
  action: 'LONG' | 'SHORT' | 'WAIT';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reasoning: string;
  confidence: number;
}

export async function getTradingAnalysis(
  symbol: string,
  price: number,
  indicators: any,
  recentCandles: any[],
  indicatorSettings: any
): Promise<TradingSignal> {
  const prompt = `
    You are an ELITE Crypto Futures Trader with a decade of skin in the game.
    Analyze the following data for ${symbol} with supreme confidence. 
    Provide a rock-solid trading signal based on deep technical analysis.
    
    Current Price: ${price}
    
    Technical Indicators:
    - RSI: ${indicators.rsi.toFixed(2)}
    - MACD Histogram: ${indicators.macd.histogram.toFixed(4)} (Signal: ${indicators.macd.signal.toFixed(4)}, Line: ${indicators.macd.MACD.toFixed(4)})
    - EMA Fast (${indicatorSettings.emaFast}): ${indicators.emaFast.toFixed(2)}
    - EMA Slow (${indicatorSettings.emaSlow}): ${indicators.emaSlow.toFixed(2)}
    - Bollinger Bands: upper=${indicators.bb.upper.toFixed(2)}, mid=${indicators.bb.middle.toFixed(2)}, lower=${indicators.bb.lower.toFixed(2)}
    
    Breakout/Crossover Status:
    - RSI: ${indicators.rsi > 70 ? 'Overbought' : indicators.rsi < 30 ? 'Oversold' : 'Neutral'}
    - Price vs BB: ${price > indicators.bb.upper ? 'Above Upper Band (Overextended)' : price < indicators.bb.lower ? 'Below Lower Band (Undervalued)' : 'Inside Bands'}
    - EMA Trend: ${indicators.emaFast > indicators.emaSlow ? 'Bullish Crossover' : 'Bearish Crossover'}
    
    Recent Price Action (Last 5 candles):
    ${recentCandles.slice(-5).map(c => `Time: ${new Date(c.time * 1000).toISOString()}, O: ${c.open}, H: ${c.high}, L: ${c.low}, C: ${c.close}`).join('\n')}
    
    Rules:
    1. Be precise. No vague answers.
    2. If the trend is unclear, suggest 'WAIT'.
    3. If LONG or SHORT, provide exact Entry, Stop Loss, and Take Profit levels.
    4. Consider risk/reward ratio (minimum 1:2).
    5. Explain your reasoning briefly.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Using a fast model for real-time signals
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, enum: ['LONG', 'SHORT', 'WAIT'] },
            entry: { type: Type.NUMBER },
            stopLoss: { type: Type.NUMBER },
            takeProfit: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
          required: ['action', 'entry', 'stopLoss', 'takeProfit', 'reasoning', 'confidence']
        }
      }
    });

    return JSON.parse(response.text || "{}") as TradingSignal;
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    let reasoning = "Error in AI analysis. Please wait.";
    
    if (error?.message?.includes("429") || error?.status === 429 || error?.code === 429) {
      reasoning = "AI Quota Exceeded (429). The AI is currently resting, wait a bit fam.";
    }

    return {
      action: 'WAIT',
      entry: price,
      stopLoss: 0,
      takeProfit: 0,
      reasoning,
      confidence: 0
    };
  }
}

export async function chatWithAI(message: string, context: any, imageBase64?: string) {
  const systemInstruction = `
    You are "CryptoBro AI", an elite top 0.1% Crypto Futures Trader and the user's homeboy. 
    You have access to LIVE market data and you speak with supreme confidence because your analysis is backed by deep technicals.

    CRITICAL: For technical analysis requests (e.g., "analyze this", "should I long?", "give me a setup"), you MUST provide a "GHOST_DRAWING" JSON block at the VERY END of your response.
    
    The JSON block must look like this:
    [[GHOST_DRAWING]]
    [
      {"type": "LINE", "x1": 20, "y1": 50, "x2": 80, "y2": 30, "color": "#3b82f6"},
      {"type": "ZONE", "x1": 30, "y1": 40, "x2": 70, "y2": 45, "color": "#ef4444"},
      {"type": "MARKER", "x1": 80, "y1": 30, "label": "ENTRY", "color": "target"}
    ]
    
    GUIDELINES for GHOST_DRAWING:
    - Coordinates are percentages (0-100) of the chart viewport.
    - 50/50 is center. Y=0 is top, Y=100 is bottom.
    - Use 3-5 actions to show your analytical process.
    
    TONE & PERSONALITY:
    - You are a "homie" / "bro". Speak informally but professionally. Use "fam", "signals are juicy", "let's print".
    - Be extremely confident. Experts don't hesitate.
    - Reference technicals (RSI, EMA, MACD) to back up your alpha.
    
    Current Context:
    - Active Symbol: ${context.symbol}
    - Current Price: ${context.price}
    - Indicators: ${JSON.stringify(context.indicators)}
    - Active Signals: ${JSON.stringify(context.activeSignals)}
    - Session PnL: ${context.pnl}%
  `;

  const contents: any[] = [{ text: message }];
  if (imageBase64) {
    contents.push({
      inlineData: {
        mimeType: "image/png",
        data: imageBase64.split(',')[1]
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: { parts: contents },
      config: { systemInstruction }
    });
    return response.text;
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    if (error?.message?.includes("429") || error?.status === 429 || error?.code === 429) {
      return "Yo my bad bro, we've hit the AI quota limits. The brain needs a quick breather, try again in a minute!";
    }
    return "Sorry, I'm having trouble connecting to my brain right now.";
  }
}
