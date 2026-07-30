import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Reply, Trash2, Archive, Star } from 'lucide-react';
import { GlassCard } from '../GlassCard';

interface EmailViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: any;
  onAction: (action: string, id: string) => void;
}

const EmailViewerModal: React.FC<EmailViewerModalProps> = ({ isOpen, onClose, email, onAction }) => {
  if (!isOpen || !email) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl max-h-[85vh] flex flex-col"
        >
          <GlassCard className="flex flex-col h-full overflow-hidden bg-white/10 dark:bg-black/40 border border-white/20 shadow-2xl">
            {/* Header / Actions */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex space-x-2">
                <button onClick={() => onAction('reply', email.id)} className="p-2 rounded-full hover:bg-white/10 transition-colors" title="Reply">
                  <Reply size={18} />
                </button>
                <button onClick={() => onAction('archive', email.id)} className="p-2 rounded-full hover:bg-white/10 transition-colors" title="Archive">
                  <Archive size={18} />
                </button>
                <button onClick={() => onAction('delete', email.id)} className="p-2 rounded-full hover:bg-white/10 transition-colors text-red-400" title="Delete">
                  <Trash2 size={18} />
                </button>
                <button onClick={() => onAction('star', email.id)} className="p-2 rounded-full hover:bg-white/10 transition-colors text-yellow-400" title="Star">
                  <Star size={18} />
                </button>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Email Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <h2 className="text-2xl font-semibold mb-4 text-white">{email.subject}</h2>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {email.sender.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-white">{email.sender}</div>
                    <div className="text-sm text-white/50">{email.receivedDateTime || 'Unknown Date'}</div>
                  </div>
                </div>
              </div>
              
              <div className="prose prose-invert max-w-none text-white/80 leading-relaxed">
                {/* Since we only have bodyPreview from the API currently, we'll display that. For full body, we'd need to parse the mime parts. */}
                <p className="whitespace-pre-wrap">{email.bodyPreview}</p>
                
                <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10 text-sm text-white/40 flex items-center justify-center">
                  Preview mode: To view the full rich HTML email, please open in Gmail.
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmailViewerModal;
