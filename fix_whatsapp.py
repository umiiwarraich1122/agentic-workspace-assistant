import re

filepath = "frontend/src/pages/WhatsAppModule.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix activeChat.id
content = content.replace("activeChat.id.split('@')[0]", "(activeChat.id || activeChat.remoteJid || '').split('@')[0]")

# Fix chat.id
content = content.replace("chat.name || chat.pushName || chat.id || chat.remoteJid || ''.split('@')[0]", "chat.name || chat.pushName || (chat.id || chat.remoteJid || '').split('@')[0]")

# Fix the className activeChat check
content = content.replace(
    "`w-full flex items-center gap-3 p-4 border-b border-cyan-900/20 hover:bg-cyan-950/40 transition-colors text-left ${activeChat?.id === chat.id || chat.remoteJid || '' ? 'bg-cyan-900/30 border-l-2 border-l-cyan-400' : ''}`",
    "`w-full flex items-center gap-3 p-4 border-b border-cyan-900/20 hover:bg-cyan-950/40 transition-colors text-left ${activeChat && (activeChat.id || activeChat.remoteJid) === (chat.id || chat.remoteJid) ? 'bg-cyan-900/30 border-l-2 border-l-cyan-400' : ''}`"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
