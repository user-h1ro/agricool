import { FarmEvent } from '../dashboard/dashboardHelpers';

interface FarmCalendarTabProps {
  events: FarmEvent[];
}

function bucketLabel(dayOffset: number): string {
  if (dayOffset === 0) return 'Today';
  if (dayOffset === 1) return 'Tomorrow';
  return `In ${dayOffset} days`;
}

// Phase 3, items 3 & 7 — Farm Calendar and Harvest Forecast share the same
// shape (a day-bucketed feed of what happened / what's coming), so they're
// one tab: real completed actions under "Today", then upcoming stage
// changes and harvests grouped by day, straight from computeFarmEvents().
export default function FarmCalendarTab({ events }: FarmCalendarTabProps) {
  const completedToday = events.filter(e => e.dayOffset === 0 && e.kind === 'completed');
  const rest = events.filter(e => !(e.dayOffset === 0 && e.kind === 'completed'));

  const grouped = new Map<number, FarmEvent[]>();
  rest.forEach(e => {
    const arr = grouped.get(e.dayOffset) ?? [];
    arr.push(e);
    grouped.set(e.dayOffset, arr);
  });
  const futureOffsets = [...grouped.keys()].filter(d => d > 0).sort((a, b) => a - b).slice(0, 5);
  const todayOthers = grouped.get(0) ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-garden-900">📅 Farm Calendar</h3>
        <p className="text-[11px] font-semibold text-garden-500">Today, plus your harvest forecast</p>
      </div>

      {events.length === 0 && completedToday.length === 0 ? (
        <p className="rounded-xl border border-garden-100 bg-white/80 p-4 text-center text-xs text-garden-500">
          Plant a crop to see its stages and harvest date show up here.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="rounded-xl border border-garden-100 bg-white/80 p-3 shadow-panel">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-garden-500">Today</p>
            {completedToday.length === 0 && todayOthers.length === 0 ? (
              <p className="text-xs text-garden-400">Nothing yet today.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {completedToday.map(e => (
                  <p key={e.id} className="text-xs font-semibold text-garden-700">{e.icon} {e.text}</p>
                ))}
                {todayOthers.map(e => (
                  <p key={e.id} className="text-xs font-semibold text-gold-700">{e.icon} {e.text}</p>
                ))}
              </div>
            )}
          </div>

          {futureOffsets.map(offset => (
            <div key={offset} className="rounded-xl border border-garden-100 bg-white/80 p-3 shadow-panel">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-garden-500">{bucketLabel(offset)}</p>
              <div className="flex flex-col gap-1.5">
                {(grouped.get(offset) ?? []).slice(0, 4).map(e => (
                  <p key={e.id} className="text-xs font-semibold text-garden-700">{e.icon} {e.text}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
