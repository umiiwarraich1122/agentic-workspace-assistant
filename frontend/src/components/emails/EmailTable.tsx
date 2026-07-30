import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Inbox, RefreshCw, Mail, Archive, Trash2,
  CheckSquare, Square, ChevronDown, ChevronUp,
  ChevronsUpDown, Reply, ExternalLink, ChevronLeft, ChevronRight
} from 'lucide-react';
import { googleService } from '../../services/api';
import EmailViewerModal from './EmailViewerModal';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Email {
  id: string;
  sender: string;
  senderEmail?: string;
  subject: string;
  preview?: string;
  bodyPreview?: string;
  date: string;          // internalDate (ms) OR ISO string like "2026-07-29T12:00:03Z"
  status: string | string[];
  [key: string]: unknown;
}

interface EmailTableProps {
  userId: string;
  initialEmails?: Email[];
}

type SortKey = 'sender' | 'subject' | 'date';
type SortDir = 'asc' | 'desc';

// ─── Date formatting ──────────────────────────────────────────────────────────

function formatDate(raw: string | undefined | null): string {
  if (!raw || raw === '0') return '';

  // Try numeric milliseconds first (Gmail internalDate)
  let d: Date;
  const ms = Number(raw);
  if (!isNaN(ms) && ms > 1_000_000_000_000) {
    d = new Date(ms);
  } else {
    // ISO string like "2026-07-29T12:00:03Z"
    d = new Date(raw);
  }

  if (isNaN(d.getTime())) return raw;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);

  if (d >= todayStart) {
    return `Today ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (d >= yesterdayStart) {
    return 'Yesterday';
  }

  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  };
  return d.toLocaleDateString(undefined, opts);
}

// ─── Status badges ────────────────────────────────────────────────────────────

function StatusBadges({ status }: { status: string | string[] | undefined }) {
  const statuses = (Array.isArray(status) ? status : [status]).filter(Boolean) as string[];

  if (statuses.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {statuses.map((s) => {
        const isUnread = s.includes('Unread');
        const isImportant = s.includes('Important');
        const isStarred = s.includes('Starred');

        const emoji = isUnread ? '🟢' : isImportant ? '⭐' : isStarred ? '📌' : '';
        const cls = isUnread
          ? 'bg-blue-500/20 text-blue-300 border-blue-400/20'
          : isStarred
          ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/20'
          : isImportant
          ? 'bg-orange-500/20 text-orange-300 border-orange-400/20'
          : 'bg-white/10 text-white/50 border-white/10';

        return (
          <span
            key={s}
            className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1 border ${cls}`}
          >
            {emoji} {s}
          </span>
        );
      })}
    </div>
  );
}

// ─── Sender Avatar ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-violet-500 to-purple-600',
];

