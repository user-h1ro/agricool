import { WeeklyGoal, WEEKLY_GOAL_REWARD } from '../dashboard/weeklyGoals';

interface FarmGoalsTabProps {
  goals: WeeklyGoal[];
  claimed: boolean;
  onClaim: () => void;
}

// Phase 3, item 10 — four weekly goals, each read from real counters
// (harvests/waterings this week, live average health, pest outbreaks) —
// see weeklyGoals.ts. The reward mirrors handleClaimEvent/handleClaimQuest:
// coins are awarded for real through the same addCoins() path; the XP
// figure is the same kind of informational number the Harvest Rewards card
// already shows (this module has no real XP ledger to write to).
export default function FarmGoalsTab({ goals, claimed, onClaim }: FarmGoalsTabProps) {
  const allDone = goals.every(g => g.done);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-garden-900">🎯 Weekly Farm Goals</h3>
        <p className="text-[11px] font-semibold text-garden-500">Resets every Monday</p>
      </div>

      <div className="flex flex-col gap-2">
        {goals.map(goal => {
          const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
          return (
            <div key={goal.id} className="rounded-xl border border-garden-100 bg-white/80 p-3 shadow-panel">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-bold text-garden-800">
                  <span>{goal.done ? '☑' : '☐'}</span> {goal.icon} {goal.label}
                </span>
                <span className="flex-shrink-0 text-[11px] font-bold text-garden-500">
                  {goal.current}{goal.unit}/{goal.target}{goal.unit}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-garden-100">
                <div
                  className={`h-full rounded-full transition-all ${goal.done ? 'bg-garden-500' : 'bg-sky-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-gold-300 bg-gold-100/60 p-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-garden-600">Reward</p>
          <p className="text-xs font-extrabold text-garden-800">⭐ {WEEKLY_GOAL_REWARD.xp} XP · 🪙 {WEEKLY_GOAL_REWARD.coins} Coins</p>
        </div>
        <button
          onClick={onClaim}
          disabled={!allDone || claimed}
          className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
            claimed
              ? 'cursor-not-allowed bg-garden-100 text-garden-400'
              : allDone
                ? 'bg-gold-500 text-white hover:bg-gold-600'
                : 'cursor-not-allowed bg-garden-50 text-garden-300'
          }`}
        >
          {claimed ? '✅ Claimed' : allDone ? 'Claim' : 'In progress'}
        </button>
      </div>
    </div>
  );
}
