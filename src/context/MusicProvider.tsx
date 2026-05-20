import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  PropsWithChildren,
} from 'react';
import { useLocation } from 'react-router-dom';

// ─── Route → background music ─────────────────────────────────────────────────
// Notifications page plays Main.mp3 — Notifications.mp3 is a one-shot SFX only
const ROUTE_TRACKS: { pattern: RegExp; track: string }[] = [
  { pattern: /^\/dashboard\/marketplace/, track: '/music/Market.mp3' },
  { pattern: /^\/dashboard/, track: '/music/Main.mp3' }, // covers all /dashboard/* incl. notifications, farm-location
  { pattern: /^\/register/, track: '/music/Login.mp3' },
  { pattern: /^\/reset-password/, track: '/music/Login.mp3' },
  { pattern: /^\//, track: '/music/Login.mp3' },
];

function getTrackForPath(pathname: string): string {
  for (const { pattern, track } of ROUTE_TRACKS) {
    if (pattern.test(pathname)) return track;
  }
  return '/music/Main.mp3';
}

// ─── Context shape ─────────────────────────────────────────────────────────────
interface MusicContextValue {
  isMuted: boolean;
  toggleMute: () => void;
  volume: number;
  setVolume: (v: number) => void;
  currentTrack: string;
  isPlaying: boolean;
  /** Call when a crop listing is successfully added */
  playEnlistingSound: () => void;
  /** Call once per new notification received */
  playNotificationSound: () => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used inside MusicProvider');
  return ctx;
}

// ─── Helper: one-shot SFX ─────────────────────────────────────────────────────
function createSfx(src: string, vol = 0.7): HTMLAudioElement {
  const a = new Audio(src);
  a.volume = vol;
  return a;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function MusicProvider({ children }: PropsWithChildren) {
  const location = useLocation();

  const bgRef         = useRef<HTMLAudioElement | null>(null);
  const clickSfxRef   = useRef<HTMLAudioElement | null>(null);
  const enlistSfxRef  = useRef<HTMLAudioElement | null>(null);
  const notifSfxRef   = useRef<HTMLAudioElement | null>(null);

  const [currentTrack, setCurrentTrack] = useState('');
  const [isPlaying, setIsPlaying]       = useState(false);
  const pendingPlay = useRef(false);

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try { return localStorage.getItem('agri_music_muted') === 'true'; } catch { return false; }
  });
  const [volume, setVolumeState] = useState<number>(() => {
    try { return Number(localStorage.getItem('agri_music_volume') ?? '0.4'); } catch { return 0.4; }
  });

  // ── Init all audio elements once ────────────────────────────────────────
  useEffect(() => {
    const bg = new Audio();
    bg.loop   = true;
    bg.volume = volume;
    bg.muted  = isMuted;
    bg.addEventListener('playing', () => setIsPlaying(true));
    bg.addEventListener('pause',   () => setIsPlaying(false));
    bgRef.current = bg;

    clickSfxRef.current  = createSfx('/music/ClickSound.mp3',    0.6);
    enlistSfxRef.current = createSfx('/music/Enlisting.mp3',     0.8);
    notifSfxRef.current  = createSfx('/music/Notifications.mp3', 0.8);

    return () => { bg.pause(); bg.src = ''; bgRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Global click → ClickSound on every button/link ──────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isBtn =
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[role="option"]');
      if (!isBtn || isMuted) return;
      const sfx = clickSfxRef.current;
      if (!sfx) return;
      sfx.currentTime = 0;
      sfx.play().catch(() => {});
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isMuted]);

  // ── Resume bg after first user interaction (browser autoplay policy) ────
  useEffect(() => {
    const resume = () => {
      if (pendingPlay.current && bgRef.current && !isMuted) {
        bgRef.current.play().catch(() => {});
        pendingPlay.current = false;
      }
    };
    window.addEventListener('click',   resume);
    window.addEventListener('keydown', resume);
    return () => {
      window.removeEventListener('click',   resume);
      window.removeEventListener('keydown', resume);
    };
  }, [isMuted]);

  // ── Switch background track on route change ──────────────────────────────
  useEffect(() => {
    const bg = bgRef.current;
    if (!bg) return;
    const track = getTrackForPath(location.pathname);
    if (track === currentTrack) return;
    setCurrentTrack(track);
    bg.pause();
    bg.currentTime = 0;
    bg.src = track;
    bg.load();
    if (!isMuted) {
      bg.play().catch(() => { pendingPlay.current = true; });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ── Mute toggle ──────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      const bg = bgRef.current;
      if (bg) {
        bg.muted = next;
        if (!next && bg.src && bg.paused) {
          bg.play().catch(() => { pendingPlay.current = true; });
        }
      }
      try { localStorage.setItem('agri_music_muted', String(next)); } catch {}
      return next;
    });
  }, []);

  // ── Volume ───────────────────────────────────────────────────────────────
  const setVolume = useCallback((v: number) => {
    const c = Math.min(1, Math.max(0, v));
    setVolumeState(c);
    if (bgRef.current) bgRef.current.volume = c;
    try { localStorage.setItem('agri_music_volume', String(c)); } catch {}
  }, []);

  // ── One-shot SFX helpers ─────────────────────────────────────────────────
  const playEnlistingSound = useCallback(() => {
    if (isMuted) return;
    const sfx = enlistSfxRef.current;
    if (!sfx) return;
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
  }, [isMuted]);

  const playNotificationSound = useCallback(() => {
    if (isMuted) return;
    const sfx = notifSfxRef.current;
    if (!sfx) return;
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
  }, [isMuted]);

  return (
    <MusicContext.Provider value={{
      isMuted, toggleMute, volume, setVolume,
      currentTrack, isPlaying,
      playEnlistingSound, playNotificationSound,
    }}>
      {children}
    </MusicContext.Provider>
  );
}