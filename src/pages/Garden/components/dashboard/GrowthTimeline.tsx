import { LifecycleStageDisplay } from './dashboardHelpers';

interface GrowthTimelineProps {
  stages: LifecycleStageDisplay[];
  progressPct: number; // 0-100 overall growth, for the header
  harvestEmoji?: string; // actual crop emoji, used for the final "Ready to Harvest" node
}

// Phase 3, item 1 — the full crop lifecycle timeline. Six named stages
// (Seeded → Sprouting → Vegetative → Flowering → Fruiting → Ready to
// Harvest), each showing its estimated day, progress, days remaining and
// current status. This is a richer read of the exact same growth math the
// tile art and progress bar already use (see computeLifecycleTimeline) —
// never a second, independent estimate.
export default function GrowthTimeline({ stages, progressPct, harvestEmoji }: GrowthTimelineProps) {
  return (
    <div className="rounded-xl border border-garden-100 bg-garden-50/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-garden-500">Crop Timeline</p>
        <p className="text-[11px] font-extrabold text-garden-700">{progressPct}% grown</p>
      </div>
      <div className="flex flex-col">
        {stages.map((stage, i) => {
          const isLast = i === stages.length - 1;
          const connectorFilled = stage.reached && !stage.isCurrent;

          let detail: string;
          if (stage.isCurrent && isLast) {
            detail = `Day ${stage.estimatedDay} · Ready now!`;
          } else if (stage.isCurrent) {
            detail = `Day ${stage.estimatedDay} · ${stage.progressPct}% through · ${stage.remainingDays} day${stage.remainingDays === 1 ? '' : 's'} left`;
          } else if (stage.reached) {
            detail = `Day ${stage.estimatedDay} · Done`;
          } else {
            detail = `Day ${stage.estimatedDay} · in ${stage.remainingDays} day${stage.remainingDays === 1 ? '' : 's'}`;
          }

          return (
            <div key={stage.key}>
              <div className={`flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors ${stage.isCurrent ? 'bg-white shadow-panel' : ''}`}>
                <span
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm transition-colors
                    ${stage.reached ? 'border-garden-500 bg-garden-100' : 'border-garden-200 bg-white/70 opacity-60 grayscale'}`}
                >
                  {isLast && harvestEmoji ? harvestEmoji : stage.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${stage.reached ? 'text-garden-800' : 'text-garden-400'}`}>{stage.label}</span>
                    {stage.isCurrent && (
                      <span className="rounded-full bg-garden-500 px-1.5 py-0.5 text-[9px] font-bold text-white">Now</span>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold text-garden-500">{detail}</p>
                </div>
              </div>
              {!isLast && <div className={`ml-[24px] h-2.5 w-0.5 ${connectorFilled ? 'bg-garden-500' : 'bg-garden-200'}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
