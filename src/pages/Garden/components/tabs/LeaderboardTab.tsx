import { LeaderboardRow } from '../../types';

interface LeaderboardTabProps {
  currentUserId: string;
  rows: LeaderboardRow[];
  loading: boolean;
  onVisit: (row: LeaderboardRow) => void;
}

const rankEmoji = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`;

export default function LeaderboardTab({ currentUserId, rows, loading, onVisit }: LeaderboardTabProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-extrabold text-garden-900">🏆 Garden Leaderboard</h3>
      {loading ? (
        <p className="py-6 text-center text-xs text-garden-500">Loading rankings…</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => {
            const isMe = row.userId === currentUserId;
            return (
              <div
                key={row.userId}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 shadow-panel transition hover:-translate-y-0.5
                  ${isMe ? 'border-garden-300 bg-garden-50' : 'border-garden-100 bg-white/80'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{rankEmoji(i)}</span>
                  <div>
                    <p className={`text-sm ${isMe ? 'font-extrabold text-garden-900' : 'font-bold text-garden-800'}`}>{row.username}</p>
                    <p className="text-[10px] text-garden-500">{row.cropsGrown} crops · {row.equippedCosmetics} cosmetics · 🍃 {row.leafCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gold-100 px-2.5 py-1 text-xs font-bold text-gold-700">🪙 {row.coins}</span>
                  {!isMe && (
                    <button
                      onClick={() => onVisit(row)}
                      className="rounded-full border border-garden-200 bg-garden-50 px-3 py-1 text-[11px] font-bold text-garden-800 transition hover:bg-garden-100"
                    >
                      🏡 Visit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
