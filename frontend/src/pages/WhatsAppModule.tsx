import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, QrCode, Send, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function WhatsAppModule() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('checking');
  const [replyText, setReplyText] = useState('');
  const [replyNumber, setReplyNumber] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const { user } = useAuth();
  const BACKEND_URL = 'http://localhost:8000'; // Or use api base URL

  const checkConnection = async () => {
    setStatus('checking');
    try {
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/connect`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.status === 'connected') {
        setStatus('connected');
        fetchMessages();
      } else if (data.status === 'qr_generated' && data.data?.qrcode?.base64) {
        setStatus('qr_ready');
        setQrCode(data.data.qrcode.base64);
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/whatsapp/messages`);
      const data = await res.json();
      setMessages(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async () => {
    if (!replyText || !replyNumber) return;
    setIsSending(true);
    try {
      await fetch(`${BACKEND_URL}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: replyNumber, message: replyText })
      });
      setReplyText('');
      fetchMessages();
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
        fetchMessages();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [status]);

  return (
    <div className="flex flex-col h-full w-full bg-gray-950 p-6 overflow-hidden">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-cyan-900/30 border border-cyan-500/30 flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-mono text-cyan-50 tracking-wider">WhatsApp Integration</h1>
          <p className="text-cyan-400/60 font-mono text-sm">Real-time messaging via Evolution API</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
        {/* Left Side: Status & QR */}
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <div className="bg-gray-900/50 border border-cyan-900/50 rounded-xl p-6 backdrop-blur-sm">
            <h2 className="text-cyan-400 font-mono font-bold mb-4 uppercase tracking-widest flex items-center justify-between">
              Connection Status
              <button onClick={checkConnection} className="hover:text-cyan-300">
                <RefreshCw className="w-4 h-4" />
              </button>
            </h2>
            
            {status === 'checking' && (
              <div className="text-cyan-300 animate-pulse font-mono text-sm">Checking instance status...</div>
            )}
            
            {status === 'connected' && (
              <div className="text-green-400 font-mono text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Connected successfully
              </div>
            )}

            {status === 'qr_ready' && qrCode && (
              <div className="flex flex-col items-center gap-4">
                <div className="text-cyan-300 font-mono text-sm text-center">Scan this QR Code with your WhatsApp app</div>
                <div className="bg-white p-4 rounded-xl">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                </div>
              </div>
            )}
            
            {status === 'error' && (
              <div className="text-red-400 font-mono text-sm">Failed to connect to Evolution API. Make sure the container is running.</div>
            )}
          </div>
          
          <div className="bg-gray-900/50 border border-cyan-900/50 rounded-xl p-6 backdrop-blur-sm flex-1">
             <h2 className="text-cyan-400 font-mono font-bold mb-4 uppercase tracking-widest">Send Message</h2>
             <div className="space-y-4">
               <input 
                 type="text" 
                 placeholder="Phone Number (e.g. 923001234567)" 
                 value={replyNumber}
                 onChange={(e) => setReplyNumber(e.target.value)}
                 className="w-full bg-gray-950 border border-cyan-900/50 rounded-lg px-4 py-2 text-cyan-100 font-mono text-sm focus:outline-none focus:border-cyan-500"
               />
               <textarea 
                 placeholder="Type your message..."
                 value={replyText}
                 onChange={(e) => setReplyText(e.target.value)}
                 className="w-full bg-gray-950 border border-cyan-900/50 rounded-lg px-4 py-2 text-cyan-100 font-mono text-sm h-32 resize-none focus:outline-none focus:border-cyan-500"
               />
               <button 
                 onClick={handleSend}
                 disabled={isSending || !replyText || !replyNumber}
                 className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold uppercase tracking-widest text-sm py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
               >
                 <Send className="w-4 h-4" />
                 {isSending ? 'Sending...' : 'Send Message'}
               </button>
             </div>
          </div>
        </div>

        {/* Right Side: Messages */}
        <div className="w-full md:w-2/3 bg-gray-900/50 border border-cyan-900/50 rounded-xl p-6 backdrop-blur-sm flex flex-col h-full overflow-hidden">
           <h2 className="text-cyan-400 font-mono font-bold mb-4 uppercase tracking-widest flex items-center justify-between">
              Message History
              <button onClick={fetchMessages} className="hover:text-cyan-300">
                <RefreshCw className="w-4 h-4" />
              </button>
            </h2>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-cyan-700/50 font-mono text-sm">
                  No messages recorded yet
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex w-full ${msg.is_from_me ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[80%] rounded-xl p-4 ${msg.is_from_me ? 'bg-cyan-900/40 border border-cyan-500/30 text-cyan-100' : 'bg-gray-800/80 border border-gray-700 text-gray-100'}`}>
                        <div className="text-[10px] text-cyan-400 mb-1 opacity-70 font-mono">{msg.push_name} ({msg.remote_jid})</div>
                        <div className="text-sm font-sans">{msg.message_content}</div>
                     </div>
                  </div>
                ))
              )}
            </div>
        </div>
      </div>
    </div>
  );
}
