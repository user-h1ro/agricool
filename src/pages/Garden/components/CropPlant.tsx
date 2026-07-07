import { motion } from 'framer-motion';
import { CropStatus } from '../types';

// ─────────────────────────────────────────────────────────────────────────
// Crops are drawn *into* the soil, not floated above it. Every crop kind
// has a unique silhouette, height, density and palette so a player can
// identify "this is a tomato plot" at a glance, without reading an emoji.
// Each plot renders a small cluster of individual plant units (like a real
// bed of several stalks/heads), each with its own tiny jitter in height and
// position, and every unit is built from the same growth-stage timeline
// (sprout → small → medium → mature → harvest-ready).
// ─────────────────────────────────────────────────────────────────────────

export type CropKind =
  | 'corn' | 'tomato' | 'carrot' | 'eggplant' | 'cabbage' | 'broccoli'
  | 'onion' | 'pepper' | 'cucumber' | 'garlic' | 'grain' | 'generic';

const KIND_BY_EMOJI: Record<string, CropKind> = {
  '🌽': 'corn',
  '🍅': 'tomato',
  '🥕': 'carrot',
  '🍆': 'eggplant',
  '🥬': 'cabbage',
  '🥦': 'broccoli',
  '🧅': 'onion',
  '🫑': 'pepper',
  '🥒': 'cucumber',
  '🧄': 'garlic',
  '🌾': 'grain',
  '🍎': 'generic',
};

export function getCropKind(emoji: string): CropKind {
  return KIND_BY_EMOJI[emoji] ?? 'generic';
}

function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// 5 growth stages, driven off the plot's status. There's no stored numeric
// stage in the data model, so "growing"/"healthy" are each split into two
// visually distinct sub-stages via a deterministic per-plot hash — this
// keeps a bed of "growing" crops from looking like identical clones while
// never migrating the DB schema.
export function getGrowthStage(status: CropStatus, seed: number): number {
  const h = hash(seed * 7 + 3);
  if (status === 'harvest_ready') return 4;
  if (status === 'healthy') return h < 0.5 ? 2 : 3;
  return h < 0.5 ? 0 : 1; // growing / wilted share the same size timeline
}

const STAGE_FRAC = [0.42, 0.6, 0.75, 0.9, 1.0];

type Palette = { leaf: string; leafDark: string; fruit: string; fruitDark: string; stem: string };

const PALETTE: Record<CropKind, Palette> = {
  corn: { leaf: '#6bbf4e', leafDark: '#3f8a2c', fruit: '#f4c430', fruitDark: '#c9962a', stem: '#5a8f3c' },
  tomato: { leaf: '#4f9c4a', leafDark: '#2f6b2c', fruit: '#e6412c', fruitDark: '#b02418', stem: '#3f7a3a' },
  carrot: { leaf: '#3f9142', leafDark: '#215c26', fruit: '#f0902c', fruitDark: '#c96a14', stem: '#2f7a34' },
  eggplant: { leaf: '#4c9750', leafDark: '#2c6430', fruit: '#5b3a86', fruitDark: '#382154', stem: '#3d7a40' },
  cabbage: { leaf: '#9bd766', leafDark: '#5a9e34', fruit: '#c7ea8e', fruitDark: '#7ab84a', stem: '#5a9e34' },
  broccoli: { leaf: '#3f7d3a', leafDark: '#254e23', fruit: '#4a8f3e', fruitDark: '#254e23', stem: '#4a6b2e' },
  onion: { leaf: '#5fae57', leafDark: '#357a34', fruit: '#c9a0d1', fruitDark: '#9c6ba8', stem: '#4a8f42' },
  pepper: { leaf: '#4f9c4a', leafDark: '#2f6b2c', fruit: '#3fae44', fruitDark: '#d94227', stem: '#3f7a3a' },
  cucumber: { leaf: '#4a9c4f', leafDark: '#2b6a2f', fruit: '#4c8c3c', fruitDark: '#2f5c26', stem: '#3d7a3a' },
  garlic: { leaf: '#6bae5c', leafDark: '#3f7a34', fruit: '#f2ead6', fruitDark: '#d8cba8', stem: '#4a8f42' },
  grain: { leaf: '#c9a227', leafDark: '#8a6b18', fruit: '#e8c840', fruitDark: '#b89420', stem: '#8a7a2e' },
  generic: { leaf: '#5a9e52', leafDark: '#356b30', fruit: '#7fbf6a', fruitDark: '#4a8f3e', stem: '#4a8f42' },
};

