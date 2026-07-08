import {
  Box, Flex, Heading, HStack, Text, VStack, Badge, Button,
  Spinner, Center, Input, Tabs,
} from '@chakra-ui/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useRevenue } from '@/context/RevenueProvider';
import { ALMANAC_CROPS } from '@/pages/Almanac/data';
import GamifiedTutorial from './GamifiedTutorial';
import { QueueCropModal } from './QueueCropModal';

// ─── Types ────────────────────────────────────────────────────────────────────
type CropStatus = 'healthy' | 'wilted' | 'growing' | 'harvest_ready';

type TrackedCrop = {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  initial_day: number;
  queued_at: string;
  progress_points: number;
  status: CropStatus;
  last_verified_at: string | null;
  last_verified_window: number;
  verification_pending: boolean;
  last_photo_url: string | null;
  // streak: consecutive 3-day windows verified without wilting
  streak: number;
};

type Task = {
  id: string;
  user_id: string;
  label: string;
  crop: string;
  due: string;
  due_time: string | null;
  done: boolean;
  failed: boolean;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
};

// Journal entry — one row per verified milestone photo
type JournalEntry = {
  id: string;
  crop_id: string;
  user_id: string;
  crop_name: string;
  crop_emoji: string;
  day_number: number;
  photo_url: string;
  ai_health_note: string | null;
  verified_at: string;
};

// Leaderboard row from DB view
type LeaderboardRow = {
  user_id: string;
  username: string;
  total_points: number;
  total_tokens: number;
  crops_harvested: number;
};


// ─── Gamification System ─────────────────────────────────────────────────────

const XP_TABLE = {
  verify:        40,
  recovery:      15,
  harvest:      120,
  taskDone:      10,
  streakBonus:   60,
  tokenEarned:   25,
  questComplete: 80,
};

const FARMER_LEVELS = [
  { level: 1,  min: 0,    title: 'Seedling',        color: '#86efac', icon: '🌱' },
  { level: 2,  min: 100,  title: 'Sprout',           color: '#4ade80', icon: '🌿' },
  { level: 3,  min: 250,  title: 'Tender',           color: '#22c55e', icon: '🪴' },
  { level: 4,  min: 500,  title: 'Cultivator',       color: '#16a34a', icon: '🧑‍🌾' },
  { level: 5,  min: 900,  title: 'Field Hand',       color: '#15803d', icon: '🚜' },
  { level: 6,  min: 1400, title: 'Crop Master',      color: '#166534', icon: '🌾' },
  { level: 7,  min: 2000, title: 'Agri Veteran',     color: '#f59e0b', icon: '⭐' },
  { level: 8,  min: 3000, title: 'Harvest Champion', color: '#f97316', icon: '🏆' },
  { level: 9,  min: 4500, title: 'Farm Legend',      color: '#ef4444', icon: '🔥' },
  { level: 10, min: 7000, title: 'Harvest King',     color: '#a855f7', icon: '👑' },
];

function getFarmerLevel(xp: number) {
  for (let i = FARMER_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= FARMER_LEVELS[i].min) return FARMER_LEVELS[i];
  }
  return FARMER_LEVELS[0];
}

function getXpToNextLevel(xp: number): { current: number; needed: number; pct: number } {
  const cur = getFarmerLevel(xp);
  const nextIdx = FARMER_LEVELS.findIndex(l => l.level === cur.level) + 1;
  if (nextIdx >= FARMER_LEVELS.length) return { current: xp - cur.min, needed: 0, pct: 100 };
  const next = FARMER_LEVELS[nextIdx];
  const current = xp - cur.min;
  const needed = next.min - cur.min;
  return { current, needed, pct: Math.min(100, (current / needed) * 100) };
}

// ── XP: Supabase-backed (localStorage as fast cache, DB as source of truth) ──
async function loadFarmerXPFromDB(userId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('farmer_progress')
      .select('xp')
      .eq('user_id', userId)
      .maybeSingle();
    const xp = data?.xp ?? 0;
    // keep local cache in sync
    try { localStorage.setItem(`agricool_xp_${userId}`, String(xp)); } catch {}
    return xp;
  } catch {
    // fall back to cache
    try { return parseInt(localStorage.getItem(`agricool_xp_${userId}`) ?? '0') || 0; } catch { return 0; }
  }
}

function getFarmerXP(userId: string): number {
  // fast local read — caller should hydrate from DB on mount
  try { return parseInt(localStorage.getItem(`agricool_xp_${userId}`) ?? '0') || 0; } catch { return 0; }
}

async function addFarmerXPToDB(
  userId: string,
  amount: number,
): Promise<{ newXp: number; leveledUp: boolean; newLevel: typeof FARMER_LEVELS[0] | null }> {
  // BUG FIX: always read XP from DB (source of truth) before computing the new
  // value.  The old code read only from localStorage, which starts at 0 on every
  // fresh page load BEFORE loadFarmerXPFromDB has had a chance to hydrate it.
  // That caused the level comparison to treat current XP as 0, so any award
  // appeared to "level up" from level 1 even when the user was already higher.
  const old = await loadFarmerXPFromDB(userId);
  const oldLevel = getFarmerLevel(old);
  const newXp = old + amount;
  const newLevel = getFarmerLevel(newXp);
  // update local cache immediately for responsive UI
  try { localStorage.setItem(`agricool_xp_${userId}`, String(newXp)); } catch {}
  // persist to DB (upsert into farmer_progress)
  supabase.from('farmer_progress').upsert({ user_id: userId, xp: newXp });
  const leveledUp = newLevel.level > oldLevel.level;
  return { newXp, leveledUp, newLevel: leveledUp ? newLevel : null };
}

// Legacy sync shim — only used for non-async reads before DB hydration
function addFarmerXP(userId: string, amount: number): { newXp: number; leveledUp: boolean; newLevel: typeof FARMER_LEVELS[0] | null } {
  const old = getFarmerXP(userId);
  const oldLevel = getFarmerLevel(old);
  const newXp = old + amount;
  const newLevel = getFarmerLevel(newXp);
  try { localStorage.setItem(`agricool_xp_${userId}`, String(newXp)); } catch {}
  supabase.from('farmer_progress').upsert({ user_id: userId, xp: newXp });
  const leveledUp = newLevel.level > oldLevel.level;
  return { newXp, leveledUp, newLevel: leveledUp ? newLevel : null };
}

// ── AgriCoin bridge: award coins in garden_state from tracker actions ─────────
async function awardGardenCoins(userId: string, amount: number): Promise<void> {
  try {
    const { data } = await supabase
      .from('garden_state')
      .select('coins')
      .eq('user_id', userId)
      .maybeSingle();
    if (data != null) {
      await supabase.from('garden_state').upsert({
        user_id: userId,
        coins: (data.coins ?? 0) + amount,
      });
    }
  } catch { /* silent — garden may not be initialised yet */ }
}

// ─── Achievement System ───────────────────────────────────────────────────────
type Achievement = {
  id: string; icon: string; title: string; desc: string; xp: number; rarity: 'common' | 'rare' | 'epic' | 'legendary';
};
const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_verify',   icon: '📸', title: 'First Proof',       desc: 'Submit your first verification photo',         xp: 50,   rarity: 'common'    },
  { id: 'first_token',    icon: '🎟️', title: 'Token Farmer',      desc: 'Earn your first Free Listing Token',           xp: 75,   rarity: 'common'    },
  { id: 'first_harvest',  icon: '🌾', title: 'First Harvest',     desc: 'Harvest your first crop',                      xp: 150,  rarity: 'rare'      },
  { id: 'streak_3',       icon: '🔥', title: 'Hot Streak',        desc: 'Reach a 3-window verification streak',        xp: 100,  rarity: 'rare'      },
  { id: 'streak_5',       icon: '💥', title: 'On Fire',           desc: 'Reach a 5-window streak on one crop',         xp: 200,  rarity: 'epic'      },
  { id: 'recovery_hero',  icon: '💪', title: 'Recovery Hero',     desc: 'Bring a wilted crop back to life',            xp: 80,   rarity: 'common'    },
  { id: 'full_queue',     icon: '🌿', title: 'Full House',        desc: 'Fill your entire crop queue',                 xp: 120,  rarity: 'rare'      },
  { id: 'task_perfect',   icon: '✅', title: 'Perfect Day',       desc: 'Complete all tasks in a day with zero fails', xp: 90,   rarity: 'rare'      },
  { id: 'three_harvests', icon: '🏅', title: 'Triple Harvest',    desc: 'Harvest 3 different crops',                   xp: 300,  rarity: 'epic'      },
  { id: 'five_tokens',    icon: '💰', title: 'Token Hoarder',     desc: 'Accumulate 5 Free Listing Tokens',            xp: 200,  rarity: 'epic'      },
  { id: 'level_5',        icon: '⭐', title: 'Halfway There',     desc: 'Reach Farmer Level 5',                        xp: 250,  rarity: 'epic'      },
  { id: 'harvest_king',   icon: '👑', title: 'Harvest King',      desc: 'Reach the maximum Farmer Level 10',           xp: 1000, rarity: 'legendary' },
];

function getUnlockedAchievements(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`agricool_achievements_${userId}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

async function loadAchievementsFromDB(userId: string): Promise<Set<string>> {
  try {
    const { data } = await supabase
      .from('farmer_progress')
      .select('achievements')
      .eq('user_id', userId)
      .maybeSingle();
    const ids: string[] = data?.achievements ?? [];
    try { localStorage.setItem(`agricool_achievements_${userId}`, JSON.stringify(ids)); } catch {}
    return new Set(ids);
  } catch {
    return getUnlockedAchievements(userId);
  }
}

function unlockAchievement(userId: string, id: string): boolean {
  const unlocked = getUnlockedAchievements(userId);
  if (unlocked.has(id)) return false;
  unlocked.add(id);
  const arr = [...unlocked];
  try { localStorage.setItem(`agricool_achievements_${userId}`, JSON.stringify(arr)); } catch {}
  // persist to DB — onConflict ensures the full achievements array is written
  supabase.from('farmer_progress').upsert(
    { user_id: userId, achievements: arr },
    { onConflict: 'user_id' }
  );
  return true;
}

// ─── Daily Quest System ───────────────────────────────────────────────────────
type DailyQuest = {
  id: string; icon: string; title: string; desc: string;
  target: number; xp: number; type: 'verify' | 'task' | 'streak' | 'token';
};

const QUEST_POOL: DailyQuest[] = [
  { id: 'q_verify_1', icon: '📸', title: 'Proof of Life',   desc: 'Submit 1 verification photo today',            target: 1, xp: 80,  type: 'verify' },
  { id: 'q_task_3',   icon: '✅', title: 'Task Crusher',    desc: 'Complete 3 tasks today',                       target: 3, xp: 60,  type: 'task'   },
  { id: 'q_task_5',   icon: '🏃', title: 'Farm Sprint',     desc: 'Complete 5 tasks in one day',                  target: 5, xp: 100, type: 'task'   },
  { id: 'q_streak_1', icon: '🔥', title: 'Keep It Burning', desc: 'Maintain any active streak',                   target: 1, xp: 50,  type: 'streak' },
  { id: 'q_token_1',  icon: '🎟️', title: 'Token Run',       desc: 'Earn a Free Listing Token today',              target: 1, xp: 120, type: 'token'  },
  { id: 'q_verify_2', icon: '📷', title: 'Double Exposure', desc: 'Submit 2 verification photos today',           target: 2, xp: 150, type: 'verify' },
  { id: 'q_task_all', icon: '⚡', title: 'Zero Fails',      desc: 'Complete all tasks today without any failing', target: 1, xp: 90,  type: 'task'   },
];

// QuestProgress: { [questId]: { progress: number; completed: boolean } }
type QuestProgressMap = Record<string, { progress: number; completed: boolean }>;

function getDailyQuests(userId: string): DailyQuest[] {
  const today = new Date().toISOString().slice(0, 10);
  const key = `agricool_quests_${userId}_${today}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  const dateNum = parseInt(today.replace(/-/g, ''));
  const q1 = QUEST_POOL[dateNum % QUEST_POOL.length];
  const q2 = QUEST_POOL[(dateNum + 2) % QUEST_POOL.length];
  const q3 = QUEST_POOL[(dateNum + 4) % QUEST_POOL.length];
  const quests = [q1, q2, q3].filter((q, i, a) => a.findIndex(x => x.id === q.id) === i).slice(0, 3);
  try { localStorage.setItem(key, JSON.stringify(quests)); } catch {}
  return quests;
}

