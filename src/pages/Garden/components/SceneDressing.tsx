import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { seededRange, ambientLoopTransition } from './ambientAnimations';

// ─────────────────────────────────────────────────────────────────────────
// Every prop in this file draws its own contact shadow and sits at a fixed
// (x, y) ground point — nothing here is allowed to hover in empty space.
// Zones (for the reader's mental model, not literal UI panels):
//   Farming    → crop mound, scarecrow, wood-plank bed edging (GardenGrid)
//   Decoration → trees, shrubs, flower beds
//   Utility    → shed, fence, log pile, barrels
//   Nature     → pond (GardenGrid), grass, rocks, shrubs
// ─────────────────────────────────────────────────────────────────────────

export function Tree({ x, y, scale }: { x: number; y: number; scale: number }) {
  // Seeded on this tree's own placement — every instance gets a different
  // duration/delay/amplitude without needing a new prop, and the same tree
  // always gets the same values (see ambientAnimations.ts).
  const seed = x * 1.7 + y;
  const amplitude = seededRange(seed + 2, 2, 3); // 2–3°, per spec
  const scaleAmp = seededRange(seed + 3, 0.012, 0.02); // "slight" — barely perceptible
  const transition = ambientLoopTransition(seed, 3.6, 5.2);
  const pivotY = y + 10 * scale; // where the canopy meets the (fixed) trunk

  return (
    <g>
      {/* Grass tufts, ground shadow, and trunk stay fixed — only the canopy sways */}
      <ellipse cx={x - 10 * scale} cy={y + 44 * scale} rx={6 * scale} ry={2.4 * scale} fill="#6ea852" opacity={0.8} />
      <ellipse cx={x + 11 * scale} cy={y + 45 * scale} rx={7 * scale} ry={2.6 * scale} fill="#7fbf5c" opacity={0.8} />
      <ellipse cx={x} cy={y + 46 * scale} rx={22 * scale} ry={7 * scale} fill="rgba(0,0,0,0.15)" />
      <rect x={x - 4 * scale} y={y + 10 * scale} width={8 * scale} height={26 * scale} fill="#7a5230" rx={2} />
      <motion.g
        style={{ transformOrigin: `${x}px ${pivotY}px` }}
        animate={{ rotate: [-amplitude, amplitude, -amplitude], scale: [1, 1 + scaleAmp, 1] }}
        transition={transition}
      >
        {/* Layered canopy — same overlapping-ellipse technique as Shrub,
            just taller, so a tree reads as hand-drawn vector foliage rather
            than a flat emoji glyph. */}
        <ellipse cx={x - 12 * scale} cy={y + 4 * scale} rx={15 * scale} ry={13 * scale} fill="#3f7a34" />
        <ellipse cx={x + 13 * scale} cy={y + 6 * scale} rx={14 * scale} ry={12 * scale} fill="#4a8f3e" />
        <ellipse cx={x} cy={y - 6 * scale} rx={17 * scale} ry={15 * scale} fill="#5aa04a" />
        <ellipse cx={x - 5 * scale} cy={y - 12 * scale} rx={9 * scale} ry={8 * scale} fill="#6bb058" opacity={0.9} />
        <ellipse cx={x + 6 * scale} cy={y - 15 * scale} rx={6 * scale} ry={5 * scale} fill="#7fc466" opacity={0.85} />
      </motion.g>
    </g>
  );
}

export function Shed({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 52} rx={30} ry={8} fill="rgba(0,0,0,0.16)" />
      <rect x={x - 24} y={y + 6} width={48} height={40} fill="#c98a4b" stroke="#8a5a2b" strokeWidth={1.5} rx={2} />
      <polygon points={`${x - 28},${y + 8} ${x},${y - 18} ${x + 28},${y + 8}`} fill="#7a3b2e" />
      <rect x={x - 7} y={y + 22} width={14} height={24} fill="#5c3a1e" rx={1.5} />
      <circle cx={x + 4} cy={y + 34} r={1.4} fill="#f5deb3" />
      <rect x={x - 20} y={y + 14} width={9} height={9} fill="#dff0f7" opacity={0.85} />
    </g>
  );
}

