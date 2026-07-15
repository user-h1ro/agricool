import { motion } from 'framer-motion';
import { CropStatus } from '../types';
import {
  getCropConfig, CropVisual, LeafShape, FruitShape,
} from '@/pages/GamifiedDashboard/cropConfig';
import {
  GROWTH_TRANSITION_DURATION, WATER_BOUNCE_DURATION, WATER_BRIGHTEN_DURATION,
  PEST_REMOVE_DURATION, HARVEST_EXIT_DURATION, EASE_POP, EASE_OUT,
} from './interactionAnimations';

// ─────────────────────────────────────────────────────────────────────────
// Phase 2 — data-driven crop rendering. Every crop's silhouette, color,
// support structure and idle animation comes from cropConfig.ts's `visual`
// block instead of a hardcoded per-emoji case, so a crop is genuinely
// recognizable at a glance and adding a new crop only means adding data,
// not new render code. Growth/harvest/pest/timer/reward logic is untouched
// — this file only ever reads `status`/`hp`/emoji-equivalent name, never
// writes anything.
// ─────────────────────────────────────────────────────────────────────────

function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// 5 growth stages, driven off the plot's status. There's no stored numeric
// stage in the data model, so "growing"/"healthy" are each split into two
// visually distinct sub-stages via a deterministic per-plot hash — this
// keeps a bed of "growing" crops from looking like identical clones while
// never migrating the DB schema. UNCHANGED from Phase 1 — the Crop
// Tracking Dashboard reuses this exact function (see dashboardHelpers.ts),
// so its math must stay stable.
export function getGrowthStage(status: CropStatus, seed: number): number {
  const h = hash(seed * 7 + 3);
  if (status === 'harvest_ready') return 4;
  if (status === 'healthy') return h < 0.5 ? 2 : 3;
  return h < 0.5 ? 0 : 1; // growing / wilted share the same size timeline
}

// UNCHANGED from Phase 1 — also reused by dashboardHelpers.ts.
export const STAGE_FRAC = [0.42, 0.6, 0.75, 0.9, 1.0];

// ── Fallback visual for any crop without a cropConfig entry yet (keeps
// future crops from crashing/rendering blank — Future Compatibility). ────
const FALLBACK_VISUAL: CropVisual = {
  primaryColor: '#5a9e52',
  secondaryColor: '#356b30',
  accentColor: '#7fbf6a',
  matureHeight: 20,
  matureWidth: 24,
  growthStyle: 'bush',
  leafShape: 'oval',
  fruitShape: 'none',
  animationType: 'sway',
  supportStructure: 'none',
  cropCategory: 'leafy',
};

function resolveVisual(cropName: string): CropVisual {
  return getCropConfig(cropName)?.visual ?? FALLBACK_VISUAL;
}

// ── Per-stage detail curves (0=seed, 1=sprout, 2=young, 3=mature, 4=harvest-ready) ──
// These drive height/width/leaf-count/saturation/fruit independently of
// STAGE_FRAC above (which only feeds the dashboard's coarse progress %).
const STAGE_HEIGHT = [0.10, 0.30, 0.55, 0.85, 1.05];
const STAGE_WIDTH = [0.15, 0.35, 0.60, 0.90, 1.10];
const STAGE_LEAVES = [0, 2, 4, 6, 8];
const STAGE_SAT = [0.5, 0.68, 0.84, 1, 1]; // 1 = full mature color, lower = paler/younger
const STAGE_FRUIT = [0, 0, 0, 0.6, 1]; // fruit only appears from "mature" onward

// Reference max matureWidth across CROP_CONFIG (upo = 40) — used to scale
// every crop's authored px units against the actual tile size so a wide
// crop (upo, kangkong) visibly fills more of the plot than a narrow
// climbing vine, while staying proportionally consistent crop-to-crop.
const REFERENCE_MAX_WIDTH = 40;

// ── Color helpers (young growth reads paler/less saturated) ─────────────
function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function lighten(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
}
function colorAt(hex: string, stageIdx: number) {
  return lighten(hex, (1 - STAGE_SAT[stageIdx]) * 0.55);
}

