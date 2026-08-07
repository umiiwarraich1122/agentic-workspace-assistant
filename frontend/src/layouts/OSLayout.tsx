import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, MessageSquare, Mail, Calendar as CalendarIcon, 
  CheckSquare, Settings, LogOut, BarChart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GlobalEnvironment } from '../components/os/GlobalEnvironment';
import { SystemStatusBar } from './SystemStatusBar';
import { TodayCalendarWidget, UnreadEmailsWidget, PendingTasksWidget } from '../components/widgets/DashboardWidgets';

export function OSLayout() {
  const { logout, user } = useAuth();
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
  ];

  return (
    <div className="flex flex-col h-screen bg-transparent text-white overflow-hidden relative">
      <GlobalEnvironment />
      
      <SystemStatusBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Rail (Desktop) & Bottom Navigation Bar (Mobile) */}
        <motion.nav 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="fixed bottom-0 left-0 right-0 h-16 md:h-auto md:relative md:w-16 md:hover:w-48 group flex-shrink-0 border-t md:border-t-0 md:border-r border-cyan-900/30 bg-gray-950/90 backdrop-blur-3xl flex md:flex-col md:py-6 z-40 transition-[width] duration-300 ease-out md:overflow-hidden flex-row justify-around md:justify-start items-center md:items-stretch"
        >
          <div className="flex-1 flex flex-row md:flex-col gap-1 md:gap-2 w-full md:px-2 md:mt-4 h-full items-center justify-around md:justify-start">
            {navItems.map((item, idx) => {
              const isActive = window.location.pathname === item.path || (item.path === '/chat' && window.location.pathname === '/chat');
              return (
                <button 
                  key={idx} 
                  onClick={() => navigate(item.path)}
                  className={`
                    relative flex md:items-center justify-center md:justify-start w-12 md:w-full h-12 md:h-auto md:px-3 md:py-3 rounded-xl transition-all duration-300 flex-col md:flex-row
                    ${isActive ? 'bg-cyan-500/20 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)] text-cyan-400' : 'hover:bg-cyan-500/10 text-cyan-600'}
                  `}
                >
                  {isActive && (
                    <>
                      <motion.div layoutId="activeNavDesktop" className="hidden md:block absolute left-0 top-1/4 bottom-1/4 w-1 bg-cyan-400 rounded-r-full shadow-[0_0_10px_#22d3ee]" />
                      <motion.div layoutId="activeNavMobile" className="md:hidden absolute top-0 left-1/4 right-1/4 h-1 bg-cyan-400 rounded-b-full shadow-[0_0_10px_#22d3ee]" />
                    </>
                  )}
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-cyan-600 group-hover:text-cyan-400'}`} />
                  <span className="hidden md:block ml-4 font-mono text-sm tracking-widest text-cyan-100 opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">
                    {item.label}
                  </span>
                  {/* Small label for mobile if wanted, or just icon. Let's just use icon for mobile */}
                  <span className="md:hidden text-[9px] font-mono mt-1 opacity-70 truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex flex-col gap-2 mt-auto w-full px-2">
            <button onClick={handleLogout} className="relative flex items-center w-full px-3 py-3 rounded-xl hover:bg-red-500/10 transition-colors">
              <LogOut className="w-5 h-5 text-cyan-800 group-hover:text-red-400 flex-shrink-0 transition-colors" />
              <span className="ml-4 font-mono text-sm tracking-widest text-red-400 opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">
                LOGOUT
              </span>
            </button>
          </div>
        </motion.nav>

        {/* Center Workspace (The Command Center) */}
        <main className="flex-1 relative z-10 flex flex-col min-w-0 pb-16 md:pb-0">
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
    </div>
  );
}
