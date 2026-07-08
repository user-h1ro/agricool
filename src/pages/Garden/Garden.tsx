import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/supabase';
import { useAuth } from '@/context/AuthProvider';
import GardenTutorial from './GardenTutorial';

import TopHUD from './components/TopHUD';
import LeftToolbar from './components/LeftToolbar';
import GardenGrid from './components/GardenGrid';
import RightPanel from './components/RightPanel';
import BottomPanel from './components/BottomPanel';
import QuestsTab from './components/tabs/QuestsTab';
import EventsTab from './components/tabs/EventsTab';
import SocialTab from './components/tabs/SocialTab';
import LeaderboardTab from './components/tabs/LeaderboardTab';
import ShopPanel from './components/ShopPanel';
import InventoryPanel from './components/InventoryPanel';
import PlantMenu from './components/PlantMenu';
import VisitGardenModal from './components/VisitGardenModal';
import Toast from './components/Toast';

import { useFarmerLevel } from './hooks/useFarmerLevel';
import { useProfile } from './hooks/useProfile';
import { useGardenNotifications } from './hooks/useGardenNotifications';
import { GardenNotification } from './notifications/types';

import {
  COIN_REWARDS, DEFENSE_ITEMS, COSMETICS, SEASONAL_EVENTS, PESTS, DAILY_QUEST_DEFS,
} from './constants';
import {
  emptyGrid, emptyPlot, dbRowToState, stateToDbRow, dispatchCoinEvent, getTodaysWeather,
} from './helpers';
import {
  Cosmetic, DailyQuest, DailyQuestId, GardenState, LeaderboardRow, PestEvent,
  SeasonalEvent, ToolId, TrackedCrop,
} from './types';

// ── Daily quest local persistence ──────────────────────────────────────────
function todayKey() { return new Date().toISOString().slice(0, 10); }

