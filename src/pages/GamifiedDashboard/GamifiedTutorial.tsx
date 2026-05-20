import { useState, useEffect, useRef } from 'react';

// ─── Logo SVG ─────────────────────────────────────────────────────────────────
const AgriCoolLogo = ({
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
      width={size}
      height={size * 1.45}
      viewBox="0 0 200 290"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: isExcited ? 'drop-shadow(0 0 18px #F5D80088)' : 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))',
        transition: 'filter 0.4s ease',
        ...(animate
          ? { animation: isCelebrate ? 'mascot-bounce 0.5s ease infinite alternate' : 'mascot-float 3s ease-in-out infinite' }
          : {}),
      }}
    >
      <g transform="translate(15, 10)">
        <path d="M80 240 C10 190 -10 90 60 20 C100 -15 175 15 185 90 C195 165 140 220 80 240Z" fill="#F5D800" style={{ transition: 'fill 0.3s' }} />
        <path d="M80 240 C55 200 45 145 70 90 C88 48 148 30 170 85 C188 130 155 200 80 240Z" fill="#7DC400" />
        <path d="M80 240 Q74 260 60 272" fill="none" stroke="#4a8a00" strokeWidth="5" strokeLinecap="round" />
        <rect x="22" y="100" width="52" height="34" rx="10" fill="#1a1a1a" />
        {expression === 'wink' ? (
          <rect x="88" y="109" width="52" height="16" rx="8" fill="#1a1a1a" />
        ) : (
          <rect x="88" y="100" width="52" height="34" rx="10" fill="#1a1a1a" />
        )}
        <rect x="74" y="112" width="14" height="7" rx="3" fill="#1a1a1a" />
        <rect x="4"  y="109" width="18" height="7" rx="3" fill="#1a1a1a" />
        <rect x="140" y="109" width="18" height="7" rx="3" fill="#1a1a1a" />
        <ellipse cx="40"  cy="111" rx="8" ry="5" fill="#fff" opacity="0.25" />
        {expression !== 'wink' && <ellipse cx="106" cy="111" rx="8" ry="5" fill="#fff" opacity="0.25" />}
        {isExcited ? (
          <path d="M60 165 Q80 185 105 165" fill="none" stroke="#4a8a00" strokeWidth="5" strokeLinecap="round" />
        ) : expression === 'wink' ? (
          <path d="M65 165 Q85 172 100 162" fill="none" stroke="#4a8a00" strokeWidth="4" strokeLinecap="round" />
        ) : (
          <path d="M62 162 Q82 176 105 162" fill="none" stroke="#4a8a00" strokeWidth="4" strokeLinecap="round" />
        )}
        {isCelebrate && (
          <>
            <text x="155" y="55" fontSize="22" style={{ userSelect: 'none' }}>⭐</text>
            <text x="5"   y="70" fontSize="18" style={{ userSelect: 'none' }}>✨</text>
            <text x="145" y="200" fontSize="16" style={{ userSelect: 'none' }}>🎉</text>
          </>
        )}
      </g>
    </svg>
  );
};

// ─── XP bar ───────────────────────────────────────────────────────────────────
const XPBar = ({ xp, maxXp = 100 }: { xp: number; maxXp?: number }) => (
  <div style={{ width: '100%', marginBottom: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', letterSpacing: 1, textTransform: 'uppercase' }}>
        ⚡ Tutorial XP
      </span>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#14532d' }}>{xp} / {maxXp}</span>
    </div>
    <div style={{ height: 10, background: '#d1fae5', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${(xp / maxXp) * 100}%`,
        background: 'linear-gradient(90deg, #4ade80, #16a34a)',
        borderRadius: 99,
        transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: '0 0 8px #4ade8088',
      }} />
    </div>
  </div>
);

// ─── Step dots ────────────────────────────────────────────────────────────────
const StepDots = ({ total, current, accent }: { total: number; current: number; accent: string }) => (
  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{
        width: i === current ? 22 : 8,
        height: 8,
        borderRadius: 99,
        background: i === current ? accent : i < current ? accent + '66' : '#e5e7eb',
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: i === current ? `0 0 8px ${accent}88` : 'none',
      }} />
    ))}
  </div>
);

// ─── Floating particles for celebrate ─────────────────────────────────────────
const Particles = () => {
  const items = ['🌾', '🎟️', '⭐', '🌱', '✨', '🔥', '🏆', '🎉'];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 28 }}>
      {items.map((emoji, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${10 + i * 11}%`,
          top: '100%',
          fontSize: 18,
          animation: `particle-rise ${1.4 + i * 0.2}s ease-out ${i * 0.1}s forwards`,
          opacity: 0,
        }}>
          {emoji}
        </div>
      ))}
    </div>
  );
};