function fanAngle(i: number, count: number, spread: number, seed: number) {
  const t = count <= 1 ? 0.5 : i / (count - 1);
  const jitter = (hash(seed * 53 + i) - 0.5) * 14;
  return -90 + (t - 0.5) * spread + jitter;
}

// ── Leaf primitives ──────────────────────────────────────────────────────
function leafBlade(x1: number, y1: number, x2: number, y2: number, width: number, color: string, key: React.Key) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 0.001;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return <ellipse key={key} cx={mx} cy={my} rx={len / 2} ry={width / 2} fill={color} transform={`rotate(${angle} ${mx} ${my})`} />;
}
function leafOval(cx: number, cy: number, len: number, width: number, angleDeg: number, color: string, key: React.Key) {
  const rad = (angleDeg * Math.PI) / 180;
  const ex = cx + Math.cos(rad) * len * 0.5;
  const ey = cy + Math.sin(rad) * len * 0.5;
  return (
    <ellipse key={key} cx={ex} cy={ey} rx={len / 2} ry={width / 2} fill={color}
      stroke="rgba(0,0,0,0.12)" strokeWidth={0.4} transform={`rotate(${angleDeg} ${ex} ${ey})`} />
  );
}
function leafHeart(cx: number, cy: number, size: number, angleDeg: number, color: string, key: React.Key) {
  const r = size * 0.32;
  const d = `M0,${size * 0.15} C${-size * 0.55},${-size * 0.35} ${-r * 1.6},${-size * 0.62} 0,${-size * 0.18}
             C${r * 1.6},${-size * 0.62} ${size * 0.55},${-size * 0.35} 0,${size * 0.15} Z`;
  return <path key={key} d={d} fill={color} stroke="rgba(0,0,0,0.12)" strokeWidth={0.4} transform={`translate(${cx} ${cy}) rotate(${angleDeg})`} />;
}
function leafBroad(cx: number, cy: number, len: number, width: number, angleDeg: number, color: string, veinColor: string, key: React.Key) {
  const rad = (angleDeg * Math.PI) / 180;
  const ex = cx + Math.cos(rad) * len * 0.5;
  const ey = cy + Math.sin(rad) * len * 0.5;
  return (
    <g key={key} transform={`rotate(${angleDeg} ${ex} ${ey})`}>
      <ellipse cx={ex} cy={ey} rx={len / 2} ry={width / 2} fill={color} stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
      <line x1={cx} y1={cy} x2={ex + len * 0.32} y2={ey} stroke={veinColor} strokeWidth={0.6} opacity={0.5} />
    </g>
  );
}
function leafFrond(cx: number, cy: number, len: number, width: number, angleDeg: number, color: string, key: React.Key) {
  const rad = (angleDeg * Math.PI) / 180;
  const ex = cx + Math.cos(rad) * len;
  const ey = cy + Math.sin(rad) * len;
  const mx = (cx + ex) / 2, my = (cy + ey) / 2;
  return (
    <g key={key}>
      {leafBlade(cx, cy, ex, ey, width, color, `${key}-b`)}
      <circle cx={mx + Math.sin(rad) * width * 0.4} cy={my - Math.cos(rad) * width * 0.4} r={width * 0.2} fill={color} opacity={0.85} />
      <circle cx={mx - Math.sin(rad) * width * 0.4} cy={my + Math.cos(rad) * width * 0.4} r={width * 0.16} fill={color} opacity={0.7} />
    </g>
  );
}
function drawLeaf(shape: LeafShape, cx: number, cy: number, len: number, width: number, angleDeg: number, color: string, veinColor: string, key: React.Key) {
  switch (shape) {
    case 'blade': {
      const rad = (angleDeg * Math.PI) / 180;
      return leafBlade(cx, cy, cx + Math.cos(rad) * len, cy + Math.sin(rad) * len, width, color, key);
    }
    case 'heart': return leafHeart(cx, cy, len, angleDeg, color, key);
    case 'broad': return leafBroad(cx, cy, len, width, angleDeg, color, veinColor, key);
    case 'frond': return leafFrond(cx, cy, len, width, angleDeg, color, key);
    case 'oval':
    default:
      return leafOval(cx, cy, len, width, angleDeg, color, key);
  }
}

