import { LeaderboardRow } from '../../types';

interface SocialTabProps {
  currentUserId: string;
  leafCount: number;
  equippedCosmeticsCount: number;
  rows: LeaderboardRow[];
  loading: boolean;
  onVisit: (row: LeaderboardRow) => void;
}

export default function SocialTab({ currentUserId, leafCount, equippedCosmeticsCount, rows, loading, onVisit }: SocialTabProps) {
  // Popularity is derived from real, existing fields (leaves received +
  // cosmetics equipped) since there's no dedicated "visits" table yet.
  const popularity = Math.min(100, leafCount * 6 + equippedCosmeticsCount * 4);
  const recentActivity = [...rows].sort((a, b) => b.leafCount - a.leafCount).slice(0, 5);

  return (
    <div>
      <h3 className="mb-3 text-sm font-extrabold text-garden-900">🍃 Social</h3>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon="🍃" label="Leaves received" value={leafCount} tone="garden" />
        <StatCard icon="✨" label="Garden popularity" value={`${popularity}%`} tone="gold" />
        <StatCard icon="🎨" label="Cosmetics shown" value={equippedCosmeticsCount} tone="sky" />
      </div>

      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-garden-500">🌻 Community activity</p>
      {loading ? (
        <p className="text-xs text-garden-500">Loading friend activity…</p>
      ) : recentActivity.length === 0 ? (
        <p className="text-xs text-garden-500">No garden activity yet — visit friends' gardens and drop a leaf to get things started!</p>
      ) : (
        <div className="space-y-2">
          {recentActivity.map(row => {
            const isMe = row.userId === currentUserId;
            return (
              <div key={row.userId} className="flex items-center justify-between rounded-xl border border-garden-100 bg-white/80 px-3 py-2 shadow-panel">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏡</span>
                  <div>
                    <p className="text-xs font-bold text-garden-900">{isMe ? 'You' : row.username}</p>
                    <p className="text-[10px] text-garden-500">🍃 {row.leafCount} leaves · {row.cropsGrown} crops grown</p>
                  </div>
                </div>
                {!isMe && (
                  <button
                    onClick={() => onVisit(row)}
                    className="rounded-full border border-garden-200 bg-garden-50 px-3 py-1 text-[11px] font-bold text-garden-800 transition hover:bg-garden-100"
                  >
                    Visit
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-garden-100 bg-white/80 p-3 text-[11px] font-semibold leading-relaxed text-garden-700">
        🍃 <strong>Leaf system:</strong> visit someone's garden and drop a leaf to give them +1 AgriCoin. The more leaves you receive, the more popular your garden becomes.
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: string; label: string; value: string | number; tone: 'garden' | 'gold' | 'sky' }) {
  const toneClasses: Record<string, string> = {
    garden: 'bg-garden-100 text-garden-800',
    gold: 'bg-gold-100 text-gold-700',
    sky: 'bg-sky-100 text-sky-700',
  };
  return (
    <div className={`rounded-xl p-3 text-center shadow-panel ${toneClasses[tone]}`}>
      <p className="text-lg">{icon}</p>
      <p className="text-base font-extrabold">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}
