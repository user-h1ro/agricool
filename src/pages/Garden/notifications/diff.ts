import { DailyQuest, GardenLayout, PestEvent } from '../types';
import { GardenNotification, GardenSnapshot } from './types';

export function buildSnapshot(
  layout: GardenLayout,
  activePests: PestEvent[],
  weatherLabel: string,
  dailyQuests: DailyQuest[],
  level: number,
): GardenSnapshot {
  return {
    plots: layout.map(p => ({ status: p.status, hp: p.hp, cropId: p.cropId })),
    pestKeys: activePests.map(p => `${p.plotIdx}:${p.expiresAt}`),
    weatherLabel,
    questProgress: Object.fromEntries(dailyQuests.map(q => [q.id, q.progress])),
    level,
  };
}

let counter = 0;
function makeId(type: string) {
  counter += 1;
  return `${type}-${Date.now()}-${counter}`;
}

// Compares a previous snapshot to the current one and returns any new
// notifications that should be raised. `prev === null` means this is the
// very first time we've ever seen this user's garden (e.g. first login) —
// in that case we deliberately raise nothing, so a garden that already has
// ready crops/pests doesn't flood a new session with a wall of alerts.
export function diffSnapshots(
  prev: GardenSnapshot | null,
  next: GardenSnapshot,
  layout: GardenLayout,
  activePests: PestEvent[],
  dailyQuests: DailyQuest[],
): GardenNotification[] {
  if (!prev) return [];
  const out: GardenNotification[] = [];
  const now = Date.now();

  // ── Crop ready to harvest / needs watering (per-plot transitions) ──────
  next.plots.forEach((plot, idx) => {
    const prevPlot = prev.plots[idx];
    if (!prevPlot || !plot.cropId) return;
    const full = layout[idx];

    if (prevPlot.status !== 'harvest_ready' && plot.status === 'harvest_ready') {
      out.push({
        id: makeId('ready'), type: 'crop_ready', icon: '🌱',
        title: 'Crop ready to harvest', message: `${full.emoji} ${full.name} is ready in Plot #${idx + 1}.`,
        createdAt: now, read: false, link: { kind: 'plot', plotIndex: idx },
      });
    }
    if (prevPlot.hp > 1 && plot.hp <= 1 && plot.status !== 'harvest_ready') {
      out.push({
        id: makeId('water'), type: 'needs_water', icon: '💧',
        title: 'Crop needs watering', message: `${full.emoji} ${full.name} in Plot #${idx + 1} is thirsty.`,
        createdAt: now, read: false, link: { kind: 'plot', plotIndex: idx },
      });
    }
  });

  // ── Pest attacks (new pest occurrences) ─────────────────────────────────
  activePests.forEach(pest => {
    const key = `${pest.plotIdx}:${pest.expiresAt}`;
    if (!prev.pestKeys.includes(key)) {
      const full = layout[pest.plotIdx];
      out.push({
        id: makeId('pest'), type: 'pest_attack', icon: '🐛',
        title: 'Pest attack detected', message: `${pest.emoji} ${pest.pestName} is attacking Plot #${pest.plotIdx + 1}${full?.name ? ` (${full.name})` : ''}.`,
        createdAt: now, read: false, link: { kind: 'plot', plotIndex: pest.plotIdx },
      });
    }
  });

  // ── Weather changed ──────────────────────────────────────────────────────
  if (prev.weatherLabel && next.weatherLabel && prev.weatherLabel !== next.weatherLabel) {
    out.push({
      id: makeId('weather'), type: 'weather_changed', icon: '🌦️',
      title: 'Weather changed', message: `Today's forecast is now ${next.weatherLabel}.`,
      createdAt: now, read: false, link: { kind: 'route', path: '/dashboard/climate' },
    });
  }

  // ── Daily quest completed ────────────────────────────────────────────────
  dailyQuests.forEach(q => {
    const prevProgress = prev.questProgress[q.id] ?? 0;
    if (prevProgress < q.target && q.progress >= q.target) {
      out.push({
        id: makeId('quest'), type: 'quest_completed', icon: '✅',
        title: 'Daily quest completed', message: `${q.icon} "${q.title}" is done — claim your reward!`,
        createdAt: now, read: false, link: { kind: 'quests' },
      });
    }
  });

  // ── Level up ──────────────────────────────────────────────────────────────
  if (next.level > prev.level) {
    out.push({
      id: makeId('level'), type: 'level_up', icon: '🏆',
      title: 'Level up!', message: `You reached Level ${next.level}. Keep it growing!`,
      createdAt: now, read: false, link: { kind: 'route', path: '/dashboard/tracker' },
    });
  }

  return out;
}
