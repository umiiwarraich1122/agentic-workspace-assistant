import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, MapPin, RefreshCw, Trash2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { googleService, api } from '../services/api';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { MiniCalendar } from '../components/ui/MiniCalendar';

export function CalendarModule() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [targetEvent, setTargetEvent] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCalendarEvents = () => {
    if (user?.userId) {
      setLoading(true);
      googleService.getCalendar(user.userId)
        .then(data => {
          if (Array.isArray(data)) setEvents(data);
          else setEvents([]);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, [user]);

  const openDeleteModal = (ev: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetEvent(ev);
  };

  const handleConfirmDelete = async () => {
    if (!user?.userId || !targetEvent?.id) return;
    setIsDeleting(true);
    try {
      const response = await api.delete(`/calendar/${targetEvent.id}`, {
        headers: { 'X-User-Id': user.userId }
      });
      // Backend might return 200 with an error embedded if it swallowed it, but we'll check for success
      if (response.data?.status === "error") {
        throw new Error(response.data.message || "Failed to delete");
      }
      setEvents(prev => prev.filter(ev => ev.id !== targetEvent.id));
    } catch (err: any) {
      console.error("Failed to delete event:", err);
      const errorMessage = err.response?.data?.detail || err.message || "Unknown error";
      alert(`Could not delete event: ${errorMessage}\n\nNote: If this is a recurring birthday from Google Contacts or a read-only event, Google does not allow deleting it from this interface.`);
    } finally {
      setIsDeleting(false);
      setTargetEvent(null);
    }
  };

  const parseEventDate = (ev: any) => {
    const raw = ev.date || ev.start_time || ev.start?.dateTime || ev.start?.date;
    if (!raw) return { day: '1', month: 'JAN' };
    try {
      const dt = new Date(raw);
      if (isNaN(dt.getTime())) {
        const parts = raw.split('-');
        if (parts.length >= 3) {
          const monthIndex = parseInt(parts[1], 10) - 1;
          const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
          return { day: parseInt(parts[2], 10).toString(), month: months[monthIndex] || 'JAN' };
        }
        return { day: '1', month: 'JAN' };
      }
      return {
        day: dt.getDate().toString(),
        month: dt.toLocaleString('default', { month: 'short' }).toUpperCase()
      };
    } catch {
      return { day: '1', month: 'JAN' };
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden relative z-10 w-full max-w-4xl mx-auto">
      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!targetEvent}
        title="Delete Calendar Event"
        message={`Are you sure you want to delete "${targetEvent?.subject || 'this event'}" from your Google Calendar?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTargetEvent(null)}
        loading={isDeleting}
      />

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/chat')}
            className="p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors cursor-pointer flex-shrink-0"
            title="Back to Chat"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="p-3 bg-cyan-500/20 rounded-xl border border-cyan-500/30 flex-shrink-0">
            <CalendarIcon className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-mono text-white tracking-widest uppercase">Chronos Link</h1>
            <p className="text-sm text-cyan-400/60 font-mono">Synchronized with Google Calendar</p>
          </div>
        </div>
        <button 
          onClick={fetchCalendarEvents}
          className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-900/40 transition-colors text-cyan-400 cursor-pointer"
          title="Refresh Events"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden pb-12">
        <MiniCalendar events={events} />

        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center text-gray-500 font-mono mt-10 p-12 bg-gray-950/40 rounded-2xl border border-white/5">
              No upcoming events found in timeline.
            </div>
          ) : (
            events.map((ev, idx) => {
              const { day, month } = parseEventDate(ev);
              return (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={idx}
                  className="flex items-center gap-6 p-6 rounded-2xl bg-gray-950/60 backdrop-blur-md border border-cyan-900/30 hover:border-cyan-500/40 hover:bg-cyan-950/40 transition-all group shadow-lg relative"
                >
                  <div className="flex flex-col items-center justify-center w-20 flex-shrink-0 border-r border-cyan-900/50 pr-6">
                    <span className="text-3xl font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                      {day}
                    </span>
                    <span className="text-xs font-mono text-cyan-500 uppercase tracking-widest">
                      {month}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-100 mb-2 truncate">{ev.subject || 'Untitled Event'}</h3>
                    <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-500" />
                        <span>{ev.time || 'All Day'}</span>
                      </div>
                      {ev.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-purple-400" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manual Delete Button */}
                  <button
                    onClick={(e) => openDeleteModal(ev, e)}
                    className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 hover:bg-red-900/50 hover:border-red-400 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
                    title="Delete Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
