import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Settings, LogOut, Menu, X, Bot, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/GlassCard';

export function ChatLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar Desktop */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full border-r border-white/10 bg-black/40 backdrop-blur-xl flex flex-col flex-shrink-0"
          >
            <div className="p-4 flex items-center gap-3 border-b border-white/10">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-lg tracking-wide">Jarvis AI</span>
            </div>
            
            <div className="p-4">
              <button className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent</div>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-gray-300 text-left truncate">
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Schedule meeting with Team</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-gray-300 text-left truncate">
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Summarize yesterday's emails</span>
              </button>
            </div>

            <div className="p-4 border-t border-white/10 space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-gray-300">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors text-sm">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Navbar */}
        <header className="h-16 flex items-center justify-between px-4 sticky top-0 z-10 bg-gray-950/50 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-300"
            >
              {isSidebarOpen ? <Menu className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="font-medium text-gray-200">Jarvis Beta</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="font-bold tracking-widest text-sm text-cyan-300">USER DETECTED</div>
              <div className="text-xs text-gray-400">{user?.name || user?.userId || 'unknown'}</div>
            </div>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-500/20">
                MU
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-gray-950 rounded-full"></div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
