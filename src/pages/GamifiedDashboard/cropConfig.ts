// ─── Crop Configuration ─────────────────────────────────────────────────────
// Single source of truth for the "Queue a New Crop" gamified tracker.
//
// IMPORTANT: `name` and `icon` below MUST stay in sync with the values that
// get written to `tracked_crops` (see CROP_OPTIONS / handleAddCrop in
// GamifiedDashboard.tsx). Nothing here changes planting logic, APIs, or DB
// models — this file only powers informational UI (info panel, tooltips,
// season badges, harvest summary, collection tracker).
//
// To add a new crop later: just add a new entry to CROP_CONFIG. The UI reads
// straight from this array — no other file needs to change.

export type WaterRequirement = 'Low' | 'Medium' | 'High';
export type PestResistance = 'Low' | 'Medium' | 'High';
export type CropDifficulty = 'Beginner' | 'Easy' | 'Moderate' | 'Hard';
export type SeasonStatus = 'in_season' | 'acceptable' | 'out_of_season';

// ─── Visual properties (Phase 2 — crop rendering only) ───────────────────
// Everything below feeds CropPlant.tsx so the garden tile art reads each
// crop's silhouette from data instead of hardcoded per-crop cases. None of
// this affects growth/harvest/reward logic — it is purely descriptive of
// how a crop is drawn.
export type GrowthStyle = 'rosette' | 'mat' | 'bush' | 'climbing_vine' | 'sprawling_vine';
export type LeafShape = 'blade' | 'oval' | 'heart' | 'broad' | 'frond';
export type FruitShape = 'round' | 'oval' | 'bumpy' | 'ridged' | 'long_pod' | 'bottle' | 'none';
export type SupportStructure = 'stake' | 'trellis' | 'none';
export type AnimationType = 'sway' | 'ripple' | 'swing' | 'bob';
export type CropCategory = 'leafy' | 'vine' | 'root' | 'fruiting';

export type CropVisual = {
  primaryColor: string;    // main foliage color at maturity
  secondaryColor: string;  // shading / undertone
  accentColor: string;     // fruit, flower, or highlight color
  matureHeight: number;    // px above the soil line at full maturity
  matureWidth: number;     // px footprint width at full maturity
  growthStyle: GrowthStyle;
  leafShape: LeafShape;
  fruitShape: FruitShape;
  animationType: AnimationType;
  supportStructure: SupportStructure;
  cropCategory: CropCategory;
};

export type CropConfig = {
  id: string;
  name: string;              // must match tracked_crops.name exactly
  icon: string;               // must match tracked_crops.emoji exactly
  description: string;
  growthDays: number;         // informational real-world growth duration
  waterRequirement: WaterRequirement;
  pestResistance: PestResistance;
  xpReward: number;           // estimated — actual XP is awarded flatly on harvest
  coinReward: number;         // estimated — actual coins are awarded flatly on harvest
  difficulty: CropDifficulty;
  beginnerFriendly: boolean;
  recommendedWeather: string; // flavor label, e.g. "Wet Season", "Dry Season", "Year-round"
  gameplayTrait: string;      // short badge shown on the crop card
  tip: string;                // one gameplay tip shown in the hover tooltip
  // Months (0 = Jan ... 11 = Dec) where this crop is in its ideal window.
  goodMonths: number[];
  // Months that are workable but not ideal (shoulder season).
  okMonths: number[];
  // Season bonus/penalty percentages used purely for display purposes.
  inSeasonBonusPct: number;
  acceptableBonusPct: number;
  outOfSeasonPenaltyPct: number;
  // Visual properties for CropPlant.tsx (Phase 2). Purely descriptive —
  // see CropVisual above.
  visual: CropVisual;
};