export function FenceSection({ x, y }: { x: number; y: number }) {
  const posts = [x, x + 38, x + 76];
  return (
    <g style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.18))' }}>
      <ellipse cx={x + 38} cy={y + 34} rx={48} ry={7} fill="rgba(0,0,0,0.12)" />
      <line x1={posts[0]} y1={y + 6} x2={posts[2]} y2={y + 6} stroke="#8a5a2b" strokeWidth={4} strokeLinecap="round" />
      <line x1={posts[0]} y1={y + 18} x2={posts[2]} y2={y + 18} stroke="#8a5a2b" strokeWidth={4} strokeLinecap="round" />
      {posts.map((px, i) => (
        <rect key={i} x={px - 3} y={y - 8} width={6} height={38} rx={2} fill="#6b4226" />
      ))}
    </g>
  );
}

export function Scarecrow({ x, y }: { x: number; y: number }) {
  return (
    <motion.g
      style={{ transformOrigin: `${x}px ${y}px`, filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.25))' }}
      animate={{ rotate: [-2, 2, -2] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      <ellipse cx={x} cy={y + 40} rx={14} ry={5} fill="rgba(0,0,0,0.15)" />
      <line x1={x} y1={y - 30} x2={x} y2={y + 36} stroke="#8a5a2b" strokeWidth={3} />
      <line x1={x - 16} y1={y - 12} x2={x + 16} y2={y - 12} stroke="#8a5a2b" strokeWidth={3} />
      <circle cx={x} cy={y - 36} r={7} fill="#e9c99a" />
      <polygon points={`${x - 9},${y - 40} ${x + 9},${y - 40} ${x},${y - 54}`} fill="#7a3b2e" />
      <path d={`M${x - 15},${y - 10} L${x - 8},${y + 10} L${x + 8},${y + 10} L${x + 15},${y - 10} Z`} fill="#d97706" opacity={0.85} />
    </motion.g>
  );
}

// ── Decoration area: a real flower bed — a mulch patch with a tight
// cluster of blooms — instead of individual flowers floating over grass. ──
const BED_FLOWERS = [
  { dx: -18, dy: -6, size: 20, emoji: '🌷' }, { dx: -1, dy: -9, size: 19, emoji: '🌼' }, { dx: 17, dy: -6, size: 20, emoji: '🌸' },
  { dx: -12, dy: 7, size: 17, emoji: '🌼' }, { dx: 6, dy: 8, size: 19, emoji: '🌷' }, { dx: 21, dy: 4, size: 17, emoji: '🌺' },
];

export function FlowerBed({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g style={{ transformOrigin: `${x}px ${y}px`, transform: `scale(${scale})` }}>
      <ellipse cx={x} cy={y + 10} rx={38} ry={14} fill="rgba(15,40,20,0.2)" />
      <ellipse cx={x} cy={y} rx={36} ry={13} fill="#6b4a2e" />
      <ellipse cx={x} cy={y - 1} rx={30} ry={10} fill="#5a8f42" opacity={0.65} />
      {BED_FLOWERS.map((f, i) => {
        // Seeded on this bed's position + the flower's index within it, so
        // no two beds bob in the same phase and no two flowers in the same
        // bed do either.
        const seed = x * 1.3 + y * 0.7 + i * 17;
        const transition = ambientLoopTransition(seed, 2.6, 3.8);
        const flowerY = y + f.dy;
        const flowerX = x + f.dx;
        return (
          <motion.g
            key={i}
            animate={{ rotate: [-4, 4, -4], y: [0, -2.2, 0] }}
            transition={transition}
            style={{ transformOrigin: `${flowerX}px ${flowerY}px` }}
          >
            {/* Leaves peeking out from under the bloom — gives the flower a
                "planted", layered look instead of a bare emoji floating on
                mulch. */}
            <ellipse cx={flowerX - f.size * 0.32} cy={flowerY + f.size * 0.22} rx={f.size * 0.26} ry={f.size * 0.15}
              fill="#4a8f3e" transform={`rotate(-25 ${flowerX - f.size * 0.32} ${flowerY + f.size * 0.22})`} />
            <ellipse cx={flowerX + f.size * 0.34} cy={flowerY + f.size * 0.2} rx={f.size * 0.26} ry={f.size * 0.15}
              fill="#5aa04a" transform={`rotate(25 ${flowerX + f.size * 0.34} ${flowerY + f.size * 0.2})`} />
            <text x={flowerX} y={flowerY} fontSize={f.size} textAnchor="middle" style={{ userSelect: 'none' }}>{f.emoji}</text>
          </motion.g>
        );
      })}
    </g>
  );
}

// Loose wildflower accents scattered on open lawn — a couple of small blooms
// growing straight out of the grass, no mulch bed underneath. Distinct from
// FlowerBed (which is a "planted" bed near the farmhouse/pond); this is for
// filling in open ground so it doesn't read as empty.
const TUFT_BLOOMS = [
  { dx: -6, dy: -2, size: 12, emoji: '🌼' },
  { dx: 6, dy: 1, size: 11, emoji: '🌷' },
];

export function WildflowerTuft({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 3} rx={13} ry={4.5} fill="rgba(0,0,0,0.08)" />
      <path d={`M${x - 9},${y + 3} Q${x - 8},${y - 5} ${x - 5},${y + 2}`} stroke="#4a8f3e" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <path d={`M${x + 10},${y + 3} Q${x + 9},${y - 6} ${x + 6},${y + 2}`} stroke="#5aa04a" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {TUFT_BLOOMS.map((f, i) => {
        const seed = x * 1.5 + y * 1.1 + i * 23;
        const transition = ambientLoopTransition(seed, 2.6, 3.8);
        const flowerY = y + f.dy;
        return (
          <motion.text
            key={i} x={x + f.dx} y={flowerY} fontSize={f.size} textAnchor="middle" style={{ userSelect: 'none' }}
            animate={{ rotate: [-4, 4, -4], y: [flowerY, flowerY - 1.8, flowerY] }}
            transition={transition}
          >{f.emoji}</motion.text>
        );
      })}
    </g>
  );
}
export function TransientButterflies({ x, y }: { x: number; y: number }) {
  const [flies, setFlies] = useState<{ id: number; dx: number; dy: number }[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function spawn() {
      if (cancelled) return;
      setFlies(curr => {
        if (curr.length >= 2) return curr;
        const id = idRef.current++;
        const dx = (Math.random() - 0.5) * 40;
        const dy = (Math.random() - 0.5) * 18 - 6;
        const life = 4200 + Math.random() * 2200;
        const t = setTimeout(() => {
          if (!cancelled) setFlies(c => c.filter(f => f.id !== id));
        }, life);
        timers.push(t);
        return [...curr, { id, dx, dy }];
      });
    }

    const first = setTimeout(spawn, 1400);
    const loop = setInterval(spawn, 5200 + Math.random() * 3600);
    timers.push(first);
    return () => { cancelled = true; clearInterval(loop); timers.forEach(clearTimeout); };
  }, []);

  return (
    <AnimatePresence>
      {flies.map(f => {
        const bx = x + f.dx, by = y + f.dy;
        return (
          <motion.text
            key={f.id} fontSize={13} style={{ userSelect: 'none' }}
            initial={{ x: bx, y: by, opacity: 0 }}
            animate={{ x: [bx, bx + 20, bx - 9, bx + 6, bx], y: [by, by - 12, by + 5, by - 6, by], opacity: [0, 1, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 5, ease: 'easeInOut' }}
          >🦋</motion.text>
        );
      })}
    </AnimatePresence>
  );
}

// ── Utility area: stacked firewood — a real pile with visible log ends —
// instead of a single 🪵 glyph floating beside the farm. ──
const LOGS = [
  { dx: -13, dy: 8, w: 26 }, { dx: 12, dy: 8, w: 24 }, { dx: -1, dy: 8, w: 28 },
  { dx: -6, dy: 0, w: 24 }, { dx: 10, dy: 0, w: 20 },
  { dx: 1, dy: -8, w: 17 },
];

export function LogPile({ x, y }: { x: number; y: number }) {
  return (
    <g style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.22))' }}>
      <ellipse cx={x} cy={y + 17} rx={32} ry={8} fill="rgba(0,0,0,0.18)" />
      {LOGS.map((l, i) => (
        <g key={i}>
          <rect x={x + l.dx - l.w / 2} y={y + l.dy - 3.6} width={l.w} height={7.6} rx={3.6}
            fill={i % 2 === 0 ? '#8a5a2b' : '#7a4a20'} stroke="#4f2f16" strokeWidth={0.6} />
          <rect x={x + l.dx - l.w / 2} y={y + l.dy - 3.6} width={l.w} height={2} rx={1} fill="#fff" opacity={0.16} />
          <circle cx={x + l.dx - l.w / 2 + 3.6} cy={y + l.dy + 0.2} r={3.2} fill="#c9a877" stroke="#5c3a1e" strokeWidth={0.5} />
          <circle cx={x + l.dx - l.w / 2 + 3.6} cy={y + l.dy + 0.2} r={1.3} fill="#a9835a" />
        </g>
      ))}
    </g>
  );
}

