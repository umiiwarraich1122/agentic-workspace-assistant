import React, { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export function GlobalEnvironment() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  
  // Parallax logic
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const springConfig = { damping: 25, stiffness: 100 };
  const smoothX = useSpring(0, springConfig);
  const smoothY = useSpring(0, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Glow follow
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top = `${e.clientY}px`;
      }
      
      // Parallax calculation (-1 to 1)
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePosition({ x, y });
      smoothX.set(x);
      smoothY.set(y);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [smoothX, smoothY]);

  const backgroundX = useTransform(smoothX, [-1, 1], [-20, 20]);
  const backgroundY = useTransform(smoothY, [-1, 1], [-20, 20]);

  const gridX = useTransform(smoothX, [-1, 1], [-40, 40]);
  const gridY = useTransform(smoothY, [-1, 1], [-40, 40]);

  return (
    <div ref={containerRef} className="fixed inset-0 z-[-1] bg-gray-950 overflow-hidden pointer-events-none perspective-1000">
      {/* Deep Space Background with parallax */}
      <motion.div 
        style={{ x: backgroundX, y: backgroundY, scale: 1.1 }}
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-gray-950 to-black opacity-80" 
      />
      
      {/* Mouse Follow Glow */}
      <div 
        ref={cursorRef}
        className="absolute w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ease-out"
      />

      {/* Interactive Grid with higher parallax */}
      <motion.div 
        style={{ x: gridX, y: gridY, scale: 1.2 }}
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_50%,black_10%,transparent_80%)]" 
      />

      {/* Floating Fog/Blur Blobs */}
      <motion.div
        animate={{
          x: [0, 200, 0],
          y: [0, 100, 0],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 left-0 w-[50vw] h-[50vw] bg-purple-900/20 rounded-full blur-[150px]"
      />
      <motion.div
        animate={{
          x: [0, -200, 0],
          y: [0, -100, 0],
          opacity: [0.05, 0.15, 0.05],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-0 right-0 w-[60vw] h-[60vw] bg-blue-900/20 rounded-full blur-[150px]"
      />
    </div>
  );
}
