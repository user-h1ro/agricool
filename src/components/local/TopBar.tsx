import { HStack, Box, IconButton, Badge, Text } from '@chakra-ui/react';
import { 
  LuBell, 
  LuUser, 
  LuLogOut, 
  LuStore, 
  LuMapPin, 
  LuBookOpen,
  LuCloudSun,
  LuLeaf,
  LuFlower2,
} from 'react-icons/lu';
import { useAuth } from '@/context/AuthProvider';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import AgriCoolLogo from '@/assets/agricool_logo.svg';
import { MusicToggle } from './MusicToggle';
import { useMusic } from '@/context/MusicProvider';

type NavItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Tracker',     path: '/dashboard/tracker',     icon: <LuLeaf size={22} /> },
  { label: 'Garden',      path: '/dashboard/garden',      icon: <LuFlower2 size={22} /> },
  { label: 'Marketplace', path: '/dashboard/marketplace', icon: <LuStore size={22} /> },
  { label: 'Live Map',    path: '/dashboard/map',         icon: <LuMapPin size={22} /> },
  { label: 'Climate',     path: '/dashboard/climate',     icon: <LuCloudSun size={22} /> },
  { label: 'Almanac',     path: '/dashboard/almanac',     icon: <LuBookOpen size={22} /> },
];

// ─── Flying coin particle ─────────────────────────────────────────────────────
type CoinParticle = {
  id: number;
  startX: number;
  startY: number;
  amount: number;
};