// How many individual plant units make up one plot's crop cluster, and how
// tall (in px, at full maturity) a single unit gets — tuned per kind so the
// silhouettes read differently from across the garden.
const KIND_LAYOUT: Record<CropKind, { units: number; maxH: number; maxW: number; style: 'stalks' | 'bush' | 'mound' | 'blades' | 'vine' }> = {
  corn: { units: 3, maxH: 30, maxW: 10, style: 'stalks' },
  grain: { units: 4, maxH: 26, maxW: 6, style: 'stalks' },
  tomato: { units: 2, maxH: 20, maxW: 20, style: 'bush' },
  pepper: { units: 2, maxH: 17, maxW: 18, style: 'bush' },
  eggplant: { units: 2, maxH: 18, maxW: 18, style: 'bush' },
  cucumber: { units: 2, maxH: 12, maxW: 22, style: 'vine' },
  cabbage: { units: 2, maxH: 13, maxW: 20, style: 'mound' },
  broccoli: { units: 2, maxH: 15, maxW: 18, style: 'mound' },
  carrot: { units: 4, maxH: 15, maxW: 8, style: 'blades' },
  onion: { units: 4, maxH: 18, maxW: 6, style: 'blades' },
  garlic: { units: 4, maxH: 16, maxW: 6, style: 'blades' },
  generic: { units: 2, maxH: 15, maxW: 16, style: 'mound' },
};

function unitPositions(kind: CropKind, footW: number, footH: number, seed: number) {
  const { units } = KIND_LAYOUT[kind];
  const out: { dx: number; dy: number; s: number }[] = [];
  for (let i = 0; i < units; i++) {
    const a = hash(seed * 13 + i * 5 + 1);
    const b = hash(seed * 13 + i * 5 + 2);
    const c = hash(seed * 13 + i * 5 + 3);
    out.push({
      dx: (a - 0.5) * footW * 0.85,
      dy: (b - 0.5) * footH * 0.7,
      s: 0.8 + c * 0.4,
    });
  }
  // back units (smaller dy) drawn first so front units overlap them
  return out.sort((p, q) => p.dy - q.dy);
}

function leafBlade(x1: number, y1: number, x2: number, y2: number, width: number, color: string, key: React.Key) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 0.001;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return <ellipse key={key} cx={mx} cy={my} rx={len / 2} ry={width / 2} fill={color} transform={`rotate(${angle} ${mx} ${my})`} />;
}

function fruitDot(x: number, y: number, r: number, color: string, key: React.Key) {
  return (
    <g key={key}>
      <circle cx={x} cy={y} r={r} fill={color} stroke="rgba(0,0,0,0.18)" strokeWidth={0.5} />
      <ellipse cx={x - r * 0.32} cy={y - r * 0.32} rx={r * 0.32} ry={r * 0.2} fill="rgba(255,255,255,0.4)" />
    </g>
  );
}

function hangingFruit(x: number, y: number, w: number, h: number, color: string, key: React.Key) {
  // teardrop, point up (stem) fattening downward — eggplant / pepper pods
  const d = `M${x},${y - h} C${x + w * 0.55},${y - h * 0.5} ${x + w * 0.5},${y + h * 0.15} ${x},${y + h * 0.32}
             C${x - w * 0.5},${y + h * 0.15} ${x - w * 0.55},${y - h * 0.5} ${x},${y - h} Z`;
  return <path key={key} d={d} fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />;
}

