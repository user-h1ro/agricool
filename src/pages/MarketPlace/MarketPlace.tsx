import {
  Flex,
  Heading,
  HStack,
  Input,
  Text,
  useDisclosure,
  VStack,
  Box,
  Button as ChakraButton,
} from '@chakra-ui/react';
import { LuSearch, LuMapPin, LuSprout, LuShoppingCart, LuLeaf } from 'react-icons/lu';
import CropCard from './components/CropCard';
import { useEffect, useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import AddCropsForm from './components/AddCropsForm';
import { supabase } from '@/supabase';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { useAuth } from '@/context/AuthProvider';
import { useRevenue } from '@/context/RevenueProvider';
import AdBanner from '@/components/AdBanner';
import PaymentModal from '@/components/PaymentModal';
import { useMusic } from '@/context/MusicProvider';

const MarketPlace = () => {
  const { user } = useAuth();
  const { isPremium, revenue, deductListingCredit } = useRevenue();
  const { playEnlistingSound } = useMusic();

  // Payment gate state
  const [showListingPayModal, setShowListingPayModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  const [searchCrops, setSearchCrops] = useState<string>('');
  const [cropsList, setCropsList] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showNearMe, setShowNearMe] = useState(false);
  const [addedItem, setAddedItem] = useState<any>(null);
  const [editingCrop, setEditingCrop] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const { onOpen, open, onClose } = useDisclosure();
  const navigate = useNavigate();
  const debouncedSearch = useDebounce(searchCrops, 300);

  const [cartCount, setCartCount] = useState(0);

  const fetchCrops = async () => {
    const { data } = await supabase
      .from('crops')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCropsList(data);
  };

  const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('agricool_cart') || '[]');
    setCartCount(cart.length);
  };

  useEffect(() => {
    fetchCrops();
    updateCartCount();
  }, []);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
          setShowNearMe(true);
          showSuccess("📍 Location acquired! Showing nearest listings first.");
        },
        () => alert("❌ Could not get your location. Please allow permission.")
      );
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    return L.latLng(lat1, lon1).distanceTo([lat2, lon2]) / 1000;
  };

  const filteredCrops = useMemo(() => {
    let result = cropsList.filter((crop) =>
      crop.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

    if (showNearMe && userLocation) {
      result = [...result].sort((a, b) => {
        if (!a.latitude || !a.longitude) return 1;
        if (!b.latitude || !b.longitude) return -1;
        const distA = calculateDistance(userLocation[0], userLocation[1], a.latitude, a.longitude);
        const distB = calculateDistance(userLocation[0], userLocation[1], b.latitude, b.longitude);
        return distA - distB;
      });
    }
    return result;
  }, [cropsList, debouncedSearch, showNearMe, userLocation]);

  const addToCart = async (crop: any) => {
    const newCart = [...(JSON.parse(localStorage.getItem('agricool_cart') || '[]')), crop];
    localStorage.setItem('agricool_cart', JSON.stringify(newCart));
    setAddedItem(crop);
    updateCartCount();

    if (crop.seller_id && crop.seller_id !== user?.id) {
      await supabase.from('notifications').insert({
        user_id: crop.seller_id,
        type: 'cart_add',
        title: '🛒 Someone added your crop!',
        message: `${crop.name} (${crop.quantity}) was added to a buyer's cart.`,
        crop_id: crop.id,
        crop_name: crop.name,
        buyer_name: user?.email?.split('@')[0] || 'A buyer',
      });
    }
  };

  const handleEdit = (crop: any) => {
    setEditingCrop(crop);
    onOpen();
  };

  // Actually saves the crop after payment (or if editing)
  const saveCropToDb = async (payload: any) => {
    try {
      if (editingCrop) {
        const updatePayload = {
          name: payload.name,
          variety: payload.variety,
          quantity: payload.quantity,
          price: payload.price,
          unit: payload.unit,
          category: payload.category,
          seller: payload.seller,
          contact: payload.contact,
          facebook: payload.facebook,
          location: payload.location,
          latitude: payload.latitude,
          longitude: payload.longitude,
          emoji: payload.emoji,
          bg: payload.bg,
          avatar_bg: payload.avatar_bg,
          avatar_color: payload.avatar_color,
        };
        const { error } = await supabase.from('crops').update(updatePayload).eq('id', editingCrop.id);
        if (error) throw error;
        showSuccess("✅ Listing updated successfully!");
      } else {
        const { error } = await supabase.from('crops').insert(payload);
        if (error) throw error;
        playEnlistingSound();
        showSuccess("✅ Listing posted successfully! Check the Live Map.");
      }
      setEditingCrop(null);
      fetchCrops();
    } catch (error: any) {
      alert("❌ Failed: " + (error.message || "Unknown error"));
    }
  };

  const handleFormSubmit = async (payload: any) => {
    // Edits are always free — only new listings need payment gate
    if (editingCrop) {
      await saveCropToDb(payload);
      return;
    }

    // Premium users post for free (unlimited)
    if (isPremium) {
      await saveCropToDb(payload);
      return;
    }

    // Free users with remaining credits post for free (deduct 1 credit)
    if (revenue.listingCredits > 0) {
      await saveCropToDb(payload);
      deductListingCredit();
      return;
    }

    // No credits left → show ₱20 GCash payment modal
    setPendingPayload(payload);
    setShowListingPayModal(true);
  };

  return (
    <Box
      minH="100vh"
      style={{
        background: 'linear-gradient(160deg, #faf8f0 0%, #f5f0e8 40%, #ede8d8 100%)',
      }}
    >
      {/* Hero Banner */}
      <Box
        position="relative"
        overflow="hidden"
        px={6}
        pt={10}
        pb={8}
        style={{
          background: 'linear-gradient(135deg, #3d5a2e 0%, #4a6b38 50%, #5a7a45 100%)',
        }}
      >
        {/* Decorative grain texture overlay */}
        <Box
          position="absolute"
          inset={0}
          opacity={0.04}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='7' r='1'/%3E%3Ccircle cx='47' cy='7' r='1'/%3E%3Ccircle cx='7' cy='27' r='1'/%3E%3Ccircle cx='27' cy='27' r='1'/%3E%3Ccircle cx='47' cy='27' r='1'/%3E%3Ccircle cx='7' cy='47' r='1'/%3E%3Ccircle cx='27' cy='47' r='1'/%3E%3Ccircle cx='47' cy='47' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <Box maxW="1400px" mx="auto">
          <HStack width="100%" justifyContent="space-between" align="center" flexWrap="wrap" gap={4}>
            <VStack align="flex-start" gap={2}>
              <HStack gap={2} align="center">
                <Box
                  px={3}
                  py={1}
                  borderRadius="full"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                  }}
                >
                  <Text
                    fontSize="xs"
                    fontWeight="700"
                    color="rgba(255,255,255,0.9)"
                    letterSpacing="0.12em"
                    textTransform="uppercase"
                    style={{ fontFamily: "'Courier New', monospace" }}
                  >
                    🌾 Hyper-Local Marketplace
                  </Text>
                </Box>
              </HStack>
              <Heading
                size="4xl"
                color="white"
                lineHeight="1.1"
                style={{ fontFamily: "'Georgia', serif", textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
              >
                Buy fresh from<br />your neighbors
              </Heading>
              <Text color="rgba(255,255,255,0.75)" fontSize="md" mt={1}>
                Connect directly with local farmers in your area
              </Text>
            </VStack>

            <VStack gap={3} align="flex-end">
              <HStack gap={2} flexWrap="wrap" justify="flex-end">
                <ChakraButton
                  onClick={getUserLocation}
                  size="md"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1.5px solid rgba(255,255,255,0.4)',
                    color: 'white',
                    borderRadius: '10px',
                    fontWeight: '600',
                    backdropFilter: 'blur(8px)',
                    padding: '0 16px',
                    height: '42px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <LuMapPin size={16} /> Near Me
                </ChakraButton>

                <ChakraButton
                  onClick={() => { setEditingCrop(null); onOpen(); }}
                  size="md"
                  style={{
                    background: '#c8a86b',
                    border: 'none',
                    color: '#2d1f0a',
                    borderRadius: '10px',
                    fontWeight: '700',
                    padding: '0 20px',
                    height: '42px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  }}
                >
                  <LuSprout size={16} /> Add Crop Listing
                </ChakraButton>

                <Box
                  position="relative"
                  cursor="pointer"
                  onClick={() => navigate('/dashboard/cart')}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1.5px solid rgba(255,255,255,0.3)',
                    borderRadius: '10px',
                    padding: '0 16px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'white',
                    fontWeight: '600',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <LuShoppingCart size={16} />
                  Cart
                  {cartCount > 0 && (
                    <Box
                      style={{
                        background: '#e74c3c',
                        color: 'white',
                        borderRadius: '9999px',
                        minWidth: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '0 5px',
                      }}
                    >
                      {cartCount}
                    </Box>
                  )}
                </Box>
              </HStack>

              {/* Stats strip */}
              <HStack gap={4}>
                <Text fontSize="sm" color="rgba(255,255,255,0.65)">
                  <Text as="span" color="white" fontWeight="700">{cropsList.length}</Text> active listings
                </Text>
                <Box w="1px" h="12px" bg="rgba(255,255,255,0.3)" />
                <Text fontSize="sm" color="rgba(255,255,255,0.65)">
                  Updated in real-time
                </Text>
              </HStack>
            </VStack>
          </HStack>
        </Box>
      </Box>

      {/* Search + Filter Bar */}
      <Box
        style={{
          background: '#f0ead8',
          borderBottom: '1px solid #ddd5b8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
        py={4}
        px={6}
      >
        <Box maxW="1400px" mx="auto">
          <HStack gap={4} flexWrap="wrap">
            <Box flex={1} minW="260px" position="relative">
              <Box
                position="absolute"
                left="14px"
                top="50%"
                style={{ transform: 'translateY(-50%)', color: '#7a6a4a', pointerEvents: 'none', zIndex: 1 }}
              >
                <LuSearch size={18} />
              </Box>
              <Input
                rounded="xl"
                size="lg"
                placeholder="Search crops… (e.g. Pechay, Tomato)"
                value={searchCrops}
                onChange={(e) => setSearchCrops(e.target.value)}
                pl="44px"
                style={{
                  background: 'white',
                  border: '2px solid #c8b89a',
                  borderRadius: '12px',
                  fontSize: '15px',
                  color: '#3d2e1a',
                  outline: 'none',
                }}
              />
            </Box>

            {showNearMe && (
              <Box
                px={4}
                py={2}
                borderRadius="full"
                style={{
                  background: '#3d5a2e',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📍 Showing nearest first
                <Box
                  as="button"
                  onClick={() => setShowNearMe(false)}
                  style={{
                    marginLeft: '4px',
                    opacity: 0.7,
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    fontSize: '14px',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </Box>
              </Box>
            )}
          </HStack>
        </Box>
      </Box>

      {/* Main Content */}
      <Box maxW="1400px" mx="auto" px={6} py={8}>

        {/* Ad Banner — shown to free-tier users only */}
        <AdBanner />

        {/* Listing credits / fee notice for free users */}
        {!isPremium && (
          <Box
            mb={4}
            px={4} py={3}
            borderRadius="12px"
            style={{
              background: revenue.listingCredits > 0
                ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
                : 'linear-gradient(135deg, #fff7ed, #fef3c7)',
              border: revenue.listingCredits > 0 ? '1.5px solid #86efac' : '1.5px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap' as const,
              gap: '8px',
            }}
          >
            <Text fontSize="sm" color={revenue.listingCredits > 0 ? '#166534' : '#92400e'} fontWeight="600">
              {revenue.listingCredits > 0
                ? `🌿 You have ${revenue.listingCredits} free listing credit${revenue.listingCredits !== 1 ? 's' : ''} remaining`
                : '⚠️ No free credits left — next listing costs ₱20 via GCash'}
            </Text>
            <Text fontSize="xs" color="#64748b">
              Upgrade to Premium for unlimited free listings →
            </Text>
          </Box>
        )}
        {filteredCrops.length === 0 ? (
          <VStack py={20} gap={4}>
            <Text fontSize="5xl">🌱</Text>
            <Text fontSize="xl" color="#6b5a3e" fontWeight="600">No crops found nearby</Text>
            <Text color="#9a8a6e" fontSize="md">Try a different search or be the first to list in your area!</Text>
            <ChakraButton
              onClick={() => { setEditingCrop(null); onOpen(); }}
              mt={2}
              style={{
                background: '#3d5a2e',
                color: 'white',
                borderRadius: '10px',
                padding: '10px 24px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              + Add First Listing
            </ChakraButton>
          </VStack>
        ) : (
          <>
            <HStack mb={5} justify="space-between" align="center">
              <Text fontSize="sm" color="#7a6a4a" fontWeight="500">
                Showing <Text as="span" fontWeight="700" color="#3d5a2e">{filteredCrops.length}</Text> listing{filteredCrops.length !== 1 ? 's' : ''}
              </Text>
              <HStack gap={2} align="center">
                <LuLeaf size={14} color="#3d5a2e" />
                <Text fontSize="xs" color="#9a8a6e">Fresh & locally sourced</Text>
              </HStack>
            </HStack>

            <Flex flexWrap="wrap" gap="20px" w="full">
              {filteredCrops.map((crop) => (
                <CropCard
                  key={crop.id}
                  crop={crop}
                  userLocation={userLocation}
                  onDelete={fetchCrops}
                  onAddToCart={addToCart}
                  onEdit={handleEdit}
                />
              ))}
            </Flex>
          </>
        )}
      </Box>

      <AddCropsForm
        isOpen={open}
        onClose={() => { onClose(); setEditingCrop(null); }}
        onSubmit={handleFormSubmit}
        editingCrop={editingCrop}
      />

      {/* Success Modal */}
      {successMessage && (
        <Box
          position="fixed"
          inset={0}
          zIndex={9999}
          display="flex"
          alignItems="center"
          justifyContent="center"
          style={{ background: 'rgba(30,20,10,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <Box
            style={{
              background: 'linear-gradient(145deg, #faf8f0, #f0ead8)',
              border: '2px solid #c8b89a',
              borderRadius: '20px',
              padding: '40px',
              textAlign: 'center',
              maxWidth: '380px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <Text fontSize="4xl" mb={4}>✅</Text>
            <Heading
              size="lg"
              mb={3}
              style={{ fontFamily: "'Georgia', serif", color: '#2d1f0a' }}
            >
              Success!
            </Heading>
            <Text fontSize="md" mb={6} color="#6b5a3e">{successMessage}</Text>
            <ChakraButton
              onClick={() => setSuccessMessage('')}
              style={{
                background: '#3d5a2e',
                color: 'white',
                borderRadius: '10px',
                padding: '10px 32px',
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              Done
            </ChakraButton>
          </Box>
        </Box>
      )}

      {/* Add to Cart Modal */}
      {addedItem && (
        <Box
          position="fixed"
          inset={0}
          zIndex={9999}
          display="flex"
          alignItems="center"
          justifyContent="center"
          style={{ background: 'rgba(30,20,10,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <Box
            style={{
              background: 'linear-gradient(145deg, #faf8f0, #f0ead8)',
              border: '2px solid #c8b89a',
              borderRadius: '20px',
              padding: '40px',
              textAlign: 'center',
              maxWidth: '400px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <Text fontSize="4xl" mb={4}>🛒</Text>
            <Heading
              size="lg"
              mb={3}
              style={{ fontFamily: "'Georgia', serif", color: '#2d1f0a' }}
            >
              Added to Cart!
            </Heading>
            <Text mb={6} color="#6b5a3e">
              <Text as="span" fontWeight="700">{addedItem.name}</Text> has been added to your cart.
            </Text>
            <HStack justify="center" gap={3}>
              <ChakraButton
                variant="outline"
                onClick={() => setAddedItem(null)}
                style={{
                  border: '2px solid #c8b89a',
                  background: 'transparent',
                  color: '#6b5a3e',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Continue
              </ChakraButton>
              <ChakraButton
                onClick={() => { setAddedItem(null); navigate('/dashboard/cart'); }}
                style={{
                  background: '#3d5a2e',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                View Cart
              </ChakraButton>
            </HStack>
          </Box>
        </Box>
      )}

      {/* ₱20 Listing Fee Payment Modal — shown when free user has no credits */}
      {showListingPayModal && pendingPayload && (
        <PaymentModal
          type="listing"
          onSuccess={async () => {
            setShowListingPayModal(false);
            await saveCropToDb(pendingPayload);
            setPendingPayload(null);
          }}
          onCancel={() => {
            setShowListingPayModal(false);
            setPendingPayload(null);
          }}
        />
      )}
    </Box>
  );
};

export default MarketPlace;