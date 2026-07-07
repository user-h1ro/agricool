import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GardenLayout, PestEvent, ToolId, TrackedCrop } from '../types';
import { COLS, ROWS } from '../constants';
import { ISO_TILE_W, ISO_TILE_H, isoProject, plotColIdx, getTodaysWeather } from '../helpers';
import { CropPlant, getCropKind, getGrowthStage } from './CropPlant';
import {
  Tree, Shed, FenceSection, Scarecrow, FlowerBed, TransientButterflies,
  LogPile, Barrel, RockCluster, Shrub, Windmill, Barn,
  CompostBin, Crate, ToolRack, IrrigationChannel,
} from './SceneDressing';

// ── Scene canvas ────────────────────────────────────────────────────────────
// One continuous farm, not four floating patches: a single soil bed carries
// all 25 plots, one hero landmark anchors the top of the property, and one
// path system threads pond, shed, compost, farmhouse and windmill into that
// same ground. Every number below is *solved* from a small set of goals (the
// bed's share of the canvas, the landmark's height, how much clearance the
// yard needs) instead of hand-placed, so the layout stays consistent if any
// of those goals change later.
const CANVAS_W = 800;
const HALF_W = ISO_TILE_W / 2;
const HALF_H = ISO_TILE_H / 2;

// Deterministic pseudo-random so the "natural" irregularity never jitters
// between renders — the same tile always gets the same imperfection.
function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Smooth closed blob through a ring of points (midpoint-quadratic technique),
// used for every organic terrain edge in the scene instead of straight lines.
function blobPath(points: [number, number][]) {
  const n = points.length;
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = '';
  const start = mid(points[n - 1], points[0]);
  d += `M${start[0]},${start[1]} `;
  for (let i = 0; i < n; i++) {
    const cur = points[i];
    const next = points[(i + 1) % n];
    const m = mid(cur, next);
    d += `Q${cur[0]},${cur[1]} ${m[0]},${m[1]} `;
  }
  return d + 'Z';
}

// Diamond with softly rounded corners — used for each plot's top face so the
// grid reads as a cluster of little worked beds, not a checkerboard.
function roundedDiamond(cx: number, cy: number, hw: number, hh: number, f = 0.24) {
  const T: [number, number] = [cx, cy - hh];
  const R: [number, number] = [cx + hw, cy];
  const B: [number, number] = [cx, cy + hh];
  const L: [number, number] = [cx - hw, cy];
  const pts = [T, R, B, L];
  let d = '';
  for (let i = 0; i < 4; i++) {
    const cur = pts[i];
    const next = pts[(i + 1) % 4];
    const prev = pts[(i + 3) % 4];
    const p1: [number, number] = [cur[0] + (next[0] - cur[0]) * f, cur[1] + (next[1] - cur[1]) * f];
    const p0: [number, number] = [cur[0] + (prev[0] - cur[0]) * f, cur[1] + (prev[1] - cur[1]) * f];
    if (i === 0) d += `M${p0[0]},${p0[1]} `;
    d += `Q${cur[0]},${cur[1]} ${p1[0]},${p1[1]} `;
  }
  return d + 'Z';
}

// ─── One unified bed, measured before it's placed ──────────────────────────
// The bed's 8-point ring — 4 true iso corners plus 4 bulging edge midpoints,
// hand-tuned so it reads as a rounded, organic clearing rather than a
// rotated rectangle — built here in its own native frame with no placement
// baked in, so its true width/height can be measured before deciding where
// it goes on the canvas.
const OUTER_PAD = 34;
const OUTER_BULGE: [number, number][] = [
  [4, -8], [18, 5], [10, 5], [8, 16], [-4, 10], [-16, -3], [-9, -5], [-6, -13],
];

// Four quadrant beds, split cleanly at col1.5 / row1.5 — a pure visual
// grouping (not tied to plot data at all) so a player reads "four crop
// areas" at a glance. Each reuses the exact same organic-blob ring math as
// the outer silhouette, just scoped to its own col/row sub-range and with a
// smaller pad/bulge, and each gets a subtly different soil tone.
const QUAD_BULGE: [number, number][] = OUTER_BULGE.map(([bx, by]) => [bx * 0.4, by * 0.4]);
const QUADRANTS: { colMin: number; colMax: number; rowMin: number; rowMax: number; gradId: string }[] = [
  { colMin: 0, colMax: 1, rowMin: 0, rowMax: 1, gradId: 'soilQuad0' },
  { colMin: 2, colMax: 4, rowMin: 0, rowMax: 1, gradId: 'soilQuad1' },
  { colMin: 0, colMax: 1, rowMin: 2, rowMax: 4, gradId: 'soilQuad2' },
  { colMin: 2, colMax: 4, rowMin: 2, rowMax: 4, gradId: 'soilQuad3' },
];

function nativeRingForRange(colMin: number, colMax: number, rowMin: number, rowMax: number, pad: number, bulge: [number, number][]): [number, number][] {
  const top = isoProject(colMin, rowMin);
  const right = isoProject(colMax, rowMin);
  const bottom = isoProject(colMax, rowMax);
  const left = isoProject(colMin, rowMax);
  const T: [number, number] = [top.x, top.y - HALF_H - pad];
  const R: [number, number] = [right.x + HALF_W + pad, right.y];
  const B: [number, number] = [bottom.x, bottom.y + HALF_H + pad];
  const L: [number, number] = [left.x - HALF_W - pad, left.y];
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const pts: [number, number][] = [T, mid(T, R), R, mid(R, B), B, mid(B, L), L, mid(L, T)];
  return pts.map((p, i) => [p[0] + bulge[i][0], p[1] + bulge[i][1]]);
}

