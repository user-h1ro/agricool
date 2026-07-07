import { motion } from 'framer-motion';
import { COSMETICS } from '../constants';
import { Cosmetic } from '../types';
import Overlay from './Overlay';

interface ShopPanelProps {
  coins: number;
  equipped: string[];
  unlocked: string[];
  filterCategories?: Cosmetic['category'][];
  onEquip: (id: string) => void;
  onUnequip: (id: string) => void;
  onBuy: (item: Cosmetic) => void;
  onClose: () => void;
}

const CATEGORY_LABEL: Record<Cosmetic['category'], string> = {
  fence: '🪵 Fences',
  border: '🌸 Borders',
  tool: '🛠 Tools',
  seasonal: '⭐ Seasonal (Limited)',
};

export default function ShopPanel({ coins, equipped, unlocked, filterCategories, onEquip, onUnequip, onBuy, onClose }: ShopPanelProps) {
  const categories = (filterCategories ?? ['fence', 'border', 'tool', 'seasonal']) as Cosmetic['category'][];

  return (
    <Overlay onClose={onClose} title={filterCategories ? '🎨 Decorations' : '🛍️ Cosmetics Shop'}>
      <div className="mb-4 flex justify-end">
        <span className="rounded-full bg-gold-100 px-4 py-1.5 text-sm font-extrabold text-gold-700 shadow-panel">🪙 {coins} AgriCoins</span>
      </div>

      {categories.map(cat => {
        const items = COSMETICS.filter(c => c.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="mb-6">
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-garden-500">{CATEGORY_LABEL[cat]}</p>
            <div className="flex flex-wrap gap-3">
              {items.map(item => {
                const isOwned = unlocked.includes(item.id);
                const isEquipped = equipped.includes(item.id);
                const canAfford = item.cost <= coins || item.cost === 0;
                return (
                  <div
                    key={item.id}
                    className={`min-w-[140px] flex-1 rounded-2xl border p-3 shadow-panel transition hover:-translate-y-0.5
                      ${isEquipped ? 'border-garden-300 bg-garden-50' : 'border-garden-100 bg-white'}`}
                  >
                    <svg width="64" height="40" viewBox="0 0 64 40" className="mb-2 block">
                      <polygon points="32,4 60,18 32,32 4,18" fill={isEquipped ? '#22c55e' : '#a8d5a2'} />
                      <polygon points="4,18 32,32 32,40 4,26" fill={isEquipped ? '#14532d' : '#5a8c55'} />
                      <polygon points="60,18 32,32 32,40 60,26" fill={isEquipped ? '#166534' : '#6aab64'} />
                      <text x="32" y="21" textAnchor="middle" dominantBaseline="middle" fontSize="16">{item.icon}</text>
                    </svg>
                    <p className="text-[13px] font-bold text-garden-900">{item.name}</p>
                    <p className="mb-2 text-[11px] leading-tight text-garden-500">{item.description}</p>
                    {item.limited && !isOwned && (
                      <span className="mb-2 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-bold text-sky-700">Limited</span>
                    )}
                    {isOwned ? (
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => (isEquipped ? onUnequip(item.id) : onEquip(item.id))}
                        className={`w-full rounded-full py-1.5 text-[11px] font-bold ${isEquipped ? 'bg-garden-600 text-white' : 'bg-garden-100 text-garden-700 hover:bg-garden-200'}`}
                      >
                        {isEquipped ? '✓ Equipped' : 'Equip'}
                      </motion.button>
                    ) : item.limited ? (
                      <p className="text-[11px] font-semibold text-garden-500">🔒 Earn in events</p>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        disabled={!canAfford}
                        onClick={() => canAfford && onBuy(item)}
                        className={`w-full rounded-full py-1.5 text-[11px] font-bold ${canAfford ? 'bg-garden-600 text-white hover:bg-garden-700' : 'cursor-not-allowed bg-garden-100 text-garden-400'}`}
                      >
                        {canAfford ? `🪙 ${item.cost} — Buy` : `🪙 ${item.cost} — Not enough`}
                      </motion.button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </Overlay>
  );
}
