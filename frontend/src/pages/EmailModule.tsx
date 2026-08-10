import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Sparkles, Send, Check, RefreshCw, X, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { googleService, chatService } from '../services/api';

export function EmailModule() {
  const navigate = useNavigate();
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

  const fetchEmails = () => {
    if (user?.userId) {
      setLoading(true);
      googleService.getEmails(user.userId)
        .then(data => {
          if (data && Array.isArray(data.emails)) setEmails(data.emails);
          else setEmails([]);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [user]);

  const handleRefresh = async () => {
    if (!user?.userId) return;
    setLoading(true);
    try {
      await chatService.syncData(user.userId);
      await fetchEmails();
    } catch (e) {
      console.error(e);
    }
  };

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

  const parseSender = (senderStr: string) => {
    if (!senderStr) return { name: 'Unknown Sender', email: '' };
    const match = senderStr.match(/(.*?)\s*<(.+?)>/);
    if (match) {
      const name = match[1].replace(/"/g, '').trim();
      const email = match[2].trim();
      return { 
        name: name || email, 
        email: email 
      };
    }
    return { name: senderStr.trim(), email: senderStr.trim() };
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden relative z-10 w-full">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/chat')}
          className="p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors cursor-pointer flex-shrink-0"
          title="Back to Chat"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30 flex-shrink-0">
          <Mail className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-mono text-white tracking-widest uppercase">Email Intelligence</h1>
          <p className="text-sm text-blue-400/60 font-mono">Synchronized with Google Mails</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 gap-6 min-h-0">
        
        {/* Left Column: Email List */}
        <div className={`${selectedEmail ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 flex-col gap-4 overflow-y-auto pr-2 scrollbar-hide`}>
          <div className="p-4 border-b border-cyan-900/30 flex justify-between items-center bg-gray-900/50">
            <h2 className="font-mono text-cyan-400 font-bold tracking-wider">INBOX</h2>
            <div className="text-xs text-cyan-600 font-mono flex items-center gap-2">
              <span>{emails.length} TOTAL</span>
              <button onClick={handleRefresh} className="hover:text-cyan-400 transition-colors" disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center text-gray-500 font-mono mt-10">No emails found in Gmail.</div>
          ) : (
            emails.map((email, idx) => {
              const { name, email: emailAddress } = parseSender(email.sender || email.from);
              return (
                <motion.button
                  key={idx}
                  onClick={() => { setSelectedEmail(email); setAiDraft(''); setDraftSaved(false); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex flex-col text-left p-4 rounded-xl border backdrop-blur-md transition-all ${
                    selectedEmail === email 
                      ? 'bg-blue-900/40 border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
                      : 'bg-gray-900/40 border-white/10 hover:border-blue-500/30 hover:bg-blue-950/20'
                  }`}
                >
                  <div className="text-sm font-bold text-cyan-300 truncate mb-1">
                    {name}
                  </div>
                  {emailAddress && name !== emailAddress && (
                    <div className="text-[10px] text-cyan-500/70 truncate mb-2 font-mono">
                      {emailAddress}
                    </div>
                  )}
                  <div className="text-xs text-blue-200 truncate font-mono mb-1.5">{email.subject || 'No Subject'}</div>
                  <div className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {email.bodyPreview || email.summary || 'No preview available...'}
                  </div>
                </motion.button>
              );
            })
          )}
        </div>

        {/* Right Column: Email Viewer & AI Reply */}
        <div className={`${!selectedEmail ? 'hidden md:flex' : 'flex'} w-full md:w-2/3 flex-col bg-gray-950/60 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative`}>
          
          {selectedEmail ? (
            <>
              {/* Header */}
              <div className="p-4 md:p-6 border-b border-white/10 bg-gradient-to-b from-blue-900/20 to-transparent">
                <button 
                  onClick={() => setSelectedEmail(null)}
                  className="md:hidden flex items-center gap-1 text-blue-400 text-sm font-mono mb-4 hover:text-blue-300"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to list
                </button>
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
