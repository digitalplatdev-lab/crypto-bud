import React, { useState, useRef } from 'react';
import { chatWithAI } from '../services/gemini';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Send, Image as ImageIcon, User, Bot, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

interface AIChatProps {
  marketContext: any;
  onGhostAnalysis?: (actions: any[]) => void;
}

export const AIChat: React.FC<AIChatProps> = ({ marketContext, onGhostAnalysis }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Yo fam! I'm your elite trading bot. Show me any chart or just ask for a setup and I'll scan the liquidity and order blocks for you. Let's printed!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: Message = { role: 'user', content: input, image: selectedImage || undefined };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const response = await chatWithAI(input, marketContext, selectedImage || undefined);
      
      let finalContent = response || "I couldn't process that.";
      
      // Parse Ghost Drawings if present
      if (finalContent.includes('[[GHOST_DRAWING]]')) {
        const parts = finalContent.split('[[GHOST_DRAWING]]');
        finalContent = parts[0].trim();
        const jsonStr = parts[1].trim();
        
        try {
          const actions = JSON.parse(jsonStr);
          if (onGhostAnalysis) {
            onGhostAnalysis(actions);
          }
        } catch (e) {
          console.error("Failed to parse ghost drawing JSON", e);
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: finalContent }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to AI." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-white">AI Assistant</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
            {marketContext.symbol}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl p-3 ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-200'
                }`}>
                  {msg.image && (
                    <img src={msg.image} alt="Uploaded" className="w-full h-auto rounded-lg mb-2 border border-white/10" />
                  )}
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 rounded-2xl p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                <span className="text-xs text-zinc-500 italic">Analyzing market data...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 bg-zinc-950 border-t border-zinc-800">
        {selectedImage && (
          <div className="mb-2 relative inline-block">
            <img src={selectedImage} alt="Preview" className="w-16 h-16 object-cover rounded border border-zinc-700" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-zinc-400 hover:text-white"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="w-5 h-5" />
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
          <Input 
            placeholder="Ask about the market..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-blue-500"
          />
          <Button size="icon" onClick={handleSend} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
