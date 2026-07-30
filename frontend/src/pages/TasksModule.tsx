import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Circle, CheckCircle2, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { googleService, api } from '../services/api';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export function TasksModule() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [targetTask, setTargetTask] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTasks = () => {
    if (user?.userId) {
      setLoading(true);
      googleService.getTasks(user.userId)
        .then(data => {
          if (Array.isArray(data)) {
            const mapped = data.map(t => ({
              ...t,
              completed: t.status === 'completed' || t.completed === true
            }));
            setTasks(mapped);
          } else {
            setTasks([]);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const toggleTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks[index].completed = !newTasks[index].completed;
    setTasks(newTasks);
  };

  const openDeleteModal = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetTask(task);
  };

  const handleConfirmDelete = async () => {
    if (!user?.userId || !targetTask?.id) return;
    setIsDeleting(true);
    try {
      await api.delete(`/todos/${targetTask.id}`, {
        headers: { 'X-User-Id': user.userId }
      });
      setTasks(prev => prev.filter(t => t.id !== targetTask.id));
    } catch (err) {
      console.error("Failed to delete task:", err);
      // Remove locally from UI regardless
      setTasks(prev => prev.filter(t => t.id !== targetTask.id));
    } finally {
      setIsDeleting(false);
      setTargetTask(null);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden relative z-10 w-full max-w-3xl mx-auto">
      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!targetTask}
        title="Delete Directive Task"
        message={`Are you sure you want to delete "${targetTask?.title || 'this task'}" from Google Tasks?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTargetTask(null)}
        loading={isDeleting}
      />

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
            <CheckSquare className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-mono text-white tracking-widest uppercase">Directives</h1>
            <p className="text-sm text-purple-400/60 font-mono">Synchronized with Google Tasks</p>
          </div>
        </div>
        
        <button 
          onClick={fetchTasks}
          className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 hover:bg-purple-900/40 transition-colors text-purple-400 cursor-pointer"
          title="Refresh Tasks"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pb-12">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-gray-500 font-mono mt-10 p-12 bg-gray-950/40 rounded-2xl border border-white/5">
            No active directives found.
          </div>
        ) : (
          <AnimatePresence>
            {tasks.map((task, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ delay: idx * 0.05 }}
                key={idx}
                onClick={() => toggleTask(idx)}
                className={`flex items-center gap-4 p-4 rounded-xl border backdrop-blur-md cursor-pointer transition-all group ${
                  task.completed 
                    ? 'bg-gray-900/30 border-gray-800 opacity-50' 
                    : 'bg-gray-950/60 border-purple-900/40 hover:border-purple-500/40 hover:bg-purple-950/30 shadow-lg'
                }`}
              >
                <div className="flex-shrink-0">
                  {task.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-purple-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-purple-400" />
                  )}
                </div>
                
                <div className={`flex-1 min-w-0 font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                  {task.title || 'Untitled Task'}
                </div>
                
                {task.notes && !task.completed && (
                  <div className="text-xs font-mono text-purple-400/60 truncate max-w-[150px]">
                    {task.notes}
                  </div>
                )}

                {/* Manual Delete Button */}
                <button
                  onClick={(e) => openDeleteModal(task, e)}
                  className="p-2 rounded-lg bg-red-950/30 border border-red-500/30 text-red-400 hover:bg-red-900/50 hover:border-red-400 transition-all opacity-0 group-hover:opacity-100 cursor-pointer ml-2"
                  title="Delete Task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
