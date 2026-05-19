import {
  Box, Flex, Heading, HStack, Text, VStack, Badge, Button,
  Spinner, Center, Input,
} from '@chakra-ui/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useRevenue } from '@/context/RevenueProvider';

// ─── Types ────────────────────────────────────────────────────────────────────
type CropStatus = 'healthy' | 'wilted' | 'growing' | 'harvest_ready';

type TrackedCrop = {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  // Day the user said the crop was planted (0–10 before queuing)
  initial_day: number;
  // ISO timestamp when this entry was created (the "queue lock" moment)
  queued_at: string;
  // Progress points earned (1 point per verified 3-day window)
  progress_points: number;
  status: CropStatus;
  // ISO timestamp of last approved photo upload
  last_verified_at: string | null;
  // Which 3-day window index was last verified (0 = days 0–3, 1 = days 3–6 …)
  last_verified_window: number;
  // Whether the current 3-day window's upload is pending / done
  verification_pending: boolean;
  // URL of last uploaded photo (stored via supabase storage)
  last_photo_url: string | null;
};

type Task = {
  id: string;
  user_id: string;
  label: string;
  crop: string;
  due: string;
  // ISO timestamp of the exact scheduled time (for reminder-derived tasks)
  due_time: string | null;
  done: boolean;
  // true when the 20-min window closed without the task being marked done
  failed: boolean;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
};

// ─── NTP-synced Server Clock ──────────────────────────────────────────────────
// Fetches the real Philippine national time from WorldTimeAPI.
// Stores the offset (serverMs - deviceMs) so every subsequent Date.now() call
// can be corrected without another network round-trip.
// Falls back to device clock if the fetch fails.

let _ntpOffsetMs = 0;          // server time − device time
let _ntpSynced   = false;

async function syncNTPClock(): Promise<void> {
  try {
    const before = Date.now();
    const res  = await fetch('https://worldtimeapi.org/api/timezone/Asia/Manila');
    const after = Date.now();
    if (!res.ok) return;
    const data = await res.json();
    // unixtime is seconds; account for half the round-trip latency
    const serverMs = data.unixtime * 1000 + (after - before) / 2;
    _ntpOffsetMs = serverMs - after;
    _ntpSynced   = true;
  } catch {
    // silently keep offset = 0 (device clock)
  }
}

/** Returns current server time as a Date, corrected via NTP offset. */
function serverNow(): Date {
  return new Date(Date.now() + _ntpOffsetMs);
}

// ─── Task window helpers ───────────────────────────────────────────────────────
type TaskWindowState = 'pending' | 'active' | 'expired' | 'done' | 'failed' | 'manual';

const TASK_WINDOW_MS = 10 * 60 * 1000; // ±10 minutes

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

// Build a due_time ISO string from today's HH:MM using server-corrected time
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

function isVerificationOpen(crop: TrackedCrop): boolean {
  const window = getCurrentWindow(crop);
  const windowStart = new Date(crop.queued_at).getTime()
    - crop.initial_day * 86400000
    + window * 3 * 86400000;
  const now = Date.now() + _ntpOffsetMs;
  return now >= windowStart && now < windowStart + 86400000 && window > crop.last_verified_window;
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

// ─── SQL schema hint (copy-paste into Supabase SQL editor) ────────────────────
// CREATE TABLE tracked_crops (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id uuid REFERENCES auth.users NOT NULL,
//   name text, emoji text, initial_day int DEFAULT 0,
//   queued_at timestamptz DEFAULT now(),
//   progress_points int DEFAULT 0,
//   status text DEFAULT 'growing',
//   last_verified_at timestamptz,
//   last_verified_window int DEFAULT -1,
//   verification_pending boolean DEFAULT false,
//   last_photo_url text
// );

// ─── Priority colors ──────────────────────────────────────────────────────────
const priorityColor: Record<Task['priority'], string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e',
};

