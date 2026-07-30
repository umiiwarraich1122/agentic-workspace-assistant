import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Mic, Loader2, Bot } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/api';
import type { ChatMessage } from '../types';
import { GlassCard } from '../components/GlassCard';
import EmailTable from '../components/emails/EmailTable';

const parseMarkdownLink = (text: string) => {
  if (typeof text !== 'string') return text;
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
        {match[1]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

// Detect if a message content contains structured email/table data
function parseStructuredContent(content: string): Record<string, unknown> | null {
  try {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) return null;
    let cleaned = content.substring(start, end + 1);
    // Fix LLM bracket hallucinations
    cleaned = cleaned.replace(/\]+(\s*\}\s*\})$/, ']]$1');
    const data = JSON.parse(cleaned);
    if (data && typeof data === 'object' && (data.message || data.emails || data.summary || data.table || data.response)) {
      return data as Record<string, unknown>;
    }
  } catch {
    // not JSON
  }
  return null;
}

const MessageRenderer = ({ content, userId }: { content: string; userId?: string }) => {
  const data = parseStructuredContent(content);

  if (data) {
    const hasEmails = (Array.isArray(data.emails) && (data.emails as unknown[]).length > 0) as boolean;
    const hasSummary = (Array.isArray(data.summary) && (data.summary as unknown[]).length > 0) as boolean;
    const hasTable = (data.table != null && Array.isArray((data.table as any).columns) && Array.isArray((data.table as any).rows)) as boolean;
    // The human-readable message can be in .message or .response
    const textMessage = ((data.message || data.response || '') as string);

    return (
      <div className="flex flex-col gap-3 w-full">
        {/* Plain text portion */}
        {textMessage && <div className="whitespace-pre-wrap">{textMessage}</div>}

        {/* 📬 Summary bullet list */}
        {hasSummary && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2 text-sm">
              📬 <span>Summary</span>
            </h4>
            <ul className="space-y-1.5">
              {(data.summary as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-white/80 text-sm">
                  <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Email table */}
        {hasEmails && userId && (
          <div className="w-full mt-1 rounded-xl overflow-hidden border border-white/10 shadow-2xl relative z-20" style={{ height: 'min(540px, 70vh)' }}>
            <EmailTable userId={userId} initialEmails={data.emails as any[]} />
          </div>
        )}

        {/* Generic data table */}
        {hasTable && (
          <div className="overflow-x-auto mt-1 rounded-lg border border-white/10 bg-black/20">
            <table className="w-full text-left text-sm min-w-max">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  {((data.table as any).columns as string[]).map((col, i) => (
                    <th key={i} className="px-4 py-3 font-medium text-cyan-300">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {((data.table as any).rows as unknown[]).map((row, i) => {
                  const cells = Array.isArray(row) ? row : Object.values(row as object);
                  return (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      {cells.map((cell, j) => (
                        <td key={j} className="px-4 py-3 text-gray-200">
                          {parseMarkdownLink(String(cell))}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return <div className="whitespace-pre-wrap">{content}</div>;
};

export function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Hardcoded thread ID for now, usually would be generated/managed per conversation
  const threadId = useRef(crypto.randomUUID()).current;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: input.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await chatService.sendMessage(user.userId, threadId, userMsg.content);
      
      // If the response contains structured data (emails, summary, etc.), store the full
      // JSON object so MessageRenderer can parse and render it as rich UI components.
      // Otherwise fall back to the plain text response string.
      let contentToStore: string;
      if (response && (response.emails || response.summary || response.message)) {
        contentToStore = JSON.stringify(response);
      } else {
        contentToStore = response?.response || response?.message || "No response received.";
      }
      
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        content: contentToStore,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        content: "Sorry, I encountered an error while processing your request.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col pt-4 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full relative z-10 pb-6">
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-6 pr-2 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-xl font-medium text-white mb-2">How can I help you today?</h2>
            <p className="text-sm text-gray-400 max-w-sm">Ask me to check your emails, manage your calendar, or create tasks.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isStructured = msg.sender === 'ai' && parseStructuredContent(msg.content) !== null;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.sender === 'user' ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-blue-600'}`}>
                    {msg.sender === 'user' ? (
                      <span className="text-xs font-bold text-white">MU</span>
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  <div className={`${isStructured ? 'flex-1 min-w-0' : 'max-w-[90%] sm:max-w-[85%]'} ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-100'} rounded-2xl px-5 py-3.5 leading-relaxed text-[15px] shadow-sm backdrop-blur-md border border-white/5`}>
                    <MessageRenderer content={msg.content} userId={user?.userId} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white/5 rounded-2xl px-5 py-4 flex items-center gap-2 border border-white/5">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-blue-400 rounded-full" />
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-blue-400 rounded-full" />
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-blue-400 rounded-full" />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <GlassCard className="p-2 sm:p-3 flex items-end gap-2 bg-gray-900/80 sticky bottom-0">
        <button disabled className="p-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50 flex-shrink-0">
          <Paperclip className="w-5 h-5" />
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask Jarvis anything..."
          className="flex-1 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-white placeholder-gray-500 py-3 max-h-32 min-h-[48px] overflow-y-auto"
          rows={1}
        />
        <button disabled className="p-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50 flex-shrink-0">
          <Mic className="w-5 h-5" />
        </button>
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:bg-gray-700 flex-shrink-0 shadow-lg shadow-blue-500/20"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </GlassCard>
      
      <div className="text-center mt-2 text-xs text-gray-500">
        Jarvis can make mistakes. Consider verifying important actions.
      </div>
    </div>
  );
}
