import { useState, useEffect, useRef } from 'react';

// ─── Shared AgriCool mascot (same as other tutorials) ────────────────────────
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
      <span style={{ fontSize: 11, fontWeight: 800, color: '#065f46', letterSpacing: 1, textTransform: 'uppercase' }}>
        ⚡ Tutorial XP
      </span>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#064e3b' }}>{xp} / {maxXp}</span>
    </div>
    <div style={{ height: 10, background: '#a7f3d0', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${(xp / maxXp) * 100}%`,
        background: 'linear-gradient(90deg, #34d399, #059669)',
        borderRadius: 99,
        transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: '0 0 8px #34d39988',
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

// ─── Floating particles ───────────────────────────────────────────────────────
const Particles = () => {
  const items = ['🌻', '🪙', '⭐', '🌱', '✨', '🛡️', '🏆', '🎉'];
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

// ─── Interactive: Garden Grid Placer ──────────────────────────────────────────
const FakeGardenGrid = ({ onInteract }: { onInteract: () => void }) => {
  const CROPS = ['🌾 Rice', '🍅 Tomato', '🥬 Pechay', '🫑 Sili'];
  const [selected, setSelected] = useState<string | null>(null);
  const [grid, setGrid] = useState<(string | null)[]>(Array(9).fill(null));
  const [placed, setPlaced] = useState(false);

  const handleCellClick = (i: number) => {
    if (!selected || grid[i]) return;
    const next = [...grid];
    next[i] = selected;
    setGrid(next);
    if (!placed) {
      setPlaced(true);
      onInteract();
    }
  };

  const cropEmoji = (label: string) => label.split(' ')[0];

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
        Pick a crop, then tap an empty plot:
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {CROPS.map(c => (
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
      {/* 3×3 garden grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6, padding: 8,
        background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
        borderRadius: 14, border: '2px solid #6ee7b7',
      }}>
        {grid.map((cell, i) => (
          <div
            key={i}
            onClick={() => handleCellClick(i)}
            style={{
              height: 56,
              borderRadius: 10,
              background: cell ? '#f0fdf4' : selected ? '#fefce8' : '#ecfdf5',
              border: `2px ${cell ? 'solid #86efac' : selected ? 'dashed #fde68a' : 'dashed #d1fae5'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: cell ? 26 : 18,
              cursor: cell ? 'default' : selected ? 'pointer' : 'default',
              transition: 'all 0.2s',
              userSelect: 'none',
            }}
          >
            {cell ? cropEmoji(cell) : selected && !cell ? '+' : ''}
          </div>
        ))}
      </div>
      {placed && (
        <div style={{
          marginTop: 8, fontSize: 12, fontWeight: 700, color: '#059669',
          background: '#f0fdf4', padding: '6px 10px', borderRadius: 8,
          border: '1px solid #86efac',
        }}>
          ✅ Plot placed! Your queued crops will automatically appear here too.
        </div>
      )}
    </div>
  );
};

