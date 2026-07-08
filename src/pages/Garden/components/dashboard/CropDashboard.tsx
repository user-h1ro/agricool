import { getCropConfig, getSeasonInfo } from '@/pages/GamifiedDashboard/cropConfig';
import { getCurrentSeason } from '../../helpers';
import { PestEvent, PlotCrop } from '../../types';
import {
  computeGrowthInfo, computeHealthInfo, computeWaterInfo, computePestInfo, computeHarvestEstimate,
} from './dashboardHelpers';
import GrowthTimeline from './GrowthTimeline';
import CropHealthCard from './CropHealthCard';
import WaterStatusCard from './WaterStatusCard';
import PestStatusCard from './PestStatusCard';
import HarvestRewardsCard from './HarvestRewardsCard';
import PlotActions from './PlotActions';

const RARITY_BY_STATUS: Record<string, { label: string; color: string }> = {
  growing: { label: 'Common', color: 'text-garden-600' },
  healthy: { label: 'Uncommon', color: 'text-sky-600' },
  harvest_ready: { label: 'Rare — ready!', color: 'text-gold-600' },
  wilted: { label: 'At risk', color: 'text-red-600' },
};

interface CropDashboardProps {
  plot: PlotCrop;
  plotIndex: number;
  pest: PestEvent | null;
  onWater: () => void;
  onFertilize: () => void;
  onDefend: (item: 'scarecrow' | 'pesticide') => void;
  onUpgrade: () => void;
  onHarvest: () => void;
  onRemove: () => void;
}

export default function CropDashboard({
  plot, plotIndex, pest, onWater, onFertilize, onDefend, onUpgrade, onHarvest, onRemove,
}: CropDashboardProps) {
  const crop = getCropConfig(plot.name);
  const currentMonth = new Date().getMonth();
  const seasonInfo = crop ? getSeasonInfo(crop, currentMonth) : undefined;
  const currentSeason = getCurrentSeason();

  const growth = computeGrowthInfo(plot, plotIndex, crop);
  const health = computeHealthInfo(plot, !!pest, seasonInfo);
  const water = computeWaterInfo(plot, !!pest);
  const pestInfo = computePestInfo(pest, crop);
  const harvest = computeHarvestEstimate(crop, seasonInfo, health.score);

  const protectionLabel = plot.defenseItem
    ? `${plot.defenseItem === 'scarecrow' ? '🧱 Scarecrow' : '🪲 Pesticide'} active`
    : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header: icon, name, rarity badge, day/growth progress */}
      <div>
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-garden-50 text-4xl shadow-inner">
            {plot.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-base font-extrabold text-garden-900">{plot.name}</p>
              <span className={`flex-shrink-0 text-[10px] font-bold ${RARITY_BY_STATUS[plot.status]?.color ?? 'text-garden-600'}`}>
                {RARITY_BY_STATUS[plot.status]?.label}
              </span>
            </div>
            <p className="text-xs font-semibold capitalize text-garden-600">
              {plot.status.replace('_', ' ')} · Day {growth.currentDay}/{growth.harvestDay}
            </p>
            <p className="text-[11px] font-bold text-garden-500">
              {growth.daysRemaining > 0 ? `${growth.daysRemaining} day${growth.daysRemaining === 1 ? '' : 's'} to harvest` : 'Ready now!'}
            </p>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-garden-100">
          <div className="h-full rounded-full bg-garden-500 transition-all" style={{ width: `${growth.progressPct}%` }} />
        </div>
      </div>

      <GrowthTimeline stageIndex={growth.stageIndex} progressPct={growth.progressPct} harvestEmoji={plot.emoji} />

      {/* Season row */}
      <div className="flex items-center justify-between rounded-xl border border-garden-100 bg-white px-3 py-2">
        <span className="text-[11px] font-bold text-garden-600">{currentSeason.icon} {currentSeason.name}</span>
        {seasonInfo && (
          <span className="text-[11px] font-bold" style={{ color: seasonInfo.color }}>
            {seasonInfo.emoji} {seasonInfo.label} ({seasonInfo.bonusPct > 0 ? '+' : ''}{seasonInfo.bonusPct}%)
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <CropHealthCard score={health.score} tier={health.tier} color={health.color} />
        <WaterStatusCard pct={water.pct} isEstimate={water.isEstimate} />
      </div>

      <PestStatusCard tier={pestInfo.tier} color={pestInfo.color} label={pestInfo.label} protection={protectionLabel} />

      <HarvestRewardsCard
        coins={harvest.coins}
        xp={harvest.xp}
        qualityStars={harvest.qualityStars}
        bonusPct={harvest.bonusPct}
        seasonLabel={seasonInfo?.label}
      />

      {/* Description + gameplay tip */}
      <div className="rounded-xl border border-garden-100 bg-white p-3">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-garden-500">About {plot.name}</p>
        <p className="text-xs text-garden-700">
          {crop?.description ?? 'A crop growing steadily in your garden.'}
        </p>
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-garden-50 p-2">
          <span className="text-sm">💡</span>
          <p className="text-[11px] font-semibold text-garden-700">
            {crop?.tip ?? 'Keep it watered and pest-free for the best results.'}
          </p>
        </div>
      </div>

      <PlotActions
        plot={plot}
        pest={pest}
        onWater={onWater}
        onFertilize={onFertilize}
        onDefend={onDefend}
        onUpgrade={onUpgrade}
        onHarvest={onHarvest}
        onRemove={onRemove}
      />
    </div>
  );
}
