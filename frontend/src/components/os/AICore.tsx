import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type AIState = 'idle' | 'thinking' | 'speaking';

interface AICoreProps {
  state?: AIState;
}

export function AICore({ state = 'idle' }: AICoreProps) {
  
  const isThinking = state === 'thinking';
  const isSpeaking = state === 'speaking';

  // Animation variants based on state
  const outerGlowVariants = {
    idle: { scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
    thinking: { scale: [1.1, 1.3, 1.1], opacity: [0.6, 0.9, 0.6], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } },
    speaking: { scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5], transition: { duration: 0.5, repeat: Infinity, ease: "easeOut" } }
  };

  const ring1Variants = {
    idle: { rotateZ: 360, rotateX: 60, transition: { duration: 8, repeat: Infinity, ease: "linear" } },
    thinking: { rotateZ: 360, rotateX: 60, transition: { duration: 2, repeat: Infinity, ease: "linear" } },
    speaking: { rotateZ: 360, rotateX: 60, scale: [1, 1.1, 1], transition: { duration: 4, repeat: Infinity, ease: "linear" } }
  };

  const ring2Variants = {
    idle: { rotateZ: -360, rotateY: 60, transition: { duration: 12, repeat: Infinity, ease: "linear" } },
    thinking: { rotateZ: -360, rotateY: 60, transition: { duration: 3, repeat: Infinity, ease: "linear" } },
    speaking: { rotateZ: -360, rotateY: 60, scale: [1, 1.15, 1], transition: { duration: 5, repeat: Infinity, ease: "linear" } }
  };

  return (
    <div className="relative flex items-center justify-center w-64 h-64 sm:w-96 sm:h-96">
      
      {/* Dynamic Sound Waves when speaking */}
      <AnimatePresence>
        {isSpeaking && (
          <>
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
              className="absolute w-48 h-48 bg-cyan-500 rounded-full blur-[20px]"
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.75 }}
              className="absolute w-48 h-48 bg-blue-500 rounded-full blur-[20px]"
            />
          </>
        )}
      </AnimatePresence>

      {/* Outer Glow */}
      <motion.div
        variants={outerGlowVariants}
        animate={state}
        className={`absolute inset-0 rounded-full blur-[60px] ${isThinking ? 'bg-purple-500/50' : 'bg-cyan-500/30'}`}
      />
      
      {/* Inner Energy Sphere */}
      <motion.div
        animate={{ 
          scale: isThinking ? [1, 1.1, 1] : [1, 1.05, 1], 
          opacity: isThinking ? [0.9, 1, 0.9] : [0.8, 1, 0.8] 
        }}
        transition={{ duration: isThinking ? 1 : 2, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute w-32 h-32 sm:w-48 sm:h-48 rounded-full blur-[10px] ${
          isThinking ? 'bg-gradient-to-br from-purple-400 to-cyan-600' : 'bg-gradient-to-br from-cyan-400 to-blue-600'
        }`}
      />
      
      {/* Core Solid Sphere */}
      <div className={`absolute w-24 h-24 sm:w-36 sm:h-36 rounded-full flex items-center justify-center z-10 overflow-hidden transition-shadow duration-500 ${
        isThinking ? 'bg-white shadow-[0_0_80px_rgba(216,180,254,1)]' : 'bg-white shadow-[0_0_50px_rgba(255,255,255,1)]'
      }`}>
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,1),rgba(255,255,255,0))]" />
         
         {/* Internal Core Pulse */}
         {isThinking && (
           <motion.div 
             animate={{ scale: [1, 2, 1], opacity: [0, 0.5, 0] }}
             transition={{ duration: 1, repeat: Infinity }}
             className="absolute inset-0 bg-purple-500 rounded-full blur-[5px]"
           />
         )}
      </div>

      {/* Orbiting Ring 1 */}
      <motion.div
        variants={ring1Variants}
        animate={state}
        className={`absolute w-48 h-48 sm:w-72 sm:h-72 border rounded-full ${isThinking ? 'border-purple-400/80 shadow-[inset_0_0_20px_rgba(168,85,247,0.3)]' : 'border-cyan-400/50'}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className={`absolute top-0 left-1/2 w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 ${
          isThinking ? 'bg-purple-300 shadow-[0_0_20px_#d8b4fe]' : 'bg-cyan-300 shadow-[0_0_10px_#67e8f9]'
        }`} />
      </motion.div>

      {/* Orbiting Ring 2 */}
      <motion.div
        variants={ring2Variants}
        animate={state}
        className={`absolute w-56 h-56 sm:w-80 sm:h-80 border rounded-full ${isThinking ? 'border-cyan-500/80 shadow-[inset_0_0_20px_rgba(6,182,212,0.3)]' : 'border-purple-500/50'}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className={`absolute bottom-0 left-1/2 w-2 h-2 rounded-full -translate-x-1/2 translate-y-1/2 ${
          isThinking ? 'bg-cyan-300 shadow-[0_0_15px_#67e8f9]' : 'bg-purple-300 shadow-[0_0_10px_#d8b4fe]'
        }`} />
        <div className={`absolute top-1/2 right-0 w-4 h-4 rounded-full translate-x-1/2 -translate-y-1/2 blur-[2px] ${
          isThinking ? 'bg-cyan-400 shadow-[0_0_25px_#67e8f9]' : 'bg-purple-400 shadow-[0_0_15px_#d8b4fe]'
        }`} />
      </motion.div>
    </div>
  );
}