// ── Fruit primitives ─────────────────────────────────────────────────────
function fruitDot(x: number, y: number, r: number, color: string, key: React.Key) {
  return (
    <g key={key}>
      <circle cx={x} cy={y} r={r} fill={color} stroke="rgba(0,0,0,0.18)" strokeWidth={0.5} />
      <ellipse cx={x - r * 0.32} cy={y - r * 0.32} rx={r * 0.32} ry={r * 0.2} fill="rgba(255,255,255,0.4)" />
    </g>
  );
}
function hangingFruit(x: number, y: number, w: number, h: number, color: string, key: React.Key) {
  const d = `M${x},${y - h} C${x + w * 0.55},${y - h * 0.5} ${x + w * 0.5},${y + h * 0.15} ${x},${y + h * 0.32}
             C${x - w * 0.5},${y + h * 0.15} ${x - w * 0.55},${y - h * 0.5} ${x},${y - h} Z`;
  return <path key={key} d={d} fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />;
}
function fruitBumpy(x: number, y: number, w: number, h: number, color: string, darkColor: string, key: React.Key) {
  return (
    <g key={key}>
      <ellipse cx={x} cy={y} rx={w * 0.42} ry={h * 0.55} fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
      {[-0.3, 0, 0.3].map((o, i) => (
        <circle key={`b${i}`} cx={x + o * w * 0.6} cy={y - h * 0.15 + Math.abs(o) * h * 0.15} r={w * 0.13} fill={darkColor} opacity={0.45} />
      ))}
    </g>
  );
}
function fruitRidged(x: number, y: number, w: number, h: number, color: string, darkColor: string, key: React.Key) {
  return (
    <g key={key}>
      <rect x={x - w * 0.26} y={y - h * 0.5} width={w * 0.52} height={h} rx={w * 0.26} fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
      {[-0.14, 0, 0.14].map((o, i) => (
        <line key={i} x1={x + o * w} y1={y - h * 0.42} x2={x + o * w} y2={y + h * 0.42} stroke={darkColor} strokeWidth={0.5} opacity={0.5} />
      ))}
    </g>
  );
}
function fruitLongPod(x: number, y: number, w: number, h: number, color: string, key: React.Key) {
  return (
    <rect key={key} x={x - w * 0.16} y={y} width={w * 0.32} height={h} rx={w * 0.16} fill={color}
      stroke="rgba(0,0,0,0.15)" strokeWidth={0.4} transform={`rotate(4 ${x} ${y})`} />
  );
}
function fruitBottle(x: number, y: number, w: number, h: number, color: string, key: React.Key) {
  return (
    <g key={key}>
      <ellipse cx={x} cy={y + h * 0.15} rx={w * 0.5} ry={h * 0.4} fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
      <ellipse cx={x} cy={y - h * 0.32} rx={w * 0.28} ry={h * 0.22} fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
    </g>
  );
}
function drawFruit(shape: FruitShape, x: number, y: number, w: number, h: number, color: string, darkColor: string, key: React.Key): JSX.Element | null {
  switch (shape) {
    case 'round': return fruitDot(x, y, w * 0.4, color, key);
    case 'oval': return hangingFruit(x, y, w * 0.6, h, color, key);
    case 'bumpy': return fruitBumpy(x, y, w, h, color, darkColor, key);
    case 'ridged': return fruitRidged(x, y, w, h, color, darkColor, key);
    case 'long_pod': return fruitLongPod(x, y, w, h, color, key);
    case 'bottle': return fruitBottle(x, y, w, h, color, key);
    case 'none':
    default:
      return null;
  }
}

function seedNode(gx: number, gy: number): JSX.Element {
  return (
    <g key="seed">
      <ellipse cx={gx} cy={gy} rx={4.5} ry={2.4} fill="rgba(60,40,20,0.4)" />
      <ellipse cx={gx} cy={gy - 1.4} rx={1.6} ry={2.2} fill="#8fd66a" />
    </g>
  );
}

