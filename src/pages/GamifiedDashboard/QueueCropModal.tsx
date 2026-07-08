import { Box, Flex, HStack, VStack, Text, Input, Button } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { supabase } from '@/supabase';
import { Tooltip } from '@/components/ui/tooltip';
import {
  CROP_CONFIG,
  type CropConfig,
  getSeasonInfo,
  getPreferredSeasonLabel,
  getCurrentSeasonName,
  getSeasonRecommendations,
  waterColor,
  pestColor,
  difficultyColor,
} from './cropConfig';

function formatDay(n: number): string {
  return `Day ${n}`;
}

// ─── Small presentational bits ────────────────────────────────────────────────

const LevelBar = ({ level, color }: { level: 'Low' | 'Medium' | 'High'; color: string }) => {
  const filled = level === 'Low' ? 1 : level === 'Medium' ? 2 : 3;
  return (
    <HStack gap={1}>
      {[0, 1, 2].map(i => (
        <Box key={i} w="14px" h="6px" borderRadius="full" bg={i < filled ? color : '#e5e7eb'} />
      ))}
      <Text fontSize="10px" fontWeight="800" color={color} ml={1}>{level}</Text>
    </HStack>
  );
};

const STAGE_LABELS = ['🌱 Seedling', '🌿 Sprout', '🌾 Growing', '🍃 Maturing', '🌾 Harvest'];

const GrowthTimeline = ({ initialDay, growthDays }: { initialDay: number; growthDays: number }) => {
  const pct = Math.min(100, (initialDay / growthDays) * 100);
  return (
    <Box>
      <Box position="relative" h="6px" borderRadius="full" bg="#e5f5e9" mb={1.5} overflow="hidden">
        <Box h="100%" borderRadius="full" bg="linear-gradient(90deg,#4ade80,#16a34a)" w={`${pct}%`} transition="width 0.3s" />
      </Box>
      <Flex justify="space-between">
        {STAGE_LABELS.map((label, i) => (
          <Text key={label} fontSize="8px" fontWeight="700" color={pct >= (i / (STAGE_LABELS.length - 1)) * 100 ? '#16a34a' : 'gray.400'}>
            {label}
          </Text>
        ))}
      </Flex>
    </Box>
  );
};

const CropTooltipContent = ({ crop, seasonInfo }: { crop: CropConfig; seasonInfo: ReturnType<typeof getSeasonInfo> }) => (
  <VStack align="start" gap={1} maxW="220px" p={1}>
    <Text fontWeight="800" fontSize="12px">{crop.icon} {crop.name}</Text>
    <Text fontSize="11px" opacity={0.9}>{crop.description}</Text>
    <Text fontSize="10px">🗓️ Best season: {getPreferredSeasonLabel(crop)}</Text>
    <Text fontSize="10px">⏳ Growth: {crop.growthDays} days</Text>
    <Text fontSize="10px">💧 Water: {crop.waterRequirement}</Text>
    <Text fontSize="10px">🛡️ Pest resistance: {crop.pestResistance}</Text>
    <Text fontSize="10px">{seasonInfo.emoji} {seasonInfo.label} right now</Text>
    <Text fontSize="10px" fontStyle="italic" mt={1} borderTop="1px solid rgba(255,255,255,0.2)" pt={1}>
      💡 {crop.tip}
    </Text>
  </VStack>
);

// ─── Crop Collection Progress ─────────────────────────────────────────────────

