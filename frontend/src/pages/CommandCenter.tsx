import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/api';
import type { ChatMessage, StructuredAIResponse, EmailData } from '../types';
import { CyberInput } from '../components/ui/CyberInput';
import { AICore } from '../components/os/AICore';
import type { AIState } from '../components/os/AICore';
import EmailTable from '../components/emails/EmailTable';
import { Plus, MessageSquare, RefreshCw, Trash2, LogOut } from 'lucide-react';
import { AIOfficeScene } from '../components/office/AIOfficeScene';
import { OfficeTaskEngine } from '../components/office/OfficeTaskEngine';

const SUGGESTIONS = [
  'Schedule a meeting for tomorrow',
  'Summarize my unread emails',
  'Create a task to finalize roadmaps',
  'Show me my calendar today',
];

// ─── Markdown link helper ─────────────────────────────────────────────────────
function parseMarkdownLink(text: string): React.ReactNode {
  if (typeof text !== 'string') return String(text);
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
    parts.push(
      <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
        {match[1]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.substring(lastIndex));
  return parts.length > 0 ? <>{parts}</> : text;
}

// ─── Message renderer ─────────────────────────────────────────────────────────
function MessageRenderer({ msg, userId }: { msg: ChatMessage; userId?: string }) {
  const data = msg.structuredData;
  const content = msg.content;

  if (data && (data.summary?.length || data.emails?.length || data.message)) {
    const emails = Array.isArray(data.emails) ? data.emails : [];
    const summary = Array.isArray(data.summary) ? data.summary : [];
    const textMessage = data.message || '';

    return (
      <div className="flex flex-col gap-4 w-full">
        {textMessage ? (
          <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed drop-shadow-md">
            {textMessage}
          </div>
        ) : null}

        {summary.length > 0 ? (
          <div className="bg-cyan-950/40 border border-cyan-400/20 rounded-xl p-4 backdrop-blur-sm">
            <h4 className="font-bold text-cyan-300 mb-3 flex items-center gap-2 text-xs tracking-widest uppercase">
              <span>📬</span> Summary
            </h4>
            <ul className="space-y-1.5">
              {summary.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-cyan-100/80 text-sm font-sans">
                  <span className="text-cyan-400 mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {emails.length > 0 && userId ? (
          <div
            className="w-full rounded-xl overflow-hidden border border-cyan-400/20 shadow-[0_0_40px_rgba(6,182,212,0.1)]"
            style={{ height: '560px', maxHeight: '70vh' }}
          >
            <EmailTable userId={userId} initialEmails={emails} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed drop-shadow-md">
      {content}
    </div>
  );
}

// ─── CommandCenter ────────────────────────────────────────────────────────────
export function CommandCenter() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [aiState, setAiState] = useState<AIState>('idle');
  
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [attachedDocumentId, setAttachedDocumentId] = useState<string | null>(null);
  const [attachedFilename, setAttachedFilename] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate a fresh thread ID if none
    if (!activeThreadId) {
      setActiveThreadId(crypto.randomUUID());
    }
  }, [activeThreadId]);

  useEffect(() => {
    if (user) {
      loadThreads();
      // Run an initial background sync on mount
      handleSync();
    }
  }, [user]);

  const loadThreads = async () => {
    if (!user) return;
    try {
      const data = await chatService.getThreads(user.userId);
      setThreads(data.threads || []);
    } catch (e) {
      console.error("Failed to load threads", e);
    }
  };

  const handleSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await chatService.syncData(user.userId);
      console.log("Sync complete");
    } catch (e) {
      console.error("Sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    try {
      await chatService.deleteThread(threadId);
      if (activeThreadId === threadId) {
        createNewChat();
      }
      loadThreads();
    } catch (err) {
      console.error("Failed to delete thread", err);
    }
  };

  const createNewChat = () => {
    setActiveThreadId(crypto.randomUUID());
    setMessages([]);
  };

  const loadChat = async (threadId: string) => {
    setActiveThreadId(threadId);
    try {
      const data = await chatService.getThreadMessages(threadId);
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages.map((m: any) => ({
          id: crypto.randomUUID(),
          sender: m.sender,
          content: m.content,
          timestamp: new Date(m.timestamp)
        })));
      } else {
        setMessages([{
          id: crypto.randomUUID(),
          sender: 'ai',
          content: 'Resumed conversation. How can I continue to help you?',
          timestamp: new Date()
        }]);
      }
    } catch (e) {
      console.error("Failed to load messages", e);
      setMessages([{
        id: crypto.randomUUID(),
        sender: 'ai',
        content: 'Failed to load conversation history.',
        timestamp: new Date()
      }]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, aiState]);

  const handleFileUpload = async (file: File) => {
    if (!user) return;
    setIsUploading(true);
    try {
      const data = await chatService.uploadFile(user.userId, file);
      setAttachedDocumentId(data.document_id);
      setAttachedFilename(data.filename);
    } catch (e) {
      console.error("File upload failed", e);
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || !user) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAiState('thinking');

    // 🏢 Dispatch task to AI Office – agents will animate while waiting for response
    OfficeTaskEngine.dispatchTask(userMsg.content);

    try {
      const currentDocId = attachedDocumentId || undefined;
      // Clear attachment after sending
      setAttachedDocumentId(null);
      setAttachedFilename(null);
      
      const response = await chatService.sendMessage(user.userId, activeThreadId, userMsg.content, currentDocId);

      setAiState('speaking');

      // 🏢 Complete ALL active agents (working / walking / standing) so none get stuck
      const agentIds: Array<'cipher' | 'nexus' | 'echo'> = ['cipher', 'nexus', 'echo'];
      for (const aid of agentIds) {
        const ag = OfficeTaskEngine.getAgents()[aid];
        if (ag.state !== 'idle' && ag.state !== 'sitting') {
          OfficeTaskEngine.onTaskComplete(aid);
        }
      }

      let plainTextContent = 'No response received.';
      let parsedData: StructuredAIResponse | undefined = undefined;

      const isStructured = (data: any) =>
        data && typeof data === 'object' && !Array.isArray(data) && (data.emails || data.summary || data.message);

      const salvageData = (text: string): StructuredAIResponse | undefined => {
        try {
          const result: StructuredAIResponse = {};
          const extractItems = (key: string) => {
            const items: any[] = [];
            const arrayMatch = text.match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)(?:\\]\\s*[,}]|$)`));
            if (!arrayMatch) return undefined;
            const objRegex = /\\{[^{}]*\\}(?=\\s*,|\\s*$)/g;
            const objMatches = arrayMatch[1].match(objRegex);
            if (objMatches) {
               for (const str of objMatches) {
                 try { items.push(JSON.parse(str)); } 
                 catch { try { items.push(JSON.parse(str.replace(/,[^,]*$/, '') + '}')); } catch {} }
               }
               return items.length > 0 ? items : undefined;
            }
            const strRegex = /"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"/g;
            const strMatches = arrayMatch[1].match(strRegex);
            if (strMatches) {
               for (const str of strMatches) {
                 try { items.push(JSON.parse(str)); } catch {}
               }
               return items.length > 0 ? items : undefined;
            }
            return undefined;
          };
          result.emails = extractItems('emails');
          result.summary = extractItems('summary');
          const messageMatch = text.match(/"message"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"/);
          if (messageMatch) {
             try { result.message = JSON.parse(messageMatch[0].replace(/"message"\\s*:\\s*/, '')); }
             catch { result.message = messageMatch[1]; }
          }
          if (result.emails || result.summary || result.message) return result;
        } catch {}
        return undefined;
      };

      if (isStructured(response)) {
        parsedData = response as StructuredAIResponse;
        plainTextContent = parsedData.message || JSON.stringify(parsedData);
      } else if (response?.response) {
        if (typeof response.response === 'string') {
          try {
            const inner = JSON.parse(response.response.trim());
            if (isStructured(inner)) {
              parsedData = inner as StructuredAIResponse;
              plainTextContent = parsedData.message || response.response;
            } else {
              plainTextContent = response.response;
            }
          } catch {
            const salvaged = salvageData(response.response);
            if (salvaged) {
              parsedData = salvaged;
              plainTextContent = salvaged.message || 'I have retrieved your data.';
            } else {
              plainTextContent = response.response;
            }
          }
        } else if (isStructured(response.response)) {
           parsedData = response.response as StructuredAIResponse;
           plainTextContent = parsedData.message || JSON.stringify(parsedData);
        }
      } else if (typeof response === 'string') {
         try {
           const inner = JSON.parse(response.trim());
           if (isStructured(inner)) {
             parsedData = inner as StructuredAIResponse;
             plainTextContent = parsedData.message || response;
           } else {
             plainTextContent = response;
           }
         } catch {
           plainTextContent = response;
         }
      }

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        content: plainTextContent,
        timestamp: new Date(),
        structuredData: parsedData,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setTimeout(() => setAiState('idle'), 3000);
      loadThreads(); // Refresh thread list
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'ai',
          content: '[SYSTEM ERROR] Matrix failure. Could not reach LangGraph engine.',
          timestamp: new Date(),
        },
      ]);
      setAiState('idle');
    }
  };

  return (
    <div className="flex h-full w-full bg-gray-950 overflow-hidden text-white relative">
      {/* Sidebar for Chat History */}
      <aside className="w-64 border-r border-cyan-900/30 bg-gray-950/80 backdrop-blur-xl flex flex-col flex-shrink-0 z-20 hidden md:flex">
        <div className="p-4 border-b border-cyan-900/30 flex items-center justify-between">
          <button 
            onClick={createNewChat}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 transition-colors text-sm font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        
        <div className="p-4 border-b border-cyan-900/30">
           <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-xs font-mono text-cyan-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Background Data'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
          <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-3">Conversation History</div>
          {threads.length === 0 ? (
             <div className="text-xs text-gray-500 font-mono text-center mt-4">No history found.</div>
          ) : (
            threads.map((th) => (
              <div key={th.id} className="relative group">
                <button 
                  onClick={() => loadChat(th.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm text-left truncate border pr-10 ${activeThreadId === th.id ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-100' : 'bg-transparent border-transparent hover:bg-white/5 text-gray-400'}`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-xs font-mono">{th.preview}</span>
                </button>
                <button
                  onClick={(e) => handleDeleteThread(e, th.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-cyan-900/30">
           <button 
            onClick={useAuth().logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 transition-colors text-xs font-mono text-red-400"
          >
            <LogOut className="w-3 h-3" />
            Logout Account
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 z-0">
          <AICore state={aiState} />
        </div>

        {/* 🏢 AI Office Scene – replaces static spinner */}
        <div className="flex-shrink-0 border-b border-cyan-900/30 bg-gray-950/60 backdrop-blur-xl relative z-10">
          <AIOfficeScene isThinking={aiState === 'thinking'} />
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 z-10 scrollbar-hide space-y-8">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
               <h2 className="text-2xl font-mono text-cyan-400 tracking-[0.2em] mb-4">MR. Jarvis</h2>
               <p className="text-sm text-gray-400 max-w-sm">Awaiting your command. My agents are standing by.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isStructured = msg.sender === 'ai' && !!msg.structuredData;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
                    className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={[
                        'rounded-2xl px-6 py-5 backdrop-blur-2xl border shadow-2xl',
                        isStructured ? 'w-full max-w-full' : 'max-w-[75%]',
                        msg.sender === 'user'
                          ? 'bg-blue-900/30 text-blue-50 border-blue-400/40 shadow-[0_0_30px_rgba(59,130,246,0.15)]'
                          : 'bg-cyan-950/40 text-cyan-50 border-cyan-400/40 shadow-[0_0_30px_rgba(6,182,212,0.15)]',
                      ].join(' ')}
                    >
                      {msg.sender === 'ai' && (
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                          <span className="text-[10px] text-cyan-300 tracking-widest uppercase font-bold">
                            Jarvis OS Response
                          </span>
                        </div>
                      )}
                      {msg.sender === 'user' && (
                        <div className="flex justify-end items-center gap-2 mb-3 pb-2 border-b border-white/10">
                          <span className="text-[10px] text-blue-300 tracking-widest uppercase font-bold">
                            Command Authorized
                          </span>
                          <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
                        </div>
                      )}

                      {msg.sender === 'ai' ? (
                        <MessageRenderer msg={msg} userId={user?.userId} />
                      ) : (
                        <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed drop-shadow-md">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {aiState === 'thinking' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start w-full relative z-10"
            >
              <div className="rounded-2xl px-6 py-4 bg-purple-900/30 border border-purple-500/40 backdrop-blur-2xl shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                <div className="flex items-center gap-4">
                  <div className="relative w-6 h-6">
                    <div className="absolute inset-0 border-2 border-purple-500/30 rounded-full" />
                    <div className="absolute inset-0 border-2 border-purple-400 rounded-full border-t-transparent animate-spin" />
                  </div>
                  <div className="font-mono text-sm text-purple-300 tracking-widest uppercase flex">
                    Analyzing Directive
                    <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>.</motion.span>
                    <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}>.</motion.span>
                    <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}>.</motion.span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Old spinner removed – AI Office Scene handles visual feedback */}
          <div ref={messagesEndRef} className="h-10" />
        </div>

        <div className="px-6 sm:px-12 pb-8 pt-4 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent z-20">
          <div className="flex overflow-x-auto gap-3 mb-4 pb-2 scrollbar-hide mask-fade-edges">
            {SUGGESTIONS.map((sug, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSend(sug)}
                className="flex-shrink-0 px-4 py-2 rounded-full border border-cyan-900/50 bg-cyan-950/30 backdrop-blur-md text-xs font-mono text-cyan-300 hover:border-cyan-500/50 hover:bg-cyan-900/50 transition-colors"
              >
                {sug}
              </motion.button>
            ))}
          </div>

          <CyberInput
            value={input}
            onChange={setInput}
            onSend={() => handleSend()}
            isLoading={aiState === 'thinking'}
            onFileUpload={handleFileUpload}
            attachedFilename={attachedFilename}
            onRemoveAttachment={() => {
              setAttachedDocumentId(null);
              setAttachedFilename(null);
            }}
            isUploading={isUploading}
          />
        </div>
      </div>
    </div>
  );
}