// ─── Add Crop Modal ───────────────────────────────────────────────────────────
const AddCropModal = ({
  onAdd,
  onClose,
}: {
  onAdd: (crop: { name: string; emoji: string; initial_day: number }) => Promise<void>;
  onClose: () => void;
}) => {
  const [selected, setSelected] = useState(CROP_OPTIONS[0]);
  const [initialDay, setInitialDay] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (initialDay > 10) {
      setError('Max initial day is 10. Crops older than 10 days cannot be queued.');
      return;
    }
    setError('');
    setLoading(true);
    await onAdd({ name: selected.name, emoji: selected.emoji, initial_day: initialDay });
    setLoading(false);
    onClose();
  };

  return (
    <Box
      position="fixed" inset={0} zIndex={1000}
      bg="rgba(0,0,0,0.55)"
      display="flex" alignItems="center" justifyContent="center"
      onClick={onClose}
    >
      <Box
        bg="white" borderRadius="24px" p={7} w="360px"
        boxShadow="0 24px 64px rgba(0,0,0,0.22)"
        onClick={e => e.stopPropagation()}
      >
        <Text fontWeight="900" fontSize="xl" mb={1} color="#14532d" letterSpacing="-0.5px">
          🌱 Queue a New Crop
        </Text>
        <Text fontSize="xs" color="gray.400" mb={5}>
          Timeline locks once you hit Start — progress is permanent.
        </Text>

        <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={2}>
          Select Crop
        </Text>
        <Box display="grid" gridTemplateColumns="repeat(5, 1fr)" gap={2} mb={5}>
          {CROP_OPTIONS.map(opt => (
            <Box
              key={opt.name}
              textAlign="center" p={2} borderRadius="12px" cursor="pointer"
              border="2px solid"
              borderColor={selected.name === opt.name ? '#16a34a' : '#f3f4f6'}
              bg={selected.name === opt.name ? '#f0fdf4' : 'white'}
              transition="all 0.15s"
              onClick={() => setSelected(opt)}
            >
              <Text fontSize="xl">{opt.emoji}</Text>
              <Text fontSize="9px" fontWeight="700" color="gray.400" mt={0.5}>{opt.name}</Text>
            </Box>
          ))}
        </Box>

        <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={1}>
          Days already planted (0–10)
        </Text>
        <Text fontSize="11px" color="gray.400" mb={2}>
          If your crop is already in the ground, how many days has it been? Max: 10.
        </Text>
        <HStack mb={1}>
          <Input
            type="number" min={0} max={10}
            value={initialDay}
            onChange={e => setInitialDay(Math.min(10, Math.max(0, Number(e.target.value))))}
            borderRadius="10px" size="sm" w="80px"
            borderColor="#d1fae5" fontWeight="700" color="#14532d"
          />
          <Box flex={1} bg="#f0fdf4" borderRadius="8px" px={3} py={1.5}>
            <Box
              h="6px" borderRadius="full" bg="#d1fae5" overflow="hidden"
            >
              <Box
                h="100%" borderRadius="full"
                bg="linear-gradient(90deg,#4ade80,#16a34a)"
                w={`${(initialDay / 10) * 100}%`}
                transition="width 0.3s"
              />
            </Box>
            <Text fontSize="10px" color="#16a34a" fontWeight="700" mt={1}>
              Starting at {formatDay(initialDay)}
            </Text>
          </Box>
        </HStack>

        {error && (
          <Box bg="#fee2e2" borderRadius="8px" px={3} py={2} mb={3}>
            <Text fontSize="12px" color="#ef4444" fontWeight="700">{error}</Text>
          </Box>
        )}

        <HStack gap={2} mt={5}>
          <Button flex={1} variant="outline" borderRadius="12px" onClick={onClose} size="sm" color="gray.500">
            Cancel
          </Button>
          <Button
            flex={2} bg="#16a34a" color="white" borderRadius="12px"
            fontWeight="800" _hover={{ bg: '#15803d' }} size="sm"
            onClick={handleAdd} loading={loading}
          >
            🚀 Lock & Start
          </Button>
        </HStack>
      </Box>
    </Box>
  );
};

