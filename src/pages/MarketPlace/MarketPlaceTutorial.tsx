import { useState, useEffect, useRef } from 'react';

// ─── Logo SVG (same as GamifiedTutorial) ──────────────────────────────────────
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
        <rect x="4" y="109" width="18" height="7" rx="3" fill="#1a1a1a" />
        <rect x="140" y="109" width="18" height="7" rx="3" fill="#1a1a1a" />
        <ellipse cx="40" cy="111" rx="8" ry="5" fill="#fff" opacity="0.25" />
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

// ─── XP Bar ───────────────────────────────────────────────────────────────────
const XPBar = ({ xp, maxXp = 100 }: { xp: number; maxXp?: number }) => (
  <div style={{ width: '100%', marginBottom: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#3d5a2e', letterSpacing: 1, textTransform: 'uppercase' }}>
        ⚡ Tutorial XP
      </span>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#2d1f0a' }}>{xp} / {maxXp}</span>
    </div>
    <div style={{ height: 10, background: '#ddd0b0', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${(xp / maxXp) * 100}%`,
        background: 'linear-gradient(90deg, #c8a86b, #3d5a2e)',
        borderRadius: 99,
        transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: '0 0 8px #c8a86b88',
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
  const items = ['🌾', '🛒', '⭐', '🌱', '✨', '💰', '🏆', '🎉'];
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

// ─── Interactive: Fake Search Bar ─────────────────────────────────────────────
const FakeSearchBar = ({ onInteract }: { onInteract: () => void }) => {
  const [query, setQuery] = useState('');
  const [typed, setTyped] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!typed && e.target.value.length > 0) {
      setTyped(true);
      onInteract();
    }
  };

  const suggestions = ['Pechay', 'Tomato', 'Kamote', 'Ampalaya', 'Sitaw'].filter(s =>
    query.length > 0 && s.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ marginTop: 12, position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'white', borderRadius: 12,
        border: '2px solid #c8b89a',
        padding: '8px 14px',
        boxShadow: '0 2px 8px rgba(80,60,20,0.08)',
      }}>
        <span style={{ color: '#7a6a4a', fontSize: 16 }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Try: Pechay, Tomato, Kamote…"
          style={{
            border: 'none', outline: 'none', flex: 1,
            fontSize: 14, color: '#3d2e1a',
            background: 'transparent',
            fontFamily: 'inherit',
          }}
        />
      </div>
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 5,
          background: 'white', borderRadius: 10, marginTop: 4,
          border: '1.5px solid #ddd0b0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}>
          {suggestions.map(s => (
            <div key={s} onClick={() => { setQuery(s); onInteract(); }} style={{
              padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: '#3d5a2e',
              fontWeight: 600, transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0ead8')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              🌱 {s}
            </div>
          ))}
        </div>
      )}
      {typed && (
        <div style={{
          marginTop: 8, fontSize: 12, color: '#3d5a2e', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          ✅ Great! The list updates as you type — no button needed!
        </div>
      )}
    </div>
  );
};

// ─── Interactive: Fake Crop Card ──────────────────────────────────────────────
const FakeCropCard = ({ onAddToCart }: { onAddToCart: () => void }) => {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    setAdded(true);
    onAddToCart();
  };

  return (
    <div style={{
      marginTop: 12, borderRadius: 14, overflow: 'hidden',
      border: `1.5px solid ${added ? '#86efac' : '#ddd0b0'}`,
      background: 'linear-gradient(145deg, #faf8f0, #f5f0e4)',
      boxShadow: added ? '0 4px 20px #16a34a22' : '0 2px 8px rgba(80,60,20,0.08)',
      transition: 'all 0.3s ease',
    }}>
      <div style={{
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f0fdf4', borderBottom: '1.5px solid rgba(0,0,0,0.06)',
      }}>
        <span style={{ fontSize: '2.2rem' }}>🍅</span>
      </div>
      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#2d1f0a' }}>Fresh Tomatoes</div>
        <div style={{ fontSize: 12, color: '#7a6a4a', marginTop: 2 }}>5kg · Juan dela Cruz</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontWeight: 900, fontSize: 16, color: '#3d5a2e' }}>₱80 / kg</span>
          <button
            onClick={handleAdd}
            disabled={added}
            style={{
              background: added ? '#16a34a' : '#3d5a2e',
              color: 'white', border: 'none', borderRadius: 8,
              padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: added ? 'default' : 'pointer',
              transition: 'all 0.25s ease',
              transform: added ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {added ? '✓ Added!' : '🛒 Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Interactive: Fake Near Me Button ────────────────────────────────────────
const FakeNearMeButton = ({ onInteract }: { onInteract: () => void }) => {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    setClicked(true);
    onInteract();
  };

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={handleClick}
        style={{
          background: clicked ? '#3d5a2e' : 'rgba(61,90,46,0.1)',
          color: clicked ? 'white' : '#3d5a2e',
          border: '1.5px solid #3d5a2e',
          borderRadius: 10, padding: '9px 18px',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'all 0.25s ease',
        }}
      >
        📍 {clicked ? 'Showing Nearest First!' : 'Near Me'}
      </button>
      {clicked && (
        <div style={{
          marginTop: 8, fontSize: 12, color: '#3d5a2e', fontWeight: 700,
          background: '#f0fdf4', padding: '6px 10px', borderRadius: 8,
          border: '1px solid #86efac',
        }}>
          ✅ Listings are now sorted by distance from your location!
        </div>
      )}
    </div>
  );
};

// ─── Interactive: Fake Add Listing Form Preview ───────────────────────────────
const FakeListingPreview = ({ onInteract }: { onInteract: () => void }) => {
  const [opened, setOpened] = useState(false);
  const [cropName, setCropName] = useState('');
  const [price, setPrice] = useState('');
  const [interacted, setInteracted] = useState(false);

  const handleOpen = () => {
    setOpened(true);
    onInteract();
  };

  const handleField = () => {
    if (!interacted) {
      setInteracted(true);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      {!opened ? (
        <button
          onClick={handleOpen}
          style={{
            background: '#c8a86b', color: '#2d1f0a',
            border: 'none', borderRadius: 10,
            padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          🌿 Add Crop Listing
        </button>
      ) : (
        <div style={{
          background: 'white', borderRadius: 12, padding: 14,
          border: '1.5px solid #c8b89a',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#2d1f0a', marginBottom: 10 }}>
            📝 New Crop Listing
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              placeholder="Crop name (e.g. Pechay)"
              value={cropName}
              onChange={e => { setCropName(e.target.value); handleField(); }}
              style={{
                border: '1.5px solid #c8b89a', borderRadius: 8,
                padding: '7px 10px', fontSize: 13, color: '#3d2e1a',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <input
              placeholder="Price per kg (e.g. 50)"
              value={price}
              onChange={e => { setPrice(e.target.value); handleField(); }}
              style={{
                border: '1.5px solid #c8b89a', borderRadius: 8,
                padding: '7px 10px', fontSize: 13, color: '#3d2e1a',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button
              style={{
                background: '#3d5a2e', color: 'white', border: 'none',
                borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', opacity: cropName && price ? 1 : 0.5,
              }}
            >
              Post Listing →
            </button>
          </div>
          {interacted && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#3d5a2e', fontWeight: 700 }}>
              ✅ Fill in details and hit "Post Listing" — it goes live instantly!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Interactive: Fake Cart Preview ──────────────────────────────────────────
const FakeCartPreview = ({ onInteract }: { onInteract: () => void }) => {
  const [viewed, setViewed] = useState(false);

  const handleView = () => {
    setViewed(true);
    onInteract();
  };

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={handleView}
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1.5px solid rgba(61,90,46,0.4)',
          color: '#3d5a2e', borderRadius: 10,
          padding: '9px 18px', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          transition: 'all 0.2s ease',
          position: 'relative',
        }}
      >
        🛒 View Cart
        <span style={{
          background: '#e74c3c', color: 'white',
          borderRadius: 99, minWidth: 20, height: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, padding: '0 5px',
        }}>2</span>
      </button>
      {viewed && (
        <div style={{
          marginTop: 8, background: 'white', borderRadius: 10, padding: 12,
          border: '1.5px solid #c8b89a',
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#2d1f0a', marginBottom: 8 }}>🛒 Your Cart</div>
          {[{ name: 'Fresh Tomatoes', price: '₱80/kg', emoji: '🍅' }, { name: 'Pechay Bundle', price: '₱45', emoji: '🥬' }].map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '5px 0', borderBottom: i === 0 ? '1px solid #f0ead8' : 'none',
            }}>
              <span style={{ fontSize: 13, color: '#3d2e1a' }}>{item.emoji} {item.name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#3d5a2e' }}>{item.price}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 12, color: '#3d5a2e', fontWeight: 700 }}>
            ✅ From here you can message the seller or request delivery!
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Interactive: Fake Credits Banner ────────────────────────────────────────
const FakeCreditsBanner = ({ onInteract }: { onInteract: () => void }) => {
  const [clicked, setClicked] = useState(false);

  return (
    <div style={{
      marginTop: 12, padding: '10px 14px', borderRadius: 12,
      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
      border: '1.5px solid #86efac',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap' as const, gap: 8,
    }}>
      <span style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>
        🌿 You have <strong>3</strong> free listing credits remaining
      </span>
      <button
        onClick={() => { setClicked(true); onInteract(); }}
        style={{
          background: clicked ? '#3d5a2e' : 'transparent',
          color: clicked ? 'white' : '#166534',
          border: '1.5px solid #3d5a2e',
          borderRadius: 8, padding: '4px 10px',
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {clicked ? '✓ Got it!' : 'Learn more →'}
      </button>
    </div>
  );
};

// ─── Step definitions ─────────────────────────────────────────────────────────
type InteractiveComponent = 'search' | 'cropCard' | 'nearMe' | 'addListing' | 'cart' | 'credits' | null;

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
  interactLabel?: string; // shown when waiting for interaction
};

const STEPS: Step[] = [
  {
    id: 0,
    title: "Welcome to the Marketplace! 🌾",
    body: "Hey Farmer! I'm Kool — your AgriCool guide. This is where you buy and sell fresh crops directly with other local farmers. Let me walk you through it step by step — and you'll get to try things out!",
    expression: 'excited',
    icon: '🌾',
    bg: 'linear-gradient(135deg, #faf8f0 0%, #f5f0e4 100%)',
    accent: '#3d5a2e',
    xp: 0,
    interactive: null,
  },
  {
    id: 1,
    title: 'Search for Crops 🔍',
    body: "Looking for something specific? Use the search bar to find crops by name. It filters in real-time as you type — no need to press Enter!",
    tip: '💡 Try typing "Pechay" or "Tomato" below to see it in action!',
    expression: 'normal',
    icon: '🔍',
    bg: 'linear-gradient(135deg, #faf8f0 0%, #f0ead8 100%)',
    accent: '#7a6a4a',
    xp: 15,
    interactive: 'search',
    interactLabel: 'Type in the search bar above to continue →',
  },
  {
    id: 2,
    title: 'Browse Crop Listings 🥬',
    body: "Each crop card shows you the name, quantity, price, and the seller's contact. You can message the seller on Facebook or add the crop directly to your cart.",
    tip: '🛒 Tap "Add to Cart" on the card below to try it!',
    expression: 'wink',
    icon: '🥬',
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    accent: '#16a34a',
    xp: 30,
    interactive: 'cropCard',
    interactLabel: 'Add the crop to your cart to continue →',
  },
  {
    id: 3,
    title: 'Find Farmers Near You 📍',
    body: "Hit the \"Near Me\" button and we'll sort all listings by distance from your location — closest farmers first, so you get the freshest produce with the least travel!",
    tip: '📍 Try pressing the Near Me button below!',
    expression: 'normal',
    icon: '📍',
    bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    accent: '#2563eb',
    xp: 45,
    interactive: 'nearMe',
    interactLabel: 'Click "Near Me" to continue →',
  },
  {
    id: 4,
    title: 'List Your Own Crops 🌿',
    body: "Got crops ready to sell? Hit \"Add Crop Listing\" and fill out the form — crop name, price, quantity, and your location. Your listing goes live instantly for buyers to see!",
    tip: '📝 Open the form below and fill in at least one field to continue.',
    expression: 'excited',
    icon: '🌿',
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    accent: '#c8a86b',
    xp: 60,
    interactive: 'addListing',
    interactLabel: 'Open the listing form to continue →',
  },
  {
    id: 5,
    title: 'Free Listing Credits 🎟️',
    body: "Every new listing costs ₱20 via GCash — OR you can earn free credits by completing crop verifications in the Gamified Tracker! Each crop you verify there earns you listing tokens here.",
    tip: '🌟 Go to the Crop Tracker to start earning free tokens!',
    expression: 'wink',
    icon: '🎟️',
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)',
    accent: '#059669',
    xp: 75,
    interactive: 'credits',
    interactLabel: 'Check your credits banner below →',
  },
  {
    id: 6,
    title: 'Your Cart 🛒',
    body: "Added something you like? Check your cart anytime using the cart button at the top. From there you can message the seller directly or proceed to coordinate a pick-up or delivery.",
    tip: '🛒 Tap the cart button below to preview it!',
    expression: 'normal',
    icon: '🛒',
    bg: 'linear-gradient(135deg, #fdf4ff 0%, #f3e8ff 100%)',
    accent: '#7c3aed',
    xp: 88,
    interactive: 'cart',
    interactLabel: 'View your cart to continue →',
  },
  {
    id: 7,
    title: "You're Ready to Trade! 🚀",
    body: "That's everything, farmer! Browse listings, add to cart, and contact sellers — or post your own harvest and start earning. The marketplace is yours!",
    expression: 'celebrate',
    icon: '🚀',
    bg: 'linear-gradient(135deg, #faf8f0 0%, #f5f0e4 100%)',
    accent: '#3d5a2e',
    xp: 100,
    interactive: null,
  },
];

// ─── Main Tutorial Component ───────────────────────────────────────────────────
type MarketPlaceTutorialProps = {
  onComplete: () => void;
  onSkip: () => void;
};

const MarketPlaceTutorial = ({ onComplete, onSkip }: MarketPlaceTutorialProps) => {
  const [stepIdx, setStepIdx]           = useState(0);
  const [xp, setXp]                     = useState(0);
  const [animateIn, setAnimateIn]       = useState(true);
  const [leaving, setLeaving]           = useState(false);
  const [showReward, setShowReward]     = useState(false);
  const [interacted, setInteracted]     = useState(false); // has user done the interactive step?
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
      setTimeout(() => setShowReward(false), 1400);
    }
  }, [xp]);

  // Reset interacted state on step change
  useEffect(() => {
    setInteracted(false);
  }, [stepIdx]);

  const goNext = () => {
    if (leaving) return;
    if (requiresInteraction) return; // block if interaction not done
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
        .mkt-btn-primary {
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
        .mkt-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px var(--accent-glow);
        }
        .mkt-btn-primary:active:not(:disabled) { transform: translateY(0); }
        .mkt-btn-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          animation: shake 0.4s ease;
        }
        .mkt-btn-secondary {
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
        .mkt-btn-secondary:hover { border-color: #9ca3af; color: #374151; }
        .mkt-skip {
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
        .mkt-skip:hover { color: #6b7280; }
        .interact-hint {
          animation: pulse-hint 1.4s ease-in-out infinite;
        }
        @keyframes pulse-hint {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(0.98); }
        }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(30,20,10,0.78)',
        backdropFilter: 'blur(6px)',
        animation: 'overlay-in 0.3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
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
            boxShadow: '0 32px 80px rgba(0,0,0,0.40)',
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

          {/* Top: XP Bar */}
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
            <button className="mkt-skip" onClick={onSkip}>Skip tutorial</button>
          </div>

          {/* Mascot + speech bubble */}
          <div style={{ padding: '12px 28px 8px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* Mascot */}
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
              flex: 1, background: '#fff',
              borderRadius: '4px 20px 20px 20px',
              padding: '16px 18px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              position: 'relative', marginTop: 10,
            }}>
              {/* Tail */}
              <div style={{
                position: 'absolute', left: -10, top: 14,
                width: 0, height: 0,
                borderTop: '10px solid transparent',
                borderBottom: '0px solid transparent',
                borderRight: '10px solid #fff',
              }} />
              <h2 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 900, color: '#2d1f0a', letterSpacing: '-0.3px', lineHeight: 1.3 }}>
                {step.title}
              </h2>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#374151', lineHeight: 1.65, fontWeight: 500 }}>
                {step.body}
              </p>
              {step.tip && (
                <div style={{
                  background: step.accent + '12', border: `1.5px solid ${step.accent}33`,
                  borderRadius: 10, padding: '8px 12px', marginBottom: 4,
                }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: step.accent, lineHeight: 1.5 }}>
                    {step.tip}
                  </p>
                </div>
              )}

              {/* Interactive area */}
              {step.interactive === 'search' && <FakeSearchBar onInteract={handleInteract} />}
              {step.interactive === 'cropCard' && <FakeCropCard onAddToCart={handleInteract} />}
              {step.interactive === 'nearMe' && <FakeNearMeButton onInteract={handleInteract} />}
              {step.interactive === 'addListing' && <FakeListingPreview onInteract={handleInteract} />}
              {step.interactive === 'credits' && <FakeCreditsBanner onInteract={handleInteract} />}
              {step.interactive === 'cart' && <FakeCartPreview onInteract={handleInteract} />}

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
            padding: '10px 24px 22px', alignItems: 'center',
          }}>
            {stepIdx > 0 && (
              <button className="mkt-btn-secondary" onClick={goPrev}>
                ← Back
              </button>
            )}
            <button
              className="mkt-btn-primary"
              style={{ '--accent': step.accent, '--accent-glow': step.accent + '55' } as React.CSSProperties}
              onClick={goNext}
              disabled={requiresInteraction}
              title={requiresInteraction ? 'Complete the interaction above to continue' : ''}
            >
              {isLast ? "🚀 Start Trading!" : stepIdx === 0 ? "Let's go! →" : interacted || !step.interactive ? 'Got it! →' : 'Try it first →'}
            </button>
          </div>

          {/* XP reward pop */}
          {showReward && (
            <div style={{
              position: 'absolute', top: '30%', left: '50%',
              transform: 'translateX(-50%)',
              background: step.accent, color: '#fff',
              borderRadius: 99, padding: '8px 18px',
              fontWeight: 900, fontSize: 18,
              pointerEvents: 'none',
              animation: 'reward-pop 1.4s ease forwards',
              zIndex: 10, boxShadow: `0 4px 20px ${step.accent}88`,
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

export default MarketPlaceTutorial;

// ─── Usage in MarketPlace.tsx ──────────────────────────────────────────────────
//
// 1. Import and add state:
//    import MarketPlaceTutorial from './MarketPlaceTutorial';
//    const [showTutorial, setShowTutorial] = useState(false);
//
// 2. Show automatically for new users (no crops seen yet):
//    useEffect(() => {
//      const seen = localStorage.getItem(`agricool_marketplace_tutorial_${user?.id}`);
//      if (!seen) setShowTutorial(true);
//    }, [user]);
//
// 3. Mark as seen on complete or skip:
//    const handleTutorialDone = () => {
//      localStorage.setItem(`agricool_marketplace_tutorial_${user?.id}`, '1');
//      setShowTutorial(false);
//    };
//
// 4. Render in JSX (alongside other modals):
//    {showTutorial && (
//      <MarketPlaceTutorial
//        onComplete={handleTutorialDone}
//        onSkip={handleTutorialDone}
//      />
//    )}
//
// 5. Optionally add a "Replay tutorial" button in your MarketPlace header.
