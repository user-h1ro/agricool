import { motion } from 'framer-motion';
import { DailyQuest } from '../../types';

interface QuestsTabProps {
  quests: DailyQuest[];
  onClaim: (id: DailyQuest['id']) => void;
  claimed: string[];
}

export default function QuestsTab({ quests, onClaim, claimed }: QuestsTabProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-garden-900">📋 Daily Quests</h3>
        <span className="text-[11px] font-semibold text-garden-500">Resets every day</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {quests.map(q => {
          const isDone = q.progress >= q.target;
          const isClaimed = claimed.includes(q.id);
          return (
            <div
              key={q.id}
              className={`rounded-xl border p-3 shadow-panel transition-colors ${
                isDone ? 'border-garden-300 bg-garden-50' : 'border-garden-100 bg-white/80'
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xl">{isDone ? '✅' : q.icon}</span>
                <p className="text-xs font-bold text-garden-900">{q.title}</p>
              </div>
              <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-garden-100">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-garden-400 to-garden-600"
                  animate={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-garden-600">{Math.min(q.progress, q.target)}/{q.target}</span>
                {isClaimed ? (
                  <span className="text-[11px] font-bold text-garden-500">✅ Claimed</span>
                ) : isDone ? (
                  <button
                    onClick={() => onClaim(q.id)}
                    className="rounded-full bg-gold-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-panel transition hover:bg-gold-600"
                  >
                    Claim +{q.coinReward} 🪙 · +{q.xpReward} XP
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-garden-400">+{q.coinReward} 🪙 · +{q.xpReward} XP</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}