function bboxOf(pts: [number, number][]) {
  const xs = pts.map(p => p[0]);
  const ys = pts.map(p => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

// Ring point order throughout this file: [T, TR, R, RB, B, BL, L, LT].
const NATIVE_OUTER = nativeRingForRange(0, COLS - 1, 0, ROWS - 1, OUTER_PAD, OUTER_BULGE);
const NATIVE_BB = bboxOf(NATIVE_OUTER);
const NATIVE_W = NATIVE_BB.maxX - NATIVE_BB.minX;
const NATIVE_H = NATIVE_BB.maxY - NATIVE_BB.minY;
const NATIVE_CX = (NATIVE_BB.minX + NATIVE_BB.maxX) / 2;
const NATIVE_CY = (NATIVE_BB.minY + NATIVE_BB.maxY) / 2;

// The bed is the dominant subject of the scene, not a board floating in open
// lawn: it's sized to roughly 75% of the canvas width, and every other zone
// (landmark, yard) is budgeted around that one decision.
const FARM_SCALE = (CANVAS_W * 0.75) / NATIVE_W;
const BED_HEIGHT = NATIVE_H * FARM_SCALE;

// Vertical budget, solved top to bottom — farmhouse zone, then the bed, then
// the yard strip — instead of picking a canvas height and hoping the
// farmhouse doesn't collide with the field. The canvas is exactly as tall as
// those three zones actually need. The farmhouse is deliberately modest here
// (1.3x its native size) — enough to read as the hero landmark without
// competing with the crops for attention, and margins throughout are kept
// tight so the farm itself fills the frame instead of floating in lawn.
const TOP_MARGIN = 14;
const BARN_SCALE = 1.3; // the one enlarged hero landmark — everything else stays clearly secondary
const BARN = { x: CANVAS_W / 2, y: TOP_MARGIN + 40 * BARN_SCALE, scale: BARN_SCALE };
const GAP_HOUSE_TO_BED = 16;
const BED_TOP_Y = BARN.y + 68 * BARN_SCALE + GAP_HOUSE_TO_BED;
const YARD_ZONE_H = 118;
const BED_BOTTOM_Y = BED_TOP_Y + BED_HEIGHT;
const CANVAS_H = Math.round(BED_BOTTOM_Y + YARD_ZONE_H);

// FARM_CX/FARM_CY is the point the bed's own scale transform pivots around —
// chosen so the bed's true bounding-box center (not just its iso-grid
// center) lands exactly at the top of the vertical budget above.
const FARM_CX = CANVAS_W / 2;
const FARM_CY = BED_TOP_Y - (NATIVE_OUTER[0][1] - NATIVE_CY) * FARM_SCALE;
const OFFSET_X = FARM_CX - NATIVE_CX;
const OFFSET_Y = FARM_CY - NATIVE_CY;
const FARM_TRANSFORM = `translate(${FARM_CX} ${FARM_CY}) scale(${FARM_SCALE}) translate(${-FARM_CX} ${-FARM_CY})`;

// Absolute (post-transform) position of a native bed-ring point — used only
// to anchor the *external* path network onto wherever the bed actually ends
// up, so paths never drift out of sync with its real, solved geometry.
function absPt([x, y]: [number, number]): [number, number] {
  return [FARM_CX + (x - NATIVE_CX) * FARM_SCALE, FARM_CY + (y - NATIVE_CY) * FARM_SCALE];
}
const RIM = NATIVE_OUTER.map(absPt);
const [RIM_T, RIM_TR, RIM_R, RIM_RB, RIM_B, RIM_BL, RIM_L, RIM_LT] = RIM;

function lerp(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// ─── Static scene dressing ───────────────────────────────────────────────
// Everything is anchored off the farmhouse or the bed's own solved rim, so
// the whole property reads as one place — the house presiding over the
// field, the windmill clearly secondary beside it, pond/shed/compost tucked
// into one working yard below — instead of landmarks scattered on open lawn.

const GRASS_PATCHES = [
  { x: 110, y: 300, rx: 55, ry: 22, dark: true }, { x: 660, y: 250, rx: 70, ry: 26, dark: false },
  { x: 150, y: CANVAS_H - 172, rx: 60, ry: 24, dark: true }, { x: 630, y: CANVAS_H - 142, rx: 80, ry: 24, dark: false },
];

const CLOUD_SHADOWS = [
  { y: 210, rx: 55, ry: 15, dur: 42 },
  { y: 120, rx: 38, ry: 10, dur: 55 },
];

// Sun tucked into a back corner, well clear of the farmhouse — the one hero
// landmark still gets the first look, not a competing bright disc.
const SUN = { x: CANVAS_W - 94, y: 62 };

const FENCE = { x: BARN.x - 8, y: BARN.y + 78 };
const FLOWER_BED = { x: BARN.x - 112, y: BARN.y + 66 };

const TREE_CLUSTER: { x: number; y: number; scale: number }[] = [
  { x: BARN.x - 100, y: BARN.y + 6, scale: 0.7 },
  { x: BARN.x - 74, y: BARN.y - 14, scale: 0.52 },
];

// Windmill — secondary landmark, clearly smaller than the farmhouse and set
// beside and a little behind it, so there's one obvious place for the eye
// to land first.
const WINDMILL = { x: BARN.x + 205, y: BARN.y + 60, scale: 0.95 };

// One entrance hub below the field feeds everything in the yard: the pond
// to one side, the shed/compost cluster to the other — spread wide enough
// to use the same width the field does, instead of huddling in the middle
// with open lawn on both sides.
const YARD_HUB = { x: RIM_B[0], y: RIM_B[1] + 40 };
const POND = { x: YARD_HUB.x - 225, y: YARD_HUB.y + 28, rx: 54, ry: 29 };
const ROCK_CLUSTER = { x: POND.x - 44, y: POND.y + 24 };
const SHED = { x: YARD_HUB.x + 205, y: YARD_HUB.y - 8 };
const LOG_PILE = { x: SHED.x + 34, y: SHED.y + 30 };
const BARREL = { x: SHED.x - 28, y: SHED.y + 4 };
const TOOL_RACK = { x: SHED.x - 30, y: SHED.y - 4 };
const COMPOST = { x: YARD_HUB.x + 268, y: YARD_HUB.y + 38 };
const CRATE_1 = { x: YARD_HUB.x + 172, y: YARD_HUB.y + 40 };
const CRATE_2 = { x: YARD_HUB.x + 143, y: YARD_HUB.y + 52 };
const BOTTOM_FLOWERS = [
  { x: YARD_HUB.x - 75, y: YARD_HUB.y + 50 }, { x: YARD_HUB.x + 55, y: YARD_HUB.y + 56 },
];

// Local, pre-enlargement coordinates — the scarecrow sits inside the same
// FARM_TRANSFORM group as the bed, right where the dividing path actually
// crosses (col1.5/row1.5, tucked into the largest quadrant), so it scales
// and shifts with the bed and stands somewhere the path really is.
const CROSSROADS_LOCAL = (() => {
  const p = isoProject(1.5, 1.5);
  return { x: p.x + OFFSET_X, y: p.y + OFFSET_Y };
})();
const SCARECROW = { x: CROSSROADS_LOCAL.x + 52, y: CROSSROADS_LOCAL.y + 26 };

// One connected path skeleton instead of separate placements: the entrance
// hub below the field branches to the pond and to the shed/compost cluster,
// and climbs past the field's edge to the farmhouse, with a short spur
// breaking off to the windmill.
const MAIN_PATH_D = `M${YARD_HUB.x},${YARD_HUB.y + 8} L${YARD_HUB.x},${YARD_HUB.y - 4} Q${RIM_LT[0] + 10},${(YARD_HUB.y + RIM_LT[1]) / 2} ${RIM_LT[0]},${RIM_LT[1] + 6}`;
const TO_POND_D = `M${YARD_HUB.x - 14},${YARD_HUB.y + 10} Q${POND.x + 40},${YARD_HUB.y + 6} ${POND.x + 18},${POND.y - 6}`;
const TO_SHED_D = `M${YARD_HUB.x + 14},${YARD_HUB.y + 6} Q${SHED.x - 30},${YARD_HUB.y - 2} ${SHED.x - 6},${SHED.y + 22}`;
const TO_COMPOST_D = `M${SHED.x + 10},${SHED.y + 28} Q${(SHED.x + COMPOST.x) / 2},${COMPOST.y + 14} ${COMPOST.x - 4},${COMPOST.y + 18}`;
const HOUSE_PATH_D = `M${RIM_LT[0]},${RIM_LT[1] + 4} Q${(RIM_LT[0] + BARN.x) / 2 - 8},${(RIM_LT[1] + BARN.y + 70) / 2} ${BARN.x - 10},${BARN.y + 78}`;
const WINDMILL_PATH_D = `M${BARN.x + 60},${BARN.y + 40} Q${(BARN.x + WINDMILL.x) / 2},${BARN.y + 60} ${WINDMILL.x - 6},${WINDMILL.y + 66}`;
const IRRIGATION_D: [number, number][] = [[POND.x + 30, POND.y - 22], [POND.x + 60, POND.y - 40], [RIM_B[0] - 30, RIM_B[1] + 8]];

const STEPPING_STONES: [number, number][] = [
  lerp([YARD_HUB.x, YARD_HUB.y], RIM_LT, 0.32),
  lerp([YARD_HUB.x, YARD_HUB.y], RIM_LT, 0.68),
  lerp(RIM_LT, [BARN.x, BARN.y], 0.48),
];

function PathRibbon({ d, width }: { d: string; width: number }) {
  return (
    <>
      <path d={d} fill="none" stroke="#c9a877" strokeWidth={width} strokeLinecap="round" opacity={0.85} />
      <path d={d} fill="none" stroke="#b3906a" strokeWidth={width} strokeLinecap="round" strokeDasharray="2,13" opacity={0.5} />
    </>
  );
}

export default function GardenGrid({
  layout, activePests, equippedCosmetics, selectedPlot, onSelectPlot, activeTool, onToolApply,
}: GardenGridProps) {
  const [hoveredPlot, setHoveredPlot] = useState<number | null>(null);
  const weather = useMemo(() => getTodaysWeather(), []);

  const renderOrder = useMemo(
    () => Array.from({ length: COLS * ROWS }, (_, i) => {
      const { col, row } = plotColIdx(i);
      return { idx: i, col, row, depth: col + row };
    }).sort((a, b) => a.depth - b.depth),
    [],
  );

  const handleTileClick = (idx: number) => {
    const isActionTool = activeTool === 'water' || activeTool === 'fertilizer' || activeTool === 'pesticide' || activeTool === 'scarecrow';
    if (isActionTool) { onToolApply(idx, activeTool as ToolId); return; }
    onSelectPlot(selectedPlot === idx ? null : idx);
  };

  const hasFence = equippedCosmetics.some(id => ['bamboo_fence', 'stone_wall'].includes(id));
  const hasBorder = equippedCosmetics.some(id => ['sunflower_border', 'lily_pad_border'].includes(id));
  const fenceCosmetic = equippedCosmetics.find(id => ['bamboo_fence', 'stone_wall'].includes(id));
  const borderCosmetic = equippedCosmetics.find(id => ['sunflower_border', 'lily_pad_border'].includes(id));

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-garden-200/70 shadow-glass" style={{ background: 'linear-gradient(180deg,#bfe8f5 0%,#dff3d8 16%,#c7e8ab 44%,#9fd684 100%)' }}>
      {/* Pest warning banner */}
      <AnimatePresence>
        {activePests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute inset-x-3 top-3 z-20 rounded-2xl bg-gradient-to-r from-red-800 to-red-600 px-4 py-2.5 text-center shadow-glow-red"
          >
            <p className="text-sm font-extrabold text-white">
              ⚠️ Pest attack! {activePests.length} plot{activePests.length > 1 ? 's' : ''} under siege — tap to defend
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} width="100%" className="block max-h-[660px]">
        <defs>
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff7d6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pondGrad" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#a7e0f0" />
            <stop offset="100%" stopColor="#4fa8c9" />
          </radialGradient>
          {/* Four quadrant soil tones, close cousins of one another — a
              gentle patchwork so each bed reads as its own crop area without
              looking like four unrelated materials. */}
          <linearGradient id="soilQuad0" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8f6f4d" /><stop offset="100%" stopColor="#5c4128" />
          </linearGradient>
          <linearGradient id="soilQuad1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9a6f45" /><stop offset="100%" stopColor="#66401f" />
          </linearGradient>
          <linearGradient id="soilQuad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7e6552" /><stop offset="100%" stopColor="#4d3d2e" />
          </linearGradient>
          <linearGradient id="soilQuad3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8c5f42" /><stop offset="100%" stopColor="#573822" />
          </linearGradient>
          <linearGradient id="grassSkirtGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a9d98a" />
            <stop offset="55%" stopColor="#8fc46e" />
            <stop offset="100%" stopColor="#6ea852" />
          </linearGradient>
          <radialGradient id="vignette" cx="50%" cy="45%" r="70%">
            <stop offset="60%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#0b3320" stopOpacity="0.18" />
          </radialGradient>
          {/* Soft blur used everywhere terrain should melt into its
              surroundings instead of showing a cartoon outline — the bed's
              edge into the lawn, the fence into the ground it stands on. */}
          <filter id="softEdge" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* ── Distant hills for depth ── */}
        <path d={`M0,150 Q160,110 340,140 T${CANVAS_W},130 V0 H0 Z`} fill="#cdeab5" opacity={0.55} />
        <path d={`M0,190 Q220,155 420,180 T${CANVAS_W},175 V0 H0 Z`} fill="#dff0c6" opacity={0.4} />

        {/* Sun + rays — tucked in a back corner so it never competes with the
            farmhouse for the eye's first stop */}
        <circle cx={SUN.x} cy={SUN.y} r={70} fill="url(#sunGlow)" />
        <motion.circle
          cx={SUN.x} cy={SUN.y} r={22} fill="#fde68a" stroke="#fbbf24" strokeWidth={2}
          animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: `${SUN.x}px ${SUN.y}px` }}
        />
        {weather.key === 'sunny' && [0, 1, 2, 3, 4, 5].map(i => (
          <motion.line
            key={i} x1={SUN.x} y1={SUN.y} x2={SUN.x + Math.cos((i / 6) * Math.PI * 2) * 46} y2={SUN.y + Math.sin((i / 6) * Math.PI * 2) * 46}
            stroke="#fde68a" strokeWidth={2} strokeLinecap="round"
            animate={{ opacity: [0.15, 0.5, 0.15] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}

        {/* Grass texture patches — variation in the lawn, not scattered props */}
        {GRASS_PATCHES.map((p, i) => (
          <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={p.dark ? 'rgba(20,83,45,0.08)' : 'rgba(255,255,255,0.18)'} />
        ))}

        {/* Drifting cloud shadows on the ground — subtle atmosphere */}
        {CLOUD_SHADOWS.map((c, i) => (
          <motion.ellipse
            key={i} cy={c.y} rx={c.rx} ry={c.ry} fill="rgba(20,60,30,0.08)"
            initial={{ cx: -120 }} animate={{ cx: CANVAS_W + 120 }}
            transition={{ duration: c.dur, repeat: Infinity, ease: 'linear', delay: i * 6 }}
          />
        ))}
        {CLOUD_SHADOWS.map((c, i) => (
          <motion.text
            key={`c${i}`} y={c.y - 210} fontSize={c.rx * 0.9} opacity={0.55} style={{ userSelect: 'none' }}
            initial={{ x: -120 }} animate={{ x: CANVAS_W + 120 }}
            transition={{ duration: c.dur, repeat: Infinity, ease: 'linear', delay: i * 6 }}
          >☁️</motion.text>
        ))}

        {/* ── One connected path skeleton: the entrance hub below the field
            branches to the pond and to the shed/compost cluster, and climbs
            past the field's edge to the farmhouse, with a spur to the
            windmill — every structure reachable from every other one. ── */}
        <PathRibbon d={MAIN_PATH_D} width={24} />
        <PathRibbon d={TO_POND_D} width={16} />
        <PathRibbon d={TO_SHED_D} width={16} />
        <PathRibbon d={TO_COMPOST_D} width={11} />
        <PathRibbon d={HOUSE_PATH_D} width={17} />
        <PathRibbon d={WINDMILL_PATH_D} width={12} />
        {STEPPING_STONES.map(([sx, sy], i) => (
          <ellipse key={i} cx={sx} cy={sy} rx={9} ry={5} fill="#9a9086" stroke="#726a62" strokeWidth={1} opacity={0.9} />
        ))}
        <ellipse cx={YARD_HUB.x} cy={YARD_HUB.y + 4} rx={10} ry={4.5} fill="#9a9086" stroke="#726a62" strokeWidth={1} opacity={0.9} />

        {/* A short irrigation channel carrying water from the pond toward
            the field's edge — storytelling, not a new mechanic. */}
        <IrrigationChannel points={IRRIGATION_D} width={7} />

        {/* ── The one pond, feeding the yard hub below the field ── */}
        <ellipse cx={POND.x} cy={POND.y + 6} rx={POND.rx + 6} ry={POND.ry * 0.5} fill="rgba(20,83,45,0.15)" />
        <ellipse cx={POND.x} cy={POND.y} rx={POND.rx} ry={POND.ry} fill="url(#pondGrad)" stroke="#3d879f" strokeWidth={2} />
        <motion.ellipse
          cx={POND.x} cy={POND.y} rx={36} ry={18} fill="none" stroke="#eaf7fb" strokeWidth={1.5} opacity={0.5}
          animate={{ rx: [36, 50, 36], ry: [18, 24, 18], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3.5, repeat: Infinity }}
        />
        <text x={POND.x - 28} y={POND.y + 8} fontSize={20} style={{ userSelect: 'none' }}>🪷</text>
        <text x={POND.x + 18} y={POND.y - 16} fontSize={14} style={{ userSelect: 'none' }}>🪷</text>
        <RockCluster x={ROCK_CLUSTER.x} y={ROCK_CLUSTER.y} />

        {/* ── Bottom yard: shed, firewood, barrel, tools, crates and compost,
            all one working corner fed by the same hub ── */}
        <Shed x={SHED.x} y={SHED.y} />
        <LogPile x={LOG_PILE.x} y={LOG_PILE.y} />
        <Barrel x={BARREL.x} y={BARREL.y} />
        <ToolRack x={TOOL_RACK.x} y={TOOL_RACK.y} />
        <Crate x={CRATE_1.x} y={CRATE_1.y} rotation={-6} />
        <Crate x={CRATE_2.x} y={CRATE_2.y} rotation={8} />
        <CompostBin x={COMPOST.x} y={COMPOST.y} />
        {BOTTOM_FLOWERS.map((f, i) => <FlowerBed key={i} x={f.x} y={f.y} scale={0.7} />)}

        {/* ── Farmhouse dooryard — fence and flower bed clustered as one
            little yard beside the house, not separate placements ── */}
        <Shrub x={FLOWER_BED.x - 46} y={FLOWER_BED.y - 4} scale={0.85} />
        <FlowerBed x={FLOWER_BED.x} y={FLOWER_BED.y} />
        <TransientButterflies x={FLOWER_BED.x} y={FLOWER_BED.y - 6} />
        <FenceSection x={FENCE.x} y={FENCE.y} />

        {/* ── The one tree cluster, screening the farmhouse's back corner ── */}
        {TREE_CLUSTER.map((t, i) => <Tree key={i} {...t} />)}

        {/* ── Major landmark: the farmhouse, enlarged and centered — the one
            thing a player's eye lands on first ── */}
        <Barn x={BARN.x} y={BARN.y} scale={BARN.scale} />

        {/* ── Secondary landmark: the windmill, clearly smaller, standing at
            the field's shoulder ── */}
        <Windmill x={WINDMILL.x} y={WINDMILL.y} scale={WINDMILL.scale} />

        {/* ── The farm itself: one continuous bed, the plots planted in it,
            and everything anchored to that same ground (scarecrow, fence)
            — enlarged and recentered as a single unit so it dominates the
            scene instead of sitting in a corner. ── */}
        <g transform={FARM_TRANSFORM}>
          <TerrainMound />

          {renderOrder.map(({ idx, col, row }) => (
            <Tile
              key={idx} idx={idx} col={col} row={row}
              plot={layout[idx]}
              pest={activePests.find(p => p.plotIdx === idx) ?? null}
              isSelected={selectedPlot === idx}
              isHovered={hoveredPlot === idx}
              isLastRow={row === ROWS - 1}
              allEmpty={idx === 12 && layout.every(p => !p.cropId)}
              onClick={() => handleTileClick(idx)}
              onEnter={() => setHoveredPlot(idx)}
              onLeave={() => setHoveredPlot(null)}
            />
          ))}

          {/* ── The one scarecrow, standing right at the field's internal
              crossroads ── */}
          <Scarecrow x={SCARECROW.x} y={SCARECROW.y} />

          {(hasFence || hasBorder) && (
            <FenceOverlay hasFence={hasFence} hasBorder={hasBorder} fenceCosmetic={fenceCosmetic} borderCosmetic={borderCosmetic} />
          )}
        </g>

        <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="url(#vignette)" pointerEvents="none" />
      </svg>
    </div>
  );
}

interface GardenGridProps {
  layout: GardenLayout;
  activePests: PestEvent[];
  equippedCosmetics: string[];
  selectedPlot: number | null;
  onSelectPlot: (idx: number | null) => void;
  activeTool: ToolId | null;
  onToolApply: (idx: number, tool: ToolId) => void;
  // Optional "planting mode" props — present because your Garden.tsx passes
  // them, but not wired to any behavior here yet. Tell me the intended flow
  // (e.g. "clicking an empty plot while plantingCrop is set should place it
  // and clear plantingCrop") and I'll wire it up properly instead of guessing.
  plantingCrop?: TrackedCrop | null;
  onCancelPlanting?: () => void;
}

// ─── The crop bed — four distinct beds, one continuous piece of ground ────
// The outer silhouette is still ONE unbroken shape — the farm's edge melts
// into the lawn exactly once, and the fence/border cosmetic still hugs a
// single boundary — but the visible soil inside it is now split into four
// organic beds along a real, clearly visible dirt path, so a player reads
// "four crop areas" at a glance instead of one large brown slab. The split
// itself (col1.5 / row1.5) is a pure visual grouping, never tied to plot
// data — every plot still plants, waters and harvests exactly as before;
// only the ground art underneath changed.

function TerrainMound() {
  const outerLocal = NATIVE_OUTER.map(([x, y]) => [x + OFFSET_X, y + OFFSET_Y] as [number, number]);
  const outerPath = blobPath(outerLocal);
  const shadowPath = blobPath(outerLocal.map(([px, py]) => [px + 3, py + 9] as [number, number]));

  // The dividing path: a real dirt path along the col1.5 / row1.5 seams,
  // extended slightly past the grid so it visibly reaches the bed's rim.
  const toLocal = (col: number, row: number): [number, number] => {
    const p = isoProject(col, row);
    return [p.x + OFFSET_X, p.y + OFFSET_Y];
  };
  const seamV = `M${toLocal(1.5, -0.75)[0]},${toLocal(1.5, -0.75)[1]} L${toLocal(1.5, 4.75)[0]},${toLocal(1.5, 4.75)[1]}`;
  const seamH = `M${toLocal(-0.75, 1.5)[0]},${toLocal(-0.75, 1.5)[1]} L${toLocal(4.75, 1.5)[0]},${toLocal(4.75, 1.5)[1]}`;

  return (
    <g>
      {/* Tight contact shadow hugging the rim — not a detached blob floating
          beneath the bed. */}
      <path d={shadowPath} fill="rgba(15,45,20,0.16)" style={{ filter: 'url(#softEdge)' }} />

      {/* Thin melt-in transition instead of a tall grassy slope — ONE
          unbroken outer boundary, so the farm's edge (and its fence, if
          equipped) stays a single continuous shape. */}
      <path d={outerPath} fill="none" stroke="#8fc46e" strokeWidth={14} opacity={0.35} style={{ filter: 'url(#softEdge)' }} />
      <path d={outerPath} fill="url(#grassSkirtGrad)" stroke="none" />
      <path d={outerPath} fill="none" stroke="rgba(20,70,35,0.28)" strokeWidth={6} opacity={0.55} style={{ filter: 'url(#softEdge)' }} />

      {/* Four soil beds, each its own organic blob with its own gentle tone,
          inside that one boundary — this is what actually breaks "one big
          brown slab" into four recognizable crop areas. */}
      {QUADRANTS.map((q, qi) => {
        const ring = nativeRingForRange(q.colMin, q.colMax, q.rowMin, q.rowMax, 15, QUAD_BULGE)
          .map(([x, y]) => [x + OFFSET_X, y + OFFSET_Y] as [number, number]);
        const innerRing = nativeRingForRange(q.colMin, q.colMax, q.rowMin, q.rowMax, 2, QUAD_BULGE.map(([bx, by]) => [bx * 0.4, by * 0.4]))
          .map(([x, y]) => [x + OFFSET_X, y + OFFSET_Y] as [number, number]);
        const path = blobPath(ring);
        const steps = Math.max(2, (q.colMax - q.colMin) + (q.rowMax - q.rowMin));
        const a = innerRing[6], b = innerRing[2], c = innerRing[0], d = innerRing[4];
        return (
          <g key={qi}>
            <path d={path} fill={`url(#${q.gradId})`} stroke="none" />
            <path d={path} fill="none" stroke="rgba(30,20,10,0.3)" strokeWidth={4} opacity={0.5} style={{ filter: 'url(#softEdge)' }} />
            {Array.from({ length: steps - 1 }, (_, i) => {
              const t = (i + 1) / steps;
              return (
                <line key={i}
                  x1={a[0] + (d[0] - a[0]) * t} y1={a[1] + (d[1] - a[1]) * t}
                  x2={c[0] + (b[0] - c[0]) * t} y2={c[1] + (b[1] - c[1]) * t}
                  stroke="rgba(0,0,0,0.07)" strokeWidth={1} />
              );
            })}
          </g>
        );
      })}

      {/* The dividing path itself — real and clearly visible, not a subtle
          tint — so all four beds read as separate at a glance. */}
      {[seamV, seamH].map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke="#7a6248" strokeWidth={31} opacity={0.9} strokeLinecap="round" />
          <path d={d} fill="none" stroke="#c9a877" strokeWidth={21} opacity={0.85} strokeLinecap="round" />
          <path d={d} fill="none" stroke="#b3906a" strokeWidth={21} strokeLinecap="round" strokeDasharray="2,15" opacity={0.5} />
        </g>
      ))}
    </g>
  );
}

// ─── Single crop tile ───────────────────────────────────────────────────────

function Tile({
  idx, col, row, plot, pest, isSelected, isHovered, isLastRow, allEmpty, onClick, onEnter, onLeave,
}: {
  idx: number; col: number; row: number;
  plot: GardenLayout[number]; pest: PestEvent | null;
  isSelected: boolean; isHovered: boolean; isLastRow: boolean; allEmpty: boolean;
  onClick: () => void; onEnter: () => void; onLeave: () => void;
}) {
  const { x: cx, y: cy } = isoProject(col, row);
  // Small deterministic jitter per plot — breaks the checkerboard grid feel
  // so no two plots line up as perfect identical squares.
  const jx = (hash(idx * 3 + 1) - 0.5) * 6;
  const jy = (hash(idx * 3 + 2) - 0.5) * 5;
  const jScale = 0.94 + hash(idx * 3 + 3) * 0.12;
  const tx = OFFSET_X + cx + jx;
  const ty = OFFSET_Y + cy + jy;
  const half_w = HALF_W * jScale;
  const half_h = HALF_H * jScale;
  const isEmpty = !plot.cropId;
  const isProtected = !!plot.defenseItem;
  const hasPest = !!pest;
  const isWilted = plot.status === 'wilted';
  const isHarvestReady = plot.status === 'harvest_ready';

  const topPath = roundedDiamond(tx, ty, half_w, half_h, 0.3);

  // One soil/status color per plot, not three (top/left/right faces) — there
  // are no side walls anymore, so there's nothing to shade differently.
  let plotColor = '#7a5a3a'; // rich dark soil (empty)
  if (!isEmpty) {
    if (plot.status === 'growing') plotColor = '#6b4226';
    else if (plot.status === 'healthy') plotColor = '#22c55e';
    else if (isHarvestReady) plotColor = '#fbbf24';
    else if (isWilted) plotColor = '#6b5638';
  }
  if (hasPest) plotColor = '#8a3d3d';
  if (isSelected) plotColor = '#fde68a';
  else if (isHovered && isEmpty) plotColor = '#8f6c48';

  // The plot itself is a soft tint low enough in opacity that the shared
  // field soil shows through and neighboring plots visually merge into one
  // worked bed — the crop, not the cell, is what a player's eye lands on.
  // States that matter functionally (selection, hover, a pest actively on
  // the plot) stay opaque enough to read clearly at a glance.
  let fillOpacity = isEmpty ? 0.14 : 0.3;
  if (isHarvestReady) fillOpacity = 0.4;
  if (isWilted) fillOpacity = 0.36;
  if (hasPest) fillOpacity = 0.6;
  if (isHovered) fillOpacity = Math.max(fillOpacity, isEmpty ? 0.32 : 0.48);
  if (isSelected) fillOpacity = 0.82;

  const elevateY = isSelected ? -7 : 0;
  const cropKind = isEmpty ? null : getCropKind(plot.emoji);
  const growthStage = isEmpty ? 0 : getGrowthStage(plot.status, idx);

  return (
    <motion.g
      style={{ cursor: 'pointer', transformOrigin: `${tx}px ${ty}px` }}
      whileTap={{ scale: 1.08 }}
      animate={{ y: elevateY }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {isSelected && (
        <ellipse cx={tx} cy={ty + half_h + 22} rx={half_w * 0.7} ry={8} fill="rgba(0,0,0,0.22)" />
      )}
      {isLastRow && !isSelected && <ellipse cx={tx} cy={ty + half_h + 16} rx={half_w * 0.65} ry={6} fill="rgba(0,0,0,0.13)" />}

      {/* A shallow, blurred dip in the soil — not a raised block. This is
          the plot's only "elevation" cue now: soft shading, no walls. */}
      {!isEmpty && (
        <ellipse cx={tx} cy={ty + half_h * 0.45} rx={half_w * 0.72} ry={half_h * 0.5}
          fill="rgba(20,15,5,0.22)" style={{ filter: 'url(#softEdge)' }} />
      )}

      <path d={topPath} fill={plotColor} fillOpacity={fillOpacity}
        stroke={isSelected ? '#f59e0b' : isHovered ? '#4ade80' : 'none'}
        strokeWidth={isSelected ? 2 : 1.3} strokeOpacity={isSelected ? 1 : 0.8} />

      {/* Selected — animated marching-ants outline */}
      {isSelected && (
        <motion.path
          d={topPath} fill="none" stroke="#fff7d6" strokeWidth={2} strokeDasharray="5,4"
          animate={{ strokeDashoffset: [0, -18] }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Empty — tilled soil rows. No per-tile speckle dots here: across a
          field of mostly-empty plots, scattered dark dots read as bug holes
          rather than soil texture, so the tilled lines carry it alone. */}
      {isEmpty && (
        <>
          {[-10, 0, 10].map(off => (
            <line key={off} x1={tx - 16} y1={ty + off * 0.4} x2={tx + 16} y2={ty + off * 0.4 + 4} stroke="rgba(0,0,0,0.18)" strokeWidth={1.2} />
          ))}
        </>
      )}

      {/* Wilted — cracked soil */}
      {isWilted && (
        <>
          <path d={`M${tx - 12},${ty - 4} L${tx - 4},${ty + 2} L${tx - 8},${ty + 8}`} stroke="rgba(0,0,0,0.3)" strokeWidth={1} fill="none" />
          <path d={`M${tx + 6},${ty - 6} L${tx + 12},${ty} L${tx + 6},${ty + 6}`} stroke="rgba(0,0,0,0.3)" strokeWidth={1} fill="none" />
        </>
      )}

      {/* Pest — darkened patch under the plant */}
      {hasPest && <ellipse cx={tx} cy={ty} rx={half_w * 0.5} ry={half_h * 0.5} fill="rgba(0,0,0,0.25)" />}

      {/* HP bar */}
      {!isEmpty && (
        <>
          <rect x={tx - 18} y={ty + half_h + 4} width={36} height={4} rx={2} fill="rgba(0,0,0,0.25)" />
          <rect x={tx - 18} y={ty + half_h + 4} width={36 * (plot.hp / 3)} height={4} rx={2} fill={plot.hp >= 2 ? '#4ade80' : plot.hp === 1 ? '#facc15' : '#f87171'} />
        </>
      )}

      {/* Harvest-ready glow ring */}
      {isHarvestReady && (
        <motion.ellipse cx={tx} cy={ty - half_h + 4} rx={20} ry={8} fill="none" stroke="#facc15" strokeWidth={2}
          animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
      )}

      {/* Protection glow ring */}
      {isProtected && !hasPest && (
        <motion.ellipse cx={tx} cy={ty} rx={half_w * 0.62} ry={half_h * 0.62} fill="none" stroke="#60a5fa" strokeWidth={1.5}
          animate={{ opacity: [0.25, 0.6, 0.25] }} transition={{ duration: 2, repeat: Infinity }} />
      )}

      {/* Plant — grown INTO the soil bed, not floating above it. Rendered as
          a small cluster of individually-shaped plant units so the plot
          reads as "a tomato patch", not "a square with a tomato icon". */}
      {!isEmpty && cropKind && (
        <CropPlant
          kind={cropKind}
          tx={tx}
          ty={ty}
          halfW={half_w}
          halfH={half_h}
          stage={growthStage}
          seed={idx}
          isWilted={isWilted}
          hasPest={hasPest}
          isHarvestReady={isHarvestReady}
        />
      )}

      {isEmpty && (
        <text x={tx} y={ty + 5} textAnchor="middle" dominantBaseline="middle" fontSize={isHovered ? 20 : 16}
          fill={isHovered ? '#fde68a' : 'rgba(255,255,255,0.35)'} fontWeight={700}
          style={{ transition: 'font-size 0.15s', userSelect: 'none' }}>+</text>
      )}

      {allEmpty && isEmpty && (
        <>
          <motion.text x={tx} y={ty - 22} textAnchor="middle" fontSize={22} style={{ userSelect: 'none' }}
            animate={{ y: [ty - 22, ty - 28, ty - 22] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>🌱</motion.text>
          <text x={tx} y={ty - 42} textAnchor="middle" fontSize={8} fill="#fde68a" fontWeight={700} opacity={0.9} style={{ userSelect: 'none' }}>
            Tap to plant!
          </text>
        </>
      )}

      {/* Healthy — occasional ambient sparkle */}
      {plot.status === 'healthy' && !hasPest && (
        <motion.text x={tx + 12} fontSize={8} style={{ userSelect: 'none' }}
          initial={{ opacity: 0, y: ty - half_h - 18, scale: 0 }}
          animate={{ opacity: [0, 0.9, 0], y: ty - half_h - 28, scale: [0, 1, 0.6] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: (idx % 5) * 0.5 }}>✨</motion.text>
      )}

      {plot.defenseItem && (
        <motion.text x={tx + 22} y={ty - 12} fontSize={14} textAnchor="middle"
          style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))', userSelect: 'none' }}
          animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          {plot.defenseItem === 'scarecrow' ? '🪆' : '💊'}
        </motion.text>
      )}

      {/* Pest — crawls on the soil at the plant's base and hides in the
          foliage; nothing here ever leaves the surface it's standing on. */}
      {hasPest && (
        <>
          <motion.g
            animate={{ x: [0, 5, -3, 4, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ellipse cx={tx - half_w * 0.32} cy={ty + half_h * 0.5} rx={4.4} ry={3} fill="#4a3524" />
            <ellipse cx={tx - half_w * 0.32} cy={ty + half_h * 0.5} rx={2.6} ry={1.7} fill="#6b4a30" opacity={0.75} />
            {[-2.4, 0, 2.4].map(o => (
              <line key={o} x1={tx - half_w * 0.32 + o} y1={ty + half_h * 0.5 + 2.4}
                x2={tx - half_w * 0.32 + o * 1.6} y2={ty + half_h * 0.5 + 5}
                stroke="#2e2015" strokeWidth={0.7} />
            ))}
          </motion.g>
          <motion.g
            animate={{ x: [0, -4, 3, -2, 0] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          >
            <ellipse cx={tx + half_w * 0.28} cy={ty + half_h * 0.2} rx={3.2} ry={2.2} fill="#5a6b2e" />
          </motion.g>
        </>
      )}

      {isHarvestReady && [0, 1, 2].map(si => (
        <motion.text key={si} textAnchor="middle" fontSize={10} x={tx + (si - 1) * 18} style={{ userSelect: 'none' }}
          initial={{ opacity: 0, y: ty - half_h - 30, scale: 0 }}
          animate={{ opacity: [0, 1, 0], y: ty - half_h - 44, scale: [0, 1.3, 0.8] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: si * 0.4 }}>✨</motion.text>
      ))}

      {isHovered && (
        <text x={tx} y={ty + 2} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="rgba(255,255,255,0.75)" fontWeight={800}
          style={{ userSelect: 'none', pointerEvents: 'none' }}>{idx + 1}</text>
      )}
    </motion.g>
  );
}

// ─── Fence / border cosmetics overlay ──────────────────────────────────────
// Hugs the bed's own solved rim (pushed out a little, into the grass)
// instead of a separately-sized ellipse guessed to roughly surround it — so
// equipping a fence encloses the actual farm, not a shape floating near it.

function FenceOverlay({
  hasFence, hasBorder, fenceCosmetic, borderCosmetic,
}: { hasFence: boolean; hasBorder: boolean; fenceCosmetic?: string; borderCosmetic?: string }) {
  const isStone = fenceCosmetic === 'stone_wall';
  const fenceColor = isStone ? '#6b7280' : '#92400e';
  const postColor = isStone ? '#8b93a0' : '#6b4226';
  const borderEmoji = borderCosmetic === 'sunflower_border' ? '🌻' : '🪷';

  const push = 1.07;
  const ring: [number, number][] = NATIVE_OUTER.map(([x, y]) => {
    const lx = x + OFFSET_X, ly = y + OFFSET_Y;
    return [FARM_CX + (lx - FARM_CX) * push, FARM_CY + (ly - FARM_CY) * push];
  });
  const postPositions: [number, number][] = [];
  ring.forEach((p, i) => {
    postPositions.push(p);
    const next = ring[(i + 1) % ring.length];
    postPositions.push([(p[0] + next[0]) / 2, (p[1] + next[1]) / 2]);
  });
  const rail1 = blobPath(ring.map(([x, y]) => [x, y - 8] as [number, number]));
  const rail2 = blobPath(ring.map(([x, y]) => [x, y - 2] as [number, number]));

  return (
    <g pointerEvents="none">
      {hasFence && (
        <>
          <path d={rail1} fill="none" stroke={fenceColor} strokeWidth={3} />
          <path d={rail2} fill="none" stroke={fenceColor} strokeWidth={3} />
          {postPositions.map(([px, py], pi) => (
            <g key={pi} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
              <ellipse cx={px} cy={py + 5} rx={4.5} ry={1.8} fill="rgba(0,0,0,0.22)" />
              {isStone
                ? <rect x={px - 4} y={py - 11} width={8} height={16} rx={1.5} fill={postColor} stroke="#4b5563" strokeWidth={0.6} />
                : <rect x={px - 2.6} y={py - 11} width={5.2} height={16} rx={1.5} fill={postColor} stroke="#3f2a15" strokeWidth={0.5} />}
            </g>
          ))}
        </>
      )}
      {hasBorder && !hasFence && postPositions.map(([px, py], pi) => (
        <g key={pi}>
          <ellipse cx={px} cy={py + 5} rx={6} ry={2.2} fill="rgba(0,0,0,0.16)" />
          <motion.text x={px} y={py} fontSize={16} textAnchor="middle" dominantBaseline="middle"
            style={{ userSelect: 'none', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))' }}
            animate={{ rotate: [-4, 4, -4] }} transition={{ duration: 2.6 + (pi % 3) * 0.4, repeat: Infinity, delay: pi * 0.2 }}>
            {borderEmoji}
          </motion.text>
        </g>
      ))}
    </g>
  );
}