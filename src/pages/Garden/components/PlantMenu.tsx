import { motion } from 'framer-motion';
import { TrackedCrop } from '../types';
import Overlay from './Overlay';

interface PlantMenuProps {
  availableCrops: TrackedCrop[];
  hasAnyTrackedCrops: boolean;
  onSelect: (crop: TrackedCrop) => void;
  onClose: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  growing: 'Growing',
  healthy: 'Healthy',
  harvest_ready: 'Ready',
  wilted: 'Wilted',
};

export default function PlantMenu({ availableCrops, hasAnyTrackedCrops, onSelect, onClose }: PlantMenuProps) {
  return (
    <Overlay title="🌱 Choose a Crop to Plant" onClose={onClose} maxWidth="max-w-lg">
      <p className="mb-4 text-xs font-semibold text-garden-600/80">
        Step 1 of 2 — pick a seed below. Next, you'll tap an empty plot in your garden to plant it there.
      </p>

      {availableCrops.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-garden-200 bg-garden-50/60 py-8 text-center">
          <span className="text-3xl">🎒</span>
          <p className="text-sm font-bold text-garden-900">
            {hasAnyTrackedCrops ? 'All your tracked crops are already planted' : 'No seeds in your inventory yet'}
          </p>
          <p className="max-w-[280px] text-xs text-garden-600/70">
            {hasAnyTrackedCrops
              ? 'Track another crop from the Marketplace or Dashboard, then come back to plant it here.'
              : 'Track a crop from the Marketplace or Dashboard first — it will show up here, ready to plant.'}
          </p>
          <button
            onClick={onClose}
            className="mt-2 rounded-full bg-garden-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-garden-700"
          >
            Got it
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {availableCrops.map(crop => (
            <motion.button
              key={crop.id}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelect(crop)}
              className="group flex flex-col items-center gap-1.5 rounded-2xl border border-garden-100 bg-white p-3 text-center shadow-panel transition hover:border-garden-300 hover:bg-garden-50"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-garden-50 text-2xl transition group-hover:scale-110">
                {crop.emoji}
              </span>
              <span className="text-[13px] font-bold leading-tight text-garden-900">{crop.name}</span>
              <span className="rounded-full bg-garden-100 px-2 py-0.5 text-[10px] font-bold text-garden-600">
                {STATUS_LABEL[crop.status] ?? crop.status}
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </Overlay>
  );
}
