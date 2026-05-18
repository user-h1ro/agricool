import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/supabase';
import { useAuth } from '@/context/AuthProvider';
import {
  Box, HStack, VStack, Text, Badge, Button, Heading,
  Spinner, Center, Flex,
} from '@chakra-ui/react';

// ─── Types ────────────────────────────────────────────────────────────────────
type NotifType =
  | 'cart_add'
  | 'checkout'
  | 'crop_critical'
  | 'crop_harvest'
  | 'task_due'
  | 'water_reminder'
  | 'system'
  | string;

type Notification = {
  id: string;
  user_id: string;
  type: NotifType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  crop_id?: string;
  crop_name?: string;
  buyer_name?: string;
  buyer_quantity?: number;
  buyer_unit?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function typeIcon(type: NotifType): string {
  const map: Record<string, string> = {
    cart_add:       '🛒',
    checkout:       '🧺',
    crop_critical:  '🚨',
    crop_harvest:   '🌾',
    task_due:       '📋',
    water_reminder: '💧',
    system:         '⚙️',
  };
  return map[type] ?? '🔔';
}

function typeAccent(type: NotifType): { bg: string; border: string; dot: string } {
  const map: Record<string, { bg: string; border: string; dot: string }> = {
    cart_add:       { bg: '#fefce8', border: '#fde68a', dot: '#f59e0b' },
    checkout:       { bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a' },
    crop_critical:  { bg: '#fff1f2', border: '#fecdd3', dot: '#ef4444' },
    crop_harvest:   { bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a' },
    task_due:       { bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6' },
    water_reminder: { bg: '#eff6ff', border: '#bfdbfe', dot: '#0ea5e9' },
    system:         { bg: '#f9fafb', border: '#e5e7eb', dot: '#6b7280' },
  };
  return map[type] ?? { bg: '#f9fafb', border: '#e5e7eb', dot: '#6b7280' };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

type FilterTab = 'all' | 'unread' | 'checkout' | 'cart_add' | 'crop_critical' | 'task_due';

const TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key: 'all',          label: 'All',       icon: '🔔' },
  { key: 'unread',       label: 'Unread',    icon: '✉️' },
  { key: 'checkout',     label: 'Orders',    icon: '🧺' },
  { key: 'cart_add',     label: 'Market',    icon: '🛒' },
  { key: 'crop_critical',label: 'Alerts',    icon: '🚨' },
  { key: 'task_due',     label: 'Tasks',     icon: '📋' },
];

// ─── NotifCard ────────────────────────────────────────────────────────────────
const NotifCard = ({
  notif,
  onMarkRead,
  onMarkUnread,
  onDelete,
}: {
  notif: Notification;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const accent = typeAccent(notif.type);

  // Parse ordered qty, unit, and crop_id from the encoded message string.
  // Message format: "Juan ordered 5 kg of your Pechay. crop_id:abc-123"
  const parsedFromMessage = (() => {
    const qtyMatch  = notif.message?.match(/ordered\s+([\d.]+)\s+(\S+)\s+of/);
    const cropMatch = notif.message?.match(/crop_id:([^\s]+)/);
    return {
      qty:    qtyMatch  ? parseFloat(qtyMatch[1]) : 1,
      unit:   qtyMatch  ? qtyMatch[2]             : '',
      cropId: cropMatch ? cropMatch[1]             : null,
    };
  })();
  const buyerQty      = notif.buyer_quantity ?? parsedFromMessage.qty;
  const buyerUnit     = notif.buyer_unit     ?? parsedFromMessage.unit;
  // Prefer the DB column (future-proofed), fall back to parsing the message
  const resolvedCropId = notif.crop_id ?? parsedFromMessage.cropId;

  const [showSoldPanel, setShowSoldPanel] = useState(false);
  const [soldQty, setSoldQty] = useState<number>(buyerQty);
  const [soldLoading, setSoldLoading] = useState(false);
  const [soldDone, setSoldDone] = useState(false);
  const [soldError, setSoldError] = useState('');

  const handleMarkSold = async () => {
    if (!resolvedCropId) return;
    setSoldLoading(true);
    setSoldError('');

    try {
      // Fetch the current crop quantity
      const { data: crop, error: fetchErr } = await supabase
        .from('crops')
        .select('quantity, unit')
        .eq('id', resolvedCropId)
        .single();

      if (fetchErr || !crop) {
        setSoldError('Could not find the crop listing.');
        setSoldLoading(false);
        return;
      }

      // Parse current quantity number (e.g. "10 kg" → 10, or just "10")
      const currentNum = parseFloat(crop.quantity);
      const remaining = currentNum - soldQty;

      if (remaining < 0) {
        setSoldError(`Only ${currentNum} ${crop.unit ?? ''} available.`);
        setSoldLoading(false);
        return;
      }

      if (remaining === 0) {
        // Fully sold — delete the listing
        await supabase.from('crops').delete().eq('id', resolvedCropId);
      } else {
        // Partially sold — update quantity
        const newQtyStr = `${remaining} ${crop.unit ?? ''}`.trim();
        await supabase.from('crops').update({ quantity: newQtyStr }).eq('id', resolvedCropId);
      }

      setSoldDone(true);
      // Auto-mark notification as read
      onMarkRead(notif.id);
    } catch {
      setSoldError('Something went wrong. Please try again.');
    }

    setSoldLoading(false);
  };

  return (
    <Box
      bg={notif.is_read ? 'white' : accent.bg}
      border="1.5px solid"
      borderColor={notif.is_read ? '#f3f4f6' : accent.border}
      borderRadius="16px"
      p={5}
      transition="all 0.2s"
      _hover={{ transform: 'translateY(-1px)', boxShadow: '0 6px 24px rgba(0,0,0,0.08)' }}
      boxShadow={notif.is_read ? 'none' : '0 2px 12px rgba(0,0,0,0.05)'}
      position="relative"
      overflow="hidden"
    >
      {/* Unread left accent bar */}
      {!notif.is_read && (
        <Box
          position="absolute"
          left={0} top={0} bottom={0}
          w="4px"
          borderRadius="16px 0 0 16px"
          bg={accent.dot}
        />
      )}

      <HStack align="flex-start" gap={4}>
        {/* Icon bubble */}
        <Box
          w="44px" h="44px" borderRadius="14px" flexShrink={0}
          bg={notif.is_read ? '#f3f4f6' : accent.border}
          display="flex" alignItems="center" justifyContent="center"
          fontSize="20px"
        >
          {typeIcon(notif.type)}
        </Box>

        {/* Content */}
        <Box flex={1} minW={0}>
          <HStack justify="space-between" align="flex-start" gap={2}>
            <Text
              fontWeight={notif.is_read ? '600' : '700'}
              fontSize="sm"
              color={notif.is_read ? '#6b7280' : '#111827'}
              lineHeight="1.4"
            >
              {notif.title}
            </Text>
            <HStack gap={1.5} flexShrink={0}>
              {!notif.is_read && (
                <Box
                  w="8px" h="8px" borderRadius="full"
                  bg={accent.dot} flexShrink={0} mt="4px"
                />
              )}
              <Text fontSize="11px" color="gray.400" whiteSpace="nowrap">
                {timeAgo(notif.created_at)}
              </Text>
            </HStack>
          </HStack>

          <Text fontSize="sm" color={notif.is_read ? 'gray.400' : 'gray.600'} mt={1} lineHeight="1.5">
            {/* Strip the encoded crop_id:... suffix before displaying */}
            {notif.message?.replace(/\s*crop_id:[^\s]+/, '')}
          </Text>

          {/* ── Mark as Sold panel (checkout type only) ── */}
          {notif.type === 'checkout' && resolvedCropId && (
            <Box mt={3}>
              {!soldDone ? (
                <>
                  {!showSoldPanel ? (
                    <Box
                      as="button"
                      fontSize="12px" fontWeight="700"
                      color="#16a34a"
                      px={3} py={1} borderRadius="full"
                      bg="#dcfce7"
                      border="1px solid #bbf7d0"
                      _hover={{ bg: '#bbf7d0' }}
                      transition="all 0.15s"
                      onClick={() => setShowSoldPanel(true)}
                    >
                      🏷️ Mark as Sold
                    </Box>
                  ) : (
                    <Box
                      bg="white"
                      border="1.5px solid #bbf7d0"
                      borderRadius="12px"
                      p={3}
                      mt={1}
                    >
                      <Text fontSize="12px" fontWeight="700" color="#14532d" mb={2}>
                        How much did you sell?
                      </Text>
                      {buyerQty > 0 && (
                        <Text fontSize="11px" color="#6b7280" mb={2}>
                          Buyer ordered: <strong>{buyerQty} {buyerUnit}</strong>
                        </Text>
                      )}
                      <HStack gap={2} mb={2}>
                        <input
                          type="number"
                          min={1}
                          value={soldQty}
                          onChange={(e) => setSoldQty(Math.max(1, Number(e.target.value)))}
                          style={{
                            width: '80px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1.5px solid #d1fae5',
                            fontSize: '14px',
                            fontWeight: '700',
                            color: '#14532d',
                            outline: 'none',
                          }}
                        />
                        <Text fontSize="12px" color="#6b7280">{buyerUnit || 'units'} sold</Text>
                      </HStack>
                      {soldError && (
                        <Text fontSize="11px" color="#ef4444" mb={2}>{soldError}</Text>
                      )}
                      <HStack gap={2}>
                        <Box
                          as="button"
                          fontSize="12px" fontWeight="700"
                          color="white"
                          px={3} py="6px" borderRadius="8px"
                          bg={soldLoading ? '#86efac' : '#16a34a'}
                          _hover={{ bg: '#15803d' }}
                          transition="all 0.15s"
                          onClick={handleMarkSold}
                          style={{ cursor: soldLoading ? 'not-allowed' : 'pointer' }}
                        >
                          {soldLoading ? 'Saving…' : '✓ Confirm Sold'}
                        </Box>
                        <Box
                          as="button"
                          fontSize="12px" fontWeight="600"
                          color="#6b7280"
                          px={3} py="6px" borderRadius="8px"
                          bg="gray.100"
                          _hover={{ bg: 'gray.200' }}
                          transition="all 0.15s"
                          onClick={() => { setShowSoldPanel(false); setSoldError(''); }}
                        >
                          Cancel
                        </Box>
                      </HStack>
                    </Box>
                  )}
                </>
              ) : (
                <Box
                  display="inline-flex" alignItems="center" gap={1}
                  fontSize="12px" fontWeight="700"
                  color="#16a34a"
                  px={3} py={1} borderRadius="full"
                  bg="#dcfce7"
                  border="1px solid #bbf7d0"
                >
                  ✅ Marked as sold ({soldQty} {buyerUnit})
                </Box>
              )}
            </Box>
          )}

          {/* Action row */}
          <HStack mt={3} gap={2}>
            {!notif.is_read ? (
              <Box
                as="button"
                fontSize="12px" fontWeight="700"
                color="#16a34a"
                px={3} py={1} borderRadius="full"
                bg="#dcfce7"
                _hover={{ bg: '#bbf7d0' }}
                transition="all 0.15s"
                onClick={() => onMarkRead(notif.id)}
              >
                ✓ Mark read
              </Box>
            ) : (
              <Box
                as="button"
                fontSize="12px" fontWeight="600"
                color="gray.400"
                px={3} py={1} borderRadius="full"
                bg="gray.100"
                _hover={{ bg: 'gray.200' }}
                transition="all 0.15s"
                onClick={() => onMarkUnread(notif.id)}
              >
                ↩ Mark unread
              </Box>
            )}
            <Box
              as="button"
              fontSize="12px" fontWeight="600"
              color="gray.400"
              px={3} py={1} borderRadius="full"
              _hover={{ color: '#ef4444', bg: '#fee2e2' }}
              transition="all 0.15s"
              onClick={() => onDelete(notif.id)}
            >
              Delete
            </Box>
          </HStack>
        </Box>
      </HStack>
    </Box>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [bulkLoading, setBulkLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setNotifications(data as Notification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    if (!user) return;

    // Listen to ALL changes (INSERT + UPDATE + DELETE) so badge & list stay in sync
    const channel = supabase
      .channel(`notifications-page-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new as Notification, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev =>
              prev.map(n => n.id === (payload.new as Notification).id ? payload.new as Notification : n)
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const markRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markUnread = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n));
    await supabase.from('notifications').update({ is_read: false }).eq('id', id);
  };

  const deleteNotif = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  };

  const markAllRead = async () => {
    setBulkLoading(true);
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) { setBulkLoading(false); return; }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user!.id)
      .eq('is_read', false);
    setBulkLoading(false);
  };

  const deleteAll = async () => {
    if (!notifications.length) return;
    const confirmed = window.confirm('Delete all notifications? This cannot be undone.');
    if (!confirmed) return;
    setBulkLoading(true);
    setNotifications([]);
    await supabase.from('notifications').delete().eq('user_id', user!.id);
    setBulkLoading(false);
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = notifications.filter(n => {
    if (activeTab === 'all')    return true;
    if (activeTab === 'unread') return !n.is_read;
    return n.type === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const tabCount = (key: FilterTab): number => {
    if (key === 'all')    return notifications.length;
    if (key === 'unread') return unreadCount;
    return notifications.filter(n => n.type === key).length;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box
      minH="100vh"
      bg="linear-gradient(160deg, #f0fdf4 0%, #f9fafb 60%)"
      py={10} px={4}
    >
      <Box maxW="760px" mx="auto">

        {/* ── Header ── */}
        <HStack justify="space-between" align="flex-start" mb={8} wrap="wrap" gap={4}>
          <Box>
            <Text
              fontSize="xs" fontWeight="800" letterSpacing="widest"
              color="green.600" textTransform="uppercase" mb={1}
            >
              Activity Center
            </Text>
            <Heading
              fontSize={{ base: '2xl', md: '3xl' }}
              fontWeight="900"
              color="#14532d"
              lineHeight="1.1"
            >
              Notifications
              {unreadCount > 0 && (
                <Badge
                  ml={3}
                  bg="#16a34a" color="white"
                  borderRadius="full" fontSize="sm"
                  px={2.5} py={0.5}
                  fontWeight="800"
                  verticalAlign="middle"
                >
                  {unreadCount}
                </Badge>
              )}
            </Heading>
            <Text color="gray.500" fontSize="sm" mt={1}>
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : "You're all caught up!"}
            </Text>
          </Box>

          {/* Bulk actions */}
          <HStack gap={2} flexShrink={0}>
            {unreadCount > 0 && (
              <Button
                size="sm" borderRadius="full"
                bg="#dcfce7" color="#16a34a"
                fontWeight="700" fontSize="xs"
                _hover={{ bg: '#bbf7d0' }}
                onClick={markAllRead}
                loading={bulkLoading}
              >
                ✓ Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                size="sm" borderRadius="full"
                bg="gray.100" color="gray.500"
                fontWeight="700" fontSize="xs"
                _hover={{ bg: '#fee2e2', color: '#ef4444' }}
                onClick={deleteAll}
              >
                Clear all
              </Button>
            )}
          </HStack>
        </HStack>

        {/* ── Filter Tabs ── */}
        <Box
          overflowX="auto"
          mb={6}
          css={{ scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
        >
          <HStack gap={2} pb={1} minW="max-content">
            {TABS.map(tab => {
              const count = tabCount(tab.key);
              const isActive = activeTab === tab.key;
              return (
                <Box
                  key={tab.key}
                  as="button"
                  px={4} py={2}
                  borderRadius="full"
                  fontSize="sm" fontWeight="700"
                  border="1.5px solid"
                  borderColor={isActive ? '#16a34a' : '#e5e7eb'}
                  bg={isActive ? '#16a34a' : 'white'}
                  color={isActive ? 'white' : '#6b7280'}
                  _hover={{
                    borderColor: '#16a34a',
                    color: isActive ? 'white' : '#16a34a',
                  }}
                  transition="all 0.15s"
                  onClick={() => setActiveTab(tab.key)}
                  boxShadow={isActive ? '0 2px 8px rgba(22,163,74,0.3)' : 'none'}
                >
                  {tab.icon} {tab.label}
                  {count > 0 && (
                    <Badge
                      ml={2}
                      bg={isActive ? 'rgba(255,255,255,0.25)' : '#f3f4f6'}
                      color={isActive ? 'white' : '#6b7280'}
                      borderRadius="full"
                      fontSize="10px" px={1.5} py={0}
                    >
                      {count}
                    </Badge>
                  )}
                </Box>
              );
            })}
          </HStack>
        </Box>

        {/* ── Content ── */}
        {loading ? (
          <Center py={20}>
            <VStack gap={3}>
              <Spinner color="#16a34a" size="xl" />
              <Text color="gray.400" fontSize="sm" fontWeight="600">Loading notifications…</Text>
            </VStack>
          </Center>
        ) : filtered.length === 0 ? (
          <Box
            textAlign="center" py={20}
            bg="white" borderRadius="24px"
            border="2px dashed #d1fae5"
          >
            <Text fontSize="5xl" mb={4}>
              {activeTab === 'unread' ? '✅' : '🔔'}
            </Text>
            <Text fontWeight="800" fontSize="lg" color="#14532d" mb={1}>
              {activeTab === 'unread' ? "All caught up!" : "No notifications here"}
            </Text>
            <Text color="gray.400" fontSize="sm">
              {activeTab === 'unread'
                ? "You've read everything. Nice work, farmer!"
                : "Nothing in this category yet."}
            </Text>
          </Box>
        ) : (
          <VStack gap={3} align="stretch">
            {/* Today group */}
            {(() => {
              const todayStr = new Date().toDateString();
              const todayItems = filtered.filter(n => new Date(n.created_at).toDateString() === todayStr);
              const olderItems = filtered.filter(n => new Date(n.created_at).toDateString() !== todayStr);
              return (
                <>
                  {todayItems.length > 0 && (
                    <>
                      <Text fontSize="11px" fontWeight="800" color="gray.400" textTransform="uppercase" letterSpacing="wider" px={1}>
                        Today
                      </Text>
                      {todayItems.map(n => (
                        <NotifCard
                          key={n.id}
                          notif={n}
                          onMarkRead={markRead}
                          onMarkUnread={markUnread}
                          onDelete={deleteNotif}
                        />
                      ))}
                    </>
                  )}
                  {olderItems.length > 0 && (
                    <>
                      <Text fontSize="11px" fontWeight="800" color="gray.400" textTransform="uppercase" letterSpacing="wider" px={1} mt={2}>
                        Earlier
                      </Text>
                      {olderItems.map(n => (
                        <NotifCard
                          key={n.id}
                          notif={n}
                          onMarkRead={markRead}
                          onMarkUnread={markUnread}
                          onDelete={deleteNotif}
                        />
                      ))}
                    </>
                  )}
                </>
              );
            })()}
          </VStack>
        )}
      </Box>
    </Box>
  );
};

export default Notifications;