type RenderResult = {
  support: JSX.Element[];
  foliage: JSX.Element[];
  fruit: JSX.Element[];
  bands: JSX.Element[][] | null; // set only by the 'mat' family, for the ripple animation
};
const EMPTY_RESULT: Omit<RenderResult, 'foliage'> = { support: [], fruit: [], bands: null };

// ── Family renderers — one per cropConfig.growthStyle ────────────────────
function renderRosette(gx: number, gy: number, v: CropVisual, stage: number, seed: number, isWilted: boolean, scale: number): RenderResult {
  if (stage === 0) return { foliage: [seedNode(gx, gy)], ...EMPTY_RESULT };
  const w = v.matureWidth * STAGE_WIDTH[stage] * scale;
  const h = v.matureHeight * STAGE_HEIGHT[stage] * scale;
  const leafCount = 3 + STAGE_LEAVES[stage];
  const color = isWilted ? '#8a7a4a' : colorAt(v.primaryColor, stage);
  const dark = isWilted ? '#6b5a3a' : v.secondaryColor;
  const foliage: JSX.Element[] = [];
  for (let i = 0; i < leafCount; i++) {
    const a = fanAngle(i, leafCount, 250, seed);
    const len = w * 0.5 * (0.75 + hash(seed * 5 + i) * 0.3);
    const lw = h * 0.9 * (0.5 + hash(seed * 7 + i) * 0.3);
    foliage.push(drawLeaf(v.leafShape, gx, gy, len, lw, a, i % 2 ? color : dark, dark, `r${i}`));
  }
  return { foliage, ...EMPTY_RESULT };
}

function renderMat(gx: number, gy: number, v: CropVisual, stage: number, seed: number, isWilted: boolean, scale: number): RenderResult {
  if (stage === 0) return { foliage: [seedNode(gx, gy)], ...EMPTY_RESULT };
  const w = v.matureWidth * STAGE_WIDTH[stage] * scale;
  const h = v.matureHeight * STAGE_HEIGHT[stage] * scale;
  const perBand = 3 + Math.floor(STAGE_LEAVES[stage] / 2);
  const bandCount = 3;
  const color = isWilted ? '#8a7a4a' : colorAt(v.primaryColor, stage);
  const dark = isWilted ? '#6b5a3a' : v.secondaryColor;
  const bands: JSX.Element[][] = [];
  for (let b = 0; b < bandCount; b++) {
    const bandNodes: JSX.Element[] = [];
    const bx = gx + (b - (bandCount - 1) / 2) * (w / bandCount);
    for (let i = 0; i < perBand; i++) {
      const jx = bx + (hash(seed * 11 + b * 7 + i) - 0.5) * (w / bandCount);
      const jy = gy - hash(seed * 13 + b * 7 + i) * h * 0.2;
      const len = h * (0.7 + hash(seed * 17 + b * 7 + i) * 0.5);
      const a = -90 + (hash(seed * 19 + b * 7 + i) - 0.5) * 70;
      bandNodes.push(drawLeaf(v.leafShape, jx, jy, len, len * 0.28, a, i % 3 === 0 ? dark : color, dark, `m${b}-${i}`));
    }
    bands.push(bandNodes);
  }
  return { foliage: [], support: [], fruit: [], bands };
}

