import { CropHistoryEntry } from '../dashboard/cropHistoryLog';

interface CropHistoryTabProps {
  entries: CropHistoryEntry[];
}

const dateFmt = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// Phase 3, item 6 — every card here is a real, ended planting (harvested
// or removed), snapshotted at the moment it ended from that plot's actual
// history (see cropHistoryLog.ts / Garden.tsx's handleHarvest/handleRemoveCrop).
// Nothing here is generated — an empty list just means nothing has ended yet.
export default function CropHistoryTab({ entries }: CropHistoryTabProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-garden-900">📜 Crop History</h3>
        <p className="text-[11px] font-semibold text-garden-500">
          {entries.length > 0 ? `Your last ${entries.length} planting${entries.length === 1 ? '' : 's'}` : 'Nothing recorded yet'}
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-garden-100 bg-white/80 p-4 text-center text-xs text-garden-500">
          Harvest or remove a crop and its record will show up here — planted date, times watered, pest attacks, and what it paid out.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(entry => (
            <div
              key={entry.id}
              className={`rounded-xl border p-3 shadow-panel ${entry.outcome === 'harvested' ? 'border-gold-200 bg-gold-50/50' : 'border-garden-100 bg-white/80'}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="truncate text-sm font-extrabold text-garden-900">
                  {entry.emoji} {entry.name} <span className="font-semibold text-garden-400">· Plot #{entry.plotIndex + 1}</span>
                </p>
                <span className={`flex-shrink-0 text-[10px] font-bold ${entry.outcome === 'harvested' ? 'text-gold-600' : 'text-garden-400'}`}>
                  {entry.outcome === 'harvested' ? 'Harvested' : 'Removed'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-1 text-[11px] text-garden-600">
                <p><span className="font-bold text-garden-800">Planted:</span> {entry.plantedAt ? dateFmt(entry.plantedAt) : 'Unknown'}</p>
                <p><span className="font-bold text-garden-800">{entry.outcome === 'harvested' ? 'Harvest' : 'Ended'}:</span> {dateFmt(entry.endedAt)}</p>
                <p><span className="font-bold text-garden-800">Watered:</span> {entry.waterCount} times</p>
                <p><span className="font-bold text-garden-800">Pests:</span> {entry.pestCount} attack{entry.pestCount === 1 ? '' : 's'}</p>
              </div>
              {entry.outcome === 'harvested' && (
                <div className="mt-2 flex items-center gap-3 border-t border-gold-200/60 pt-2">
                  <span className="text-xs font-extrabold text-gold-700">🪙 +{entry.coins}</span>
                  <span className="text-xs font-extrabold text-sky-700">
                    ⭐ +{entry.estXp} <span className="text-[9px] font-semibold text-garden-400">(est. XP)</span>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
