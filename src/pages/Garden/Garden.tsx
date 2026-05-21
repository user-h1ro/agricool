import {
  Box, Flex, Heading, HStack, Text, VStack, Badge, Button,
  Spinner, Center, Tabs,
} from '@chakra-ui/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/supabase';
import { useAuth } from '@/context/AuthProvider';
import GardenTutorial from './GardenTutorial';

// ─── Types ────────────────────────────────────────────────────────────────────

type CropStatus = 'healthy' | 'wilted' | 'growing' | 'harvest_ready';

type TrackedCrop = {
  id: string;
  name: string;
  emoji: string;
  status: CropStatus;
};

type PlotCrop = {
  cropId: string | null;   // null = empty plot
  name: string;
  emoji: string;
  status: CropStatus;
  hp: number;             // 0-3 health
  defenseItem: 'scarecrow' | 'pesticide' | null;
  defenseExpiresAt: string | null; // ISO
};

type GardenLayout = PlotCrop[];   // always 25 plots (5×5)

type Cosmetic = {
  id: string;
  name: string;
  icon: string;
  category: 'fence' | 'border' | 'tool' | 'seasonal';
  cost: number;
  description: string;
  limited?: boolean;
};

type PestEvent = {
  plotIdx: number;
  pestName: string;
  emoji: string;
  expiresAt: number; // ms timestamp — player has 24h to respond
};

type LeaderboardRow = {
  userId: string;
  username: string;
  coins: number;
  cropsGrown: number;
  equippedCosmetics: number;
  leafCount: number;
};

type SeasonalEvent = {
  id: string;
  name: string;
  description: string;
  icon: string;
  bonus: string;
  endsAt: string; // ISO
  rewardCosmeticId: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_SIZE = 25; // 5×5


const COIN_REWARDS = {
  taskDone:    5,
  photoVerify: 10,
  harvest:     30,
  leafReceived: 1,
  eventBonus:  20,
};

const DEFENSE_ITEMS: { id: 'scarecrow' | 'pesticide'; name: string; icon: string; cost: number; durationDays: number; desc: string }[] = [
  { id: 'pesticide', name: 'Pesticide',   icon: '🪲', cost: 15, durationDays: 1, desc: 'Instant pest removal. Lasts 1 day.' },
  { id: 'scarecrow', name: 'Scarecrow',   icon: '🧱', cost: 25, durationDays: 3, desc: 'Prevents pest attacks. Lasts 3 days.' },
];

const COSMETICS: Cosmetic[] = [
  { id: 'bamboo_fence',    name: 'Bamboo Fence',      icon: '🪵', category: 'fence',    cost: 30,  description: 'Classic bamboo border around your plot.' },
  { id: 'stone_wall',      name: 'Stone Wall',         icon: '🧱', category: 'fence',    cost: 55,  description: 'Sturdy stone border — looks serious.' },
  { id: 'sunflower_border',name: 'Sunflower Border',   icon: '🌻', category: 'border',   cost: 50,  description: 'Bright sunflowers lining your garden.' },
  { id: 'lily_pad_border', name: 'Lily Pad Border',    icon: '🪷', category: 'border',   cost: 45,  description: 'Peaceful lily pads around the edges.' },
  { id: 'scarecrow_deco',  name: 'Scarecrow Deco',     icon: '🎃', category: 'tool',     cost: 40,  description: 'A decorative scarecrow for your garden.' },
  { id: 'watering_can',    name: 'Watering Can',        icon: '🪣', category: 'tool',     cost: 35,  description: 'A cute watering can display.' },
  { id: 'rain_catcher',    name: 'Rain Catcher',        icon: '🌧️', category: 'seasonal', cost: 0,   description: 'Limited — earn during Rainy Season Event.', limited: true },
  { id: 'harvest_flag',    name: 'Harvest Flag',        icon: '🏴', category: 'seasonal', cost: 0,   description: 'Limited — earn during Harvest Festival.', limited: true },
];

const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'rainy_season',
    name: 'Rainy Season',
    description: 'Harvest any crop this week for 2× AgriCoins! Complete the event to unlock the Rain Catcher cosmetic.',
    icon: '🌧️',
    bonus: '2× harvest coins + Rain Catcher unlock',
    endsAt: '2026-05-31T23:59:59.000Z', // Fixed date — never use Date.now() here or a new event appears on every page visit
    rewardCosmeticId: 'rain_catcher',
  },
];

const PESTS = [
  { name: 'Aphids',    emoji: '🐛' },
  { name: 'Beetles',   emoji: '🪲' },
  { name: 'Caterpillar', emoji: '🐛' },
  { name: 'Grasshopper', emoji: '🦗' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyPlot(): PlotCrop {
  return { cropId: null, name: '', emoji: '', status: 'growing', hp: 3, defenseItem: null, defenseExpiresAt: null };
}

function emptyGrid(): GardenLayout {
  return Array.from({ length: GRID_SIZE }, emptyPlot);
}

function cropStatusColor(status: CropStatus): string {
  switch (status) {
    case 'healthy':       return '#16a34a';
    case 'growing':       return '#3b82f6';
    case 'harvest_ready': return '#f59e0b';
    case 'wilted':        return '#ef4444';
    default:              return '#9ca3af';
  }
}

function hpColor(hp: number): string {
  if (hp >= 3) return '#16a34a';
  if (hp >= 2) return '#f59e0b';
  return '#ef4444';
}

function daysLeft(isoDate: string): number {
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000));
}

// ─── Garden state ────────────────────────────────────────────────────────────

interface GardenState {
  layout: GardenLayout;
  coins: number;
  equippedCosmetics: string[];
  unlockedCosmetics: string[];
  leafCount: number;
  claimedEvents: string[];
  activePests: PestEvent[];
}

const DEFAULT_GARDEN_STATE: GardenState = {
  layout: [],
  coins: 0,
  equippedCosmetics: [],
  unlockedCosmetics: [],
  leafCount: 0,
  claimedEvents: [],
  activePests: [],
};

// ── Map DB row → GardenState ─────────────────────────────────────────────────
function dbRowToState(row: any): GardenState {
  const layout: GardenLayout = Array.isArray(row.layout) ? row.layout : [];
  // Ensure exactly GRID_SIZE plots
  while (layout.length < GRID_SIZE) layout.push(emptyPlot());
  return {
    layout: layout.slice(0, GRID_SIZE),
    coins:              row.coins              ?? 0,
    equippedCosmetics:  row.equipped_cosmetics ?? [],
    unlockedCosmetics:  row.unlocked_cosmetics ?? [],
    leafCount:          row.leaf_count         ?? 0,
    claimedEvents:      row.claimed_events     ?? [],
    activePests:        row.active_pests       ?? [],
  };
}

