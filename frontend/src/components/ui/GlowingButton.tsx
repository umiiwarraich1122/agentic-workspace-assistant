import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

interface GlowingButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
}

export function GlowingButton({ children, className, ...props }: GlowingButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    btnRef.current.style.setProperty('--x', `${x}px`);
    btnRef.current.style.setProperty('--y', `${y}px`);
  };

  return (
    <motion.button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative overflow-hidden px-10 py-5 rounded-full font-bold text-lg tracking-wide text-white transition-all",
        "bg-gray-900 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]",
        "hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] hover:border-cyan-400 group",
        className
      )}
      {...props}
    >
      {/* Interactive Light Sweep */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none blur-md"
        style={{
          background: `radial-gradient(100px circle at var(--x) var(--y), rgba(6,182,212,0.6), transparent 40%)`
        }}
      />
      
      <span className="relative z-10 flex items-center justify-center gap-3">
        {children}
      </span>
    </motion.button>
  );
}
