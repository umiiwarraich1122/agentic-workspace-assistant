import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, X, FileText } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CyberInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  onFileUpload?: (file: File) => void;
  attachedFilename?: string | null;
  onRemoveAttachment?: () => void;
  isUploading?: boolean;
  rightAddon?: React.ReactNode;
}

export function CyberInput({ value, onChange, onSend, isLoading, onFileUpload, attachedFilename, onRemoveAttachment, isUploading, rightAddon }: CyberInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="relative group flex flex-col gap-2">
      {/* Attachment Indicator */}
      {attachedFilename && (
        <div className="flex items-center gap-2 self-start px-3 py-1.5 bg-cyan-950/50 border border-cyan-500/30 rounded-lg backdrop-blur-sm">
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-mono text-cyan-100 max-w-[200px] truncate">{attachedFilename}</span>
          <button onClick={onRemoveAttachment} className="ml-1 text-gray-400 hover:text-red-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      
      {/* Glow Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur-md"></div>
      
      <div className="relative flex items-end gap-3 p-2 bg-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange}
          accept=".pdf,.txt"
        />
        
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What would you like me to do today?"
          className={cn(
            "flex-1 bg-transparent border-none resize-none focus:outline-none focus:ring-0",
            "text-gray-100 placeholder-gray-600 py-3 pl-3 max-h-32 min-h-[48px] overflow-y-auto",
            "font-mono text-sm sm:text-base tracking-tight"
          )}
          rows={1}
        />
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !!attachedFilename}
            className="p-3 text-gray-500 hover:text-cyan-400 transition-colors flex-shrink-0 disabled:opacity-50"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
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
          {rightAddon}
        </div>
      </div>
    </div>
  );
}
