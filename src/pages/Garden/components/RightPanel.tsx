import { AnimatePresence, motion } from 'framer-motion';
import { GardenLayout, PestEvent, TrackedCrop } from '../types';
import GardenOverview from './dashboard/GardenOverview';
import CropDashboard from './dashboard/CropDashboard';
import EmptyPlotPanel from './dashboard/EmptyPlotPanel';
import { computeGardenOverview } from './dashboard/dashboardHelpers';
import { DailyXPBreakdown } from '@/utilities/xpSystem';

interface RightPanelProps {
  selectedPlot: number | null;
  plot: GardenLayout[number] | null;
  pest: PestEvent | null;
  layout: GardenLayout;
  activePests: PestEvent[];
  trackedCrops: TrackedCrop[];
  hasAnyTrackedCrops: boolean;
  dailyXP: DailyXPBreakdown;
  onClose: () => void;
  onPlaceCrop: (crop: TrackedCrop) => void;
  onWater: () => void;
  onFertilize: () => void;
  onDefend: (item: 'scarecrow' | 'pesticide') => void;
  onUpgrade: () => void;
  onHarvest: () => void;
  onRemove: () => void;
}

// This panel is the Crop Tracking Dashboard: a Garden Overview when nothing
// is selected, and a full per-plot dashboard when a plot is selected. It is
// purely presentational — every number it shows is derived (read-only) from
// existing garden state and cropConfig.ts. All planting/harvesting/pest/
// defense actions are still handled by the exact same callbacks Garden.tsx
// already passes in; nothing about how those actions work has changed.
export default function RightPanel({
  selectedPlot, plot, pest, layout, activePests, trackedCrops, hasAnyTrackedCrops, dailyXP,
  onClose, onPlaceCrop, onWater, onFertilize, onDefend, onUpgrade, onHarvest, onRemove,
}: RightPanelProps) {
  const overviewStats = computeGardenOverview(layout, activePests);

  return (
    <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-white/60 bg-white/80 p-4 shadow-panel backdrop-blur-md">
      <AnimatePresence mode="wait">
        {selectedPlot === null || !plot ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <GardenOverview stats={overviewStats} dailyXP={dailyXP} />
          </motion.div>
        ) : (
          <motion.div
            key={selectedPlot}
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.18 }}
          >
            <div className="mb-3 flex items-start justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-garden-500">Plot #{selectedPlot + 1}</p>
              <button onClick={onClose} className="text-garden-400 hover:text-garden-700" aria-label="Close panel">✕</button>
            </div>

            {plot.cropId ? (
              <CropDashboard
                plot={plot}
                plotIndex={selectedPlot}
                pest={pest}
                onWater={onWater}
                onFertilize={onFertilize}
                onDefend={onDefend}
                onUpgrade={onUpgrade}
                onHarvest={onHarvest}
                onRemove={onRemove}
              />
            ) : (
              <EmptyPlotPanel
                trackedCrops={trackedCrops}
                hasAnyTrackedCrops={hasAnyTrackedCrops}
                onPlaceCrop={onPlaceCrop}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}