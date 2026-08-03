import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OfficeTaskEngine, type AgentId, type Department, type OfficeEvent } from './OfficeTaskEngine';
import { AgentCharacter, DEPT_POSITIONS, DESK_POSITIONS } from './AgentCharacter';

interface AgentDisplayState {
  id: AgentId;
  name: string;
  color: string;
  glowColor: string;
  state: import('./OfficeTaskEngine').AgentState;
  currentDept: Department | null;
  progressStep: string;
}

interface QueueEntry { taskId: string; prompt: string }

const FLOOR_GRID = Array.from({ length: 6 });

export function AIOfficeScene({ isThinking }: { isThinking: boolean }) {
  const [agents, setAgents] = useState<Record<AgentId, AgentDisplayState>>({
    cipher: { id: 'cipher', name: 'Agent Cipher', color: '#06b6d4', glowColor: 'rgba(6,182,212,0.6)', state: 'idle', currentDept: null, progressStep: '' },
    nexus:  { id: 'nexus',  name: 'Agent Nexus',  color: '#a855f7', glowColor: 'rgba(168,85,247,0.6)', state: 'idle', currentDept: null, progressStep: '' },
    echo:   { id: 'echo',   name: 'Agent Echo',   color: '#10b981', glowColor: 'rgba(16,185,129,0.6)', state: 'idle', currentDept: null, progressStep: '' },
  });
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [activeDept, setActiveDept] = useState<Record<Department, { agentId: AgentId; step: string } | null>>({
    gmail: null, calendar: null, tasks: null, browser: null, files: null, neural: null,
  });
  const [logLines, setLogLines] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const pushLog = (line: string) => {
    setLogLines(prev => [...prev.slice(-8), line]);
  };

  useEffect(() => {
    const unsub = OfficeTaskEngine.subscribe((event: OfficeEvent) => {
      switch (event.type) {
        case 'TASK_QUEUED':
          pushLog(`📋 New directive: "${event.task.prompt.slice(0, 30)}..."`);
          break;
        case 'AGENT_ASSIGNED':
          setAgents(prev => ({ ...prev, [event.agentId]: { ...prev[event.agentId], state: 'standing' } }));
          pushLog(`🤖 ${event.agentId.toUpperCase()} assigned to task`);
          break;
        case 'AGENT_STANDING':
          setAgents(prev => ({ ...prev, [event.agentId]: { ...prev[event.agentId], state: 'standing' } }));
          break;
        case 'AGENT_WALKING':
          setAgents(prev => ({ ...prev, [event.agentId]: { ...prev[event.agentId], state: 'walking_to_dept', currentDept: event.destination } }));
          pushLog(`🚶 ${event.agentId.toUpperCase()} walking to ${event.destination.toUpperCase()}`);
          break;
        case 'AGENT_WORKING':
          setAgents(prev => ({ ...prev, [event.agentId]: { ...prev[event.agentId], state: 'working' } }));
          setActiveDept(prev => ({ ...prev, [event.dept]: { agentId: event.agentId, step: '' } }));
          pushLog(`💻 ${event.agentId.toUpperCase()} working in ${event.dept.toUpperCase()}`);
          break;
        case 'PROGRESS_STEP':
          setAgents(prev => ({ ...prev, [event.agentId]: { ...prev[event.agentId], progressStep: event.step } }));
          const agentDept = agents[event.agentId]?.currentDept;
          if (agentDept) {
            setActiveDept(prev => ({ ...prev, [agentDept]: { agentId: event.agentId, step: event.step } }));
          }
          pushLog(`⚡ ${event.step}`);
          break;
        case 'AGENT_CELEBRATING':
          setAgents(prev => ({ ...prev, [event.agentId]: { ...prev[event.agentId], state: 'celebrating', progressStep: '' } }));
          pushLog(`🎉 ${event.agentId.toUpperCase()} task complete!`);
          break;
        case 'AGENT_RETURNING':
          setAgents(prev => ({ ...prev, [event.agentId]: { ...prev[event.agentId], state: 'walking_back' } }));
          // Clear dept
          const returningDept = agents[event.agentId]?.currentDept;
          if (returningDept) setActiveDept(prev => ({ ...prev, [returningDept]: null }));
          break;
        case 'TASK_COMPLETE':
          setAgents(prev => ({ ...prev, [event.agentId]: { ...prev[event.agentId], state: 'idle', currentDept: null, progressStep: '' } }));
          break;
        case 'QUEUE_WAITING':
          pushLog(`⏳ All agents busy. Task queued...`);
          break;
      }
    });
    return unsub;
  }, [agents]);

  // Auto-scroll log
  useEffect(() => { logRef.current?.scrollTo(0, logRef.current.scrollHeight); }, [logLines]);

  const DEPT_META: Record<Department, { label: string; icon: string; color: string; glow: string; pos: { top: string; left: string; w: string } }> = {
    gmail:    { label: 'Gmail',    icon: '📧', color: '#ea4335', glow: 'rgba(234,67,53,0.5)',   pos: { top: '8%',  left: '2%',  w: '13%' } },
    calendar: { label: 'Calendar', icon: '📅', color: '#a855f7', glow: 'rgba(168,85,247,0.5)', pos: { top: '8%',  left: '17%', w: '13%' } },
    tasks:    { label: 'Tasks',    icon: '✅', color: '#10b981', glow: 'rgba(16,185,129,0.5)', pos: { top: '8%',  left: '32%', w: '13%' } },
    browser:  { label: 'Browser',  icon: '🌐', color: '#06b6d4', glow: 'rgba(6,182,212,0.5)',  pos: { top: '8%',  left: '47%', w: '13%' } },
    files:    { label: 'Files',    icon: '🗂️', color: '#f59e0b', glow: 'rgba(245,158,11,0.5)', pos: { top: '8%',  left: '62%', w: '13%' } },
    neural:   { label: 'Neural Core', icon: '🧠', color: '#8b5cf6', glow: 'rgba(139,92,246,0.5)', pos: { top: '8%', left: '77%', w: '20%' } },
  };

  return (
    <div className="w-full flex flex-col gap-2">
      {/* ─── Office Header ─── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ boxShadow: isThinking ? ['0 0 8px #06b6d4', '0 0 20px #06b6d4', '0 0 8px #06b6d4'] : [] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="w-2 h-2 rounded-full bg-cyan-400"
          />
          <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-[0.25em] uppercase">Jarvis AI Company — Floor 1</span>
        </div>
        <div className="flex gap-2 items-center">
          {isThinking && (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-[9px] font-mono text-yellow-400 tracking-widest uppercase"
            >
              ● PROCESSING
            </motion.span>
          )}
          <span className="text-[9px] font-mono text-gray-500">Agents Online: 3</span>
        </div>
      </div>

      {/* ─── Main Office Floor ─── */}
      <div
        className="relative w-full mx-auto overflow-hidden rounded-2xl border border-cyan-900/30 bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900"
        style={{ height: 240, background: 'linear-gradient(180deg, #050b18 0%, #07101f 60%, #0a1628 100%)' }}
      >
        {/* Grid floor lines */}
        {FLOOR_GRID.map((_, i) => (
          <div key={i} className="absolute bottom-0 w-full border-t border-cyan-900/10"
            style={{ bottom: `${i * 16}%` }} />
        ))}
        {FLOOR_GRID.map((_, i) => (
          <div key={i} className="absolute top-0 h-full border-l border-cyan-900/10"
            style={{ left: `${i * 18}%` }} />
        ))}

        {/* Ceiling ambient light strip */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

        {/* ─── Department Rooms ─── */}
        {(Object.entries(DEPT_META) as [Department, typeof DEPT_META[Department]][]).map(([dept, meta]) => {
          const deptActive = activeDept[dept];
          return (
            <motion.div
              key={dept}
              animate={deptActive ? {
                boxShadow: [`0 0 10px ${meta.glow}`, `0 0 28px ${meta.glow}`, `0 0 10px ${meta.glow}`],
                borderColor: meta.color,
              } : {}}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="absolute flex flex-col rounded-lg border overflow-hidden"
              style={{
                top: meta.pos.top,
                left: meta.pos.left,
                width: meta.pos.w,
                height: '32%',
                background: deptActive ? `${meta.color}18` : 'rgba(10,15,30,0.8)',
                borderColor: deptActive ? meta.color : `${meta.color}44`,
              }}
            >
              {/* Room label */}
              <div className="flex items-center gap-1 px-1.5 py-0.5 border-b" style={{ borderColor: `${meta.color}33` }}>
                <span className="text-[11px]">{meta.icon}</span>
                <span className="text-[7px] font-mono font-bold uppercase tracking-widest" style={{ color: meta.color }}>
                  {meta.label}
                </span>
                {deptActive && (
                  <motion.div animate={{ scale: [1,1.6,1] }} transition={{ repeat: Infinity, duration: 0.7 }}
                    className="ml-auto w-1 h-1 rounded-full" style={{ background: meta.color }} />
                )}
              </div>

              {/* Room interior */}
              <div className="flex-1 p-1 text-[18px] flex items-center justify-center opacity-40">
                {dept === 'gmail' && '✉️'}
                {dept === 'calendar' && <div className="grid grid-cols-4 gap-0.5">{Array.from({length:8}).map((_,i)=><div key={i} className="w-2 h-2 rounded-sm" style={{background: deptActive && i===5 ? meta.color : '#ffffff15'}}/>)}</div>}
                {dept === 'tasks' && '📋'}
                {dept === 'browser' && '🌐'}
                {dept === 'files' && '📁'}
                {dept === 'neural' && <motion.span animate={{rotate:360}} transition={{repeat:Infinity,duration:4,ease:'linear'}}>🧠</motion.span>}
              </div>

              {/* Progress label */}
              <AnimatePresence>
                {deptActive?.step && (
                  <motion.div
                    key={deptActive.step}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="px-1 pb-1 text-center"
                  >
                    <span className="text-[6px] font-mono" style={{ color: meta.color }}>{deptActive.step}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* ─── Office floor label ─── */}
        <div className="absolute bottom-12 left-0 right-0 text-center">
          <span className="text-[8px] font-mono text-gray-700 tracking-[0.4em] uppercase">— Office Floor —</span>
        </div>

        {/* ─── Desk areas ─── */}
        {(['cipher', 'nexus', 'echo'] as AgentId[]).map((id, i) => {
          const left = [14, 48, 82][i];
          const agent = agents[id];
          const isAtDesk = agent.state === 'idle' || agent.state === 'sitting';
          return (
            <div key={id} className="absolute" style={{ left: `${left}%`, bottom: '20%', transform: 'translateX(-50%)' }}>
              {/* Desk */}
              <div className="w-10 h-4 rounded border flex items-center justify-center"
                style={{
                  background: isAtDesk ? `${agent.color}22` : 'rgba(255,255,255,0.04)',
                  borderColor: isAtDesk ? `${agent.color}88` : 'rgba(255,255,255,0.08)',
                  boxShadow: isAtDesk ? `0 0 8px ${agent.glowColor}` : 'none',
                }}>
                <span className="text-[9px]">🖥️</span>
              </div>
              {/* Chair */}
              <div className="w-6 h-2 mx-auto mt-0.5 rounded-full" style={{ background: `${agent.color}33` }} />
            </div>
          );
        })}

        {/* ─── SVG Footprint Trails ─── */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.2))' }}>
          {(Object.values(agents) as AgentDisplayState[]).map(agent => {
            if ((agent.state === 'walking_to_dept' || agent.state === 'working' || agent.state === 'celebrating' || agent.state === 'walking_back') && agent.currentDept) {
              const start = DESK_POSITIONS[agent.id];
              const end = DEPT_POSITIONS[agent.currentDept];
              // For walking back, swap start/end visually or just keep the line
              // Actually, a dashed line with a stroke dash array animation looks like ants/footsteps.
              return (
                <motion.line
                  key={agent.id + agent.currentDept}
                  x1={`${start.x}%`} y1={`${start.y}%`}
                  x2={`${end.x}%`} y2={`${end.y + 8}%`} // +8 to attach to bottom of dept box
                  stroke={agent.color}
                  strokeWidth="2"
                  strokeDasharray="4 6"
                  strokeLinecap="round"
                  initial={{ opacity: 0, pathLength: 0 }}
                  animate={{ opacity: 0.4, pathLength: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
              );
            }
            return null;
          })}
        </svg>

        {/* ─── Agent Characters ─── */}
        {(Object.values(agents) as AgentDisplayState[]).map(agent => (
          <AgentCharacter
            key={agent.id}
            id={agent.id}
            name={agent.name}
            color={agent.color}
            glowColor={agent.glowColor}
            state={agent.state}
            currentDept={agent.currentDept}
            progressStep={agent.progressStep}
          />
        ))}

        {/* ─── Queue badge ─── */}
        <AnimatePresence>
          {queue.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-2 right-2 px-2 py-0.5 rounded-full border border-yellow-500/50 bg-yellow-950/60 text-[8px] font-mono text-yellow-400"
            >
              ⏳ Queue: {queue.length}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Activity Log ─── */}
      <div
        ref={logRef}
        className="w-full px-4 py-2 h-14 overflow-y-auto scrollbar-hide rounded-xl border border-cyan-900/20 bg-transparent flex flex-col gap-0.5"
      >
        <div className="text-[8px] font-mono text-cyan-700 uppercase tracking-widest mb-0.5">// Activity Log</div>
        <AnimatePresence initial={false}>
          {logLines.map((line, i) => (
            <motion.div
              key={`${i}-${line}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: i === logLines.length - 1 ? 1 : 0.4, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-[9px] font-mono text-cyan-300 leading-tight"
            >
              {line}
            </motion.div>
          ))}
        </AnimatePresence>
        {logLines.length === 0 && (
          <div className="text-[9px] font-mono text-gray-700">Awaiting directives...</div>
        )}
      </div>

      {/* ─── Agent status strip ─── */}
      <div className="flex gap-2 px-4 pb-2">
        {(Object.values(agents) as AgentDisplayState[]).map(agent => (
          <div key={agent.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg border flex-1"
            style={{ borderColor: `${agent.color}33`, background: `${agent.color}11` }}>
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: agent.color, boxShadow: `0 0 4px ${agent.glowColor}` }}
            />
            <span className="text-[8px] font-mono font-bold uppercase tracking-widest" style={{ color: agent.color }}>
              {agent.name.split(' ')[1]}
            </span>
            <span className="ml-auto text-[7px] font-mono text-gray-500 capitalize">{agent.state.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
