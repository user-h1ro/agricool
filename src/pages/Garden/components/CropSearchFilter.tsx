import { CROP_FILTERS, CropFilterId } from './dashboard/dashboardHelpers';

interface CropSearchFilterProps {
  statusFilter: CropFilterId | null;
  cropTypeFilter: string | null;
  onChangeStatus: (id: CropFilterId | null) => void;
  onChangeCropType: (name: string | null) => void;
  cropTypeOptions: { name: string; emoji: string }[];
  matchCount: number;
}

// Phase 3, item 8 — sits above the grid (not tucked in a tab) since it acts
// directly on the grid: picking a filter dims every non-matching plot and
// rings the ones that match (see GardenGrid.tsx's matchesFilter prop).
export default function CropSearchFilter({
  statusFilter, cropTypeFilter, onChangeStatus, onChangeCropType, cropTypeOptions, matchCount,
}: CropSearchFilterProps) {
  const isActive = !!statusFilter || !!cropTypeFilter;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-panel backdrop-blur-md">
      <span className="mr-1 flex-shrink-0 text-[11px] font-bold uppercase tracking-wide text-garden-500">🔍 Filter</span>

      {CROP_FILTERS.map(f => (
        <button
          key={f.id}
          onClick={() => onChangeStatus(statusFilter === f.id ? null : f.id)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
            statusFilter === f.id ? 'bg-garden-600 text-white' : 'bg-garden-50 text-garden-700 hover:bg-garden-100'
          }`}
        >
          {f.icon} {f.label}
        </button>
      ))}

      <select
        value={cropTypeFilter ?? ''}
        onChange={e => onChangeCropType(e.target.value || null)}
        className="rounded-full border border-garden-200 bg-white px-3 py-1.5 text-xs font-bold text-garden-700"
        aria-label="Filter by crop type"
      >
        <option value="">All Crop Types</option>
        {cropTypeOptions.map(c => (
          <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>
        ))}
      </select>

      {isActive && (
        <>
          <span className="ml-auto text-[11px] font-bold text-sky-600">
            {matchCount} plot{matchCount === 1 ? '' : 's'} match
          </span>
          <button
            onClick={() => { onChangeStatus(null); onChangeCropType(null); }}
            className="rounded-full border border-garden-200 px-3 py-1.5 text-xs font-bold text-garden-500 transition hover:bg-garden-50"
          >
            ✕ Clear
          </button>
        </>
      )}
    </div>
  );
}