// ─── Interactive: Crop Queue Simulator ───────────────────────────────────────
const FakeCropQueue = ({ onInteract }: { onInteract: () => void }) => {
  const crops = ['🌱 Pechay', '🍅 Tomato', '🥬 Kangkong', '🫑 Sili'];
  const [selected, setSelected] = useState<string | null>(null);
  const [days, setDays] = useState(0);
  const [queued, setQueued] = useState(false);

  const handleQueue = () => {
    if (selected && days >= 0) {
      setQueued(true);
      onInteract();
    }
  };

  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Pick a crop:</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {crops.map(c => (
          <button
            key={c}
            onClick={() => setSelected(c)}
            style={{
              background: selected === c ? '#059669' : 'white',
              color: selected === c ? 'white' : '#374151',
              border: `1.5px solid ${selected === c ? '#059669' : '#d1d5db'}`,
              borderRadius: 8, padding: '5px 10px', fontSize: 12,
              fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Days in ground:</span>
        <input
          type="number" min={0} max={10} value={days}
          onChange={e => setDays(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
          style={{
            width: 60, border: '1.5px solid #d1d5db', borderRadius: 8,
            padding: '4px 8px', fontSize: 13, textAlign: 'center',
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        <span style={{ fontSize: 11, color: '#9ca3af' }}>max 10</span>
      </div>
      {!queued ? (
        <button
          onClick={handleQueue}
          disabled={!selected}
          style={{
            background: selected ? '#059669' : '#e5e7eb',
            color: selected ? 'white' : '#9ca3af',
            border: 'none', borderRadius: 8, padding: '8px',
            fontSize: 13, fontWeight: 700, cursor: selected ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }}
        >
          🌱 Queue Crop
        </button>
      ) : (
        <div style={{
          background: '#f0fdf4', border: '1.5px solid #86efac',
          borderRadius: 8, padding: '8px 12px',
          fontSize: 12, fontWeight: 700, color: '#16a34a',
        }}>
          ✅ {selected} queued! Day {days} locked in — timeline started!
        </div>
      )}
    </div>
  );
};

// ─── Interactive: Daily Task Checklist ───────────────────────────────────────
const FakeTaskChecklist = ({ onInteract }: { onInteract: () => void }) => {
  const tasks = ['💧 Water crop', '☀️ Check shading', '🐛 Pest inspection'];
  const [checked, setChecked] = useState<boolean[]>([false, false, false]);
  const [done, setDone] = useState(false);

  const toggle = (i: number) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
    if (next.filter(Boolean).length >= 2 && !done) {
      setDone(true);
      onInteract();
    }
  };

  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Today's tasks — check at least 2:</div>
      {tasks.map((task, i) => (
        <div
          key={task}
          onClick={() => toggle(i)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
            background: checked[i] ? '#f0fdf4' : 'white',
            border: `1.5px solid ${checked[i] ? '#86efac' : '#e5e7eb'}`,
            transition: 'all 0.2s',
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: 6,
            border: `2px solid ${checked[i] ? '#16a34a' : '#d1d5db'}`,
            background: checked[i] ? '#16a34a' : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.2s', fontSize: 12,
          }}>
            {checked[i] ? '✓' : ''}
          </div>
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: checked[i] ? '#15803d' : '#374151',
            textDecoration: checked[i] ? 'line-through' : 'none',
          }}>
            {task}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>±15 min window</span>
        </div>
      ))}
      {done && (
        <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
          ✅ Tasks complete! Missing 4+ tasks in a day blocks your photo upload.
        </div>
      )}
    </div>
  );
};

// ─── Interactive: Fake Photo Upload ──────────────────────────────────────────
const FakePhotoUpload = ({ onInteract }: { onInteract: () => void }) => {
  const [uploaded, setUploaded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const handleUpload = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setUploaded(true);
      onInteract();
    }, 1800);
  };

  return (
    <div style={{ marginTop: 12 }}>
      {!uploaded && !analyzing && (
        <div
          onClick={handleUpload}
          style={{
            border: '2px dashed #7c3aed', borderRadius: 12,
            padding: '18px', textAlign: 'center', cursor: 'pointer',
            background: '#fdf4ff',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3e8ff'}
          onMouseLeave={e => e.currentTarget.style.background = '#fdf4ff'}
        >
          <div style={{ fontSize: 28, marginBottom: 4 }}>📸</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>Click to simulate upload</div>
          <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 2 }}>AI will analyze your photo</div>
        </div>
      )}
      {analyzing && (
        <div style={{
          border: '2px solid #7c3aed', borderRadius: 12, padding: '18px',
          textAlign: 'center', background: '#fdf4ff',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', marginBottom: 6 }}>
            🤖 Claude AI is analyzing your crop photo…
          </div>
          <div style={{
            height: 6, background: '#f3e8ff', borderRadius: 99, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: '70%',
              background: 'linear-gradient(90deg, #a78bfa, #7c3aed)',
              borderRadius: 99,
              animation: 'ai-scan 1.8s ease forwards',
            }} />
          </div>
          <style>{`@keyframes ai-scan { from { width: 0% } to { width: 90% } }`}</style>
        </div>
      )}
      {uploaded && (
        <div style={{
          border: '1.5px solid #86efac', borderRadius: 12, padding: '14px',
          background: '#f0fdf4',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>
            ✅ Photo Verified! +1 Progress Point
          </div>
          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
            🤖 <strong>AI says:</strong> Plant looks healthy! Leaves are vibrant green with no visible pest damage. Keep up the great work! 🌿
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Interactive: Token Counter ───────────────────────────────────────────────
const FakeTokenCounter = ({ onInteract }: { onInteract: () => void }) => {
  const [points, setPoints] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [interacted, setInteracted] = useState(false);

  const addPoint = () => {
    const newPoints = points + 1;
    setPoints(newPoints);
    const newTokens = Math.floor(newPoints / 2);
    setTokens(newTokens);
    if (!interacted) {
      setInteracted(true);
      onInteract();
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap',
      }}>
        <div style={{
          flex: 1, background: '#fffbeb', border: '1.5px solid #fde68a',
          borderRadius: 10, padding: '10px 14px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#d97706' }}>{points}</div>
          <div style={{ fontSize: 11, color: '#92400e', fontWeight: 700 }}>Progress Points</div>
        </div>
        <div style={{
          flex: 1, background: '#f0fdf4', border: '1.5px solid #86efac',
          borderRadius: 10, padding: '10px 14px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#16a34a' }}>{tokens}</div>
          <div style={{ fontSize: 11, color: '#166534', fontWeight: 700 }}>Free Tokens 🎟️</div>
        </div>
      </div>
      <button
        onClick={addPoint}
        style={{
          width: '100%', background: '#d97706', color: 'white',
          border: 'none', borderRadius: 8, padding: '9px',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          transition: 'transform 0.1s',
        }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        📸 Simulate Verified Photo (+1 point)
      </button>
      {points > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#d97706', fontWeight: 700 }}>
          {points % 2 === 0
            ? `🎟️ Earned ${tokens} token${tokens !== 1 ? 's' : ''}! Each saves you ₱20 in the Marketplace.`
            : `${2 - (points % 2)} more point${2 - (points % 2) !== 1 ? 's' : ''} for your next free token!`}
        </div>
      )}
    </div>
  );
};

// ─── Interactive: Wilt Recovery ───────────────────────────────────────────────
const FakeWiltRecovery = ({ onInteract }: { onInteract: () => void }) => {
  const [state, setState] = useState<'wilted' | 'recovering' | 'recovered'>('wilted');

  const handleRecover = () => {
    setState('recovering');
    setTimeout(() => {
      setState('recovered');
      onInteract();
    }, 1400);
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        borderRadius: 10, padding: '12px 14px',
        background: state === 'wilted' ? '#fff1f2' : state === 'recovering' ? '#fffbeb' : '#f0fdf4',
        border: `1.5px solid ${state === 'wilted' ? '#fecdd3' : state === 'recovering' ? '#fde68a' : '#86efac'}`,
        transition: 'all 0.4s ease',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: state === 'wilted' ? '#e11d48' : state === 'recovering' ? '#d97706' : '#16a34a' }}>
          {state === 'wilted' && '🥀 Your crop wilted! Streak reset -1.'}
          {state === 'recovering' && '🌿 Submitting recovery photo…'}
          {state === 'recovered' && '✅ Recovered! -1 point but still in the game!'}
        </div>
      </div>
      {state === 'wilted' && (
        <button
          onClick={handleRecover}
          style={{
            marginTop: 8, background: '#e11d48', color: 'white',
            border: 'none', borderRadius: 8, padding: '8px 16px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          📸 Submit Recovery Photo
        </button>
      )}
    </div>
  );
};

// ─── Interactive: Harvest Badge ───────────────────────────────────────────────
const FakeHarvestBadge = ({ onInteract }: { onInteract: () => void }) => {
  const [claimed, setClaimed] = useState(false);

  const handleClaim = () => {
    setClaimed(true);
    onInteract();
  };

  return (
    <div style={{ marginTop: 12, textAlign: 'center' }}>
      {!claimed ? (
        <>
          <div style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
            border: '2px solid #fdba74',
            borderRadius: 16, padding: '16px 24px', marginBottom: 10,
          }}>
            <div style={{ fontSize: 36, marginBottom: 4 }}>🌾</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#ea580c' }}>HARVEST BADGE</div>
            <div style={{ fontSize: 11, color: '#9a3412' }}>10 points achieved!</div>
          </div>
          <br />
          <button
            onClick={handleClaim}
            style={{
              background: '#ea580c', color: 'white', border: 'none',
              borderRadius: 99, padding: '10px 24px',
              fontSize: 13, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 4px 14px #ea580c55',
            }}
          >
            🏅 Claim Harvest Badge!
          </button>
        </>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg, #fff7ed, #fef3c7)',
          border: '2px solid #fbbf24', borderRadius: 16, padding: '16px',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#ea580c' }}>
            Badge claimed! Download it and share your harvest!
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Interactive: Leaderboard Preview ─────────────────────────────────────────
const FakeLeaderboard = ({ onInteract }: { onInteract: () => void }) => {
  const [voted, setVoted] = useState(false);
  const players = [
    { name: 'Maria F.', pts: 42, emoji: '🥇' },
    { name: 'Jose M.',  pts: 35, emoji: '🥈' },
    { name: 'You',      pts: 18, emoji: '🥉', isYou: true },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      {players.map((p, i) => (
        <div key={p.name} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 10, marginBottom: 5,
          background: p.isYou ? '#f0fdf4' : 'white',
          border: `1.5px solid ${p.isYou ? '#86efac' : '#e5e7eb'}`,
        }}>
          <span style={{ fontSize: 18 }}>{p.emoji}</span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: p.isYou ? 800 : 600, color: p.isYou ? '#15803d' : '#374151' }}>
            {p.name}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{p.pts} pts</span>
        </div>
      ))}
      {!voted ? (
        <button
          onClick={() => { setVoted(true); onInteract(); }}
          style={{
            marginTop: 6, width: '100%', background: '#16a34a', color: 'white',
            border: 'none', borderRadius: 8, padding: '8px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          👆 I want to climb the leaderboard!
        </button>
      ) : (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: '#16a34a' }}>
          🔥 That's the spirit! Keep farming to climb higher!
        </div>
      )}
    </div>
  );
};

// ─── Step definitions ─────────────────────────────────────────────────────────
type InteractiveComponent =
  | 'queueCrop'
  | 'taskChecklist'
  | 'photoUpload'
  | 'tokenCounter'
  | 'wiltRecovery'
  | 'harvestBadge'
  | 'leaderboard'
  | null;

type Step = {
  id: number;
  title: string;
  body: string;
  tip?: string;
  expression: 'normal' | 'excited' | 'wink' | 'celebrate';
  icon: string;
  bg: string;
  accent: string;
  xp: number;
  interactive: InteractiveComponent;
  interactLabel?: string;
};

const STEPS: Step[] = [
  {
    id: 0,
    title: "Hey Farmer, I'm Kool! 👋",
    body: "Welcome to the AgriCool Crop Tracker! I'm your guide — a chill leaf with shades. Let's walk through everything you need to know to start earning Free Listing Tokens. And don't worry — you'll get to try things out as we go!",
    expression: 'excited',
    icon: '🌿',
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    accent: '#16a34a',
    xp: 0,
    interactive: null,
  },
  {
    id: 1,
    title: 'Queue Your Crops 🌱',
    body: "First, pick a crop and tell us how many days it's already been in the ground — maximum 10 days. This locks your timeline. Once you start, there's no going back!",
    tip: '💡 Try queueing a crop below to see how it works!',
    expression: 'normal',
    icon: '🌱',
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)',
    accent: '#059669',
    xp: 12,
    interactive: 'queueCrop',
    interactLabel: 'Queue a crop above to continue →',
  },
  {
    id: 2,
    title: 'Complete Daily Tasks ✅',
    body: "Every crop gets its own care schedule — watering, shading, pest checks. Each task has a 30-minute window (±15 min from the scheduled time). Miss the window? Task fails.",
    tip: '⚠️ If 4 or more tasks fail in one day, your photo upload for that day is blocked.',
    expression: 'wink',
    icon: '📋',
    bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    accent: '#2563eb',
    xp: 25,
    interactive: 'taskChecklist',
    interactLabel: 'Check at least 2 tasks to continue →',
  },
  {
    id: 3,
    title: 'Upload a Photo Every 3 Days 📸',
    body: "Every 3 days, a 48-hour verification window opens. Upload a real photo of your crop — our AI (powered by Claude) checks the plant's health and gives you instant feedback!",
    tip: '🤖 Click the upload area below to simulate a photo verification!',
    expression: 'excited',
    icon: '📸',
    bg: 'linear-gradient(135deg, #fdf4ff 0%, #f3e8ff 100%)',
    accent: '#7c3aed',
    xp: 40,
    interactive: 'photoUpload',
    interactLabel: 'Upload a photo above to continue →',
  },
  {
    id: 4,
    title: 'Earn Progress Points & Tokens 🎟️',
    body: "Each successful photo = +1 progress point. Every 2 points earns you 1 Free Listing Token — that's ₱20 you save every time you list a crop on the marketplace!",
    tip: '🔥 Keep a 3-verification streak and get a BONUS token on top!',
    expression: 'celebrate',
    icon: '🎟️',
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    accent: '#d97706',
    xp: 55,
    interactive: 'tokenCounter',
    interactLabel: 'Click the button to simulate earning points →',
  },
  {
    id: 5,
    title: "Don't Let Your Crop Wilt! 🥀",
    body: "Miss a verification window entirely and your crop wilts — your streak resets down by 1. But don't give up! Submit a recovery photo to get back on track (costs -1 point).",
    tip: '✅ Recovery is always worth it — a wilted crop can still earn tokens!',
    expression: 'wink',
    icon: '🥀',
    bg: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
    accent: '#e11d48',
    xp: 68,
    interactive: 'wiltRecovery',
    interactLabel: 'Submit a recovery photo to continue →',
  },
  {
    id: 6,
    title: 'Harvest at 10 Points 🌾',
    body: "Hit 10 progress points and your crop is harvest-ready! Submit a harvest photo to complete your journey and unlock a downloadable Harvest Badge — proof of your hard work.",
    tip: '🏅 Share your badge on social media and show off your farming skills!',
    expression: 'celebrate',
    icon: '🌾',
    bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    accent: '#ea580c',
    xp: 80,
    interactive: 'harvestBadge',
    interactLabel: 'Claim your harvest badge to continue →',
  },
  {
    id: 7,
    title: "Climb the Leaderboard 🏆",
    body: "All your points add up on the Top Farmers Leaderboard. Compete with other farmers for the top spot — the more crops you verify and harvest, the higher you rank!",
    tip: '🥇 Top farmers get bragging rights AND inspire the whole community.',
    expression: 'excited',
    icon: '🏆',
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)',
    accent: '#16a34a',
    xp: 90,
    interactive: 'leaderboard',
    interactLabel: 'Tap the button in the leaderboard to continue →',
  },
  {
    id: 8,
    title: "You're Ready to Farm! 🚀",
    body: "That's everything, farmer! Queue your first crop, complete your tasks, and start earning tokens. The harvest won't wait — let's grow something great together!",
    expression: 'celebrate',
    icon: '🚀',
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    accent: '#16a34a',
    xp: 100,
    interactive: null,
  },
];

// ─── Main tutorial component ──────────────────────────────────────────────────
type GamifiedTutorialProps = {
  onComplete: () => void;
  onSkip: () => void;
};

const GamifiedTutorial = ({ onComplete, onSkip }: GamifiedTutorialProps) => {
  const [stepIdx, setStepIdx]       = useState(0);
  const [xp, setXp]                 = useState(0);
  const [animateIn, setAnimateIn]   = useState(true);
  const [leaving, setLeaving]       = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const isCelebrate = step.expression === 'celebrate';
  const requiresInteraction = step.interactive !== null && !interacted;

  useEffect(() => {
    const target = STEPS[stepIdx].xp;
    const timer = setTimeout(() => setXp(target), 300);
    return () => clearTimeout(timer);
  }, [stepIdx]);

  useEffect(() => {
    if (xp > 0 && xp % 30 === 0) {
      setShowReward(true);
      setTimeout(() => setShowReward(false), 1200);
    }
  }, [xp]);

  // Reset interaction gate on step change
  useEffect(() => {
    setInteracted(false);
  }, [stepIdx]);

  const goNext = () => {
    if (leaving || requiresInteraction) return;
    setLeaving(true);
    setTimeout(() => {
      setLeaving(false);
      setAnimateIn(true);
      if (isLast) {
        onComplete();
      } else {
        setStepIdx(i => i + 1);
      }
    }, 260);
  };

  const goPrev = () => {
    if (leaving || stepIdx === 0) return;
    setLeaving(true);
    setTimeout(() => {
      setLeaving(false);
      setAnimateIn(true);
      setStepIdx(i => i - 1);
    }, 260);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'ArrowRight' || e.key === 'Enter') && !requiresInteraction) goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, leaving, interacted]);

  const handleInteract = () => setInteracted(true);

  return (
    <>
      <style>{`
        @keyframes mascot-float {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-12px) rotate(1deg); }
        }
        @keyframes mascot-bounce {
          0%   { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-14px) scale(1.06); }
        }
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(40px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes slide-out-left {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(-40px) scale(0.97); }
        }
        @keyframes particle-rise {
          0%   { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(-220px) rotate(360deg); }
        }
        @keyframes reward-pop {
          0%   { opacity: 0; transform: scale(0.5) translateY(10px); }
          60%  { opacity: 1; transform: scale(1.2) translateY(-8px); }
          100% { opacity: 0; transform: scale(1) translateY(-20px); }
        }
        @keyframes overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes card-in {
          from { opacity: 0; transform: scale(0.92) translateY(24px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
        .tut-btn-primary {
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 99px;
          padding: 13px 28px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 16px var(--accent-glow);
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          letter-spacing: 0.3px;
        }
        .tut-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px var(--accent-glow);
        }
        .tut-btn-primary:active:not(:disabled) { transform: translateY(0); }
        .tut-btn-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          animation: shake 0.4s ease;
        }
        .tut-btn-secondary {
          background: transparent;
          color: #6b7280;
          border: 1.5px solid #e5e7eb;
          border-radius: 99px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .tut-btn-secondary:hover { border-color: #9ca3af; color: #374151; }
        .tut-skip {
          background: transparent;
          border: none;
          color: #9ca3af;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          padding: 6px 10px;
          border-radius: 8px;
          transition: color 0.15s;
        }
        .tut-skip:hover { color: #6b7280; }
        .interact-hint {
          animation: pulse-hint 1.4s ease-in-out infinite;
        }
        @keyframes pulse-hint {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        animation: 'overlay-in 0.3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        overflowY: 'auto',
      }}>
        {/* Card */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Tutorial step ${stepIdx + 1}: ${step.title}`}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 500,
            borderRadius: 28,
            background: step.bg,
            boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
            overflow: 'hidden',
            animation: leaving
              ? 'slide-out-left 0.26s ease forwards'
              : animateIn
              ? 'card-in 0.4s cubic-bezier(0.34,1.2,0.64,1) both'
              : 'none',
            '--accent': step.accent,
            '--accent-glow': step.accent + '55',
          } as React.CSSProperties}
          onAnimationEnd={() => setAnimateIn(false)}
        >
          {isCelebrate && <Particles />}

          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 0' }}>
            <XPBar xp={xp} />
          </div>

          {/* Step badge + skip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 22px 0' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: step.accent + '18', borderRadius: 99,
              padding: '4px 12px',
            }}>
              <span style={{ fontSize: 16 }}>{step.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: step.accent, letterSpacing: 1, textTransform: 'uppercase' }}>
                Step {stepIdx + 1} of {STEPS.length}
              </span>
            </div>
            <button className="tut-skip" onClick={onSkip}>Skip tutorial</button>
          </div>

          {/* Mascot + content */}
          <div style={{ padding: '12px 28px 8px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* Mascot column */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
              <AgriCoolLogo size={80} animate expression={step.expression} />
              <div style={{
                width: 2, flex: 1, minHeight: 16,
                background: `linear-gradient(to bottom, ${step.accent}44, transparent)`,
                marginTop: 4,
              }} />
            </div>

            {/* Speech bubble */}
            <div style={{
              flex: 1,
              background: '#fff',
              borderRadius: '4px 20px 20px 20px',
              padding: '16px 18px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              position: 'relative',
              marginTop: 10,
            }}>
              {/* Bubble tail */}
              <div style={{
                position: 'absolute', left: -10, top: 14,
                width: 0, height: 0,
                borderTop: '10px solid transparent',
                borderBottom: '0px solid transparent',
                borderRight: '10px solid #fff',
              }} />

              <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 900, color: '#14532d', letterSpacing: '-0.3px', lineHeight: 1.3 }}>
                {step.title}
              </h2>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: '#374151', lineHeight: 1.65, fontWeight: 500 }}>
                {step.body}
              </p>
              {step.tip && (
                <div style={{
                  background: step.accent + '12',
                  border: `1.5px solid ${step.accent}33`,
                  borderRadius: 10,
                  padding: '8px 12px',
                  marginBottom: 4,
                }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: step.accent, lineHeight: 1.5 }}>
                    {step.tip}
                  </p>
                </div>
              )}

              {/* Interactive widgets */}
              {step.interactive === 'queueCrop'     && <FakeCropQueue      onInteract={handleInteract} />}
              {step.interactive === 'taskChecklist' && <FakeTaskChecklist  onInteract={handleInteract} />}
              {step.interactive === 'photoUpload'   && <FakePhotoUpload    onInteract={handleInteract} />}
              {step.interactive === 'tokenCounter'  && <FakeTokenCounter   onInteract={handleInteract} />}
              {step.interactive === 'wiltRecovery'  && <FakeWiltRecovery   onInteract={handleInteract} />}
              {step.interactive === 'harvestBadge'  && <FakeHarvestBadge   onInteract={handleInteract} />}
              {step.interactive === 'leaderboard'   && <FakeLeaderboard    onInteract={handleInteract} />}

              {/* Interaction nudge */}
              {requiresInteraction && step.interactLabel && (
                <div className="interact-hint" style={{
                  marginTop: 10, fontSize: 11, fontWeight: 800,
                  color: step.accent, letterSpacing: 0.3,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  👆 {step.interactLabel}
                </div>
              )}
            </div>
          </div>

          {/* Step dots */}
          <div style={{ paddingBottom: 8 }}>
            <StepDots total={STEPS.length} current={stepIdx} accent={step.accent} />
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex', gap: 10, justifyContent: 'flex-end',
            padding: '12px 24px 24px',
            alignItems: 'center',
          }}>
            {stepIdx > 0 && (
              <button className="tut-btn-secondary" onClick={goPrev}>
                ← Back
              </button>
            )}
            <button
              className="tut-btn-primary"
              style={{ '--accent': step.accent, '--accent-glow': step.accent + '55' } as React.CSSProperties}
              onClick={goNext}
              disabled={requiresInteraction}
              title={requiresInteraction ? 'Complete the interaction above to continue' : ''}
            >
              {isLast ? "🚀 Let's Farm!" : stepIdx === 0 ? "Let's go! →" : interacted || !step.interactive ? 'Got it! →' : 'Try it first →'}
            </button>
          </div>

          {/* XP reward pop */}
          {showReward && (
            <div style={{
              position: 'absolute',
              top: '30%', left: '50%',
              transform: 'translateX(-50%)',
              background: '#16a34a',
              color: '#fff',
              borderRadius: 99,
              padding: '8px 18px',
              fontWeight: 900,
              fontSize: 18,
              pointerEvents: 'none',
              animation: 'reward-pop 1.2s ease forwards',
              zIndex: 10,
              boxShadow: '0 4px 20px #16a34a88',
              whiteSpace: 'nowrap',
            }}>
              ⚡ +XP Milestone!
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GamifiedTutorial;