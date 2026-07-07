import { AnimatePresence, motion } from 'framer-motion';
import { DEFENSE_ITEMS } from '../constants';
import { GardenLayout, PestEvent, TrackedCrop } from '../types';

interface RightPanelProps {
  selectedPlot: number | null;
  plot: GardenLayout[number] | null;
  pest: PestEvent | null;
  trackedCrops: TrackedCrop[];
  hasAnyTrackedCrops: boolean;
  onClose: () => void;
  onPlaceCrop: (crop: TrackedCrop) => void;
  onWater: () => void;
  onFertilize: () => void;
  onDefend: (item: 'scarecrow' | 'pesticide') => void;
  onUpgrade: () => void;
  onHarvest: () => void;
  onRemove: () => void;
}

const RARITY_BY_STATUS: Record<string, { label: string; color: string }> = {
  growing: { label: 'Common', color: 'text-garden-600' },
  healthy: { label: 'Uncommon', color: 'text-sky-600' },
  harvest_ready: { label: 'Rare — ready!', color: 'text-gold-600' },
  wilted: { label: 'At risk', color: 'text-red-600' },
};

const GROWTH_TIME_BY_STATUS: Record<string, string> = {
  growing: '~2 days remaining',
  healthy: '~1 day remaining',
  harvest_ready: 'Ready now!',
  wilted: 'Needs attention',
};

export default function RightPanel({
  selectedPlot, plot, pest, trackedCrops, hasAnyTrackedCrops, onClose, onPlaceCrop, onWater, onFertilize, onDefend, onUpgrade, onHarvest, onRemove,
}: RightPanelProps) {
  return (
    <div className="sticky top-24 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-panel backdrop-blur-md">
      <AnimatePresence mode="wait">
        {selectedPlot === null || !plot ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2 py-8 text-center"
          >
            <span className="text-3xl">🌾</span>
            <p className="text-sm font-bold text-garden-800">No plot selected</p>
            <p className="text-xs text-garden-600/70">Tap any tile in your garden to see crop details and actions here.</p>
          </motion.div>
        ) : (
          <motion.div
            key={selectedPlot}
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.18 }}
          >
            <div className="mb-3 flex items-start justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-garden-500">Plot #{selectedPlot + 1}</p>
              <button onClick={onClose} className="text-garden-400 hover:text-garden-700" aria-label="Close panel">✕</button>
            </div>

            {plot.cropId ? (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-garden-50 text-4xl shadow-inner">
                    {plot.emoji}
                  </div>
                  <div>
                    <p className="text-base font-extrabold text-garden-900">{plot.name}</p>
                    <p className={`text-xs font-bold ${RARITY_BY_STATUS[plot.status]?.color ?? 'text-garden-600'}`}>
                      {RARITY_BY_STATUS[plot.status]?.label}
                    </p>
                  </div>
                </div>

                <InfoRow label="Growth stage" value={plot.status.replace('_', ' ')} />
                <InfoRow label="Remaining time" value={GROWTH_TIME_BY_STATUS[plot.status]} />
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-garden-600">Health</span>
                  <span className="font-bold text-garden-900">{Math.round((plot.hp / 3) * 100)}%</span>
                </div>
                <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-garden-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(plot.hp / 3) * 100}%`, backgroundColor: plot.hp >= 2 ? '#4ade80' : plot.hp === 1 ? '#facc15' : '#f87171' }}
                  />
                </div>
                <InfoRow label="Pest status" value={pest ? `${pest.emoji} ${pest.pestName} attacking` : 'None'} accent={pest ? 'text-red-600' : undefined} />
                <InfoRow
                  label="Protection"
                  value={plot.defenseItem ? `${plot.defenseItem === 'scarecrow' ? '🧱 Scarecrow' : '🪲 Pesticide'} active` : 'Unprotected'}
                  accent={plot.defenseItem ? 'text-sky-600' : undefined}
                />
                <InfoRow label="Harvest reward" value="+30 🪙 AgriCoins" />

                {pest && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                    {pest.emoji} {pest.pestName} is attacking this plot! Deploy a defense item below.
                  </div>
                )}
                {plot.status === 'harvest_ready' && (
                  <div className="mt-3 rounded-xl border border-gold-300 bg-gold-100 p-3 text-xs font-semibold text-gold-700">
                    ✨ Ready to harvest! Complete your task to collect the reward.
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <ActionButton icon="💧" label="Water" tone="sky" onClick={onWater} />
                  <ActionButton icon="🌿" label="Fertilize" tone="garden" onClick={onFertilize} />
                  <ActionButton icon="🪲" label={`Pesticide · 🪙${DEFENSE_ITEMS[0].cost}`} tone="gold" onClick={() => onDefend('pesticide')} />
                  <ActionButton icon="🧱" label={`Scarecrow · 🪙${DEFENSE_ITEMS[1].cost}`} tone="gold" onClick={() => onDefend('scarecrow')} />
                  <ActionButton icon="🔧" label="Upgrade" tone="garden" onClick={onUpgrade} />
                  {plot.status === 'harvest_ready' ? (
                    <ActionButton icon="🌾" label="Harvest · +30🪙" tone="gold" onClick={onHarvest} />
                  ) : (
                    <ActionButton icon="🗑️" label="Remove" tone="sky" onClick={onRemove} />
                  )}
                </div>
                {plot.status === 'harvest_ready' && (
                  <button
                    onClick={onRemove}
                    className="mt-2 w-full rounded-xl border border-red-200 bg-red-50 py-1.5 text-[11px] font-bold text-red-700 transition hover:bg-red-100"
                  >
                    🗑️ Remove without harvesting
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-garden-50 text-3xl">🕳️</div>
                <p className="mb-3 text-sm font-bold text-garden-900">Empty plot</p>
                {trackedCrops.length > 0 ? (
                  <>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-garden-500">🌱 Tap a crop to plant it here</p>
                    <div className="flex flex-wrap gap-2">
                      {trackedCrops.map(crop => (
                        <button
                          key={crop.id}
                          onClick={() => onPlaceCrop(crop)}
                          className="rounded-full border border-garden-200 bg-garden-50 px-3 py-1.5 text-sm font-bold text-garden-800 transition hover:-translate-y-0.5 hover:bg-garden-100"
                        >
                          {crop.emoji} {crop.name}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-garden-600/70">
                    {hasAnyTrackedCrops
                      ? 'All your tracked crops are already planted. Track another one from the Marketplace or Dashboard to plant here.'
                      : 'Track a crop from the Marketplace or Dashboard first, then use the 🌱 Plant tool to add it here.'}
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="mb-1.5 flex items-center justify-between text-xs">
      <span className="font-semibold text-garden-600">{label}</span>
      <span className={`font-bold capitalize ${accent ?? 'text-garden-900'}`}>{value}</span>
    </div>
  );
}

function ActionButton({
  icon, label, tone, onClick,
}: { icon: string; label: string; tone: 'sky' | 'garden' | 'gold'; onClick: () => void }) {
  const toneClasses: Record<string, string> = {
    sky: 'bg-sky-100 text-sky-700 hover:bg-sky-200',
    garden: 'bg-garden-100 text-garden-800 hover:bg-garden-200',
    gold: 'bg-gold-100 text-gold-700 hover:bg-gold-200',
  };
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-bold transition ${toneClasses[tone]}`}
    >
      <span>{icon}</span>
      <span className="truncate">{label}</span>
    </motion.button>
  );
}