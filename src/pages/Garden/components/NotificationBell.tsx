import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GardenNotification } from '../notifications/types';

interface NotificationBellProps {
  notifications: GardenNotification[];
  unreadCount: number;
  onSelect: (notification: GardenNotification) => void;
  onMarkAllRead: () => void;
}

function timeAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function NotificationBell({ notifications, unreadCount, onSelect, onMarkAllRead }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-garden-100 bg-white text-base shadow-panel transition hover:-translate-y-0.5 hover:shadow-glass"
        title="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <motion.span
          style={{ display: 'inline-block' }}
          animate={unreadCount > 0 ? { rotate: [0, -12, 10, -8, 4, 0] } : { rotate: 0 }}
          transition={unreadCount > 0 ? { duration: 0.6, repeat: Infinity, repeatDelay: 2.6, ease: 'easeInOut' } : { duration: 0.2 }}
        >
          🔔
        </motion.span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-11 z-40 w-80 max-w-[88vw] overflow-hidden rounded-2xl border border-white/60 bg-white shadow-glass"
          >
            <div className="flex items-center justify-between border-b border-garden-100 px-4 py-3">
              <p className="text-sm font-extrabold text-garden-900">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="text-[11px] font-bold text-garden-600 transition hover:text-garden-800"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <span className="text-3xl">🌿</span>
                  <p className="text-sm font-bold text-garden-800">You're all caught up!</p>
                  <p className="text-xs text-garden-500">Garden alerts will show up here.</p>
                </div>
              ) : (
                <ul>
                  {notifications.map(n => (
                    <li key={n.id}>
                      <button
                        onClick={() => { onSelect(n); setOpen(false); }}
                        className={`flex w-full items-start gap-3 border-b border-garden-50 px-4 py-3 text-left transition hover:bg-garden-50
                          ${n.read ? 'bg-white' : 'bg-garden-50/60'}`}
                      >
                        <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-base shadow-panel">
                          {n.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-extrabold text-garden-900">{n.title}</span>
                            {!n.read && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-garden-500" />}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-garden-600">{n.message}</span>
                          <span className="mt-1 block text-[10px] font-semibold text-garden-400">{timeAgo(n.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}