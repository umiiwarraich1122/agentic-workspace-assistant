import React from 'react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  glow?: 'blue' | 'purple' | 'cyan' | 'none';
}

export function GlassCard({ children, className, glow = 'none', ...props }: GlassCardProps) {
  const glowClasses = {
    blue: 'shadow-[0_0_15px_rgba(59,130,246,0.3)] border-blue-500/30',
    purple: 'shadow-[0_0_15px_rgba(168,85,247,0.3)] border-purple-500/30',
    cyan: 'shadow-[0_0_15px_rgba(6,182,212,0.3)] border-cyan-500/30',
    none: 'border-white/10 shadow-lg',
  };

  return (
    <motion.div
      className={cn(
        'bg-white/5 backdrop-blur-xl border rounded-2xl overflow-hidden',
        glowClasses[glow],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
