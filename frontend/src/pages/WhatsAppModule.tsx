import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, QrCode, Send, RefreshCw, User, Phone, Check, CheckCheck, ArrowLeft, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function WhatsAppModule() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [status, setStatus] = useState<string>('checking');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const navigate = useNavigate();

  const generateReplyWithAI = async () => {
    if (messages.length === 0 || !activeChat) return;
    setIsGeneratingAI(true);
    try {
      const recentMessages = messages.slice(-5).map(m => `${m.is_from_me ? 'Me' : activeChat.name || activeChat.id.split('@')[0]}: ${m.message_content}`).join('\n');
      const prompt = `Based on the following recent WhatsApp conversation, generate a short, natural, and helpful reply on my behalf. DO NOT put quotes around the reply. Just return the text.\n\nConversation:\n${recentMessages}`;
      
      const { chatService } = await import('../services/api');
      // @ts-ignore
      const response = await chatService.sendMessage(user?.userId || 'default', crypto.randomUUID(), prompt);
      
      let aiText = response?.response || response?.message || '';
      
      setReplyText(aiText.trim());
    } catch (e) {
      console.error("AI reply failed", e);
    } finally {
      setIsGeneratingAI(false);
    }
  };
  
  const { user } = useAuth();
  const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const checkConnection = async () => {
    setStatus('checking');
    try {
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/connect`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'connected') {
        setStatus('connected');
        fetchChats();
      } else if (data.status === 'qr_generated' && (data.data?.qrcode?.base64 || data.data?.base64)) {
        setStatus('qr_ready');
        setQrCode(data.data.qrcode?.base64 || data.data.base64);
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const fetchChats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/chats`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Sort chats by most recent message (if timestamp exists)
        const sorted = data.sort((a, b) => (b.conversationTimestamp || 0) - (a.conversationTimestamp || 0));
        setChats(sorted);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (jid: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/messages?jid=${encodeURIComponent(jid)}`);
      const data = await res.json();
      setMessages(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async () => {
    if (!replyText || !activeChat) return;
    setIsSending(true);
    try {
      await fetch(`${BACKEND_URL}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: activeChat.id.split('@')[0], message: replyText })
      });
      setReplyText('');
      fetchMessages(activeChat.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(() => {
      if (status === 'connected') {
        fetchChats();
        if (activeChat) {
          fetchMessages(activeChat.id);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [status, activeChat]);

  // Select chat handler
  const handleChatSelect = (chat: any) => {
    setActiveChat(chat);
    fetchMessages(chat.id);
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-950 p-4 overflow-hidden relative">
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <button onClick={() => navigate('/chat')} className="p-2 bg-gray-900/60 rounded-xl hover:bg-gray-800 transition-colors border border-cyan-900/30">
          <ArrowLeft className="w-5 h-5 text-cyan-400" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-cyan-900/30 border border-cyan-500/30 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-mono text-cyan-50 tracking-wider">WhatsApp Intelligence</h1>
          <p className="text-cyan-400/60 font-mono text-xs">Evolution API Bridge</p>
        </div>
        {status === 'connected' && (
          <button onClick={fetchChats} className="ml-auto flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors">
            <RefreshCw className="w-3 h-3" /> Refresh Sync
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* State A: QR Code / Not Connected */}
        {status !== 'connected' && (
          <motion.div 
            key="qr_view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-center min-h-0"
          >
            <div className="bg-gray-900/50 border border-cyan-900/50 rounded-2xl p-8 backdrop-blur-md max-w-md w-full flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(6,182,212,0.1)]">
              <div className="w-16 h-16 rounded-full bg-cyan-950/50 flex items-center justify-center">
                 <QrCode className="w-8 h-8 text-cyan-400" />
              </div>
              <h2 className="text-xl font-mono font-bold text-cyan-300 uppercase tracking-widest text-center">
                Link WhatsApp
              </h2>
              
              {status === 'checking' && (
                <div className="text-cyan-400/80 font-mono text-sm animate-pulse">Initializing connection bridge...</div>
              )}
              
              {status === 'qr_ready' && qrCode && (
                <div className="flex flex-col items-center gap-4 w-full">
                  <p className="text-gray-400 font-sans text-sm text-center">
                    Open WhatsApp on your phone, tap Menu or Settings and select <strong>Linked Devices</strong>. Point your phone to this screen to capture the code.
                  </p>
                  <div className="bg-white p-4 rounded-xl shadow-xl w-64 h-64 flex items-center justify-center">
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}
              
              {status === 'error' && (
                <div className="text-red-400 font-mono text-sm text-center">
                  Failed to connect to the Evolution gateway.<br/>Verify the docker container is running.
                  <button onClick={checkConnection} className="mt-4 px-6 py-2 bg-red-900/30 border border-red-500/30 rounded-lg hover:bg-red-900/50 transition-colors">
                    Retry Connection
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* State B: Connected (Two-Pane Layout) */}
        {status === 'connected' && (
          <motion.div 
            key="chat_view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex gap-4 min-h-0"
          >
            {/* Left Sidebar: Contacts */}
            <div className="w-80 flex-shrink-0 bg-gray-900/40 border border-cyan-900/40 rounded-xl flex flex-col overflow-hidden backdrop-blur-sm">
              <div className="p-4 border-b border-cyan-900/40 bg-gray-950/60">
                <h3 className="font-mono text-sm font-bold text-cyan-400 uppercase tracking-widest">Active Chats</h3>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {chats.length === 0 ? (
                  <div className="p-8 text-center text-cyan-700/50 font-mono text-xs">
                    No active chats found. Try sending a message from your phone first to sync.
                  </div>
                ) : (
                  chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleChatSelect(chat)}
                      className={`w-full flex items-center gap-3 p-4 border-b border-cyan-900/20 hover:bg-cyan-950/40 transition-colors text-left ${activeChat?.id === chat.id ? 'bg-cyan-900/30 border-l-2 border-l-cyan-400' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-800 border border-cyan-900/50 flex items-center justify-center flex-shrink-0">
                        {chat.profilePicUrl ? (
                           <img src={chat.profilePicUrl} alt={chat.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                           <User className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="font-sans font-semibold text-cyan-50 truncate text-sm">
                          {chat.name || chat.pushName || chat.id.split('@')[0]}
                        </div>
                        <div className="text-xs text-gray-500 truncate font-sans">
                           {/* Preview last message if available from Evolution */}
                           {chat.lastMessage?.conversation || "Active thread..."}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right Panel: Messaging */}
            <div className="flex-1 bg-gray-900/40 border border-cyan-900/40 rounded-xl flex flex-col overflow-hidden backdrop-blur-sm">
              {activeChat ? (
                <>
                  <div className="p-4 border-b border-cyan-900/40 bg-gray-950/60 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-800 border border-cyan-900/50 flex items-center justify-center">
                       {activeChat.profilePicUrl ? (
                         <img src={activeChat.profilePicUrl} alt={activeChat.name} className="w-full h-full rounded-full object-cover" />
                       ) : (
                         <User className="w-5 h-5 text-gray-500" />
                       )}
                    </div>
                    <div>
                      <h3 className="font-sans font-bold text-cyan-50">{activeChat.name || activeChat.pushName || activeChat.id.split('@')[0]}</h3>
                      <div className="text-xs font-mono text-cyan-400/70 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {activeChat.id.split('@')[0]}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-4">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-cyan-700/50 font-mono text-sm gap-2">
                         <MessageCircle className="w-8 h-8 opacity-50" />
                         No messages in local cache
                      </div>
                    ) : (
                      messages.map((msg, idx) => (
                        <div key={idx} className={`flex w-full ${msg.is_from_me ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-lg ${msg.is_from_me ? 'bg-cyan-900/50 border border-cyan-500/30 text-cyan-50 rounded-br-sm' : 'bg-gray-800/80 border border-gray-700 text-gray-100 rounded-bl-sm'}`}>
                              <div className="text-sm font-sans whitespace-pre-wrap">{msg.message_content}</div>
                              <div className="flex justify-end items-center gap-1 mt-1 text-[10px] opacity-60 font-mono text-cyan-300">
                                {msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                {msg.is_from_me && <CheckCheck className="w-3 h-3 text-cyan-400" />}
                              </div>
                           </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 bg-gray-950/60 border-t border-cyan-900/40">
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        placeholder="Type a message..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        className="flex-1 bg-gray-900/80 border border-cyan-900/60 rounded-xl px-4 py-3 text-cyan-100 font-sans focus:outline-none focus:border-cyan-500/80 transition-colors shadow-inner placeholder-gray-600"
                      />
                      <button 
                        onClick={generateReplyWithAI}
                        disabled={isGeneratingAI || messages.length === 0}
                        title="Generate AI Reply"
                        className="bg-purple-600/30 border border-purple-500/50 hover:bg-purple-600/60 disabled:opacity-50 text-white rounded-xl px-4 flex items-center justify-center transition-colors"
                      >
                        {isGeneratingAI ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5 text-purple-300" />}
                      </button>
                      <button 
                        onClick={handleSend}
                        disabled={isSending || !replyText}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl px-6 flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                      >
                        {isSending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-cyan-700/50 font-mono text-sm gap-4">
                  <div className="w-16 h-16 rounded-full bg-cyan-950/30 flex items-center justify-center border border-cyan-900/50">
                    <MessageCircle className="w-8 h-8 text-cyan-800" />
                  </div>
                  Select a contact from the sidebar to view thread
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