export const CROP_CONFIG: CropConfig[] = [
  {
    id: 'pechay',
    name: 'Pechay',
    icon: '🥬',
    description: 'A quick, forgiving leafy green — the go-to starter crop for new farmers.',
    growthDays: 35,
    waterRequirement: 'Medium',
    pestResistance: 'High',
    xpReward: 90,
    coinReward: 22,
    difficulty: 'Beginner',
    beginnerFriendly: true,
    recommendedWeather: 'Cool & Dry',
    gameplayTrait: '⚡ Fast Growing · Beginner Friendly',
    tip: 'Harvest the outer leaves first to keep the plant producing longer.',
    goodMonths: [2, 3, 4, 5, 9, 10, 11],
    okMonths: [0, 1, 8],
    inSeasonBonusPct: 20,
    acceptableBonusPct: -5,
    outOfSeasonPenaltyPct: -20,
    visual: {
      primaryColor: '#6bbf4e',
      secondaryColor: '#3f8a2c',
      accentColor: '#a9d987',
      matureHeight: 16,
      matureWidth: 32,
      growthStyle: 'rosette',
      leafShape: 'oval',
      fruitShape: 'none',
      animationType: 'sway',
      supportStructure: 'none',
      cropCategory: 'leafy',
    },
  },
  {
    id: 'kamatis',
    name: 'Kamatis',
    icon: '🍅',
    description: 'A high-value fruiting crop that pays well but needs watchful pest control.',
    growthDays: 70,
    waterRequirement: 'Medium',
    pestResistance: 'Low',
    xpReward: 130,
    coinReward: 45,
    difficulty: 'Moderate',
    beginnerFriendly: false,
    recommendedWeather: 'Dry Season',
    gameplayTrait: '💰 High Coin Reward · Pest-Prone',
    tip: 'Pinch off suckers early to push more energy into fruit production.',
    goodMonths: [2, 3, 4, 10, 11],
    okMonths: [1, 9],
    inSeasonBonusPct: 20,
    acceptableBonusPct: -5,
    outOfSeasonPenaltyPct: -25,
    visual: {
      primaryColor: '#4f9c4a',
      secondaryColor: '#2f6b2c',
      accentColor: '#e6412c',
      matureHeight: 24,
      matureWidth: 26,
      growthStyle: 'bush',
      leafShape: 'oval',
      fruitShape: 'round',
      animationType: 'bob',
      supportStructure: 'none',
      cropCategory: 'fruiting',
    },
  },
  {
    id: 'sitaw',
    name: 'Sitaw',
    icon: '🫘',
    description: 'Dependable pole beans that keep producing pods across a long harvest window.',
    growthDays: 55,
    waterRequirement: 'Low',
    pestResistance: 'Medium',
    xpReward: 105,
    coinReward: 30,
    difficulty: 'Easy',
    beginnerFriendly: true,
    recommendedWeather: 'Wet Season',
    gameplayTrait: '🌾 Reliable Yields',
    tip: 'Keep the trellis taut — heavy pods can topple an unsupported vine.',
    goodMonths: [2, 3, 4, 5, 6, 7, 8],
    okMonths: [1, 9],
    inSeasonBonusPct: 15,
    acceptableBonusPct: 0,
    outOfSeasonPenaltyPct: -15,
    visual: {
      primaryColor: '#4a9c4f',
      secondaryColor: '#2b6a2f',
      accentColor: '#79b34a',
      matureHeight: 36,
      matureWidth: 16,
      growthStyle: 'climbing_vine',
      leafShape: 'oval',
      fruitShape: 'long_pod',
      animationType: 'swing',
      supportStructure: 'stake',
      cropCategory: 'vine',
    },
  },
  {
    id: 'ampalaya',
    name: 'Ampalaya',
    icon: '🥒',
    description: 'A slow-growing vine, but patient farmers are rewarded with excellent XP.',
    growthDays: 65,
    waterRequirement: 'Medium',
    pestResistance: 'Medium',
    xpReward: 150,
    coinReward: 32,
    difficulty: 'Moderate',
    beginnerFriendly: false,
    recommendedWeather: 'Dry-to-Wet Transition',
    gameplayTrait: '🧪 Slow Growth · High XP',
    tip: 'Remove dead tendrils regularly to redirect growth into new vines.',
    goodMonths: [3, 4, 5, 6],
    okMonths: [2, 7],
    inSeasonBonusPct: 15,
    acceptableBonusPct: -5,
    outOfSeasonPenaltyPct: -15,
    visual: {
      primaryColor: '#3f9142',
      secondaryColor: '#235c28',
      accentColor: '#a8c93f',
      matureHeight: 34,
      matureWidth: 18,
      growthStyle: 'climbing_vine',
      leafShape: 'frond',
      fruitShape: 'bumpy',
      animationType: 'swing',
      supportStructure: 'trellis',
      cropCategory: 'vine',
    },
  },
  {
    id: 'kangkong',
    name: 'Kangkong',
    icon: '🌿',
    description: 'A hardy, semi-aquatic green that loves wet feet and rewards frequent watering.',
    growthDays: 28,
    waterRequirement: 'High',
    pestResistance: 'High',
    xpReward: 80,
    coinReward: 18,
    difficulty: 'Beginner',
    beginnerFriendly: true,
    recommendedWeather: 'Wet Season',
    gameplayTrait: '🌧️ Thrives in Wet Season',
    tip: 'Flood the bed if you can — Kangkong grows fastest with standing water.',
    goodMonths: [4, 5, 6, 7, 8, 9],
    okMonths: [0, 1, 2, 3, 10, 11],
    inSeasonBonusPct: 15,
    acceptableBonusPct: 0,
    outOfSeasonPenaltyPct: -5,
    visual: {
      primaryColor: '#3fae44',
      secondaryColor: '#226b28',
      accentColor: '#8fd66a',
      matureHeight: 10,
      matureWidth: 36,
      growthStyle: 'mat',
      leafShape: 'blade',
      fruitShape: 'none',
      animationType: 'ripple',
      supportStructure: 'none',
      cropCategory: 'leafy',
    },
  },
  {
    id: 'kamote',
    name: 'Kamote',
    icon: '🍠',
    description: 'A drought-tolerant root crop that quietly grows underground with little fuss.',
    growthDays: 90,
    waterRequirement: 'Low',
    pestResistance: 'High',
    xpReward: 140,
    coinReward: 34,
    difficulty: 'Easy',
    beginnerFriendly: true,
    recommendedWeather: 'Dry Season',
    gameplayTrait: '🪨 Drought Tolerant · Low Maintenance',
    tip: 'Keep soil moisture consistent — sudden changes can crack developing tubers.',
    goodMonths: [10, 11, 0, 1, 2, 3],
    okMonths: [4, 9],
    inSeasonBonusPct: 15,
    acceptableBonusPct: -5,
    outOfSeasonPenaltyPct: -10,
    visual: {
      primaryColor: '#4a8f42',
      secondaryColor: '#2c5c28',
      accentColor: '#6faa4a',
      matureHeight: 8,
      matureWidth: 38,
      growthStyle: 'sprawling_vine',
      leafShape: 'heart',
      fruitShape: 'none',
      animationType: 'sway',
      supportStructure: 'none',
      cropCategory: 'root',
    },
  },
  {
    id: 'talong',
    name: 'Talong',
    icon: '🍆',
    description: 'A year-round fruiting workhorse that stays productive across most seasons.',
    growthDays: 75,
    waterRequirement: 'Medium',
    pestResistance: 'Medium',
    xpReward: 125,
    coinReward: 36,
    difficulty: 'Easy',
    beginnerFriendly: true,
    recommendedWeather: 'Year-round',
    gameplayTrait: '📆 Year-round Grower',
    tip: 'Stake branches early — fruiting weight can snap unsupported stems.',
    goodMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    okMonths: [],
    inSeasonBonusPct: 10,
    acceptableBonusPct: 0,
    outOfSeasonPenaltyPct: 0,
    visual: {
      primaryColor: '#4c9750',
      secondaryColor: '#2c6430',
      accentColor: '#5b3a86',
      matureHeight: 26,
      matureWidth: 22,
      growthStyle: 'bush',
      leafShape: 'oval',
      fruitShape: 'oval',
      animationType: 'bob',
      supportStructure: 'none',
      cropCategory: 'fruiting',
    },
  },
  {
    id: 'patola',
    name: 'Patola',
    icon: '🥗',
    description: 'A climbing gourd that rewards a well-tensioned trellis with steady harvests.',
    growthDays: 60,
    waterRequirement: 'Medium',
    pestResistance: 'Medium',
    xpReward: 110,
    coinReward: 28,
    difficulty: 'Moderate',
    beginnerFriendly: false,
    recommendedWeather: 'Wet Season',
    gameplayTrait: '🧗 Climber · Needs Trellis',
    tip: 'Rotate the vines occasionally so every leaf gets a fair share of sunlight.',
    goodMonths: [3, 4, 5, 6, 7],
    okMonths: [2, 8],
    inSeasonBonusPct: 15,
    acceptableBonusPct: -5,
    outOfSeasonPenaltyPct: -15,
    visual: {
      primaryColor: '#3f8f52',
      secondaryColor: '#245c30',
      accentColor: '#7fae3f',
      matureHeight: 35,
      matureWidth: 17,
      growthStyle: 'climbing_vine',
      leafShape: 'frond',
      fruitShape: 'ridged',
      animationType: 'swing',
      supportStructure: 'trellis',
      cropCategory: 'vine',
    },
  },
  {
    id: 'upo',
    name: 'Upo',
    icon: '🥦',
    description: 'A big, thirsty vine — slow to mature but pays out one of the largest harvests.',
    growthDays: 80,
    waterRequirement: 'High',
    pestResistance: 'Medium',
    xpReward: 135,
    coinReward: 42,
    difficulty: 'Moderate',
    beginnerFriendly: false,
    recommendedWeather: 'Wet Season',
    gameplayTrait: '🏆 High Harvest Reward · Long Growth',
    tip: 'Deep-water regularly — large fruit means large water demand.',
    goodMonths: [2, 3, 4, 5, 6],
    okMonths: [1, 7],
    inSeasonBonusPct: 15,
    acceptableBonusPct: -5,
    outOfSeasonPenaltyPct: -15,
    visual: {
      primaryColor: '#4a9c4f',
      secondaryColor: '#2a6b30',
      accentColor: '#cfe8a8',
      matureHeight: 15,
      matureWidth: 40,
      growthStyle: 'sprawling_vine',
      leafShape: 'broad',
      fruitShape: 'bottle',
      animationType: 'sway',
      supportStructure: 'none',
      cropCategory: 'vine',
    },
  },
  {
    id: 'mustasa',
    name: 'Mustasa',
    icon: '🌱',
    description: 'A peppery, fast-maturing green that\u2019s nearly impossible to get wrong.',
    growthDays: 30,
    waterRequirement: 'Medium',
    pestResistance: 'High',
    xpReward: 85,
    coinReward: 20,
    difficulty: 'Beginner',
    beginnerFriendly: true,
    recommendedWeather: 'Cool & Dry',
    gameplayTrait: '⚡ Fast Growing · Beginner Friendly',
    tip: 'Water lightly and often — overwatering makes the leaves taste bitter.',
    goodMonths: [9, 10, 11, 0, 1],
    okMonths: [2, 8],
    inSeasonBonusPct: 20,
    acceptableBonusPct: -5,
    outOfSeasonPenaltyPct: -20,
    visual: {
      primaryColor: '#6bae5c',
      secondaryColor: '#3f7a34',
      accentColor: '#8a3d3d',
      matureHeight: 12,
      matureWidth: 24,
      growthStyle: 'rosette',
      leafShape: 'frond',
      fruitShape: 'none',
      animationType: 'sway',
      supportStructure: 'none',
      cropCategory: 'leafy',
    },
  },
];