function getQuestProgress(userId: string): QuestProgressMap {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(`agricool_quest_progress_${userId}_${today}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveQuestProgress(userId: string, progress: QuestProgressMap) {
  const today = new Date().toISOString().slice(0, 10);
  try { localStorage.setItem(`agricool_quest_progress_${userId}_${today}`, JSON.stringify(progress)); } catch {}
  // also persist to DB
  supabase.from('farmer_progress').upsert({
    user_id: userId,
    quest_progress_date: today,
    quest_progress: progress,
  });
}

// ─── NTP-synced Server Clock ──────────────────────────────────────────────────
let _ntpOffsetMs = 0;
let _ntpSynced   = false;

async function syncNTPClock(): Promise<void> {
  try {
    const before = Date.now();
    const res  = await fetch('https://worldtimeapi.org/api/timezone/Asia/Manila');
    const after = Date.now();
    if (!res.ok) return;
    const data = await res.json();
    const serverMs = data.unixtime * 1000 + (after - before) / 2;
    _ntpOffsetMs = serverMs - after;
    _ntpSynced   = true;
  } catch {
    // silently keep offset = 0
  }
}

function serverNow(): Date {
  return new Date(Date.now() + _ntpOffsetMs);
}

// ─── Task window helpers ───────────────────────────────────────────────────────
type TaskWindowState = 'pending' | 'active' | 'expired' | 'done' | 'failed' | 'manual';

const TASK_WINDOW_MS = 15 * 60 * 1000; // ±15 minutes (farmer-friendly)

function getTaskWindowState(task: Task, now: Date): TaskWindowState {
  if (task.failed) return 'failed';
  if (task.done)   return 'done';
  if (!task.due_time) return 'manual';
  const due   = new Date(task.due_time).getTime();
  const nowMs = now.getTime();
  if (nowMs < due - TASK_WINDOW_MS) return 'pending';
  if (nowMs <= due + TASK_WINDOW_MS) return 'active';
  return 'expired';
}

function buildDueTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const d = serverNow();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

// ─── Almanac notification templates per crop ──────────────────────────────────
const CROP_NOTIFICATIONS: Record<string, { time: string; message: string }[]> = {
  Pechay:   [
    { time: '06:00', message: 'Water Pechay at the base — avoid wetting the leaves to prevent rot.' },
    { time: '10:00', message: 'Deploy shade nets over Pechay — midday heat scorches delicate leaves.' },
    { time: '16:00', message: 'Check Pechay for aphids and apply neem oil spray if spotted.' },
  ],
  Kamatis:  [
    { time: '07:00', message: 'Water Kamatis deeply at the base — wet foliage invites blight.' },
    { time: '09:00', message: 'Inspect Kamatis and pinch off suckers for larger fruit development.' },
    { time: '15:00', message: 'Check Kamatis stakes — fruits add weight and plants can topple.' },
  ],
  Sitaw:    [
    { time: '06:30', message: 'Water Sitaw thoroughly — pods need consistent moisture.' },
    { time: '11:00', message: 'Rotate Sitaw trellis or reposition pots for uniform sunlight exposure.' },
    { time: '16:30', message: 'Weed around Sitaw — competing plants reduce your bean yield.' },
  ],
  Ampalaya: [
    { time: '06:00', message: 'Water Ampalaya — it thrives on morning moisture.' },
    { time: '10:30', message: 'Deploy shade net for Ampalaya; high heat causes flower drop.' },
    { time: '15:00', message: 'Inspect Ampalaya vines and remove dead tendrils to encourage growth.' },
  ],
  Kangkong: [
    { time: '07:00', message: 'Flood-water Kangkong beds — this semi-aquatic crop loves wet feet.' },
    { time: '12:00', message: 'Trim outer Kangkong shoots to keep the plant bushy and productive.' },
  ],
  Kamote:   [
    { time: '07:30', message: 'Apply organic compost around Kamote base for tuber development.' },
    { time: '14:00', message: 'Check Kamote soil moisture — tubers crack in inconsistent watering.' },
  ],
  Talong:   [
    { time: '06:30', message: 'Water Talong at the base — heavy moisture supports fruit set.' },
    { time: '10:00', message: 'Stake Talong branches — eggplants become heavy when fruiting.' },
    { time: '15:30', message: 'Apply foliar nutrients to Talong for deeper purple skin color.' },
  ],
  Patola:   [
    { time: '07:00', message: 'Water Patola thoroughly and check trellis tension for vine support.' },
    { time: '11:30', message: 'Rotate Patola vines to ensure all leaves get sunlight.' },
  ],
  Upo:      [
    { time: '06:00', message: 'Deep-water Upo — large fruit needs heavy moisture.' },
    { time: '13:00', message: 'Inspect Upo for borers; treat with organic spray if tunnels appear.' },
  ],
  Mustasa:  [
    { time: '06:30', message: 'Water Mustasa lightly — overwatering causes bitter leaves.' },
    { time: '10:00', message: 'Deploy partial shade net on Mustasa to prevent leaf burn.' },
    { time: '16:00', message: 'Harvest outer Mustasa leaves to extend the plant\'s productive life.' },
  ],
};

const DEFAULT_NOTIFICATIONS = [
  { time: '08:00', message: 'Check on your crop — morning is the best time to spot early issues.' },
  { time: '15:00', message: 'Afternoon check: look for pests, wilting, or discoloration.' },
];

// ─── Crop Options ─────────────────────────────────────────────────────────────
const CROP_OPTIONS = [
  { name: 'Pechay',   emoji: '🥬', harvestDays: 35 },
  { name: 'Kamatis',  emoji: '🍅', harvestDays: 70 },
  { name: 'Sitaw',    emoji: '🫘', harvestDays: 55 },
  { name: 'Ampalaya', emoji: '🥒', harvestDays: 65 },
  { name: 'Kangkong', emoji: '🌿', harvestDays: 28 },
  { name: 'Kamote',   emoji: '🍠', harvestDays: 90 },
  { name: 'Talong',   emoji: '🍆', harvestDays: 75 },
  { name: 'Patola',   emoji: '🥗', harvestDays: 60 },
  { name: 'Upo',      emoji: '🥦', harvestDays: 80 },
  { name: 'Mustasa',  emoji: '🌱', harvestDays: 30 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDaysSinceQueued(crop: TrackedCrop): number {
  const queuedAt = new Date(crop.queued_at).getTime();
  const effectivePlanted = queuedAt - crop.initial_day * 86400000;
  return Math.floor((Date.now() + _ntpOffsetMs - effectivePlanted) / 86400000);
}

function getCurrentWindow(crop: TrackedCrop): number {
  return Math.floor(getDaysSinceQueued(crop) / 3);
}

// Returns milliseconds until next verification window opens (or 0 if open)
function msUntilNextWindow(crop: TrackedCrop): number {
  const window = getCurrentWindow(crop);
  const queuedAt = new Date(crop.queued_at).getTime();
  const effectivePlanted = queuedAt - crop.initial_day * 86400000;
  const nextWindowStart = effectivePlanted + (window + 1) * 3 * 86400000;
  return Math.max(0, nextWindowStart - (Date.now() + _ntpOffsetMs));
}

// Returns milliseconds until current verification window closes
function msUntilWindowCloses(crop: TrackedCrop): number {
  const window = getCurrentWindow(crop);
  const queuedAt = new Date(crop.queued_at).getTime();
  const effectivePlanted = queuedAt - crop.initial_day * 86400000;
  const windowStart = effectivePlanted + window * 3 * 86400000;
  const windowEnd = windowStart + 2 * 86400000; // 48-hour window
  return Math.max(0, windowEnd - (Date.now() + _ntpOffsetMs));
}

function isVerificationOpen(crop: TrackedCrop): boolean {
  const window = getCurrentWindow(crop);
  // Window 0 is valid for all crops — this is the "Day 0 photo to start progress" window.
  // The previous check `window <= 0 && initial_day === 0` incorrectly blocked day-0 crops
  // from ever uploading their first photo.
  const queuedAt = new Date(crop.queued_at).getTime();
  const effectivePlanted = queuedAt - crop.initial_day * 86400000;
  const windowStart = effectivePlanted + window * 3 * 86400000;
  const now = Date.now() + _ntpOffsetMs;
  // 48-hour window (more farmer-friendly)
  return now >= windowStart && now < windowStart + 2 * 86400000 && window > crop.last_verified_window;
}

function statusColor(status: CropStatus): string {
  return { healthy: '#16a34a', growing: '#3b82f6', wilted: '#ef4444', harvest_ready: '#f59e0b' }[status];
}

function statusLabel(status: CropStatus): string {
  return { healthy: '🟢 Healthy', growing: '🔵 Growing', wilted: '🥀 Wilted', harvest_ready: '🌾 Ready!' }[status];
}

function formatDay(n: number): string {
  return `Day ${n}`;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Seasonal warning ─────────────────────────────────────────────────────────
function getSeasonalWarning(cropName: string): string | null {
  const almanacEntry = ALMANAC_CROPS.find(c => c.name === cropName);
  if (!almanacEntry) return null;
  const month = serverNow().getMonth(); // 0-indexed
  if (!almanacEntry.season[month]) {
    const goodMonths = almanacEntry.season
      .map((ok, i) => ok ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i] : null)
      .filter(Boolean).join(', ');
    return `⚠️ Out of season! ${cropName} grows best in: ${goodMonths}. Expect slower growth this month.`;
  }
  return null;
}

// ─── Priority colors ──────────────────────────────────────────────────────────
const priorityColor: Record<Task['priority'], string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e',
};

// ─── Photo Upload Helper ──────────────────────────────────────────────────────
// Uploads a photo File to Supabase Storage and returns the public URL.
// Falls back to base64 data URL if storage upload fails, so verification
// still works even if the bucket isn't configured.
async function uploadCropPhoto(userId: string, file: File): Promise<{ url: string; base64: string } | null> {
  // Always read base64 for the AI check (which needs raw image data)
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  }).catch(() => null);

  if (!base64) return null;

  // Try uploading to Supabase Storage so the URL stored in DB is short
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filename = `${Date.now()}.${ext}`;
    const path = `${userId}/${filename}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('crop-photos')
      .upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });
    if (uploadError) {
      console.error('Storage upload error:', uploadError.message);
    } else if (uploadData) {
      const { data: urlData } = supabase.storage.from('crop-photos').getPublicUrl(path);
      if (urlData?.publicUrl) {
        console.log('Photo uploaded to storage:', urlData.publicUrl);
        return { url: urlData.publicUrl, base64 };
      }
    }
  } catch (e) {
    console.error('Storage upload exception:', e);
  }

  // Fallback: use base64 directly
  console.warn('Falling back to base64 photo storage');
  return { url: base64, base64 };
}

// ─── AI Health Check via Supabase Edge Function ───────────────────────────────
// Calls our edge function instead of Anthropic directly (avoids CORS block)
async function checkPlantHealthAI(base64Image: string, cropName: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('check-plant-health', {
      body: { base64Image, cropName },
    });
    if (error) {
      console.error('Edge function error:', error);
      return '🤖 AI check unavailable.';
    }
    return data?.note ?? '🤖 AI check unavailable.';
  } catch (e) {
    console.error('AI check failed:', e);
    return '🤖 AI check unavailable.';
  }
}

// ─── Reminder transfer helpers ────────────────────────────────────────────────
function getReminderTransferKey(userId: string): string {
  const today = serverNow().toISOString().slice(0, 10);
  return `agricool_reminder_transferred_${userId}_${today}`;
}

function getTransferredReminders(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(getReminderTransferKey(userId));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function markReminderTransferred(userId: string, key: string) {
  try {
    const set = getTransferredReminders(userId);
    set.add(key);
    localStorage.setItem(getReminderTransferKey(userId), JSON.stringify([...set]));
  } catch {}
}

// ─── Add Crop Modal ───────────────────────────────────────────────────────────
// The full gamified crop tracker UI now lives in ./QueueCropModal.tsx, which is
// data-driven from ./cropConfig.ts. It's used directly below (see `showAddCrop`)
// and calls `onAdd({ name, emoji, initial_day })` — the exact same shape the
// old inline modal used — so handleAddCrop and the tracked_crops insert are
// completely unchanged.

// ─── Photo Verification Modal ─────────────────────────────────────────────────
const VerifyModal = ({
  crop,
  onVerify,
  onClose,
  isRecovery = false,
}: {
  crop: TrackedCrop;
  onVerify: (cropId: string, photoFile: File, isRecovery: boolean) => Promise<void>;
  onClose: () => void;
  isRecovery?: boolean;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    await onVerify(crop.id, file, isRecovery);
    setLoading(false);
    onClose();
  };

  const window = getCurrentWindow(crop);
  const verifyDay = window * 3;

  return (
    <Box
      position="fixed" inset={0} zIndex={1000}
      bg="rgba(0,0,0,0.6)"
      display="flex" alignItems="center" justifyContent="center"
      onClick={onClose}
    >
      <Box
        bg="white" borderRadius="24px" p={7} w="360px"
        boxShadow="0 24px 64px rgba(0,0,0,0.2)"
        onClick={e => e.stopPropagation()}
      >
        <Text fontWeight="900" fontSize="xl" color={isRecovery ? '#dc2626' : '#14532d'} mb={1}>
          {isRecovery ? '🌿 Recovery Photo' : '📸 Photo Verification'}
        </Text>
        <Text fontSize="xs" color="gray.400" mb={1}>
          {crop.emoji} {crop.name} · {isRecovery ? 'Recovery submission' : `${formatDay(verifyDay)} milestone`}
        </Text>
        {isRecovery ? (
          <Text fontSize="xs" color="#dc2626" fontWeight="700" mb={4}>
            Show the plant after corrective action. Recovery costs 1 progress point and drops your streak by 1.
          </Text>
        ) : (
          <Text fontSize="xs" color="#16a34a" fontWeight="700" mb={4}>
            Upload a real photo of your plant to earn +1 progress point. 🤖 AI will check its health.
          </Text>
        )}

        <Box
          border="2px dashed #d1fae5"
          borderRadius="16px" p={5} textAlign="center"
          cursor="pointer"
          bg={preview ? 'white' : '#f0fdf4'}
          onClick={() => inputRef.current?.click()}
          position="relative" overflow="hidden" h="160px"
          display="flex" alignItems="center" justifyContent="center"
        >
          {preview ? (
            <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px', position: 'absolute', inset: 0 }} />
          ) : (
            <VStack gap={2}>
              <Text fontSize="3xl">🌿</Text>
              <Text fontSize="sm" fontWeight="700" color="#16a34a">Tap to upload photo</Text>
              <Text fontSize="11px" color="gray.400">JPG, PNG — your physical plant today</Text>
            </VStack>
          )}
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </Box>

        {preview && (
          <Text fontSize="11px" color="#16a34a" fontWeight="700" textAlign="center" mt={2}
            cursor="pointer" onClick={() => inputRef.current?.click()}>
            ↺ Change photo
          </Text>
        )}

        <HStack gap={2} mt={5}>
          <Button flex={1} variant="outline" borderRadius="12px" onClick={onClose} size="sm" color="gray.500">
            Cancel
          </Button>
          <Button
            flex={2}
            bg={file ? (isRecovery ? '#dc2626' : '#16a34a') : 'gray.200'}
            color={file ? 'white' : 'gray.400'}
            borderRadius="12px" fontWeight="800" size="sm"
            onClick={handleSubmit} loading={loading}
            disabled={!file}
            _hover={{ bg: file ? (isRecovery ? '#b91c1c' : '#15803d') : 'gray.200' }}
          >
            {isRecovery ? '🌿 Submit Recovery' : '✓ Submit Verification'}
          </Button>
        </HStack>
      </Box>
    </Box>
  );
};

// ─── Harvest Modal ─────────────────────────────────────────────────────────────
const HarvestModal = ({
  crop,
  onHarvest,
  onClose,
}: {
  crop: TrackedCrop;
  onHarvest: (cropId: string, photoFile: File) => Promise<void>;
  onClose: () => void;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Box
      position="fixed" inset={0} zIndex={1000}
      bg="rgba(0,0,0,0.7)"
      display="flex" alignItems="center" justifyContent="center"
      onClick={onClose}
    >
      <Box
        bg="white" borderRadius="24px" p={7} w="380px"
        boxShadow="0 24px 64px rgba(0,0,0,0.3)"
        onClick={e => e.stopPropagation()}
      >
        <Text textAlign="center" fontSize="4xl" mb={2}>🌾</Text>
        <Text fontWeight="900" fontSize="xl" color="#92400e" textAlign="center" mb={1}>
          Harvest Time!
        </Text>
        <Text fontSize="sm" color="gray.500" textAlign="center" mb={5}>
          {crop.emoji} {crop.name} is ready. Submit a harvest photo to complete your growth journey and earn your badge!
        </Text>

        <Box
          border="2px dashed #fde68a"
          borderRadius="16px" p={5} textAlign="center"
          cursor="pointer"
          bg={preview ? 'white' : '#fefce8'}
          onClick={() => inputRef.current?.click()}
          position="relative" overflow="hidden" h="150px"
          display="flex" alignItems="center" justifyContent="center"
        >
          {preview ? (
            <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px', position: 'absolute', inset: 0 }} />
          ) : (
            <VStack gap={2}>
              <Text fontSize="3xl">📷</Text>
              <Text fontSize="sm" fontWeight="700" color="#92400e">Upload harvest photo</Text>
            </VStack>
          )}
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) { setFile(f); setPreview(URL.createObjectURL(f)); }
            }} />
        </Box>

        <HStack gap={2} mt={5}>
          <Button flex={1} variant="outline" borderRadius="12px" onClick={onClose} size="sm">
            Later
          </Button>
          <Button
            flex={2}
            bg={file ? '#f59e0b' : 'gray.200'} color={file ? 'white' : 'gray.400'}
            borderRadius="12px" fontWeight="800" size="sm"
            disabled={!file} loading={loading}
            onClick={async () => {
              if (!file) return;
              setLoading(true);
              await onHarvest(crop.id, file);
              setLoading(false);
              onClose();
            }}
            _hover={{ bg: file ? '#d97706' : 'gray.200' }}
          >
            🌾 Confirm Harvest
          </Button>
        </HStack>
      </Box>
    </Box>
  );
};

