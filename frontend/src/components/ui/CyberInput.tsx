import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CyberInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  onFileUpload?: (file: File) => void;
  onImageUpload?: (file: File) => void;
  attachedFilename?: string | null;
  onRemoveAttachment?: () => void;
  isUploading?: boolean;
  rightAddon?: React.ReactNode;
}

export function CyberInput({ value, onChange, onSend, isLoading, onFileUpload, onImageUpload, attachedFilename, onRemoveAttachment, isUploading, rightAddon }: CyberInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

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
    setShowAttachmentMenu(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file);
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
    setShowAttachmentMenu(false);
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      // Reset height to calculate new height
      textareaRef.current.style.height = 'auto';
      // Set to scrollHeight (bounded by max-h-32 due to CSS)
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div className="relative group flex flex-col gap-2">
      {/* Attachment Indicator */}
      {attachedFilename && (
        <div className="flex items-center gap-2 self-start px-3 py-1.5 bg-cyan-950/50 border border-cyan-500/30 rounded-lg backdrop-blur-sm">
          {attachedFilename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
          )}
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
        <input 
          type="file" 
          ref={imageInputRef} 
          className="hidden" 
          onChange={handleImageChange}
          accept=".png,.jpg,.jpeg,.webp,.gif"
        />
        
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What would you like me to do today?"
          className={cn(
            "flex-1 bg-transparent border-none resize-none focus:outline-none focus:ring-0",
            "text-gray-100 placeholder-gray-600 py-3 pl-3 max-h-48 min-h-[48px] overflow-y-auto",
            "font-mono text-sm sm:text-base tracking-tight"
          )}
          rows={1}
        />
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              disabled={isUploading || !!attachedFilename}
              className="p-3 text-gray-500 hover:text-cyan-400 transition-colors flex-shrink-0 disabled:opacity-50"
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>

            <AnimatePresence>
              {showAttachmentMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowAttachmentMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col"
                  >
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-cyan-400 transition-colors text-left"
                    >
                      <FileText className="w-4 h-4" />
                      Document (.pdf, .txt)
                    </button>
                    <div className="h-px bg-gray-800" />
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-cyan-400 transition-colors text-left"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Image (OCR)
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
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
