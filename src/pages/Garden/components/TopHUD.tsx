import { motion } from 'framer-motion';
import { SEASONAL_EVENTS } from '../constants';
import { daysLeft, getCurrentSeason, getTodaysWeather, dayOfYear } from '../helpers';
import NotificationBell from './NotificationBell';
import { GardenNotification } from '../notifications/types';

interface TopHUDProps {
  username: string;
  avatarUrl: string | null;
  coins: number;
  xp: number;
  level: { level: number; title: string; icon: string; color: string };
  progress: { current: number; needed: number; pct: number };
  pestCount: number;
  claimableEvents?: number;
  notifications: GardenNotification[];
  unreadNotifications: number;
  onSelectNotification: (notification: GardenNotification) => void;
  onMarkAllNotificationsRead: () => void;
}

export default function TopHUD({
  username, avatarUrl, coins, level, progress, pestCount, claimableEvents = 0,
  notifications, unreadNotifications, onSelectNotification, onMarkAllNotificationsRead,
}: TopHUDProps) {
  const season = getCurrentSeason();
  const weather = getTodaysWeather();
  const day = dayOfYear();
  const soonestEvent = SEASONAL_EVENTS[0];
  const eventDaysLeft = soonestEvent ? daysLeft(soonestEvent.endsAt) : null;

  return (
    <div className="sticky top-0 z-30 -mx-1 mb-4 rounded-2xl border border-white/60 bg-white/70 px-3 py-2.5 shadow-panel backdrop-blur-md sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
        {/* Identity + level */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-11 w-11 overflow-hidden rounded-full border-2 border-garden-300 bg-garden-100 shadow-panel">
              {avatarUrl ? (
                <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg">🧑‍🌾</div>
              )}
            </div>
            <span
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white text-[10px] shadow-panel"
              style={{ backgroundColor: level.color }}
              title={level.title}
            >
              {level.icon}
            </span>
          </div>

          <div className="min-w-[128px]">
            <p className="truncate text-sm font-extrabold leading-tight text-garden-900">{username}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-garden-700">Lv.{level.level} {level.title}</span>
            </div>
            <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-garden-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-garden-400 to-garden-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress.pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 sm:gap-3">
          <HudChip icon="🪙" value={coins.toLocaleString()} tone="gold" title="AgriCoin balance" />
          <HudChip icon={weather.icon} value={weather.label} tone="sky" title="Today's weather" />
          <HudChip icon={season.icon} value={season.name} tone="garden" hideOnMobile title="Current season" />
          <HudChip icon="📅" value={`Day ${day}`} tone="soil" hideOnMobile title="Day counter" />

          {pestCount > 0 && (
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 shadow-panel"
              title="Active pest attacks"
            >
              🐛 {pestCount}
            </motion.span>
          )}

          {eventDaysLeft !== null && (
            <span
              className="hidden items-center gap-1 rounded-full bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-700 shadow-panel md:flex"
              title={soonestEvent.name}
            >
              {soonestEvent.icon} {eventDaysLeft}d left
            </span>
          )}

          {claimableEvents > 0 && (
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="flex items-center gap-1 rounded-full bg-gold-100 px-3 py-1.5 text-xs font-bold text-gold-700 shadow-panel"
              title={`${claimableEvents} event reward${claimableEvents === 1 ? '' : 's'} ready to claim`}
            >
              🎁 {claimableEvents}
            </motion.span>
          )}

          <NotificationBell
            notifications={notifications}
            unreadCount={unreadNotifications}
            onSelect={onSelectNotification}
            onMarkAllRead={onMarkAllNotificationsRead}
          />
        </div>
      </div>
    </div>
  );
}

function HudChip({
  icon, value, tone, title, hideOnMobile,
}: { icon: string; value: string; tone: 'gold' | 'sky' | 'garden' | 'soil'; title?: string; hideOnMobile?: boolean }) {
  const toneClasses: Record<string, string> = {
    gold: 'bg-gold-100 text-gold-700',
    sky: 'bg-sky-100 text-sky-700',
    garden: 'bg-garden-100 text-garden-700',
    soil: 'bg-soil-200/70 text-soil-800',
  };
  return (
    <span
      title={title}
      className={`${toneClasses[tone]} ${hideOnMobile ? 'hidden sm:inline-flex' : 'inline-flex'} items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-panel`}
    >
      <span>{icon}</span>
      <span className="whitespace-nowrap">{value}</span>
    </span>
  );
}