// ─── Harvest Badge (shareable SVG) ───────────────────────────────────────────
const HarvestBadgeModal = ({
  crop,
  onClose,
}: {
  crop: TrackedCrop;
  onClose: () => void;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const downloadBadge = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${crop.name}-harvest-badge.svg`;
    a.click();
  };

  return (
    <Box position="fixed" inset={0} zIndex={1100} bg="rgba(0,0,0,0.8)"
      display="flex" alignItems="center" justifyContent="center" onClick={onClose}>
      <Box bg="white" borderRadius="24px" p={8} w="340px" textAlign="center"
        onClick={e => e.stopPropagation()}>
        <Text fontWeight="900" fontSize="lg" color="#92400e" mb={4}>🏅 Harvest Badge Unlocked!</Text>

        <svg ref={svgRef} width="220" height="220" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg"
          style={{ margin: '0 auto', display: 'block' }}>
          <defs>
            <radialGradient id="bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7"/>
              <stop offset="100%" stopColor="#fde68a"/>
            </radialGradient>
          </defs>
          <circle cx="110" cy="110" r="105" fill="url(#bg)" stroke="#f59e0b" strokeWidth="4"/>
          <circle cx="110" cy="110" r="90" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="8 4"/>
          <text x="110" y="85" textAnchor="middle" fontSize="52" dominantBaseline="middle">{crop.emoji}</text>
          <text x="110" y="135" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#92400e" fontFamily="system-ui">{crop.name}</text>
          <text x="110" y="158" textAnchor="middle" fontSize="11" fill="#b45309" fontFamily="system-ui">HARVESTED</text>
          <text x="110" y="175" textAnchor="middle" fontSize="10" fill="#d97706" fontFamily="system-ui">
            {serverNow().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
          </text>
          <text x="110" y="195" textAnchor="middle" fontSize="9" fill="#92400e" fontFamily="system-ui">🌾 AgriCool Tracker</text>
        </svg>

        <HStack gap={2} mt={5}>
          <Button flex={1} variant="outline" borderRadius="12px" onClick={onClose} size="sm">Close</Button>
          <Button flex={2} bg="#f59e0b" color="white" borderRadius="12px" fontWeight="800" size="sm"
            onClick={downloadBadge} _hover={{ bg: '#d97706' }}>
            ⬇️ Download Badge
          </Button>
        </HStack>
      </Box>
    </Box>
  );
};

// ─── Crop Tracking Card ───────────────────────────────────────────────────────
const CropCard = ({
  crop,
  onVerify,
  onDelete,
  onHarvest,
  now,
}: {
  crop: TrackedCrop;
  onVerify: (crop: TrackedCrop, isRecovery?: boolean) => void;
  onDelete: (id: string) => void;
  onHarvest: (crop: TrackedCrop) => void;
  now: Date;
}) => {
  const dayCount = getDaysSinceQueued(crop);
  const isDeleteLocked = dayCount < 5;
  const currentWin = getCurrentWindow(crop);
  const verifyOpen = isVerificationOpen(crop);
  const accent = statusColor(crop.status);
  const tokens = Math.floor(crop.progress_points / 2);
  const maxPoints = 10;
  const progressPct = Math.min(100, (crop.progress_points / maxPoints) * 100);

  // Countdown display
  const countdownMs = verifyOpen ? msUntilWindowCloses(crop) : msUntilNextWindow(crop);
  const countdownLabel = verifyOpen
    ? `⏱ Window closes in ${formatDuration(countdownMs)}`
    : `⏳ Next window in ${formatDuration(countdownMs)}`;

  // Streak display
  const streak = crop.streak ?? 0;

  return (
    <Box
      bg="white" borderRadius="20px"
      border="1.5px solid" borderColor={accent + '44'}
      p={5} boxShadow="0 2px 16px rgba(0,0,0,0.06)"
      transition="transform 0.2s, box-shadow 0.2s"
      _hover={{ transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
      position="relative" overflow="hidden"
    >
      {/* Status stripe */}
      <Box position="absolute" left={0} top={0} bottom={0} w="4px" bg={accent} borderRadius="20px 0 0 20px" />

      {/* Delete */}
      <Box
        position="absolute" top="10px" right="10px"
        as="button" fontSize="12px"
        color={isDeleteLocked ? '#d1fae5' : 'gray.300'}
        _hover={{ color: isDeleteLocked ? '#d1fae5' : '#ef4444' }}
        cursor={isDeleteLocked ? 'not-allowed' : 'pointer'}
        title={isDeleteLocked ? `Locked for ${5 - dayCount} more day(s)` : 'Remove crop'}
        onClick={() => onDelete(crop.id)}
      >{isDeleteLocked ? '🔒' : '✕'}</Box>

      <HStack mb={3} gap={3}>
        <Box
          w="48px" h="48px" borderRadius="14px"
          bg={accent + '18'}
          display="flex" alignItems="center" justifyContent="center"
          fontSize="24px" flexShrink={0}
        >
          {crop.status === 'wilted' ? '🥀' : crop.emoji}
        </Box>
        <Box flex={1}>
          <HStack gap={2}>
            <Text fontWeight="800" fontSize="md" color="#1a1a1a">{crop.name}</Text>
            {streak >= 1 && (
              <Badge bg={streak >= 3 ? '#fef3c7' : '#f0fdf4'} color={streak >= 3 ? '#92400e' : '#166534'} borderRadius="full" fontSize="10px" px={2} fontWeight="800">
                🔥 {streak} streak{streak >= 3 ? ' · bonus!' : ` · ${3 - streak} to bonus`}
              </Badge>
            )}
          </HStack>
          <Text fontSize="11px" color={accent} fontWeight="700">{statusLabel(crop.status)}</Text>
        </Box>
      </HStack>

      {/* Day counter */}
      <HStack justify="space-between" mb={2}>
        <Text fontSize="xs" color="gray.400" fontWeight="600">CURRENT DAY</Text>
        <Text fontSize="xs" fontWeight="800" color="#374151">{formatDay(dayCount)}</Text>
      </HStack>

      {/* Progress bar */}
      <Box mb={3}>
        <HStack justify="space-between" mb={1}>
          <Text fontSize="xs" color="gray.400" fontWeight="600">PROGRESS POINTS</Text>
          <HStack gap={1}>
            <Text fontSize="xs" fontWeight="800" color="#16a34a">{crop.progress_points}</Text>
            <Text fontSize="10px" color="gray.400">/ {maxPoints}</Text>
          </HStack>
        </HStack>
        <Box bg="#f3f4f6" borderRadius="full" h="10px" overflow="hidden">
          <Box
            h="100%" borderRadius="full"
            bg={crop.status === 'wilted'
              ? 'linear-gradient(90deg,#fca5a5,#ef4444)'
              : 'linear-gradient(90deg,#4ade80,#16a34a)'}
            w={`${progressPct}%`}
            transition="width 1.2s ease"
          />
        </Box>
        <HStack justify="space-between" mt={1} px="2px">
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} w="6px" h="6px" borderRadius="full"
              bg={crop.progress_points >= i * 2 ? '#16a34a' : '#e5e7eb'} />
          ))}
        </HStack>
      </Box>

      {/* Token earned */}
      {tokens > 0 && (
        <HStack bg="#fefce8" border="1px solid #fde68a" borderRadius="10px" px={3} py={1.5} mb={3} gap={2}>
          <Text fontSize="14px">🎟️</Text>
          <Text fontSize="11px" fontWeight="700" color="#92400e">
            {tokens} Free Listing Token{tokens > 1 ? 's' : ''} earned!
          </Text>
        </HStack>
      )}

      {/* Countdown timer */}
      <Box bg="#f9fafb" borderRadius="8px" px={3} py={1.5} mb={3}>
        <Text fontSize="10px" color={verifyOpen ? '#16a34a' : 'gray.500'} fontWeight="700">
          {countdownLabel}
        </Text>
      </Box>

      {/* Wilted warning with Recovery button */}
      {crop.status === 'wilted' && (
        <Box bg="#fee2e2" border="1px solid #fca5a5" borderRadius="10px" px={3} py={2} mb={3}>
          <Text fontSize="11px" color="#dc2626" fontWeight="700" mb={2}>
            🥀 Wilted — take corrective action and submit a recovery photo.
          </Text>
          <Box
            as="button" w="100%"
            bg="#dc2626" color="white" borderRadius="8px"
            py={2} fontSize="12px" fontWeight="800" textAlign="center"
            _hover={{ opacity: 0.9 }} transition="all 0.15s"
            onClick={() => onVerify(crop, true)}
          >
            🌿 Submit Recovery Photo (−1 pt)
          </Box>
        </Box>
      )}

      {/* Harvest CTA */}
      {crop.status === 'harvest_ready' && (
        <Box
          as="button" w="100%"
          bg="linear-gradient(135deg,#f59e0b,#d97706)" color="white"
          borderRadius="12px" py={2.5} fontSize="13px" fontWeight="800"
          textAlign="center" _hover={{ opacity: 0.9 }} transition="all 0.15s"
          onClick={() => onHarvest(crop)}
          boxShadow="0 4px 12px rgba(245,158,11,0.35)"
        >
          🌾 Confirm Harvest & Get Badge!
        </Box>
      )}

      {/* Verification CTA */}
      {verifyOpen && crop.status !== 'harvest_ready' && crop.status !== 'wilted' ? (
        <Box
          as="button" w="100%"
          bg="linear-gradient(135deg,#16a34a,#15803d)" color="white"
          borderRadius="12px" py={2.5} fontSize="13px" fontWeight="800"
          textAlign="center" _hover={{ opacity: 0.9 }} transition="all 0.15s"
          onClick={() => onVerify(crop)}
          boxShadow="0 4px 12px rgba(22,163,74,0.35)"
        >
          📸 Upload Day {currentWin * 3} Verification Photo
        </Box>
      ) : crop.status !== 'wilted' && crop.status !== 'harvest_ready' ? (
        <HStack gap={2}>
          <Box flex={1} bg="#f0fdf4" borderRadius="10px" px={3} py={2} textAlign="center">
            <Text fontSize="10px" color="#16a34a" fontWeight="700">Next upload opens</Text>
            <Text fontSize="11px" color="#14532d" fontWeight="800">{formatDay((currentWin + 1) * 3)}</Text>
          </Box>
          <Box flex={1} bg="#f0fdf4" borderRadius="10px" px={3} py={2} textAlign="center">
            <Text fontSize="10px" color="#16a34a" fontWeight="700">Verifications done</Text>
            <Text fontSize="11px" color="#14532d" fontWeight="800">
              {/* BUG FIX: last_verified_window is a window index, not a count.
                  Use progress_points as the accurate tally (each successful
                  verify adds +1; recoveries are also photo submissions). */}
              {Math.max(0, crop.progress_points)}
            </Text>
          </Box>
        </HStack>
      ) : null}

      {/* Last photo */}
      {crop.last_photo_url && (
        <Box mt={3} borderRadius="10px" overflow="hidden" h="70px">
          <img src={crop.last_photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
      )}
    </Box>
  );
};

// ─── Journal Timeline ─────────────────────────────────────────────────────────
const JournalTimeline = ({ userId, seed }: { userId: string; seed?: number }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase.from('crop_journal').select('*').eq('user_id', userId)
      .order('verified_at', { ascending: false })
      .then(({ data }) => {
        if (data) setEntries(data as JournalEntry[]);
        setLoading(false);
      });
  }, [userId, seed]);

  if (loading) return <Center py={8}><Spinner color="#16a34a" /></Center>;

  if (entries.length === 0) {
    return (
      <Box textAlign="center" py={12} bg="white" borderRadius="20px" border="2px dashed #d1fae5">
        <Text fontSize="3xl" mb={3}>📓</Text>
        <Text fontWeight="800" color="#14532d" mb={1}>No journal entries yet</Text>
        <Text fontSize="sm" color="gray.400">Your crop photos will appear here as a growth timeline.</Text>
      </Box>
    );
  }

  // Group by crop
  const byCrop: Record<string, JournalEntry[]> = {};
  entries.forEach(e => {
    if (!byCrop[e.crop_id]) byCrop[e.crop_id] = [];
    byCrop[e.crop_id].push(e);
  });

  return (
    <VStack gap={6} align="stretch">
      {Object.values(byCrop).map(cropEntries => {
        const first = cropEntries[0];
        return (
          <Box key={first.crop_id} bg="white" borderRadius="20px" border="1.5px solid #d1fae5" p={5}>
            <HStack mb={4} gap={3}>
              <Text fontSize="2xl">{first.crop_emoji}</Text>
              <Box>
                <Text fontWeight="800" color="#14532d">{first.crop_name} Growth Journal</Text>
                <Text fontSize="11px" color="gray.400">{cropEntries.length} milestone{cropEntries.length > 1 ? 's' : ''} recorded</Text>
              </Box>
            </HStack>

            {/* Horizontal scroll timeline */}
            <Box overflowX="auto" pb={2}>
              <HStack gap={4} minW="max-content">
                {[...cropEntries].reverse().map((entry) => (
                  <Box key={entry.id} w="140px" flexShrink={0}>
                    <Box borderRadius="12px" overflow="hidden" h="100px" bg="#f0fdf4" mb={2} position="relative">
                      {entry.photo_url ? (
                        <img src={entry.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Center h="100%"><Text fontSize="2xl">{entry.crop_emoji}</Text></Center>
                      )}
                      <Badge
                        position="absolute" bottom="4px" left="4px"
                        bg="rgba(0,0,0,0.6)" color="white" borderRadius="full"
                        fontSize="9px" px={1.5} fontWeight="700"
                      >
                        Day {entry.day_number}
                      </Badge>
                    </Box>
                    <Text fontSize="10px" color="gray.500" fontWeight="700">
                      {new Date(entry.verified_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </Text>
                    {entry.ai_health_note && (
                      <Box bg="#f0fdf4" borderRadius="6px" px={2} py={1} mt={1}>
                        <Text fontSize="9px" color="#16a34a" fontWeight="600">🤖 {entry.ai_health_note}</Text>
                      </Box>
                    )}
                  </Box>
                ))}
              </HStack>
            </Box>
          </Box>
        );
      })}
    </VStack>
  );
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────
const Leaderboard = ({ currentUserId }: { currentUserId: string }) => {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Query: aggregate progress_points and tokens per user, join profiles for username
    supabase
      .from('tracked_crops')
      .select('user_id, progress_points, status')
      .limit(500) // cap to avoid full-table scan as user base grows
      .then(async ({ data: cropData }) => {
        if (!cropData) { setLoading(false); return; }

        // Aggregate per user
        const userMap: Record<string, { points: number; tokens: number; harvested: number }> = {};
        cropData.forEach(c => {
          if (!userMap[c.user_id]) userMap[c.user_id] = { points: 0, tokens: 0, harvested: 0 };
          userMap[c.user_id].points += c.progress_points;
          userMap[c.user_id].tokens += Math.floor(c.progress_points / 2);
          if (c.status === 'harvest_ready') userMap[c.user_id].harvested += 1;
        });

        // Fetch display names from profiles table (prefer first+last name over email-based username)
        const userIds = Object.keys(userMap);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username')
          .in('id', userIds);

        const profileMap: Record<string, string> = {};
        (profiles ?? []).forEach((p: { id: string; first_name?: string; last_name?: string; username?: string }) => {
          const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
          profileMap[p.id] = fullName || p.username || '';
        });

        const leaderboard: LeaderboardRow[] = Object.entries(userMap)
          .map(([user_id, stats]) => ({
            user_id,
            username: profileMap[user_id] || `Farmer_${user_id.slice(0, 5)}`,
            total_points: stats.points,
            total_tokens: stats.tokens,
            crops_harvested: stats.harvested,
          }))
          .sort((a, b) => b.total_points - a.total_points)
          .slice(0, 10);

        setRows(leaderboard);
        setLoading(false);
      });
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  if (loading) return <Center py={8}><Spinner color="#16a34a" /></Center>;

  return (
    <Box bg="white" borderRadius="20px" border="1.5px solid #d1fae5" p={5}>
      <HStack mb={5} gap={2}>
        <Text fontSize="lg">🏆</Text>
        <Text fontWeight="900" color="#14532d">Top Farmers Leaderboard</Text>
        <Badge bg="#dcfce7" color="#16a34a" borderRadius="full" fontSize="10px" px={2} fontWeight="700">
          Top {rows.length}
        </Badge>
      </HStack>

      {rows.length === 0 ? (
        <Text fontSize="sm" color="gray.400" textAlign="center" py={6}>No data yet. Be the first farmer on the board!</Text>
      ) : (
        <VStack gap={2} align="stretch">
          {rows.map((row, i) => (
            <HStack
              key={row.user_id}
              bg={row.user_id === currentUserId ? '#f0fdf4' : '#f9fafb'}
              borderRadius="12px" px={4} py={3} gap={3}
              border={row.user_id === currentUserId ? '1.5px solid #16a34a' : '1.5px solid transparent'}
            >
              <Text fontSize="18px" w="24px" textAlign="center">{medals[i] ?? `#${i + 1}`}</Text>
              <Box flex={1}>
                <Text fontSize="sm" fontWeight="800" color="#1a1a1a">
                  {row.username} {row.user_id === currentUserId && <Badge bg="#dcfce7" color="#16a34a" fontSize="9px" ml={1}>You</Badge>}
                </Text>
                <Text fontSize="10px" color="gray.400">🌾 {row.crops_harvested} harvested</Text>
              </Box>
              <VStack gap={0} align="flex-end">
                <Text fontSize="sm" fontWeight="900" color="#16a34a">{row.total_points} pts</Text>
                <Text fontSize="10px" color="#6d28d9">🎟️ {row.total_tokens} tokens</Text>
              </VStack>
            </HStack>
          ))}
        </VStack>
      )}
    </Box>
  );
};