// ── Per-kind unit renderer — this is where each crop gets its own body ────
function PlantUnit({
  kind, ux, uy, h, w, stage, pal, wilt, pest, keyBase,
}: {
  kind: CropKind; ux: number; uy: number; h: number; w: number; stage: number;
  pal: Palette; wilt: boolean; pest: boolean; keyBase: string;
}) {
  const leafColor = wilt ? '#8a7a4a' : pal.leaf;
  const stemColor = wilt ? '#6b5a3a' : pal.stem;
  const droop = wilt ? h * 0.18 : 0;
  const topY = uy - h + droop;
  const nodes: JSX.Element[] = [];

  switch (KIND_LAYOUT[kind].style) {
    case 'stalks': {
      // A single tall stalk with a couple of blade leaves, and — once grown
      // enough — an ear/seed-head attached partway up.
      nodes.push(
        <path key={`${keyBase}-s`} d={`M${ux},${uy} Q${ux + (wilt ? w * 0.5 : 1)},${uy - h * 0.55} ${ux + droop * 0.6},${topY}`}
          stroke={stemColor} strokeWidth={Math.max(1.6, w * 0.22)} fill="none" strokeLinecap="round" />,
      );
      if (stage >= 1) {
        nodes.push(leafBlade(ux, uy - h * 0.4, ux - w * 1.6, uy - h * 0.62, w * 0.55, leafColor, `${keyBase}-l1`));
      }
      if (stage >= 2) {
        nodes.push(leafBlade(ux, uy - h * 0.68, ux + w * 1.5, uy - h * 0.5, w * 0.5, leafColor, `${keyBase}-l2`));
      }
      if (stage >= 3) {
        // ear / seed head
        if (kind === 'corn') {
          nodes.push(
            <g key={`${keyBase}-ear`}>
              <rect x={ux + droop * 0.3 - w * 0.42} y={uy - h * 0.78} width={w * 0.84} height={h * 0.32} rx={w * 0.4}
                fill={stage >= 4 ? pal.fruit : pal.leaf} stroke="rgba(0,0,0,0.15)" strokeWidth={0.4} />
              {stage >= 4 && [0, 1, 2].map(r => (
                <line key={r} x1={ux + droop * 0.3 - w * 0.32} y1={uy - h * 0.74 + r * (h * 0.09)}
                  x2={ux + droop * 0.3 + w * 0.32} y2={uy - h * 0.74 + r * (h * 0.09)}
                  stroke={pal.fruitDark} strokeWidth={0.6} opacity={0.55} />
              ))}
            </g>,
          );
        } else {
          nodes.push(
            <ellipse key={`${keyBase}-head`} cx={ux + droop * 0.2} cy={topY + h * 0.06} rx={w * 0.5} ry={h * 0.22}
              fill={stage >= 4 ? pal.fruit : pal.leaf} opacity={stage >= 4 ? 1 : 0.85} />,
          );
        }
      }
      break;
    }
    case 'blades': {
      // A fan of thin upright leaves (carrot tops / onion / garlic). The
      // "fruit" (bulb/root) only peeks out at soil level once mature.
      const bladeCount = 3;
      for (let i = 0; i < bladeCount; i++) {
        const spread = (i - (bladeCount - 1) / 2) * (w * 1.4);
        nodes.push(leafBlade(ux, uy, ux + spread + droop * 0.4, topY + i * 1.5, Math.max(1.4, w * 0.4), leafColor, `${keyBase}-b${i}`));
      }
      if (stage >= 4 && kind !== 'carrot') {
        nodes.push(<ellipse key={`${keyBase}-bulb`} cx={ux} cy={uy - 1.5} rx={w * 0.6} ry={h * 0.14} fill={pal.fruit} stroke="rgba(0,0,0,0.15)" strokeWidth={0.4} />);
      }
      if (stage >= 4 && kind === 'carrot') {
        nodes.push(<path key={`${keyBase}-tip`} d={`M${ux - w * 0.3},${uy} L${ux + w * 0.3},${uy} L${ux},${uy + h * 0.22} Z`} fill={pal.fruit} />);
      }
      break;
    }
    case 'bush': {
      // A rounded leaf cluster with fruit/pods held above/within it.
      nodes.push(<ellipse key={`${keyBase}-b1`} cx={ux} cy={topY + h * 0.32} rx={w * 0.6} ry={h * 0.4} fill={leafColor} />);
      if (stage >= 1) nodes.push(<ellipse key={`${keyBase}-b2`} cx={ux - w * 0.35} cy={topY + h * 0.5} rx={w * 0.42} ry={h * 0.3} fill={pal.leafDark} opacity={0.85} />);
      if (stage >= 2) nodes.push(<ellipse key={`${keyBase}-b3`} cx={ux + w * 0.38} cy={topY + h * 0.48} rx={w * 0.4} ry={h * 0.28} fill={leafColor} opacity={0.95} />);
      if (stage >= 3) {
        const fruitColor = stage >= 4 ? pal.fruit : pal.fruitDark;
        if (kind === 'tomato') {
          nodes.push(fruitDot(ux - w * 0.28, uy - h * 0.18, w * 0.22, fruitColor, `${keyBase}-f1`));
          nodes.push(fruitDot(ux + w * 0.24, uy - h * 0.1, w * 0.19, fruitColor, `${keyBase}-f2`));
          if (stage >= 4) nodes.push(fruitDot(ux, uy - h * 0.32, w * 0.17, fruitColor, `${keyBase}-f3`));
        } else {
          // eggplant / pepper: hanging pods
          nodes.push(hangingFruit(ux - w * 0.22, uy - h * 0.12, w * 0.32, h * 0.42, fruitColor, `${keyBase}-f1`));
          if (stage >= 4) nodes.push(hangingFruit(ux + w * 0.24, uy - h * 0.06, w * 0.28, h * 0.36, fruitColor, `${keyBase}-f2`));
        }
      }
      break;
    }
    case 'mound': {
      // Dense low cluster of overlapping leaves — cabbage / broccoli.
      const r = w * 0.5 * STAGE_FRAC[Math.max(stage, 1)] / STAGE_FRAC[4] + w * 0.25;
      nodes.push(<ellipse key={`${keyBase}-m0`} cx={ux} cy={uy - r * 0.35} rx={r} ry={r * 0.62} fill={pal.leafDark} opacity={0.5} />);
      nodes.push(<ellipse key={`${keyBase}-m1`} cx={ux} cy={uy - r * 0.5} rx={r * 0.86} ry={r * 0.56} fill={leafColor} />);
      if (kind === 'broccoli' && stage >= 3) {
        [-0.32, 0, 0.32].forEach((off, i) => {
          nodes.push(<circle key={`${keyBase}-fl${i}`} cx={ux + off * r} cy={uy - r * 0.62 - Math.abs(off) * 3} r={r * 0.22} fill={stage >= 4 ? pal.fruit : pal.fruitDark} />);
        });
      }
      if (kind === 'cabbage' && stage >= 2) {
        nodes.push(<ellipse key={`${keyBase}-core`} cx={ux} cy={uy - r * 0.5} rx={r * 0.4} ry={r * 0.28} fill={pal.leafDark} opacity={0.6} />);
      }
      break;
    }
    case 'vine': {
      // Sprawling low vine with elongated fruit lying near the soil.
      nodes.push(leafBlade(ux - w * 0.5, uy - h * 0.3, ux + w * 0.5, uy - h * 0.1, h * 0.7, leafColor, `${keyBase}-v1`));
      if (stage >= 1) nodes.push(leafBlade(ux - w * 0.3, uy - h * 0.5, ux + w * 0.35, uy - h * 0.6, h * 0.55, pal.leafDark, `${keyBase}-v2`));
      if (stage >= 3) {
        const fruitColor = stage >= 4 ? pal.fruit : pal.fruitDark;
        nodes.push(<rect key={`${keyBase}-cu`} x={ux - w * 0.55} y={uy - h * 0.42} width={w * 1.1} height={h * 0.34} rx={h * 0.17}
          fill={fruitColor} stroke="rgba(0,0,0,0.15)" strokeWidth={0.4} transform={`rotate(-8 ${ux} ${uy - h * 0.25})`} />);
      }
      break;
    }
    default:
      break;
  }

  // Pest damage — a few bite notches + a bug, only on the frontmost unit.
  if (pest) {
    nodes.push(
      <g key={`${keyBase}-pest`}>
        <circle cx={ux - w * 0.15} cy={topY + h * 0.2} r={1.6} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={0.6} strokeDasharray="1,1" />
        <circle cx={ux + w * 0.2} cy={uy - h * 0.4} r={1.2} fill="#5a6b2e" />
      </g>,
    );
  }

  return <g opacity={wilt ? 0.88 : 1}>{nodes}</g>;
}

