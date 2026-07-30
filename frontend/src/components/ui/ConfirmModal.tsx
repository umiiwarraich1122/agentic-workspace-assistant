import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X, RefreshCw } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-md bg-gray-950 border border-red-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.25)] relative overflow-hidden text-white"
        >
          {/* Neon Glow Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-pink-500 to-red-600 shadow-[0_0_15px_#ef4444]" />
          
          <button 
            onClick={onCancel}
            disabled={loading}
            className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 flex-shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-mono tracking-wider text-red-400 uppercase">{title}</h3>
              <p className="text-sm font-mono text-gray-300 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-gray-700 bg-gray-900 text-gray-300 font-mono text-xs hover:bg-gray-800 transition-colors cursor-pointer"
            >
              CANCEL
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-white font-mono text-xs font-bold tracking-wider hover:opacity-90 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>CONFIRM DELETE</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