function renderBush(gx: number, gy: number, v: CropVisual, stage: number, seed: number, isWilted: boolean, scale: number): RenderResult {
  if (stage === 0) return { foliage: [seedNode(gx, gy)], ...EMPTY_RESULT };
  const w = v.matureWidth * STAGE_WIDTH[stage] * scale;
  const h = v.matureHeight * STAGE_HEIGHT[stage] * scale;
  const leafCount = 4 + STAGE_LEAVES[stage];
  const color = isWilted ? '#8a7a4a' : colorAt(v.primaryColor, stage);
  const dark = isWilted ? '#6b5a3a' : v.secondaryColor;
  const foliage: JSX.Element[] = [];
  for (let i = 0; i < leafCount; i++) {
    const a = fanAngle(i, leafCount, 210, seed);
    const len = w * 0.5 * (0.7 + hash(seed * 23 + i) * 0.4);
    const lw = h * 0.55 * (0.55 + hash(seed * 29 + i) * 0.3);
    foliage.push(drawLeaf(v.leafShape, gx, gy - h * 0.08, len, lw, a, i % 2 ? color : dark, dark, `bu${i}`));
  }
  const fruit: JSX.Element[] = [];
  const fruitFrac = STAGE_FRUIT[stage];
  if (fruitFrac > 0 && v.fruitShape !== 'none') {
    const fruitCount = stage >= 4 ? 3 : 2;
    for (let i = 0; i < fruitCount; i++) {
      const fx = gx + (i - (fruitCount - 1) / 2) * w * 0.34;
      const fy = gy - h * (0.4 + hash(seed * 31 + i) * 0.22);
      const fw = w * 0.34 * fruitFrac, fh = h * 0.34 * fruitFrac;
      const node = drawFruit(v.fruitShape, fx, fy, fw, fh, v.accentColor, dark, `bf${i}`);
      if (node) fruit.push(node);
    }
  }
  return { foliage, support: [], fruit, bands: null };
}

function renderClimbingVine(gx: number, gy: number, v: CropVisual, stage: number, seed: number, isWilted: boolean, scale: number): RenderResult {
  if (stage === 0) return { foliage: [seedNode(gx, gy)], ...EMPTY_RESULT };
  const w = v.matureWidth * STAGE_WIDTH[stage] * scale;
  const h = v.matureHeight * STAGE_HEIGHT[stage] * scale;
  const color = isWilted ? '#8a7a4a' : colorAt(v.primaryColor, stage);
  const dark = isWilted ? '#6b5a3a' : v.secondaryColor;
  const supportColor = '#8a6b45';
  const support: JSX.Element[] = [];
  if (v.supportStructure === 'stake') {
    support.push(<line key="stake" x1={gx} y1={gy} x2={gx} y2={gy - h * 1.05} stroke={supportColor} strokeWidth={2} strokeLinecap="round" />);
  } else if (v.supportStructure === 'trellis') {
    support.push(<line key="p1" x1={gx - w * 0.35} y1={gy} x2={gx - w * 0.35} y2={gy - h * 1.05} stroke={supportColor} strokeWidth={2} strokeLinecap="round" />);
    support.push(<line key="p2" x1={gx + w * 0.35} y1={gy} x2={gx + w * 0.35} y2={gy - h * 1.05} stroke={supportColor} strokeWidth={2} strokeLinecap="round" />);
    [0.3, 0.6, 0.9].forEach((f, i) => support.push(
      <line key={`x${i}`} x1={gx - w * 0.35} y1={gy - h * 1.05 * f} x2={gx + w * 0.35} y2={gy - h * 1.05 * f} stroke={supportColor} strokeWidth={1.3} opacity={0.8} />,
    ));
  }
  const stemPath = `M${gx},${gy} C${gx - w * 0.2},${gy - h * 0.4} ${gx + w * 0.2},${gy - h * 0.7} ${gx},${gy - h}`;
  const foliage: JSX.Element[] = [<path key="stem" d={stemPath} stroke={dark} strokeWidth={1.6} fill="none" />];
  const leafCount = 3 + STAGE_LEAVES[stage];
  for (let i = 0; i < leafCount; i++) {
    const t = (i + 1) / (leafCount + 1);
    const lx = gx + Math.sin(t * Math.PI * 2 + seed) * w * 0.22;
    const ly = gy - h * t;
    const side = i % 2 === 0 ? 1 : -1;
    const a = side > 0 ? -30 - t * 20 : 210 + t * 20;
    const len = w * 0.45 * (0.7 + hash(seed * 37 + i) * 0.3);
    foliage.push(drawLeaf(v.leafShape, lx, ly, len, len * 0.42, a, i % 2 ? color : dark, dark, `cv${i}`));
  }
  const fruit: JSX.Element[] = [];
  const fruitFrac = STAGE_FRUIT[stage];
  if (fruitFrac > 0 && v.fruitShape !== 'none') {
    const fruitCount = stage >= 4 ? 3 : 1;
    for (let i = 0; i < fruitCount; i++) {
      const t = 0.35 + i * 0.22;
      const fx = gx + Math.sin(t * Math.PI * 2 + seed) * w * 0.18;
      const fyTop = gy - h * t;
      const fw = w * 0.5 * fruitFrac, fh = h * 0.32 * fruitFrac;
      const node = drawFruit(v.fruitShape, fx, fyTop, fw, fh, v.accentColor, dark, `cvf${i}`);
      if (node) fruit.push(node);
    }
  }
  return { support, foliage, fruit, bands: null };
}

