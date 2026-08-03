// OfficeTaskEngine.ts  — fast, event-driven, cancellable

export type Department = 'gmail' | 'calendar' | 'tasks' | 'browser' | 'files' | 'neural';
export type AgentState = 'idle' | 'standing' | 'walking_to_dept' | 'working' | 'celebrating' | 'walking_back' | 'sitting';
export type AgentId = 'cipher' | 'nexus' | 'echo';

export interface Agent {
  id: AgentId;
  name: string;
  color: string;
  glowColor: string;
  state: AgentState;
  currentDept: Department | null;
  deskPosition: { x: number; y: number };
}

export interface OfficeTask {
  id: string;
  prompt: string;
  department: Department;
  agentId: AgentId | null;
  status: 'queued' | 'in_progress' | 'done';
  progressSteps: string[];
  currentStep: number;
}

export type OfficeEvent =
  | { type: 'TASK_QUEUED'; task: OfficeTask }
  | { type: 'AGENT_ASSIGNED'; taskId: string; agentId: AgentId }
  | { type: 'AGENT_STANDING'; agentId: AgentId }
  | { type: 'AGENT_WALKING'; agentId: AgentId; destination: Department }
  | { type: 'AGENT_WORKING'; agentId: AgentId; dept: Department }
  | { type: 'PROGRESS_STEP'; agentId: AgentId; step: string }
  | { type: 'AGENT_CELEBRATING'; agentId: AgentId }
  | { type: 'AGENT_RETURNING'; agentId: AgentId }
  | { type: 'TASK_COMPLETE'; taskId: string; agentId: AgentId }
  | { type: 'QUEUE_WAITING'; taskId: string };

type Listener = (event: OfficeEvent) => void;

const DEPT_KEYWORDS: Record<Department, string[]> = {
  gmail:    ['email', 'mail', 'gmail', 'inbox', 'message', 'send', 'draft', 'unread', 'compose'],
  calendar: ['schedule', 'meeting', 'calendar', 'appointment', 'event', 'tomorrow', 'book', 'plan'],
  tasks:    ['task', 'todo', 'directive', 'checklist', 'reminder', 'finalize', 'roadmap', 'create task', 'add task'],
  browser:  ['search', 'research', 'find', 'lookup', 'browse', 'web', 'internet', 'livekit'],
  files:    ['file', 'document', 'upload', 'storage', 'folder', 'download', 'save', 'pdf'],
  neural:   ['ai', 'model', 'neural', 'train', 'analyze', 'process', 'summarize', 'generate'],
};

const DEPT_PROGRESS: Record<Department, string[]> = {
  gmail:    ['Connecting to Gmail...', 'Authenticating...', 'Fetching inbox...', 'Filtering emails...', 'Processing results...'],
  calendar: ['Opening Calendar...', 'Checking availability...', 'Scheduling event...', 'Sending invites...', 'Confirming...'],
  tasks:    ['Opening Tasks...', 'Parsing directive...', 'Creating entries...', 'Updating board...', 'Saving...'],
  browser:  ['Opening Browser...', 'Searching web...', 'Scanning pages...', 'Extracting data...', 'Compiling...'],
  files:    ['Opening Files...', 'Scanning dirs...', 'Indexing...', 'Processing...', 'Organizing...'],
  neural:   ['Activating Core...', 'Loading model...', 'Processing...', 'Generating...', 'Finalizing...'],
};

export function classifyDepartment(prompt: string): Department {
  const lower = prompt.toLowerCase();
  let bestDept: Department = 'neural';
  let bestScore = 0;
  for (const [dept, keywords] of Object.entries(DEPT_KEYWORDS) as [Department, string[]][]) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) { bestScore = score; bestDept = dept; }
  }
  return bestDept;
}

