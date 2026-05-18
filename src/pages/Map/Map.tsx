import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/supabase';
import { Heading, VStack, Text, Box, HStack, Badge } from '@chakra-ui/react';
import L from 'leaflet';

const DEFAULT_CENTER: [number, number] = [14.6760, 121.0437]; // Quezon City

const Map = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const [crops, setCrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch crops
  const fetchCrops = async () => {
    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching crops:', error);
    if (data) {
      setCrops(data);
    }
    setLoading(false);
  };

  // Realtime subscription
  useEffect(() => {
    fetchCrops();

    const channel = supabase
      .channel('crops-live-map')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crops' },
        (payload) => {
          console.log('🔴 Realtime update:', payload.eventType);
          fetchCrops(); // Refresh on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(DEFAULT_CENTER, 12);

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Optional: Add scale control
    L.control.scale().addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when crops change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    crops.forEach((crop) => {
      if (!crop.latitude || !crop.longitude) return;

      const popupHTML = `
        <div style="min-width: 240px; font-family: system-ui;">
          <div style="background: ${crop.bg || '#f0fdf4'}; padding: 8px; border-radius: 8px; text-align: center; margin-bottom: 8px;">
            <span style="font-size: 2rem;">${crop.emoji}</span>
          </div>
          <b>${crop.name}</b><br>
          <strong>₱${crop.price} / ${crop.unit}</strong><br>
          ${crop.variety ? crop.variety + '<br>' : ''}
          📍 ${crop.location || 'No address provided'}<br>
          Seller: <strong>${crop.seller}</strong><br><br>
          <a href="https://www.facebook.com/messages/t/?text=Hi! Interested in your ${encodeURIComponent(crop.name)}" 
             target="_blank" style="color: #32ce0e; font-weight: bold;">
            💬 Message Seller on Messenger
          </a>
        </div>
      `;

      const marker = L.marker([crop.latitude, crop.longitude], {
        riseOnHover: true,
      })
        .addTo(mapInstanceRef.current!)
        .bindPopup(popupHTML, { offset: [0, -10] });

      markersRef.current[crop.id] = marker;
    });
  }, [crops]);

  return (
    <VStack align="stretch" py="10" width="100%" gap={6}>
      <HStack justifyContent="space-between" alignItems="center">
        <VStack align="start" gap={1}>
          <Heading size="4xl">🗺️ Live Seller Map</Heading>
          <Text color="gray.500" fontSize="lg">
            See where fresh produce is available near you in real-time
          </Text>
        </VStack>
        <Badge colorScheme="green" fontSize="md" px={4} py={2} borderRadius="full">
          LIVE • REALTIME
        </Badge>
      </HStack>

      <Box
        ref={mapRef}
        w="100%"
        h="72vh"
        borderRadius="2xl"
        overflow="hidden"
        boxShadow="xl"
        border="1px solid"
        borderColor="gray.100"
      />

      {loading && (
        <Text textAlign="center" color="gray.500">
          Loading map and listings...
        </Text>
      )}

      <Text fontSize="sm" color="gray.500" textAlign="center">
        💡 New listings appear instantly • Click any pin for seller details
      </Text>
    </VStack>
  );
};

export default Map;