function renderSprawlingVine(gx: number, gy: number, v: CropVisual, stage: number, seed: number, isWilted: boolean, scale: number): RenderResult {
  if (stage === 0) return { foliage: [seedNode(gx, gy)], ...EMPTY_RESULT };
  const w = v.matureWidth * STAGE_WIDTH[stage] * scale;
  const h = v.matureHeight * STAGE_HEIGHT[stage] * scale;
  const color = isWilted ? '#8a7a4a' : colorAt(v.primaryColor, stage);
  const dark = isWilted ? '#6b5a3a' : v.secondaryColor;
  const clusterCount = 2 + Math.floor(STAGE_LEAVES[stage] / 2);
  const foliage: JSX.Element[] = [
    <path key="vs" d={`M${gx - w * 0.48},${gy} Q${gx},${gy - h * 0.5} ${gx + w * 0.48},${gy}`} stroke={dark} strokeWidth={1.3} fill="none" opacity={0.7} />,
  ];
  for (let i = 0; i < clusterCount; i++) {
    const t = clusterCount <= 1 ? 0.5 : i / (clusterCount - 1);
    const lx = gx + (t - 0.5) * w * 0.92;
    const ly = gy - Math.sin(t * Math.PI) * h * 0.4;
    const a = -90 + (hash(seed * 41 + i) - 0.5) * 90;
    const len = w * 0.32 * (0.7 + hash(seed * 43 + i) * 0.4);
    foliage.push(drawLeaf(v.leafShape, lx, ly, len, len * 0.62, a, i % 2 ? color : dark, dark, `sv${i}`));
  }
  const fruit: JSX.Element[] = [];
  const fruitFrac = STAGE_FRUIT[stage];
  if (fruitFrac > 0 && v.fruitShape !== 'none') {
    const fx = gx + w * 0.28;
    const fy = gy - h * 0.1;
    const node = drawFruit(v.fruitShape, fx, fy, w * 0.5 * fruitFrac, h * 1.6 * fruitFrac, v.accentColor, dark, 'svf');
    if (node) fruit.push(node);
  }
  return { foliage, support: [], fruit, bands: null };
}

