import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentId, AgentState, Department } from './OfficeTaskEngine';

interface AgentProps {
  id: AgentId;
  name: string;
  color: string;
  glowColor: string;
  state: AgentState;
  currentDept: Department | null;
  progressStep: string;
}

// Department positions (% of container width/height)
export const DEPT_POSITIONS: Record<Department, { x: number; y: number }> = {
  gmail:    { x: 8,  y: 28 },
  calendar: { x: 30, y: 28 },
  tasks:    { x: 55, y: 28 },
  browser:  { x: 78, y: 28 },
  files:    { x: 78, y: 55 },
  neural:   { x: 42, y: 10 },
};

export const DESK_POSITIONS: Record<AgentId, { x: number; y: number }> = {
  cipher: { x: 14, y: 68 },
  nexus:  { x: 48, y: 68 },
  echo:   { x: 82, y: 68 },
};

const IDLE_LABELS: Record<number, string> = {
  0: '⌨️', 1: '☕', 2: '👀', 3: '📄', 4: '🤔',
};

export function AgentCharacter({ id, name, color, glowColor, state, currentDept, progressStep }: AgentProps) {
  const [idleFrame, setIdleFrame] = useState(0);
  const [pos, setPos] = useState(DESK_POSITIONS[id]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cycle idle animations
  useEffect(() => {
    if (state === 'idle') {
      timerRef.current = setInterval(() => {
        setIdleFrame(f => (f + 1) % 5);
      }, 2400 + Math.random() * 800);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  // Update position based on state
  useEffect(() => {
    if (state === 'walking_to_dept' && currentDept) {
      setPos(DEPT_POSITIONS[currentDept]);
    } else if (state === 'walking_back' || state === 'sitting' || state === 'idle') {
      setPos(DESK_POSITIONS[id]);
    }
  }, [state, currentDept, id]);

  const isAtDesk = ['idle', 'sitting'].includes(state);

  return (
    <motion.div
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      transition={{ duration: state === 'walking_to_dept' || state === 'walking_back' ? 1.6 : 0.3, ease: 'easeInOut' }}
      className="absolute flex flex-col items-center gap-1 z-20"
    >
      {/* Progress step bubble */}
      <AnimatePresence>
        {state === 'working' && progressStep && (
          <motion.div
            key={progressStep}
            initial={{ opacity: 0, y: 6, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-mono px-2 py-1 rounded-full border z-30"
            style={{ borderColor: color, color, background: 'rgba(0,0,0,0.85)', boxShadow: `0 0 8px ${glowColor}` }}
          >
            {progressStep}
          </motion.div>
        )}
        {state === 'celebrating' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm z-30"
          >
            ✅
          </motion.div>
        )}
        {(state === 'walking_to_dept' || state === 'walking_back') && (
          <motion.div
            animate={{ rotate: [0, -8, 8, -8, 0] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="absolute -top-6 text-sm z-30"
          >
            🚶
          </motion.div>
        )}
        {state === 'standing' && (
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [-2, 0] }}
            transition={{ duration: 0.3 }}
            className="absolute -top-6 text-sm z-30"
          >
            🧍
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent body */}
      <motion.div
        animate={
          state === 'working' ? { scale: [1, 1.05, 1], rotate: [0, -2, 2, 0] } :
          state === 'celebrating' ? { scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] } :
          state === 'idle' ? { y: [0, -2, 0] } :
          {}
        }
        transition={
          state === 'working' ? { repeat: Infinity, duration: 0.6 } :
          state === 'celebrating' ? { repeat: 2, duration: 0.4 } :
          state === 'idle' ? { repeat: Infinity, duration: 3 + Math.random() } :
          {}
        }
        className="relative w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 cursor-pointer select-none"
        style={{
          background: `radial-gradient(circle at 40% 35%, ${color}55, ${color}22)`,
          borderColor: color,
          boxShadow: `0 0 12px ${glowColor}, 0 0 24px ${glowColor}55`,
        }}
        title={name}
      >
        {state === 'idle' ? IDLE_LABELS[idleFrame] : state === 'working' ? '💻' : state === 'celebrating' ? '🎉' : '🤖'}
      </motion.div>

      {/* Agent name tag */}
      <div className="text-[8px] font-mono font-bold tracking-widest uppercase truncate max-w-[60px] text-center"
        style={{ color, textShadow: `0 0 8px ${glowColor}` }}>
        {name.split(' ')[1]}
      </div>

      {/* Status indicator dot */}
      <motion.div
        animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${glowColor}` }}
      />
    </motion.div>
  );
}
