import os

filepath = "frontend/src/pages/WhatsAppModule.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
content = content.replace(
    "import { MessageCircle, QrCode, Send, RefreshCw, User, Phone, Check, CheckCheck } from 'lucide-react';",
    "import { MessageCircle, QrCode, Send, RefreshCw, User, Phone, Check, CheckCheck, ArrowLeft, Wand2 } from 'lucide-react';\nimport { useNavigate } from 'react-router-dom';"
)

# Add hooks and AI function inside WhatsAppModule()
target_hooks = """  const [isSending, setIsSending] = useState(false);"""
new_hooks = """  const [isSending, setIsSending] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const navigate = useNavigate();

  const generateReplyWithAI = async () => {
    if (messages.length === 0 || !activeChat) return;
    setIsGeneratingAI(true);
    try {
      const recentMessages = messages.slice(-5).map(m => `${m.is_from_me ? 'Me' : activeChat.name || activeChat.id.split('@')[0]}: ${m.message_content}`).join('\\n');
      const prompt = `Based on the following recent WhatsApp conversation, generate a short, natural, and helpful reply on my behalf. DO NOT put quotes around the reply. Just return the text.\\n\\nConversation:\\n${recentMessages}`;
      
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
  };"""
content = content.replace(target_hooks, new_hooks)

# Add back button to header
target_header = """      <div className="flex items-center gap-4 mb-4 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-cyan-900/30 border border-cyan-500/30 flex items-center justify-center">"""
new_header = """      <div className="flex items-center gap-4 mb-4 shrink-0">
        <button onClick={() => navigate('/chat')} className="p-2 bg-gray-900/60 rounded-xl hover:bg-gray-800 transition-colors border border-cyan-900/30">
          <ArrowLeft className="w-5 h-5 text-cyan-400" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-cyan-900/30 border border-cyan-500/30 flex items-center justify-center">"""
content = content.replace(target_header, new_header)

# Add wand button
target_input = """                      <input 
                        type="text" 
                        placeholder="Type a message..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        className="flex-1 bg-gray-900/80 border border-cyan-900/60 rounded-xl px-4 py-3 text-cyan-100 font-sans focus:outline-none focus:border-cyan-500/80 transition-colors shadow-inner placeholder-gray-600"
                      />
                      <button 
                        onClick={handleSend}"""
new_input = """                      <input 
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
                        onClick={handleSend}"""
content = content.replace(target_input, new_input)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
