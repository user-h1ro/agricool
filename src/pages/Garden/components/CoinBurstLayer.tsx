import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { COIN_BURST_DURATION, COIN_BURST_PARTICLE_COUNT, EASE_OUT } from './interactionAnimations';

interface CoinBurst {
  id: number;
  amount: number;
  x: number;
  y: number;
}

// Phase 5.1B, item 7 — mounted once in Garden.tsx, sibling to
// CelebrationLayer. Listens for the *same* `agricool:coins` window event
// TopBar.tsx already reacts to (dispatched by dispatchCoinEvent() in
// helpers.ts) — this file never computes or awards a coin, it only ever
// reacts to an award that already happened elsewhere. Cleared via
// AnimatePresence's exit lifecycle + onAnimationComplete, not a timer.
export default function CoinBurstLayer() {
  const [bursts, setBursts] = useState<CoinBurst[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ amount: number; newTotal: number; sourceX?: number; sourceY?: number }>).detail;
      if (!detail || detail.amount <= 0) return; // only celebrate gains, not spends
      const id = ++idRef.current;
      setBursts(prev => [...prev, {
        id,
        amount: detail.amount,
        x: detail.sourceX ?? window.innerWidth / 2,
        y: detail.sourceY ?? window.innerHeight / 2,
      }]);
    };
    window.addEventListener('agricool:coins', handler);
    return () => window.removeEventListener('agricool:coins', handler);
  }, []);

  const removeBurst = (id: number) => setBursts(prev => prev.filter(b => b.id !== id));

  return (
    <div className="pointer-events-none fixed inset-0 z-[9996]">
      <AnimatePresence>
        {bursts.map(b => (
          <motion.div
            key={b.id}
            className="absolute text-sm font-extrabold text-gold-600"
            style={{ left: b.x, top: b.y }}
            initial={{ opacity: 1, scale: 0.6, x: 0, y: 0 }}
            animate={{ opacity: [1, 1, 0], scale: 1, x: -60, y: -160 }}
            transition={{ duration: COIN_BURST_DURATION, ease: EASE_OUT }}
            onAnimationComplete={() => removeBurst(b.id)}
          >
            +{b.amount}🪙
          </motion.div>
        ))}
        {bursts.map(b => (
          Array.from({ length: COIN_BURST_PARTICLE_COUNT }).map((_, i) => {
            const angle = (i / COIN_BURST_PARTICLE_COUNT) * Math.PI * 2;
            const spread = 34;
            return (
              <motion.span
                key={`${b.id}-${i}`}
                className="absolute text-xs"
                style={{ left: b.x, top: b.y }}
                initial={{ opacity: 1, x: 0, y: 0, scale: 0.8 }}
                animate={{
                  opacity: [1, 1, 0],
                  x: [Math.cos(angle) * spread, -70],
                  y: [Math.sin(angle) * spread, -170],
                  scale: [0.8, 0.4],
                }}
                transition={{ duration: COIN_BURST_DURATION, delay: i * 0.03, ease: EASE_OUT }}
              >
                🪙
              </motion.span>
            );
          })
        ))}
      </AnimatePresence>
    </div>
  );
}