// ─────────────────────────────────────────────────────────────────────────
export function CropPlant({
  cropName, tx, ty, halfW, halfH, stage, seed, isWilted, hasPest, isHarvestReady,
  justWatered, pestJustRemoved, onWaterFxDone, onPestRemoveFxDone,
}: {
  cropName: string; tx: number; ty: number; halfW: number; halfH: number;
  stage: number; seed: number; isWilted: boolean; hasPest: boolean; isHarvestReady: boolean;
  /** True for one render right after a water action — plays a bounce +
   * brighten pulse, then calls onWaterFxDone so the caller can clear the flag. */
  justWatered?: boolean;
  /** True while the just-removed pest's exit animation is still playing. */
  pestJustRemoved?: boolean;
  onWaterFxDone?: () => void;
  onPestRemoveFxDone?: () => void;
}) {
  const visual = resolveVisual(cropName);
  const scale = Math.min(2.3, (halfW * 1.85) / REFERENCE_MAX_WIDTH);
  const gx = tx;
  const gy = ty + halfH * 0.34;

  let result: RenderResult;
  switch (visual.growthStyle) {
    case 'rosette': result = renderRosette(gx, gy, visual, stage, seed, isWilted, scale); break;
    case 'mat': result = renderMat(gx, gy, visual, stage, seed, isWilted, scale); break;
    case 'climbing_vine': result = renderClimbingVine(gx, gy, visual, stage, seed, isWilted, scale); break;
    case 'sprawling_vine': result = renderSprawlingVine(gx, gy, visual, stage, seed, isWilted, scale); break;
    case 'bush':
    default:
      result = renderBush(gx, gy, visual, stage, seed, isWilted, scale); break;
  }
  const { support, foliage, fruit, bands } = result;

  return (
    <motion.g
      style={{ transformOrigin: `${tx}px ${ty + halfH * 0.4}px` }}
      animate={
        justWatered
          ? { scale: [1, 1.1, 0.97, 1] }
          : hasPest
          ? { x: [0, -1.4, 0, 1.4, 0] }
          : isHarvestReady
          ? { y: [0, -2.4, 0] }
          : { rotate: [-1.6, 1.6, -1.6] }
      }
      transition={
        justWatered
          ? { duration: WATER_BOUNCE_DURATION, ease: EASE_POP }
          : hasPest
          ? { duration: 0.4, repeat: Infinity }
          : isHarvestReady
          ? { duration: 1.2, repeat: Infinity, ease: 'easeOut' }
          : { duration: 3.4 + (seed % 5) * 0.3, repeat: Infinity, ease: 'easeInOut' }
      }
      onAnimationComplete={justWatered ? onWaterFxDone : undefined}
      exit={{
        scale: [1, 0.85, 1.12, 0.3],
        y: [0, 2, -16, -30],
        opacity: [1, 1, 1, 0],
        transition: { duration: HARVEST_EXIT_DURATION, times: [0, 0.3, 0.6, 1], ease: EASE_OUT },
      }}
    >
      <g
        style={{
          filter: isHarvestReady
            ? 'drop-shadow(0 0 5px rgba(250,204,21,0.75)) drop-shadow(0 2px 3px rgba(0,0,0,0.25))'
            : isWilted
            ? 'grayscale(45%) brightness(0.75) sepia(15%)'
            : 'drop-shadow(0 2px 3px rgba(0,0,0,0.22))',
        }}
      >
        {support}

        {/* Growth-stage transition: keyed on `stage`, so advancing a stage
            remounts this wrapper and plays a pop-in (scale + fade) instead
            of the foliage/fruit geometry just snapping to its new shape.
            The growth clock itself (when `stage` changes) is untouched —
            this only softens how the change is *shown*. */}
        <motion.g
          key={`foliage-${stage}`}
          initial={{ scale: 0.86, opacity: 0.55 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: GROWTH_TRANSITION_DURATION, ease: EASE_POP }}
        >
          {bands ? (
            bands.map((bandNodes, bi) => (
              <motion.g
                key={`band${bi}`}
                style={{ transformOrigin: `${gx}px ${gy}px` }}
                animate={{ rotate: [-2, 2, -2] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: bi * 0.35 }}
              >
                {bandNodes}
              </motion.g>
            ))
          ) : (
            <>{foliage}</>
          )}
        </motion.g>

        {fruit.length > 0 && (
          <motion.g
            key={`fruit-${stage}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: GROWTH_TRANSITION_DURATION, delay: 0.08, ease: EASE_POP }}
          >
            {visual.animationType === 'swing' && (
              <motion.g
                style={{ transformOrigin: `${gx}px ${gy - halfH}px` }}
                animate={{ rotate: [-4, 4, -4] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                {fruit}
              </motion.g>
            )}
            {visual.animationType === 'bob' && (
              <motion.g animate={{ y: [0, -1.6, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
                {fruit}
              </motion.g>
            )}
            {visual.animationType !== 'swing' && visual.animationType !== 'bob' && (
              <>{fruit}</>
            )}
          </motion.g>
        )}

        {/* Watering feedback — a soft brightening wash over the foliage for
            about a second, on top of the bounce above. Opacity-only (no
            filter-string interpolation), so it's cheap and reliable. */}
        {justWatered && (
          <motion.ellipse
            cx={gx} cy={gy - halfH * 0.5} rx={halfW * 0.9} ry={halfH * 0.9}
            fill="#eaffcf"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ duration: WATER_BRIGHTEN_DURATION, ease: 'easeOut' }}
            style={{ mixBlendMode: 'soft-light' }}
          />
        )}

        {/* Falling droplets + a small splash where each lands. */}
        {justWatered && [0, 1, 2].map(i => (
          <motion.text
            key={i} x={gx + (i - 1) * 7} fontSize={9} textAnchor="middle" style={{ userSelect: 'none' }}
            initial={{ y: gy - halfH * 1.8, opacity: 1 }}
            animate={{ y: gy - halfH * (0.5 - i * 0.05), opacity: [1, 1, 0] }}
            transition={{ duration: WATER_BOUNCE_DURATION * 0.85, delay: i * 0.07, ease: EASE_OUT }}
          >
            💧
          </motion.text>
        ))}
        {justWatered && [0, 1, 2].map(i => (
          <motion.ellipse
            key={`splash${i}`} cx={gx + (i - 1) * 7} cy={gy - halfH * (0.5 - i * 0.05)} fill="none" stroke="#7dd3fc" strokeWidth={1}
            initial={{ rx: 0, ry: 0, opacity: 0.8 }}
            animate={{ rx: 5, ry: 2, opacity: 0 }}
            transition={{ duration: 0.3, delay: WATER_BOUNCE_DURATION * 0.85 * 0.9 + i * 0.07, ease: EASE_OUT }}
          />
        ))}

        {/* Pest damage — bite notch + a bug, only while a pest is active */}
        {hasPest && (
          <g>
            <circle cx={gx - 6} cy={gy - halfH * 0.6} r={1.6} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={0.6} strokeDasharray="1,1" />
            <circle cx={gx + 5} cy={gy - halfH * 0.9} r={1.2} fill="#5a6b2e" />
          </g>
        )}

        {/* Pest-removal feedback — the bug shakes in place first, THEN
            puffs into smoke and flies off; leaves get a brief greening wash
            afterward. Staggered via keyframe `times`, not one blended
            motion. One-shot, cleared by the caller via onAnimationComplete. */}
        {pestJustRemoved && (
          <motion.g
            initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
            animate={{
              opacity: [1, 1, 1, 0],
              x: [0, -3, 3, -3, 3, 10],
              y: [0, 0, 0, 0, 0, -16],
              scale: [1, 1, 1, 1, 1, 0.4],
              rotate: [0, 0, 0, 0, 0, 40],
            }}
            transition={{ duration: PEST_REMOVE_DURATION, times: [0, 0.1, 0.2, 0.3, 0.4, 1], ease: EASE_OUT }}
            onAnimationComplete={onPestRemoveFxDone}
          >
            <circle cx={gx + 5} cy={gy - halfH * 0.7} r={2.2} fill="#5a6b2e" />
            {[0, 1, 2].map(i => (
              <motion.circle
                key={i} cx={gx + 5} cy={gy - halfH * 0.7} r={1.5} fill="rgba(200,200,200,0.5)"
                initial={{ scale: 0.4, opacity: 0.7, x: 0, y: 0 }}
                animate={{ scale: 1.8 + i * 0.4, opacity: 0, x: (i - 1) * 6, y: -6 - i * 3 }}
                transition={{ duration: PEST_REMOVE_DURATION * 0.6, delay: PEST_REMOVE_DURATION * 0.4 + i * 0.06 }}
              />
            ))}
          </motion.g>
        )}
        {pestJustRemoved && (
          <motion.ellipse
            cx={gx} cy={gy - halfH * 0.5} rx={halfW * 0.9} ry={halfH * 0.9} fill="#c9f2b0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.35, 0] }}
            transition={{ duration: PEST_REMOVE_DURATION * 1.3, ease: 'easeOut' }}
            style={{ mixBlendMode: 'soft-light' }}
          />
        )}
      </g>
    </motion.g>
  );
}