export function getCropConfig(name: string): CropConfig | undefined {
  return CROP_CONFIG.find(c => c.name === name);
}

export type SeasonInfo = {
  status: SeasonStatus;
  bonusPct: number;
  label: string;
  emoji: string;
  color: string;
};

// Purely informational — does not affect real growth/verification mechanics.
export function getSeasonInfo(crop: CropConfig, month: number): SeasonInfo {
  if (crop.goodMonths.includes(month)) {
    return { status: 'in_season', bonusPct: crop.inSeasonBonusPct, label: 'In Season', emoji: '✅', color: '#16a34a' };
  }
  if (crop.okMonths.includes(month)) {
    return { status: 'acceptable', bonusPct: crop.acceptableBonusPct, label: 'Acceptable', emoji: '⚠️', color: '#d97706' };
  }
  return { status: 'out_of_season', bonusPct: crop.outOfSeasonPenaltyPct, label: 'Out of Season', emoji: '❌', color: '#dc2626' };
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getPreferredSeasonLabel(crop: CropConfig): string {
  if (crop.goodMonths.length === 12) return 'Year-round';
  if (crop.goodMonths.length === 0) return 'Any time';
  // Compress consecutive months into ranges, e.g. "Oct \u2013 Feb"
  const sorted = [...crop.goodMonths].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    ranges.push(start === prev ? MONTH_NAMES[start] : `${MONTH_NAMES[start]} \u2013 ${MONTH_NAMES[prev]}`);
    start = cur;
    prev = cur;
  }
  return ranges.join(', ');
}

