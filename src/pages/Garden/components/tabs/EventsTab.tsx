import { COIN_REWARDS, SEASONAL_EVENTS } from '../../constants';
import { daysLeft } from '../../helpers';
import { SeasonalEvent } from '../../types';

interface EventsTabProps {
  claimedEvents: string[];
  onClaim: (event: SeasonalEvent) => void;
}

export default function EventsTab({ claimedEvents, onClaim }: EventsTabProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-extrabold text-garden-900">🌤️ Seasonal Events</h3>

      {SEASONAL_EVENTS.length === 0 ? (
        <div className="rounded-xl border border-dashed border-garden-200 bg-white/60 p-6 text-center">
          <p className="mb-1 text-2xl">📅</p>
          <p className="text-sm font-semibold text-garden-600">No active events right now</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {SEASONAL_EVENTS.map(ev => {
            const claimed = claimedEvents.includes(ev.id);
            const remaining = daysLeft(ev.endsAt);
            return (
              <div key={ev.id} className="rounded-xl border border-sky-200 bg-white/80 p-3 shadow-panel">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{ev.icon}</span>
                    <div>
                      <p className="text-sm font-extrabold text-sky-700">{ev.name}</p>
                      <p className="text-[10px] font-semibold text-sky-500">Ends in {remaining} day{remaining !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className="animate-pulse rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-700">LIVE 🔴</span>
                </div>
                <p className="mb-2 text-xs leading-relaxed text-garden-700">{ev.description}</p>
                <div className="mb-2 rounded-lg bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-700">
                  🎁 Reward: {ev.bonus}
                </div>
                {claimed ? (
                  <div className="rounded-lg border border-garden-200 bg-garden-50 px-2.5 py-1.5 text-[11px] font-bold text-garden-700">
                    ✅ Bonus claimed!
                  </div>
                ) : (
                  <button
                    onClick={() => onClaim(ev)}
                    className="w-full rounded-full bg-sky-600 py-1.5 text-xs font-bold text-white shadow-panel transition hover:bg-sky-700"
                  >
                    🎁 Claim Bonus (+{COIN_REWARDS.eventBonus} 🪙)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-gold-300 bg-white/80 p-3">
        <p className="mb-2 text-xs font-extrabold text-gold-700">🪙 How to earn AgriCoins</p>
        <div className="space-y-1.5">
          {[
            { action: 'Complete a daily task', reward: COIN_REWARDS.taskDone },
            { action: 'Verify a crop photo', reward: COIN_REWARDS.photoVerify },
            { action: 'Harvest a crop', reward: COIN_REWARDS.harvest },
            { action: 'Someone leaves a leaf on your garden', reward: COIN_REWARDS.leafReceived },
            { action: 'Claim a seasonal event bonus', reward: COIN_REWARDS.eventBonus },
          ].map(({ action, reward }) => (
            <div key={action} className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-garden-700">{action}</span>
              <span className="rounded-full bg-gold-100 px-2 py-0.5 font-bold text-gold-700">+{reward} 🪙</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