// ─── Interactive: AgriCoin Earner ─────────────────────────────────────────────
const FakeCoinEarner = ({ onInteract }: { onInteract: () => void }) => {
  const [coins, setCoins] = useState(0);
  const [done, setDone] = useState(false);
  const [lastEarned, setLastEarned] = useState('');
  const sources = [
    { label: '✅ Complete a task', reward: 5 },
    { label: '🌾 Harvest a crop',  reward: 30 },
    { label: '📸 Verify a photo',  reward: 10 },
  ];

  const earn = (source: { label: string; reward: number }) => {
    setCoins(c => c + source.reward);
    setLastEarned(`+${source.reward} from "${source.label}"`);
    if (!done) { setDone(true); onInteract(); }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
        border: '1.5px solid #fde68a', borderRadius: 12, padding: '12px 18px', marginBottom: 10,
      }}>
        <span style={{ fontSize: 28 }}>🪙</span>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#b45309' }}>{coins}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>AgriCoins</div>
        </div>
        {lastEarned && (
          <div style={{
            marginLeft: 8, fontSize: 12, color: '#b45309', fontWeight: 700,
            animation: 'coin-pop 0.5s ease',
          }}>
            {lastEarned}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sources.map(s => (
          <button
            key={s.label}
            onClick={() => earn(s)}
            style={{
              background: 'white', border: '1.5px solid #fde68a',
              borderRadius: 10, padding: '8px 14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}
          >
            <span>{s.label}</span>
            <span style={{ fontWeight: 800, color: '#b45309' }}>+{s.reward} 🪙</span>
          </button>
        ))}
      </div>
      <style>{`@keyframes coin-pop { from { opacity:0; transform:scale(0.6); } to { opacity:1; transform:scale(1); } }`}</style>
    </div>
  );
};

// ─── Interactive: Pest Attack Defender ────────────────────────────────────────
const FakePestAttack = ({ onInteract }: { onInteract: () => void }) => {
  type State = 'idle' | 'attacking' | 'defended' | 'damaged';
  const [state, setState] = useState<State>('idle');
  const [hp, setHp]       = useState(3);
  const [done, setDone]   = useState(false);

  const triggerAttack = () => {
    setState('attacking');
  };

  const defend = (item: string) => {
    setState('defended');
    if (!done) { setDone(true); onInteract(); }
    void item;
  };

  const ignore = () => {
    setHp(h => Math.max(0, h - 1));
    setState('damaged');
    setTimeout(() => setState('idle'), 1200);
  };

  const hpColor = hp === 3 ? '#16a34a' : hp === 2 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ marginTop: 12 }}>
      {/* Crop health bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>🍅 Tomato health</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: hpColor }}>{hp}/3 HP</span>
        </div>
        <div style={{ height: 8, background: '#fee2e2', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${(hp / 3) * 100}%`,
            background: `linear-gradient(90deg, ${hpColor}, ${hpColor}aa)`,
            borderRadius: 99, transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {state === 'idle' && (
        <button
          onClick={triggerAttack}
          style={{
            width: '100%', background: '#fee2e2', color: '#b91c1c',
            border: '1.5px solid #fca5a5', borderRadius: 10, padding: '10px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          🐛 Simulate Pest Attack!
        </button>
      )}

      {state === 'attacking' && (
        <div style={{ background: '#fff1f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c', marginBottom: 10 }}>
            🐛 Aphids are attacking your Tomato! Defend quickly!
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            {[
              { icon: '🪲', label: 'Pesticide', cost: '15 🪙' },
              { icon: '🧱', label: 'Scarecrow', cost: '25 🪙' },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => defend(item.label)}
                style={{
                  flex: 1, background: '#f0fdf4', color: '#14532d',
                  border: '1.5px solid #86efac', borderRadius: 10,
                  padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {item.icon} {item.label}<br />
                <span style={{ fontSize: 11, color: '#b45309' }}>{item.cost}</span>
              </button>
            ))}
            <button
              onClick={ignore}
              style={{
                flex: 1, background: '#fff7ed', color: '#c2410c',
                border: '1.5px solid #fdba74', borderRadius: 10,
                padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              😤 Ignore it<br />
              <span style={{ fontSize: 11, color: '#9ca3af' }}>-1 HP</span>
            </button>
          </div>
        </div>
      )}

      {state === 'defended' && (
        <div style={{
          background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
            🛡️ Pest defeated! Your crop is safe. Scarecrows last 3 days — replace them to stay protected!
          </div>
        </div>
      )}

      {state === 'damaged' && (
        <div style={{
          background: '#fff1f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>
            😱 Ouch! -1 HP! Defend next time or your crop will wilt.
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Interactive: Select a Plot ───────────────────────────────────────────────
const FakePlotSelect = ({ onInteract }: { onInteract: () => void }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const plots = [
    { emoji: '🍅', status: 'Healthy', hp: 3, growth: '~1 day left' },
    null,
    null,
  ];

  const select = (i: number) => {
    if (!plots[i]) return;
    setSelected(i);
    if (!done) { setDone(true); onInteract(); }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
        Tap the planted plot to inspect it:
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: selected !== null ? 10 : 0 }}>
        {plots.map((p, i) => (
          <div
            key={i}
            onClick={() => select(i)}
            style={{
              width: 64, height: 64, borderRadius: 12,
              background: selected === i ? '#f0fdf4' : p ? '#fefce8' : '#ecfdf5',
              border: `2px solid ${selected === i ? '#059669' : p ? '#fde68a' : '#d1fae5'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, cursor: p ? 'pointer' : 'default', position: 'relative',
              transition: 'all 0.2s', flexShrink: 0,
              boxShadow: selected === i ? '0 0 0 3px #05966933' : 'none',
            }}
          >
            {p ? p.emoji : ''}
            {p && selected !== i && (
              <span className="gdn-interact-hint" style={{ position: 'absolute', top: -6, right: -6, fontSize: 14 }}>👆</span>
            )}
          </div>
        ))}
      </div>
      {selected !== null && plots[selected] && (
        <div style={{
          background: '#fff', border: '1.5px solid #86efac', borderRadius: 12, padding: 12,
          animation: 'card-in 0.25s ease',
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#14532d', marginBottom: 6 }}>
            🍅 Tomato — Plot #1
          </div>
          {[
            ['Growth stage', plots[selected]!.status],
            ['Time left', plots[selected]!.growth],
            ['Health', `${plots[selected]!.hp}/3 HP`],
            ['Protection', 'Unprotected'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: '#6b7280', fontWeight: 600 }}>{k}</span>
              <span style={{ color: '#111827', fontWeight: 800 }}>{v}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#059669', fontWeight: 700, marginTop: 6 }}>
            💡 The same info panel opens in-game when you tap any plot.
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Interactive: Monitor & Care for Crop Health ──────────────────────────────
const FakeCropCare = ({ onInteract }: { onInteract: () => void }) => {
  const [growth, setGrowth] = useState(35);
  const [health, setHealth] = useState(2);
  const [done, setDone] = useState(false);
  const [lastAction, setLastAction] = useState('');

  const act = (type: 'water' | 'fertilize') => {
    if (type === 'water') {
      setHealth(h => Math.min(3, h + 1));
      setLastAction('💧 Watered — health restored!');
    } else {
      setGrowth(g => Math.min(100, g + 30));
      setLastAction('🌿 Fertilized — growth boosted!');
    }
    if (!done) { setDone(true); onInteract(); }
  };

  const stage = growth >= 100 ? 'Harvest ready! 🌟' : growth >= 60 ? 'Healthy' : 'Growing';
  const healthColor = health === 3 ? '#16a34a' : health === 2 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 12, marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 26 }}>🥬</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#374151' }}>Pechay — {stage}</div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>Checked from Garden every day</div>
          </div>
        </div>
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
            <span style={{ fontWeight: 700, color: '#6b7280' }}>🌱 Growth</span>
            <span style={{ fontWeight: 800, color: '#059669' }}>{growth}%</span>
          </div>
          <div style={{ height: 7, background: '#d1fae5', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${growth}%`, background: '#059669', borderRadius: 99, transition: 'width 0.5s ease' }} />
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
            <span style={{ fontWeight: 700, color: '#6b7280' }}>❤️ Health</span>
            <span style={{ fontWeight: 800, color: healthColor }}>{health}/3 HP</span>
          </div>
          <div style={{ height: 7, background: '#fee2e2', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(health / 3) * 100}%`, background: healthColor, borderRadius: 99, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => act('water')}
          style={{ flex: 1, background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #93c5fd', borderRadius: 10, padding: '9px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          💧 Water
        </button>
        <button
          onClick={() => act('fertilize')}
          style={{ flex: 1, background: '#f0fdf4', color: '#15803d', border: '1.5px solid #86efac', borderRadius: 10, padding: '9px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          🌿 Fertilize
        </button>
      </div>
      {lastAction && (
        <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: '#059669' }}>{lastAction}</div>
      )}
    </div>
  );
};

// ─── Interactive: Harvest a Crop ──────────────────────────────────────────────
const FakeHarvest = ({ onInteract }: { onInteract: () => void }) => {
  const [harvested, setHarvested] = useState(false);

  const harvest = () => { setHarvested(true); onInteract(); };

  return (
    <div style={{ marginTop: 12 }}>
      {!harvested ? (
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb, #fef9c3)',
          border: '2px solid #fde047', borderRadius: 14, padding: 14,
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 0 0 4px #fef08a55',
        }}>
          <span style={{ fontSize: 34 }}>🌾</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#854d0e' }}>Rice — Ready! ✨</div>
            <div style={{ fontSize: 11, color: '#a16207' }}>Fully grown and waiting to be collected.</div>
          </div>
          <button
            onClick={harvest}
            className="gdn-interact-hint"
            style={{
              background: '#d97706', color: 'white', border: 'none', borderRadius: 10,
              padding: '10px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            🌾 Harvest
          </button>
        </div>
      ) : (
        <div style={{
          background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: 14,
          textAlign: 'center', animation: 'card-in 0.3s ease',
        }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>🎉 +30 🪙</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>
            Harvested! Coins added, XP earned, and the plot is free to plant again.
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Interactive: Garden Features (shop · visit · events) ────────────────────
const FakeGardenFeatures = ({ onInteract }: { onInteract: () => void }) => {
  const [tab, setTab] = useState<'shop' | 'visit' | 'events'>('shop');
  const [done, setDone] = useState(false);
  const [equipped, setEquipped] = useState(false);
  const [leafed, setLeafed] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const markDone = () => { if (!done) { setDone(true); onInteract(); } };

  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'shop', label: '🎨 Shop' },
    { id: 'visit', label: '🏡 Visit' },
    { id: 'events', label: '🌧️ Events' },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '7px 6px', fontSize: 11.5, fontWeight: 800, borderRadius: 8,
              border: `1.5px solid ${tab === t.id ? '#059669' : '#e5e7eb'}`,
              background: tab === t.id ? '#059669' : 'white',
              color: tab === t.id ? 'white' : '#6b7280', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'shop' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
          <span style={{ fontSize: 26 }}>🌻</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Sunflower Border</div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>🪙 50 · Decorates your plot</div>
          </div>
          <button
            onClick={() => { setEquipped(true); markDone(); }}
            disabled={equipped}
            style={{
              background: equipped ? '#16a34a' : '#059669', color: 'white', border: 'none',
              borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 700, cursor: equipped ? 'default' : 'pointer',
            }}
          >
            {equipped ? '✓ Equipped' : 'Equip'}
          </button>
        </div>
      )}

      {tab === 'visit' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
          <span style={{ fontSize: 26 }}>🌻</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Maria F.'s Garden</div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>4 crops growing · 42 pts</div>
          </div>
          <button
            onClick={() => { setLeafed(true); markDone(); }}
            disabled={leafed}
            style={{
              background: leafed ? '#16a34a' : '#059669', color: 'white', border: 'none',
              borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 700, cursor: leafed ? 'default' : 'pointer',
            }}
          >
            {leafed ? '🍃 Leafed!' : '🍃 Drop a leaf'}
          </button>
        </div>
      )}

      {tab === 'events' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
          <span style={{ fontSize: 26 }}>🌧️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Rainy Season Bonus</div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>2× coins on harvest · 7 days left</div>
          </div>
          <button
            onClick={() => { setClaimed(true); markDone(); }}
            disabled={claimed}
            style={{
              background: claimed ? '#16a34a' : '#059669', color: 'white', border: 'none',
              borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 700, cursor: claimed ? 'default' : 'pointer',
            }}
          >
            {claimed ? '✓ Claimed' : 'Claim'}
          </button>
        </div>
      )}

      {done && (
        <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: '#059669' }}>
          ✅ Nice! Explore the other tabs any time — Shop, Visit, and Events are always open.
        </div>
      )}
    </div>
  );
};

// ─── Step type ────────────────────────────────────────────────────────────────
type InteractiveComponent =
  | 'gardenGrid'
  | 'plotSelect'
  | 'cropCare'
  | 'pestAttack'
  | 'harvest'
  | 'coinEarner'
  | 'gardenFeatures'
  | null;

type Step = {
  id: number;
  title: string;
  body: string;
  tip?: string;
  seconds: number; // rough reading + interaction time, used for the "time left" indicator
  expression: 'normal' | 'excited' | 'wink' | 'celebrate';
  icon: string;
  bg: string;
  accent: string;
  xp: number;
  interactive: InteractiveComponent;
  interactLabel?: string;
};

// ─── Steps ────────────────────────────────────────────────────────────────────
// 9 short steps, ~10s each ≈ 90 seconds total — matches the in-game action names
// (Plant, Water, Fertilizer, Pesticide, Scarecrow, Decorate) so nothing here feels
// like a separate lesson from the real Garden screen.
const STEPS: Step[] = [
  {
    id: 0,
    title: "Welcome to My Garden! 🌻",
    body: "Hey Farmer, I'm Kool! This is a 90-second tour of your garden. I'll show you how to plant, care for, defend, and harvest crops — then how to earn rewards.",
    seconds: 8,
    expression: 'excited',
    icon: '🌻',
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    accent: '#059669',
    xp: 0,
    interactive: null,
  },
  {
    id: 1,
    title: '1. Plant a Crop 🌱',
    body: "Pick a crop, then tap any empty plot to plant it. Your garden is a grid — plots you've queued in the Tracker also appear here automatically.",
    tip: '💡 In-game, use the 🌱 Plant tool in the toolbar to do this.',
    seconds: 10,
    expression: 'normal',
    icon: '🌱',
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)',
    accent: '#059669',
    xp: 12,
    interactive: 'gardenGrid',
    interactLabel: 'Place a crop on the grid to continue →',
  },
  {
    id: 2,
    title: '2. Select a Plot 👆',
    body: "Tap any planted plot to open its info panel — growth stage, time remaining, health, and protection status all show up instantly.",
    tip: '💡 Selecting a plot is how you check on any crop, any time.',
    seconds: 8,
    expression: 'normal',
    icon: '🔍',
    bg: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
    accent: '#ca8a04',
    xp: 24,
    interactive: 'plotSelect',
    interactLabel: 'Tap the planted plot to continue →',
  },
  {
    id: 3,
    title: '3. Monitor Crop Health ❤️',
    body: "Crops track two bars: Growth (how close to harvest) and Health (HP). Water restores health, Fertilizer speeds up growth — try both below!",
    tip: '💧 Water · 🌿 Fertilize — same tools as the real toolbar.',
    seconds: 12,
    expression: 'wink',
    icon: '❤️',
    bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    accent: '#2563eb',
    xp: 38,
    interactive: 'cropCare',
    interactLabel: 'Water or fertilize the crop to continue →',
  },
  {
    id: 4,
    title: '4. Deal With Pests! 🐛',
    body: "Pests attack randomly and chip away HP — a crop at 0 HP wilts. Defend with Pesticide (instant) or a Scarecrow (lasts 3 days), or risk ignoring it.",
    tip: '⚔️ A pest is attacking your Tomato — defend it below!',
    seconds: 12,
    expression: 'excited',
    icon: '🛡️',
    bg: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
    accent: '#e11d48',
    xp: 52,
    interactive: 'pestAttack',
    interactLabel: 'Defend your crop to continue →',
  },
  {
    id: 5,
    title: '5. Harvest Your Crop 🌾',
    body: "Once a crop hits 100% growth, it's harvest-ready — tap Harvest to collect it. You get AgriCoins and XP, and the plot frees up to plant again.",
    tip: '🌾 This Rice is ready — go ahead and harvest it!',
    seconds: 8,
    expression: 'excited',
    icon: '🌾',
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    accent: '#d97706',
    xp: 66,
    interactive: 'harvest',
    interactLabel: 'Harvest the crop to continue →',
  },
  {
    id: 6,
    title: '6. Earn Rewards 🪙',
    body: "Harvesting is the biggest earner, but tasks and photo verifications pay AgriCoins too. They're separate from Listing Tokens, so your marketplace credits are untouched.",
    tip: '🎯 Tap an action below to see how many coins it earns.',
    seconds: 10,
    expression: 'wink',
    icon: '🪙',
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    accent: '#d97706',
    xp: 80,
    interactive: 'coinEarner',
    interactLabel: 'Earn some coins above to continue →',
  },
  {
    id: 7,
    title: '7. Garden Features 🎨',
    body: "Spend coins in the Shop on decorations, drop a Leaf on a neighbor's garden to say hi, and check Events for limited-time bonuses like double coins.",
    tip: '🔀 Switch tabs below and try one action in any of them.',
    seconds: 12,
    expression: 'normal',
    icon: '🎨',
    bg: 'linear-gradient(135deg, #fdf4ff 0%, #f3e8ff 100%)',
    accent: '#7c3aed',
    xp: 92,
    interactive: 'gardenFeatures',
    interactLabel: 'Try one feature above to continue →',
  },
  {
    id: 8,
    title: "Your Garden is Ready! 🚀",
    body: "That's the loop: plant → care for → defend → harvest → earn → customize. Jump in and build the best farm on the leaderboard!",
    seconds: 6,
    expression: 'celebrate',
    icon: '🚀',
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    accent: '#059669',
    xp: 100,
    interactive: null,
  },
];

// ─── Main component ────────────────────────────────────────────────────────────
type GardenTutorialProps = {
  onComplete: () => void;
  onSkip: () => void;
};

const GardenTutorial = ({ onComplete, onSkip }: GardenTutorialProps) => {
  const [stepIdx, setStepIdx]       = useState(0);
  const [xp, setXp]                 = useState(0);
  const [animateIn, setAnimateIn]   = useState(true);
  const [leaving, setLeaving]       = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const step                = STEPS[stepIdx];
  const isLast              = stepIdx === STEPS.length - 1;
  const isCelebrate         = step.expression === 'celebrate';
  const requiresInteraction = step.interactive !== null && !interacted;
  const secondsLeft         = STEPS.slice(stepIdx).reduce((sum, s) => sum + s.seconds, 0);

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

  useEffect(() => { setInteracted(false); }, [stepIdx]);

  const goNext = () => {
    if (leaving || requiresInteraction) return;
    setLeaving(true);
    setTimeout(() => {
      setLeaving(false);
      setAnimateIn(true);
      if (isLast) onComplete();
      else setStepIdx(i => i + 1);
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
        .gdn-btn-primary {
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
        .gdn-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px var(--accent-glow);
        }
        .gdn-btn-primary:active:not(:disabled) { transform: translateY(0); }
        .gdn-btn-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          animation: shake 0.4s ease;
        }
        .gdn-btn-secondary {
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
        .gdn-btn-secondary:hover { border-color: #9ca3af; color: #374151; }
        .gdn-skip {
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
        .gdn-skip:hover { color: #6b7280; }
        .gdn-interact-hint {
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
        background: 'rgba(0,0,0,0.75)',
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
          aria-label={`Garden tutorial step ${stepIdx + 1}: ${step.title}`}
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

          {/* XP bar */}
          <div style={{ padding: '18px 22px 0' }}>
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
              <span style={{ fontSize: 10, fontWeight: 700, color: step.accent + 'aa' }}>
                · ⏱ ~{secondsLeft}s left
              </span>
            </div>
            <button className="gdn-skip" onClick={onSkip}>Skip tutorial</button>
          </div>

          {/* Mascot + speech bubble */}
          <div style={{ padding: '12px 28px 8px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
              <AgriCoolLogo size={80} animate expression={step.expression} />
              <div style={{
                width: 2, flex: 1, minHeight: 16,
                background: `linear-gradient(to bottom, ${step.accent}44, transparent)`,
                marginTop: 4,
              }} />
            </div>

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
              <p style={{ margin: '0 0 10px', fontSize: 14, color: '#374151', lineHeight: 1.65, fontWeight: 500 }}>
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
              {step.interactive === 'gardenGrid'      && <FakeGardenGrid      onInteract={handleInteract} />}
              {step.interactive === 'plotSelect'      && <FakePlotSelect      onInteract={handleInteract} />}
              {step.interactive === 'cropCare'        && <FakeCropCare        onInteract={handleInteract} />}
              {step.interactive === 'pestAttack'      && <FakePestAttack      onInteract={handleInteract} />}
              {step.interactive === 'harvest'         && <FakeHarvest         onInteract={handleInteract} />}
              {step.interactive === 'coinEarner'      && <FakeCoinEarner      onInteract={handleInteract} />}
              {step.interactive === 'gardenFeatures'  && <FakeGardenFeatures  onInteract={handleInteract} />}

              {/* Interaction nudge */}
              {requiresInteraction && step.interactLabel && (
                <div className="gdn-interact-hint" style={{
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
            padding: '12px 24px 24px', alignItems: 'center',
          }}>
            {stepIdx > 0 && (
              <button className="gdn-btn-secondary" onClick={goPrev}>
                ← Back
              </button>
            )}
            <button
              className="gdn-btn-primary"
              style={{ '--accent': step.accent, '--accent-glow': step.accent + '55' } as React.CSSProperties}
              onClick={goNext}
              disabled={requiresInteraction}
              title={requiresInteraction ? 'Complete the interaction above to continue' : ''}
            >
              {isLast ? "🌻 Start Gardening!" : stepIdx === 0 ? "Let's go! →" : interacted || !step.interactive ? 'Got it! →' : 'Try it first →'}
            </button>
          </div>

          {/* XP reward pop */}
          {showReward && (
            <div style={{
              position: 'absolute',
              top: '30%', left: '50%',
              transform: 'translateX(-50%)',
              background: step.accent,
              color: '#fff',
              borderRadius: 99,
              padding: '8px 18px',
              fontWeight: 900,
              fontSize: 18,
              pointerEvents: 'none',
              animation: 'reward-pop 1.2s ease forwards',
              zIndex: 10,
              boxShadow: `0 4px 20px ${step.accent}88`,
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

export default GardenTutorial;