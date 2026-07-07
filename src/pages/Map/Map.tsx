import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/supabase';
import { Heading, VStack, Text, Box, HStack, Badge, Spinner, Center } from '@chakra-ui/react';
import L from 'leaflet';
import '@/fix-leaflet-icons';
import { Crop } from '@/pages/MarketPlace/types';
import SellerDetailModal from './SellerDetailModal';

const DEFAULT_CENTER: [number, number] = [14.6760, 121.0437];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const sanitize = (str: string | undefined | null): string => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const buildCropIcon = (emoji: string, bg: string) =>
  L.divIcon({
    html: `<div style="
      font-size:1.4rem;background:${sanitize(bg)};border-radius:50%;
      width:40px;height:40px;display:flex;align-items:center;justify-content:center;
      border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);cursor:pointer;
    ">${sanitize(emoji)}</div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  });

const buildUserLocationIcon = () =>
  L.divIcon({
    html: `<div style="position:relative;width:22px;height:22px;">
      <div style="
        position:absolute;inset:0;background:#3b82f6;border-radius:50%;
        border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.6);
        animation:pulse-ring 1.6s ease-out infinite;
      "></div>
      <style>@keyframes pulse-ring{0%{box-shadow:0 0 0 0 rgba(59,130,246,0.5)}70%{box-shadow:0 0 0 14px rgba(59,130,246,0)}100%{box-shadow:0 0 0 0 rgba(59,130,246,0)}}</style>
    </div>`,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });

const Map = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Seller detail modal state
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchCrops = useCallback(async () => {
    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .order('created_at', { ascending: false });
    if (error && import.meta.env.DEV) console.error('Error fetching crops:', error);
    if (data) setCrops(data as Crop[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCrops();
    const channel = supabase
      .channel('crops-live-map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crops' }, (payload) => {
        if (payload.eventType === 'INSERT') setCrops((prev) => [payload.new as Crop, ...prev]);
        else if (payload.eventType === 'DELETE') setCrops((prev) => prev.filter((c) => c.id !== (payload.old as Crop).id));
        else if (payload.eventType === 'UPDATE') setCrops((prev) => prev.map((c) => (c.id === (payload.new as Crop).id ? (payload.new as Crop) : c)));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchCrops]);

  const placeUserMarker = useCallback((lat: number, lng: number, accuracy: number, map: L.Map) => {
    if (userMarkerRef.current) userMarkerRef.current.remove();
    if (accuracyCircleRef.current) accuracyCircleRef.current.remove();
    accuracyCircleRef.current = L.circle([lat, lng], {
      radius: accuracy, color: '#3b82f6', fillColor: '#93c5fd', fillOpacity: 0.15, weight: 1, dashArray: '4 4',
    }).addTo(map);
    userMarkerRef.current = L.marker([lat, lng], { icon: buildUserLocationIcon(), zIndexOffset: 1000, title: 'Your location' })
      .addTo(map)
      .bindPopup(`<div style="font-family:system-ui;text-align:center;padding:4px 8px;">
        <div style="font-size:1.4rem;margin-bottom:4px;">📍</div>
        <div style="font-weight:700;color:#1e40af;">You are here</div>
        <div style="font-size:0.78rem;color:#6b7280;margin-top:2px;">
          ±${accuracy < 1000 ? Math.round(accuracy) + ' m' : (accuracy / 1000).toFixed(1) + ' km'} accuracy
        </div>
      </div>`, { maxWidth: 180 });
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView(DEFAULT_CENTER, 12);
    mapInstanceRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
    }).addTo(map);
    L.control.scale().addTo(map);
    setTimeout(() => map.invalidateSize(), 300);
    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  }, []);

  const handleLocateMe = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setLocating(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        placeUserMarker(latitude, longitude, accuracy, map);
        map.flyTo([latitude, longitude], 14, { duration: 1.2 });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. Please allow it in your browser settings.'
            : 'Could not detect your location. Please try again.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [placeUserMarker]);

  // Sync markers — click opens modal instead of a Leaflet popup
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const existingIds = new Set(Object.keys(markersRef.current));
    const incomingIds = new Set(crops.map((c) => String(c.id)));

    existingIds.forEach((id) => {
      if (!incomingIds.has(id)) { markersRef.current[id].remove(); delete markersRef.current[id]; }
    });

    crops.forEach((crop) => {
      if (!crop.latitude || !crop.longitude) return;
      const id = String(crop.id);
      if (!existingIds.has(id)) {
        const icon = buildCropIcon(crop.emoji, crop.bg || '#f0fdf4');
        const marker = L.marker([crop.latitude, crop.longitude], { icon, riseOnHover: true, title: crop.name })
          .addTo(map);
        marker.on('click', () => {
          setSelectedCrop(crop);
          setModalOpen(true);
        });
        markersRef.current[id] = marker;
      }
    });
  }, [crops]);

  // Keep selectedCrop fresh when crops update
  useEffect(() => {
    if (selectedCrop) {
      const updated = crops.find((c) => c.id === selectedCrop.id);
      if (updated) setSelectedCrop(updated);
    }
  }, [crops]);

  const distanceKm =
    selectedCrop?.latitude && selectedCrop?.longitude && userLocation
      ? haversineKm(userLocation.lat, userLocation.lng, selectedCrop.latitude, selectedCrop.longitude)
      : null;

  const mappableCrops = crops.filter((c) => c.latitude && c.longitude);

  return (
    <VStack align="stretch" py="10" width="100%" gap={6}>
      <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={3}>
        <VStack align="start" gap={1}>
          <Heading size="4xl">🗺️ Live Seller Map</Heading>
          <Text color="gray.500" fontSize="lg">See where fresh produce is available near you in real-time</Text>
        </VStack>
        <HStack gap={2} flexWrap="wrap">
          {!loading && (
            <Badge colorScheme="blue" fontSize="sm" px={3} py={1} borderRadius="full">
              🌿 {mappableCrops.length} seller{mappableCrops.length !== 1 ? 's' : ''} active
            </Badge>
          )}
          {userLocation && (
            <Badge colorScheme="blue" fontSize="sm" px={3} py={1} borderRadius="full">📍 Location pinned</Badge>
          )}
          <Badge colorScheme="green" fontSize="md" px={4} py={2} borderRadius="full">LIVE • REALTIME</Badge>
        </HStack>
      </HStack>

      <HStack gap={3} flexWrap="wrap" alignItems="center">
        <Box
          as="button"
          onClick={locating ? undefined : handleLocateMe}
          aria-disabled={locating}
          px={5} py={3} borderRadius="xl"
          bg={userLocation ? 'blue.500' : 'green.500'}
          color="white" fontWeight="bold" fontSize="sm"
          display="flex" alignItems="center" gap={2}
          _hover={{ opacity: 0.88 }}
          _disabled={{ opacity: 0.6, cursor: 'not-allowed' }}
          transition="all 0.15s" boxShadow="md"
          cursor={locating ? 'not-allowed' : 'pointer'}
        >
          {locating ? <><Spinner size="xs" color="white" /> Detecting location…</> : userLocation ? '🔄 Update My Location' : '📍 Pin My Location'}
        </Box>
        {userLocation && <Text fontSize="sm" color="blue.600" fontWeight="medium">✅ Your location is pinned — tap any seller pin for distance</Text>}
        {locationError && <Text fontSize="sm" color="red.500" fontWeight="medium">⚠️ {locationError}</Text>}
      </HStack>

      <Box position="relative" w="100%" h="72vh" borderRadius="2xl" overflow="hidden" boxShadow="xl" border="1px solid" borderColor="gray.100">
        <Box ref={mapRef} w="100%" h="100%" />

        {loading && (
          <Center position="absolute" inset={0} bg="whiteAlpha.800" zIndex={1000} borderRadius="2xl">
            <VStack gap={3}>
              <Spinner size="xl" color="green.500" />
              <Text color="gray.600" fontWeight="medium">Loading sellers...</Text>
            </VStack>
          </Center>
        )}

        {!loading && mappableCrops.length === 0 && (
          <Center position="absolute" inset={0} bg="whiteAlpha.900" zIndex={1000} borderRadius="2xl">
            <VStack gap={2}>
              <Text fontSize="3xl">🌾</Text>
              <Text fontWeight="semibold" color="gray.700">No sellers on the map yet</Text>
              <Text fontSize="sm" color="gray.500">Be the first to list your produce in the Marketplace!</Text>
            </VStack>
          </Center>
        )}
      </Box>

      <Text fontSize="sm" color="gray.500" textAlign="center">
        💡 Tap any seller pin for full details & distance • 📍 Pin your location to measure distances
      </Text>

      {/* Seller detail modal */}
      <SellerDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        crop={selectedCrop}
        distanceKm={distanceKm}
      />
    </VStack>
  );
};

export default Map;