export function Barrel({ x, y }: { x: number; y: number }) {
  return (
    <g style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
      <ellipse cx={x} cy={y + 17} rx={10} ry={3.6} fill="rgba(0,0,0,0.18)" />
      <rect x={x - 9} y={y - 6} width={18} height={20} rx={4} fill="#a06a35" stroke="#5c3a1e" strokeWidth={1} />
      <ellipse cx={x} cy={y - 6} rx={9} ry={3} fill="#c9905a" stroke="#5c3a1e" strokeWidth={1} />
      <line x1={x - 9} y1={y} x2={x + 9} y2={y} stroke="#5c3a1e" strokeWidth={1.4} />
      <line x1={x - 9} y1={y + 9} x2={x + 9} y2={y + 9} stroke="#5c3a1e" strokeWidth={1.4} />
    </g>
  );
}

// ── Nature area: rocks and shrubs sitting directly on the lawn ──
export function RockCluster({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const rocks = [
    { dx: -10, dy: 0, r: 7, c: '#9b9186' }, { dx: 7, dy: 3, r: 5.2, c: '#847a70' }, { dx: -1, dy: -5, r: 4.4, c: '#a89e93' },
  ];
  return (
    <g style={{ transformOrigin: `${x}px ${y}px`, transform: `scale(${scale})` }}>
      <ellipse cx={x} cy={y + 6} rx={20} ry={6} fill="rgba(0,0,0,0.16)" />
      {rocks.map((r, i) => (
        <ellipse key={i} cx={x + r.dx} cy={y + r.dy} rx={r.r} ry={r.r * 0.75} fill={r.c} stroke="rgba(0,0,0,0.22)" strokeWidth={0.6} />
      ))}
    </g>
  );
}

export function Shrub({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 8 * scale} rx={13 * scale} ry={4 * scale} fill="rgba(0,0,0,0.15)" />
      <ellipse cx={x - 5 * scale} cy={y + 1 * scale} rx={9 * scale} ry={7 * scale} fill="#4a8f3e" />
      <ellipse cx={x + 5 * scale} cy={y + 2 * scale} rx={8 * scale} ry={6 * scale} fill="#5aa04a" />
      <ellipse cx={x} cy={y - 3 * scale} rx={7 * scale} ry={6 * scale} fill="#6bb058" />
    </g>
  );
}

