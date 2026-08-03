import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Department, AgentId } from './OfficeTaskEngine';

interface DeptProps {
  activeAgents: Partial<Record<AgentId, { progressStep: string; working: boolean }>>;
}

interface RoomProps {
  id: Department;
  label: string;
  icon: string;
  accentColor: string;
  glowColor: string;
  decorations: React.ReactNode;
  activeAgent?: { progressStep: string; working: boolean };
}

function Room({ label, icon, accentColor, glowColor, decorations, activeAgent }: RoomProps) {
  const isActive = activeAgent?.working;

  return (
    <motion.div
      animate={isActive ? { boxShadow: [`0 0 12px ${glowColor}`, `0 0 30px ${glowColor}`, `0 0 12px ${glowColor}`] } : {}}
      transition={{ repeat: Infinity, duration: 1.4 }}
      className="relative flex flex-col rounded-xl border backdrop-blur-md overflow-hidden"
      style={{
        background: isActive ? `${accentColor}18` : 'rgba(10,15,30,0.7)',
        borderColor: isActive ? accentColor : `${accentColor}44`,
        minHeight: '90px',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b" style={{ borderColor: `${accentColor}33` }}>
        <span className="text-sm">{icon}</span>
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest" style={{ color: accentColor }}>{label}</span>
        {isActive && (
          <motion.div
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="ml-auto w-1.5 h-1.5 rounded-full"
            style={{ background: accentColor }}
          />
        )}
      </div>

      {/* Room decorations */}
      <div className="flex-1 p-1.5 relative overflow-hidden">
        {decorations}

        {/* Active overlay with progress */}
        <AnimatePresence>
          {isActive && activeAgent?.progressStep && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-end justify-center pb-1"
            >
              <motion.div
                key={activeAgent.progressStep}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[8px] font-mono px-1.5 py-0.5 rounded-full border"
                style={{ color: accentColor, borderColor: accentColor, background: 'rgba(0,0,0,0.9)' }}
              >
                {activeAgent.progressStep}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Room decorations ──────────────────────────────────────────────────────────

function GmailDecorations({ active }: { active?: boolean }) {
  return (
    <div className="relative w-full h-full flex flex-col gap-1">
      {/* Email shelves */}
      {[0,1,2].map(i => (
        <div key={i} className="flex gap-1 items-center">
          <div className="w-4 h-1.5 rounded-sm" style={{ background: i === 0 ? '#ea433566' : '#ffffff22' }} />
          <div className="flex-1 h-0.5 rounded" style={{ background: '#ffffff11' }} />
        </div>
      ))}
      {/* Floating envelopes when active */}
      {active && [0,1,2].map(i => (
        <motion.div
          key={i}
          initial={{ x: -5, y: 10, opacity: 0 }}
          animate={{ x: [0, 12, 20], y: [-i*6, -i*10, -i*16], opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.4 }}
          className="absolute text-[10px]"
          style={{ bottom: i * 8, left: 4 }}
        >
          ✉️
        </motion.div>
      ))}
    </div>
  );
}

function CalendarDecorations({ active }: { active?: boolean }) {
  return (
    <div className="flex flex-col gap-1 w-full h-full">
      {/* Tiny calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="w-full aspect-square rounded-sm"
            style={{ background: active && i === 7 ? '#a855f7' : '#ffffff15' }} />
        ))}
      </div>
      {active && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="h-0.5 rounded w-full"
          style={{ background: '#a855f7', transformOrigin: 'left' }}
        />
      )}
    </div>
  );
}

function TasksDecorations({ active }: { active?: boolean }) {
  return (
    <div className="flex gap-1 w-full h-full">
      {['Todo', 'Doing', 'Done'].map((col, ci) => (
        <div key={col} className="flex-1 flex flex-col gap-0.5">
          <div className="text-[7px] font-mono font-bold uppercase mb-0.5" style={{ color: ['#ef4444','#f59e0b','#10b981'][ci] + '99' }}>{col}</div>
          {Array.from({ length: 2 }).map((_, i) => (
            <motion.div
              key={i}
              animate={active && ci === 1 ? { opacity: [0.5, 1, 0.5] } : {}}
              transition={{ repeat: Infinity, duration: 1 }}
              className="h-2 rounded-sm w-full"
              style={{ background: active ? `${['#ef4444','#f59e0b','#10b981'][ci]}44` : '#ffffff15' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function BrowserDecorations({ active }: { active?: boolean }) {
  return (
    <div className="flex flex-col gap-1 w-full h-full">
      <div className="w-full h-2 rounded border" style={{ borderColor: '#06b6d455', background: '#06b6d411' }}>
        <motion.div
          animate={active ? { width: ['0%', '80%'] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="h-full rounded"
          style={{ background: '#06b6d4' }}
        />
      </div>
      {[1,2,3].map(i => (
        <div key={i} className="flex gap-1 items-center">
          <div className="w-2 h-1.5 rounded-sm" style={{ background: '#06b6d433' }} />
          <div className="flex-1 h-0.5 rounded" style={{ background: '#ffffff11' }} />
        </div>
      ))}
    </div>
  );
}

function FilesDecorations({ active }: { active?: boolean }) {
  return (
    <div className="flex gap-1.5 items-end w-full h-full">
      {['📁','📂','🗂️'].map((ic, i) => (
        <motion.div
          key={i}
          animate={active ? { y: [-2, 0] } : {}}
          transition={{ delay: i * 0.2, repeat: Infinity, duration: 0.8, repeatType: 'mirror' }}
          className="text-lg"
        >
          {ic}
        </motion.div>
      ))}
    </div>
  );
}

function NeuralDecorations({ active }: { active?: boolean }) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <motion.div
        animate={active ? { scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] } : { rotate: 360 }}
        transition={active ? { repeat: Infinity, duration: 0.8 } : { repeat: Infinity, duration: 6, ease: 'linear' }}
        className="text-2xl"
      >
        🧠
      </motion.div>
    </div>
  );
}

// ─── Main DepartmentRooms component ───────────────────────────────────────────

export function DepartmentRooms({ activeAgents }: DeptProps) {
  const getAgent = (dept: Department) => {
    for (const [, info] of Object.entries(activeAgents)) {
      if (info) return info;
    }
    return undefined;
  };

  const rooms: Array<{ id: Department; label: string; icon: string; accentColor: string; glowColor: string; decorations: React.ReactNode }> = [
    {
      id: 'gmail', label: 'Gmail', icon: '📧', accentColor: '#ea4335', glowColor: 'rgba(234,67,53,0.5)',
      decorations: <GmailDecorations active={!!activeAgents.cipher?.working || !!activeAgents.nexus?.working || !!activeAgents.echo?.working} />,
    },
    {
      id: 'calendar', label: 'Calendar', icon: '📅', accentColor: '#a855f7', glowColor: 'rgba(168,85,247,0.5)',
      decorations: <CalendarDecorations active={false} />,
    },
    {
      id: 'tasks', label: 'Tasks', icon: '✅', accentColor: '#10b981', glowColor: 'rgba(16,185,129,0.5)',
      decorations: <TasksDecorations active={false} />,
    },
    {
      id: 'browser', label: 'Browser', icon: '🌐', accentColor: '#06b6d4', glowColor: 'rgba(6,182,212,0.5)',
      decorations: <BrowserDecorations active={false} />,
    },
    {
      id: 'files', label: 'Files', icon: '🗂️', accentColor: '#f59e0b', glowColor: 'rgba(245,158,11,0.5)',
      decorations: <FilesDecorations active={false} />,
    }
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full px-3">
      {rooms.map(room => {
        // Find if any agent is working in this department
        const agentWorking = Object.values(activeAgents).find(a => a?.working);
        return (
          <Room
            key={room.id}
            id={room.id}
            label={room.label}
            icon={room.icon}
            accentColor={room.accentColor}
            glowColor={room.glowColor}
            decorations={room.decorations}
            activeAgent={undefined}
          />
        );
      })}
    </div>
  );
}