// ─── Photo Verification Modal ─────────────────────────────────────────────────
const VerifyModal = ({
  crop,
  onVerify,
  onClose,
}: {
  crop: TrackedCrop;
  onVerify: (cropId: string, photoFile: File) => Promise<void>;
  onClose: () => void;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    await onVerify(crop.id, file);
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
        <Text fontWeight="900" fontSize="xl" color="#14532d" mb={1}>
          📸 Photo Verification
        </Text>
        <Text fontSize="xs" color="gray.400" mb={1}>
          {crop.emoji} {crop.name} · {formatDay(verifyDay)} milestone
        </Text>
        <Text fontSize="xs" color="#16a34a" fontWeight="700" mb={4}>
          Upload a photo of your plant to earn +1 progress point.
        </Text>

        <Box
          border="2px dashed #d1fae5"
          borderRadius="16px"
          p={5}
          textAlign="center"
          cursor="pointer"
          bg={preview ? 'white' : '#f0fdf4'}
          onClick={() => inputRef.current?.click()}
          position="relative"
          overflow="hidden"
          h="160px"
          display="flex" alignItems="center" justifyContent="center"
        >
          {preview ? (
            <img
              src={preview}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px', position: 'absolute', inset: 0 }}
            />
          ) : (
            <VStack gap={2}>
              <Text fontSize="3xl">🌿</Text>
              <Text fontSize="sm" fontWeight="700" color="#16a34a">Tap to upload photo</Text>
              <Text fontSize="11px" color="gray.400">JPG, PNG — your physical plant today</Text>
            </VStack>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </Box>

        {preview && (
          <Text
            fontSize="11px" color="#16a34a" fontWeight="700" textAlign="center" mt={2}
            cursor="pointer" onClick={() => inputRef.current?.click()}
          >
            ↺ Change photo
          </Text>
        )}

        <HStack gap={2} mt={5}>
          <Button flex={1} variant="outline" borderRadius="12px" onClick={onClose} size="sm" color="gray.500">
            Cancel
          </Button>
          <Button
            flex={2} bg={file ? '#16a34a' : 'gray.200'} color={file ? 'white' : 'gray.400'}
            borderRadius="12px" fontWeight="800" size="sm"
            onClick={handleSubmit} loading={loading}
            disabled={!file}
            _hover={{ bg: file ? '#15803d' : 'gray.200' }}
          >
            ✓ Submit Verification
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
}: {
  crop: TrackedCrop;
  onVerify: (crop: TrackedCrop) => void;
  onDelete: (id: string) => void;
}) => {
  const dayCount = getDaysSinceQueued(crop);
  const isDeleteLocked = dayCount < 5;
  const currentWin = getCurrentWindow(crop);
  const verifyOpen = isVerificationOpen(crop);
  const accent = statusColor(crop.status);
  // Tokens: 1 for every 2 progress points
  const tokens = Math.floor(crop.progress_points / 2);
  // Progress bar: 1 point = 1 step on a scale of 0–10
  const maxPoints = 10;
  const progressPct = Math.min(100, (crop.progress_points / maxPoints) * 100);

  return (
    <Box
      bg="white"
      borderRadius="20px"
      border="1.5px solid"
      borderColor={accent + '44'}
      p={5}
      boxShadow="0 2px 16px rgba(0,0,0,0.06)"
      transition="transform 0.2s, box-shadow 0.2s"
      _hover={{ transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
      position="relative"
      overflow="hidden"
    >
      {/* Status stripe */}
      <Box
        position="absolute" left={0} top={0} bottom={0}
        w="4px" bg={accent} borderRadius="20px 0 0 20px"
      />

      {/* Delete — locked for first 5 days */}
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
        <Box>
          <Text fontWeight="800" fontSize="md" color="#1a1a1a">{crop.name}</Text>
          <Text fontSize="11px" color={accent} fontWeight="700">{statusLabel(crop.status)}</Text>
        </Box>
      </HStack>

      {/* Day counter */}
      <HStack justify="space-between" mb={2}>
        <Text fontSize="xs" color="gray.400" fontWeight="600">CURRENT DAY</Text>
        <Text fontSize="xs" fontWeight="800" color="#374151">{formatDay(dayCount)}</Text>
      </HStack>

      {/* Progress bar — 1 point per 3-day window */}
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
        {/* Tick marks every 2 points = 1 token */}
        <HStack justify="space-between" mt={1} px="2px">
          {Array.from({ length: 6 }).map((_, i) => (
            <Box
              key={i}
              w="6px" h="6px" borderRadius="full"
              bg={crop.progress_points >= i * 2 ? '#16a34a' : '#e5e7eb'}
            />
          ))}
        </HStack>
      </Box>

      {/* Token earned */}
      {tokens > 0 && (
        <HStack
          bg="#fefce8" border="1px solid #fde68a"
          borderRadius="10px" px={3} py={1.5} mb={3} gap={2}
        >
          <Text fontSize="14px">🎟️</Text>
          <Text fontSize="11px" fontWeight="700" color="#92400e">
            {tokens} Free Listing Token{tokens > 1 ? 's' : ''} earned!
          </Text>
        </HStack>
      )}

      {/* Wilted warning */}
      {crop.status === 'wilted' && (
        <Box bg="#fee2e2" border="1px solid #fca5a5" borderRadius="10px" px={3} py={2} mb={3}>
          <Text fontSize="11px" color="#dc2626" fontWeight="700">
            🥀 Wilted — complete corrective actions & upload a recovery photo to resume progress.
          </Text>
        </Box>
      )}

      {/* Verification CTA */}
      {verifyOpen ? (
        <Box
          as="button"
          w="100%"
          bg="linear-gradient(135deg,#16a34a,#15803d)"
          color="white"
          borderRadius="12px"
          py={2.5}
          fontSize="13px"
          fontWeight="800"
          textAlign="center"
          _hover={{ opacity: 0.9 }}
          transition="all 0.15s"
          onClick={() => onVerify(crop)}
          boxShadow="0 4px 12px rgba(22,163,74,0.35)"
        >
          📸 Upload Day {currentWin * 3} Verification Photo
        </Box>
      ) : crop.status !== 'wilted' ? (
        <HStack gap={2}>
          <Box
            flex={1}
            bg="#f0fdf4" borderRadius="10px" px={3} py={2}
            textAlign="center"
          >
            <Text fontSize="10px" color="#16a34a" fontWeight="700">
              Next upload opens on
            </Text>
            <Text fontSize="11px" color="#14532d" fontWeight="800">
              {formatDay((currentWin + 1) * 3)}
            </Text>
          </Box>
          <Box
            flex={1}
            bg="#f0fdf4" borderRadius="10px" px={3} py={2}
            textAlign="center"
          >
            <Text fontSize="10px" color="#16a34a" fontWeight="700">
              Verifications done
            </Text>
            <Text fontSize="11px" color="#14532d" fontWeight="800">
              {crop.last_verified_window + 1 >= 0 ? crop.last_verified_window + 1 : 0}
            </Text>
          </Box>
        </HStack>
      ) : null}

      {/* Last photo */}
      {crop.last_photo_url && (
        <Box mt={3} borderRadius="10px" overflow="hidden" h="70px">
          <img
            src={crop.last_photo_url}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Box>
      )}
    </Box>
  );
};

// ─── Reminder → Task transfer key (localStorage) ─────────────────────────────
function getReminderTransferKey(userId: string): string {
  const today = serverNow().toISOString().slice(0, 10); // YYYY-MM-DD PH time
  return `agricool_reminder_transferred_${userId}_${today}`;
}

function getTransferredReminders(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(getReminderTransferKey(userId));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markReminderTransferred(userId: string, key: string) {
  try {
    const set = getTransferredReminders(userId);
    set.add(key);
    localStorage.setItem(getReminderTransferKey(userId), JSON.stringify([...set]));
  } catch {}
}

// ─── Notifications Panel ──────────────────────────────────────────────────────
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

  const allReminders = crops
    .filter(c => c.status !== 'wilted')
    .flatMap(crop => {
      const templates = CROP_NOTIFICATIONS[crop.name] ?? DEFAULT_NOTIFICATIONS;
      return templates.map(t => {
        const [hStr, mStr] = t.time.split(':');
        return {
          crop: crop.name,
          emoji: crop.emoji,
          time: t.time,
          message: t.message,
          hour: parseInt(hStr),
          minute: parseInt(mStr ?? '0'),
        };
      });
    });

  // Reminders whose time has arrived (hour:minute <= now) — transfer these to Tasks
  const dueNow = allReminders.filter(
    r => r.hour < currentHour || (r.hour === currentHour && r.minute <= currentMinute)
  );

  // Upcoming reminders (not yet due) — show in the panel
  const upcoming = allReminders
    .filter(r => r.hour > currentHour || (r.hour === currentHour && r.minute > currentMinute))
    .sort((a, b) => a.hour - b.hour || a.minute - b.minute)
    .slice(0, 5);

  // Trigger transfer for due reminders that haven't been transferred today
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
    <Box
      bg="white" borderRadius="20px"
      border="1.5px solid #d1fae5"
      p={5} mb={6}
      boxShadow="0 2px 12px rgba(0,0,0,0.05)"
    >
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
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  now: Date;
}) => {
  const state = getTaskWindowState(task, now);
  const canToggle = state === 'active' || state === 'manual' || state === 'done';

  // Colors and labels per state
  const stateConfig: Record<TaskWindowState, { bg: string; border: string; checkBg: string; checkBorder: string; badge: string; badgeColor: string; opacity: number }> = {
    pending:  { bg: 'white',    border: '#d1fae5',  checkBg: 'transparent', checkBorder: '#d1d5db', badge: '⏳ Upcoming',       badgeColor: '#6b7280', opacity: 1 },
    active:   { bg: '#f0fdf4',  border: '#16a34a',  checkBg: 'transparent', checkBorder: '#16a34a', badge: '✅ Active Now',      badgeColor: '#16a34a', opacity: 1 },
    done:     { bg: '#f9fafb',  border: '#e5e7eb',  checkBg: '#22c55e',     checkBorder: '#22c55e', badge: '✓ Done',            badgeColor: '#22c55e', opacity: 0.6 },
    expired:  { bg: '#fff7ed',  border: '#fed7aa',  checkBg: 'transparent', checkBorder: '#f97316', badge: '⌛ Window Closed',  badgeColor: '#f97316', opacity: 0.75 },
    failed:   { bg: '#fff1f2',  border: '#fecdd3',  checkBg: '#ef4444',     checkBorder: '#ef4444', badge: '❌ Failed',         badgeColor: '#ef4444', opacity: 0.75 },
    manual:   { bg: 'white',    border: priorityColor[task.priority] + '33', checkBg: task.done ? '#22c55e' : 'transparent', checkBorder: task.done ? '#22c55e' : priorityColor[task.priority], badge: task.priority, badgeColor: priorityColor[task.priority], opacity: task.done ? 0.55 : 1 },
  };

  const cfg = stateConfig[state];

  // Countdown to window open / close
  const countdownLabel = (() => {
    if (!task.due_time || state === 'done' || state === 'failed') return null;
    const due = new Date(task.due_time).getTime();
    const WINDOW = 10 * 60 * 1000;
    const nowMs = now.getTime();
    if (state === 'pending') {
      const secsLeft = Math.max(0, Math.round((due - WINDOW - nowMs) / 1000));
      const m = Math.floor(secsLeft / 60), s = secsLeft % 60;
      return `Opens in ${m}m ${s}s`;
    }
    if (state === 'active') {
      const secsLeft = Math.max(0, Math.round((due + WINDOW - nowMs) / 1000));
      const m = Math.floor(secsLeft / 60), s = secsLeft % 60;
      return `Closes in ${m}m ${s}s`;
    }
    return null;
  })();

  return (
    <HStack
      py={2.5} px={3}
      bg={cfg.bg}
      borderRadius="12px"
      border="1.5px solid"
      borderColor={cfg.border}
      opacity={cfg.opacity}
      gap={3}
      transition="all 0.2s"
      _hover={{ transform: canToggle ? 'translateX(3px)' : 'none' }}
      position="relative"
    >
      {/* Active pulse ring */}
      {state === 'active' && (
        <Box
          position="absolute" inset={0} borderRadius="12px"
          border="2px solid #16a34a"
          opacity={0.4}
          style={{ animation: 'pulse 2s infinite' }}
          pointerEvents="none"
        />
      )}

      {/* Checkbox */}
      <Box
        w="20px" h="20px" borderRadius="full" flexShrink={0}
        border="2.5px solid"
        borderColor={cfg.checkBorder}
        bg={cfg.checkBg}
        display="flex" alignItems="center" justifyContent="center"
        cursor={canToggle ? 'pointer' : 'not-allowed'}
        onClick={() => canToggle && onToggle(task.id)}
        title={
          state === 'pending' ? 'Task window not open yet' :
          state === 'expired' ? 'Window closed — task expired' :
          state === 'failed'  ? 'Task failed — window passed' : undefined
        }
      >
        {(state === 'done') && <Text fontSize="9px" color="white" fontWeight="900">✓</Text>}
        {(state === 'failed') && <Text fontSize="9px" color="white" fontWeight="900">✕</Text>}
        {(state === 'expired') && <Text fontSize="9px" color="#f97316" fontWeight="900">!</Text>}
      </Box>

      {/* Label + due */}
      <Box flex={1} cursor={canToggle ? 'pointer' : 'default'} onClick={() => canToggle && onToggle(task.id)}>
        <Text
          fontSize="sm" fontWeight="700" color={state === 'failed' ? '#ef4444' : '#1a1a1a'}
          textDecoration={state === 'done' ? 'line-through' : 'none'}
        >
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

      {/* State badge */}
      <Badge
        px={2} py={0.5} borderRadius="full" fontSize="10px"
        bg={cfg.badgeColor + '18'}
        color={cfg.badgeColor}
        fontWeight="700" textTransform={state === 'manual' ? 'uppercase' : 'none'}
        whiteSpace="nowrap"
      >
        {cfg.badge}
      </Badge>

      {/* Delete */}
      <Box
        as="button" fontSize="11px"
        color={state === 'failed' || state === 'done' ? 'gray.300' : 'gray.200'}
        _hover={{ color: '#ef4444' }}
        onClick={() => onDelete(task.id)}
      >✕</Box>
    </HStack>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ emoji, label, value, sub, color }: {
  emoji: string; label: string; value: string; sub?: string; color: string;
}) => (
  <Box
    bg="white" borderRadius="16px" p={4}
    border="1.5px solid" borderColor={color + '33'}
    flex="1" minW="120px"
    boxShadow="0 2px 8px rgba(0,0,0,0.04)"
  >
    <Text fontSize="xl" mb={1}>{emoji}</Text>
    <Text fontSize="xl" fontWeight="900" color={color} letterSpacing="-0.5px">{value}</Text>
    <Text fontSize="xs" fontWeight="700" color="#374151">{label}</Text>
    {sub && <Text fontSize="10px" color="gray.400" mt={0.5}>{sub}</Text>}
  </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const GamifiedDashboard = () => {
  const { user } = useAuth();
  const { isPremium } = useRevenue();

  const QUEUE_LIMIT = isPremium ? 10 : 4;
  const DELETE_LOCK_DAYS = 5;

  const [crops, setCrops] = useState<TrackedCrop[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCrop, setShowAddCrop] = useState(false);
  const [verifyingCrop, setVerifyingCrop] = useState<TrackedCrop | null>(null);
  const [newTask, setNewTask] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [newTaskCrop, setNewTaskCrop] = useState('General');
  const [saving, setSaving] = useState(false);
  // Server-synced clock — ticks every second, corrected via NTP offset
  const [now, setNow] = useState<Date>(serverNow);
  const [ntpReady, setNtpReady] = useState(false);
  // Toast message
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── NTP sync + 1-second ticker ────────────────────────────────────────────
  useEffect(() => {
    // Initial NTP sync
    syncNTPClock().then(() => {
      setNtpReady(_ntpSynced);
      setNow(serverNow());
    });
    // Re-sync every 5 minutes to correct clock drift
    const syncInterval = setInterval(() => {
      syncNTPClock().then(() => setNtpReady(_ntpSynced));
    }, 5 * 60 * 1000);
    // Tick every second for live countdowns and immediate window enforcement
    const tickInterval = setInterval(() => setNow(serverNow()), 1_000);
    return () => {
      clearInterval(syncInterval);
      clearInterval(tickInterval);
    };
  }, []);

  // ── Auto-fail expired tasks ────────────────────────────────────────────────
  // Runs every time `now` ticks — marks any task whose window closed as failed
  useEffect(() => {
    tasks.forEach(async task => {
      if (task.failed || task.done || !task.due_time) return;
      const state = getTaskWindowState(task, now);
      if (state === 'expired') {
        await supabase.from('farm_tasks').update({ failed: true }).eq('id', task.id);
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, failed: true } : t));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchCrops = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('tracked_crops')
      .select('*')
      .eq('user_id', user.id)
      .order('queued_at', { ascending: false });
    if (!error && data) setCrops(data as TrackedCrop[]);
  }, [user]);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('farm_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setTasks(data as Task[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchCrops(), fetchTasks()]).finally(() => setLoading(false));

    const cropCh = supabase.channel('tracked_crops_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracked_crops', filter: `user_id=eq.${user.id}` },
        () => fetchCrops())
      .subscribe();

    const taskCh = supabase.channel('farm_tasks_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farm_tasks', filter: `user_id=eq.${user.id}` },
        () => fetchTasks())
      .subscribe();

    return () => {
      supabase.removeChannel(cropCh);
      supabase.removeChannel(taskCh);
    };
  }, [user, fetchCrops, fetchTasks]);

  // ── Crop: check for wilted crops (missed verification window) ─────────────
  useEffect(() => {
    crops.forEach(async crop => {
      if (crop.status === 'wilted') return;
      const window = getCurrentWindow(crop);
      if (window <= 0) return;
      // Previous window was not verified → wilt
      const prevWindow = window - 1;
      if (prevWindow > crop.last_verified_window) {
        await supabase.from('tracked_crops').update({ status: 'wilted' }).eq('id', crop.id);
        setCrops(prev => prev.map(c => c.id === crop.id ? { ...c, status: 'wilted' } : c));
      }
    });
  }, [crops]);

  // ── Crop: add ──────────────────────────────────────────────────────────────
  const handleAddCrop = async ({ name, emoji, initial_day }: {
    name: string; emoji: string; initial_day: number;
  }) => {
    if (!user) return;
    if (initial_day > 10) return;
    if (crops.length >= QUEUE_LIMIT) {
      showToast(
        isPremium
          ? 'Queue limit reached (10). Remove a crop to add another.'
          : 'Free accounts can only queue 4 crops. Upgrade to Premium for 10 slots!',
        'error'
      );
      return;
    }
    const { error } = await supabase.from('tracked_crops').insert({
      user_id: user.id,
      name,
      emoji,
      initial_day,
      queued_at: serverNow().toISOString(),
      progress_points: 0,
      status: 'growing',
      last_verified_window: -1,
      verification_pending: false,
      last_photo_url: null,
      last_verified_at: null,
    });
    if (error) { showToast('Failed to queue crop. Try again.', 'error'); return; }
    await fetchCrops();
    showToast(`${emoji} ${name} added to tracking queue!`);
  };

  // ── Crop: verify photo ─────────────────────────────────────────────────────
  const handleVerify = async (cropId: string, photoFile: File) => {
    if (!user) return;
    setSaving(true);

    // ── Daily task gate: ALL scheduled tasks for today must be done (not failed) ──
    const today = serverNow().toISOString().slice(0, 10);
    const todayScheduledTasks = tasks.filter(t => t.due_time && t.due_time.slice(0, 10) === today);
    const anyFailed  = todayScheduledTasks.some(t => t.failed);
    const anyPending = todayScheduledTasks.some(t => !t.done && !t.failed);
    if (anyFailed || anyPending) {
      const reason = anyFailed
        ? 'You have failed tasks today — complete all daily tasks to earn progress points.'
        : 'Some tasks for today are still pending. Finish all tasks before submitting your photo.';
      showToast(`⚠️ ${reason}`, 'error');
      setSaving(false);
      return;
    }

    // Convert photo to base64 data URL — no storage bucket required
    const photoUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(photoFile);
    }).catch(() => null);

    // Find the crop
    const crop = crops.find(c => c.id === cropId);
    if (!crop) { setSaving(false); return; }

    const window = getCurrentWindow(crop);
    const newPoints = crop.progress_points + 1;
    const newTokens = Math.floor(newPoints / 2);
    const oldTokens = Math.floor(crop.progress_points / 2);
    const tokenEarned = newTokens > oldTokens;

    const { error: updateError } = await supabase.from('tracked_crops').update({
      progress_points: newPoints,
      status: newPoints >= 10 ? 'harvest_ready' : 'healthy',
      last_verified_at: serverNow().toISOString(),
      last_verified_window: window,
      last_photo_url: photoUrl,
    }).eq('id', cropId);

    if (updateError) {
      showToast('Verification failed to save.', 'error');
      setSaving(false);
      return;
    }

    await fetchCrops();

    if (tokenEarned) {
      // Grant a free listing credit via RevenueProvider logic
      // We add 1 directly to localStorage revenue
      const storageKey = `agricool_revenue_${user.id}`;
      try {
        const raw = localStorage.getItem(storageKey);
        const rev = raw ? JSON.parse(raw) : { listingCredits: 3, transactions: [], totalSpent: 0, plan: 'free', isPremium: false };
        rev.listingCredits = (rev.listingCredits ?? 0) + 1;
        rev.transactions = [{
          id: Math.random().toString(36).slice(2).toUpperCase(),
          type: 'listing_fee',
          amount: 0,
          description: `🎟️ Free Listing Token — ${crop.name} growth milestone`,
          status: 'completed',
          createdAt: serverNow().toISOString(),
          method: 'reward',
        }, ...(rev.transactions ?? [])];
        localStorage.setItem(storageKey, JSON.stringify(rev));
      } catch {}

      // Fire a system notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'system',
        title: '🎟️ Free Listing Token Earned!',
        message: `Your ${crop.name} hit ${newPoints} growth points. You've earned a Free Listing Token — post a crop for free!`,
        is_read: false,
      });

      showToast(`🎟️ Token earned! You can now post a crop for free.`);
    } else {
      showToast(`✅ Verified! +1 progress point for ${crop.name}.`);
    }

    setSaving(false);
  };

  // ── Crop: delete ──────────────────────────────────────────────────────────
  const handleDeleteCrop = async (id: string) => {
    const crop = crops.find(c => c.id === id);
    if (!crop) return;
    const daysSinceQueued = getDaysSinceQueued(crop);
    if (daysSinceQueued < DELETE_LOCK_DAYS) {
      const daysLeft = DELETE_LOCK_DAYS - daysSinceQueued;
      showToast(
        `🔒 Cannot delete yet — ${daysLeft} day${daysLeft > 1 ? 's' : ''} remaining before this crop can be removed.`,
        'error'
      );
      return;
    }
    await supabase.from('tracked_crops').delete().eq('id', id);
    setCrops(prev => prev.filter(c => c.id !== id));
  };

  // ── Task actions ──────────────────────────────────────────────────────────
  // ── Reminder → Task auto-transfer ─────────────────────────────────────────
  const handleTransferReminderToTask = useCallback(async (reminder: {
    crop: string; emoji: string; message: string; time: string;
  }) => {
    if (!user) return;
    const label = `${reminder.emoji} ${reminder.message}`;
    const payload = {
      user_id: user.id,
      label,
      crop: reminder.crop,
      due: `Today at ${reminder.time}`,
      due_time: buildDueTime(reminder.time),
      done: false,
      failed: false,
      priority: 'medium' as Task['priority'],
      created_at: serverNow().toISOString(),
    };
    const { data, error } = await supabase.from('farm_tasks').insert(payload).select().single();
    if (!error && data) {
      setTasks(prev => {
        const exists = prev.some(t => t.label === label && t.due === payload.due);
        return exists ? prev : [data as Task, ...prev];
      });
      showToast(`📋 Reminder moved to Tasks: ${reminder.crop} at ${reminder.time}`);
    }
  }, [user]);

  // ── Task actions ──────────────────────────────────────────────────────────
  const handleAddTask = async () => {
    if (!newTask.trim() || !user) return;
    const payload = {
      user_id: user.id,
      label: newTask.trim(),
      crop: newTaskCrop || 'General',
      due: 'Today',
      due_time: null,
      done: false,
      failed: false,
      priority: newTaskPriority,
      created_at: serverNow().toISOString(),
    };
    const { data, error } = await supabase.from('farm_tasks').insert(payload).select().single();
    if (!error && data) {
      setTasks(prev => [data as Task, ...prev]);
      setNewTask('');
    }
  };

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    // Enforce window — only allow toggle for active/manual/done tasks
    const state = getTaskWindowState(task, now);
    if (state === 'pending') {
      showToast('⏳ This task window hasn\'t opened yet. Come back at the scheduled time!', 'error');
      return;
    }
    if (state === 'expired' || state === 'failed') {
      showToast('❌ Time\'s up — this task window has already closed.', 'error');
      return;
    }
    const newDone = !task.done;
    await supabase.from('farm_tasks').update({ done: newDone }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: newDone } : t));
  };

  const handleDeleteTask = async (id: string) => {
    await supabase.from('farm_tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const wiltedCrops = crops.filter(c => c.status === 'wilted').length;
  const healthyCrops = crops.filter(c => c.status === 'healthy' || c.status === 'growing').length;
  const readyCrops = crops.filter(c => c.status === 'harvest_ready').length;
  const totalTokens = crops.reduce((s, c) => s + Math.floor(c.progress_points / 2), 0);
  const today = now.toISOString().slice(0, 10);
  const todayTasks = tasks.filter(t => t.due_time ? t.due_time.slice(0, 10) === today : true);
  const doneTasks = todayTasks.filter(t => t.done).length;
  const failedTasks = todayTasks.filter(t => t.failed).length;
  const allTasksPassedToday = todayTasks.length > 0 && !todayTasks.some(t => t.failed) && !todayTasks.some(t => !t.done && !t.failed && getTaskWindowState(t, now) === 'active');
  const pendingVerifications = crops.filter(c => isVerificationOpen(c) && c.status !== 'wilted').length;

  const username = user?.email?.split('@')[0] ?? 'Farmer';

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
    <Box
      minH="100vh"
      bg="#f0e8c8"
      py={8} px={3}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.02); }
        }
      `}</style>
      {/* Toast */}
      {toast && (
        <Box
          position="fixed" bottom="24px" left="50%" transform="translateX(-50%)"
          zIndex={2000}
          bg={toast.type === 'success' ? '#14532d' : '#7f1d1d'}
          color="white"
          px={5} py={3} borderRadius="full"
          boxShadow="0 8px 24px rgba(0,0,0,0.25)"
          fontSize="13px" fontWeight="700"
          transition="all 0.3s"
          whiteSpace="nowrap"
        >
          {toast.msg}
        </Box>
      )}

      {showAddCrop && (
        <AddCropModal onAdd={handleAddCrop} onClose={() => setShowAddCrop(false)} />
      )}
      {verifyingCrop && (
        <VerifyModal
          crop={verifyingCrop}
          onVerify={handleVerify}
          onClose={() => setVerifyingCrop(null)}
        />
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
            <Text color="gray.500" fontSize="sm" mt={1}>
              Grow, verify, and earn free listing tokens.
            </Text>
          </Box>
          <HStack gap={3} wrap="wrap" align="flex-start">
            {/* Live Server Clock */}
            <Box
              bg="white" borderRadius="14px" px={4} py={2}
              border={`1.5px solid ${ntpReady ? '#d1fae5' : '#fde68a'}`}
              boxShadow="0 2px 8px rgba(0,0,0,0.05)"
              textAlign="center"
            >
              <HStack gap={2} justify="center">
                <Box
                  w="7px" h="7px" borderRadius="full"
                  bg={ntpReady ? '#22c55e' : '#f59e0b'}
                  style={{ animation: 'pulse 1.5s infinite' }}
                />
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
                <Badge
                  bg="#fef3c7" color="#92400e"
                  px={4} py={2} borderRadius="full" fontSize="sm" fontWeight="700"
                  boxShadow="0 2px 8px rgba(245,158,11,0.25)"
                >
                  📸 {pendingVerifications} verification{pendingVerifications > 1 ? 's' : ''} due!
                </Badge>
              )}
              {saving && <Spinner size="sm" color="#16a34a" />}
              <Button
                bg={crops.length >= QUEUE_LIMIT ? 'gray.300' : '#16a34a'}
                color={crops.length >= QUEUE_LIMIT ? 'gray.500' : 'white'}
                borderRadius="full"
                fontWeight="800" fontSize="sm"
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

        {/* ── Stats ── */}
        <Flex gap={3} mb={6} wrap="wrap">
          <StatCard emoji="🌱" label="Crop Queue"     value={`${crops.length}/${QUEUE_LIMIT}`} sub={isPremium ? 'Premium (10 slots)' : 'Free (4 slots)'} color="#16a34a" />
          <StatCard emoji="💚" label="Growing"        value={`${healthyCrops}`}     sub="On track"         color="#22c55e" />
          <StatCard emoji="🥀" label="Wilted"         value={`${wiltedCrops}`}      sub="Need attention"   color="#ef4444" />
          <StatCard emoji="🌾" label="Harvest Ready"  value={`${readyCrops}`}       sub="Pick now!"        color="#f59e0b" />
          <StatCard emoji="🎟️" label="Tokens Earned"  value={`${totalTokens}`}      sub="Free listings"    color="#8b5cf6" />
          <StatCard emoji="✅" label="Tasks Done"     value={todayTasks.length ? `${doneTasks}/${todayTasks.length}` : '0/0'} sub={failedTasks > 0 ? `${failedTasks} failed today` : 'Today'} color={failedTasks > 0 ? '#ef4444' : '#3b82f6'} />
        </Flex>

        {/* ── Today Reminders ── */}
        {crops.length > 0 && (
          <TodayReminders
            crops={crops}
            userId={user?.id ?? ''}
            serverTime={now}
            onTransferToTask={handleTransferReminderToTask}
          />
        )}

        <Flex gap={6} wrap="wrap" align="flex-start">

          {/* ── Left: Crop Cards ── */}
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
              <Box
                bg="white" borderRadius="20px" p={12} textAlign="center"
                border="2px dashed #d1fae5"
              >
                <Text fontSize="4xl" mb={3}>🌱</Text>
                <Text fontWeight="800" color="#14532d" mb={1} fontSize="lg">No crops queued yet</Text>
                <Text fontSize="sm" color="gray.400" mb={5}>
                  Queue your first crop to start earning Free Listing Tokens.
                </Text>
                <Button
                  bg="#16a34a" color="white" borderRadius="full"
                  fontWeight="800" _hover={{ bg: '#15803d' }}
                  boxShadow="0 4px 12px rgba(22,163,74,0.3)"
                  onClick={() => setShowAddCrop(true)}
                >
                  + Queue Your First Crop
                </Button>
              </Box>
            ) : (
              <Flex gap={4} wrap="wrap">
                {crops.map(crop => (
                  <Box key={crop.id} flex="1" minW="260px">
                    <CropCard
                      crop={crop}
                      onVerify={c => setVerifyingCrop(c)}
                      onDelete={handleDeleteCrop}
                    />
                  </Box>
                ))}
              </Flex>
            )}

            {/* Reward explainer */}
            <Box
              mt={6} bg="white" borderRadius="16px"
              border="1.5px solid #e9d5ff"
              p={5}
            >
              <Text fontWeight="800" color="#6d28d9" mb={3} fontSize="sm">
                🎟️ How Tokens Work
              </Text>
              <VStack align="stretch" gap={2}>
                {[
                  { step: '1', text: 'Queue a crop (max 10 days old to start)' },
                  { step: '2', text: 'Every 3 days, a photo upload window opens' },
                  { step: '3', text: 'Complete ALL daily tasks within their 20-min window (±10 min)' },
                  { step: '4', text: 'Upload a real photo of your plant — both are required for +1 point' },
                  { step: '5', text: 'Miss a task window or photo → that day doesn\'t count toward the 3-day goal' },
                  { step: '6', text: 'Earn 2 points → receive 1 Free Listing Token (skips ₱20 fee)' },
                ].map(({ step, text }) => (
                  <HStack key={step} gap={3}>
                    <Box
                      w="22px" h="22px" borderRadius="full" flexShrink={0}
                      bg="#ede9fe" color="#6d28d9"
                      display="flex" alignItems="center" justifyContent="center"
                      fontSize="10px" fontWeight="900"
                    >
                      {step}
                    </Box>
                    <Text fontSize="12px" color="#374151" fontWeight="600">{text}</Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </Box>

          {/* ── Right: Task Queue ── */}
          <Box flex="1" minW="280px">
            <HStack mb={1} justify="space-between">
              <Heading size="md" color="#14532d" fontWeight="900">📋 Task Queue</Heading>
              {todayTasks.length > 0 && (
                <Badge
                  px={3} py={1} borderRadius="full" fontSize="10px" fontWeight="700"
                  bg={failedTasks > 0 ? '#fee2e2' : allTasksPassedToday ? '#dcfce7' : '#fef9c3'}
                  color={failedTasks > 0 ? '#dc2626' : allTasksPassedToday ? '#16a34a' : '#854d0e'}
                >
                  {failedTasks > 0 ? `❌ ${failedTasks} failed` : allTasksPassedToday ? '✅ All done!' : `${doneTasks}/${todayTasks.length} done`}
                </Badge>
              )}
            </HStack>

            {/* Daily compliance banner */}
            {todayTasks.length > 0 && (
              <Box
                mb={4} px={3} py={2} borderRadius="10px"
                bg={failedTasks > 0 ? '#fff1f2' : allTasksPassedToday ? '#f0fdf4' : '#fefce8'}
                border="1px solid"
                borderColor={failedTasks > 0 ? '#fecdd3' : allTasksPassedToday ? '#bbf7d0' : '#fde68a'}
              >
                <Text fontSize="11px" fontWeight="700"
                  color={failedTasks > 0 ? '#dc2626' : allTasksPassedToday ? '#16a34a' : '#92400e'}
                >
                  {failedTasks > 0
                    ? `⚠️ Day won't count — ${failedTasks} task${failedTasks > 1 ? 's' : ''} failed. Photo submission is blocked.`
                    : allTasksPassedToday
                    ? '🌟 All tasks done! You can now submit your crop photo for progress.'
                    : '⏰ Complete all tasks within their 20-min window to unlock photo submission.'}
                </Text>
              </Box>
            )}

            <VStack gap={2} mb={4} align="stretch">
              <Input
                placeholder="Add a farm task…"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                bg="white" borderRadius="12px" borderColor="gray.200" fontSize="sm"
              />
              <HStack gap={2}>
                <Input
                  placeholder="Crop"
                  value={newTaskCrop}
                  onChange={e => setNewTaskCrop(e.target.value)}
                  bg="white" borderRadius="10px" borderColor="gray.200" fontSize="sm" flex={1}
                />
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as Task['priority'])}
                  style={{
                    border: '1.5px solid #e5e7eb', borderRadius: '10px',
                    padding: '6px 10px', fontSize: '13px', background: 'white',
                    color: '#374151', cursor: 'pointer', outline: 'none',
                  }}
                >
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
                <Button
                  onClick={handleAddTask}
                  bg="#16a34a" color="white" borderRadius="12px"
                  fontWeight="700" _hover={{ bg: '#15803d' }}
                  flexShrink={0} px={4}
                >+</Button>
              </HStack>
            </VStack>

            {/* Active window tasks first */}
            <VStack gap={2} align="stretch">
              {(() => {
                const active   = tasks.filter(t => getTaskWindowState(t, now) === 'active');
                const pending  = tasks.filter(t => getTaskWindowState(t, now) === 'pending');
                const manual   = tasks.filter(t => getTaskWindowState(t, now) === 'manual' && !t.done);
                const done     = tasks.filter(t => t.done);
                const failed   = tasks.filter(t => t.failed);
                const expired  = tasks.filter(t => getTaskWindowState(t, now) === 'expired');

                return (
                  <>
                    {active.length > 0 && (
                      <>
                        <Text fontSize="10px" color="#16a34a" fontWeight="800" textTransform="uppercase" px={1}>🟢 Active Now</Text>
                        {active.map(task => <TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} now={now} />)}
                      </>
                    )}
                    {pending.length > 0 && (
                      <>
                        <Text fontSize="10px" color="gray.400" fontWeight="800" textTransform="uppercase" px={1} mt={1}>⏳ Upcoming</Text>
                        {pending.map(task => <TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} now={now} />)}
                      </>
                    )}
                    {manual.length > 0 && (
                      <>
                        <Text fontSize="10px" color="gray.500" fontWeight="800" textTransform="uppercase" px={1} mt={1}>📝 Manual</Text>
                        {manual.map(task => <TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} now={now} />)}
                      </>
                    )}
                    {(failed.length > 0 || expired.length > 0) && (
                      <>
                        <Box h="1px" bg="#fee2e2" my={1} />
                        <Text fontSize="10px" color="#ef4444" fontWeight="800" textTransform="uppercase" px={1}>❌ Failed / Expired</Text>
                        {[...expired, ...failed].map(task => <TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} now={now} />)}
                      </>
                    )}
                    {done.length > 0 && (
                      <>
                        <Box h="1px" bg="#f3f4f6" my={1} />
                        <Text fontSize="10px" color="gray.400" fontWeight="800" textTransform="uppercase" px={1}>Completed</Text>
                        {done.map(task => <TaskItem key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} now={now} />)}
                      </>
                    )}
                    {tasks.length === 0 && (
                      <Box textAlign="center" py={8}>
                        <Text fontSize="2xl" mb={2}>✅</Text>
                        <Text fontSize="sm" color="gray.400">No tasks yet. Add one above!</Text>
                      </Box>
                    )}
                  </>
                );
              })()}
            </VStack>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
};

export default GamifiedDashboard;