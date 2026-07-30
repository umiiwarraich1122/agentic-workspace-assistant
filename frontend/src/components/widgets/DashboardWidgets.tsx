import React, { useEffect, useState } from 'react';
import { Calendar, Mail, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { googleService } from '../../services/api';

export function TodayCalendarWidget() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (user?.userId) {
      googleService.getCalendar(user.userId)
        .then(data => {
          if (Array.isArray(data)) setEvents(data.slice(0, 3));
          else setEvents([]);
        })
        .catch(() => setEvents([]))
        .finally(() => setLoading(false));
    }
  }, [user]);

  return (
    <div className="p-5 bg-gray-950/80 border border-cyan-900/30 rounded-2xl backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/50 transition-all duration-500 shadow-lg">
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-cyan-500/20 transition-all duration-700" />
      
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <h4 className="font-mono text-sm tracking-widest text-cyan-100">CALENDAR</h4>
        </div>
        {loading && <RefreshCw className="w-3 h-3 text-cyan-600 animate-spin" />}
      </div>
      
      <div className="space-y-3 relative z-10">
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-10 bg-cyan-950/40 rounded-lg"></div>
            <div className="h-10 bg-cyan-950/40 rounded-lg"></div>
          </div>
        ) : events.length > 0 ? (
          events.map((ev, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-cyan-950/20 border border-cyan-900/40">
              <div className="text-xs font-mono text-cyan-500 mt-0.5">{ev.time || 'All Day'}</div>
              <div>
                <div className="text-sm font-medium text-cyan-100 truncate w-36">{ev.subject || 'Event'}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs font-mono text-gray-500 p-3 text-center">No upcoming events today.</div>
        )}
      </div>
    </div>
  );
}

export function UnreadEmailsWidget() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<any[]>([]);

  useEffect(() => {
    if (user?.userId) {
      googleService.getEmails(user.userId)
        .then(data => {
          if (data && Array.isArray(data.emails)) setEmails(data.emails.slice(0, 4));
          else setEmails([]); 
        })
        .catch(() => setEmails([]))
        .finally(() => setLoading(false));
    }
  }, [user]);

  return (
    <div className="p-5 bg-gray-950/80 border border-blue-900/30 rounded-2xl backdrop-blur-md relative overflow-hidden group hover:border-blue-500/50 transition-all duration-500 shadow-lg">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-all duration-700" />
      
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <Mail className="w-4 h-4 text-blue-400" />
          <h4 className="font-mono text-sm tracking-widest text-blue-100">GMAIL_INBOX</h4>
        </div>
        <span className="px-2 py-0.5 rounded border border-blue-500/30 bg-blue-950/50 text-blue-400 text-[10px] font-mono shadow-[0_0_10px_rgba(59,130,246,0.2)] animate-pulse">
          {loading ? '...' : `${emails.length} TOTAL`}
        </span>
      </div>

      <div className="space-y-3 relative z-10">
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-12 bg-blue-950/40 rounded-lg"></div>
          </div>
        ) : emails.length > 0 ? (
          emails.map((em, i) => (
             <div key={i} className="flex gap-3 p-2.5 bg-blue-950/20 rounded-lg border border-blue-900/40">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-cyan-300 truncate">{em.sender || em.from || 'Unknown Sender'}</div>
                <div className="text-xs text-blue-400/80 truncate font-mono mt-0.5">{em.subject || 'No Subject'}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs font-mono text-gray-500 p-3 text-center">No emails found in Gmail.</div>
        )}
      </div>
    </div>
  );
}

export function PendingTasksWidget() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (user?.userId) {
      googleService.getTasks(user.userId)
        .then(data => {
          if (Array.isArray(data)) setTasks(data.slice(0, 4));
          else setTasks([]); 
        })
        .catch(() => setTasks([]))
        .finally(() => setLoading(false));
    }
  }, [user]);

  return (
    <div className="p-5 bg-gray-950/80 border border-purple-900/30 rounded-2xl backdrop-blur-md relative overflow-hidden group hover:border-purple-500/50 transition-all duration-500 shadow-lg">
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-500/20 transition-all duration-700" />
      
      <div className="flex items-center gap-3 mb-5 relative z-10">
        <CheckCircle2 className="w-4 h-4 text-purple-400" />
        <h4 className="font-mono text-sm tracking-widest text-purple-100">GOOGLE_TASKS</h4>
      </div>

      <div className="space-y-2 relative z-10">
        {loading ? (
          <div className="space-y-2 animate-pulse">
             <div className="h-8 bg-purple-950/40 rounded-lg"></div>
             <div className="h-8 bg-purple-950/40 rounded-lg"></div>
          </div>
        ) : tasks.length > 0 ? (
          tasks.map((t, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-purple-950/20 border border-purple-900/40">
              <div className="w-3 h-3 rounded border border-purple-500/50 flex-shrink-0" />
              <span className="text-xs text-gray-300 truncate">{t.title || 'Task'}</span>
            </div>
          ))
        ) : (
          <div className="text-xs font-mono text-gray-500 p-3 text-center">No tasks found in Google Tasks.</div>
        )}
      </div>
    </div>
  );
}
