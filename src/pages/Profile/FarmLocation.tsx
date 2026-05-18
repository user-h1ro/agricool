import {
  VStack,
  Heading,
  Text,
  Box,
  HStack,
  Button,
  Input,
} from '@chakra-ui/react';
import { useAuth } from '@/context/AuthProvider';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/supabase';
import { LuMapPin, LuSave } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

const FarmLocation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [farmName, setFarmName] = useState('');
  const [defaultLocation, setDefaultLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

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
      setLatitude(data.default_latitude);
      setLongitude(data.default_longitude);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([14.6760, 121.0437], 13);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      setLatitude(lat);
      setLongitude(lng);

      if (markerRef.current) markerRef.current.remove();
      markerRef.current = L.marker([lat, lng])
        .addTo(map)
        .bindPopup('📍 Default Farm Location')
        .openPopup();
    });
  }, []);

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

    if (error) {
      alert("❌ Failed to save: " + error.message);
    } else {
      setSuccessMessage("✅ Default farm location saved successfully!");
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchProfile();
    }
    setSaving(false);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);

          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([lat, lng], 16);
            if (markerRef.current) markerRef.current.remove();
            markerRef.current = L.marker([lat, lng])
              .addTo(mapInstanceRef.current)
              .bindPopup('📍 Your Current Location')
              .openPopup();
          }
        },
        () => alert("❌ Could not get your location.")
      );
    }
  };

  return (
    <Box minH="100vh" py={10}>
      <VStack align="stretch" maxW="700px" mx="auto" px={6} gap={6}>
        <Button 
          variant="ghost" 
          alignSelf="flex-start" 
          onClick={() => navigate('/dashboard/profile')}
          colorScheme="green"
        >
          ← Back to Profile
        </Button>

        <Heading size="3xl" color="green.800">🌱 Default Farm Location</Heading>
        <Text color="gray.600">This location will be used as default when creating new crop listings.</Text>

        <Box bg="white" borderRadius="2xl" p={8} border="1px solid" borderColor="gray.200">
          <VStack gap={5} align="start">
            <Input
              placeholder="Farm Name (e.g. Mang Mario's Farm)"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              size="lg"
            />

            <Input
              placeholder="Default Address"
              value={defaultLocation}
              onChange={(e) => setDefaultLocation(e.target.value)}
              size="lg"
            />

            <HStack w="full" gap={3}>
              <Button 
                flex={1} 
                onClick={getCurrentLocation} 
                colorScheme="blue"
              >
                📍 Use Current Location
              </Button>
            </HStack>

            {/* Interactive Map */}
            <Box ref={mapRef} w="full" h="320px" borderRadius="xl" border="2px solid" borderColor="gray.200" />

            <Button 
              colorScheme="green" 
              size="lg" 
              w="full" 
              onClick={saveLocation}
              loading={saving}
            >
              <LuSave style={{ marginRight: '8px' }} />
              Save Default Location
            </Button>
          </VStack>
        </Box>
      </VStack>

      {/* Success Modal */}
      {successMessage && (
        <Box 
          position="fixed" 
          inset={0} 
          bg="blackAlpha.700" 
          zIndex={9999} 
          display="flex" 
          alignItems="center" 
          justifyContent="center"
        >
          <Box bg="white" p={8} borderRadius="2xl" textAlign="center" maxW="380px" boxShadow="xl">
            <Text fontSize="6xl" mb={4}>✅</Text>
            <Heading size="lg" mb={3}>Success</Heading>
            <Text fontSize="lg" mb={6}>{successMessage}</Text>
            <Button colorScheme="green" onClick={() => setSuccessMessage('')}>
              OK
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default FarmLocation;