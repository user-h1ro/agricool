import { motion } from 'framer-motion';
import { DEFENSE_ITEMS } from '../../constants';
import { PestEvent, PlotCrop } from '../../types';

interface PlotActionsProps {
  plot: PlotCrop;
  pest: PestEvent | null;
  onWater: () => void;
  onFertilize: () => void;
  onDefend: (item: 'scarecrow' | 'pesticide') => void;
  onUpgrade: () => void;
  onHarvest: () => void;
  onRemove: () => void;
}

export default function PlotActions({
  plot, pest, onWater, onFertilize, onDefend, onUpgrade, onHarvest, onRemove,
}: PlotActionsProps) {
  const isReady = plot.status === 'harvest_ready';
  // Fertilize only ever transitions growing->healthy or healthy->harvest_ready
  // (see handleFertilize) — for any other status it's a guaranteed no-op, so
  // it's safe to disable. Water is never disabled: even at full HP it still
  // counts toward the daily "Water 3 plants" quest, so it always does
  // something meaningful.
  const fertilizeUnavailable = plot.status !== 'growing' && plot.status !== 'healthy';

  return (
    <div className="mt-1">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-garden-500">Plot Actions</p>
      <div className="grid grid-cols-2 gap-2">
        <ActionButton icon="💧" label="Water" tone="sky" onClick={onWater} />
        <ActionButton icon="🌿" label="Fertilize" tone="garden" onClick={onFertilize} disabled={fertilizeUnavailable} />
        <ActionButton icon="🪲" label={`Pesticide · 🪙${DEFENSE_ITEMS[0].cost}`} tone="gold" onClick={() => onDefend('pesticide')} />
        <ActionButton icon="🧱" label={`Scarecrow · 🪙${DEFENSE_ITEMS[1].cost}`} tone="gold" onClick={() => onDefend('scarecrow')} />
        <ActionButton icon="🔧" label="Upgrade" tone="garden" onClick={onUpgrade} />
        {isReady ? (
          <ActionButton icon="🌾" label="Harvest · +30🪙" tone="gold" onClick={onHarvest} />
        ) : (
          <ActionButton icon="🗑️" label="Remove" tone="sky" onClick={onRemove} />
        )}
      </div>
      {isReady && (
        <button
          onClick={onRemove}
          className="mt-2 w-full rounded-xl border border-red-200 bg-red-50 py-1.5 text-[11px] font-bold text-red-700 transition hover:bg-red-100"
        >
          🗑️ Remove without harvesting
        </button>
      )}
      {pest && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {pest.emoji} {pest.pestName} is attacking this plot! Deploy a defense item above.
        </div>
      )}
      {isReady && (
        <div className="mt-3 rounded-xl border border-gold-300 bg-gold-100 p-3 text-xs font-semibold text-gold-700">
          ✨ Ready to harvest! Complete your task to collect the reward.
        </div>
      )}
    </div>
  );
}

function ActionButton({
  icon, label, tone, onClick, disabled,
}: { icon: string; label: string; tone: 'sky' | 'garden' | 'gold'; onClick: () => void; disabled?: boolean }) {
  const toneClasses: Record<string, string> = {
    sky: 'bg-sky-100 text-sky-700 hover:bg-sky-200',
    garden: 'bg-garden-100 text-garden-800 hover:bg-garden-200',
    gold: 'bg-gold-100 text-gold-700 hover:bg-gold-200',
  };
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.96 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-bold transition
        ${disabled ? 'cursor-not-allowed bg-garden-50 text-garden-300' : toneClasses[tone]}`}
    >
      <span>{icon}</span>
      <span className="truncate">{label}</span>
    </motion.button>
  );
}
