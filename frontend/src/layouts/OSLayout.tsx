import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, MessageSquare, Mail, Calendar as CalendarIcon, 
  CheckSquare, Settings, LogOut, BarChart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { GlobalEnvironment } from '../components/os/GlobalEnvironment';
import { SystemStatusBar } from './SystemStatusBar';
import { TodayCalendarWidget, UnreadEmailsWidget, PendingTasksWidget } from '../components/widgets/DashboardWidgets';

export function OSLayout() {
  const { logout, user } = useAuth();
  const { reminderPopup, clearReminder } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  React.useEffect(() => {
    // Auto-sync emails in the background when a user is available
    if (!user || !user.userId) return;
    import('../services/api').then(({ chatService }) => {
      // chatService.syncData sets the required X-User-Id header for requests
      chatService.syncData(user.userId).catch(console.error);
    }).catch(console.error);
  }, [user]);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/chat' },
    { icon: Mail, label: 'Emails', path: '/chat/emails' },
    { icon: CalendarIcon, label: 'Calendar', path: '/chat/calendar' },
    { icon: CheckSquare, label: 'Tasks', path: '/chat/tasks' },
    { icon: MessageSquare, label: 'GitHub', path: '/chat/github' },
  ];

  return (
    <div className="flex flex-col h-screen bg-transparent text-white overflow-hidden relative">
      <GlobalEnvironment />
      
      <SystemStatusBar />

      <div className="flex flex-col-reverse md:flex-row flex-1 overflow-hidden">
        {/* Left Navigation Rail (Desktop) & Bottom Navigation Bar (Mobile) */}


        {/* Center Workspace (The Command Center) */}
        <main className="flex-1 relative z-10 flex flex-col min-w-0 min-h-0">
          <Outlet />
        </main>

        {/* Right Intelligence Panel */}
        <motion.aside 
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          className="hidden xl:flex w-[340px] flex-shrink-0 border-l border-cyan-900/30 bg-gray-950/40 backdrop-blur-2xl flex-col z-20 overflow-y-auto scrollbar-hide p-6 space-y-6"
        >
          <div className="flex items-center gap-2 pb-4 border-b border-cyan-900/50">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <h2 className="font-mono text-cyan-400 tracking-[0.1em] text-sm font-bold">LIVE_INTELLIGENCE</h2>
          </div>
          
          <TodayCalendarWidget />
          <UnreadEmailsWidget />
          <PendingTasksWidget />
        </motion.aside>
      </div>

      {/* Global Reminder Popup */}
      <AnimatePresence>
        {reminderPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] p-6 rounded-2xl bg-cyan-950/90 border-2 border-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.5)] backdrop-blur-xl flex flex-col items-center gap-4 max-w-md w-full"
          >
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center animate-pulse">
              <MessageSquare className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-mono text-cyan-300 font-bold uppercase tracking-widest">{reminderPopup.title}</h3>
            <p className="text-center text-cyan-50 font-sans text-lg">{reminderPopup.message}</p>
            <button
              onClick={clearReminder}
              className="mt-4 px-8 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-widest uppercase transition-colors"
            >
              Acknowledge
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
