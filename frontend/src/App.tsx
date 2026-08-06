import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingOS } from './pages/LandingOS';
import { CommandCenter } from './pages/CommandCenter';
import { EmailModule } from './pages/EmailModule';
import { CalendarModule } from './pages/CalendarModule';
import { TasksModule } from './pages/TasksModule';
import { VoiceWorld } from './pages/VoiceWorld';
import { OSLayout } from './layouts/OSLayout';
import { GlobalEnvironment } from './components/os/GlobalEnvironment';
import { AICore } from './components/os/AICore';

// High-tech cinematic transition when authenticating
function AuthCallbackHandler() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'authenticating' | 'transitioning'>('authenticating');

  useEffect(() => {
    const userId = searchParams.get('user_id');
    const name = searchParams.get('name') || undefined;
    if (userId) {
      login(userId, name);
      setPhase('transitioning');
      const timer = setTimeout(() => {
        navigate('/chat');
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      navigate('/');
    }
  }, [searchParams, login, navigate]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-950 text-white overflow-hidden relative">
      <GlobalEnvironment />
      
      <AnimatePresence mode="wait">
        {phase === 'authenticating' && (
          <motion.div 
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 border-2 border-cyan-500 rounded-full animate-spin border-t-transparent mb-8 shadow-[0_0_20px_#06b6d4]" />
            <h2 className="text-xl font-mono text-cyan-400 tracking-[0.2em] animate-pulse">AUTHORIZING_ACCESS</h2>
          </motion.div>
        )}

        {phase === 'transitioning' && (
          <motion.div
            key="trans"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.5, 10], opacity: [0, 1, 0] }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <AICore />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-950">
        <div className="w-16 h-16 border-2 border-cyan-500 rounded-full animate-spin border-t-transparent shadow-[0_0_20px_#06b6d4]" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingOS />} />
          <Route path="/auth/callback" element={<AuthCallbackHandler />} />
          
          <Route path="/chat" element={
            <PrivateRoute>
              <OSLayout />
            </PrivateRoute>
          }>
            <Route index element={<CommandCenter />} />
            <Route path="emails" element={<EmailModule />} />
            <Route path="calendar" element={<CalendarModule />} />
            <Route path="tasks" element={<TasksModule />} />
          </Route>

          <Route path="/chat/voice-world" element={
            <PrivateRoute>
              <VoiceWorld />
            </PrivateRoute>
          } />
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