const CropCollectionProgress = ({ userId }: { userId?: string }) => {
  const [state, setState] = useState<{ grown: number; total: number; placeholder: boolean }>({
    grown: 0, total: CROP_CONFIG.length, placeholder: true,
  });

  useEffect(() => {
    let active = true;
    async function load() {
      if (!userId) return; // keep placeholder
      try {
        const { data, error } = await supabase
          .from('crop_journal')
          .select('crop_name, ai_health_note')
          .eq('user_id', userId);
        if (error || !data) throw error ?? new Error('no data');
        const grownTypes = new Set(
          data
            .filter(r => (r.ai_health_note || '').toLowerCase().includes('harvest confirmed'))
            .map(r => r.crop_name)
        );
        if (active) setState({ grown: grownTypes.size, total: CROP_CONFIG.length, placeholder: false });
      } catch {
        // Fall back to a friendly placeholder rather than breaking the modal.
        if (active) setState({ grown: 0, total: CROP_CONFIG.length, placeholder: true });
      }
    }
    load();
    return () => { active = false; };
  }, [userId]);

  const filledBlocks = Math.round((state.grown / state.total) * 10);

  return (
    <Box bg="#f0fdf4" borderRadius="14px" px={4} py={3} border="1px solid #d1fae5">
      <HStack justify="space-between" mb={1.5}>
        <Text fontSize="11px" fontWeight="800" color="#14532d" textTransform="uppercase" letterSpacing="wider">
          🏆 Crop Collection
        </Text>
        <Text fontSize="11px" fontWeight="800" color="#16a34a">
          {state.grown} / {state.total} Crops Grown
        </Text>
      </HStack>
      <HStack gap="3px">
        {Array.from({ length: 10 }).map((_, i) => (
          <Box key={i} flex={1} h="8px" borderRadius="full" bg={i < filledBlocks ? '#16a34a' : '#d1fae5'} />
        ))}
      </HStack>
      {state.placeholder && (
        <Text fontSize="9px" color="gray.400" mt={1}>Grow and harvest crops to fill your collection.</Text>
      )}
    </Box>
  );
};

// ─── Season Recommendations Banner ────────────────────────────────────────────