// ── Map GardenState → DB upsert payload ──────────────────────────────────────
function stateToDbRow(uid: string, state: GardenState) {
  return {
    user_id:            uid,
    layout:             state.layout,
    coins:              state.coins,
    equipped_cosmetics: state.equippedCosmetics,
    unlocked_cosmetics: state.unlockedCosmetics,
    leaf_count:         state.leafCount,
    claimed_events:     state.claimedEvents,
    active_pests:       state.activePests,
  };
}

// ── Dispatch coin event so TopBar reacts instantly ────────────────────────────
function dispatchCoinEvent(amount: number, newTotal: number, sourcePos?: { x: number; y: number }) {
  if (amount === 0) return;
  window.dispatchEvent(new CustomEvent('agricool:coins', {
    detail: { amount, newTotal, sourceX: sourcePos?.x, sourceY: sourcePos?.y },
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatBadge = ({ emoji, label, value, color }: { emoji: string; label: string; value: string | number; color: string }) => (
  <Box bg="white" borderRadius="14px" px={4} py={3} border="1.5px solid" borderColor={color + '44'} minW="90px">
    <Text fontSize="lg">{emoji}</Text>
    <Text fontSize="xl" fontWeight="900" color={color}>{value}</Text>
    <Text fontSize="10px" fontWeight="700" color="gray.500" textTransform="uppercase" letterSpacing="0.5px">{label}</Text>
  </Box>
);

// ─── Garden Grid ──────────────────────────────────────────────────────────────

const GardenGrid = ({
  layout,
  activePests,
  trackedCrops,
  onPlaceCrop,
  onDefendPlot,
  onRemoveCrop,
}: {
  layout: GardenLayout;
  activePests: PestEvent[];
  trackedCrops: TrackedCrop[];
  onPlaceCrop: (plotIdx: number, crop: TrackedCrop) => void;
  onDefendPlot: (plotIdx: number, item: 'scarecrow' | 'pesticide') => void;
  onRemoveCrop: (plotIdx: number) => void;
}) => {
  const [selectedCrop, setSelectedCrop] = useState<TrackedCrop | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);

  const pestAt = (idx: number) => activePests.find(p => p.plotIdx === idx);

  const handleCellClick = (idx: number) => {
    const plot = layout[idx];
    if (plot.cropId) {
      setSelectedPlot(idx);
    } else if (selectedCrop) {
      onPlaceCrop(idx, selectedCrop);
      setSelectedCrop(null);
    }
  };

  return (
    <Box>
      {/* Crop picker */}
      {trackedCrops.length > 0 && (
        <Box mb={4}>
          <Text fontSize="sm" fontWeight="700" color="gray.600" mb={2}>
            Pick a crop to place in the garden:
          </Text>
          <Flex gap={2} flexWrap="wrap">
            {trackedCrops.map(c => (
              <Button
                key={c.id}
                size="sm"
                borderRadius="full"
                fontWeight="700"
                bg={selectedCrop?.id === c.id ? '#059669' : 'white'}
                color={selectedCrop?.id === c.id ? 'white' : 'gray.700'}
                border="1.5px solid"
                borderColor={selectedCrop?.id === c.id ? '#059669' : '#d1d5db'}
                _hover={{ bg: selectedCrop?.id === c.id ? '#047857' : '#f9fafb' }}
                onClick={() => setSelectedCrop(prev => prev?.id === c.id ? null : c)}
              >
                {c.emoji} {c.name}
              </Button>
            ))}
            {selectedCrop && (
              <Button
                size="sm" borderRadius="full" fontWeight="700" variant="ghost"
                color="gray.400" onClick={() => setSelectedCrop(null)}
              >
                ✕ Cancel
              </Button>
            )}
          </Flex>
        </Box>
      )}

      {trackedCrops.length === 0 && (
        <Box bg="#f0fdf4" border="1.5px dashed #d1fae5" borderRadius="12px" p={4} mb={4} textAlign="center">
          <Text fontSize="sm" color="#16a34a" fontWeight="700">
            🌱 Queue crops in the Tracker — they'll automatically appear here as garden plots!
          </Text>
        </Box>
      )}

      {/* 5×5 grid */}
      <Box
        display="grid"
        style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}
        gap={2}
        p={3}
        bg="linear-gradient(135deg, #d1fae5, #a7f3d0)"
        borderRadius="18px"
        border="2px solid #6ee7b7"
      >
        {layout.map((plot, idx) => {
          const pest      = pestAt(idx);
          const isActive  = selectedPlot === idx;
          const hpVal     = plot.hp;

          return (
            <Box
              key={idx}
              onClick={() => handleCellClick(idx)}
              position="relative"
              h="64px"
              borderRadius="10px"
              bg={
                pest ? '#fff1f2' :
                plot.cropId ? '#f0fdf4' :
                selectedCrop ? '#fefce8' :
                '#ecfdf5'
              }
              border="2px"
              borderStyle={plot.cropId ? 'solid' : selectedCrop ? 'dashed' : 'dashed'}
              borderColor={
                pest ? '#fca5a5' :
                isActive ? '#059669' :
                plot.cropId ? '#86efac' :
                selectedCrop ? '#fde68a' :
                '#d1fae5'
              }
              cursor={plot.cropId ? 'pointer' : selectedCrop ? 'pointer' : 'default'}
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
              gap="2px"
              transition="all 0.15s"
              _hover={plot.cropId || selectedCrop ? { transform: 'scale(1.04)' } : {}}
              title={plot.cropId ? `${plot.name} · ${plot.status} · ${hpVal}/3 HP` : selectedCrop ? 'Click to place' : 'Empty'}
            >
              {pest && (
                <Box position="absolute" top="2px" right="2px" fontSize="12px" title={`${pest.pestName} attacking!`}>
                  {pest.emoji}
                </Box>
              )}
              {plot.defenseItem && !pest && (
                <Box position="absolute" top="2px" right="2px" fontSize="11px" opacity={0.7}
                  title={`${plot.defenseItem} active · ${plot.defenseExpiresAt ? daysLeft(plot.defenseExpiresAt) + 'd left' : ''}`}>
                  {plot.defenseItem === 'scarecrow' ? '🧱' : '🪲'}
                </Box>
              )}
              {plot.cropId ? (
                <>
                  <Text fontSize="22px" lineHeight="1">{plot.emoji}</Text>
                  {/* Mini HP bar */}
                  <Box w="80%" h="3px" bg="#e5e7eb" borderRadius="99px" overflow="hidden">
                    <Box
                      h="full"
                      w={`${(hpVal / 3) * 100}%`}
                      bg={hpColor(hpVal)}
                      borderRadius="99px"
                      transition="width 0.3s"
                    />
                  </Box>
                </>
              ) : selectedCrop ? (
                <Text fontSize="20px" opacity={0.4}>+</Text>
              ) : null}
            </Box>
          );
        })}
      </Box>

      {/* Selected plot detail panel */}
      {selectedPlot !== null && layout[selectedPlot]?.cropId && (
        <Box mt={4} bg="white" borderRadius="14px" border="1.5px solid #d1fae5" p={4}>
          <HStack justify="space-between" mb={3}>
            <HStack gap={3}>
              <Text fontSize="2xl">{layout[selectedPlot].emoji}</Text>
              <Box>
                <Text fontWeight="800" color="#14532d">{layout[selectedPlot].name}</Text>
                <Badge
                  bg={cropStatusColor(layout[selectedPlot].status) + '22'}
                  color={cropStatusColor(layout[selectedPlot].status)}
                  borderRadius="full" px={2} py="1px" fontSize="10px" fontWeight="700"
                >
                  {layout[selectedPlot].status.replace('_', ' ')}
                </Badge>
              </Box>
            </HStack>
            <Button
              size="xs" variant="ghost" color="gray.400" fontWeight="700"
              onClick={() => setSelectedPlot(null)}
            >
              ✕
            </Button>
          </HStack>

          {/* HP */}
          <Box mb={3}>
            <Flex justify="space-between" mb={1}>
              <Text fontSize="11px" fontWeight="700" color="gray.500">Crop Health</Text>
              <Text fontSize="11px" fontWeight="800" color={hpColor(layout[selectedPlot].hp)}>
                {layout[selectedPlot].hp}/3 HP
              </Text>
            </Flex>
            <Box h="6px" bg="#e5e7eb" borderRadius="99px" overflow="hidden">
              <Box
                h="full"
                w={`${(layout[selectedPlot].hp / 3) * 100}%`}
                bg={hpColor(layout[selectedPlot].hp)}
                borderRadius="99px"
                transition="width 0.3s"
              />
            </Box>
          </Box>

          {/* Pest alert */}
          {pestAt(selectedPlot) && (
            <Box bg="#fff1f2" border="1.5px solid #fca5a5" borderRadius="10px" p={3} mb={3}>
              <Text fontSize="12px" fontWeight="700" color="#b91c1c" mb={2}>
                {pestAt(selectedPlot)!.emoji} {pestAt(selectedPlot)!.pestName} attack! Defend now!
              </Text>
              <Flex gap={2} flexWrap="wrap">
                {DEFENSE_ITEMS.map(item => (
                  <Button
                    key={item.id}
                    size="sm"
                    bg="#f0fdf4"
                    color="#14532d"
                    border="1.5px solid #86efac"
                    borderRadius="8px"
                    fontWeight="700"
                    fontSize="12px"
                    _hover={{ bg: '#dcfce7' }}
                    onClick={() => { onDefendPlot(selectedPlot, item.id); setSelectedPlot(null); }}
                  >
                    {item.icon} {item.name} · 🪙 {item.cost}
                  </Button>
                ))}
              </Flex>
            </Box>
          )}

          {/* Defense status */}
          {layout[selectedPlot].defenseItem && !pestAt(selectedPlot) && (
            <Box bg="#f0fdf4" border="1px solid #d1fae5" borderRadius="10px" p={3} mb={3}>
              <Text fontSize="12px" fontWeight="700" color="#059669">
                🛡️ {layout[selectedPlot].defenseItem === 'scarecrow' ? 'Scarecrow' : 'Pesticide'} active
                {layout[selectedPlot].defenseExpiresAt
                  ? ` · ${daysLeft(layout[selectedPlot].defenseExpiresAt!)}d left`
                  : ''}
              </Text>
            </Box>
          )}

          {/* Place defense if no pest and no defense */}
          {!pestAt(selectedPlot) && !layout[selectedPlot].defenseItem && (
            <Box>
              <Text fontSize="11px" fontWeight="700" color="gray.500" mb={2}>Place a defense item:</Text>
              <Flex gap={2} flexWrap="wrap">
                {DEFENSE_ITEMS.map(item => (
                  <Button
                    key={item.id}
                    size="sm"
                    bg="white"
                    color="gray.700"
                    border="1.5px solid #e5e7eb"
                    borderRadius="8px"
                    fontWeight="700"
                    fontSize="12px"
                    _hover={{ bg: '#f9fafb' }}
                    onClick={() => { onDefendPlot(selectedPlot, item.id); setSelectedPlot(null); }}
                  >
                    {item.icon} {item.name} · 🪙 {item.cost}
                  </Button>
                ))}
              </Flex>
            </Box>
          )}

          <Button
            mt={3}
            size="sm"
            variant="ghost"
            color="#ef4444"
            fontWeight="700"
            fontSize="12px"
            _hover={{ bg: '#fff1f2' }}
            onClick={() => { onRemoveCrop(selectedPlot); setSelectedPlot(null); }}
          >
            🗑 Remove from garden
          </Button>
        </Box>
      )}
    </Box>
  );
};

// ─── Cosmetics Shop ───────────────────────────────────────────────────────────

const CosmeticsShop = ({
  coins,
  equipped,
  unlocked,
  onEquip,
  onUnequip,
  onBuy,
}: {
  coins: number;
  equipped: string[];
  unlocked: string[];
  onEquip: (id: string) => void;
  onUnequip: (id: string) => void;
  onBuy: (item: Cosmetic) => void;
}) => {
  const categories: Cosmetic['category'][] = ['fence', 'border', 'tool', 'seasonal'];

  return (
    <Box>
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="md" color="#14532d" fontWeight="900">🛍️ Cosmetics Shop</Heading>
        <Badge
          bg="#fef3c7" color="#b45309"
          px={4} py={2} borderRadius="full" fontSize="sm" fontWeight="800"
          boxShadow="0 2px 8px rgba(245,158,11,0.2)"
        >
          🪙 {coins} AgriCoins
        </Badge>
      </HStack>

      {categories.map(cat => {
        const items = COSMETICS.filter(c => c.category === cat);
        return (
          <Box key={cat} mb={6}>
            <Text
              fontSize="11px" fontWeight="800" color="gray.400"
              textTransform="uppercase" letterSpacing="1px" mb={3}
            >
              {cat === 'fence' ? '🪵 Fences' : cat === 'border' ? '🌸 Borders' : cat === 'tool' ? '🛠 Tools' : '⭐ Seasonal (Limited)'}
            </Text>
            <Flex gap={3} flexWrap="wrap">
              {items.map(item => {
                const isOwned    = unlocked.includes(item.id);
                const isEquipped = equipped.includes(item.id);
                const canAfford  = item.cost <= coins || item.cost === 0;

                return (
                  <Box
                    key={item.id}
                    bg={isEquipped ? '#f0fdf4' : 'white'}
                    border="1.5px solid"
                    borderColor={isEquipped ? '#86efac' : '#e5e7eb'}
                    borderRadius="14px"
                    p={3}
                    minW="130px"
                    flex="1"
                    transition="all 0.2s"
                    _hover={{ borderColor: '#86efac', transform: 'translateY(-1px)' }}
                  >
                    <Text fontSize="28px" mb={1}>{item.icon}</Text>
                    <Text fontWeight="700" fontSize="13px" color="#374151" mb={0}>{item.name}</Text>
                    <Text fontSize="11px" color="gray.400" mb={2} lineHeight="1.4">{item.description}</Text>

                    {item.limited && !isOwned && (
                      <Badge bg="#eff6ff" color="#1d4ed8" fontSize="9px" fontWeight="700" borderRadius="full" px={2} mb={2}>
                        Limited
                      </Badge>
                    )}

                    {isOwned ? (
                      <Button
                        size="xs"
                        bg={isEquipped ? '#16a34a' : '#e5e7eb'}
                        color={isEquipped ? 'white' : 'gray.600'}
                        borderRadius="full"
                        fontWeight="700"
                        fontSize="11px"
                        w="full"
                        _hover={{ bg: isEquipped ? '#15803d' : '#d1d5db' }}
                        onClick={() => isEquipped ? onUnequip(item.id) : onEquip(item.id)}
                      >
                        {isEquipped ? '✓ Equipped' : 'Equip'}
                      </Button>
                    ) : item.limited ? (
                      <Text fontSize="11px" color="#6b7280" fontWeight="600">
                        🔒 Earn in events
                      </Text>
                    ) : (
                      <Button
                        size="xs"
                        bg={canAfford ? '#059669' : '#e5e7eb'}
                        color={canAfford ? 'white' : 'gray.400'}
                        borderRadius="full"
                        fontWeight="700"
                        fontSize="11px"
                        w="full"
                        cursor={canAfford ? 'pointer' : 'not-allowed'}
                        _hover={{ bg: canAfford ? '#047857' : '#e5e7eb' }}
                        onClick={() => canAfford && onBuy(item)}
                      >
                        {canAfford ? `🪙 ${item.cost} — Buy` : `🪙 ${item.cost} — Not enough`}
                      </Button>
                    )}
                  </Box>
                );
              })}
            </Flex>
          </Box>
        );
      })}
    </Box>
  );
};

// ─── Seasonal Events panel ────────────────────────────────────────────────────

const SeasonalEventsPanel = ({
  claimedEvents,
  coins,
  onClaim,
}: {
  claimedEvents: string[];
  coins: number;
  onClaim: (event: SeasonalEvent) => void;
}) => (
  <Box>
    <Heading size="md" color="#14532d" fontWeight="900" mb={4}>🌤️ Seasonal Events</Heading>
    {SEASONAL_EVENTS.length === 0 ? (
      <Box bg="white" borderRadius="16px" border="1.5px dashed #d1fae5" p={8} textAlign="center">
        <Text fontSize="2xl" mb={2}>📅</Text>
        <Text fontSize="sm" color="gray.400" fontWeight="600">No active events right now</Text>
        <Text fontSize="11px" color="gray.300" mt={1}>Check back during planting and harvest seasons</Text>
      </Box>
    ) : (
      <VStack gap={4} align="stretch">
        {SEASONAL_EVENTS.map(ev => {
          const claimed   = claimedEvents.includes(ev.id);
          const remaining = daysLeft(ev.endsAt);
          return (
            <Box key={ev.id} bg="white" borderRadius="16px" border="1.5px solid #93c5fd" p={4}
              boxShadow="0 4px 16px rgba(59,130,246,0.08)">
              <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
                <HStack gap={3}>
                  <Text fontSize="28px">{ev.icon}</Text>
                  <Box>
                    <Text fontWeight="800" color="#1d4ed8" fontSize="15px">{ev.name}</Text>
                    <Text fontSize="11px" color="#3b82f6">Ends in {remaining} day{remaining !== 1 ? 's' : ''}</Text>
                  </Box>
                </HStack>
                <Badge
                  bg="#fee2e2" color="#b91c1c"
                  borderRadius="full" px={3} py="2px" fontSize="10px" fontWeight="700"
                  style={{ animation: 'pulse 1.5s infinite' }}
                >
                  LIVE 🔴
                </Badge>
              </HStack>
              <Text fontSize="13px" color="#374151" mb={3} lineHeight="1.6">{ev.description}</Text>
              <Box bg="#eff6ff" borderRadius="10px" px={3} py={2} mb={3}>
                <Text fontSize="12px" fontWeight="700" color="#1d4ed8">🎁 Reward: {ev.bonus}</Text>
              </Box>
              {claimed ? (
                <Box bg="#f0fdf4" border="1px solid #86efac" borderRadius="10px" px={3} py={2}>
                  <Text fontSize="12px" fontWeight="700" color="#16a34a">
                    ✅ Bonus claimed! Complete a harvest before the event ends.
                  </Text>
                </Box>
              ) : (
                <Button
                  bg="#2563eb" color="white" borderRadius="full" fontWeight="700" size="sm"
                  _hover={{ bg: '#1d4ed8' }} boxShadow="0 4px 12px rgba(37,99,235,0.3)"
                  onClick={() => onClaim(ev)}
                >
                  🎁 Claim Event Bonus  (+{COIN_REWARDS.eventBonus} 🪙)
                </Button>
              )}
            </Box>
          );
        })}
      </VStack>
    )}

    {/* Coin history tip */}
    <Box mt={6} bg="white" borderRadius="14px" border="1.5px solid #fde68a" p={4}>
      <Text fontWeight="800" color="#b45309" mb={2} fontSize="13px">🪙 How to Earn AgriCoins</Text>
      <VStack align="stretch" gap={2}>
        {[
          { action: 'Complete a daily task',             reward: COIN_REWARDS.taskDone },
          { action: 'Verify a crop photo',               reward: COIN_REWARDS.photoVerify },
          { action: 'Harvest a crop',                    reward: COIN_REWARDS.harvest },
          { action: 'Someone leaves a leaf on your garden', reward: COIN_REWARDS.leafReceived },
          { action: 'Claim a seasonal event bonus',      reward: COIN_REWARDS.eventBonus },
        ].map(({ action, reward }) => (
          <HStack key={action} justify="space-between">
            <Text fontSize="12px" color="#374151" fontWeight="600">{action}</Text>
            <Badge bg="#fef3c7" color="#b45309" borderRadius="full" px={2} fontSize="11px" fontWeight="700">
              +{reward} 🪙
            </Badge>
          </HStack>
        ))}
      </VStack>
      <Text fontSize="10px" color="gray.400" mt={3} fontWeight="600">
        Coins are for cosmetics &amp; defense items only — they don't affect your Listing Tokens.
      </Text>
    </Box>
  </Box>
);

// ─── Garden Leaderboard ───────────────────────────────────────────────────────

const GardenLeaderboard = ({
  currentUserId,
  onVisit,
}: {
  currentUserId: string;
  onVisit: (row: LeaderboardRow) => void;
}) => {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('garden_leaderboard')
      .select('user_id, username, coins, leaf_count, equipped_cosmetics, total_plots')
      .then(({ data, error }) => {
        if (error || !data) { setLoading(false); return; }
        setRows(data.map((r: any) => ({
          userId:            r.user_id,
          username:          r.username,
          coins:             r.coins             ?? 0,
          cropsGrown:        r.total_plots       ?? 0,
          equippedCosmetics: r.equipped_cosmetics ?? 0,
          leafCount:         r.leaf_count        ?? 0,
        })));
        setLoading(false);
      });
  }, [currentUserId]);

  const rankEmoji = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`;

  if (loading) return <Center py={8}><Spinner color="#16a34a" /></Center>;

  return (
    <Box>
      <Heading size="md" color="#14532d" fontWeight="900" mb={4}>🏆 Garden Leaderboard</Heading>
      <VStack gap={3} align="stretch">
        {rows.map((row, i) => {
          const isMe = row.userId === currentUserId;
          return (
            <Box
              key={row.userId}
              bg={isMe ? '#f0fdf4' : 'white'}
              border="1.5px solid"
              borderColor={isMe ? '#86efac' : '#e5e7eb'}
              borderRadius="14px"
              p={4}
              transition="all 0.15s"
              _hover={{ borderColor: '#86efac', transform: 'translateY(-1px)' }}
            >
              <HStack justify="space-between" flexWrap="wrap" gap={2}>
                <HStack gap={3}>
                  <Text fontSize="22px">{rankEmoji(i)}</Text>
                  <Box>
                    <Text fontWeight={isMe ? 900 : 700} color={isMe ? '#14532d' : '#374151'} fontSize="14px">
                      {row.username}
                    </Text>
                    <Text fontSize="11px" color="gray.400">
                      {row.cropsGrown} crops grown · {row.equippedCosmetics} cosmetics · 🍃 {row.leafCount} leaves
                    </Text>
                  </Box>
                </HStack>
                <HStack gap={3}>
                  <Badge bg="#fef3c7" color="#b45309" borderRadius="full" px={3} py="3px" fontWeight="800" fontSize="12px">
                    🪙 {row.coins}
                  </Badge>
                  {!isMe && (
                    <Button
                      size="sm"
                      bg="#f0fdf4"
                      color="#14532d"
                      border="1.5px solid #d1fae5"
                      borderRadius="full"
                      fontWeight="700"
                      fontSize="12px"
                      _hover={{ bg: '#dcfce7' }}
                      onClick={() => onVisit(row)}
                    >
                      🏡 Visit
                    </Button>
                  )}
                </HStack>
              </HStack>
            </Box>
          );
        })}
      </VStack>

      <Box mt={4} bg="white" borderRadius="14px" border="1.5px solid #d1fae5" p={4}>
        <Text fontSize="12px" color="#374151" fontWeight="600" lineHeight="1.6">
          🍃 <strong>Leaf system:</strong> When you visit someone's garden and drop a leaf, they earn +1 AgriCoin.
          The more leaves you receive, the higher you climb!
        </Text>
      </Box>
    </Box>
  );
};

// ─── Visiting Garden Modal ────────────────────────────────────────────────────

const VisitGardenModal = ({
  row,
  currentUserId,
  onClose,
  onDropLeaf,
}: {
  row: LeaderboardRow;
  currentUserId: string;
  onClose: () => void;
  onDropLeaf: () => void;
}) => {
  const [leafed, setLeafed]     = useState(false);
  const [grid, setGrid]         = useState<(string | null)[]>(Array(GRID_SIZE).fill(null));
  const [leafLoading, setLeafLoading] = useState(false);

  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Load their actual garden layout + last update time from Supabase
  useEffect(() => {
    supabase
      .from('garden_state')
      .select('layout, updated_at')
      .eq('user_id', row.userId)
      .single()
      .then(({ data }) => {
        if (!data?.layout) return;
        const layout: GardenLayout = data.layout;
        setGrid(layout.map(p => p.cropId ? p.emoji : null));
        if (data.updated_at) {
          const d = new Date(data.updated_at);
          setLastUpdated(d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
        }
      });
  }, [row.userId]);

  const handleLeaf = async () => {
    setLeafLoading(true);
    await onDropLeaf();
    setLeafed(true);
    setLeafLoading(false);
  };

  return (
    <Box
      position="fixed" inset={0} zIndex={9500}
      bg="rgba(0,0,0,0.65)" backdropFilter="blur(6px)"
      display="flex" alignItems="center" justifyContent="center"
      p={4}
      onClick={onClose}
    >
      <Box
        bg="white" borderRadius="24px" maxW="400px" w="full"
        p={5} boxShadow="0 24px 60px rgba(0,0,0,0.3)"
        onClick={e => e.stopPropagation()}
      >
        <HStack justify="space-between" mb={4}>
          <Box>
            <Heading size="sm" color="#14532d" fontWeight="900">
              🏡 {row.username}'s Garden
            </Heading>
            {lastUpdated && (
              <Text fontSize="10px" color="gray.400" fontWeight="600" mt={0.5}>
                Last updated: {lastUpdated}
              </Text>
            )}
          </Box>
          <Button size="xs" variant="ghost" color="gray.400" onClick={onClose}>✕</Button>
        </HStack>

        {/* Mini grid */}
        <Box
          display="grid"
          style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}
          gap={1.5} mb={4}
          bg="linear-gradient(135deg, #d1fae5, #a7f3d0)"
          borderRadius="14px" p={2}
          border="2px solid #6ee7b7"
        >
          {grid.map((emoji, i) => (
            <Box
              key={i}
              h="44px"
              borderRadius="8px"
              bg={emoji ? '#f0fdf4' : '#ecfdf5'}
              border={`1.5px ${emoji ? 'solid #86efac' : 'dashed #d1fae5'}`}
              display="flex" alignItems="center" justifyContent="center"
              fontSize="18px"
            >
              {emoji || ''}
            </Box>
          ))}
        </Box>

        <Flex gap={3} mb={3} flexWrap="wrap">
          <Box bg="#fef3c7" borderRadius="10px" px={3} py={2} flex="1" textAlign="center">
            <Text fontSize="16px" fontWeight="900" color="#b45309">{row.coins}</Text>
            <Text fontSize="10px" color="#92400e" fontWeight="700">🪙 Coins</Text>
          </Box>
          <Box bg="#f0fdf4" borderRadius="10px" px={3} py={2} flex="1" textAlign="center">
            <Text fontSize="16px" fontWeight="900" color="#16a34a">{row.cropsGrown}</Text>
            <Text fontSize="10px" color="#166534" fontWeight="700">🌾 Crops</Text>
          </Box>
          <Box bg="#eff6ff" borderRadius="10px" px={3} py={2} flex="1" textAlign="center">
            <Text fontSize="16px" fontWeight="900" color="#2563eb">{row.leafCount}</Text>
            <Text fontSize="10px" color="#1e40af" fontWeight="700">🍃 Leaves</Text>
          </Box>
        </Flex>

        {!leafed ? (
          <Button
            w="full" bg="#059669" color="white" borderRadius="full"
            fontWeight="700" _hover={{ bg: '#047857' }}
            boxShadow="0 4px 12px rgba(5,150,105,0.3)"
            onClick={handleLeaf}
          >
            🍃 Drop a Leaf (+1 coin for {row.username}!)
          </Button>
        ) : (
          <Box bg="#f0fdf4" border="1px solid #86efac" borderRadius="10px" p={3} textAlign="center">
            <Text fontSize="13px" fontWeight="700" color="#16a34a">
              🍃 Leaf dropped! They'll see your reaction. +1 AgriCoin rewarded!
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─── Main Garden Page ─────────────────────────────────────────────────────────

const Garden = () => {
  const { user } = useAuth();

  const [loading, setLoading]           = useState(true);
  const [trackedCrops, setTrackedCrops] = useState<TrackedCrop[]>([]);
  const [gardenState, setGardenState]   = useState<GardenState | null>(null);
  const [activeTab, setActiveTab]       = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [visitingRow, setVisitingRow]   = useState<LeaderboardRow | null>(null);
  const [toast, setToast]               = useState<string | null>(null);

  // ── Load ──
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch tracked crops and garden state in parallel
    const [cropRes, gardenRes] = await Promise.all([
      supabase.from('tracked_crops').select('id, name, emoji, status').eq('user_id', user.id),
      supabase.from('garden_state').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    const crops = (cropRes.data ?? []) as TrackedCrop[];
    setTrackedCrops(crops);

    // Build state from DB row (or fresh defaults)
    const saved: GardenState = gardenRes.data
      ? dbRowToState(gardenRes.data)
      : { ...DEFAULT_GARDEN_STATE, layout: emptyGrid() };

    // Auto-place any tracked crops that aren't in the garden yet
    const occupiedIds = new Set(saved.layout.map(p => p.cropId).filter(Boolean));
    const newLayout   = [...saved.layout];
    let changed       = false;

    for (const crop of crops) {
      if (occupiedIds.has(crop.id)) continue;
      const emptyIdx = newLayout.findIndex(p => !p.cropId);
      if (emptyIdx === -1) break;
      newLayout[emptyIdx] = {
        cropId: crop.id,
        name:   crop.name,
        emoji:  crop.emoji,
        status: crop.status,
        hp: 3,
        defenseItem: null,
        defenseExpiresAt: null,
      };
      changed = true;
    }

    const finalState = changed ? { ...saved, layout: newLayout } : saved;
    setGardenState(finalState);

    // Persist initial state / sync to DB if this is a new user or layout changed
    if (!gardenRes.data || changed) {
      await supabase.from('garden_state').upsert(stateToDbRow(user.id, finalState));
    }

    // Dispatch so TopBar shows correct coin count immediately
    dispatchCoinEvent(0, finalState.coins);

    // Show tutorial for first-time visitors
    const tutKey = `agricool_garden_tutorial_seen_${user.id}`;
    if (!localStorage.getItem(tutKey)) setShowTutorial(true);

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // empty deps — load once on mount only. user is read inside the fn.

  useEffect(() => {
    if (user) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);  // re-load only when the actual user ID changes, not on every render

  // ── Track last click position for coin particle origin ──
  const lastClickPos = useRef<{ x: number; y: number }>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  useEffect(() => {
    const handler = (e: MouseEvent) => { lastClickPos.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  // ── Persist helper — updates React state + upserts to Supabase ──
  // Keep a ref that always points to the latest gardenState so update() never
  // captures a stale closure value (which caused claimed events / coins to be
  // overwritten when the component re-rendered before the upsert completed).
  const gardenStateRef = useRef<GardenState | null>(null);
  useEffect(() => { gardenStateRef.current = gardenState; }, [gardenState]);

  const update = useCallback((patch: Partial<GardenState>) => {
    if (!user || !gardenStateRef.current) return;
    const current = gardenStateRef.current;
    const prevCoins = current.coins;
    const next = { ...current, ...patch };
    gardenStateRef.current = next;          // keep ref in sync immediately
    setGardenState(next);
    // Persist to DB — uses latest state, not stale closure
    supabase.from('garden_state').upsert(stateToDbRow(user.id, next));
    // Fire coin animation event if coin count changed
    if (next.coins !== prevCoins) {
      dispatchCoinEvent(next.coins - prevCoins, next.coins, lastClickPos.current);
    }
  }, [user]);  // no gardenState dependency — always reads from ref

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ── Coin helper ──
  const addCoins = (amount: number, reason: string) => {
    if (!gardenState) return;
    update({ coins: gardenState.coins + amount });
    showToast(`🪙 +${amount} coins — ${reason}`);
  };

  // ── Garden actions ──
  const handlePlaceCrop = (plotIdx: number, crop: TrackedCrop) => {
    if (!gardenState) return;
    const layout  = [...gardenState.layout];
    layout[plotIdx] = { cropId: crop.id, name: crop.name, emoji: crop.emoji, status: crop.status, hp: 3, defenseItem: null, defenseExpiresAt: null };
    update({ layout });
  };

  const handleRemoveCrop = (plotIdx: number) => {
    if (!gardenState) return;
    const layout = [...gardenState.layout];
    layout[plotIdx] = emptyPlot();
    update({ layout });
  };

  const handleDefendPlot = (plotIdx: number, item: 'scarecrow' | 'pesticide') => {
    if (!gardenState) return;
    const def    = DEFENSE_ITEMS.find(d => d.id === item)!;
    if (gardenState.coins < def.cost) { showToast('❌ Not enough AgriCoins!'); return; }

    const layout  = [...gardenState.layout];
    const expires = new Date(Date.now() + def.durationDays * 86_400_000).toISOString();
    layout[plotIdx] = { ...layout[plotIdx], defenseItem: item, defenseExpiresAt: expires, hp: Math.min(3, layout[plotIdx].hp + 1) };

    // Remove any pest at this plot
    const activePests = gardenState.activePests.filter(p => p.plotIdx !== plotIdx);
    update({ layout, coins: gardenState.coins - def.cost, activePests });
    showToast(`🛡️ ${def.name} placed! Crop HP restored.`);
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

  const handleClaimEvent = (ev: SeasonalEvent) => {
    if (!gardenState) return;
    if (gardenState.claimedEvents.includes(ev.id)) return;
    const claimedEvents    = [...gardenState.claimedEvents, ev.id];
    let   unlockedCosmetics = [...gardenState.unlockedCosmetics];
    if (ev.rewardCosmeticId && !unlockedCosmetics.includes(ev.rewardCosmeticId)) {
      unlockedCosmetics.push(ev.rewardCosmeticId);
    }
    update({ claimedEvents, coins: gardenState.coins + COIN_REWARDS.eventBonus, unlockedCosmetics });
    showToast(`🎁 Event bonus claimed! +${COIN_REWARDS.eventBonus} 🪙`);
  };

  const handleDropLeaf = async () => {
    if (!user || !visitingRow) return;

    // Insert leaf record — DB unique constraint prevents duplicates (1/day)
    const { error } = await supabase.from('garden_leaves').insert({
      from_user_id: user.id,
      to_user_id:   visitingRow.userId,
      dropped_day:  new Date().toISOString().slice(0, 10),  // plain date for unique constraint
    });

    if (error) {
      // Unique violation = already left a leaf today
      if (error.code === '23505') {
        showToast('🍃 You already left a leaf for them today!');
      } else {
        showToast('❌ Could not drop leaf — try again');
      }
      return;
    }

    // Credit +1 coin to the garden owner (increment via RPC-style upsert)
    // We read their current state, add 1 coin, and upsert back
    const { data: ownerRow } = await supabase
      .from('garden_state')
      .select('coins, leaf_count')
      .eq('user_id', visitingRow.userId)
      .maybeSingle();

    if (ownerRow) {
      await supabase.from('garden_state').upsert({
        user_id:    visitingRow.userId,
        coins:      (ownerRow.coins ?? 0) + COIN_REWARDS.leafReceived,
        leaf_count: (ownerRow.leaf_count ?? 0) + 1,
      });
    }

    showToast('🍃 Leaf dropped! +1 coin for them!');
  };

  const handleTutorialDone = () => {
    if (user) localStorage.setItem(`agricool_garden_tutorial_seen_${user.id}`, '1');
    setShowTutorial(false);
  };

  // ── Pest simulation (fires once per 24h, not on every page visit) ──
  // Uses a ref so this only runs once after the initial data load, not on
  // every state update or navigation back to this page.
  const pestSpawnedRef = useRef(false);
  useEffect(() => {
    if (!gardenState || pestSpawnedRef.current) return;
    pestSpawnedRef.current = true;

    // Already has an active pest — don't add another
    if (gardenState.activePests.length > 0) return;

    // Check if a pest was already spawned in the last 24 hours
    const lastSpawnKey = `agricool_pest_spawn_${user?.id}`;
    const lastSpawn = parseInt(localStorage.getItem(lastSpawnKey) ?? '0', 10);
    if (Date.now() - lastSpawn < 24 * 60 * 60 * 1000) return;

    const occupiedPlots = gardenState.layout
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.cropId && !p.defenseItem);

    if (occupiedPlots.length > 0 && Math.random() > 0.5) {
      const target = occupiedPlots[Math.floor(Math.random() * occupiedPlots.length)];
      const pest   = PESTS[Math.floor(Math.random() * PESTS.length)];
      const newPest: PestEvent = {
        plotIdx: target.i,
        pestName: pest.name,
        emoji: pest.emoji,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      localStorage.setItem(lastSpawnKey, String(Date.now()));
      update({ activePests: [...gardenState.activePests, newPest] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gardenState]);

  // ── Pest expiry enforcement — check every 60 s ──────────────────────────────
  // If a pest\'s 24-hour window has passed without the player defending,
  // reduce that plot\'s HP by 1 and remove the expired pest.
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
        const newHp = Math.max(0, plot.hp - 1);
        layout[pest.plotIdx] = { ...plot, hp: newHp };
      });

      const remainingPests = gardenState.activePests.filter(p => p.expiresAt >= now);
      update({ layout, activePests: remainingPests });

      const harmed = expiredPests.length;
      showToast(`🐛 ${harmed} pest${harmed > 1 ? "s" : ""} caused damage while undefended! HP reduced.`);
    }, 60_000); // check every 60 seconds

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gardenState]);

  if (!user || loading || !gardenState) {
    return (
      <Center h="60vh">
        <VStack gap={3}>
          <Spinner size="lg" color="#16a34a" />
          <Text fontSize="sm" color="gray.400" fontWeight="600">Loading your garden…</Text>
        </VStack>
      </Center>
    );
  }

  const occupiedPlots  = gardenState.layout.filter(p => p.cropId).length;
  const activePestCount = gardenState.activePests.length;

  return (
    <Box maxW="900px" mx="auto" px={{ base: 4, md: 6 }} py={6}>

      {/* Tutorial */}
      {showTutorial && (
        <GardenTutorial
          onComplete={handleTutorialDone}
          onSkip={handleTutorialDone}
        />
      )}

      {/* Visit modal */}
      {visitingRow && (
        <VisitGardenModal
          row={visitingRow}
          currentUserId={user.id}
          onClose={() => setVisitingRow(null)}
          onDropLeaf={handleDropLeaf}
        />
      )}

      {/* Toast */}
      {toast && (
        <Box
          position="fixed" bottom="80px" left="50%" transform="translateX(-50%)"
          bg="#14532d" color="white" borderRadius="full" px={5} py={3}
          fontSize="13px" fontWeight="700" zIndex={8000}
          boxShadow="0 8px 24px rgba(0,0,0,0.25)"
          style={{ animation: 'card-in 0.3s ease' }}
        >
          {toast}
        </Box>
      )}

      {/* Header */}
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={3}>
        <HStack gap={3}>
          <Box w="40px" h="40px" bg="#dcfce7" borderRadius="12px"
            display="flex" alignItems="center" justifyContent="center" fontSize="22px">
            🌻
          </Box>
          <Box>
            <Heading size="lg" color="#14532d" fontWeight="900">My Garden</Heading>
            <Text fontSize="sm" color="gray.400" fontWeight="600">
              Grow, defend, and customize your plot
            </Text>
          </Box>
        </HStack>

        <HStack gap={2} flexWrap="wrap">
          {activePestCount > 0 && (
            <Badge
              bg="#fee2e2" color="#b91c1c" px={4} py={2} borderRadius="full"
              fontSize="sm" fontWeight="700" boxShadow="0 2px 8px rgba(239,68,68,0.25)"
              style={{ animation: 'pulse 1.5s infinite' }}
            >
              🐛 {activePestCount} pest{activePestCount > 1 ? 's' : ''} attacking!
            </Badge>
          )}
          <Button
            variant="outline" borderRadius="full" fontWeight="700" fontSize="sm"
            color="gray.500" borderColor="#d1fae5"
            _hover={{ bg: '#f0fdf4' }}
            onClick={() => {
              if (user) localStorage.removeItem(`agricool_garden_tutorial_seen_${user.id}`);
              setShowTutorial(true);
            }}
          >
            🎓 Tutorial
          </Button>
        </HStack>
      </HStack>

      {/* Stat row */}
      <Flex gap={3} mb={6} flexWrap="wrap">
        <StatBadge emoji="🪙" label="AgriCoins"    value={gardenState.coins}                     color="#d97706" />
        <StatBadge emoji="🌱" label="Active Plots"  value={`${occupiedPlots}/${GRID_SIZE}`}       color="#16a34a" />
        <StatBadge emoji="🐛" label="Pest Attacks"  value={activePestCount}                       color={activePestCount > 0 ? '#ef4444' : '#9ca3af'} />
        <StatBadge emoji="🎨" label="Cosmetics"     value={gardenState.equippedCosmetics.length}  color="#7c3aed" />
        <StatBadge emoji="🍃" label="Leaves"        value={gardenState.leafCount}                 color="#059669" />
      </Flex>

      {/* Equipped cosmetics banner */}
      {gardenState.equippedCosmetics.length > 0 && (
        <Flex gap={2} mb={5} flexWrap="wrap" align="center">
          <Text fontSize="11px" fontWeight="700" color="gray.400" textTransform="uppercase" letterSpacing="0.5px">
            Equipped:
          </Text>
          {gardenState.equippedCosmetics.map(id => {
            const c = COSMETICS.find(x => x.id === id);
            return c ? (
              <Badge key={id} bg="#f3e8ff" color="#7c3aed" borderRadius="full" px={3} py="3px" fontSize="12px" fontWeight="700">
                {c.icon} {c.name}
              </Badge>
            ) : null;
          })}
        </Flex>
      )}

      {/* Tabs */}
      <Tabs.Root
        value={activeTab.toString()}
        onValueChange={(e) => setActiveTab(Number(e.value))}
        mb={6}
      >
        <Tabs.List
          bg="white" borderRadius="14px" p={1} mb={6}
          border="1.5px solid #d1fae5" display="inline-flex" gap={1} flexWrap="wrap"
        >
          {[
            { label: '🌻 Garden',   dot: activePestCount > 0 },
            { label: '🛍️ Shop',    dot: false },
            { label: '🌤️ Events',  dot: gardenState.claimedEvents.length < SEASONAL_EVENTS.length },
            { label: '🏆 Leaderboard', dot: false },
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
                <Box
                  position="absolute" top="4px" right="4px"
                  w="7px" h="7px" borderRadius="full" bg="#ef4444"
                  style={{ animation: 'pulse 1.5s infinite' }}
                />
              )}
            </Box>
          ))}
        </Tabs.List>

        {/* GARDEN TAB */}
        <Tabs.Content value="0">
          <GardenGrid
            layout={gardenState.layout}
            activePests={gardenState.activePests}
            trackedCrops={trackedCrops}
            onPlaceCrop={handlePlaceCrop}
            onDefendPlot={handleDefendPlot}
            onRemoveCrop={handleRemoveCrop}
          />
        </Tabs.Content>

        {/* SHOP TAB */}
        <Tabs.Content value="1">
          <CosmeticsShop
            coins={gardenState.coins}
            equipped={gardenState.equippedCosmetics}
            unlocked={gardenState.unlockedCosmetics}
            onEquip={handleEquipCosmetic}
            onUnequip={handleUnequipCosmetic}
            onBuy={handleBuyCosmetic}
          />
        </Tabs.Content>

        {/* EVENTS TAB */}
        <Tabs.Content value="2">
          <SeasonalEventsPanel
            claimedEvents={gardenState.claimedEvents}
            coins={gardenState.coins}
            onClaim={handleClaimEvent}
          />
        </Tabs.Content>

        {/* LEADERBOARD TAB */}
        <Tabs.Content value="3">
          <GardenLeaderboard
            currentUserId={user.id}
            onVisit={(row) => setVisitingRow(row)}
          />
        </Tabs.Content>
      </Tabs.Root>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(0.95); }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </Box>
  );
};

export default Garden;