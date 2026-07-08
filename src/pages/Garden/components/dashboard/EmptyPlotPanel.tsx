import { TrackedCrop } from '../../types';

interface EmptyPlotPanelProps {
  trackedCrops: TrackedCrop[];
  hasAnyTrackedCrops: boolean;
  onPlaceCrop: (crop: TrackedCrop) => void;
}

export default function EmptyPlotPanel({ trackedCrops, hasAnyTrackedCrops, onPlaceCrop }: EmptyPlotPanelProps) {
  return (
    <div>
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
    </div>
  );
}