class OfficeTaskEngineClass {
  private listeners: Listener[] = [];
  private agents: Record<AgentId, Agent> = {
    cipher: { id: 'cipher', name: 'Agent Cipher', color: '#06b6d4', glowColor: 'rgba(6,182,212,0.6)', state: 'idle', currentDept: null, deskPosition: { x: 18, y: 68 } },
    nexus:  { id: 'nexus',  name: 'Agent Nexus',  color: '#a855f7', glowColor: 'rgba(168,85,247,0.6)', state: 'idle', currentDept: null, deskPosition: { x: 50, y: 68 } },
    echo:   { id: 'echo',   name: 'Agent Echo',   color: '#10b981', glowColor: 'rgba(16,185,129,0.6)', state: 'idle', currentDept: null, deskPosition: { x: 82, y: 68 } },
  };
  private taskQueue: OfficeTask[] = [];
  private activeTasks = new Map<AgentId, string>();
  // Track per-agent cancellation tokens
  private cancelTokens = new Map<AgentId, boolean>();

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private emit(event: OfficeEvent) { this.listeners.forEach(l => l(event)); }

  getAgents(): Record<AgentId, Agent> { return { ...this.agents }; }

  private getAvailableAgent(): AgentId | null {
    // Priority: cipher → nexus → echo (so all 3 can be used for parallel tasks)
    for (const id of (['cipher', 'nexus', 'echo'] as AgentId[])) {
      if (!this.activeTasks.has(id)) return id;
    }
    return null;
  }

  async dispatchTask(prompt: string): Promise<void> {
    const dept = classifyDepartment(prompt);
    const task: OfficeTask = {
      id: crypto.randomUUID(), prompt, department: dept, agentId: null,
      status: 'queued', progressSteps: DEPT_PROGRESS[dept], currentStep: 0,
    };
    const agentId = this.getAvailableAgent();
    if (!agentId) {
      this.taskQueue.push(task);
      this.emit({ type: 'QUEUE_WAITING', taskId: task.id });
      return;
    }
    this.emit({ type: 'TASK_QUEUED', task });
    this.runAgentTask(agentId, task);
  }

  private async runAgentTask(agentId: AgentId, task: OfficeTask) {
    task.agentId = agentId;
    task.status = 'in_progress';
    this.activeTasks.set(agentId, task.id);
    this.cancelTokens.set(agentId, false);

    // ── Stand up (fast)
    this.agents[agentId].state = 'standing';
    this.emit({ type: 'AGENT_ASSIGNED', taskId: task.id, agentId });
    await delay(250);
    if (this.cancelTokens.get(agentId)) return;

    // ── Walk to department (fast)
    this.agents[agentId].state = 'walking_to_dept';
    this.agents[agentId].currentDept = task.department;
    this.emit({ type: 'AGENT_WALKING', agentId, destination: task.department });
    await delay(900);
    if (this.cancelTokens.get(agentId)) return;

    // ── Working + cycling progress steps until cancelled
    this.agents[agentId].state = 'working';
    this.emit({ type: 'AGENT_WORKING', agentId, dept: task.department });

    // Cycle steps quickly, and keep looping until onTaskComplete() is called
    let stepIdx = 0;
    while (!this.cancelTokens.get(agentId)) {
      const step = task.progressSteps[stepIdx % task.progressSteps.length];
      this.emit({ type: 'PROGRESS_STEP', agentId, step });
      await delay(380);
      stepIdx++;
    }
  }

  /** Called when the backend response arrives — immediately transitions agent out */
  async onTaskComplete(agentId: AgentId) {
    // Cancel the cycling loop instantly
    this.cancelTokens.set(agentId, true);
    await delay(80); // let the loop exit

    this.agents[agentId].state = 'celebrating';
    this.emit({ type: 'AGENT_CELEBRATING', agentId });
    await delay(500);

    this.agents[agentId].state = 'walking_back';
    this.emit({ type: 'AGENT_RETURNING', agentId });
    await delay(900);

    this.agents[agentId].state = 'sitting';
    this.agents[agentId].currentDept = null;
    const taskId = this.activeTasks.get(agentId) || '';
    this.activeTasks.delete(agentId);
    this.cancelTokens.delete(agentId);
    this.emit({ type: 'TASK_COMPLETE', taskId, agentId });
    await delay(300);
    this.agents[agentId].state = 'idle';

    // Process queue
    if (this.taskQueue.length > 0) {
      const next = this.taskQueue.shift()!;
      this.runAgentTask(agentId, next);
    }
  }
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export const OfficeTaskEngine = new OfficeTaskEngineClass();
