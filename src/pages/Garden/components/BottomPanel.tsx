import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BottomPanelProps {
  questsBadge?: number;
  eventsBadge?: number;
  goalsBadge?: number;
  children: (activeTab: number) => ReactNode;
  activeTab: number;
  onChangeTab: (tab: number) => void;
}

const TABS = [
  { label: 'Quests', icon: '📋' },
  { label: 'Events', icon: '🌤️' },
  { label: 'Social', icon: '🍃' },
  { label: 'Leaderboard', icon: '🏆' },
  { label: 'Calendar', icon: '📅' },
  { label: 'Insights', icon: '💡' },
  { label: 'History', icon: '📜' },
  { label: 'Goals', icon: '🎯' },
];

export default function BottomPanel({ questsBadge, eventsBadge, goalsBadge, children, activeTab, onChangeTab }: BottomPanelProps) {
  return (
    <div className="mt-4 rounded-2xl border border-white/60 bg-white/75 p-3 shadow-glass backdrop-blur-md sm:p-4">
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-garden-50 p-1">
        {TABS.map((tab, i) => {
          const badge = i === 0 ? questsBadge : i === 1 ? eventsBadge : i === 7 ? goalsBadge : undefined;
          const active = activeTab === i;
          return (
            <button
              key={tab.label}
              onClick={() => onChangeTab(i)}
              className={`relative flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors
                ${active ? 'bg-white text-garden-900 shadow-panel' : 'text-garden-600 hover:bg-white/60'}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {!!badge && (
                <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {children(activeTab)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
