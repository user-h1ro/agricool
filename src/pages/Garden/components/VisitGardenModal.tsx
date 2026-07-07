import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/supabase';
import { GRID_SIZE } from '../constants';
import { GardenLayout, LeaderboardRow } from '../types';
import Overlay from './Overlay';

interface VisitGardenModalProps {
  row: LeaderboardRow;
  onClose: () => void;
  onDropLeaf: () => Promise<void>;
}

export default function VisitGardenModal({ row, onClose, onDropLeaf }: VisitGardenModalProps) {
  const [leafed, setLeafed] = useState(false);
  const [grid, setGrid] = useState<(string | null)[]>(Array(GRID_SIZE).fill(null));
  const [leafLoading, setLeafLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('garden_state')
      .select('layout, updated_at')
      .eq('user_id', row.userId)
      .single()
      .then(({ data }) => {
        if (!data?.layout) return;
        const layout: GardenLayout = data.layout;
        setGrid(layout.map(p => (p.cropId ? p.emoji : null)));
        if (data.updated_at) {
          const d = new Date(data.updated_at);
          setLastUpdated(d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
        }
      });
  }, [row.userId]);

  const handleLeaf = async () => {
    setLeafLoading(true);
    await onDropLeaf();
    setLeafed(true);
    setLeafLoading(false);
  };

  return (
    <Overlay title={`🏡 ${row.username}'s Garden`} onClose={onClose} maxWidth="max-w-md">
      {lastUpdated && <p className="-mt-3 mb-3 text-[10px] font-semibold text-garden-400">Last updated: {lastUpdated}</p>}

      <div className="mb-4 grid grid-cols-5 gap-1.5 rounded-2xl border-2 border-garden-300 bg-gradient-to-br from-garden-100 to-garden-200 p-2">
        {grid.map((emoji, i) => (
          <div
            key={i}
            className={`flex h-11 items-center justify-center rounded-lg text-lg ${emoji ? 'border border-garden-300 bg-garden-50' : 'border border-dashed border-garden-200 bg-garden-50/50'}`}
          >
            {emoji ?? ''}
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-3">
        <MiniStat value={row.coins} label="🪙 Coins" tone="gold" />
        <MiniStat value={row.cropsGrown} label="🌾 Crops" tone="garden" />
        <MiniStat value={row.leafCount} label="🍃 Leaves" tone="sky" />
      </div>

      {!leafed ? (
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={leafLoading}
          onClick={handleLeaf}
          className="w-full rounded-full bg-garden-600 py-2.5 text-sm font-bold text-white shadow-panel transition hover:bg-garden-700 disabled:opacity-60"
        >
          🍃 Drop a Leaf (+1 coin for {row.username}!)
        </motion.button>
      ) : (
        <div className="rounded-xl border border-garden-200 bg-garden-50 p-3 text-center text-sm font-bold text-garden-700">
          🍃 Leaf dropped! +1 AgriCoin rewarded.
        </div>
      )}
    </Overlay>
  );
}

function MiniStat({ value, label, tone }: { value: number; label: string; tone: 'gold' | 'garden' | 'sky' }) {
  const toneClasses: Record<string, string> = {
    gold: 'bg-gold-100 text-gold-700',
    garden: 'bg-garden-100 text-garden-700',
    sky: 'bg-sky-100 text-sky-700',
  };
  return (
    <div className={`flex-1 rounded-xl px-3 py-2 text-center ${toneClasses[tone]}`}>
      <p className="text-base font-extrabold">{value}</p>
      <p className="text-[10px] font-bold">{label}</p>
    </div>
  );
}
