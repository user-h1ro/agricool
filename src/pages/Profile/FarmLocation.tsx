import {
  VStack,
  Heading,
  Text,
  Box,
  HStack,
  Button,
  Input,
  Badge,
} from '@chakra-ui/react';
import { useAuth } from '@/context/AuthProvider';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/supabase';
import { LuSave, LuMapPin, LuNavigation, LuCheck, LuArrowLeft, LuMap } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import '@/fix-leaflet-icons';

const FarmLocation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [farmName, setFarmName]             = useState('');
  const [defaultLocation, setDefaultLocation] = useState('');
  const [latitude, setLatitude]             = useState<number | null>(null);
  const [longitude, setLongitude]           = useState<number | null>(null);
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [locating, setLocating]             = useState(false);
  const [pinDropped, setPinDropped]         = useState(false);

  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef      = useRef<L.Marker | null>(null);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setFarmName(data.farm_name || '');
      setDefaultLocation(data.default_location || '');
      setLatitude(data.default_latitude ?? null);
      setLongitude(data.default_longitude ?? null);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  // Place saved marker when profile loads
  useEffect(() => {
    if (!mapInstanceRef.current || !latitude || !longitude) return;
    placeMarker(latitude, longitude, '📍 Your Farm');
    mapInstanceRef.current.flyTo([latitude, longitude], 15);
  }, [latitude, longitude]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView([14.6760, 121.0437], 13);

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom zoom control position
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.scale({ position: 'bottomleft' }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setLatitude(lat);
      setLongitude(lng);
      placeMarker(lat, lng, '📍 Farm Location Set');
      setPinDropped(true);
    });

    setTimeout(() => map.invalidateSize(), 300);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const placeMarker = (lat: number, lng: number, label: string) => {
    if (!mapInstanceRef.current) return;

    const icon = L.divIcon({
      html: `<div style="
        background: linear-gradient(135deg, #16a34a, #15803d);
        width: 40px; height: 40px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(22,163,74,0.4);
        display:flex; align-items:center; justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:1rem;">🌾</span>
      </div>`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -44],
    });

    if (markerRef.current) markerRef.current.remove();
    markerRef.current = L.marker([lat, lng], { icon })
      .addTo(mapInstanceRef.current!)
      .bindPopup(`<b>${label}</b><br><small>${lat.toFixed(5)}, ${lng.toFixed(5)}</small>`, {
        closeButton: false,
      })
      .openPopup();
  };

  const saveLocation = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        farm_name: farmName,
        default_location: defaultLocation,
        default_latitude: latitude,
        default_longitude: longitude,
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      alert('❌ Failed to save: ' + error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      fetchProfile();
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('❌ Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setPinDropped(true);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16);
          placeMarker(lat, lng, '📍 Your Current Location');
        }
        setLocating(false);
      },
      () => {
        alert('❌ Could not get your location.');
        setLocating(false);
      }
    );
  };

  const hasCoords = latitude !== null && longitude !== null;

  return (
    <Box minH="100vh" bg="#e8e0c8" py={8}>
      {/* Top nav strip */}
      <Box maxW="780px" mx="auto" px={5} mb={6}>
        <Button
          variant="ghost"
          size="sm"
          colorScheme="green"
          onClick={() => navigate('/dashboard/profile')}
        >
          <LuArrowLeft style={{ marginRight: '6px' }} />
          Back to Profile
        </Button>
      </Box>

      <Box maxW="780px" mx="auto" px={5}>
        {/* Header */}
        <HStack mb={8} gap={4} align="center">
          <Box
            w="56px" h="56px"
            bg="green.100"
            borderRadius="16px"
            display="flex" alignItems="center" justifyContent="center"
            fontSize="1.6rem"
            flexShrink={0}
          >
            🌾
          </Box>
          <VStack align="start" gap={0}>
            <Heading size="2xl" color="gray.900" fontWeight="800">
              Default Farm Location
            </Heading>
            <Text color="gray.500" fontSize="sm" mt={1}>
              Pre-fill your address and coordinates when listing new crops
            </Text>
          </VStack>
        </HStack>

        {/* Card */}
        <Box
          bg="white"
          borderRadius="24px"
          border="1px solid"
          borderColor="gray.200"
          overflow="hidden"
          boxShadow="0 4px 24px rgba(0,0,0,0.06)"
        >
          {/* Form section */}
          <Box px={8} pt={8} pb={6}>
            <Text fontSize="xs" fontWeight="700" color="green.600" letterSpacing="wider" textTransform="uppercase" mb={4}>
              Farm Details
            </Text>

            <VStack gap={4} align="stretch">
              <Box>
                <Text fontSize="sm" fontWeight="600" color="gray.700" mb={1.5}>Farm Name</Text>
                <Input
                  placeholder="e.g. Mang Mario's Farm"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  size="md"
                  borderRadius="10px"
                  borderColor="gray.200"
                  _focus={{ borderColor: 'green.400', boxShadow: '0 0 0 3px rgba(74,222,128,0.15)' }}
                />
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="600" color="gray.700" mb={1.5}>Default Address</Text>
                <Input
                  placeholder="e.g. Brgy. Magsaysay, Nueva Ecija"
                  value={defaultLocation}
                  onChange={(e) => setDefaultLocation(e.target.value)}
                  size="md"
                  borderRadius="10px"
                  borderColor="gray.200"
                  _focus={{ borderColor: 'green.400', boxShadow: '0 0 0 3px rgba(74,222,128,0.15)' }}
                />
              </Box>
            </VStack>
          </Box>

          {/* Map section */}
          <Box px={8} pb={6}>
            <HStack justify="space-between" align="center" mb={3}>
              <VStack align="start" gap={0}>
                <Text fontSize="xs" fontWeight="700" color="green.600" letterSpacing="wider" textTransform="uppercase">
                  Pin Your Farm
                </Text>
                <Text fontSize="xs" color="gray.400" mt={0.5}>
                  Click anywhere on the map to drop a pin
                </Text>
              </VStack>

              <HStack gap={2}>
                {hasCoords && (
                  <Badge
                    bg="green.50"
                    color="green.700"
                    borderRadius="full"
                    px={3} py={1}
                    fontSize="xs"
                    fontWeight="700"
                    border="1px solid"
                    borderColor="green.200"
                  >
                    <HStack gap={1}>
                      <LuMapPin size={10} />
                      <Text>{latitude!.toFixed(4)}, {longitude!.toFixed(4)}</Text>
                    </HStack>
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="blue"
                  borderRadius="10px"
                  onClick={getCurrentLocation}
                  loading={locating}
                  loadingText="Finding..."
                  fontSize="xs"
                  fontWeight="700"
                >
                  <LuNavigation size={14} style={{ marginRight: '6px' }} />
                  Use My Location
                </Button>
              </HStack>
            </HStack>

            {/* Map container */}
            <Box
              borderRadius="16px"
              overflow="hidden"
              border="2px solid"
              borderColor={pinDropped ? 'green.300' : 'gray.200'}
              transition="border-color 0.3s"
              boxShadow={pinDropped ? '0 0 0 4px rgba(74,222,128,0.12)' : 'none'}
              position="relative"
            >
              <Box ref={mapRef} w="full" h="340px" />

              {/* Hint overlay — only before any pin */}
              {!hasCoords && (
                <Box
                  position="absolute"
                  bottom={4}
                  left="50%"
                  transform="translateX(-50%)"
                  bg="blackAlpha.700"
                  color="white"
                  px={4} py={2}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="600"
                  pointerEvents="none"
                  zIndex={1000}
                  display="flex"
                  alignItems="center"
                  gap={2}
                >
                  <LuMap size={12} />
                  Tap the map to set your farm location
                </Box>
              )}
            </Box>
          </Box>

          {/* Save button */}
          <Box px={8} pb={8}>
            <Button
              w="full"
              size="lg"
              borderRadius="12px"
              fontWeight="700"
              fontSize="sm"
              bg={saved ? 'green.500' : 'gray.900'}
              color="white"
              _hover={{ bg: saved ? 'green.600' : 'gray.700', transform: 'translateY(-1px)', boxShadow: 'lg' }}
              _active={{ transform: 'translateY(0)' }}
              transition="all 0.2s"
              onClick={saveLocation}
              loading={saving}
              loadingText="Saving..."
              disabled={!hasCoords && !farmName}
            >
              {saved
                ? <><LuCheck style={{ marginRight: '8px' }} />Saved!</>
                : <><LuSave style={{ marginRight: '8px' }} />Save Farm Location</>
              }
            </Button>

            {saved && (
              <Text textAlign="center" color="green.600" fontSize="sm" fontWeight="600" mt={3}>
                ✅ Your default farm location has been updated
              </Text>
            )}
          </Box>
        </Box>

        {/* Help tip */}
        <Box
          mt={5}
          p={4}
          bg="amber.50"
          borderRadius="14px"
          border="1px solid"
          borderColor="amber.200"
        >
          <HStack gap={3} align="start">
            <Text fontSize="lg" mt={0.5}>💡</Text>
            <Text fontSize="sm" color="gray.600" lineHeight="1.6">
              <b>Pro tip:</b> Setting your farm location lets buyers see exactly where your produce comes from on the Live Seller Map, and auto-fills your address when you list new crops.
            </Text>
          </HStack>
        </Box>
      </Box>
    </Box>
  );
};

export default FarmLocation;