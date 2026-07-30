import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Sparkles, Send, Check, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { googleService, chatService } from '../services/api';

export function EmailModule() {
  const { user } = useAuth();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  
  // AI Reply State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const threadId = useRef(crypto.randomUUID()).current;

  useEffect(() => {
    if (user?.userId) {
      googleService.getEmails(user.userId)
        .then(data => {
          if (data && Array.isArray(data.emails)) setEmails(data.emails);
          else setEmails([]);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleGenerateReply = async () => {
    if (!selectedEmail || !user) return;
    setIsGenerating(true);
    setAiDraft('');
    setDraftSaved(false);

    try {
      const senderName = selectedEmail.sender || selectedEmail.from || "Sender";
      const prompt = `Write a professional reply to this email. \n\nFrom: ${senderName}\nSubject: ${selectedEmail.subject}\n\nDo not include any placeholders, write it ready to send.`;
      const res = await chatService.sendMessage(user.userId, threadId, prompt);
      setAiDraft(res.response || "Failed to generate response.");
    } catch (e) {
      setAiDraft("[SYSTEM ERROR] Failed to reach LangGraph engine.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedEmail || !user || !aiDraft) return;
    setIsSavingDraft(true);
    try {
      const recipient = [selectedEmail.sender || selectedEmail.from || "unknown@example.com"];
      await googleService.draftEmail(
        user.userId, 
        `Re: ${selectedEmail.subject}`, 
        aiDraft, 
        recipient
      );
      setDraftSaved(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden relative z-10 w-full">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
          <Mail className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-mono text-white tracking-widest uppercase">Email Intelligence</h1>
          <p className="text-sm text-blue-400/60 font-mono">Synchronized with Google Mails</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        
        {/* Left Column: Email List */}
        <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 scrollbar-hide">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center text-gray-500 font-mono mt-10">No emails found in Gmail.</div>
          ) : (
            emails.map((email, idx) => (
              <motion.button
                key={idx}
                onClick={() => { setSelectedEmail(email); setAiDraft(''); setDraftSaved(false); }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`text-left p-4 rounded-xl border backdrop-blur-md transition-all ${
                  selectedEmail === email 
                    ? 'bg-blue-900/40 border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
                    : 'bg-gray-900/40 border-white/10 hover:border-blue-500/30 hover:bg-blue-950/20'
                }`}
              >
                <div className="text-sm font-bold text-cyan-300 truncate mb-1">
                  {email.sender || email.from || 'Unknown Sender'}
                </div>
                <div className="text-xs text-blue-200 truncate font-mono mb-2">{email.subject || 'No Subject'}</div>
                <div className="text-xs text-gray-400 truncate">{email.bodyPreview || email.summary || 'No preview available...'}</div>
              </motion.button>
            ))
          )}
        </div>

        {/* Right Column: Email Viewer & AI Reply */}
        <div className="flex-1 flex flex-col bg-gray-950/60 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
          
          {selectedEmail ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-white/10 bg-gradient-to-b from-blue-900/20 to-transparent">
                <h2 className="text-xl font-bold text-white mb-2">{selectedEmail.subject}</h2>
                <div className="text-sm font-mono text-blue-300">From: {selectedEmail.sender || selectedEmail.from}</div>
                {selectedEmail.receivedDateTime && (
                  <div className="text-xs font-mono text-gray-500 mt-1">{selectedEmail.receivedDateTime}</div>
                )}
              </div>
              
              {/* Body */}
              <div className="p-6 flex-1 overflow-y-auto scrollbar-hide text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {selectedEmail.body || selectedEmail.bodyPreview || selectedEmail.summary || "No content available."}
              </div>

              {/* Action Bar / AI Draft Area */}
              <div className="p-6 border-t border-white/10 bg-gray-900/50">
                <AnimatePresence mode="wait">
                  {!aiDraft && !isGenerating ? (
                    <motion.button
                      key="generate-btn"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      onClick={handleGenerateReply}
                      className="flex items-center gap-2 px-6 py-3 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-mono text-sm hover:bg-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      GENERATE AI REPLY
                    </motion.button>
                  ) : isGenerating ? (
                    <motion.div
                      key="generating"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-3 text-cyan-400 font-mono text-sm p-3"
                    >
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      JARVIS IS DRAFTING...
                    </motion.div>
                  ) : (
                    <motion.div
                      key="draft-view"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      className="w-full"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono text-cyan-400 tracking-widest flex items-center gap-2">
                          <Sparkles className="w-3 h-3" /> AI GENERATED DRAFT
                        </span>
                        <button onClick={() => setAiDraft('')} className="p-1 hover:bg-white/10 rounded-full text-gray-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <textarea 
                        value={aiDraft}
                        onChange={(e) => setAiDraft(e.target.value)}
                        className="w-full h-32 bg-gray-950 border border-cyan-900/50 rounded-xl p-4 text-sm text-gray-200 font-mono focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all resize-none mb-4"
                      />

                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={handleSaveDraft}
                          disabled={isSavingDraft || draftSaved}
                          className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 text-white font-mono text-sm hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                        >
                          {isSavingDraft ? <RefreshCw className="w-4 h-4 animate-spin" /> : 
                           draftSaved ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                          {draftSaved ? "SAVED TO GMAIL DRAFTS" : "SAVE TO GMAIL DRAFTS"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30">
              <Mail className="w-20 h-20 mb-4" />
              <div className="font-mono tracking-widest">SELECT AN EMAIL TO VIEW</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