function avatarColor(name: string): string {
  const idx = Math.abs(name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function SenderCell({ email }: { email: Email }) {
  // Parse "Display Name <addr@example.com>" format
  const rawSender = email.sender || '';
  const match = rawSender.match(/^(.*?)\s*<(.+?)>$/);
  const displayName = match ? match[1].replace(/['"]/g, '').trim() : rawSender.trim();
  const emailAddr = email.senderEmail || (match ? match[2] : '');
  const initials = displayName.charAt(0).toUpperCase() || '?';

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={`w-9 h-9 flex-shrink-0 rounded-full bg-gradient-to-br ${avatarColor(displayName)} flex items-center justify-center text-white text-xs font-bold shadow-sm`}
      >
        {initials}
      </div>
      <div className="min-w-0">
        <div className="truncate max-w-[120px] md:max-w-[160px] text-sm font-medium" title={displayName}>
          {displayName || 'Unknown'}
        </div>
        {emailAddr && (
          <div className="truncate max-w-[120px] md:max-w-[160px] text-[11px] text-white/40" title={emailAddr}>
            {emailAddr}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sort indicator ───────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={13} className="opacity-40 inline ml-1" />;
  return dir === 'asc'
    ? <ChevronUp size={13} className="inline ml-1 text-blue-400" />
    : <ChevronDown size={13} className="inline ml-1 text-blue-400" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ROWS_OPTIONS = [10, 20] as const;

const EmailTable: React.FC<EmailTableProps> = ({ userId, initialEmails = [] }) => {
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery] = useState('');
  const [liveSearch, setLiveSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDir }>({ key: 'date', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewingEmail, setViewingEmail] = useState<Email | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState<10 | 20>(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (initialEmails.length > 0) setEmails(initialEmails);
  }, [initialEmails]);

  // Reset page when search/sort changes
  useEffect(() => { setCurrentPage(1); }, [liveSearch, sortConfig]);

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await googleService.getEmails(userId, searchQuery);
      setEmails(data.emails || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  // ── Filtering & Sorting ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = liveSearch.toLowerCase();
    if (!q) return emails;
    return emails.filter(e => {
      const sender = (e.sender || '').toLowerCase();
      const subject = (e.subject || '').toLowerCase();
      const preview = (e.preview || e.bodyPreview || '').toLowerCase();
      return sender.includes(q) || subject.includes(q) || preview.includes(q);
    });
  }, [emails, liveSearch]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA = a[sortConfig.key] ?? '';
      let valB = b[sortConfig.key] ?? '';

      // For dates, sort numerically
      if (sortConfig.key === 'date') {
        const toMs = (v: unknown) => {
          const n = Number(v);
          if (!isNaN(n) && n > 1_000_000_000_000) return n;
          const d = new Date(String(v));
          return isNaN(d.getTime()) ? 0 : d.getTime();
        };
        valA = toMs(valA) as never;
        valB = toMs(valB) as never;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortConfig]);

  // ── Pagination ───────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, currentPage, rowsPerPage]);

  // ── Selection helpers ────────────────────────────────────────────────────
  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length && paginated.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map(e => e.id)));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleAction = async (action: string, id?: string) => {
    const targetIds = id ? [id] : Array.from(selectedIds);
    if (targetIds.length === 0) return;

    if (action === 'delete' || action === 'archive') {
      setEmails(prev => prev.filter(e => !targetIds.includes(e.id)));
      if (id && viewingEmail?.id === id) setViewingEmail(null);
      setSelectedIds(new Set());
    } else if (action === 'mark_read') {
      setEmails(prev => prev.map(e =>
        targetIds.includes(e.id)
          ? { ...e, status: (Array.isArray(e.status) ? e.status : [e.status]).filter(s => s !== 'Unread').concat('Read') }
          : e
      ));
    } else if (action === 'star') {
      setEmails(prev => prev.map(e =>
        targetIds.includes(e.id) && !(Array.isArray(e.status) ? e.status : [e.status]).includes('Starred')
          ? { ...e, status: [...(Array.isArray(e.status) ? e.status : [e.status]), 'Starred'] }
          : e
      ));
    }

    try {
      for (const msgId of targetIds) {
        if (action === 'delete') await googleService.deleteEmail(userId, msgId);
        else if (action === 'archive') await googleService.modifyEmail(userId, msgId, [], ['INBOX']);
        else if (action === 'mark_read') await googleService.modifyEmail(userId, msgId, [], ['UNREAD']);
        else if (action === 'star') await googleService.modifyEmail(userId, msgId, ['STARRED'], []);
      }
    } catch (err) {
      console.error(`Action ${action} failed:`, err);
      fetchEmails();
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-col font-sans">
      <div className="flex flex-col flex-1 overflow-hidden shadow-xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-xl">

        {/* ── Toolbar ────────────────────────────────────────────────────── */}
        <div className="p-3 border-b border-white/10 flex flex-wrap gap-3 items-center justify-between bg-white/5 shrink-0">
          {/* Search */}
          <form
            onSubmit={(e) => { e.preventDefault(); fetchEmails(); }}
            className="relative flex-1 min-w-[180px] max-w-sm"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={15} />
            <input
              type="text"
              placeholder="Search emails…"
              value={liveSearch}
              onChange={(e) => setLiveSearch(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </form>

          <div className="flex items-center gap-2">
            {/* Bulk actions */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  className="flex gap-1"
                >
                  <button onClick={() => handleAction('mark_read')} className="p-1.5 hover:bg-white/10 rounded-md text-white/70 hover:text-white transition-colors" title="Mark Read">
                    <Mail size={16} />
                  </button>
                  <button onClick={() => handleAction('archive')} className="p-1.5 hover:bg-white/10 rounded-md text-white/70 hover:text-white transition-colors" title="Archive">
                    <Archive size={16} />
                  </button>
                  <button onClick={() => handleAction('delete')} className="p-1.5 hover:bg-white/10 rounded-md text-red-400 hover:text-red-300 transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                  <span className="text-xs text-white/40 self-center ml-1">{selectedIds.size} selected</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rows per page */}
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value) as 10 | 20); setCurrentPage(1); }}
              className="bg-black/30 border border-white/10 text-white/70 text-xs rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            >
              {ROWS_OPTIONS.map(n => <option key={n} value={n}>{n} rows</option>)}
            </select>

            {/* Refresh */}
            <button
              onClick={fetchEmails}
              disabled={loading}
              className="p-1.5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin opacity-50' : ''} />
            </button>
          </div>
        </div>

        {/* ── Table Area ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-400">
                <Inbox size={28} />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Error loading emails</h3>
              <p className="text-white/50 text-sm mb-5">{error}</p>
              <button onClick={fetchEmails} className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm transition-colors">
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="flex flex-col divide-y divide-white/5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex p-4 items-center gap-4 animate-pulse">
                  <div className="w-5 h-5 bg-white/10 rounded" />
                  <div className="w-9 h-9 bg-white/10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/10 rounded w-1/4" />
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                  </div>
                  <div className="w-16 h-3 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-white/40">
              <Inbox size={44} className="mb-4 opacity-40" />
              <p className="text-sm">No emails found.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              {/* Sticky header */}
              <thead className="sticky top-0 bg-gray-900/90 backdrop-blur-md text-white/60 text-xs uppercase tracking-wide z-10 border-b border-white/10">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <button onClick={toggleSelectAll} className="hover:text-white transition-colors">
                      {selectedIds.size === paginated.length && paginated.length > 0
                        ? <CheckSquare size={16} className="text-blue-400" />
                        : <Square size={16} />}
                    </button>
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:text-white transition-colors whitespace-nowrap"
                    onClick={() => handleSort('sender')}
                  >
                    Sender <SortIcon col="sender" sortKey={sortConfig.key} dir={sortConfig.direction} />
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('subject')}
                  >
                    Subject <SortIcon col="subject" sortKey={sortConfig.key} dir={sortConfig.direction} />
                  </th>
                  <th className="p-3 hidden md:table-cell w-48">Preview</th>
                  <th
                    className="p-3 cursor-pointer hover:text-white transition-colors whitespace-nowrap w-28"
                    onClick={() => handleSort('date')}
                  >
                    Date <SortIcon col="date" sortKey={sortConfig.key} dir={sortConfig.direction} />
                  </th>
                  <th className="p-3 w-32">Status</th>
                  <th className="p-3 text-center w-28">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginated.map((email, rowIdx) => {
                  const isUnread = (Array.isArray(email.status) ? email.status : [email.status]).includes('Unread');
                  const isSelected = selectedIds.has(email.id);
                  const preview = (email.preview || email.bodyPreview || '').slice(0, 100);
                  const isZebra = rowIdx % 2 !== 0;

                  return (
                    <motion.tr
                      key={email.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: rowIdx * 0.03 }}
                      onClick={() => setViewingEmail(email)}
                      className={[
                        'group cursor-pointer transition-colors border-b border-white/5',
                        isSelected ? 'bg-blue-500/15' : isZebra ? 'bg-white/[0.02] hover:bg-white/[0.06]' : 'hover:bg-white/5',
                        isUnread ? 'font-semibold text-white' : 'font-normal text-white/70',
                      ].join(' ')}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => toggleSelect(email.id, e)} className="text-white/30 hover:text-white transition-colors">
                          {isSelected ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} />}
                        </button>
                      </td>

                      {/* Sender */}
                      <td className="p-3">
                        <SenderCell email={email} />
                      </td>

                      {/* Subject */}
                      <td className="p-3 max-w-[160px]">
                        <div className="truncate font-medium text-white" title={email.subject}>
                          {email.subject || '(no subject)'}
                        </div>
                      </td>

                      {/* Preview — hidden on small screens */}
                      <td className="p-3 hidden md:table-cell">
                        <span className="text-white/40 text-xs line-clamp-2">
                          {preview ? `${preview}${preview.length >= 100 ? '…' : ''}` : ''}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="p-3 text-xs whitespace-nowrap text-white/60">
                        {formatDate(email.date)}
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <StatusBadges status={email.status} />
                      </td>

                      {/* Actions */}
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewingEmail(email); }}
                            className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                            title="Open"
                          >
                            <ExternalLink size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAction('reply', email.id); }}
                            className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-blue-400 transition-colors"
                            title="Reply"
                          >
                            <Reply size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAction('archive', email.id); }}
                            className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                            title="Archive"
                          >
                            <Archive size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAction('delete', email.id); }}
                            className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ─────────────────────────────────────────────────── */}
        {!loading && !error && sorted.length > 0 && (
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-white/10 bg-black/20 text-xs text-white/50">
            <span>
              {((currentPage - 1) * rowsPerPage) + 1}–{Math.min(currentPage * rowsPerPage, sorted.length)} of {sorted.length} emails
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-1">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`min-w-[28px] h-7 rounded-md text-xs transition-colors ${
                        currentPage === p
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'hover:bg-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      <EmailViewerModal
        isOpen={!!viewingEmail}
        email={viewingEmail}
        onClose={() => setViewingEmail(null)}
        onAction={handleAction}
      />
    </div>
  );
};

export default EmailTable;
