import { GROWTH_STAGES } from './dashboardHelpers';

interface GrowthTimelineProps {
  stageIndex: number; // 0-4, current stage
  progressPct: number; // 0-100 overall growth
  harvestEmoji?: string; // actual crop emoji, used for the final "Harvest" node
}

export default function GrowthTimeline({ stageIndex, progressPct, harvestEmoji }: GrowthTimelineProps) {
  return (
    <div className="rounded-xl border border-garden-100 bg-garden-50/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-garden-500">Growth Timeline</p>
        <p className="text-[11px] font-extrabold text-garden-700">{progressPct}% grown</p>
      </div>
      <div className="flex flex-col">
        {GROWTH_STAGES.map((stage, i) => {
          const reached = i <= stageIndex;
          const isCurrent = i === stageIndex;
          const isLast = i === GROWTH_STAGES.length - 1;
          return (
            <div key={stage.key}>
              <div className={`flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors ${isCurrent ? 'bg-white shadow-panel' : ''}`}>
                <span
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm transition-colors
                    ${reached ? 'border-garden-500 bg-garden-100' : 'border-garden-200 bg-white/70 opacity-60 grayscale'}`}
                >
                  {i === GROWTH_STAGES.length - 1 && harvestEmoji ? harvestEmoji : stage.icon}
                </span>
                <span className={`text-xs font-bold ${reached ? 'text-garden-800' : 'text-garden-400'}`}>{stage.label}</span>
                {isCurrent && (
                  <span className="ml-auto rounded-full bg-garden-500 px-2 py-0.5 text-[9px] font-bold text-white">Now</span>
                )}
              </div>
              {!isLast && <div className={`ml-[24px] h-2.5 w-0.5 ${i < stageIndex ? 'bg-garden-500' : 'bg-garden-200'}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
