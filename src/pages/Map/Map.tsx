import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/supabase';
import { Heading, VStack, Text, Box, HStack, Badge, Spinner, Center } from '@chakra-ui/react';
import L from 'leaflet';
import '@/fix-leaflet-icons';
import { Crop } from '@/pages/MarketPlace/types';

const DEFAULT_CENTER: [number, number] = [14.6760, 121.0437]; // Quezon City

// Sanitize a string to prevent XSS in popup HTML
const sanitize = (str: string | undefined | null): string => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Build an emoji divIcon for a crop marker
const buildCropIcon = (emoji: string, bg: string) =>
  L.divIcon({
    html: `<div style="
      font-size: 1.4rem;
      background: ${sanitize(bg)};
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      cursor: pointer;
    ">${sanitize(emoji)}</div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  });

const Map = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);

  // Stable fetch function
  const fetchCrops = useCallback(async () => {
    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (import.meta.env.DEV) console.error('Error fetching crops:', error);
    }
    if (data) setCrops(data as Crop[]);
    setLoading(false);
  }, []);

  // Initial fetch + realtime subscription using payload diffing
  useEffect(() => {
    fetchCrops();

    const channel = supabase
      .channel('crops-live-map')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crops' },
        (payload) => {
          if (import.meta.env.DEV) {
            console.log('Realtime update:', payload.eventType);
          }

          if (payload.eventType === 'INSERT') {
            setCrops((prev) => [payload.new as Crop, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setCrops((prev) => prev.filter((c) => c.id !== (payload.old as Crop).id));
          } else if (payload.eventType === 'UPDATE') {
            setCrops((prev) =>
              prev.map((c) => (c.id === (payload.new as Crop).id ? (payload.new as Crop) : c))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCrops]);

  // Initialize map once
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

    L.control.scale().addTo(map);

    // Fix potential zero-height render on first paint
    setTimeout(() => map.invalidateSize(), 300);

    // "Locate me" button using native Leaflet
    map.on('locationfound', (e) => {
      L.circleMarker(e.latlng, {
        radius: 10,
        color: '#3b82f6',
        fillColor: '#93c5fd',
        fillOpacity: 0.7,
      })
        .addTo(map)
        .bindPopup('📍 You are here')
        .openPopup();
      map.setView(e.latlng, 14);
    });

    // Custom locate control
    const LocateControl = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create('button', '');
        btn.innerHTML = '📍';
        btn.title = 'Find my location';
        btn.style.cssText = `
          background: white;
          border: 2px solid rgba(0,0,0,0.2);
          border-radius: 4px;
          width: 34px;
          height: 34px;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 5px rgba(0,0,0,.2);
        `;
        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.stopPropagation(e);
          map.locate({ setView: false, maxZoom: 14 });
        });
        return btn;
      },
      onRemove() {},
    });

    new LocateControl({ position: 'topleft' }).addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync markers when crops change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const existingIds = new Set(Object.keys(markersRef.current));
    const incomingIds = new Set(crops.map((c) => String(c.id)));

    // Remove stale markers
    existingIds.forEach((id) => {
      if (!incomingIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    crops.forEach((crop) => {
      if (!crop.latitude || !crop.longitude) return;

      const id = String(crop.id);

      // Build popup content with sanitized values
      const messengerLink = crop.facebook
        ? `<a href="https://m.me/${sanitize(crop.facebook)}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;margin-top:8px;padding:6px 12px;background:#32ce0e;color:white;border-radius:6px;text-decoration:none;font-weight:bold;font-size:0.85rem;">
             💬 Message on Messenger
           </a>`
        : crop.contact
        ? `<div style="margin-top:6px;font-size:0.85rem;">📞 ${sanitize(crop.contact)}</div>`
        : '';

      const popupHTML = `
        <div style="min-width:220px;font-family:system-ui;font-size:0.9rem;line-height:1.5;">
          <div style="background:${sanitize(crop.bg)};padding:10px;border-radius:8px;text-align:center;margin-bottom:8px;">
            <span style="font-size:2rem;">${sanitize(crop.emoji)}</span>
          </div>
          <div style="font-weight:700;font-size:1rem;margin-bottom:2px;">${sanitize(crop.name)}</div>
          ${crop.variety ? `<div style="color:#6b7280;font-size:0.8rem;">${sanitize(crop.variety)}</div>` : ''}
          <div style="font-size:1rem;font-weight:600;color:#166534;margin:4px 0;">
            ₱${sanitize(String(crop.price))} / ${sanitize(crop.unit)}
          </div>
          <div style="color:#374151;">📍 ${sanitize(crop.location) || 'No address provided'}</div>
          <div>🧑‍🌾 ${sanitize(crop.seller)}</div>
          ${messengerLink}
        </div>
      `;

      if (existingIds.has(id)) {
        // Update popup content only if crop data changed
        markersRef.current[id].getPopup()?.setContent(popupHTML);
      } else {
        // Add new marker
        const icon = buildCropIcon(crop.emoji, crop.bg || '#f0fdf4');
        const marker = L.marker([crop.latitude, crop.longitude], {
          icon,
          riseOnHover: true,
          title: crop.name,
        })
          .addTo(map)
          .bindPopup(popupHTML, { offset: [0, 0], maxWidth: 260 });

        markersRef.current[id] = marker;
      }
    });
  }, [crops]);

  const mappableCrops = crops.filter((c) => c.latitude && c.longitude);

  return (
    <VStack align="stretch" py="10" width="100%" gap={6}>
      <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={3}>
        <VStack align="start" gap={1}>
          <Heading size="4xl">🗺️ Live Seller Map</Heading>
          <Text color="gray.500" fontSize="lg">
            See where fresh produce is available near you in real-time
          </Text>
        </VStack>
        <HStack gap={2}>
          {!loading && (
            <Badge colorScheme="blue" fontSize="sm" px={3} py={1} borderRadius="full">
              🌿 {mappableCrops.length} seller{mappableCrops.length !== 1 ? 's' : ''} active
            </Badge>
          )}
          <Badge colorScheme="green" fontSize="md" px={4} py={2} borderRadius="full">
            LIVE • REALTIME
          </Badge>
        </HStack>
      </HStack>

      <Box position="relative" w="100%" h="72vh" borderRadius="2xl" overflow="hidden" boxShadow="xl" border="1px solid" borderColor="gray.100">
        <Box ref={mapRef} w="100%" h="100%" />

        {loading && (
          <Center
            position="absolute"
            inset={0}
            bg="whiteAlpha.800"
            zIndex={1000}
            borderRadius="2xl"
          >
            <VStack gap={3}>
              <Spinner size="xl" color="green.500" />
              <Text color="gray.600" fontWeight="medium">
                Loading sellers...
              </Text>
            </VStack>
          </Center>
        )}

        {!loading && mappableCrops.length === 0 && (
          <Center
            position="absolute"
            inset={0}
            bg="whiteAlpha.900"
            zIndex={1000}
            borderRadius="2xl"
          >
            <VStack gap={2}>
              <Text fontSize="3xl">🌾</Text>
              <Text fontWeight="semibold" color="gray.700">
                No sellers on the map yet
              </Text>
              <Text fontSize="sm" color="gray.500">
                Be the first to list your produce in the Marketplace!
              </Text>
            </VStack>
          </Center>
        )}
      </Box>

      <Text fontSize="sm" color="gray.500" textAlign="center">
        💡 New listings appear instantly • Click any pin to see seller details • 📍 Use the locate button to find sellers near you
      </Text>
    </VStack>
  );
};

export default Map;