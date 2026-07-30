import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Send, Paperclip } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CyberInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  isLoading?: boolean;
}

export function CyberInput({ value, onChange, onSend, isLoading }: CyberInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="relative group">
      {/* Glow Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur-md"></div>
      
      <div className="relative flex items-end gap-3 p-2 bg-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
        <button className="p-3 text-gray-500 hover:text-cyan-400 transition-colors flex-shrink-0">
          <Paperclip className="w-5 h-5" />
        </button>
        
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What would you like me to do today?"
          className={cn(
            "flex-1 bg-transparent border-none resize-none focus:outline-none focus:ring-0",
            "text-gray-100 placeholder-gray-600 py-3 max-h-32 min-h-[48px] overflow-y-auto",
            "font-mono text-sm sm:text-base tracking-tight"
          )}
          rows={1}
        />
        
        <div className="flex items-center gap-2">
          <button className="p-3 text-gray-500 hover:text-cyan-400 transition-colors flex-shrink-0">
            <Mic className="w-5 h-5" />
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSend}
            disabled={!value.trim() || isLoading}
            className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-colors disabled:opacity-50 flex-shrink-0 border border-cyan-500/50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