const SeasonRecommendationBanner = ({ now }: { now: Date }) => {
  const month = now.getMonth();
  const seasonName = getCurrentSeasonName(month);
  const { recommended, lessIdeal, avoid } = getSeasonRecommendations(month);

  return (
    <Box bg="#f9fafb" borderRadius="14px" px={4} py={3} mb={4} border="1px solid #f3f4f6">
      <Text fontSize="11px" fontWeight="800" color="gray.500" mb={2}>
        Current Season: <Text as="span" color="#14532d">{seasonName}</Text>
      </Text>
      <VStack align="start" gap={1.5}>
        {recommended.length > 0 && (
          <Text fontSize="11px" color="#16a34a" fontWeight="700">
            ✅ Recommended:{' '}
            {recommended.slice(0, 3).map(r => `${r.crop.icon} ${r.crop.name} (+${r.info.bonusPct}%)`).join('  ')}
          </Text>
        )}
        {lessIdeal.length > 0 && (
          <Text fontSize="11px" color="#d97706" fontWeight="700">
            ⚠ Less Ideal:{' '}
            {lessIdeal.slice(0, 3).map(r => `${r.crop.icon} ${r.crop.name} (${r.info.bonusPct}%)`).join('  ')}
          </Text>
        )}
        {avoid.length > 0 && (
          <Text fontSize="11px" color="#dc2626" fontWeight="700">
            ❌ Avoid: {avoid.slice(0, 3).map(r => `${r.crop.icon} ${r.crop.name}`).join('  ')}
            {avoid.length > 3 ? ` +${avoid.length - 3} more` : ''}
          </Text>
        )}
      </VStack>
    </Box>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

export const QueueCropModal = ({
  onAdd,
  onClose,
  now = new Date(),
  farmerLevel = 1,
  userId,
}: {
  onAdd: (crop: { name: string; emoji: string; initial_day: number }) => Promise<void>;
  onClose: () => void;
  now?: Date;
  farmerLevel?: number;
  userId?: string;
}) => {
  const [selected, setSelected] = useState<CropConfig>(CROP_CONFIG[0]);
  const [initialDay, setInitialDay] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const month = now.getMonth();
  const seasonInfo = getSeasonInfo(selected, month);
  const seasonName = getCurrentSeasonName(month);
  const showBeginnerPicks = farmerLevel <= 3;

  const handleAdd = async () => {
    if (initialDay > 10) {
      setError('Max initial day is 10. Crops older than 10 days cannot be queued.');
      return;
    }
    setError('');
    setLoading(true);
    await onAdd({ name: selected.name, emoji: selected.icon, initial_day: initialDay });
    setLoading(false);
    onClose();
  };

  return (
    <Box
      position="fixed" inset={0} zIndex={1000}
      bg="rgba(0,0,0,0.55)"
      display="flex" alignItems="center" justifyContent="center"
      onClick={onClose}
      p={3}
    >
      <Box
        bg="white" borderRadius="24px" p={{ base: 5, md: 7 }}
        w="100%" maxW="820px"
        boxShadow="0 24px 64px rgba(0,0,0,0.22)"
        onClick={e => e.stopPropagation()}
        maxH="92vh" overflowY="auto"
      >
        <Text fontWeight="900" fontSize="xl" mb={1} color="#14532d" letterSpacing="-0.5px">
          🌱 Queue a New Crop
        </Text>
        <Text fontSize="xs" color="gray.400" mb={4}>
          Timeline locks once you hit Start — progress is permanent.
        </Text>

        <SeasonRecommendationBanner now={now} />

        <Flex direction={{ base: 'column', md: 'row' }} gap={5}>
          {/* ── Left: crop picker ───────────────────────────────────────── */}
          <Box flex="1.1" minW={0}>
            {showBeginnerPicks && (
              <Box bg="#fffbeb" border="1px solid #fde68a" borderRadius="12px" px={3} py={2.5} mb={4}>
                <Text fontSize="11px" fontWeight="800" color="#92400e" mb={1.5}>
                  ⭐ Recommended for Beginners
                </Text>
                <HStack gap={1.5} flexWrap="wrap">
                  {CROP_CONFIG.filter(c => c.beginnerFriendly).map(c => (
                    <Box
                      key={c.id}
                      as="button"
                      onClick={() => setSelected(c)}
                      bg={selected.id === c.id ? '#fde68a' : 'white'}
                      border="1px solid #fde68a"
                      borderRadius="full"
                      px={2.5} py={1}
                      fontSize="11px" fontWeight="700" color="#92400e"
                      cursor="pointer"
                      transition="all 0.15s"
                    >
                      {c.icon} {c.name}
                    </Box>
                  ))}
                </HStack>
              </Box>
            )}

            <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={2}>
              Select Crop
            </Text>
            <Box display="grid" gridTemplateColumns="repeat(5, 1fr)" gap={2} mb={5}>
              {CROP_CONFIG.map(crop => {
                const info = getSeasonInfo(crop, month);
                const isSelected = selected.id === crop.id;
                return (
                  <Tooltip
                    key={crop.id}
                    content={<CropTooltipContent crop={crop} seasonInfo={info} />}
                    openDelay={250}
                  >
                    <Box
                      textAlign="center" p={2} borderRadius="12px" cursor="pointer"
                      border="2px solid"
                      borderColor={isSelected ? '#16a34a' : '#f3f4f6'}
                      bg={isSelected ? '#f0fdf4' : 'white'}
                      transform={isSelected ? 'translateY(-2px) scale(1.03)' : 'none'}
                      boxShadow={isSelected ? '0 6px 16px rgba(22,163,74,0.25)' : 'none'}
                      transition="all 0.15s"
                      onClick={() => setSelected(crop)}
                      position="relative"
                    >
                      <Text fontSize="xl">{crop.icon}</Text>
                      <Text fontSize="9px" fontWeight="700" color="gray.500" mt={0.5} truncate>{crop.name}</Text>
                      <Text fontSize="8px" color="gray.400">{crop.growthDays}d</Text>
                      <Box position="absolute" top="2px" right="2px" fontSize="9px" title={info.label}>
                        {info.emoji}
                      </Box>
                      {crop.beginnerFriendly && farmerLevel <= 3 && (
                        <Box position="absolute" top="2px" left="2px" fontSize="9px" title="Beginner friendly">⭐</Box>
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
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
                <Box h="6px" borderRadius="full" bg="#d1fae5" overflow="hidden">
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
              <Box bg="#fee2e2" borderRadius="8px" px={3} py={2} mt={3}>
                <Text fontSize="12px" color="#ef4444" fontWeight="700">{error}</Text>
              </Box>
            )}
          </Box>

          {/* ── Right: crop info panel + harvest summary ────────────────── */}
          <Box flex="1" minW={0}>
            <Box bg="#f8fafc" border="1px solid #e5e7eb" borderRadius="16px" p={4} mb={4}>
              <HStack mb={2} gap={2}>
                <Text fontSize="2xl">{selected.icon}</Text>
                <Box>
                  <Text fontWeight="900" fontSize="md" color="#14532d">{selected.name}</Text>
                  <Text fontSize="10px" color="gray.400">{selected.gameplayTrait}</Text>
                </Box>
              </HStack>

              <Text fontSize="11px" color="gray.500" mb={3}>{selected.description}</Text>

              <VStack align="stretch" gap={2.5} mb={3}>
                <HStack justify="space-between">
                  <Text fontSize="11px" color="gray.500" fontWeight="700">Growth Duration</Text>
                  <Text fontSize="11px" fontWeight="800" color="#14532d">{selected.growthDays} days</Text>
                </HStack>

                <GrowthTimeline initialDay={initialDay} growthDays={selected.growthDays} />

                <HStack justify="space-between">
                  <Text fontSize="11px" color="gray.500" fontWeight="700">Best Planting Season</Text>
                  <Text fontSize="11px" fontWeight="800" color="#14532d">{getPreferredSeasonLabel(selected)}</Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="11px" color="gray.500" fontWeight="700">Season Status</Text>
                  <Text fontSize="11px" fontWeight="800" color={seasonInfo.color}>
                    {seasonInfo.emoji} {seasonInfo.label}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="11px" color="gray.500" fontWeight="700">Estimated Harvest</Text>
                  <Text fontSize="11px" fontWeight="800" color="#14532d">{formatDay(selected.growthDays)}</Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="11px" color="gray.500" fontWeight="700">Water Requirement</Text>
                  <LevelBar level={selected.waterRequirement} color={waterColor(selected.waterRequirement)} />
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="11px" color="gray.500" fontWeight="700">Pest Resistance</Text>
                  <LevelBar level={selected.pestResistance} color={pestColor(selected.pestResistance)} />
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="11px" color="gray.500" fontWeight="700">Difficulty</Text>
                  <Text fontSize="11px" fontWeight="800" color={difficultyColor(selected.difficulty)}>
                    {selected.difficulty}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {/* Harvest Summary — live, informational only */}
            <Box bg="#fefce8" border="1px solid #fde68a" borderRadius="16px" p={4}>
              <Text fontSize="11px" fontWeight="800" color="#92400e" textTransform="uppercase" letterSpacing="wider" mb={2}>
                📋 Harvest Summary
              </Text>
              <VStack align="stretch" gap={1.5}>
                <HStack justify="space-between">
                  <Text fontSize="11px" color="gray.500">Estimated Harvest</Text>
                  <Text fontSize="11px" fontWeight="800" color="#92400e">{formatDay(selected.growthDays)}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="11px" color="gray.500">Growth Duration</Text>
                  <Text fontSize="11px" fontWeight="800" color="#92400e">{selected.growthDays} days</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="11px" color="gray.500">Current Bonus</Text>
                  <Text fontSize="11px" fontWeight="800" color={seasonInfo.color}>
                    {seasonInfo.bonusPct > 0 ? '+' : ''}{seasonInfo.bonusPct}% {seasonName}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="11px" color="gray.500">Estimated Coins</Text>
                  <Text fontSize="11px" fontWeight="800" color="#92400e">+{selected.coinReward}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="11px" color="gray.500">Estimated XP</Text>
                  <Text fontSize="11px" fontWeight="800" color="#92400e">+{selected.xpReward}</Text>
                </HStack>
              </VStack>
              <Text fontSize="9px" color="gray.400" mt={2}>
                Estimates only — actual rewards are granted when you complete verification & harvest in-game.
              </Text>
            </Box>
          </Box>
        </Flex>

        <Box mt={5}>
          <CropCollectionProgress userId={userId} />
        </Box>

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

export default QueueCropModal;