// ── Secondary landmark — a windmill built from the same palette and
// shading technique as the Barn (matching roof red, matching cross-window,
// a stone base for the same grounded weight) so the two buildings read as
// belonging to one farm rather than two different art styles. ──
export function Windmill({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g style={{ transformOrigin: `${x}px ${y}px`, transform: `scale(${scale})` }}>
      <ellipse cx={x + 6} cy={y + 74} rx={30} ry={9} fill="rgba(0,0,0,0.2)" />
      {/* Stone base — the same "grounded" weight the Barn gets from its walls */}
      <path d={`M${x - 15},${y + 70} L${x - 15},${y + 58} L${x + 15},${y + 58} L${x + 15},${y + 70} Z`} fill="#8f8478" stroke="#5c5349" strokeWidth={1.2} />
      {[-9, -1, 7].map(dx => (
        <line key={dx} x1={x + dx} y1={y + 59} x2={x + dx} y2={y + 69} stroke="#5c5349" strokeWidth={0.8} opacity={0.5} />
      ))}
      {/* Tapered tower, warmed to the Barn's cream/tan gable tone */}
      <path d={`M${x - 12},${y + 60} L${x - 7},${y - 10} L${x + 7},${y - 10} L${x + 12},${y + 60} Z`}
        fill="#e8d9a8" stroke="#8a5a2b" strokeWidth={1.5} />
      <path d={`M${x - 12},${y + 60} L${x - 7},${y - 10} L${x - 2},${y - 10} L${x - 5},${y + 60} Z`} fill="#d9c690" />
      {/* Plank seams */}
      {[10, 26, 42].map(dy => (
        <line key={dy} x1={x - 11 + dy * 0.06} y1={y + dy} x2={x + 11 - dy * 0.06} y2={y + dy} stroke="#8a5a2b" strokeWidth={0.7} opacity={0.45} />
      ))}
      {/* Door + the Barn's cross-in-circle window, not a mismatched cyan porthole */}
      <rect x={x - 5} y={y + 42} width={10} height={18} rx={4} fill="#4a2a1a" />
      <circle cx={x} cy={y + 22} r={4.6} fill="#e8d9a8" stroke="#6b201c" strokeWidth={1} />
      <line x1={x - 4.2} y1={y + 22} x2={x + 4.2} y2={y + 22} stroke="#6b201c" strokeWidth={0.8} />
      <line x1={x} y1={y + 17.4} x2={x} y2={y + 26.6} stroke="#6b201c" strokeWidth={0.8} />
      {/* Cap — the exact roof red the Barn uses, so the two structures read as one farm */}
      <path d={`M${x - 9},${y - 10} Q${x},${y - 26} ${x + 9},${y - 10} Z`} fill="#7a2a24" />
      <path d={`M${x - 9},${y - 10} Q${x - 3},${y - 24} ${x + 1},${y - 21} Q${x - 5},${y - 15} ${x - 6},${y - 10} Z`} fill="#8f332b" opacity={0.7} />
      {/* Rotating blades, hub slightly proud of the cap */}
      <motion.g
        style={{ transformOrigin: `${x}px ${y - 16}px` }}
        animate={{ rotate: 360 }} transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
      >
        {[0, 90, 180, 270].map(a => (
          <g key={a} transform={`rotate(${a} ${x} ${y - 16})`}>
            <rect x={x - 2.6} y={y - 16 - 30} width={5.2} height={30} rx={2.2} fill="#f4ede0" stroke="#8a5a2b" strokeWidth={1} />
            <rect x={x - 2.6} y={y - 16 - 30} width={2} height={30} fill="#d9c690" />
            <line x1={x} y1={y - 16 - 6} x2={x} y2={y - 16 - 27} stroke="#8a7a5a" strokeWidth={0.8} />
          </g>
        ))}
        <circle cx={x} cy={y - 16} r={3.6} fill="#6b201c" stroke="#4a1512" strokeWidth={0.6} />
      </motion.g>
    </g>
  );
}

