import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Server, Activity, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function SystemStatusBar() {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-12 flex items-center justify-between px-6 bg-gray-950/80 backdrop-blur-xl border-b border-cyan-900/30 text-xs font-mono text-cyan-500 z-50">
      
      {/* Left: Branding & Core Status */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
          <span className="font-bold tracking-[0.2em] text-white">Mr. Jarvis</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 opacity-60">
          <Activity className="w-3 h-3" />
          <span>NEURAL_NET: ONLINE</span>
        </div>
      </div>

      {/* Center: Clock */}
      <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-4 text-cyan-300 font-bold tracking-widest text-sm">
        <span>{time.toLocaleTimeString('en-US', { hour12: false })}</span>
        <span className="opacity-50 text-xs">{time.toLocaleDateString()}</span>
      </div>

      {/* Right: Connectivity & User */}
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-4 opacity-70">
          <div className="flex items-center gap-1.5">
            <Server className="w-3 h-3" />
            <span>GOOGLE_API</span>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
          </div>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3" />
            <span>LANGGRAPH</span>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
          </div>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1 bg-cyan-950/40 border border-cyan-900/50 rounded flex-shrink-0">
          <User className="w-3 h-3 text-cyan-400" />
          <span className="truncate max-w-[100px]">{user?.name || user?.userId || 'GUEST'}</span>
        </div>
      </div>
    </header>
  );
}
