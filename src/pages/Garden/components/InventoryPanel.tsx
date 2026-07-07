import { TrackedCrop } from '../types';
import Overlay from './Overlay';

interface InventoryPanelProps {
  trackedCrops: TrackedCrop[];
  onClose: () => void;
}

const STATUS_LABEL: Record<TrackedCrop['status'], { label: string; color: string }> = {
  growing: { label: 'Growing', color: 'bg-sky-100 text-sky-700' },
  healthy: { label: 'Healthy', color: 'bg-garden-100 text-garden-700' },
  harvest_ready: { label: 'Harvest ready', color: 'bg-gold-100 text-gold-700' },
  wilted: { label: 'Wilted', color: 'bg-red-100 text-red-700' },
};

export default function InventoryPanel({ trackedCrops, onClose }: InventoryPanelProps) {
  return (
    <Overlay title="🎒 Inventory" onClose={onClose} maxWidth="max-w-lg">
      {trackedCrops.length === 0 ? (
        <p className="py-6 text-center text-sm text-garden-600">
          No tracked crops yet. Track a crop from the Marketplace or Dashboard, then plant it in an empty plot.
        </p>
      ) : (
        <div className="space-y-2">
          {trackedCrops.map(crop => (
            <div key={crop.id} className="flex items-center justify-between rounded-xl border border-garden-100 bg-garden-50/50 px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{crop.emoji}</span>
                <p className="text-sm font-bold text-garden-900">{crop.name}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_LABEL[crop.status].color}`}>
                {STATUS_LABEL[crop.status].label}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-[11px] text-garden-500">Tap an empty plot on your garden grid, then choose a crop there to plant it.</p>
    </Overlay>
  );
}