// ── Major landmark: a red barn — doubles as the farmhouse landmark. ──
export function Barn({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g style={{ transformOrigin: `${x}px ${y}px`, transform: `scale(${scale})` }}>
      <ellipse cx={x} cy={y + 58} rx={42} ry={10} fill="rgba(0,0,0,0.2)" />
      <rect x={x - 36} y={y - 4} width={72} height={54} fill="#a83a32" stroke="#6b201c" strokeWidth={1.5} />
      <polygon points={`${x - 42},${y - 2} ${x},${y - 40} ${x + 42},${y - 2}`} fill="#7a2a24" />
      <polygon points={`${x - 42},${y - 2} ${x},${y - 40} ${x - 30},${y - 40} ${x - 40},${y - 12}`} fill="#8f332b" opacity={0.7} />
      <rect x={x - 14} y={y + 16} width={28} height={34} fill="#4a2a1a" rx={1.5} />
      <line x1={x} y1={y + 16} x2={x} y2={y + 50} stroke="#2e1810" strokeWidth={2} />
      <polygon points={`${x},${y - 30} ${x - 9},${y - 16} ${x + 9},${y - 16}`} fill="#e8d9a8" opacity={0.9} />
      <circle cx={x} cy={y - 18} r={5} fill="#e8d9a8" stroke="#6b201c" strokeWidth={1} />
      <line x1={x - 5} y1={y - 18} x2={x + 5} y2={y - 18} stroke="#6b201c" strokeWidth={0.8} />
      <line x1={x} y1={y - 23} x2={x} y2={y - 13} stroke="#6b201c" strokeWidth={0.8} />
    </g>
  );
}


