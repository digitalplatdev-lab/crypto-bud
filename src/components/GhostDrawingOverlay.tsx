import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MousePointer2, LineChart, Target, AlertTriangle } from 'lucide-react';

export interface GhostAction {
  type: 'MOVE' | 'LINE' | 'ZONE' | 'MARKER';
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  label?: string;
  color?: string;
}

interface GhostDrawingOverlayProps {
  actions: GhostAction[];
  isActive: boolean;
  onComplete: () => void;
}

export const GhostDrawingOverlay: React.FC<GhostDrawingOverlayProps> = ({ actions, isActive, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(-1);
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
  const [visibleDrawings, setVisibleDrawings] = useState<GhostAction[]>([]);

  useEffect(() => {
    if (isActive && actions.length > 0) {
      setCurrentStep(0);
      setVisibleDrawings([]);
    } else {
      setCurrentStep(-1);
    }
  }, [isActive, actions]);

  useEffect(() => {
    if (currentStep >= 0 && currentStep < actions.length) {
      const action = actions[currentStep];
      
      // Move cursor to target
      const targetX = action.x2 || action.x1 || 50;
      const targetY = action.y2 || action.y1 || 50;
      
      const timer = setTimeout(() => {
        setCursorPos({ x: targetX, y: targetY });
        
        // After small delay, add drawing
        setTimeout(() => {
          setVisibleDrawings(prev => [...prev, action]);
          setCurrentStep(s => s + 1);
        }, 800);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (currentStep >= actions.length && actions.length > 0) {
      // Completed sequence
      setTimeout(onComplete, 2000);
    }
  }, [currentStep, actions, onComplete]);

  if (!isActive && visibleDrawings.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Background Dim */}
      {isActive && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-blue-950/20 backdrop-blur-[1px]"
        />
      )}

      {/* SVG Canvas for Lines */}
      <svg className="w-full h-full">
        {visibleDrawings.map((d, i) => {
          if (d.type === 'LINE') {
            return (
              <motion.line
                key={i}
                x1={`${d.x1}%`}
                y1={`${d.y1}%`}
                x2={`${d.x1}%`}
                y2={`${d.y1}%`}
                animate={{ x2: `${d.x2}%`, y2: `${d.y2}%` }}
                transition={{ duration: 1, ease: "easeInOut" }}
                stroke={d.color || '#3b82f6'}
                strokeWidth="2"
                strokeDasharray="4 2"
                className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              />
            );
          }
          if (d.type === 'ZONE') {
            return (
              <motion.rect
                key={i}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 0.2, scaleY: 1 }}
                x={`${d.x1}%`}
                y={`${d.y1}%`}
                width={`${(d.x2 || 0) - (d.x1 || 0)}%`}
                height={`${(d.y2 || 0) - (d.y1 || 0)}%`}
                fill={d.color || '#ef4444'}
              />
            );
          }
          return null;
        })}
      </svg>

      {/* Markers & Labels */}
      {visibleDrawings.map((d, i) => (
        d.type === 'MARKER' && (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute flex flex-col items-center gap-1"
            style={{ left: `${d.x1}%`, top: `${d.y1}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className={`p-1 rounded-full ${d.color === 'target' ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_15px_rgba(34,197,94,0.5)]`}>
              {d.color === 'target' ? <Target className="w-3 h-3 text-white" /> : <AlertTriangle className="w-3 h-3 text-white" />}
            </div>
            <span className="text-[10px] font-black text-white p-1 bg-black/80 rounded border border-zinc-700 whitespace-nowrap uppercase tracking-tighter">
              {d.label}
            </span>
          </motion.div>
        )
      ))}

      {/* AI Ghost Cursor */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            animate={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%` }}
            transition={{ duration: 0.8, ease: "backOut" }}
            className="absolute pointer-events-none flex flex-col items-center gap-2"
            style={{ transform: 'translate(-10px, -10px)' }}
          >
            <div className="relative">
              <MousePointer2 className="w-6 h-6 text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)] fill-blue-400/20" />
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-blue-500 rounded-full blur-xl"
              />
            </div>
            <div className="bg-blue-600/90 text-[10px] font-bold text-white px-2 py-0.5 rounded-full border border-blue-400 shadow-lg whitespace-nowrap">
              BRO AI ANALYZING...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD Info */}
      {isActive && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 bg-black/80 border border-blue-500/30 rounded-2xl backdrop-blur-md"
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Spectral Scan Active</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(i => (
                <motion.div 
                  key={i}
                  animate={{ height: [4, 12, 4] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                  className="w-1 bg-blue-500/50 rounded-full"
                />
              ))}
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="text-xs font-mono text-zinc-300">
            Scanning for liquidity voids & order blocks...
          </div>
        </motion.div>
      )}
    </div>
  );
};
