import re

filepath = "frontend/src/pages/WhatsAppModule.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("fetchMessages(activeChat.id)", "fetchMessages(activeChat.id || activeChat.remoteJid)")
content = content.replace("fetchMessages(chat.id || chat.remoteJid || '')", "fetchMessages(chat.id || chat.remoteJid || '')")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
