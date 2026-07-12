import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AwardXPResult, FarmerLevel, XP_EVENT_NAME, XP_REWARDS } from '@/utilities/xpSystem';

interface FloatingXP {
  id: number;
  amount: number;
}

// Phase 3.5, items 2/6/7 — mounted once in Garden.tsx. Listens for the
// `agricool:xp` window event dispatched by awardXP() (see xpSystem.ts), so
// it reacts no matter which action handler triggered the award — the same
// pattern Garden already uses for the coin-particle effect
// (dispatchCoinEvent / agricool:coins in TopBar.tsx). Nothing here decides
// whether XP was earned; it only ever displays what awardXP() reports.
export default function CelebrationLayer() {
  const [popups, setPopups] = useState<FloatingXP[]>([]);
  const [levelUp, setLevelUp] = useState<FarmerLevel | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AwardXPResult>).detail;
      if (!detail) return;

      const pushPopup = (amount: number, delay: number) => {
        if (amount <= 0) return;
        window.setTimeout(() => {
          const id = ++idRef.current;
          setPopups(prev => [...prev, { id, amount }]);
          window.setTimeout(() => setPopups(prev => prev.filter(p => p.id !== id)), 1100);
        }, delay);
      };

      // Base award and any level-up bonus stack as separate popups (item 6).
      pushPopup(detail.amount, 0);
      pushPopup(detail.bonusAmount, 200);

      if (detail.leveledUp && detail.newLevel) {
        window.setTimeout(() => setLevelUp(detail.newLevel), 550);
      }
    };
    window.addEventListener(XP_EVENT_NAME, handler);
    return () => window.removeEventListener(XP_EVENT_NAME, handler);
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[9997] flex flex-col items-center gap-1.5">
        <AnimatePresence>
          {popups.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 6, scale: 0.85 }}
              animate={{ opacity: 1, y: -56, scale: 1 }}
              exit={{ opacity: 0, y: -84 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="rounded-full bg-gradient-to-r from-sky-400 to-sky-600 px-4 py-1.5 text-sm font-extrabold text-white shadow-glass-lg"
            >
              ⚡ +{p.amount} XP
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {levelUp && (
          <motion.div
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLevelUp(null)}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-full max-w-sm rounded-3xl border-4 p-6 text-center shadow-glass-lg"
              style={{ borderColor: levelUp.color, background: `linear-gradient(160deg, #ffffff, ${levelUp.color}22)` }}
              onClick={e => e.stopPropagation()}
            >
              <motion.p
                className="text-6xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.4 }}
              >
                🎉
              </motion.p>
              <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.2em] text-garden-500">Level Up!</p>
              <p className="mt-1 text-4xl">{levelUp.icon}</p>
              <p className="text-2xl font-extrabold" style={{ color: levelUp.color }}>
                Level {levelUp.level} reached
              </p>
              <p className="text-sm font-bold text-garden-600">{levelUp.title}</p>
              <p className="mt-3 text-sm font-extrabold text-gold-600">+{XP_REWARDS.levelUpBonus} Bonus XP</p>
              <p className="mt-2 text-xs font-semibold text-garden-500">
                You're growing into a true AgriCool farmer. Keep going!
              </p>
              <button
                onClick={() => setLevelUp(null)}
                className="mt-4 rounded-full bg-garden-600 px-6 py-2 text-sm font-bold text-white shadow-panel transition hover:bg-garden-700"
              >
                🚀 Keep Farming!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