// ─── TopBar ───────────────────────────────────────────────────────────────────
const TopBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const { playNotificationSound, playCoinSound } = useMusic();

  // ── Coin state — reactive, not read-once ──────────────────────────────────
  const [coins, setCoins] = useState(0);
  const [coinBump, setCoinBump] = useState(false);  // triggers badge pop animation
  const [particles, setParticles] = useState<CoinParticle[]>([]);
  const coinBadgeRef = useRef<HTMLDivElement>(null);
  const particleId   = useRef(0);

  // Read coins from localStorage for this user
  const readCoins = useCallback((uid: string): number => {
    try {
      const raw = localStorage.getItem(`agricool_garden_${uid}`);
      return raw ? (JSON.parse(raw) as { coins: number }).coins : 0;
    } catch { return 0; }
  }, []);

  // Init coin display on mount / user change
  useEffect(() => {
    if (!user) return;
    setCoins(readCoins(user.id));
  }, [user, readCoins]);

  // Listen for coin change events dispatched by Garden.tsx
  useEffect(() => {
    if (!user) return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ amount: number; newTotal: number; sourceX?: number; sourceY?: number }>).detail;
      
      setCoins(detail.newTotal);

      // Only animate when gaining coins (not spending)
      if (detail.amount > 0) {
        playCoinSound();

        // Spawn flying coin particles
        const badgeRect = coinBadgeRef.current?.getBoundingClientRect();
        const targetX   = badgeRect ? badgeRect.left + badgeRect.width / 2  : window.innerWidth - 120;
        const targetY   = badgeRect ? badgeRect.top  + badgeRect.height / 2 : 28;

        // Spawn 3 staggered coins from near the source action
        const srcX = detail.sourceX ?? window.innerWidth / 2;
        const srcY = detail.sourceY ?? window.innerHeight / 2;

        const count = Math.min(5, Math.max(1, Math.ceil(detail.amount / 10)));
        for (let i = 0; i < count; i++) {
          const id = ++particleId.current;
          // Tiny random spread around source point
          const jitterX = (Math.random() - 0.5) * 40;
          const jitterY = (Math.random() - 0.5) * 40;

          setParticles(prev => [...prev, {
            id,
            startX: srcX + jitterX,
            startY: srcY + jitterY,
            amount: detail.amount,
          } as CoinParticle]);

          // Inject keyframe for this specific particle (start → badge target)
          const styleId = `coin-particle-${id}`;
          const dx = targetX - (srcX + jitterX);
          const dy = targetY - (srcY + jitterY);
          const delay = i * 80;

          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            @keyframes fly-coin-${id} {
              0%   { transform: translate(0, 0) scale(1);   opacity: 1; }
              60%  { opacity: 1; }
              100% { transform: translate(${dx}px, ${dy}px) scale(0.5); opacity: 0; }
            }
            .coin-particle-${id} {
              animation: fly-coin-${id} 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms forwards;
            }
          `;
          document.head.appendChild(style);

          // Remove particle + style after animation
          setTimeout(() => {
            setParticles(prev => prev.filter(p => p.id !== id));
            document.getElementById(styleId)?.remove();
          }, 700 + delay + 100);
        }

        // Badge pop
        setCoinBump(true);
        setTimeout(() => setCoinBump(false), 600);
      }
    };

    window.addEventListener('agricool:coins', handler);
    return () => window.removeEventListener('agricool:coins', handler);
  }, [user, playCoinSound]);

  // ── Notifications ─────────────────────────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setUnreadCount(count ?? 0);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchUnreadCount();

    const channel = supabase
      .channel(`topbar-notifications-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (!(payload.new as any).is_read) {
            setUnreadCount(prev => prev + 1);
            playNotificationSound();
          }
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { fetchUnreadCount(); }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { fetchUnreadCount(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchUnreadCount, playNotificationSound]);

  const isActive = (path: string) => location.pathname === path;
  const isOnNotifications = location.pathname === '/dashboard/notifications';

  return (
    <>
      {/* ── Flying coin particles (rendered at fixed position in viewport) ── */}
      {particles.map(p => (
        <div
          key={p.id}
          className={`coin-particle-${p.id}`}
          style={{
            position: 'fixed',
            left:  p.startX - 10,
            top:   p.startY - 10,
            width:  20,
            height: 20,
            fontSize: 18,
            pointerEvents: 'none',
            zIndex: 99999,
            userSelect: 'none',
          }}
        >
          🪙
        </div>
      ))}

      <Box 
        bgGradient="linear(to-r, #166534, #22c55e, #4ade80)"
        backgroundColor="#166534"
        borderBottom="1px solid" 
        borderColor="green.600" 
        py={3}
        px={6} 
        position="sticky" 
        top={0} 
        zIndex={100}
        boxShadow="md"
      >
        <HStack justify="space-between" maxW="1400px" mx="auto">
          {/* Logo */}
          <HStack gap={3} cursor="pointer" onClick={() => navigate('/dashboard/tracker')} flexShrink={0}>
            <img 
              src={AgriCoolLogo} 
              alt="AgriCool" 
              width="44" 
              height="44" 
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
            />
            <Text 
              fontWeight="bold" 
              fontSize="xl" 
              color="white"
              textShadow="0 2px 4px rgba(0,0,0,0.3)"
              display={{ base: 'none', md: 'block' }}
            >
              AgriCool
            </Text>
          </HStack>

          {/* Main Nav */}
          <HStack gap={1}>
            {NAV_ITEMS.map(item => (
              <Box key={item.path} position="relative">
                <IconButton
                  aria-label={item.label}
                  onClick={() => navigate(item.path)}
                  variant="ghost"
                  color={isActive(item.path) ? 'yellow.300' : 'white'}
                  _hover={{ bg: 'whiteAlpha.300' }}
                  size="md"
                  title={item.label}
                >
                  {item.icon}
                </IconButton>
                {isActive(item.path) && (
                  <Box
                    position="absolute"
                    bottom="-2px"
                    left="50%"
                    transform="translateX(-50%)"
                    w="4px" h="4px"
                    bg="yellow.300"
                    borderRadius="full"
                  />
                )}
              </Box>
            ))}
          </HStack>

          {/* Right Side */}
          <HStack gap={2}>
            {/* AgriCoin balance — live, animated */}
            <Box
              ref={coinBadgeRef}
              display={{ base: 'none', sm: 'flex' }}
              alignItems="center"
              gap={1}
              bg="whiteAlpha.200"
              borderRadius="full"
              px={3}
              py={1}
              cursor="pointer"
              _hover={{ bg: 'whiteAlpha.300' }}
              onClick={() => navigate('/dashboard/garden')}
              title="AgriCoins — go to Garden"
              style={{
                transition: 'transform 0.15s ease, background 0.15s ease',
                transform: coinBump ? 'scale(1.25)' : 'scale(1)',
              }}
            >
              <Text
                fontSize="14px"
                style={{
                  display: 'inline-block',
                  transition: 'transform 0.3s ease',
                  transform: coinBump ? 'rotate(20deg) scale(1.3)' : 'rotate(0deg) scale(1)',
                }}
              >
                🪙
              </Text>
              <Text
                fontSize="13px"
                fontWeight="800"
                color="yellow.300"
                style={{
                  transition: 'color 0.3s ease',
                  color: coinBump ? '#fde047' : undefined,
                  textShadow: coinBump ? '0 0 8px #fde04788' : 'none',
                  minWidth: '20px',
                  textAlign: 'right',
                }}
              >
                {coins}
              </Text>
            </Box>

            {/* Music Toggle */}
            <MusicToggle />

            {/* Notifications Bell */}
            <Box position="relative">
              <IconButton 
                aria-label="Notifications" 
                variant="ghost" 
                color={isOnNotifications ? 'yellow.300' : 'white'}
                _hover={{ bg: 'whiteAlpha.300' }}
                size="md"
                onClick={() => navigate('/dashboard/notifications')}
                title="Notifications"
              >
                <LuBell size={22} />
              </IconButton>

              {unreadCount > 0 && (
                <Badge
                  position="absolute"
                  top="3px"
                  right="3px"
                  bg="#ef4444"
                  color="white"
                  borderRadius="full"
                  fontSize="10px"
                  fontWeight="800"
                  px={1.5}
                  minW="18px"
                  h="18px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  border="2px solid white"
                  boxShadow="0 1px 4px rgba(0,0,0,0.3)"
                  lineHeight="1"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}

              {isOnNotifications && (
                <Box
                  position="absolute"
                  bottom="-2px"
                  left="50%"
                  transform="translateX(-50%)"
                  w="4px" h="4px"
                  bg="yellow.300"
                  borderRadius="full"
                />
              )}
            </Box>

            {/* Profile */}
            <Box position="relative">
              <IconButton 
                aria-label="Profile" 
                variant="ghost" 
                color={isActive('/dashboard/profile') ? 'yellow.300' : 'white'}
                _hover={{ bg: 'whiteAlpha.300' }}
                size="md"
                onClick={() => navigate('/dashboard/profile')}
                title="Profile"
              >
                <LuUser size={22} />
              </IconButton>
              {isActive('/dashboard/profile') && (
                <Box
                  position="absolute" bottom="-2px" left="50%"
                  transform="translateX(-50%)"
                  w="4px" h="4px" bg="yellow.300" borderRadius="full"
                />
              )}
            </Box>

            {/* Logout */}
            <IconButton 
              aria-label="Logout" 
              variant="ghost" 
              color="white"
              _hover={{ bg: 'whiteAlpha.300' }}
              size="md"
              onClick={logout}
              title="Logout"
            >
              <LuLogOut size={22} />
            </IconButton>
          </HStack>
        </HStack>
      </Box>
    </>
  );
};

export default TopBar;