// ─── Notifications Panel ──────────────────────────────────────────────────────
// ─── Upcoming Crop Tasks ──────────────────────────────────────────────────────
// Shows the next 3 days of scheduled care tasks for each active crop so the
// user can plan ahead beyond today's reminders.
const UpcomingCropTasks = ({
  crops,
  serverTime,
}: {
  crops: TrackedCrop[];
  serverTime: Date;
}) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Build upcoming task schedule: for each non-wilted crop, list tasks for
  // today-remaining + next 2 days (max 3 days ahead total).
  const DAYS_AHEAD = 3;
  const todayStr = serverTime.toISOString().slice(0, 10);
  const currentHour   = serverTime.getHours();
  const currentMinute = serverTime.getMinutes();

  const activeCrops = crops.filter(c => c.status !== 'wilted');

  if (activeCrops.length === 0) return null;

  // For a given date offset (0 = today, 1 = tomorrow, etc.) build the label
  function dayLabel(offset: number): string {
    if (offset === 0) return 'Today';
    if (offset === 1) return 'Tomorrow';
    const d = new Date(serverTime);
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  type ScheduledTask = {
    time: string;
    hour: number;
    minute: number;
    message: string;
    dayOffset: number;
    dayLabel: string;
    isPast: boolean; // today-only: already passed
  };

  const cropSchedules = activeCrops.map(crop => {
    const templates = CROP_NOTIFICATIONS[crop.name] ?? DEFAULT_NOTIFICATIONS;
    const tasks: ScheduledTask[] = [];

    for (let offset = 0; offset < DAYS_AHEAD; offset++) {
      for (const t of templates) {
        const [hStr, mStr] = t.time.split(':');
        const hour   = parseInt(hStr);
        const minute = parseInt(mStr ?? '0');

        // For today, skip tasks that have already passed
        if (offset === 0) {
          const alreadyPast =
            hour < currentHour || (hour === currentHour && minute <= currentMinute);
          if (alreadyPast) continue;
        }

        tasks.push({
          time: t.time,
          hour,
          minute,
          message: t.message,
          dayOffset: offset,
          dayLabel: dayLabel(offset),
          isPast: false,
        });
      }
    }

    // Sort by day offset then time
    tasks.sort((a, b) => a.dayOffset - b.dayOffset || a.hour - b.hour || a.minute - b.minute);

    return { crop, tasks };
  });

  // Only show crops that actually have upcoming tasks
  const withTasks = cropSchedules.filter(cs => cs.tasks.length > 0);
  if (withTasks.length === 0) return null;

  // Group tasks by day label for display
  function groupByDay(tasks: ScheduledTask[]): { label: string; tasks: ScheduledTask[] }[] {
    const map: Record<string, ScheduledTask[]> = {};
    const order: string[] = [];
    tasks.forEach(t => {
      if (!map[t.dayLabel]) { map[t.dayLabel] = []; order.push(t.dayLabel); }
      map[t.dayLabel].push(t);
    });
    return order.map(label => ({ label, tasks: map[label] }));
  }

  return (
    <Box bg="white" borderRadius="20px" border="1.5px solid #d1fae5" p={5} mb={6}
      boxShadow="0 2px 12px rgba(0,0,0,0.05)">
      <HStack mb={4} gap={2}>
        <Text fontSize="lg">📅</Text>
        <Text fontWeight="800" color="#14532d">Upcoming Care Schedule</Text>
        <Badge bg="#dcfce7" color="#16a34a" borderRadius="full" fontSize="10px" px={2} fontWeight="700">
          Next {DAYS_AHEAD} days
        </Badge>
      </HStack>

      <VStack gap={3} align="stretch">
        {withTasks.map(({ crop, tasks }) => {
          const isOpen = expanded === crop.id;
          const groups = groupByDay(tasks);
          const nextTask = tasks[0];

          return (
            <Box key={crop.id} borderRadius="14px" border="1.5px solid #e5e7eb" overflow="hidden">
              {/* Crop header row — always visible */}
              <HStack
                px={4} py={3} bg={isOpen ? '#f0fdf4' : 'white'}
                cursor="pointer" gap={3}
                onClick={() => setExpanded(isOpen ? null : crop.id)}
                _hover={{ bg: '#f0fdf4' }}
                transition="background 0.15s"
              >
                <Text fontSize="22px">{crop.emoji}</Text>
                <Box flex={1}>
                  <Text fontWeight="800" color="#14532d" fontSize="13px">{crop.name}</Text>
                  {!isOpen && nextTask && (
                    <Text fontSize="11px" color="#6b7280">
                      Next: <Text as="span" color="#16a34a" fontWeight="700">{nextTask.dayLabel}</Text>
                      {' '}at {nextTask.time} — {nextTask.message.length > 45
                        ? nextTask.message.slice(0, 45) + '…'
                        : nextTask.message}
                    </Text>
                  )}
                </Box>
                <HStack gap={2}>
                  <Badge bg="#f0fdf4" color="#16a34a" borderRadius="full" fontSize="9px" px={2} fontWeight="700">
                    {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                  </Badge>
                  <Text fontSize="12px" color="#9ca3af" fontWeight="700">
                    {isOpen ? '▲' : '▼'}
                  </Text>
                </HStack>
              </HStack>

              {/* Expanded task list grouped by day */}
              {isOpen && (
                <Box px={4} pb={4} pt={2} bg="#fafafa">
                  <VStack gap={4} align="stretch">
                    {groups.map(group => (
                      <Box key={group.label}>
                        {/* Day header */}
                        <HStack gap={2} mb={2}>
                          <Box h="1px" flex={1} bg="#e5e7eb" />
                          <Text fontSize="10px" fontWeight="800" color="#6b7280"
                            textTransform="uppercase" letterSpacing="0.5px">
                            {group.label}
                          </Text>
                          <Box h="1px" flex={1} bg="#e5e7eb" />
                        </HStack>

                        <VStack gap={2} align="stretch">
                          {group.tasks.map((task, i) => (
                            <HStack key={i} gap={3} py={2} px={3}
                              bg="white" borderRadius="10px"
                              border="1px solid #e5e7eb">
                              {/* Time pill */}
                              <Box bg="#dcfce7" borderRadius="8px" px={2} py={1}
                                flexShrink={0} minW="52px" textAlign="center">
                                <Text fontSize="11px" color="#16a34a" fontWeight="800">
                                  {task.time}
                                </Text>
                              </Box>
                              <Text fontSize="12px" color="#374151" fontWeight="600" flex={1}
                                lineHeight="1.4">
                                {task.message}
                              </Text>
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              )}
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
};

const TodayReminders = ({
  crops,
  userId,
  serverTime,
  onTransferToTask,
}: {
  crops: TrackedCrop[];
  userId: string;
  serverTime: Date;
  onTransferToTask: (reminder: { crop: string; emoji: string; message: string; time: string }) => Promise<void>;
}) => {
  const currentHour   = serverTime.getHours();
  const currentMinute = serverTime.getMinutes();
  const serverToday = serverTime.toISOString().slice(0, 10);

  // Skip crops queued in the last 60 seconds so adding a crop doesn't
  // immediately fire tasks for it (they'll appear on the next render cycle).
  const now60sAgo = serverTime.getTime() - 60_000;
  const allReminders = crops
    .filter(c => c.status !== 'wilted' && new Date(c.queued_at).getTime() < now60sAgo)
    .flatMap(crop => {
      const templates = CROP_NOTIFICATIONS[crop.name] ?? DEFAULT_NOTIFICATIONS;
      // BUG FIX: if the crop was queued today, skip any reminder whose time
      // had already passed at queue time — those would instantly auto-fail.
      const queuedAt = new Date(crop.queued_at);
      const queuedToday = queuedAt.toISOString().slice(0, 10) === serverToday;
      const queuedHour = queuedAt.getHours();
      const queuedMinute = queuedAt.getMinutes();
      return templates
        .filter(t => {
          if (!queuedToday) return true; // older crops: show all reminders
          const [hStr, mStr] = t.time.split(':');
          const rHour = parseInt(hStr);
          const rMin = parseInt(mStr ?? '0');
          // Only include reminders whose time is at or after queue time
          return rHour > queuedHour || (rHour === queuedHour && rMin >= queuedMinute);
        })
        .map(t => {
          const [hStr, mStr] = t.time.split(':');
          return {
            crop: crop.name, emoji: crop.emoji, time: t.time, message: t.message,
            hour: parseInt(hStr), minute: parseInt(mStr ?? '0'),
          };
        });
    });

  const dueNow = allReminders.filter(
    r => r.hour < currentHour || (r.hour === currentHour && r.minute <= currentMinute)
  );

  const upcoming = allReminders
    .filter(r => r.hour > currentHour || (r.hour === currentHour && r.minute > currentMinute))
    .sort((a, b) => a.hour - b.hour || a.minute - b.minute)
    .slice(0, 5);

  useEffect(() => {
    const transferred = getTransferredReminders(userId);
    dueNow.forEach(r => {
      const key = `${r.crop}_${r.time}`;
      if (!transferred.has(key)) {
        markReminderTransferred(userId, key);
        onTransferToTask(r);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crops, userId]);

  if (upcoming.length === 0) return null;

  return (
    <Box bg="white" borderRadius="20px" border="1.5px solid #d1fae5" p={5} mb={6}
      boxShadow="0 2px 12px rgba(0,0,0,0.05)">
      <HStack mb={4} gap={2}>
        <Text fontSize="lg">🔔</Text>
        <Text fontWeight="800" color="#14532d">Today's Crop Reminders</Text>
        <Badge bg="#dcfce7" color="#16a34a" borderRadius="full" fontSize="10px" px={2} fontWeight="700">
          {upcoming.length} upcoming
        </Badge>
      </HStack>
      <VStack gap={2} align="stretch">
        {upcoming.map((r, i) => (
          <HStack key={i} gap={3} py={2} px={3} bg="#f9fafb" borderRadius="10px">
            <Text fontSize="16px">{r.emoji}</Text>
            <Box flex={1}>
              <Text fontSize="11px" color="#16a34a" fontWeight="800">{r.time}</Text>
              <Text fontSize="12px" color="#374151" fontWeight="600">{r.message}</Text>
            </Box>
          </HStack>
        ))}
      </VStack>
    </Box>
  );
};

// ─── Task Item ────────────────────────────────────────────────────────────────
const TaskItem = ({ task, onToggle, onDelete, now }: {
  task: Task; onToggle: (id: string) => void; onDelete: (id: string) => void; now: Date;
}) => {
  const state = getTaskWindowState(task, now);
  const canToggle = state === 'active' || state === 'manual' || state === 'done';

  const stateConfig: Record<TaskWindowState, { bg: string; border: string; checkBg: string; checkBorder: string; badge: string; badgeColor: string; opacity: number }> = {
    pending:  { bg: 'white',    border: '#d1fae5',  checkBg: 'transparent', checkBorder: '#d1d5db', badge: '⏳ Upcoming',      badgeColor: '#6b7280', opacity: 1 },
    active:   { bg: '#f0fdf4',  border: '#16a34a',  checkBg: 'transparent', checkBorder: '#16a34a', badge: '✅ Active Now',     badgeColor: '#16a34a', opacity: 1 },
    done:     { bg: '#f9fafb',  border: '#e5e7eb',  checkBg: '#22c55e',     checkBorder: '#22c55e', badge: '✓ Done',           badgeColor: '#22c55e', opacity: 0.6 },
    expired:  { bg: '#fff7ed',  border: '#fed7aa',  checkBg: 'transparent', checkBorder: '#f97316', badge: '⌛ Window Closed', badgeColor: '#f97316', opacity: 0.75 },
    failed:   { bg: '#fff1f2',  border: '#fecdd3',  checkBg: '#ef4444',     checkBorder: '#ef4444', badge: '❌ Failed',        badgeColor: '#ef4444', opacity: 1 },
    manual:   { bg: 'white',    border: priorityColor[task.priority] + '33', checkBg: task.done ? '#22c55e' : 'transparent', checkBorder: task.done ? '#22c55e' : priorityColor[task.priority], badge: task.priority, badgeColor: priorityColor[task.priority], opacity: task.done ? 0.55 : 1 },
  };

  const cfg = stateConfig[state];

  const countdownLabel = (() => {
    if (!task.due_time || state === 'done' || state === 'failed') return null;
    const due = new Date(task.due_time).getTime();
    const WINDOW = 10 * 60 * 1000;
    const nowMs = now.getTime();
    if (state === 'pending') {
      const secsLeft = Math.max(0, Math.round((due - WINDOW - nowMs) / 1000));
      return `Opens in ${Math.floor(secsLeft / 60)}m ${secsLeft % 60}s`;
    }
    if (state === 'active') {
      const secsLeft = Math.max(0, Math.round((due + WINDOW - nowMs) / 1000));
      return `Closes in ${Math.floor(secsLeft / 60)}m ${secsLeft % 60}s`;
    }
    return null;
  })();

  return (
    <HStack
      py={2.5} px={3} bg={cfg.bg} borderRadius="12px"
      border="1.5px solid" borderColor={cfg.border}
      opacity={cfg.opacity} gap={3} transition="all 0.2s"
      _hover={{ transform: canToggle ? 'translateX(3px)' : 'none' }}
      position="relative"
    >
      {state === 'active' && (
        <Box position="absolute" inset={0} borderRadius="12px"
          border="2px solid #16a34a" opacity={0.4}
          style={{ animation: 'pulse 2s infinite' }} pointerEvents="none" />
      )}
      <Box
        w="20px" h="20px" borderRadius="full" flexShrink={0}
        border="2.5px solid" borderColor={cfg.checkBorder} bg={cfg.checkBg}
        display="flex" alignItems="center" justifyContent="center"
        cursor={canToggle ? 'pointer' : 'not-allowed'}
        onClick={() => canToggle && onToggle(task.id)}
      >
        {state === 'done' && <Text fontSize="9px" color="white" fontWeight="900">✓</Text>}
        {state === 'failed' && <Text fontSize="9px" color="white" fontWeight="900">✕</Text>}
        {state === 'expired' && <Text fontSize="9px" color="#f97316" fontWeight="900">!</Text>}
      </Box>
      <Box flex={1} cursor={canToggle ? 'pointer' : 'default'} onClick={() => canToggle && onToggle(task.id)}>
        <Text fontSize="sm" fontWeight="700" color={state === 'failed' ? '#ef4444' : '#1a1a1a'}
          textDecoration={state === 'done' ? 'line-through' : 'none'}>
          {task.label}
        </Text>
        <HStack gap={2}>
          <Text fontSize="11px" color="gray.400">{task.crop} · {task.due}</Text>
          {countdownLabel && (
            <Text fontSize="10px" fontWeight="700" color={state === 'active' ? '#16a34a' : '#6b7280'}>
              {countdownLabel}
            </Text>
          )}
        </HStack>
      </Box>
      <Badge px={2} py={0.5} borderRadius="full" fontSize="10px"
        bg={cfg.badgeColor + '18'} color={cfg.badgeColor}
        fontWeight="700" textTransform={state === 'manual' ? 'uppercase' : 'none'} whiteSpace="nowrap">
        {cfg.badge}
      </Badge>
      <Box
        as="button" fontSize="13px" fontWeight="700"
        color={state === 'failed' ? '#ef4444' : 'gray.400'}
        bg={state === 'failed' ? '#fee2e2' : 'transparent'}
        borderRadius="6px" px={1.5} py={0.5}
        _hover={{ color: '#ef4444', bg: '#fee2e2' }}
        title="Delete task"
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(task.id); }}
      >✕</Box>
    </HStack>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ emoji, label, value, sub, color }: {
  emoji: string; label: string; value: string; sub?: string; color: string;
}) => (
  <Box bg="white" borderRadius="16px" p={4} border="1.5px solid" borderColor={color + '33'}
    flex="1" minW="120px" boxShadow="0 2px 8px rgba(0,0,0,0.04)">
    <Text fontSize="xl" mb={1}>{emoji}</Text>
    <Text fontSize="xl" fontWeight="900" color={color} letterSpacing="-0.5px">{value}</Text>
    <Text fontSize="xs" fontWeight="700" color="#374151">{label}</Text>
    {sub && <Text fontSize="10px" color="gray.400" mt={0.5}>{sub}</Text>}
  </Box>
);

// ─── Confetti Burst ───────────────────────────────────────────────────────────
const ConfettiBurst = ({ trigger, onDone }: { trigger: boolean; onDone: () => void }) => {
  const particles = ['🌾', '🎟️', '⭐', '✨', '🔥', '🎉', '💚', '🌱', '🏆', '🎊'];
  useEffect(() => {
    if (trigger) { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  if (!trigger) return null;
  return (
    <Box position="fixed" inset={0} pointerEvents="none" zIndex={9999} overflow="hidden">
      {Array.from({ length: 28 }).map((_, i) => (
        <Box key={i} position="absolute"
          left={`${5 + (i * 3.5) % 92}%`}
          top="100%"
          fontSize={`${14 + (i % 3) * 6}px`}
          style={{ animation: `confetti-up ${1.2 + (i % 4) * 0.25}s ease-out ${(i % 6) * 0.08}s forwards` }}
        >
          {particles[i % particles.length]}
        </Box>
      ))}
    </Box>
  );
};

// ─── Level Up Modal ───────────────────────────────────────────────────────────
const LevelUpModal = ({ level, onClose }: { level: typeof FARMER_LEVELS[0]; onClose: () => void }) => (
  <Box position="fixed" inset={0} zIndex={9500} bg="rgba(0,0,0,0.85)"
    display="flex" alignItems="center" justifyContent="center"
    style={{ backdropFilter: 'blur(8px)', animation: 'tut-overlay-in 0.3s ease' }}
    onClick={onClose}
  >
    <Box bg="linear-gradient(135deg,#14532d,#166534)" borderRadius="28px" p={10}
      textAlign="center" maxW="380px" w="100%" mx={4}
      boxShadow="0 0 60px rgba(22,163,74,0.5), 0 32px 80px rgba(0,0,0,0.5)"
      border="2px solid rgba(74,222,128,0.3)"
      style={{ animation: 'tut-card-in .4s cubic-bezier(.34,1.56,.64,1)' }}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      <Text fontSize="72px" style={{ animation: 'kool-bounce 0.5s ease infinite alternate', display: 'block' }} mb={2}>
        {level.icon}
      </Text>
      <Text fontSize="11px" fontWeight="900" color="#4ade80" letterSpacing="4px" textTransform="uppercase" mb={1}>
        LEVEL UP!
      </Text>
      <Text fontSize="36px" fontWeight="900" color="white" letterSpacing="-1px" mb={1}>
        Level {level.level}
      </Text>
      <Text fontSize="20px" fontWeight="800" color={level.color} mb={4}>
        {level.title}
      </Text>
      <Text fontSize="13px" color="rgba(255,255,255,0.6)" mb={6}>
        You are growing into a true AgriCool farmer. Keep going!
      </Text>
      <Button bg="#4ade80" color="#14532d" borderRadius="full" fontWeight="900" fontSize="md"
        px={8} py={5} _hover={{ bg: '#22c55e' }} onClick={onClose}
        boxShadow="0 4px 20px rgba(74,222,128,0.4)">
        🚀 Keep Farming!
      </Button>
    </Box>
  </Box>
);

// ─── Achievement Toast ────────────────────────────────────────────────────────
const AchievementToast = ({ achievement, onDone }: { achievement: Achievement; onDone: () => void }) => {
  // Use a ref so the timer callback always calls the latest onDone without
  // re-creating the timer on every render (which caused it to never fire).
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 4000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const rarityColors: Record<string, string> = { common: '#22c55e', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b' };
  const color = rarityColors[achievement.rarity] ?? '#22c55e';
  return (
    <Box position="fixed" bottom="80px" right="16px" zIndex={8000}
      bg="white" borderRadius="16px" p={4} maxW="300px"
      boxShadow={`0 8px 32px ${color}44, 0 2px 8px rgba(0,0,0,0.15)`}
      border={`2px solid ${color}`}
      style={{ animation: 'slideInRight .4s cubic-bezier(.34,1.56,.64,1)' }}
    >
      <HStack gap={3}>
        <Box w="44px" h="44px" borderRadius="12px" bg={color + '18'} flexShrink={0}
          display="flex" alignItems="center" justifyContent="center" fontSize="22px">
          {achievement.icon}
        </Box>
        <Box>
          <Text fontSize="9px" fontWeight="900" color={color} letterSpacing="2px" textTransform="uppercase">
            Achievement Unlocked!
          </Text>
          <Text fontSize="14px" fontWeight="900" color="#1a1a1a" lineHeight="1.2">{achievement.title}</Text>
          <Text fontSize="11px" color="gray.500">{achievement.desc}</Text>
          <Text fontSize="10px" fontWeight="800" color={color} mt={0.5}>+{achievement.xp} XP</Text>
        </Box>
      </HStack>
    </Box>
  );
};

// ─── XP Popup ─────────────────────────────────────────────────────────────────
const XPPopup = ({ amount, label, onDone }: { amount: number; label: string; onDone: () => void }) => {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t); }, [onDone]);
  return (
    <Box position="fixed" top="18%" left="50%" zIndex={8500} pointerEvents="none"
      style={{ transform: 'translateX(-50%)', animation: 'xpPop 1.8s ease forwards' }}
      bg="linear-gradient(135deg,#14532d,#16a34a)" color="white"
      borderRadius="full" px={6} py={3}
      boxShadow="0 4px 24px rgba(22,163,74,0.5)"
    >
      <Text fontSize="18px" fontWeight="900" letterSpacing="-0.5px" whiteSpace="nowrap">
        ⚡ +{amount} XP
        <Text as="span" fontSize="12px" fontWeight="600" opacity={0.8} ml={2}>{label}</Text>
      </Text>
    </Box>
  );
};

// ─── Daily Quest Panel ────────────────────────────────────────────────────────
const DailyQuestPanel = ({ userId, dailyStats, questProgress }: {
  userId: string;
  dailyStats: { verifies: number; tasksCompleted: number; bestStreak: number; tokensEarned: number; allTasksPassed: boolean };
  questProgress: QuestProgressMap;
}) => {
  const quests = getDailyQuests(userId);

  // Use persisted questProgress when available, fall back to live derived stats
  const getProgress = (q: DailyQuest): number => {
    // persisted progress (survives page refresh)
    if (questProgress[q.id] !== undefined) return questProgress[q.id].progress;
    // live fallback for first session before any action fires
    switch (q.type) {
      case 'verify': return Math.min(q.target, dailyStats.verifies);
      case 'task':   return q.id === 'q_task_all'
        ? (dailyStats.allTasksPassed ? 1 : 0)
        : Math.min(q.target, dailyStats.tasksCompleted);
      case 'streak': return dailyStats.bestStreak >= 1 ? 1 : 0;
      case 'token':  return Math.min(q.target, dailyStats.tokensEarned);
      default:       return 0;
    }
  };

  const completedCount = quests.filter(q => getProgress(q) >= q.target).length;
  const totalXP = quests.filter(q => getProgress(q) >= q.target).reduce((s, q) => s + q.xp, 0);

  return (
    <Box bg="white" borderRadius="20px" border="1.5px solid #fde68a" p={5} mb={6}
      boxShadow="0 2px 16px rgba(245,158,11,0.08)">
      <HStack mb={4} gap={2} justify="space-between">
        <HStack gap={2}>
          <Text fontSize="lg">⚡</Text>
          <Text fontWeight="900" color="#92400e" fontSize="md">Daily Quests</Text>
          <Badge bg={completedCount === 3 ? '#dcfce7' : '#fef3c7'} color={completedCount === 3 ? '#16a34a' : '#92400e'}
            borderRadius="full" fontSize="9px" px={2} fontWeight="800">
            {completedCount}/3 done {completedCount === 3 ? '🎉' : ''}
          </Badge>
        </HStack>
        {totalXP > 0 && (
          <Text fontSize="11px" fontWeight="800" color="#16a34a">+{totalXP} XP earned today</Text>
        )}
      </HStack>
      <VStack gap={3} align="stretch">
        {quests.map(q => {
          const progress = getProgress(q);
          const done = progress >= q.target;
          return (
            <Box key={q.id} bg={done ? '#f0fdf4' : '#fafafa'} borderRadius="14px" px={4} py={3}
              border={`1.5px solid ${done ? '#86efac' : '#f3f4f6'}`}
              transition="all 0.3s">
              <HStack gap={3}>
                <Box w="36px" h="36px" borderRadius="10px" flexShrink={0}
                  bg={done ? '#dcfce7' : '#fef3c7'}
                  display="flex" alignItems="center" justifyContent="center" fontSize="18px">
                  {done ? '✅' : q.icon}
                </Box>
                <Box flex={1}>
                  <HStack justify="space-between" mb={0.5}>
                    <Text fontSize="13px" fontWeight="800" color={done ? '#16a34a' : '#1a1a1a'}
                      textDecoration={done ? 'line-through' : 'none'}>
                      {q.title}
                    </Text>
                    <Text fontSize="11px" fontWeight="800" color={done ? '#16a34a' : '#f59e0b'}>
                      +{q.xp} XP
                    </Text>
                  </HStack>
                  <Text fontSize="11px" color="gray.500" mb={1}>{q.desc}</Text>
                  <Box bg={done ? '#dcfce7' : '#e5e7eb'} borderRadius="full" h="5px" overflow="hidden">
                    <Box h="100%" borderRadius="full"
                      bg={done ? 'linear-gradient(90deg,#4ade80,#16a34a)' : 'linear-gradient(90deg,#fbbf24,#f59e0b)'}
                      w={`${Math.min(100, (progress / q.target) * 100)}%`}
                      transition="width 0.6s ease" />
                  </Box>
                  <Text fontSize="9px" color="gray.400" mt={0.5} fontWeight="700">{progress}/{q.target}</Text>
                </Box>
              </HStack>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
};

// ─── Farmer Profile Card ──────────────────────────────────────────────────────
const FarmerProfileCard = ({ userId, username, totalTokens, xpOverride, seed }: {
  userId: string; username: string; totalTokens: number; xpOverride?: number; seed?: number;
}) => {
  const [xp, setXp] = useState(0);
  // BUG FIX: also re-read XP whenever seed bumps (seed increments on every
  // awardXP call, so the card level stays in sync with notifications).
  useEffect(() => { setXp(getFarmerXP(userId)); }, [userId, seed]);
  // Prefer live xpOverride from parent state when available (avoids localStorage lag)
  const displayXp = xpOverride ?? xp;
  const level = getFarmerLevel(displayXp);
  const { current, needed, pct } = getXpToNextLevel(displayXp);
  // BUG FIX: re-read achievements when seed bumps (after async DB hydration)
  const unlocked = getUnlockedAchievements(userId);

  return (
    <Box bg="linear-gradient(135deg,#14532d 0%,#166534 50%,#15803d 100%)"
      borderRadius="24px" p={5} mb={6} position="relative" overflow="hidden"
      boxShadow="0 8px 32px rgba(20,83,45,0.25)"
    >
      <Box position="absolute" top="-30px" right="-30px" w="120px" h="120px"
        borderRadius="full" bg="rgba(255,255,255,0.04)" />
      <Box position="absolute" bottom="-20px" left="-20px" w="80px" h="80px"
        borderRadius="full" bg="rgba(255,255,255,0.03)" />
      <HStack gap={4} align="flex-start">
        <Box position="relative" flexShrink={0}>
          <Box w="64px" h="64px" borderRadius="full"
            bg={level.color + '33'} border={`3px solid ${level.color}`}
            display="flex" alignItems="center" justifyContent="center" fontSize="30px"
            boxShadow={`0 0 20px ${level.color}66`}>
            {level.icon}
          </Box>
          <Box position="absolute" bottom="-4px" right="-4px"
            bg={level.color} borderRadius="full" w="20px" h="20px"
            border="2px solid #14532d"
            display="flex" alignItems="center" justifyContent="center"
            fontSize="9px" fontWeight="900" color="white">
            {level.level}
          </Box>
        </Box>
        <Box flex={1}>
          <HStack gap={2} mb={0.5}>
            <Text fontWeight="900" fontSize="lg" color="white" letterSpacing="-0.5px">{username}</Text>
            <Badge bg={level.color + '33'} color={level.color} borderRadius="full" fontSize="10px" px={2} fontWeight="800">
              {level.title}
            </Badge>
          </HStack>
          <Text fontSize="11px" color="rgba(255,255,255,0.55)" mb={2}>
            {displayXp.toLocaleString()} XP · {unlocked.size}/{ACHIEVEMENTS.length} achievements · {totalTokens} tokens
          </Text>
          <Box>
            <HStack justify="space-between" mb={1}>
              <Text fontSize="9px" fontWeight="800" color="rgba(255,255,255,0.5)" letterSpacing="1px" textTransform="uppercase">
                LVL {level.level} → {level.level < 10 ? level.level + 1 : 'MAX'}
              </Text>
              <Text fontSize="9px" fontWeight="800" color={level.color}>
                {needed > 0 ? `${current}/${needed} XP` : 'MAX LEVEL'}
              </Text>
            </HStack>
            <Box h="8px" bg="rgba(255,255,255,0.1)" borderRadius="full" overflow="hidden">
              <Box h="100%" borderRadius="full"
                bg={`linear-gradient(90deg,${level.color}99,${level.color})`}
                w={`${pct}%`} transition="width 1s ease"
                boxShadow={`0 0 8px ${level.color}88`} />
            </Box>
          </Box>
        </Box>
      </HStack>
    </Box>
  );
};

// ─── Dramatic Leaderboard ─────────────────────────────────────────────────────
const DramaticLeaderboard = ({ currentUserId }: { currentUserId: string }) => {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('tracked_crops').select('user_id, progress_points, status').limit(500)
      .then(async ({ data: cropData }) => {
        if (!cropData) { setLoading(false); return; }
        const userMap: Record<string, { points: number; tokens: number; harvested: number }> = {};
        cropData.forEach(c => {
          if (!userMap[c.user_id]) userMap[c.user_id] = { points: 0, tokens: 0, harvested: 0 };
          userMap[c.user_id].points += c.progress_points;
          userMap[c.user_id].tokens += Math.floor(c.progress_points / 2);
          if (c.status === 'harvest_ready') userMap[c.user_id].harvested += 1;
        });
        const userIds = Object.keys(userMap);
        const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, username').in('id', userIds);
        const profileMap: Record<string, string> = {};
        (profiles ?? []).forEach((p: { id: string; first_name?: string; last_name?: string; username?: string }) => {
          const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
          profileMap[p.id] = fullName || p.username || '';
        });
        const leaderboard: LeaderboardRow[] = Object.entries(userMap)
          .map(([user_id, stats]) => ({
            user_id, username: profileMap[user_id] || `Farmer_${user_id.slice(0, 5)}`,
            total_points: stats.points, total_tokens: stats.tokens, crops_harvested: stats.harvested,
          }))
          .sort((a, b) => b.total_points - a.total_points).slice(0, 10);
        setRows(leaderboard); setLoading(false);
      });
  }, []);

  if (loading) return <Center py={12}><Spinner color="#f59e0b" /></Center>;
  if (rows.length === 0) return (
    <Box textAlign="center" py={12}>
      <Text fontSize="3xl" mb={2}>🏆</Text>
      <Text fontWeight="800" color="#14532d">No farmers on the board yet!</Text>
      <Text fontSize="sm" color="gray.400">Be the first to earn points.</Text>
    </Box>
  );

  const podiumConfig = [
    { vi: 0, rankOf: 1, height: '90px',  color: '#94a3b8', crown: '🥈', bg: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', label: '2nd Place'  },
    { vi: 1, rankOf: 0, height: '120px', color: '#f59e0b', crown: '🥇', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', label: 'Champion'   },
    { vi: 2, rankOf: 2, height: '70px',  color: '#b45309', crown: '🥉', bg: 'linear-gradient(135deg,#fef3c7,#fde68a)', label: '3rd Place'  },
  ];

  return (
    <Box>
      <HStack mb={6} gap={2}>
        <Text fontSize="2xl">🏆</Text>
        <Heading size="md" color="#14532d" fontWeight="900">Top Farmers</Heading>
        <Badge bg="#fef3c7" color="#92400e" borderRadius="full" fontSize="10px" px={2} fontWeight="800">LIVE</Badge>
      </HStack>

      {/* Podium — visual order: 2nd, 1st, 3rd */}
      <HStack align="flex-end" justify="center" gap={4} mb={8}>
        {podiumConfig.map(cfg => {
          const row = rows[cfg.rankOf];
          if (!row) return null;
          const isMe = row.user_id === currentUserId;
          return (
            <VStack key={cfg.rankOf} gap={2} align="center">
              <Text fontSize="9px" fontWeight="900" color={cfg.color} letterSpacing="2px" textTransform="uppercase">
                {cfg.label}
              </Text>
              <Box w="52px" h="52px" borderRadius="full"
                bg={cfg.bg} border={`3px solid ${cfg.color}`}
                display="flex" alignItems="center" justifyContent="center" fontSize="24px"
                boxShadow={isMe ? `0 0 20px ${cfg.color}88` : `0 4px 12px ${cfg.color}44`}>
                {cfg.crown}
              </Box>
              <Text fontSize="12px" fontWeight="900" color={isMe ? '#16a34a' : '#1a1a1a'} textAlign="center" maxW="80px">
                {isMe ? 'You!' : row.username}
              </Text>
              <Box h={cfg.height} w="72px" borderRadius="12px 12px 0 0"
                bg={cfg.bg} border={`1.5px solid ${cfg.color}44`}
                display="flex" alignItems="center" justifyContent="center" flexDirection="column" gap={1}>
                <Text fontSize="16px" fontWeight="900" color={cfg.color}>{row.total_points}</Text>
                <Text fontSize="9px" fontWeight="700" color="gray.500">pts</Text>
              </Box>
            </VStack>
          );
        })}
      </HStack>

      <VStack gap={2} align="stretch">
        {rows.slice(3).map((row, i) => {
          const rank = i + 4;
          const isMe = row.user_id === currentUserId;
          return (
            <HStack key={row.user_id} gap={3} py={2.5} px={4}
              bg={isMe ? '#f0fdf4' : 'white'} borderRadius="14px"
              border={`1.5px solid ${isMe ? '#86efac' : '#f3f4f6'}`}
              boxShadow={isMe ? '0 2px 12px rgba(22,163,74,0.15)' : 'none'}>
              <Text fontSize="14px" fontWeight="900" color="gray.400" w="24px" textAlign="center">#{rank}</Text>
              <Text fontSize="16px">🧑‍🌾</Text>
              <Text fontSize="13px" fontWeight="800" color={isMe ? '#16a34a' : '#1a1a1a'} flex={1}>
                {isMe ? 'You' : row.username}
              </Text>
              <VStack gap={0} align="flex-end">
                <Text fontSize="13px" fontWeight="900" color="#14532d">{row.total_points} pts</Text>
                <Text fontSize="10px" color="gray.400">{row.total_tokens} tokens</Text>
              </VStack>
            </HStack>
          );
        })}
      </VStack>
      {!rows.find(r => r.user_id === currentUserId) && (
        <Box mt={4} py={3} px={4} bg="#f0fdf4" borderRadius="14px" border="1.5px solid #86efac" textAlign="center">
          <Text fontSize="12px" color="#16a34a" fontWeight="700">
            Not in the top 10 yet — keep verifying to climb! 🚀
          </Text>
        </Box>
      )}
    </Box>
  );
};

// ─── Achievement Gallery ──────────────────────────────────────────────────────
const AchievementGallery = ({ userId, seed }: { userId: string; seed?: number }) => {
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  // BUG FIX: also re-read whenever `seed` bumps (after async DB hydration)
  // so achievements earned in previous sessions appear immediately.
  useEffect(() => { setUnlocked(getUnlockedAchievements(userId)); }, [userId, seed]);
  const rarityOrder: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
  const sorted = [...ACHIEVEMENTS].sort((a, b) => (rarityOrder[a.rarity] ?? 3) - (rarityOrder[b.rarity] ?? 3));
  const rarityColors: Record<string, string> = { common: '#22c55e', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b' };

  return (
    <Box>
      <HStack mb={4} gap={2} justify="space-between">
        <HStack gap={2}>
          <Text fontSize="lg">🏅</Text>
          <Heading size="md" color="#14532d" fontWeight="900">Achievements</Heading>
        </HStack>
        <Text fontSize="12px" fontWeight="700" color="gray.500">{unlocked.size}/{ACHIEVEMENTS.length} unlocked</Text>
      </HStack>
      <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(155px, 1fr))" gap={3}>
        {sorted.map(a => {
          const done = unlocked.has(a.id);
          const color = rarityColors[a.rarity] ?? '#22c55e';
          return (
            <Box key={a.id} bg={done ? 'white' : '#f9fafb'} borderRadius="16px" p={4}
              border={`1.5px solid ${done ? color + '44' : '#e5e7eb'}`}
              opacity={done ? 1 : 0.5}
              boxShadow={done ? `0 2px 12px ${color}22` : 'none'}
              transition="all 0.2s"
              _hover={{ transform: done ? 'translateY(-2px)' : 'none', boxShadow: done ? `0 6px 20px ${color}33` : 'none' }}
            >
              <Text fontSize="28px" mb={2} style={{ filter: done ? 'none' : 'grayscale(1)' }}>{a.icon}</Text>
              <Text fontSize="10px" fontWeight="900" color={done ? color : 'gray.400'}
                letterSpacing="1px" textTransform="uppercase" mb={0.5}>{a.rarity}</Text>
              <Text fontSize="13px" fontWeight="900" color={done ? '#1a1a1a' : 'gray.400'} lineHeight="1.2" mb={1}>
                {a.title}
              </Text>
              <Text fontSize="10px" color="gray.400" lineHeight="1.4">{a.desc}</Text>
              {done && <Text fontSize="10px" fontWeight="800" color={color} mt={1}>+{a.xp} XP earned</Text>}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ─── Gamified Tutorial ────────────────────────────────────────────────────────


const AgriCoolMascot = ({
  size = 90,
  animate = false,
  expression = 'normal',
}: {
  size?: number;
  animate?: boolean;
  expression?: 'normal' | 'excited' | 'wink' | 'celebrate';
}) => {
  const isExcited   = expression === 'excited' || expression === 'celebrate';
  const isCelebrate = expression === 'celebrate';
  return (
    <svg
      width={size} height={size * 1.45}
      viewBox="0 0 200 290"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: isExcited ? 'drop-shadow(0 0 18px #F5D80088)' : 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))',
        transition: 'filter 0.4s ease',
        ...(animate ? {
          animation: isCelebrate
            ? 'kool-bounce 0.5s ease infinite alternate'
            : 'kool-float 3s ease-in-out infinite',
        } : {}),
      }}
    >
      <g transform="translate(15, 10)">
        <path d="M80 240 C10 190 -10 90 60 20 C100 -15 175 15 185 90 C195 165 140 220 80 240Z" fill="#F5D800" />
        <path d="M80 240 C55 200 45 145 70 90 C88 48 148 30 170 85 C188 130 155 200 80 240Z" fill="#7DC400" />
        <path d="M80 240 Q74 260 60 272" fill="none" stroke="#4a8a00" strokeWidth="5" strokeLinecap="round" />
        {/* Left lens */}
        <rect x="22" y="100" width="52" height="34" rx="10" fill="#1a1a1a" />
        {/* Right lens — squint on wink */}
        {expression === 'wink'
          ? <rect x="88" y="109" width="52" height="16" rx="8" fill="#1a1a1a" />
          : <rect x="88" y="100" width="52" height="34" rx="10" fill="#1a1a1a" />
        }
        <rect x="74" y="112" width="14" height="7" rx="3" fill="#1a1a1a" />
        <rect x="4"   y="109" width="18" height="7" rx="3" fill="#1a1a1a" />
        <rect x="140" y="109" width="18" height="7" rx="3" fill="#1a1a1a" />
        <ellipse cx="40"  cy="111" rx="8" ry="5" fill="#fff" opacity="0.22" />
        {expression !== 'wink' && <ellipse cx="106" cy="111" rx="8" ry="5" fill="#fff" opacity="0.22" />}
        {/* Mouth */}
        {isExcited
          ? <path d="M58 162 Q80 184 108 162" fill="none" stroke="#4a8a00" strokeWidth="5" strokeLinecap="round" />
          : expression === 'wink'
          ? <path d="M65 165 Q85 172 100 162" fill="none" stroke="#4a8a00" strokeWidth="4" strokeLinecap="round" />
          : <path d="M62 162 Q82 176 105 162" fill="none" stroke="#4a8a00" strokeWidth="4" strokeLinecap="round" />
        }
        {/* Celebrate extras */}
        {isCelebrate && <>
          <text x="155" y="55"  fontSize="22" style={{ userSelect: 'none' }}>⭐</text>
          <text x="5"   y="70"  fontSize="18" style={{ userSelect: 'none' }}>✨</text>
          <text x="145" y="200" fontSize="16" style={{ userSelect: 'none' }}>🎉</text>
        </>}
      </g>
    </svg>
  );
};

type TutorialExpression = 'normal' | 'excited' | 'wink' | 'celebrate';

type TutorialStep = {
  title: string;
  body: string;
  tip?: string;
  expression: TutorialExpression;
  icon: string;
  bg: string;
  accent: string;
  xp: number;
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Hey Farmer, I'm Kool! 👋",
    body: "Welcome to the AgriCool Crop Tracker! I'm your guide — a chill leaf with shades. Let's walk through everything you need to know to start earning Free Listing Tokens.",
    expression: 'excited',
    icon: '🌿', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', accent: '#16a34a', xp: 0,
  },
  {
    title: 'Queue Your Crops 🌱',
    body: "Pick a crop and tell us how many days it's already been in the ground — maximum 10 days. This locks your timeline. Once you start, there's no going back!",
    tip: '💡 Queue crops that are in season for faster, healthier growth.',
    expression: 'normal',
    icon: '🌱', bg: 'linear-gradient(135deg,#f0fdf4,#d1fae5)', accent: '#059669', xp: 13,
  },
  {
    title: 'Complete Daily Tasks ✅',
    body: "Every crop gets its own care schedule — watering, shading, pest checks. Each task has a 30-minute window (±15 min from the scheduled time). Miss the window? Task fails.",
    tip: '⚠️ If 4 or more tasks fail in one day, your photo upload is blocked.',
    expression: 'wink',
    icon: '📋', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', accent: '#2563eb', xp: 26,
  },
  {
    title: 'Upload a Photo Every 3 Days 📸',
    body: "Every 3 days, a 48-hour window opens. Upload a real photo — our AI checks the plant's health and gives you instant feedback!",
    tip: '🤖 Claude reads your photo and tells you if it\'s healthy or what problem it spotted.',
    expression: 'excited',
    icon: '📸', bg: 'linear-gradient(135deg,#fdf4ff,#f3e8ff)', accent: '#7c3aed', xp: 39,
  },
  {
    title: 'Earn Progress Points & Tokens 🎟️',
    body: "Each successful photo = +1 progress point. Every 2 points earns you 1 Free Listing Token — that's ₱20 saved every time you list a crop on the marketplace!",
    tip: '🔥 Keep a 3-verification streak and earn a BONUS token on top!',
    expression: 'celebrate',
    icon: '🎟️', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', accent: '#d97706', xp: 52,
  },
  {
    title: "Don't Let Your Crop Wilt! 🥀",
    body: "Miss a verification window entirely and your crop wilts — your streak drops by 1. But don't give up! Submit a recovery photo to get back on track (costs −1 point).",
    tip: '✅ Recovery is always worth it — a wilted crop can still earn tokens!',
    expression: 'wink',
    icon: '🥀', bg: 'linear-gradient(135deg,#fff1f2,#ffe4e6)', accent: '#e11d48', xp: 65,
  },
  {
    title: 'Harvest at 10 Points 🌾',
    body: "Hit 10 progress points and your crop is harvest-ready! Submit a harvest photo and unlock a downloadable Harvest Badge — proof of your hard work.",
    tip: '🏅 Share your badge on social media and show off your farming skills!',
    expression: 'celebrate',
    icon: '🌾', bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', accent: '#ea580c', xp: 78,
  },
  {
    title: 'Climb the Leaderboard 🏆',
    body: "All your points add up on the Top Farmers Leaderboard. Compete with other farmers — the more you verify and harvest, the higher you rank!",
    tip: '🥇 Top farmers get bragging rights AND inspire the whole community.',
    expression: 'excited',
    icon: '🏆', bg: 'linear-gradient(135deg,#f0fdf4,#d1fae5)', accent: '#16a34a', xp: 91,
  },
  {
    title: "You're Ready to Farm! 🚀",
    body: "That's everything, farmer! Queue your first crop, complete your tasks, and start earning tokens. The harvest won't wait — let's grow something great together!",
    expression: 'celebrate',
    icon: '🚀', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', accent: '#16a34a', xp: 100,
  },
];

const TutorialParticles = () => {
  const items = ['🌾', '🎟️', '⭐', '🌱', '✨', '🔥', '🏆', '🎉'];
  return (
    <Box position="absolute" inset={0} pointerEvents="none" overflow="hidden" borderRadius="28px">
      {items.map((emoji, i) => (
        <Box
          key={i}
          position="absolute"
          left={`${8 + i * 11}%`}
          top="100%"
          fontSize="17px"
          style={{
            animation: `tut-particle ${1.3 + i * 0.18}s ease-out ${i * 0.09}s forwards`,
            opacity: 0,
          }}
        >
          {emoji}
        </Box>
      ))}
    </Box>
  );
};
// ─── Main Component ───────────────────────────────────────────────────────────
const GamifiedDashboard = () => {
  const { user } = useAuth();
  const { isPremium, grantListingToken, refreshRevenue } = useRevenue();

  const QUEUE_LIMIT = isPremium ? 10 : 4;
  const DELETE_LOCK_DAYS = 5;

  const [crops, setCrops] = useState<TrackedCrop[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [showAddCrop, setShowAddCrop] = useState(false);
  const [verifyingCrop, setVerifyingCrop] = useState<TrackedCrop | null>(null);
  const [verifyIsRecovery, setVerifyIsRecovery] = useState(false);
  const [harvestingCrop, setHarvestingCrop] = useState<TrackedCrop | null>(null);
  const [badgeCrop, setBadgeCrop] = useState<TrackedCrop | null>(null);
  const [newTask, setNewTask] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [newTaskCrop, setNewTaskCrop] = useState('General');
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState<Date>(serverNow);
  const [ntpReady, setNtpReady] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [aiResultModal, setAiResultModal] = useState<{ cropName: string; emoji: string; note: string; photoUrl: string } | null>(null);

  // ── Gamification state ────────────────────────────────────────────────────
  const [farmerXP, setFarmerXP_state] = useState(0);
  const [levelUpData, setLevelUpData] = useState<typeof FARMER_LEVELS[0] | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
  const pendingAchievement = achievementQueue[0] ?? null;
  const setPendingAchievement = (a: Achievement | null) => {
    if (a === null) return; // use dismissAchievement to clear
    setAchievementQueue(q => q.some(x => x.id === a.id) ? q : [...q, a]);
  };
  const dismissAchievement = () => setAchievementQueue(q => q.slice(1));
  // BUG FIX: used to force AchievementGallery to re-read localStorage after
  // async DB hydration completes (see achievementSeed in useEffect below).
  const [achievementSeed, setAchievementSeed] = useState(0);
  const [journalSeed, setJournalSeed] = useState(0);
  const [xpPopup, setXpPopup] = useState<{ amount: number; label: string } | null>(null);
  const [confetti, setConfetti] = useState(false);
  // Daily quest stats (tracked in memory, refreshed on actions)
  const [dailyVerifies, setDailyVerifies] = useState(0);
  const [dailyTokensEarned, setDailyTokensEarned] = useState(0);
  // Quest progress: keyed by quest id, tracks current count + completion
  const [questProgress, setQuestProgress] = useState<QuestProgressMap>({});

  // Load XP + achievements + quest progress from Supabase on mount
  useEffect(() => {
    if (!user) return;
    // Fast local seed first (no flicker)
    setFarmerXP_state(getFarmerXP(user.id));
    // Then hydrate from DB (source of truth)
    loadFarmerXPFromDB(user.id).then(xp => setFarmerXP_state(xp));
    // Load profile username so nickname changes are immediately visible
    supabase.from('profiles').select('first_name, last_name, username').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          // Prefer the user's actual name (first + last) over username,
          // because username may still hold the old email-prefix value.
          const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
          const name = fullName || data.username || null;
          if (name) setProfileUsername(name);
        }
      });
    // BUG FIX: loadAchievementsFromDB was called but its result was discarded,
    // so AchievementGallery never saw achievements stored in DB — it only read
    // from localStorage which starts empty on a fresh browser session.
    // Now we propagate the DB result into component state so the gallery re-renders.
    loadAchievementsFromDB(user.id).then(() => {
      // achievements are written to localStorage by loadAchievementsFromDB;
      // force AchievementGallery to re-read by bumping a counter it depends on.
      setAchievementSeed(s => s + 1);
    });
    setQuestProgress(getQuestProgress(user.id));
  }, [user]);

  const awardXP = useCallback((amount: number, label: string) => {
    if (!user) return;
    // async path: write to Supabase, update local state when resolved
    addFarmerXPToDB(user.id, amount).then(result => {
      setFarmerXP_state(result.newXp);
      setXpPopup({ amount, label });
      if (result.leveledUp && result.newLevel) {
        setConfetti(true);
        setTimeout(() => setLevelUpData(result.newLevel), 600);
        if (result.newLevel.level >= 5) {
          if (unlockAchievement(user.id, 'level_5')) {
            const a = ACHIEVEMENTS.find(x => x.id === 'level_5')!;
            setTimeout(() => setPendingAchievement(a), 2000);
          }
        }
        if (result.newLevel.level >= 10) {
          if (unlockAchievement(user.id, 'harvest_king')) {
            const a = ACHIEVEMENTS.find(x => x.id === 'harvest_king')!;
            setTimeout(() => setPendingAchievement(a), 2000);
          }
        }
      }
    });
  }, [user]);

  // ── Quest progress helper ────────────────────────────────────────────────
  const advanceQuest = useCallback((type: DailyQuest['type'], increment = 1) => {
    if (!user) return;
    const quests = getDailyQuests(user.id);
    setQuestProgress(prev => {
      const next = { ...prev };
      quests.forEach(q => {
        if (q.type !== type) return;
        const cur = next[q.id] ?? { progress: 0, completed: false };
        if (cur.completed) return;
        const newProgress = Math.min(cur.progress + increment, q.target);
        const justCompleted = newProgress >= q.target;
        next[q.id] = { progress: newProgress, completed: justCompleted };
        if (justCompleted) {
          awardXP(q.xp, `Quest: ${q.title}`);
          showToast(`⚡ Quest complete: "${q.title}"! +${q.xp} XP`);
        }
      });
      saveQuestProgress(user.id, next);
      return next;
    });
  }, [user, awardXP]);

  const checkAndUnlockAchievement = useCallback((id: string) => {
    if (!user) return;
    const isNew = unlockAchievement(user.id, id);
    if (isNew) {
      const a = ACHIEVEMENTS.find(x => x.id === id);
      if (a) {
        // Bump seed immediately so AchievementGallery re-reads localStorage
        // and lights up the newly unlocked achievement right away.
        setAchievementSeed(s => s + 1);
        setTimeout(() => {
          setPendingAchievement(a);
          awardXP(a.xp, `Achievement: ${a.title}`);
        }, 800);
      }
    }
  }, [user, awardXP]);

  // Track which task IDs have already been auto-failed to avoid repeated DB calls
  const autoFailedIds = useRef<Set<string>>(new Set());

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── NTP sync + 1-second ticker ─────────────────────────────────────────────
  useEffect(() => {
    syncNTPClock().then(() => { setNtpReady(_ntpSynced); setNow(serverNow()); });
    const syncInterval = setInterval(() => syncNTPClock().then(() => setNtpReady(_ntpSynced)), 5 * 60 * 1000);
    const tickInterval = setInterval(() => setNow(serverNow()), 1_000);
    return () => { clearInterval(syncInterval); clearInterval(tickInterval); };
  }, []);

  // ── Auto-fail expired tasks (deduplicated) ─────────────────────────────────
  useEffect(() => {
    tasks.forEach(async task => {
      if (task.failed || task.done || !task.due_time) return;
      if (autoFailedIds.current.has(task.id)) return;
      const state = getTaskWindowState(task, now);
      if (state === 'expired') {
        autoFailedIds.current.add(task.id);
        await supabase.from('farm_tasks').update({ failed: true }).eq('id', task.id);
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, failed: true } : t));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchCrops = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('tracked_crops').select('*').eq('user_id', user.id)
      .order('queued_at', { ascending: false });
    if (!error && data) setCrops(data as TrackedCrop[]);
  }, [user]);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('farm_tasks').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setTasks(data as Task[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchCrops(), fetchTasks()]).finally(() => setLoading(false));
    const cropCh = supabase.channel('tracked_crops_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracked_crops', filter: `user_id=eq.${user.id}` }, () => fetchCrops())
      .subscribe();
    const taskCh = supabase.channel('farm_tasks_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farm_tasks', filter: `user_id=eq.${user.id}` }, () => fetchTasks())
      .subscribe();
    return () => { supabase.removeChannel(cropCh); supabase.removeChannel(taskCh); };
  }, [user, fetchCrops, fetchTasks]);

  // ── Tutorial: auto-show for new users ─────────────────────────────────────
  useEffect(() => {
    if (loading || !user) return;
    const seen = localStorage.getItem(`agricool_tutorial_seen_${user.id}`);
    if (!seen) setShowTutorial(true);
  }, [loading, user]);

  const handleTutorialDone = () => {
    if (user) localStorage.setItem(`agricool_tutorial_seen_${user.id}`, '1');
    setShowTutorial(false);
  };

  // ── Wilt detection (runs on mount + every 30 min) ────────────────────────
  const runWiltCheck = useCallback(async (currentCrops: TrackedCrop[]) => {
    for (const crop of currentCrops) {
      if (crop.status === 'wilted') continue;
      const window = getCurrentWindow(crop);
      if (window <= 0) continue;
      const prevWindow = window - 1;
      if (prevWindow > crop.last_verified_window) {
        await supabase.from('tracked_crops').update({ status: 'wilted', streak: 0 }).eq('id', crop.id);
        setCrops(prev => prev.map(c => c.id === crop.id ? { ...c, status: 'wilted', streak: 0 } : c));
      }
    }
  }, []);

  useEffect(() => {
    if (crops.length === 0) return;
    runWiltCheck(crops);
  // Run on mount and whenever crops update (covers re-opens after days away)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crops.length]); // intentionally keyed on length to avoid loop with runWiltCheck updates

  useEffect(() => {
    if (!user) return;
    // Also re-check every 30 minutes for long-running sessions
    const wiltInterval = setInterval(async () => {
      const { data } = await supabase.from('tracked_crops').select('*').eq('user_id', user.id);
      if (data) runWiltCheck(data as TrackedCrop[]);
    }, 30 * 60 * 1000);
    return () => clearInterval(wiltInterval);
  }, [user, runWiltCheck]);

  // ── Add crop ───────────────────────────────────────────────────────────────
  const handleAddCrop = async ({ name, emoji, initial_day }: { name: string; emoji: string; initial_day: number }) => {
    if (!user) return;
    if (initial_day > 10) return;
    if (crops.length >= QUEUE_LIMIT) {
      showToast(isPremium ? 'Queue limit reached (10).' : 'Free accounts: 4 crops max. Upgrade for 10!', 'error');
      return;
    }
    const { error } = await supabase.from('tracked_crops').insert({
      user_id: user.id, name, emoji, initial_day,
      queued_at: serverNow().toISOString(),
      progress_points: 0, status: 'growing',
      last_verified_window: -1, verification_pending: false,
      last_photo_url: null, last_verified_at: null, streak: 0,
    });
    if (error) { showToast('Failed to queue crop.', 'error'); return; }
    await fetchCrops();
    showToast(`${emoji} ${name} added to tracking queue!`);
  };

  // ── Verify photo (normal + recovery) ──────────────────────────────────────
  const handleVerify = async (cropId: string, photoFile: File, isRecovery: boolean) => {
    if (!user) return;
    setSaving(true);

    // Task gate (only for normal verification, not recovery)
    if (!isRecovery) {
      const today = serverNow().toISOString().slice(0, 10);
      // Only scheduled tasks (with due_time) count toward the block — not manual tasks
      const todayScheduledTasks = tasks.filter(t => t.due_time && t.due_time.slice(0, 10) === today);
      const failedCount = todayScheduledTasks.filter(t => t.failed).length;
      // Only block for pending tasks that are still in an active or upcoming window
      const anyPending  = todayScheduledTasks.some(t => {
        if (t.done || t.failed) return false;
        const s = getTaskWindowState(t, serverNow());
        return s === 'active' || s === 'pending';
      });
      if (failedCount >= 4) {
        showToast('⚠️ 4 or more tasks failed today — photo verification is blocked.', 'error');
        setSaving(false);
        return;
      }
      if (anyPending) {
        showToast('⏰ Pending tasks remain — finish them first.', 'error');
        setSaving(false);
        return;
      }
    }

    // Upload photo to storage (returns public URL + base64 for AI check)
    const uploaded = await uploadCropPhoto(user.id, photoFile);
    if (!uploaded) { setSaving(false); return; }
    const { url: photoUrl, base64: photoBase64 } = uploaded;

    // Run AI health check in parallel using base64 (don't block on it)
    const aiNotePromise = checkPlantHealthAI(photoBase64, crops.find(c => c.id === cropId)?.name ?? 'plant');

    const crop = crops.find(c => c.id === cropId);
    if (!crop) { setSaving(false); return; }

    const window = getCurrentWindow(crop);
    let newPoints: number;
    let newStatus: CropStatus;
    let newStreak: number;

    if (isRecovery) {
      newPoints = Math.max(0, crop.progress_points - 1); // penalty
      newStatus = 'growing';
      newStreak = Math.max(1, (crop.streak ?? 0) - 1); // soften: drop by 1, not full reset
    } else {
      newPoints = crop.progress_points + 1;
      newStreak = (crop.streak ?? 0) + 1;
      newStatus = newPoints >= 10 ? 'harvest_ready' : 'healthy';
    }

    const newTokens = Math.floor(newPoints / 2);
    const oldTokens = Math.floor(crop.progress_points / 2);
    const tokenEarned = !isRecovery && newTokens > oldTokens;

    const { error: updateError } = await supabase.from('tracked_crops').update({
      progress_points: newPoints,
      status: newStatus,
      last_verified_at: serverNow().toISOString(),
      last_verified_window: isRecovery ? crop.last_verified_window : window,
      last_photo_url: photoUrl,
      streak: newStreak,
    }).eq('id', cropId);

    if (updateError) { showToast('Verification failed to save.', 'error'); setSaving(false); return; }

    // Save journal entry (await AI result)
    const aiNote = await aiNotePromise;

    // Only store a URL in the DB — if storage upload worked it's a short URL,
    // if it fell back to base64, truncate it to avoid row-size failures.
    const safePhotoUrl = photoUrl.startsWith('data:')
      ? photoUrl.substring(0, 500) + '...[photo stored locally]'
      : photoUrl;

    const { error: journalError } = await supabase.from('crop_journal').insert({
      crop_id: cropId,
      user_id: user.id,
      crop_name: crop.name,
      crop_emoji: crop.emoji,
      day_number: isRecovery ? getDaysSinceQueued(crop) : window * 3,
      photo_url: safePhotoUrl,
      ai_health_note: aiNote,
      verified_at: serverNow().toISOString(),
    });

    if (journalError) {
      console.error('Journal insert failed:', journalError);
      showToast(`⚠️ Journal save failed: ${journalError.message}`, 'error');
    }

    await fetchCrops();
    setJournalSeed(s => s + 1); // force JournalTimeline to re-fetch after new photo
    // Auto-switch to Journal tab so the user can see their photo and AI result
    setActiveTab(2);

    // Token grant — now goes through RevenueProvider properly
    if (tokenEarned) {
      grantListingToken(`${crop.name} growth milestone`);
      refreshRevenue();

      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'system',
        title: '🎟️ Free Listing Token Earned!',
        message: `Your ${crop.name} hit ${newPoints} growth points. You earned a Free Listing Token!`,
        is_read: false,
      });
      showToast(`🎟️ Token earned! You can now post a crop for free.`);
      setConfetti(true);
      awardXP(XP_TABLE.tokenEarned, 'Token Earned');
      setDailyTokensEarned(t => t + 1);
      advanceQuest('token');
      checkAndUnlockAchievement('first_token');
      const allCropTokens = crops.reduce((s, c) => s + Math.floor(c.progress_points / 2), 0);
      if (allCropTokens + 1 >= 5) checkAndUnlockAchievement('five_tokens');
    } else if (isRecovery) {
      showToast(`🌿 Recovery submitted. Plant is back on track.`);
      awardXP(XP_TABLE.recovery, 'Recovery');
      checkAndUnlockAchievement('recovery_hero');
    } else {
      // Show AI result as a modal so the user can clearly see if it was verified
      setAiResultModal({ cropName: crop.name, emoji: crop.emoji, note: aiNote, photoUrl: photoBase64 });
      awardXP(XP_TABLE.verify, 'Verification');
      setDailyVerifies(v => v + 1);
      advanceQuest('verify');
      checkAndUnlockAchievement('first_verify');
    }

    // Streak bonus at 3+
    if (!isRecovery && newStreak >= 3 && newStreak % 3 === 0) {
      grantListingToken(`${crop.name} streak bonus (${newStreak} windows!)`);
      refreshRevenue();
      showToast(`🔥 ${newStreak}-streak bonus! +1 extra token earned!`);
      awardXP(XP_TABLE.streakBonus, `${newStreak}-Streak Bonus`);
      setConfetti(true);
      advanceQuest('streak');
      checkAndUnlockAchievement('streak_3');
      if (newStreak >= 5) checkAndUnlockAchievement('streak_5');
    } else if (!isRecovery && newStreak >= 3) {
      advanceQuest('streak');
      checkAndUnlockAchievement('streak_3');
    }

    setSaving(false);
  };

  // ── Harvest ────────────────────────────────────────────────────────────────
  const handleHarvest = async (cropId: string, photoFile: File) => {
    if (!user) return;
    const uploaded = await uploadCropPhoto(user.id, photoFile);
    if (!uploaded) return;
    const { url: photoUrl } = uploaded;

    const crop = crops.find(c => c.id === cropId);
    if (!crop) return;

    await supabase.from('tracked_crops').update({
      status: 'harvest_ready',
      last_photo_url: photoUrl,
    }).eq('id', cropId);

    await supabase.from('crop_journal').insert({
      crop_id: cropId,
      user_id: user.id,
      crop_name: crop.name,
      crop_emoji: crop.emoji,
      day_number: getDaysSinceQueued(crop),
      photo_url: photoUrl,
      ai_health_note: '🌾 Harvest confirmed!',
      verified_at: serverNow().toISOString(),
    });

    await fetchCrops();
    setJournalSeed(s => s + 1); // refresh journal after harvest photo
    setActiveTab(2); // auto-switch to Journal so user sees their harvest photo
    setBadgeCrop(crops.find(c => c.id === cropId) ?? null);
    showToast(`🌾 ${crop.name} harvested! Badge unlocked!`);
    setConfetti(true);
    awardXP(XP_TABLE.harvest, 'Harvest!');
    checkAndUnlockAchievement('first_harvest');
    const harvestedCount = crops.filter(c => c.status === 'harvest_ready').length + 1;
    if (harvestedCount >= 3) checkAndUnlockAchievement('three_harvests');
    // Award AgriCoins in garden for harvesting
    awardGardenCoins(user.id, 30);
  };

  // ── Delete crop ───────────────────────────────────────────────────────────
  const handleDeleteCrop = async (id: string) => {
    const crop = crops.find(c => c.id === id);
    if (!crop) return;
    const daysSinceQueued = getDaysSinceQueued(crop);
    if (daysSinceQueued < DELETE_LOCK_DAYS) {
      const daysLeft = DELETE_LOCK_DAYS - daysSinceQueued;
      showToast(`🔒 Cannot delete yet — ${daysLeft} day${daysLeft > 1 ? 's' : ''} remaining.`, 'error');
      return;
    }
    await supabase.from('tracked_crops').delete().eq('id', id);
    setCrops(prev => prev.filter(c => c.id !== id));
  };

  // ── Reminder → Task ────────────────────────────────────────────────────────
  const handleTransferReminderToTask = useCallback(async (reminder: {
    crop: string; emoji: string; message: string; time: string;
  }) => {
    if (!user) return;
    const label = `${reminder.emoji} ${reminder.message}`;
    const payload = {
      user_id: user.id, label, crop: reminder.crop,
      due: `Today at ${reminder.time}`,
      due_time: buildDueTime(reminder.time),
      done: false, failed: false, priority: 'medium' as Task['priority'],
      created_at: serverNow().toISOString(),
    };
    const { data, error } = await supabase.from('farm_tasks').insert(payload).select().single();
    if (!error && data) {
      setTasks(prev => {
        const exists = prev.some(t => t.label === label && t.due === payload.due);
        return exists ? prev : [data as Task, ...prev];
      });
      // BUG FIX: notify the user so the bell icon lights up and it appears in
      // the Notifications page. Previously tasks were created with no notification.
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'task',
        title: `📋 New Task: ${reminder.crop}`,
        message: `${label} — due today at ${reminder.time}`,
        is_read: false,
      });
    }
  }, [user]);

  // ── Task actions ──────────────────────────────────────────────────────────
  const handleAddTask = async () => {
    if (!newTask.trim() || !user) return;
    const payload = {
      user_id: user.id, label: newTask.trim(), crop: newTaskCrop || 'General',
      due: 'Today', due_time: null, done: false, failed: false,
      priority: newTaskPriority, created_at: serverNow().toISOString(),
    };
    const { data, error } = await supabase.from('farm_tasks').insert(payload).select().single();
    if (!error && data) {
      setTasks(prev => [data as Task, ...prev]);
      setNewTask('');
      // BUG FIX: notify the user so the bell icon lights up.
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'task',
        title: `📋 New Task Added`,
        message: `${newTask.trim()} — ${newTaskCrop || 'General'}`,
        is_read: false,
      });
    }
  };

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const state = getTaskWindowState(task, now);
    if (state === 'pending') { showToast('⏳ Task window hasn\'t opened yet!', 'error'); return; }
    if (state === 'expired' || state === 'failed') { showToast('❌ Time\'s up for this task.', 'error'); return; }
    const newDone = !task.done;
    await supabase.from('farm_tasks').update({ done: newDone }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: newDone } : t));
    if (newDone && user) {
      awardXP(XP_TABLE.taskDone, 'Task Complete');
      advanceQuest('task');
      // Award AgriCoins in garden for completing a task
      awardGardenCoins(user.id, 5);
    }
  };

  const handleDeleteTask = async (id: string) => {
    await supabase.from('farm_tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const wiltedCrops    = crops.filter(c => c.status === 'wilted').length;
  const healthyCrops   = crops.filter(c => c.status === 'healthy' || c.status === 'growing').length;
  const readyCrops     = crops.filter(c => c.status === 'harvest_ready').length;
  const totalTokens    = crops.reduce((s, c) => s + Math.floor(c.progress_points / 2), 0);
  const bestStreak     = crops.reduce((s, c) => Math.max(s, c.streak ?? 0), 0);
  const today          = now.toISOString().slice(0, 10);
  // Scheduled tasks = auto-generated reminders with a specific due_time for today
  const todayTasks         = tasks.filter(t => t.due_time ? t.due_time.slice(0, 10) === today : true);
  const todayScheduledOnly = tasks.filter(t => t.due_time && t.due_time.slice(0, 10) === today);
  const doneTasks      = todayTasks.filter(t => t.done).length;
  // Only count SCHEDULED (reminder-based) tasks toward the photo-block threshold
  const failedTasks    = todayScheduledOnly.filter(t => t.failed).length;
  const allTasksPassedToday = todayTasks.length > 0
    && !todayTasks.some(t => t.failed)
    && !todayTasks.some(t => !t.done && !t.failed && getTaskWindowState(t, now) === 'active');
  const pendingVerifications = crops.filter(c => isVerificationOpen(c) && c.status !== 'wilted').length;
  const username = profileUsername || user?.email?.split('@')[0] || 'Farmer';

  // ── Achievement triggers from derived stats ────────────────────────────────
  useEffect(() => {
    if (!user || loading) return;
    if (crops.length >= QUEUE_LIMIT) checkAndUnlockAchievement('full_queue');
    if (allTasksPassedToday && todayTasks.length > 0) checkAndUnlockAchievement('task_perfect');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crops.length, allTasksPassedToday, user, loading]);

  const dailyStatsForQuests = {
    verifies: dailyVerifies,
    tasksCompleted: doneTasks,
    bestStreak: bestStreak,
    tokensEarned: dailyTokensEarned,
    allTasksPassed: allTasksPassedToday,
  };

  if (loading) {
    return (
      <Center minH="60vh">
        <VStack gap={3}>
          <Spinner color="#16a34a" size="xl" />
          <Text color="gray.500" fontWeight="600">Loading your farm dashboard…</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box minH="100vh" bg="#f0e8c8" py={8} px={3}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.15;transform:scale(1.02)} }
        @keyframes confetti-up { 0%{opacity:1;transform:translateY(0) rotate(0deg)} 100%{opacity:0;transform:translateY(-220px) rotate(380deg)} }
        @keyframes xpPop { 0%{opacity:0;transform:translateX(-50%) scale(0.5)} 15%{opacity:1;transform:translateX(-50%) scale(1.1)} 75%{opacity:1;transform:translateX(-50%) scale(1) translateY(0)} 100%{opacity:0;transform:translateX(-50%) scale(0.9) translateY(-30px)} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(120px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
        @keyframes cropGlow { 0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,0)} 50%{box-shadow:0 0 0 6px rgba(22,163,74,0.2)} }
      `}</style>

      {/* Gamification overlays */}
      <ConfettiBurst trigger={confetti} onDone={() => setConfetti(false)} />
      {levelUpData && <LevelUpModal level={levelUpData} onClose={() => setLevelUpData(null)} />}
      {pendingAchievement && <AchievementToast achievement={pendingAchievement} onDone={dismissAchievement} />}
      {xpPopup && <XPPopup amount={xpPopup.amount} label={xpPopup.label} onDone={() => setXpPopup(null)} />}

      {/* Toast */}
      {toast && (
        <Box position="fixed" bottom="24px" left="50%" transform="translateX(-50%)"
          zIndex={2000}
          bg={toast.type === 'success' ? '#14532d' : '#7f1d1d'}
          color="white" px={5} py={3} borderRadius="full"
          boxShadow="0 8px 24px rgba(0,0,0,0.25)"
          fontSize="13px" fontWeight="700" whiteSpace="nowrap">
          {toast.msg}
        </Box>
      )}

      {showTutorial && <GamifiedTutorial onComplete={handleTutorialDone} onSkip={handleTutorialDone} />}
      {showAddCrop && (
        <QueueCropModal
          onAdd={handleAddCrop}
          onClose={() => setShowAddCrop(false)}
          now={now}
          farmerLevel={getFarmerLevel(farmerXP).level}
          userId={user?.id}
        />
      )}
      {verifyingCrop && (
        <VerifyModal
          crop={verifyingCrop}
          onVerify={handleVerify}
          onClose={() => { setVerifyingCrop(null); setVerifyIsRecovery(false); }}
          isRecovery={verifyIsRecovery}
        />
      )}
      {harvestingCrop && (
        <HarvestModal
          crop={harvestingCrop}
          onHarvest={handleHarvest}
          onClose={() => setHarvestingCrop(null)}
        />
      )}
      {badgeCrop && <HarvestBadgeModal crop={badgeCrop} onClose={() => setBadgeCrop(null)} />}

      {/* AI Verification Result Modal */}
      {aiResultModal && (
        <Box position="fixed" inset={0} zIndex={1100} bg="rgba(0,0,0,0.65)"
          display="flex" alignItems="center" justifyContent="center"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={() => setAiResultModal(null)}
        >
          <Box bg="white" borderRadius="24px" p={7} w="380px" maxW="95vw"
            boxShadow="0 24px 64px rgba(0,0,0,0.25)"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Photo thumbnail */}
            <Box borderRadius="16px" overflow="hidden" h="160px" mb={5} position="relative">
              <img src={aiResultModal.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <Box position="absolute" inset={0}
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%)' }} />
              <Box position="absolute" bottom="10px" left="12px">
                <Text fontSize="sm" fontWeight="900" color="white">
                  {aiResultModal.emoji} {aiResultModal.cropName}
                </Text>
              </Box>
            </Box>

            <Box bg="#f0fdf4" border="1.5px solid #86efac" borderRadius="14px" px={4} py={3} mb={5}>
              <Text fontSize="11px" fontWeight="900" color="#16a34a" letterSpacing="1px"
                textTransform="uppercase" mb={1}>🤖 AI Health Check</Text>
              <Text fontSize="13px" color="#14532d" fontWeight="600" lineHeight="1.5">
                {aiResultModal.note}
              </Text>
            </Box>

            <Box bg="#f0fdf4" borderRadius="12px" px={4} py={2.5} mb={5}>
              <Text fontSize="12px" color="#16a34a" fontWeight="700">
                ✅ +1 progress point earned! Check the Journal tab to see your growth timeline.
              </Text>
            </Box>

            <Button w="100%" bg="#16a34a" color="white" borderRadius="12px" fontWeight="800"
              _hover={{ bg: '#15803d' }} onClick={() => { setAiResultModal(null); setActiveTab(2); }}>
              📓 View in Journal
            </Button>
          </Box>
        </Box>
      )}

      <Box maxW="1100px" mx="auto">

        {/* ── Header ── */}
        <HStack justify="space-between" mb={8} wrap="wrap" gap={4}>
          <Box>
            <Text fontSize="xs" fontWeight="800" letterSpacing="widest" color="green.600" textTransform="uppercase" mb={1}>
              Gamified Crop Tracker
            </Text>
            <Heading fontSize={{ base: '2xl', md: '3xl' }} fontWeight="900" color="#14532d" letterSpacing="-1px">
              {username}'s Farm 🌾
            </Heading>
            <Text color="gray.500" fontSize="sm" mt={1}>Grow, verify, and earn free listing tokens.</Text>
          </Box>
          <HStack gap={3} wrap="wrap" align="flex-start">
            {/* Live Server Clock */}
            <Box bg="white" borderRadius="14px" px={4} py={2}
              border={`1.5px solid ${ntpReady ? '#d1fae5' : '#fde68a'}`}
              boxShadow="0 2px 8px rgba(0,0,0,0.05)" textAlign="center">
              <HStack gap={2} justify="center">
                <Box w="7px" h="7px" borderRadius="full" bg={ntpReady ? '#22c55e' : '#f59e0b'}
                  style={{ animation: 'pulse 1.5s infinite' }} />
                <Text fontSize="xs" fontWeight="800" color={ntpReady ? '#16a34a' : '#92400e'}>
                  {ntpReady ? '🇵🇭 PH National Time' : '⚠️ Syncing clock…'}
                </Text>
              </HStack>
              <Text fontSize="lg" fontWeight="900" color="#14532d" letterSpacing="tight">
                {now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </Text>
              <Text fontSize="10px" color="gray.400">
                {now.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
            </Box>

            <VStack gap={2} align="flex-end">
              {pendingVerifications > 0 && (
                <Badge bg="#fef3c7" color="#92400e" px={4} py={2} borderRadius="full" fontSize="sm" fontWeight="700"
                  boxShadow="0 2px 8px rgba(245,158,11,0.25)">
                  📸 {pendingVerifications} verification{pendingVerifications > 1 ? 's' : ''} due!
                </Badge>
              )}
              {saving && <Spinner size="sm" color="#16a34a" />}
              <Button
                variant="outline" borderRadius="full" fontWeight="700" fontSize="sm"
                color="gray.500" borderColor="#d1fae5"
                _hover={{ bg: '#f0fdf4' }}
                onClick={() => {
                  if (user) localStorage.removeItem(`agricool_tutorial_seen_${user.id}`);
                  setShowTutorial(true);
                }}
              >
                🎓 Tutorial
              </Button>
              <Button
                bg={crops.length >= QUEUE_LIMIT ? 'gray.300' : '#16a34a'}
                color={crops.length >= QUEUE_LIMIT ? 'gray.500' : 'white'}
                borderRadius="full" fontWeight="800" fontSize="sm"
                _hover={{ bg: crops.length >= QUEUE_LIMIT ? 'gray.300' : '#15803d' }}
                boxShadow={crops.length >= QUEUE_LIMIT ? 'none' : '0 4px 12px rgba(22,163,74,0.3)'}
                cursor={crops.length >= QUEUE_LIMIT ? 'not-allowed' : 'pointer'}
                onClick={() => crops.length < QUEUE_LIMIT && setShowAddCrop(true)}
              >
                {crops.length >= QUEUE_LIMIT ? '🔒 Queue Full' : `+ Queue Crop (${crops.length}/${QUEUE_LIMIT})`}
              </Button>
            </VStack>
          </HStack>
        </HStack>

        {/* ── Farmer Profile ── */}
        <FarmerProfileCard userId={user?.id ?? ''} username={username} totalTokens={totalTokens} xpOverride={farmerXP} seed={achievementSeed} />

        {/* ── Daily Quests ── */}
        {user && <DailyQuestPanel userId={user.id} dailyStats={dailyStatsForQuests} questProgress={questProgress} />}

        {/* ── Stats ── */}
        <Flex gap={3} mb={6} wrap="wrap">
          <StatCard emoji="🌱" label="Crop Queue"    value={`${crops.length}/${QUEUE_LIMIT}`}  sub={isPremium ? 'Premium' : 'Free · upgrade for 10'} color="#16a34a" />
          <StatCard emoji="💚" label="Growing"       value={`${healthyCrops}`}     sub="On track"          color="#22c55e" />
          <StatCard emoji="🥀" label="Wilted"        value={`${wiltedCrops}`}      sub="Need attention"    color="#ef4444" />
          <StatCard emoji="🌾" label="Harvest Ready" value={`${readyCrops}`}       sub="Pick now!"         color="#f59e0b" />
          <StatCard emoji="🎟️" label="Tokens Earned" value={`${totalTokens}`}      sub="Free listings"     color="#8b5cf6" />
          <StatCard emoji="🔥" label="Best Streak"   value={`${bestStreak}`}
            sub={bestStreak >= 3 ? '🎟️ Bonus token active!' : bestStreak >= 1 ? `${3 - bestStreak} more for bonus` : 'Verify to start streak'}
            color={bestStreak >= 3 ? '#f59e0b' : bestStreak >= 1 ? '#f97316' : '#9ca3af'} />
          <StatCard emoji="✅" label="Tasks Done"    value={todayTasks.length ? `${doneTasks}/${todayTasks.length}` : '0/0'}
            sub={failedTasks > 0 ? `${failedTasks} failed today` : 'Today'}
            color={failedTasks >= 4 ? '#ef4444' : failedTasks > 0 ? '#f97316' : '#3b82f6'} />
        </Flex>

        {/* ── Today Reminders ── */}
        {crops.length > 0 && (
          <TodayReminders
            crops={crops} userId={user?.id ?? ''} serverTime={now}
            onTransferToTask={handleTransferReminderToTask}
          />
        )}

        {/* ── Upcoming Care Schedule ── */}
        {crops.length > 0 && (
          <UpcomingCropTasks crops={crops} serverTime={now} />
        )}

        {/* ── Tabs ── */}
        <Tabs.Root
          value={activeTab.toString()}
          onValueChange={(e) => setActiveTab(Number(e.value))}
          mb={6}
        >
          <Tabs.List bg="white" borderRadius="14px" p={1} mb={6}
            border="1.5px solid #d1fae5" display="inline-flex" gap={1} flexWrap="wrap">
            {[
              { label: '🌿 Crops', dot: pendingVerifications > 0 },
              { label: '📋 Tasks', dot: false },
              { label: '📓 Journal', dot: false },
              { label: '🏆 Leaderboard', dot: false },
              { label: '🏅 Achievements', dot: false },
            ].map(({ label, dot }, i) => (
              <Box key={i} position="relative" display="inline-flex">
                <Tabs.Trigger
                  value={i.toString()}
                  px={4} py={2} borderRadius="10px" fontSize="sm" fontWeight="700"
                  color={activeTab === i ? '#14532d' : 'gray.500'}
                  bg={activeTab === i ? '#f0fdf4' : 'transparent'}
                  border={activeTab === i ? '1.5px solid #d1fae5' : '1.5px solid transparent'}
                  _hover={{ bg: '#f0fdf4' }} transition="all 0.15s"
                >
                  {label}
                </Tabs.Trigger>
                {dot && (
                  <Box position="absolute" top="4px" right="4px" w="7px" h="7px"
                    borderRadius="full" bg="#ef4444"
                    style={{ animation: 'pulse 1.5s infinite' }} />
                )}
              </Box>
            ))}
          </Tabs.List>

          {/* CROPS TAB */}
          <Tabs.Content value="0">
            <Flex gap={6} wrap="wrap" align="flex-start">
              <Box flex="2" minW="320px">
                <HStack mb={4} justify="space-between">
                  <Heading size="md" color="#14532d" fontWeight="900">🌿 Crop Queue</Heading>
                  <Badge
                    bg={crops.length >= QUEUE_LIMIT ? '#fee2e2' : '#dcfce7'}
                    color={crops.length >= QUEUE_LIMIT ? '#dc2626' : '#16a34a'}
                    px={3} py={1} borderRadius="full" fontSize="xs" fontWeight="700"
                  >
                    {crops.length}/{QUEUE_LIMIT} slots{!isPremium && ' · upgrade for 10'}
                  </Badge>
                </HStack>

                {crops.length === 0 ? (
                  <Box bg="white" borderRadius="20px" p={8} textAlign="center" border="2px dashed #d1fae5">
                    <Text fontSize="4xl" mb={3}>🌱</Text>
                    <Text fontWeight="800" color="#14532d" mb={1} fontSize="lg">Welcome to the Crop Tracker!</Text>
                    <Text fontSize="sm" color="gray.400" mb={5} maxW="360px" mx="auto">
                      Queue your crops, complete daily care tasks, upload photos every 3 days, and earn Free Listing Tokens — real value you can spend on AgriCool listings.
                    </Text>

                    {/* Mini how-it-works pills */}
                    <Flex gap={2} wrap="wrap" justify="center" mb={6}>
                      {[
                        { icon: '🌿', label: 'Queue crop' },
                        { icon: '✅', label: 'Do daily tasks' },
                        { icon: '📸', label: 'Upload photo every 3 days' },
                        { icon: '🤖', label: 'AI checks health' },
                        { icon: '🎟️', label: 'Earn tokens' },
                      ].map(({ icon, label }) => (
                        <Box key={label} bg="#f0fdf4" border="1px solid #d1fae5" borderRadius="full" px={3} py={1}>
                          <Text fontSize="11px" fontWeight="700" color="#14532d">{icon} {label}</Text>
                        </Box>
                      ))}
                    </Flex>

                    <Button bg="#16a34a" color="white" borderRadius="full" fontWeight="800"
                      _hover={{ bg: '#15803d' }} boxShadow="0 4px 12px rgba(22,163,74,0.3)"
                      onClick={() => setShowAddCrop(true)}>
                      + Queue Your First Crop
                    </Button>
                  </Box>
                ) : (
                  <Flex gap={4} wrap="wrap">
                    {crops.map(crop => (
                      <Box key={crop.id} flex="1" minW="260px">
                        <CropCard
                          crop={crop} now={now}
                          onVerify={(c, isRecovery = false) => { setVerifyIsRecovery(isRecovery); setVerifyingCrop(c); }}
                          onDelete={handleDeleteCrop}
                          onHarvest={(c) => setHarvestingCrop(c)}
                        />
                      </Box>
                    ))}
                  </Flex>
                )}

                {/* Reward explainer */}
                <Box mt={6} bg="white" borderRadius="16px" border="1.5px solid #e9d5ff" p={5}>
                  <Text fontWeight="800" color="#6d28d9" mb={3} fontSize="sm">🎟️ How Tokens Work</Text>
                  <VStack align="stretch" gap={2}>
                    {[
                      { step: '1', text: 'Queue a crop (max 10 days old to start)' },
                      { step: '2', text: 'Every 3 days, a 48-hour photo upload window opens' },
                      { step: '3', text: 'Complete daily tasks within their 30-min window (±15 min)' },
                      { step: '4', text: 'Upload a real photo — AI checks your plant health automatically' },
                      { step: '5', text: 'Earn 2 points → receive 1 Free Listing Token (skips ₱20 fee)' },
                      { step: '6', text: 'Maintain a 3-window streak → bonus token! Miss a window → wilt 🥀' },
                      { step: '7', text: 'Fail 4+ scheduled tasks in a day → photo upload blocked' },
                    ].map(({ step, text }) => (
                      <HStack key={step} gap={3}>
                        <Box w="22px" h="22px" borderRadius="full" flexShrink={0}
                          bg="#ede9fe" color="#6d28d9"
                          display="flex" alignItems="center" justifyContent="center"
                          fontSize="10px" fontWeight="900">
                          {step}
                        </Box>
                        <Text fontSize="12px" color="#374151" fontWeight="600">{text}</Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              </Box>
            </Flex>
          </Tabs.Content>

          {/* TASKS TAB */}
          <Tabs.Content value="1">
            <Box maxW="600px">
              <HStack mb={1} justify="space-between">
                <Heading size="md" color="#14532d" fontWeight="900">📋 Task Queue</Heading>
                {todayTasks.length > 0 && (
                  <Badge px={3} py={1} borderRadius="full" fontSize="10px" fontWeight="700"
                    bg={failedTasks > 0 ? '#fee2e2' : allTasksPassedToday ? '#dcfce7' : '#fef9c3'}
                    color={failedTasks > 0 ? '#dc2626' : allTasksPassedToday ? '#16a34a' : '#854d0e'}>
                    {failedTasks > 0 ? `❌ ${failedTasks} failed` : allTasksPassedToday ? '✅ All done!' : `${doneTasks}/${todayTasks.length} done`}
                  </Badge>
                )}
              </HStack>

              {todayTasks.length > 0 && (
                <Box mb={4} px={3} py={2} borderRadius="10px"
                  bg={failedTasks > 0 ? '#fff1f2' : allTasksPassedToday ? '#f0fdf4' : '#fefce8'}
                  border="1px solid"
                  borderColor={failedTasks > 0 ? '#fecdd3' : allTasksPassedToday ? '#bbf7d0' : '#fde68a'}>
                  <Text fontSize="11px" fontWeight="700"
                    color={failedTasks > 0 ? '#dc2626' : allTasksPassedToday ? '#16a34a' : '#92400e'}>
                    {failedTasks >= 4
                      ? `🚫 ${failedTasks} tasks failed — photo verification is blocked for today.`
                      : failedTasks > 0
                      ? `⚠️ ${failedTasks} task${failedTasks > 1 ? 's' : ''} failed (${4 - failedTasks} more will block photo submission).`
                      : allTasksPassedToday
                      ? '🌟 All tasks done! Submit your crop photo.'
                      : '⏰ Complete all tasks in their 30-min window to unlock photo submission.'}
                  </Text>
                </Box>
              )}

              <VStack gap={2} align="stretch">
                {(() => {
                  const active   = tasks.filter(t => getTaskWindowState(t, now) === 'active');
                  const pending  = tasks.filter(t => getTaskWindowState(t, now) === 'pending');
                  const manual   = tasks.filter(t => getTaskWindowState(t, now) === 'manual' && !t.done);
                  const failed   = tasks.filter(t => t.failed);
                  const upcomingCount = active.length + pending.length + manual.length;
                  return (
                    <>
                      {active.length > 0 && (<>
                        <Text fontSize="10px" color="#16a34a" fontWeight="800" textTransform="uppercase" px={1}>🟢 Active Now</Text>
                        {active.map(task => <TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} now={now} />)}
                      </>)}
                      {pending.length > 0 && (<>
                        <Text fontSize="10px" color="gray.400" fontWeight="800" textTransform="uppercase" px={1} mt={1}>⏳ Upcoming</Text>
                        {pending.map(task => <TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} now={now} />)}
                      </>)}
                      {manual.length > 0 && (<>
                        <Text fontSize="10px" color="gray.500" fontWeight="800" textTransform="uppercase" px={1} mt={1}>📝 Manual</Text>
                        {manual.map(task => <TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} now={now} />)}
                      </>)}
                      {upcomingCount === 0 && failed.length === 0 && tasks.length > 0 && (
                        <Box textAlign="center" py={6} bg="white" borderRadius="14px" border="1.5px dashed #d1fae5">
                          <Text fontSize="xl" mb={1}>✅</Text>
                          <Text fontSize="sm" color="gray.400" fontWeight="600">No upcoming tasks right now.</Text>
                          <Text fontSize="11px" color="gray.300">Completed and expired tasks are hidden.</Text>
                        </Box>
                      )}
                      {failed.length > 0 && (<>
                        <Box h="1px" bg="#fee2e2" my={2} />
                        <HStack justify="space-between" px={1}>
                          <Text fontSize="10px" color="#ef4444" fontWeight="800" textTransform="uppercase">
                            ❌ Failed ({failed.length}) {failed.length >= 4 ? '— 📸 Photo blocked' : `— ${4 - failed.length} more blocks photo`}
                          </Text>
                        </HStack>
                        {failed.map(task => <TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} now={now} />)}
                      </>)}
                      {tasks.length === 0 && (
                        <Box textAlign="center" py={8} bg="white" borderRadius="14px" border="1.5px dashed #d1fae5">
                          <Text fontSize="2xl" mb={2}>📋</Text>
                          <Text fontSize="sm" color="gray.400" fontWeight="600">Tasks will appear here automatically</Text>
                          <Text fontSize="11px" color="gray.300" mt={1}>Based on your queued crops and their schedule</Text>
                        </Box>
                      )}
                    </>
                  );
                })()}
              </VStack>
            </Box>
          </Tabs.Content>

          {/* JOURNAL TAB */}
          <Tabs.Content value="2">
            <Box>
              <HStack mb={5} gap={2}>
                <Heading size="md" color="#14532d" fontWeight="900">📓 Growth Journal</Heading>
                <Text fontSize="sm" color="gray.400">Every verified photo, in order</Text>
              </HStack>
              <JournalTimeline userId={user?.id ?? ''} seed={journalSeed} />
            </Box>
          </Tabs.Content>

          {/* LEADERBOARD TAB */}
          <Tabs.Content value="3">
            <Box maxW="640px">
              <DramaticLeaderboard currentUserId={user?.id ?? ''} />
            </Box>
          </Tabs.Content>

          {/* ACHIEVEMENTS TAB */}
          <Tabs.Content value="4">
            <AchievementGallery userId={user?.id ?? ''} seed={achievementSeed} />
          </Tabs.Content>

        </Tabs.Root>
      </Box>
    </Box>
  );
};

export default GamifiedDashboard;