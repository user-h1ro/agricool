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
} from 'react-icons/lu';
import { useAuth } from '@/context/AuthProvider';
import { useEffect, useState, useCallback } from 'react';
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
  { label: 'Marketplace', path: '/dashboard/marketplace', icon: <LuStore size={22} /> },
  { label: 'Live Map',    path: '/dashboard/map',         icon: <LuMapPin size={22} /> },
  { label: 'Climate',     path: '/dashboard/climate',     icon: <LuCloudSun size={22} /> },
  { label: 'Almanac',     path: '/dashboard/almanac',     icon: <LuBookOpen size={22} /> },
];

const TopBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const { playNotificationSound } = useMusic();

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

    // Listen to ALL events — INSERT (new notif), UPDATE (marked read/unread), DELETE (deleted)
    // so the badge count always reflects the real state without needing a full refetch
    const channel = supabase
      .channel(`topbar-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // New unread notification — bump count and play sound
          if (!(payload.new as any).is_read) {
            setUnreadCount(prev => prev + 1);
            playNotificationSound();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch on any update (mark read / mark unread)
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch on delete so count is accurate
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnreadCount]);

  const isActive = (path: string) => location.pathname === path;
  const isOnNotifications = location.pathname === '/dashboard/notifications';

  return (
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

            {/* Unread badge — only show when there ARE unread items */}
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

            {/* Active indicator dot (same as nav items) */}
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
  );
};

export default TopBar;