function loadQuestProgress(userId: string): { progress: Record<DailyQuestId, number>; claimed: string[] } {
  try {
    const raw = localStorage.getItem(`agricool_garden_quests_${userId}_${todayKey()}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { progress: { harvest: 0, water: 0, defeat_pest: 0 }, claimed: [] };
}

function saveQuestProgress(userId: string, data: { progress: Record<DailyQuestId, number>; claimed: string[] }) {
  try { localStorage.setItem(`agricool_garden_quests_${userId}_${todayKey()}`, JSON.stringify(data)); } catch { /* ignore */ }
}

const Garden = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [trackedCrops, setTrackedCrops] = useState<TrackedCrop[]>([]);
  const [gardenState, setGardenState] = useState<GardenState | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [visitingRow, setVisitingRow] = useState<LeaderboardRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Layout / interaction state
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [openPanel, setOpenPanel] = useState<'shop' | 'decor' | 'inventory' | null>(null);
  const [bottomTab, setBottomTab] = useState(0);

  // Planting flow: choose a seed first, then tap an empty plot to place it
  const [showPlantMenu, setShowPlantMenu] = useState(false);
  const [plantingCrop, setPlantingCrop] = useState<TrackedCrop | null>(null);
  const [plantOnboardingSeen, setPlantOnboardingSeen] = useState(true);

  // Leaderboard (shared by the Social + Leaderboard bottom tabs)
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  // Daily quests
  const [questProgress, setQuestProgress] = useState<Record<DailyQuestId, number>>({ harvest: 0, water: 0, defeat_pest: 0 });
  const [claimedQuests, setClaimedQuests] = useState<string[]>([]);

  const profile = useProfile(user?.id, user?.email);
  const { xp, level, progress: xpProgress } = useFarmerLevel(user?.id);
  const navigate = useNavigate();

  // Doesn't depend on gardenState, so it's safe to compute before the
  // loading guard below — needed there by useGardenNotifications.
  const dailyQuests: DailyQuest[] = DAILY_QUEST_DEFS.map(def => ({ ...def, progress: questProgress[def.id] ?? 0 }));

  const {
    notifications, unreadCount, markRead, markAllRead,
  } = useGardenNotifications({
    userId: user?.id,
    layout: gardenState?.layout ?? [],
    activePests: gardenState?.activePests ?? [],
    weatherLabel: getTodaysWeather().label,
    dailyQuests,
    level: level.level,
  });

  // ── Load ──
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [cropRes, gardenRes] = await Promise.all([
      supabase.from('tracked_crops').select('id, name, emoji, status').eq('user_id', user.id),
      supabase.from('garden_state').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    const crops = (cropRes.data ?? []) as TrackedCrop[];
    setTrackedCrops(crops);

    const saved: GardenState = gardenRes.data
      ? dbRowToState(gardenRes.data)
      : { layout: emptyGrid(), coins: 0, equippedCosmetics: [], unlockedCosmetics: [], leafCount: 0, claimedEvents: [], activePests: [] };

    const occupiedIds = new Set(saved.layout.map(p => p.cropId).filter(Boolean));
    const newLayout = [...saved.layout];
    let changed = false;

    for (const crop of crops) {
      if (occupiedIds.has(crop.id)) continue;
      const emptyIdx = newLayout.findIndex(p => !p.cropId);
      if (emptyIdx === -1) break;
      newLayout[emptyIdx] = { cropId: crop.id, name: crop.name, emoji: crop.emoji, status: crop.status, hp: 3, defenseItem: null, defenseExpiresAt: null };
      changed = true;
    }

    const finalState = changed ? { ...saved, layout: newLayout } : saved;
    setGardenState(finalState);

    if (!gardenRes.data || changed) {
      await supabase.from('garden_state').upsert(stateToDbRow(user.id, finalState));
    }

    dispatchCoinEvent(0, finalState.coins);

    const { progress, claimed } = loadQuestProgress(user.id);
    setQuestProgress(progress);
    setClaimedQuests(claimed);

    const tutKey = `agricool_garden_tutorial_seen_${user.id}`;
    if (!localStorage.getItem(tutKey)) setShowTutorial(true);

    const plantHintKey = `agricool_garden_plant_hint_seen_${user.id}`;
    setPlantOnboardingSeen(!!localStorage.getItem(plantHintKey));

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (user) loadData(); }, [user?.id, loadData]);

  // ── Leaderboard (single fetch, reused across tabs) ──
  useEffect(() => {
    if (!user) return;
    supabase
      .from('garden_leaderboard')
      .select('user_id, username, coins, leaf_count, equipped_cosmetics, total_plots')
      .then(({ data, error }) => {
        if (error || !data) { setLeaderboardLoading(false); return; }
        setLeaderboardRows(data.map((r: any) => ({
          userId: r.user_id,
          username: r.username,
          coins: r.coins ?? 0,
          cropsGrown: r.total_plots ?? 0,
          equippedCosmetics: r.equipped_cosmetics ?? 0,
          leafCount: r.leaf_count ?? 0,
        })));
        setLeaderboardLoading(false);
      });
  }, [user?.id]);

  // ── Track last click position for coin particle origin ──
  const lastClickPos = useRef<{ x: number; y: number }>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  useEffect(() => {
    const handler = (e: MouseEvent) => { lastClickPos.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  // ── Persist helper ──
  const gardenStateRef = useRef<GardenState | null>(null);
  useEffect(() => { gardenStateRef.current = gardenState; }, [gardenState]);

  const update = useCallback(async (patch: Partial<GardenState>) => {
    if (!user || !gardenStateRef.current) return;
    const current = gardenStateRef.current;
    const prevCoins = current.coins;
    const next = { ...current, ...patch };
    gardenStateRef.current = next;
    setGardenState(next);
    await supabase.from('garden_state').upsert(stateToDbRow(user.id, next));
    if (next.coins !== prevCoins) {
      dispatchCoinEvent(next.coins - prevCoins, next.coins, lastClickPos.current);
    }
  }, [user]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const addCoins = (amount: number, reason: string) => {
    if (!gardenState) return;
    update({ coins: gardenState.coins + amount });
    showToast(`🪙 +${amount} coins — ${reason}`);
  };

  // ── Quest progress helper ──
  const bumpQuest = (id: DailyQuestId, amount = 1) => {
    if (!user) return;
    setQuestProgress(prev => {
      const next = { ...prev, [id]: prev[id] + amount };
      saveQuestProgress(user.id, { progress: next, claimed: claimedQuests });
      return next;
    });
  };

  const handleClaimQuest = (id: DailyQuestId) => {
    if (!user) return;
    const def = DAILY_QUEST_DEFS.find(q => q.id === id)!;
    if (questProgress[id] < def.target || claimedQuests.includes(id)) return;
    const nextClaimed = [...claimedQuests, id];
    setClaimedQuests(nextClaimed);
    saveQuestProgress(user.id, { progress: questProgress, claimed: nextClaimed });
    addCoins(def.coinReward, `Quest: ${def.title}`);
  };

  // ── Garden actions ──
  const handlePlaceCrop = (plotIdx: number, crop: TrackedCrop) => {
    if (!gardenState) return;
    const layout = [...gardenState.layout];
    layout[plotIdx] = { cropId: crop.id, name: crop.name, emoji: crop.emoji, status: crop.status, hp: 3, defenseItem: null, defenseExpiresAt: null };
    update({ layout });
    showToast(`🌱 ${crop.name} planted!`);
  };

  // Step 1: user picked a seed from the Plant menu — arm it and prompt them
  // to tap an empty plot (handled by the planting-mode banner + tile glow).
  const handleChooseCropToPlant = (crop: TrackedCrop) => {
    setPlantingCrop(crop);
    setShowPlantMenu(false);
    showToast(`🌱 ${crop.name} selected — tap a glowing empty plot to plant it`);
  };

  // Step 2: user tapped a plot while a seed was armed.
  const handlePlantAtPlot = (plotIdx: number) => {
    if (!gardenState || !plantingCrop) return;
    const target = gardenState.layout[plotIdx];
    if (target.cropId) { showToast('🌱 That plot already has a crop — pick an empty one.'); return; }
    handlePlaceCrop(plotIdx, plantingCrop);
    setPlantingCrop(null);
    setActiveTool(null);
    setSelectedPlot(plotIdx);
  };

  const handleCancelPlanting = () => {
    setPlantingCrop(null);
    setShowPlantMenu(false);
    setActiveTool(null);
  };

  const handleRemoveCrop = (plotIdx: number) => {
    if (!gardenState) return;
    const layout = [...gardenState.layout];
    layout[plotIdx] = emptyPlot();
    update({ layout });
  };

  const handleHarvest = (plotIdx: number) => {
    if (!gardenState) return;
    const plot = gardenState.layout[plotIdx];
    if (plot.status !== 'harvest_ready') return;
    const layout = [...gardenState.layout];
    layout[plotIdx] = emptyPlot();
    const bonus = gardenState.claimedEvents.includes('rainy_season') ? COIN_REWARDS.harvest * 2 : COIN_REWARDS.harvest;
    update({ layout, coins: gardenState.coins + bonus });
    showToast(`🌾 Harvested ${plot.name}! +${bonus} 🪙`);
    bumpQuest('harvest');
    setSelectedPlot(null);
  };

  const handleWater = (plotIdx: number) => {
    if (!gardenState) return;
    const plot = gardenState.layout[plotIdx];
    if (!plot.cropId) { showToast('💧 Nothing to water here yet.'); return; }
    const layout = [...gardenState.layout];
    layout[plotIdx] = { ...plot, hp: Math.min(3, plot.hp + 1) };
    update({ layout });
    showToast('💧 Watered! HP restored.');
    bumpQuest('water');
  };

  const handleFertilize = (plotIdx: number) => {
    if (!gardenState) return;
    const plot = gardenState.layout[plotIdx];
    if (!plot.cropId) { showToast('🌿 Nothing to fertilize here yet.'); return; }
    const layout = [...gardenState.layout];
    if (plot.status === 'growing') { layout[plotIdx] = { ...plot, status: 'healthy' }; showToast('🌿 Fertilized! Crop is thriving now.'); }
    else if (plot.status === 'healthy') { layout[plotIdx] = { ...plot, status: 'harvest_ready' }; showToast('🌿 Fertilized! Crop is ready to harvest.'); }
    else { showToast('🌿 This crop is already at its peak.'); return; }
    update({ layout });
  };

  const handleUpgrade = () => {
    showToast('🔧 Plot upgrades are coming soon!');
  };

  const handleDefendPlot = (plotIdx: number, item: 'scarecrow' | 'pesticide') => {
    if (!gardenState) return;
    const def = DEFENSE_ITEMS.find(d => d.id === item)!;
    if (gardenState.coins < def.cost) { showToast('❌ Not enough AgriCoins!'); return; }

    const layout = [...gardenState.layout];
    const expires = new Date(Date.now() + def.durationDays * 86_400_000).toISOString();
    layout[plotIdx] = { ...layout[plotIdx], defenseItem: item, defenseExpiresAt: expires, hp: Math.min(3, layout[plotIdx].hp + 1) };

    const hadPest = gardenState.activePests.some(p => p.plotIdx === plotIdx);
    const activePests = gardenState.activePests.filter(p => p.plotIdx !== plotIdx);
    update({ layout, coins: gardenState.coins - def.cost, activePests });
    showToast(`🛡️ ${def.name} placed! Crop HP restored.`);
    if (hadPest) bumpQuest('defeat_pest');
  };

  const handleBuyCosmetic = (item: Cosmetic) => {
    if (!gardenState) return;
    if (gardenState.coins < item.cost) { showToast('❌ Not enough AgriCoins!'); return; }
    const unlocked = [...gardenState.unlockedCosmetics, item.id];
    update({ coins: gardenState.coins - item.cost, unlockedCosmetics: unlocked });
    showToast(`✅ ${item.name} unlocked!`);
  };

  const handleEquipCosmetic = (id: string) => {
    if (!gardenState) return;
    update({ equippedCosmetics: [...gardenState.equippedCosmetics, id] });
  };

  const handleUnequipCosmetic = (id: string) => {
    if (!gardenState) return;
    update({ equippedCosmetics: gardenState.equippedCosmetics.filter(c => c !== id) });
  };

  const handleClaimEvent = async (ev: SeasonalEvent) => {
    if (!gardenState) return;
    if (gardenState.claimedEvents.includes(ev.id)) return;
    const claimedEvents = [...gardenState.claimedEvents, ev.id];
    const unlockedCosmetics = [...gardenState.unlockedCosmetics];
    if (ev.rewardCosmeticId && !unlockedCosmetics.includes(ev.rewardCosmeticId)) unlockedCosmetics.push(ev.rewardCosmeticId);
    await update({ claimedEvents, coins: gardenState.coins + COIN_REWARDS.eventBonus, unlockedCosmetics });
    showToast(`🎁 Event bonus claimed! +${COIN_REWARDS.eventBonus} 🪙`);
  };

  const handleDropLeaf = async () => {
    if (!user || !visitingRow) return;
    const { error } = await supabase.from('garden_leaves').insert({
      from_user_id: user.id,
      to_user_id: visitingRow.userId,
      dropped_day: new Date().toISOString().slice(0, 10),
    });
    if (error) {
      showToast(error.code === '23505' ? '🍃 You already left a leaf for them today!' : '❌ Could not drop leaf — try again');
      return;
    }
    const { data: ownerRow } = await supabase.from('garden_state').select('coins, leaf_count').eq('user_id', visitingRow.userId).maybeSingle();
    if (ownerRow) {
      await supabase.from('garden_state').upsert({
        user_id: visitingRow.userId,
        coins: (ownerRow.coins ?? 0) + COIN_REWARDS.leafReceived,
        leaf_count: (ownerRow.leaf_count ?? 0) + 1,
      });
    }
    showToast('🍃 Leaf dropped! +1 coin for them!');
  };

  const handleTutorialDone = () => {
    if (user) localStorage.setItem(`agricool_garden_tutorial_seen_${user.id}`, '1');
    setShowTutorial(false);
  };

  // ── Pest simulation (fires once per 24h) ──
  const pestSpawnedRef = useRef(false);
  useEffect(() => {
    if (!gardenState || pestSpawnedRef.current) return;
    pestSpawnedRef.current = true;
    if (gardenState.activePests.length > 0) return;

    const lastSpawnKey = `agricool_pest_spawn_${user?.id}`;
    const lastSpawn = parseInt(localStorage.getItem(lastSpawnKey) ?? '0', 10);
    if (Date.now() - lastSpawn < 24 * 60 * 60 * 1000) return;

    const occupiedPlots = gardenState.layout.map((p, i) => ({ p, i })).filter(({ p }) => p.cropId && !p.defenseItem);
    if (occupiedPlots.length > 0 && Math.random() > 0.5) {
      const target = occupiedPlots[Math.floor(Math.random() * occupiedPlots.length)];
      const pest = PESTS[Math.floor(Math.random() * PESTS.length)];
      const newPest: PestEvent = { plotIdx: target.i, pestName: pest.name, emoji: pest.emoji, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
      localStorage.setItem(lastSpawnKey, String(Date.now()));
      update({ activePests: [...gardenState.activePests, newPest] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gardenState]);

  // ── Pest expiry enforcement ──
  useEffect(() => {
    if (!gardenState) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const expiredPests = gardenState.activePests.filter(p => p.expiresAt < now);
      if (expiredPests.length === 0) return;
      const layout = [...gardenState.layout];
      expiredPests.forEach(pest => {
        const plot = layout[pest.plotIdx];
        if (!plot?.cropId) return;
        layout[pest.plotIdx] = { ...plot, hp: Math.max(0, plot.hp - 1) };
      });
      const remainingPests = gardenState.activePests.filter(p => p.expiresAt >= now);
      update({ layout, activePests: remainingPests });
      showToast(`🐛 ${expiredPests.length} pest${expiredPests.length > 1 ? 's' : ''} caused damage while undefended!`);
    }, 60_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gardenState]);

  // ── Left toolbar handlers ──
  const handleSelectTool = (tool: ToolId) => {
    if (tool === 'shop') { setOpenPanel('shop'); setActiveTool(null); return; }
    if (tool === 'decorations') { setOpenPanel('decor'); setActiveTool(null); return; }
    if (tool === 'inventory') { setOpenPanel('inventory'); setActiveTool(null); return; }
    if (tool === 'plant') {
      if (activeTool === 'plant') { handleCancelPlanting(); return; }
      setActiveTool('plant');
      setPlantingCrop(null);
      setShowPlantMenu(true);
      if (user && !plantOnboardingSeen) {
        localStorage.setItem(`agricool_garden_plant_hint_seen_${user.id}`, '1');
        setPlantOnboardingSeen(true);
      }
      return;
    }
    setActiveTool(prev => (prev === tool ? null : tool));
  };

  const handleToolApply = (idx: number, tool: ToolId) => {
    if (tool === 'plant') { handlePlantAtPlot(idx); return; }
    if (tool === 'water') handleWater(idx);
    else if (tool === 'fertilizer') handleFertilize(idx);
    else if (tool === 'pesticide') handleDefendPlot(idx, 'pesticide');
    else if (tool === 'scarecrow') handleDefendPlot(idx, 'scarecrow');
    setSelectedPlot(idx);
  };

  if (!user || loading || !gardenState) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-garden-200 border-t-garden-600" />
          <p className="text-sm font-semibold text-garden-500">Loading your garden…</p>
        </div>
      </div>
    );
  }

  const selectedPlotData = selectedPlot !== null ? gardenState.layout[selectedPlot] : null;
  const selectedPest = selectedPlot !== null ? gardenState.activePests.find(p => p.plotIdx === selectedPlot) ?? null : null;

  const plantedCropIds = new Set(gardenState.layout.map(p => p.cropId).filter(Boolean) as string[]);
  const availableCropsToPlant = trackedCrops.filter(c => c.status !== 'wilted' && !plantedCropIds.has(c.id));
  const showPlantOnboarding = !plantOnboardingSeen && gardenState.layout.every(p => !p.cropId) && trackedCrops.length > 0;

  const questsClaimable = dailyQuests.filter(q => q.progress >= q.target && !claimedQuests.includes(q.id)).length;
  const eventsClaimable = SEASONAL_EVENTS.filter(ev => !gardenState.claimedEvents.includes(ev.id)).length;

  // Notification click -> mark read, then follow wherever it points. This
  // never touches game state itself, only navigation/selection.
  const handleSelectNotification = (n: GardenNotification) => {
    markRead(n.id);
    if (n.link.kind === 'plot') {
      setSelectedPlot(n.link.plotIndex);
    } else if (n.link.kind === 'quests') {
      setBottomTab(0);
      document.getElementById('garden-bottom-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (n.link.kind === 'route') {
      navigate(n.link.path);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-5 sm:py-6">
      {showTutorial && <GardenTutorial onComplete={handleTutorialDone} onSkip={handleTutorialDone} />}

      {visitingRow && (
        <VisitGardenModal row={visitingRow} onClose={() => setVisitingRow(null)} onDropLeaf={handleDropLeaf} />
      )}

      {openPanel === 'shop' && (
        <ShopPanel
          coins={gardenState.coins}
          equipped={gardenState.equippedCosmetics}
          unlocked={gardenState.unlockedCosmetics}
          onEquip={handleEquipCosmetic}
          onUnequip={handleUnequipCosmetic}
          onBuy={handleBuyCosmetic}
          onClose={() => setOpenPanel(null)}
        />
      )}
      {openPanel === 'decor' && (
        <ShopPanel
          coins={gardenState.coins}
          equipped={gardenState.equippedCosmetics}
          unlocked={gardenState.unlockedCosmetics}
          filterCategories={['fence', 'border', 'tool']}
          onEquip={handleEquipCosmetic}
          onUnequip={handleUnequipCosmetic}
          onBuy={handleBuyCosmetic}
          onClose={() => setOpenPanel(null)}
        />
      )}
      {openPanel === 'inventory' && (
        <InventoryPanel trackedCrops={trackedCrops} onClose={() => setOpenPanel(null)} />
      )}

      {showPlantMenu && (
        <PlantMenu
          availableCrops={availableCropsToPlant}
          hasAnyTrackedCrops={trackedCrops.length > 0}
          onSelect={handleChooseCropToPlant}
          onClose={handleCancelPlanting}
        />
      )}

      <Toast message={toast} />

      <TopHUD
        username={profile.username}
        avatarUrl={profile.avatarUrl}
        coins={gardenState.coins}
        xp={xp}
        level={level}
        progress={xpProgress}
        pestCount={gardenState.activePests.length}
        notifications={notifications}
        unreadNotifications={unreadCount}
        onSelectNotification={handleSelectNotification}
        onMarkAllNotificationsRead={markAllRead}
      />

      {gardenState.equippedCosmetics.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-garden-500">Equipped:</span>
          {gardenState.equippedCosmetics.map(id => {
            const c = COSMETICS.find(x => x.id === id);
            return c ? (
              <span key={id} className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                {c.icon} {c.name}
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Main dashboard layout: left tools · grid · right panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[64px_1fr_300px]">
        <div className="order-2 lg:order-1">
          <LeftToolbar activeTool={activeTool} onSelectTool={handleSelectTool} orientation="horizontal" onboardingToolId={showPlantOnboarding ? 'plant' : null} />
        </div>

        <div className="order-1 lg:order-2">
          <GardenGrid
            layout={gardenState.layout}
            activePests={gardenState.activePests}
            equippedCosmetics={gardenState.equippedCosmetics}
            selectedPlot={selectedPlot}
            onSelectPlot={setSelectedPlot}
            activeTool={activeTool}
            onToolApply={handleToolApply}
            plantingCrop={plantingCrop}
            onCancelPlanting={handleCancelPlanting}
          />
        </div>

        <div className="order-3">
          <RightPanel
            selectedPlot={selectedPlot}
            plot={selectedPlotData}
            pest={selectedPest}
            layout={gardenState.layout}
            activePests={gardenState.activePests}
            trackedCrops={availableCropsToPlant}
            hasAnyTrackedCrops={trackedCrops.length > 0}
            onClose={() => setSelectedPlot(null)}
            onPlaceCrop={crop => selectedPlot !== null && handlePlaceCrop(selectedPlot, crop)}
            onWater={() => selectedPlot !== null && handleWater(selectedPlot)}
            onFertilize={() => selectedPlot !== null && handleFertilize(selectedPlot)}
            onDefend={item => selectedPlot !== null && handleDefendPlot(selectedPlot, item)}
            onUpgrade={handleUpgrade}
            onHarvest={() => selectedPlot !== null && handleHarvest(selectedPlot)}
            onRemove={() => selectedPlot !== null && handleRemoveCrop(selectedPlot)}
          />
        </div>
      </div>

      <div id="garden-bottom-panel">
        <BottomPanel
          activeTab={bottomTab}
          onChangeTab={setBottomTab}
          questsBadge={questsClaimable}
          eventsBadge={eventsClaimable}
        >
          {tab => {
            if (tab === 0) return <QuestsTab quests={dailyQuests} onClaim={handleClaimQuest} claimed={claimedQuests} />;
            if (tab === 1) return <EventsTab claimedEvents={gardenState.claimedEvents} onClaim={handleClaimEvent} />;
            if (tab === 2) return (
              <SocialTab
                currentUserId={user.id}
                leafCount={gardenState.leafCount}
                equippedCosmeticsCount={gardenState.equippedCosmetics.length}
                rows={leaderboardRows}
                loading={leaderboardLoading}
                onVisit={setVisitingRow}
              />
            );
            return <LeaderboardTab currentUserId={user.id} rows={leaderboardRows} loading={leaderboardLoading} onVisit={setVisitingRow} />;
          }}
        </BottomPanel>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => { if (user) localStorage.removeItem(`agricool_garden_tutorial_seen_${user.id}`); setShowTutorial(true); }}
          className="rounded-full border border-garden-200 bg-white/70 px-4 py-2 text-xs font-bold text-garden-600 shadow-panel transition hover:bg-garden-50"
        >
          🎓 Replay Tutorial
        </button>
      </div>
    </div>
  );
};

export default Garden;