// Philippine climate flavor label for the currently selected month.
export function getCurrentSeasonName(month: number): string {
  // Wet season: roughly May (4) \u2013 Oct (9). Dry season: Nov (10) \u2013 Apr (3).
  return month >= 4 && month <= 9 ? 'Wet Season' : 'Dry Season';
}

export type SeasonRecommendation = {
  crop: CropConfig;
  info: SeasonInfo;
};

export function getSeasonRecommendations(month: number): {
  recommended: SeasonRecommendation[];
  lessIdeal: SeasonRecommendation[];
  avoid: SeasonRecommendation[];
} {
  const recommended: SeasonRecommendation[] = [];
  const lessIdeal: SeasonRecommendation[] = [];
  const avoid: SeasonRecommendation[] = [];
  for (const crop of CROP_CONFIG) {
    const info = getSeasonInfo(crop, month);
    if (info.status === 'in_season') recommended.push({ crop, info });
    else if (info.status === 'acceptable') lessIdeal.push({ crop, info });
    else avoid.push({ crop, info });
  }
  recommended.sort((a, b) => b.info.bonusPct - a.info.bonusPct);
  return { recommended, lessIdeal, avoid };
}

export function waterColor(level: WaterRequirement): string {
  return { Low: '#65a30d', Medium: '#0891b2', High: '#2563eb' }[level];
}

export function pestColor(level: PestResistance): string {
  return { Low: '#dc2626', Medium: '#d97706', High: '#16a34a' }[level];
}

export function difficultyColor(level: CropDifficulty): string {
  return { Beginner: '#16a34a', Easy: '#65a30d', Moderate: '#d97706', Hard: '#dc2626' }[level];
}