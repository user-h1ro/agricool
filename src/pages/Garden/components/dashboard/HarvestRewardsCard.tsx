interface HarvestRewardsCardProps {
  coins: number;
  xp: number;
  qualityStars: number; // 1-5
  bonusPct: number;
  seasonLabel?: string;
}

export default function HarvestRewardsCard({ coins, xp, qualityStars, bonusPct, seasonLabel }: HarvestRewardsCardProps) {
  return (
    <div className="rounded-xl border border-gold-300 bg-gold-100/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold text-garden-700">🎁 Harvest Rewards</span>
        {!!bonusPct && seasonLabel && (
          <span className={`text-[10px] font-bold ${bonusPct > 0 ? 'text-garden-600' : 'text-red-600'}`}>
            {bonusPct > 0 ? '+' : ''}{bonusPct}% {seasonLabel}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-white/80 py-2">
          <p className="text-base font-extrabold text-gold-700">🪙 {coins}</p>
          <p className="text-[9px] font-bold uppercase tracking-wide text-garden-500">Coins</p>
        </div>
        <div className="rounded-lg bg-white/80 py-2">
          <p className="text-base font-extrabold text-sky-700">⭐ {xp}</p>
          <p className="text-[9px] font-bold uppercase tracking-wide text-garden-500">XP</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] font-bold text-garden-600">Quality</span>
        <span className="text-sm tracking-wide text-gold-500" aria-label={`${qualityStars} out of 5 stars`}>
          {'★'.repeat(qualityStars)}{'☆'.repeat(5 - qualityStars)}
        </span>
      </div>
      <p className="mt-1.5 text-[9px] font-semibold text-garden-500/70">Estimated — actual reward is set on harvest.</p>
    </div>
  );
}