export function CropPlant({
  kind, tx, ty, halfW, halfH, stage, seed, isWilted, hasPest, isHarvestReady,
}: {
  kind: CropKind; tx: number; ty: number; halfW: number; halfH: number;
  stage: number; seed: number; isWilted: boolean; hasPest: boolean; isHarvestReady: boolean;
}) {
  const layout = KIND_LAYOUT[kind];
  const pal = PALETTE[kind];
  const positions = unitPositions(kind, halfW * 2, halfH * 2, seed);
  const frac = STAGE_FRAC[stage];
  // Crops are meant to dominate the plot — a touch of soil should still peek
  // through at the edges, but the planting itself, not the dirt underneath
  // it, should be the first thing a player's eye lands on.
  const clusterScale = Math.min(1.35, (halfW * 1.56) / (layout.maxW * 2.4));

  return (
    <motion.g
      style={{ transformOrigin: `${tx}px ${ty + halfH * 0.4}px` }}
      animate={
        hasPest
          ? { x: [0, -1.4, 0, 1.4, 0] }
          : isHarvestReady
          ? { y: [0, -2.4, 0] }
          : { rotate: [-1.6, 1.6, -1.6] }
      }
      transition={
        hasPest
          ? { duration: 0.4, repeat: Infinity }
          : isHarvestReady
          ? { duration: 1.2, repeat: Infinity, ease: 'easeOut' }
          : { duration: 3.4 + (seed % 5) * 0.3, repeat: Infinity, ease: 'easeInOut' }
      }
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
        {positions.map((p, i) => {
          const unitH = layout.maxH * frac * p.s * clusterScale;
          const unitW = layout.maxW * frac * p.s * clusterScale * 0.9 + layout.maxW * 0.25 * clusterScale;
          const ux = tx + p.dx * clusterScale;
          const uy = ty + p.dy * clusterScale + halfH * 0.32;
          return (
            <PlantUnit
              key={i}
              kind={kind}
              ux={ux}
              uy={uy}
              h={Math.max(2.5, unitH)}
              w={Math.max(2, unitW)}
              stage={stage}
              pal={pal}
              wilt={isWilted}
              pest={hasPest && i === positions.length - 1}
              keyBase={`u${i}`}
            />
          );
        })}
      </g>
    </motion.g>
  );
}