import React from 'react';
import {
  Box,
  Text,
  VStack,
  Drawer,
  Portal,
  Heading,
  useDisclosure,
  HStack,
  Input,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { ALMANAC_CROPS } from './data';
import { useState, useMemo } from 'react';
import { AlmanacCrop } from './data';
import SeasonBar from './components/SeasonBar';
import {
  LuSearch,
  LuDroplets,
  LuTimer,
  LuCalendar,
  LuChartBar,
  LuSprout,
  LuTag,
  LuX,
  LuList,
  LuLayoutGrid,
  LuFlame,
  LuLeaf,
  LuRuler,
  LuFlaskConical,
  LuUsers,
  LuArrowUpDown,
} from 'react-icons/lu';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CAT_CONFIG: Record<string, { bg: string; color: string; dot: string; label: string; emoji: string }> = {
  leafy:     { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e', label: 'Leafy Green',  emoji: '🥬' },
  fruit_veg: { bg: '#fff7ed', color: '#c2410c', dot: '#f97316', label: 'Fruit Veg',    emoji: '🍅' },
  brassica:  { bg: '#ecfdf5', color: '#065f46', dot: '#10b981', label: 'Brassica',     emoji: '🥦' },
  allium:    { bg: '#faf5ff', color: '#6d28d9', dot: '#a855f7', label: 'Allium',       emoji: '🧅' },
  root:      { bg: '#fffbeb', color: '#92400e', dot: '#f59e0b', label: 'Root Crop',    emoji: '🥕' },
  pepper:    { bg: '#fff1f2', color: '#991b1b', dot: '#ef4444', label: 'Pepper',       emoji: '🌶️' },
  herb:      { bg: '#ecfeff', color: '#0e7490', dot: '#06b6d4', label: 'Herb',         emoji: '🌿' },
};

const ALL_CATS = ['all', ...Object.keys(CAT_CONFIG)];

const WATER_LEVEL: Record<string, { bars: number; color: string }> = {
  Low:      { bars: 1, color: '#86efac' },
  Moderate: { bars: 2, color: '#4ade80' },
  Regular:  { bars: 2, color: '#4ade80' },
  High:     { bars: 3, color: '#16a34a' },
};

const DIFFICULTY_CONFIG: Record<string, { bg: string; color: string; pct: number; fillColor: string }> = {
  Easy:     { bg: '#f0fdf4', color: '#15803d', pct: 33,  fillColor: '#22c55e' },
  Moderate: { bg: '#fff7ed', color: '#c2410c', pct: 66,  fillColor: '#f97316' },
  Hard:     { bg: '#fff1f2', color: '#991b1b', pct: 100, fillColor: '#ef4444' },
};

type SortKey = 'default' | 'name' | 'harvest' | 'price' | 'water_low';
type ViewMode = 'grid' | 'list';

// ─── Sub-components ───────────────────────────────────────────────────────────

const WaterBar = ({ water }: { water: string }) => {
  const w = WATER_LEVEL[water] || { bars: 1, color: '#86efac' };
  return (
    <HStack gap="2px" align="center">
      {[1, 2, 3].map((i) => (
        <Box key={i} w="4px" h="10px" borderRadius="2px" bg={i <= w.bars ? w.color : '#e5e7eb'} />
      ))}
      <Text fontSize="10px" color="#a8a29e" fontWeight="600" ml={1}>{water}</Text>
    </HStack>
  );
};

const DifficultyBadge = ({ difficulty }: { difficulty: AlmanacCrop['difficulty'] }) => {
  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Easy;
  return (
    <Box
      display="inline-flex" alignItems="center"
      bg={cfg.bg} borderRadius="full" px={2} py={0.5}
    >
      <Text fontSize="10px" fontWeight="700" color={cfg.color}>{difficulty}</Text>
    </Box>
  );
};

const SeasonMini = ({ season, dotColor }: { season: AlmanacCrop['season']; dotColor: string }) => (
  <HStack gap="2px" mt={2}>
    {season.map((active, i) => (
      <Box key={i} flex={1} h="3px" borderRadius="full" bg={active ? dotColor : '#e5e7eb'} title={MONTHS[i]} />
    ))}
  </HStack>
);

// ─── Stats Bar ────────────────────────────────────────────────────────────────

const StatsBar = ({ crops }: { crops: AlmanacCrop[] }) => {
  const avgDays = crops.length
    ? Math.round(crops.reduce((s, c) => s + c.harvestDays, 0) / crops.length)
    : 0;
  const lowWater = crops.filter((c) => c.waterNum === 1).length;
  const easy = crops.filter((c) => c.difficulty === 'Easy').length;

  const stats = [
    { label: 'Crops Shown', value: crops.length },
    { label: 'Avg Harvest', value: `${avgDays}d` },
    { label: 'Low Water', value: lowWater },
    { label: 'Beginner Friendly', value: easy },
  ];

  return (
    <Grid templateColumns={{ base: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }} gap={3} mb={6}>
      {stats.map(({ label, value }) => (
        <Box key={label} bg="white" border="1.5px solid #e8e2d9" borderRadius="14px" px={4} py={3}>
          <Text fontSize="22px" fontWeight="900" color="#1c1917" lineHeight={1}>{value}</Text>
          <Text fontSize="10px" fontWeight="700" textTransform="uppercase" letterSpacing="wider" color="#a8a29e" mt={1}>{label}</Text>
        </Box>
      ))}
    </Grid>
  );
};

// ─── Month Filter ─────────────────────────────────────────────────────────────

const MonthFilter = ({
  activeMonth,
  onToggle,
  onClear,
}: {
  activeMonth: number | null;
  onToggle: (i: number) => void;
  onClear: () => void;
}) => (
  <Box bg="white" border="1.5px solid #e8e2d9" borderRadius="20px" px={4} py={3} mb={5}>
    <HStack gap={1.5} mb={3}>
      <LuCalendar size={12} color="#a8a29e" />
      <Text fontSize="10px" fontWeight="900" textTransform="uppercase" letterSpacing="0.12em" color="#a8a29e">
        Filter by month in season
      </Text>
    </HStack>
    <HStack gap={2} flexWrap="wrap">
      {MONTHS.map((m, i) => {
        const isActive = activeMonth === i;
        return (
          <Box
            key={m}
            as="button"
            px={3}
            py={1}
            borderRadius="full"
            border="1.5px solid"
            borderColor={isActive ? '#22c55e' : '#e8e2d9'}
            bg={isActive ? '#f0fdf4' : 'white'}
            color={isActive ? '#15803d' : '#78716c'}
            fontWeight="700"
            fontSize="11px"
            onClick={() => onToggle(i)}
            boxShadow={isActive ? '0 1px 6px rgba(34,197,94,.2)' : 'none'}
            transition="all 0.15s"
            _hover={{ borderColor: '#22c55e' }}
          >
            {m}
          </Box>
        );
      })}
      {activeMonth !== null && (
        <Box
          as="button"
          px={3} py={1} borderRadius="full"
          border="1.5px solid #fca5a5" bg="#fff1f2" color="#ef4444"
          fontWeight="700" fontSize="11px"
          onClick={onClear}
          transition="all 0.15s"
        >
          ✕ Clear
        </Box>
      )}
    </HStack>
  </Box>
);

// ─── Almanac Card (Grid View) ─────────────────────────────────────────────────

const AlmanacCard = ({ almanac, onClick }: { almanac: AlmanacCrop; onClick: (a: AlmanacCrop) => void }) => {
  const { name, cat, catLabel, emoji, bg, price, harvest, water, planted, sci, difficulty, season } = almanac;
  const cfg = CAT_CONFIG[cat] || { bg: '#f9fafb', color: '#374151', dot: '#9ca3af', label: catLabel, emoji: '🌱' };

  return (
    <Box
      onClick={() => onClick(almanac)}
      bg="white"
      borderRadius="20px"
      overflow="hidden"
      border="1.5px solid #e8e2d9"
      cursor="pointer"
      position="relative"
      transition="all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)"
      _hover={{ transform: 'translateY(-5px) scale(1.01)', boxShadow: '0 20px 40px rgba(0,0,0,0.12)', borderColor: cfg.dot }}
      boxShadow="0 2px 8px rgba(0,0,0,0.06)"
      display="flex"
      flexDirection="column"
    >
      {/* Top colour band */}
      <Box bg={bg || cfg.bg} pt={5} pb={4} px={4} position="relative" overflow="hidden">
        <Box position="absolute" bottom="-14px" right="-8px" fontSize="4.5rem" opacity={0.12} lineHeight={1} userSelect="none" pointerEvents="none">
          {emoji}
        </Box>
        <Box display="inline-flex" alignItems="center" gap="4px" bg="white" border="1px solid" borderColor={cfg.color + '40'} borderRadius="full" px={2} py={0.5} mb={3}>
          <Box w="5px" h="5px" borderRadius="full" bg={cfg.dot} />
          <Text fontSize="9px" fontWeight="800" color={cfg.color} textTransform="uppercase" letterSpacing="wider">{cfg.label}</Text>
        </Box>
        <Text fontSize="2.8rem" lineHeight={1} display="block">{emoji}</Text>
      </Box>

      {/* Card body */}
      <Box p={4} flex={1} display="flex" flexDirection="column">
        <Text fontWeight="800" fontSize="sm" color="#1c1917" lineHeight="1.25" mb={0.5}>{name}</Text>
        <Box fontSize="10px" color="#a8a29e" fontStyle="italic" mb={3} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
          {sci}
        </Box>

        <VStack align="stretch" gap={1.5} flex={1}>
          <HStack justify="space-between">
            <HStack gap={1.5}>
              <LuTimer size={11} color="#a8a29e" />
              <Text fontSize="11px" color="#78716c" fontWeight="600">{harvest}</Text>
            </HStack>
            <WaterBar water={water} />
          </HStack>
          <HStack gap={1.5}>
            <LuCalendar size={11} color="#a8a29e" />
            <Text fontSize="11px" color="#78716c" fontWeight="600">{planted}</Text>
          </HStack>
        </VStack>

        <SeasonMini season={season} dotColor={cfg.dot} />

        <Box mt={3} pt={3} borderTop="1px dashed #e7e5e4" display="flex" alignItems="center" justifyContent="space-between">
          <Text fontSize="12px" fontWeight="800" color={cfg.color}>{price}</Text>
          <DifficultyBadge difficulty={difficulty} />
        </Box>
      </Box>
    </Box>
  );
};

// ─── List Card (List View) ────────────────────────────────────────────────────

const ListCard = ({ almanac, onClick }: { almanac: AlmanacCrop; onClick: (a: AlmanacCrop) => void }) => {
  const { name, cat, catLabel, emoji, price, harvest, planted, sci, difficulty, season } = almanac;
  const cfg = CAT_CONFIG[cat] || { bg: '#f9fafb', color: '#374151', dot: '#9ca3af', label: catLabel, emoji: '🌱' };

  return (
    <Box
      onClick={() => onClick(almanac)}
      bg="white"
      borderRadius="16px"
      border="1.5px solid #e8e2d9"
      cursor="pointer"
      transition="all 0.15s"
      _hover={{ boxShadow: '0 6px 20px rgba(0,0,0,0.08)', transform: 'translateX(3px)', borderColor: cfg.dot }}
      px={4} py={3}
      display="flex"
      alignItems="center"
      gap={4}
    >
      <Text fontSize="2rem" flexShrink={0}>{emoji}</Text>

      <Box flex={1} minW={0}>
        <Text fontWeight="800" fontSize="14px" color="#1c1917">{name}</Text>
        <Text fontSize="11px" color="#a8a29e" fontStyle="italic">{sci}</Text>
        <HStack mt={1.5} gap={2} flexWrap="wrap">
          <Box bg={cfg.bg} borderRadius="full" px={2} py={0.5} border="1px solid" borderColor={cfg.color + '30'}>
            <Text fontSize="10px" fontWeight="700" color={cfg.color}>{cfg.label}</Text>
          </Box>
          <Box bg="#f0fdf4" borderRadius="full" px={2} py={0.5} border="1px solid #bbf7d0">
            <Text fontSize="10px" fontWeight="700" color="#15803d">⏱ {harvest}</Text>
          </Box>
          <DifficultyBadge difficulty={difficulty} />
        </HStack>
      </Box>

      <Box textAlign="right" flexShrink={0}>
        <Text fontSize="13px" fontWeight="800" color={cfg.color}>{price}</Text>
        <Text fontSize="11px" color="#78716c" mt={0.5}>{planted}</Text>
        <HStack gap="2px" mt={1.5} justifyContent="flex-end">
          {season.map((active, i) => (
            <Box key={i} w="6px" h="6px" borderRadius="2px" bg={active ? cfg.dot : '#e5e7eb'} title={MONTHS[i]} />
          ))}
        </HStack>
      </Box>
    </Box>
  );
};

// ─── Detail Panel ─────────────────────────────────────────────────────────────

const DetailPanel = ({ details, onClose }: { details: AlmanacCrop; onClose: () => void }) => {
  const {
    name, emoji, sci, catLabel, cat, price, harvest, planted,
    yield: plantYield, water, tips, season, bg,
    difficulty, ph, spacing, companions, avoid,
  } = details;
  const cfg = CAT_CONFIG[cat] || { bg: '#f9fafb', color: '#374151', dot: '#9ca3af', label: catLabel, emoji: '🌱' };
  const diffCfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Easy;

  return (
    <Box h="100%" display="flex" flexDirection="column" overflow="hidden">
      {/* Hero */}
      <Box bg={bg || cfg.bg} px={6} pt={8} pb={6} position="relative" overflow="hidden" flexShrink={0}>
        <Box position="absolute" bottom="-20px" right="-10px" fontSize="9rem" opacity={0.1} lineHeight={1} userSelect="none">{emoji}</Box>
        <Box as="button" position="absolute" top={4} right={4} w="32px" h="32px" borderRadius="full" bg="white" boxShadow="0 2px 8px rgba(0,0,0,0.12)" border="none" cursor="pointer" display="flex" alignItems="center" justifyContent="center" onClick={onClose} _hover={{ bg: 'gray.100' }} transition="background 0.15s">
          <LuX size={14} color="#374151" />
        </Box>
        <HStack gap={4} align="flex-start">
          <Box w="80px" h="80px" borderRadius="22px" bg="white" boxShadow="0 6px 20px rgba(0,0,0,0.1)" display="flex" alignItems="center" justifyContent="center" fontSize="2.8rem" flexShrink={0}>{emoji}</Box>
          <Box pt={1}>
            <HStack gap={1.5} mb={2}>
              <Box w="7px" h="7px" borderRadius="full" bg={cfg.dot} />
              <Text fontSize="10px" fontWeight="800" color={cfg.color} textTransform="uppercase" letterSpacing="wider">{cfg.label}</Text>
            </HStack>
            <Heading fontSize="2xl" fontWeight="900" color="#1c1917" lineHeight="1.1">{name}</Heading>
            <Text fontSize="12px" color="#78716c" fontStyle="italic" mt={0.5}>{sci}</Text>
            <Box mt={2.5} display="inline-flex" alignItems="center" gap={1.5} bg="white" borderRadius="full" px={3} py={1.5} boxShadow="0 2px 8px rgba(0,0,0,0.08)">
              <LuTag size={11} color={cfg.color} />
              <Text fontSize="12px" fontWeight="800" color={cfg.color}>{price}</Text>
            </Box>
          </Box>
        </HStack>
      </Box>

      {/* Scrollable body */}
      <Box flex={1} overflowY="auto" px={6} py={5}>
        <VStack align="stretch" gap={5}>

          {/* Stat grid — 6 items */}
          <Grid templateColumns="1fr 1fr" gap={3}>
            {[
              { icon: <LuTimer size={13} />,        label: 'Harvest Time', value: harvest },
              { icon: <LuCalendar size={13} />,     label: 'Best Planted', value: planted },
              { icon: <LuChartBar size={13} />,     label: 'Yield / sqm',  value: plantYield },
              { icon: <LuDroplets size={13} />,     label: 'Water Needs',  value: water },
              { icon: <LuFlaskConical size={13} />, label: 'Soil pH',      value: ph },
              { icon: <LuRuler size={13} />,        label: 'Spacing',      value: spacing },
            ].map(({ icon, label, value }) => (
              <GridItem key={label}>
                <Box bg="#fafaf9" border="1px solid #e7e5e4" borderRadius="16px" px={4} py={3.5}>
                  <HStack gap={1.5} mb={1.5} color={cfg.color}>{icon}
                    <Text fontSize="9px" fontWeight="800" textTransform="uppercase" letterSpacing="wider" color="#a8a29e">{label}</Text>
                  </HStack>
                  <Text fontWeight="800" fontSize="sm" color="#1c1917">{value}</Text>
                </Box>
              </GridItem>
            ))}
          </Grid>

          {/* Difficulty */}
          <Box bg="#fafaf9" border="1px solid #e7e5e4" borderRadius="16px" px={4} py={4}>
            <HStack gap={2} mb={3}>
              <LuFlame size={13} color={cfg.color} />
              <Text fontSize="9px" fontWeight="800" textTransform="uppercase" letterSpacing="wider" color="#a8a29e">Difficulty Level</Text>
            </HStack>
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="800" fontSize="14px" color={diffCfg.fillColor}>{difficulty}</Text>
              <Text fontSize="11px" color="#a8a29e">{diffCfg.pct}%</Text>
            </HStack>
            <Box h="8px" borderRadius="full" bg="#e5e7eb" overflow="hidden">
              <Box h="100%" borderRadius="full" bg={diffCfg.fillColor} w={`${diffCfg.pct}%`} transition="width 0.5s ease" />
            </Box>
            <HStack justify="space-between" mt={1}>
              <Text fontSize="10px" color="#a8a29e">Beginner</Text>
              <Text fontSize="10px" color="#a8a29e">Expert</Text>
            </HStack>
          </Box>

          {/* Season */}
          <Box bg="#fafaf9" border="1px solid #e7e5e4" borderRadius="16px" px={4} py={4}>
            <HStack gap={2} mb={3}>
              <LuCalendar size={13} color={cfg.color} />
              <Text fontSize="9px" fontWeight="800" textTransform="uppercase" letterSpacing="wider" color="#a8a29e">Peak Season</Text>
            </HStack>
            <SeasonBar season={season} dotColor={cfg.dot} />
          </Box>

          {/* Companion planting */}
          {(companions.length > 0 || avoid.length > 0) && (
            <Box>
              <HStack gap={2} mb={3}>
                <Box w="28px" h="28px" borderRadius="8px" bg={cfg.bg} display="flex" alignItems="center" justifyContent="center" color={cfg.color}>
                  <LuUsers size={14} />
                </Box>
                <Text fontSize="11px" fontWeight="800" color="#78716c" textTransform="uppercase" letterSpacing="wider">Companion Planting</Text>
              </HStack>
              <HStack flexWrap="wrap" gap={2}>
                {companions.map((c) => (
                  <Box key={c} display="inline-flex" alignItems="center" gap={1} bg={cfg.bg} border="1.5px solid" borderColor={cfg.color + '40'} borderRadius="full" px={3} py={1}>
                    <Text fontSize="11px" fontWeight="700" color={cfg.color}>✓ {c}</Text>
                  </Box>
                ))}
                {avoid.map((a) => (
                  <Box key={a} display="inline-flex" alignItems="center" gap={1} bg="#fff1f2" border="1.5px solid #fca5a580" borderRadius="full" px={3} py={1}>
                    <Text fontSize="11px" fontWeight="700" color="#991b1b">✗ Avoid: {a}</Text>
                  </Box>
                ))}
              </HStack>
            </Box>
          )}

          {/* Tips */}
          <Box>
            <HStack gap={2} mb={4}>
              <Box w="28px" h="28px" borderRadius="8px" bg={cfg.bg} display="flex" alignItems="center" justifyContent="center" color={cfg.color}>
                <LuSprout size={14} />
              </Box>
              <Text fontSize="11px" fontWeight="800" color="#78716c" textTransform="uppercase" letterSpacing="wider">Farmer Tips</Text>
            </HStack>
            <VStack align="stretch" gap={3}>
              {tips.map((tip, idx) => (
                <HStack key={idx} align="flex-start" gap={3}>
                  <Box w="24px" h="24px" borderRadius="8px" bg={cfg.bg} border="1.5px solid" borderColor={cfg.color + '30'} display="flex" alignItems="center" justifyContent="center" flexShrink={0} mt="1px">
                    <Text fontSize="10px" fontWeight="900" color={cfg.color}>{idx + 1}</Text>
                  </Box>
                  <Box flex={1} bg="#fafaf9" border="1px solid #e7e5e4" borderRadius="12px" px={3.5} py={3}>
                    <Text fontSize="13px" color="#44403c" lineHeight="1.65">{tip}</Text>
                  </Box>
                </HStack>
              ))}
            </VStack>
          </Box>

          <Box h={2} />
        </VStack>
      </Box>
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Almanac = () => {
  const { onClose, onOpen, open } = useDisclosure();
  const [details, setDetails] = useState<AlmanacCrop | null>(null);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>('default');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const handleView = (d: AlmanacCrop) => { setDetails(d); onOpen(); };

  const toggleMonth = (i: number) => setActiveMonth((prev) => (prev === i ? null : i));

  const filtered = useMemo(() => {
    let crops = [...ALMANAC_CROPS];
    const q = search.toLowerCase();
    if (q) crops = crops.filter((c) => c.name.toLowerCase().includes(q) || c.sci.toLowerCase().includes(q));
    if (activeCat !== 'all') crops = crops.filter((c) => c.cat === activeCat);
    if (activeMonth !== null) crops = crops.filter((c) => c.season[activeMonth]);
    if (sort === 'name')      crops.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'harvest')   crops.sort((a, b) => a.harvestDays - b.harvestDays);
    if (sort === 'price')     crops.sort((a, b) => b.priceNum - a.priceNum);
    if (sort === 'water_low') crops.sort((a, b) => a.waterNum - b.waterNum);
    return crops;
  }, [search, activeCat, activeMonth, sort]);

  return (
    <>
      <Box minH="100vh" bg="#f5f0e8" py={8} px={{ base: 4, md: 6 }}>
        <Box maxW="1080px" mx="auto">

          {/* Header */}
          <HStack justify="space-between" align="flex-end" mb={8} flexWrap="wrap" gap={4}>
            <Box>
              <Text fontSize="10px" fontWeight="900" letterSpacing="0.18em" color="#15803d" textTransform="uppercase" mb={1}>
                Farmer's Reference
              </Text>
              <Heading fontSize={{ base: '28px', md: '36px' }} fontWeight="900" color="#1c1917" lineHeight="1" letterSpacing="-0.5px">
                Crop Almanac 🌾
              </Heading>
              <Text fontSize="14px" color="#78716c" mt={2}>
                Showing {filtered.length} of {ALMANAC_CROPS.length} local crops — seasons, care tips &amp; market prices.
              </Text>
            </Box>

            <HStack gap={2} flexWrap="wrap">
              {/* Sort */}
              <HStack gap={1.5} bg="white" border="1.5px solid #e8e2d9" borderRadius="full" px={3} h="40px">
                <LuArrowUpDown size={12} color="#a8a29e" />
                <select
                  value={sort}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSort(e.target.value as SortKey)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '12px',
                    color: '#78716c',
                    outline: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="default">Sort: Default</option>
                  <option value="name">Name A–Z</option>
                  <option value="harvest">Fastest Harvest</option>
                  <option value="price">Highest Price</option>
                  <option value="water_low">Lowest Water</option>
                </select>
              </HStack>

              {/* View toggle */}
              <HStack gap={0} bg="white" border="1.5px solid #e8e2d9" borderRadius="full" overflow="hidden" h="40px">
                {([['grid', <LuLayoutGrid size={14} />, 'Grid'], ['list', <LuList size={14} />, 'List']] as const).map(([mode, icon, label]) => (
                  <Box
                    key={mode}
                    as="button"
                    px={3} h="full"
                    display="flex" alignItems="center" gap={1.5}
                    bg={viewMode === mode ? '#f0fdf4' : 'transparent'}
                    color={viewMode === mode ? '#15803d' : '#78716c'}
                    fontWeight={viewMode === mode ? '700' : '500'}
                    fontSize="12px"
                    onClick={() => setViewMode(mode)}
                    transition="all 0.15s"
                    border="none" cursor="pointer"
                  >
                    {icon}
                    <Text>{label}</Text>
                  </Box>
                ))}
              </HStack>

              {/* Search */}
              <Box position="relative" w={{ base: 'full', md: '220px' }}>
                <Box position="absolute" left={3.5} top="50%" transform="translateY(-50%)" color="#a8a29e" pointerEvents="none">
                  <LuSearch size={14} />
                </Box>
                <Input
                  pl="36px" placeholder="Search crops…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  bg="white" border="1.5px solid #e8e2d9" borderRadius="full"
                  fontSize="13px" h="40px"
                  _focus={{ borderColor: '#15803d', boxShadow: '0 0 0 3px rgba(21,128,61,0.1)', outline: 'none' }}
                  _placeholder={{ color: '#a8a29e' }}
                />
              </Box>
            </HStack>
          </HStack>

          {/* Stats bar */}
          <StatsBar crops={filtered} />

          {/* Category tabs */}
          <Box overflowX="auto" mb={5} css={{ scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
            <HStack gap={2} pb={1} minW="max-content">
              {ALL_CATS.map((cat) => {
                const cfg = CAT_CONFIG[cat];
                const isActive = activeCat === cat;
                const count = cat === 'all' ? ALMANAC_CROPS.length : ALMANAC_CROPS.filter((c) => c.cat === cat).length;
                return (
                  <Box
                    key={cat} as="button" px={4} py={2} borderRadius="full"
                    border="1.5px solid" borderColor={isActive ? (cfg?.dot || '#15803d') : '#e8e2d9'}
                    bg={isActive ? (cfg?.bg || '#f0fdf4') : 'white'}
                    transition="all 0.15s" onClick={() => setActiveCat(cat)}
                    boxShadow={isActive ? `0 2px 10px ${(cfg?.dot || '#15803d')}35` : 'none'}
                    _hover={{ borderColor: cfg?.dot || '#15803d' }}
                  >
                    <HStack gap={1.5}>
                      <Text fontSize="11px" fontWeight="800" color={isActive ? (cfg?.color || '#15803d') : '#78716c'}>
                        {cat === 'all' ? '🌿 All' : `${cfg?.emoji || ''} ${cfg?.label || cat}`}
                      </Text>
                      <Box bg={isActive ? (cfg?.dot || '#15803d') + '22' : '#f0f0f0'} borderRadius="full" px={1.5} py={0.5}>
                        <Text fontSize="9px" fontWeight="800" color={isActive ? (cfg?.color || '#15803d') : '#a8a29e'}>{count}</Text>
                      </Box>
                    </HStack>
                  </Box>
                );
              })}
            </HStack>
          </Box>

          {/* Month filter */}
          <MonthFilter activeMonth={activeMonth} onToggle={toggleMonth} onClear={() => setActiveMonth(null)} />

          {/* Grid / List */}
          {filtered.length === 0 ? (
            <Box textAlign="center" py={20} bg="white" borderRadius="24px" border="2px dashed #e8e2d9">
              <Text fontSize="3xl" mb={3}>🔍</Text>
              <Text fontWeight="800" color="#44403c" fontSize="md">No crops found</Text>
              <Text fontSize="sm" color="#a8a29e" mt={1}>Try adjusting your search, category, or month filter</Text>
            </Box>
          ) : viewMode === 'grid' ? (
            <Box
              display="grid"
              gridTemplateColumns={{ base: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }}
              gap={4}
            >
              {filtered.map((al) => (
                <AlmanacCard key={al.id} almanac={al} onClick={handleView} />
              ))}
            </Box>
          ) : (
            <VStack align="stretch" gap={3}>
              {filtered.map((al) => (
                <ListCard key={al.id} almanac={al} onClick={handleView} />
              ))}
            </VStack>
          )}
        </Box>
      </Box>

      {/* Detail Drawer */}
      <Drawer.Root size="md" open={open} onInteractOutside={onClose}>
        <Portal>
          <Drawer.Backdrop bg="blackAlpha.500" backdropFilter="blur(2px)" />
          <Drawer.Positioner>
            <Drawer.Content bg="white" boxShadow="-8px 0 40px rgba(0,0,0,0.15)" p={0} overflow="hidden">
              <Drawer.Body p={0} h="100%">
                {details && <DetailPanel details={details} onClose={onClose} />}
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </>
  );
};

export default Almanac;