// ── Compost bin — a working farm detail, not just a prop: dark turned soil
// visible inside, with a slow rising wisp to suggest it's actually "active". ──
export function CompostBin({ x, y }: { x: number; y: number }) {
  return (
    <g style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
      <ellipse cx={x} cy={y + 24} rx={26} ry={7} fill="rgba(0,0,0,0.18)" />
      <path d={`M${x - 22},${y - 6} L${x - 18},${y + 20} L${x + 18},${y + 20} L${x + 22},${y - 6} Z`}
        fill="#7a5230" stroke="#4f2f16" strokeWidth={1.2} />
      {[-13, -2, 9].map(dx => (
        <line key={dx} x1={x + dx * 0.94 - 6} y1={y - 4} x2={x + dx * 0.86 - 6} y2={y + 19} stroke="#4f2f16" strokeWidth={1} opacity={0.5} />
      ))}
      <ellipse cx={x} cy={y - 6} rx={21} ry={6} fill="#4a2f1e" />
      <ellipse cx={x - 3} cy={y - 8} rx={15} ry={4.2} fill="#3a2a1a" />
      <ellipse cx={x - 5} cy={y - 9} rx={4} ry={2} fill="#6b4a2e" opacity={0.8} />
      <ellipse cx={x + 4} cy={y - 7.5} rx={3.2} ry={1.6} fill="#5a3f24" opacity={0.8} />
      <motion.ellipse
        cx={x - 2} cy={y - 14} rx={3} ry={5} fill="rgba(255,255,255,0.35)"
        animate={{ cy: [y - 14, y - 27], opacity: [0, 0.5, 0], rx: [2, 5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
      />
    </g>
  );
}

// ── A couple of stacked harvest crates — utility clutter around the shed,
// grounded by one shared contact shadow each so they read as sitting on the
// same yard rather than pasted on top of it. ──
export function Crate({ x, y, rotation = 0 }: { x: number; y: number; rotation?: number }) {
  return (
    <g transform={`rotate(${rotation} ${x} ${y})`} style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
      <ellipse cx={x} cy={y + 12} rx={14} ry={4} fill="rgba(0,0,0,0.16)" />
      <rect x={x - 13} y={y - 10} width={26} height={20} rx={1.5} fill="#c9a877" stroke="#8a5a2b" strokeWidth={1.3} />
      <line x1={x - 13} y1={y - 3} x2={x + 13} y2={y - 3} stroke="#8a5a2b" strokeWidth={1} />
      <line x1={x - 13} y1={y + 4} x2={x + 13} y2={y + 4} stroke="#8a5a2b" strokeWidth={1} />
      <line x1={x - 8} y1={y - 10} x2={x - 8} y2={y + 10} stroke="#8a5a2b" strokeWidth={1} />
      <line x1={x + 8} y1={y - 10} x2={x + 8} y2={y + 10} stroke="#8a5a2b" strokeWidth={1} />
      <ellipse cx={x - 2} cy={y - 3} rx={9} ry={7} fill="#e6412c" opacity={0.9} />
      <ellipse cx={x + 5} cy={y - 1} rx={6} ry={5} fill="#f4c430" opacity={0.9} />
    </g>
  );
}

// ── A hoe and rake leaning together — one grounded prop, not two floating
// tools — reinforcing "working farm" beside the shed. ──
export function ToolRack({ x, y }: { x: number; y: number }) {
  return (
    <g style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
      <ellipse cx={x} cy={y + 30} rx={16} ry={4.5} fill="rgba(0,0,0,0.18)" />
      <line x1={x - 8} y1={y + 28} x2={x + 2} y2={y - 34} stroke="#a9723f" strokeWidth={3} strokeLinecap="round" />
      <rect x={x - 3} y={y - 40} width={14} height={6} rx={2} fill="#6b7280" transform={`rotate(-14 ${x - 3} ${y - 40})`} />
      <line x1={x + 6} y1={y + 28} x2={x + 12} y2={y - 32} stroke="#a9723f" strokeWidth={3} strokeLinecap="round" />
      <g transform={`rotate(-8 ${x + 12} ${y - 32})`}>
        <rect x={x + 4} y={y - 36} width={16} height={5} fill="#8a5a2b" />
        {[0, 1, 2, 3].map(i => (
          <line key={i} x1={x + 6 + i * 4} y1={y - 36} x2={x + 6 + i * 4} y2={y - 30} stroke="#5c3a1e" strokeWidth={1.4} />
        ))}
      </g>
    </g>
  );
}

// ── A short irrigation channel carrying water from the pond toward the
// field's edge — environmental storytelling, not a new gameplay mechanic. ──
export function IrrigationChannel({ points, width = 10 }: { points: [number, number][]; width?: number }) {
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  return (
    <g>
      <path d={d} fill="none" stroke="#8a7a6a" strokeWidth={width + 6} strokeLinecap="round" opacity={0.55} />
      <path d={d} fill="none" stroke="#5a9bb8" strokeWidth={width} strokeLinecap="round" />
      <motion.path
        d={d} fill="none" stroke="#bfe6f2" strokeWidth={width * 0.4} strokeLinecap="round" opacity={0.6}
        animate={{ opacity: [0.4, 0.75, 0.4] }} transition={{ duration: 2.4, repeat: Infinity }}
      />
    </g>
  );
}

// ── Wood-plank bed edging — laid along the bed boundary (always touching
// soil + grass) instead of individual 🪵 glyphs dropped at points around the
// mound. Currently unused by GardenGrid but kept available. ──
export function WoodBedEdge({ points }: { points: [number, number][] }) {
  const segs = points.map((a, i) => {
    const b = points[(i + 1) % points.length];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return { mx, my, len, angle };
  });
  return (
    <g style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}>
      {segs.map((s, i) => (
        <rect key={i} x={s.mx - s.len / 2} y={s.my - 3} width={s.len} height={6} rx={3}
          fill="#8a5a2b" stroke="#4f2f16" strokeWidth={0.6} transform={`rotate(${s.angle} ${s.mx} ${s.my})`} />
      ))}
      {points.map(([px, py], i) => (
        <circle key={`end${i}`} cx={px} cy={py} r={3.4} fill="#c9a877" stroke="#5c3a1e" strokeWidth={0.6} />
      ))}
    </g>
  );
}