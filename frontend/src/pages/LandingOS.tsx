import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GlobalEnvironment } from '../components/os/GlobalEnvironment';
import { AICore } from '../components/os/AICore';
import { GlowingButton } from '../components/ui/GlowingButton';
import { BootLoader } from '../components/os/BootLoader';
import { useAuth } from '../context/AuthContext';
import { TodayCalendarWidget, UnreadEmailsWidget } from '../components/widgets/DashboardWidgets';

gsap.registerPlugin(ScrollTrigger);

export function LandingOS() {
  const [booting, setBooting] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const timelineRef = useRef<HTMLDivElement>(null);

  // Auto navigate to Command Center if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (booting) return;

    if (timelineRef.current) {
      const elements = timelineRef.current.querySelectorAll('.timeline-item');
      elements.forEach((el, index) => {
        gsap.fromTo(el, 
          { opacity: 0, x: -50, filter: 'blur(10px)' },
          { 
            opacity: 1, 
            x: 0, 
            filter: 'blur(0px)',
            duration: 1, 
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
            }
          }
        );
      });
    }
  }, [booting]);

  const handleGoogleLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    import('../services/api').then(({ api }) => {
      window.location.assign(`${api.defaults.baseURL}/auth/login`);
    });
  };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const userEmail = email.trim() || "umiiwarraich@gmail.com";
    login(userEmail);
    navigate('/chat');
  };

  const handleGoToOS = () => {
    navigate('/chat');
  };

  return (
    <>
      {booting && <BootLoader onComplete={() => setBooting(false)} />}
      
      {!booting && (
        <div className="min-h-screen text-white font-sans selection:bg-cyan-500/30">
          <GlobalEnvironment />

          {/* Hero Section */}
          <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="mb-8"
            >
              <AICore />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              className="text-center z-10 max-w-xl mx-auto"
            >
              <h1 className="text-4xl sm:text-6xl font-bold tracking-widest mb-4 uppercase">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-cyan-500">
                  Jarvis OS
                </span>
              </h1>
              <p className="text-gray-400 text-sm sm:text-lg max-w-xl mx-auto mb-8 font-mono">
                Advanced AI Operating System. Integrated with Google Workspace & Supabase for seamless lifecycle automation.
              </p>

              {!isAuthenticated ? (
                <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
                  {/* Google OAuth Button */}
                  <GlowingButton type="button" onClick={handleGoogleLogin}>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                      <span>SIGN IN WITH GOOGLE</span>
                    </div>
                  </GlowingButton>

                  {/* Sign Up Form */}
                  <form onSubmit={handleFormLogin} className="w-full bg-cyan-950/30 border border-cyan-500/30 backdrop-blur-xl p-6 rounded-2xl space-y-4 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                    <div className="text-left">
                      <label className="text-xs font-mono text-cyan-400 block mb-1 uppercase tracking-wider">New Gmail Address</label>
                      <input 
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full bg-black/60 border border-cyan-500/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono transition-colors"
                      />
                    </div>
                    
                    <div className="text-left">
                      <label className="text-xs font-mono text-cyan-400 block mb-1 uppercase tracking-wider">Create Password</label>
                      <input 
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-black/60 border border-cyan-500/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono transition-colors"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold font-mono text-sm tracking-wider uppercase hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
                    >
                      Create Secure Account
                    </button>
                  </form>
                </div>
              ) : (
                <GlowingButton onClick={handleGoToOS}>
                  ENTER COMMAND CENTER
                </GlowingButton>
              )}
            </motion.div>

            {/* Floating Tech Chips */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 1 }}
              className="flex flex-wrap justify-center gap-4 px-4 mt-12 z-10"
            >
              {['FastAPI', 'LangGraph', 'Google Workspace', 'Gmail', 'Google Calendar', 'Google Tasks', 'Supabase'].map((tech, i) => (
                <motion.div 
                  key={tech}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                  className="px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-mono text-gray-400"
                >
                  {tech}
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* Timeline & Dashboard Preview */}
          <section className="py-32 px-4 max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Timeline */}
            <div ref={timelineRef} className="space-y-12 border-l border-cyan-900/50 pl-8 ml-4">
              {[
                { title: "Gmail Intelligence", desc: "Jarvis parses context, urgency, and action items directly from Gmail." },
                { title: "Google Calendar Automation", desc: "Conflict resolution and seamless event scheduling on Google Calendar." },
                { title: "Google Tasks Planning", desc: "Translates natural language into structured Google Tasks lists." },
                { title: "Supabase & Agentic Security", desc: "User sessions & tokens persisted with Supabase Auth & DB." }
              ].map((item, idx) => (
                <div key={idx} className="timeline-item relative">
                  <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />
                  <h3 className="text-xl font-bold text-cyan-500 mb-2">{item.title}</h3>
                  <p className="text-gray-400 font-mono text-sm">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Dashboard Preview */}
            <div className="relative flex flex-col justify-center perspective-1000">
              <motion.div 
                initial={{ rotateY: 20, opacity: 0 }}
                whileInView={{ rotateY: -10, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5 }}
                className="transform-gpu space-y-4"
              >
                <div className="absolute -inset-10 bg-cyan-500/10 rounded-[3rem] blur-3xl -z-10" />
                <TodayCalendarWidget />
                <UnreadEmailsWidget />
              </motion.div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
