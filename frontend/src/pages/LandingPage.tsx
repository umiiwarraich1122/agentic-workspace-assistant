import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Calendar, CheckSquare, Zap, Shield, Sparkles, LogIn, ArrowRight } from 'lucide-react';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const features = [
  { icon: Mail, title: 'Smart Email', desc: 'Read and draft emails intelligently without ever sending automatically.' },
  { icon: Calendar, title: 'Calendar Automation', desc: 'Manage your schedule, create events, and never miss a meeting.' },
  { icon: CheckSquare, title: 'Task Management', desc: 'Organize your Microsoft To Do seamlessly.' },
  { icon: Zap, title: 'LangGraph Agent', desc: 'Powered by advanced AI reasoning and Microsoft Graph.' },
];

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    // In a real flow, this redirects to the backend oauth endpoint
    // window.location.href = import.meta.env.VITE_API_URL + '/auth/login';
    // For now, redirecting to the actual backend:
    window.location.href = 'http://localhost:8000/auth/login';
  };

  const handleGoToChat = () => {
    navigate('/chat');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden relative selection:bg-blue-500/30">
      <AnimatedBackground />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8"
        >
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-300">Introducing Jarvis AI Assistant</span>
        </motion.div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-300"
        >
          Your Intelligent <br className="hidden sm:block" /> Operating System
        </motion.h1>

        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12"
        >
          A premium Microsoft-powered AI assistant that manages your emails, calendar, and To Do lists using natural language.
        </motion.p>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          {!isAuthenticated ? (
            <GlassCard glow="blue" className="p-8 max-w-md mx-auto text-center border border-white/20">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Connect Microsoft</h3>
              <p className="text-sm text-gray-400 mb-8">Securely link your account to allow Jarvis to automate your digital life.</p>
              
              <Button onClick={handleLogin} size="lg" className="w-full font-bold shadow-blue-500/30 shadow-lg group">
                <LogIn className="w-5 h-5 mr-2 group-hover:translate-x-[-2px] transition-transform" />
                Continue with Microsoft
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </GlassCard>
          ) : (
            <Button onClick={handleGoToChat} size="lg" className="font-bold shadow-blue-500/30 shadow-lg group">
              Launch Jarvis
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          )}
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, idx) => (
            <motion.div key={idx} variants={itemVariants}>
              <GlassCard 
                glow="none" 
                className="p-6 h-full hover:bg-white/10 transition-colors cursor-default border-white/5"
              >
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h4 className="text-lg font-semibold mb-2">{feature.title}</h4>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 text-center text-gray-500 text-sm mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
          <p className="mb-4 md:mb-0">© 2026 Jarvis AI Assistant. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-white transition-colors cursor-pointer">FastAPI</span>
            <span className="hover:text-white transition-colors cursor-pointer">LangGraph</span>
            <span className="hover:text-white transition-colors cursor-pointer">React</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
