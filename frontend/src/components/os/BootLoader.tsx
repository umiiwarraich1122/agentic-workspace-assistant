import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_SEQUENCE = [
  "Initializing AI Core...",
  "Loading Neural Engine...",
  "Connecting with the Google...",
  "Loading Knowledge Base...",
  "Initializing Agent Runtime...",
  "System Online."
];

interface BootLoaderProps {
  onComplete: () => void;
}

export function BootLoader({ onComplete }: BootLoaderProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let currentLine = 0;
    
    const interval = setInterval(() => {
      if (currentLine < BOOT_SEQUENCE.length) {
        setLines(prev => [...prev, BOOT_SEQUENCE[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsFinished(true);
          setTimeout(onComplete, 1000); // Wait for exit animation
        }, 800);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isFinished && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950 font-mono text-cyan-500 overflow-hidden"
          exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
          transition={{ duration: 1, ease: "easeInOut" }}
        >
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
          
          <div className="relative z-10 max-w-2xl w-full p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8 flex items-center gap-4"
            >
              <div className="w-12 h-12 border-2 border-cyan-500 rounded-full animate-spin border-t-transparent" />
              <span className="text-2xl font-bold tracking-[0.2em] text-white glow-text-cyan">Mr. Jarvis</span>
            </motion.div>

            <div className="space-y-2 text-sm sm:text-base md:text-lg">
              {lines.map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`${index === BOOT_SEQUENCE.length - 1 ? 'text-white font-bold mt-8 text-xl' : 'text-cyan-400'}`}
                >
                  <span className="mr-4 opacity-50">&gt;</span>
                  {line}
                </motion.div>
              ))}
              
              {!isFinished && (
                <motion.div
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-3 h-5 bg-cyan-500 mt-2 ml-8 inline-block"
                />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
