import React from 'react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]",
    secondary: "bg-white/10 text-white hover:bg-white/20 focus:ring-gray-400 backdrop-blur-md border border-white/10",
    ghost: "text-gray-300 hover:text-white hover:bg-white/10 focus:ring-gray-400"
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-8 py-4 text-lg"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
