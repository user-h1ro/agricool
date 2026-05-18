import {
  Box,
  Flex,
  Heading,
  HStack,
  Text,
  VStack,
  Badge,
  Separator,
  Spinner,
  Center,
  Button,
  Input,
} from '@chakra-ui/react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabase';
import { useAuth } from '@/context/AuthProvider';

// ─── Types ────────────────────────────────────────────────────────────────────
type WeatherDay = {
  day: string;
  emoji: string;
  high: number;
  low: number;
  rain: number;
  condition: string;
  windspeed: number;
};

type SoilReading = {
  id: string;
  user_id: string;
  zone: string;
  moisture: number;
  ph: number;
  nitrogen: number;
  temp: number;
  status: 'good' | 'fair' | 'poor';
  updated_at: string;
};

type CurrentWeather = {
  temp: number;
  condition: string;
  emoji: string;
  humidity: number;
  rain: number;
  uv: string;
  wind: number;
};

// ─── WMO weather code → label + emoji ─────────────────────────────────────────
function decodeWMO(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: 'Clear Sky', emoji: '☀️' };
  if (code <= 2) return { label: 'Partly Cloudy', emoji: '⛅' };
  if (code === 3) return { label: 'Overcast', emoji: '☁️' };
  if (code <= 49) return { label: 'Foggy', emoji: '🌫️' };
  if (code <= 59) return { label: 'Drizzle', emoji: '🌦️' };
  if (code <= 69) return { label: 'Rainy', emoji: '🌧️' };
  if (code <= 79) return { label: 'Snowy', emoji: '❄️' };
  if (code <= 84) return { label: 'Showers', emoji: '🌦️' };
  if (code <= 99) return { label: 'Thunderstorm', emoji: '⛈️' };
  return { label: 'Unknown', emoji: '🌡️' };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Status helpers ───────────────────────────────────────────────────────────
const statusColor: Record<SoilReading['status'], string> = {
  good: '#22c55e',
  fair: '#f59e0b',
  poor: '#ef4444',
};

function deriveSoilStatus(r: Partial<SoilReading>): SoilReading['status'] {
  const issues = [
    (r.moisture ?? 50) < 30,
    (r.ph ?? 6.5) < 5.5 || (r.ph ?? 6.5) > 7.5,
    (r.nitrogen ?? 30) < 20,
    (r.temp ?? 28) > 33,
  ].filter(Boolean).length;
  if (issues === 0) return 'good';
  if (issues <= 1) return 'fair';
  return 'poor';
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const WeatherCard = ({ day, isToday }: { day: WeatherDay; isToday?: boolean }) => (
  <Box
    bg={isToday ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'white'}
    borderRadius="16px" p={4} textAlign="center"
    border="1.5px solid" borderColor={isToday ? 'transparent' : 'gray.100'}
    flex="1" minW="90px"
    boxShadow={isToday ? '0 4px 20px rgba(22,163,74,0.3)' : '0 2px 8px rgba(0,0,0,0.05)'}
  >
    <Text fontSize="xs" fontWeight="700" color={isToday ? 'green.100' : 'gray.400'} mb={1}>{day.day}</Text>
    <Text fontSize="2xl" mb={1}>{day.emoji}</Text>
    <Text fontSize="sm" fontWeight="800" color={isToday ? 'white' : '#1a1a1a'}>{day.high}°</Text>
    <Text fontSize="xs" color={isToday ? 'green.200' : 'gray.400'}>{day.low}°</Text>
    <Box mt={2} px={2} py={0.5} borderRadius="full"
      bg={isToday ? 'rgba(255,255,255,0.2)' : (day.rain > 60 ? '#dbeafe' : '#f0fdf4')}>
      <Text fontSize="9px" fontWeight="700" color={isToday ? 'white' : (day.rain > 60 ? '#2563eb' : '#16a34a')}>
        💧 {day.rain}%
      </Text>
    </Box>
  </Box>
);

const SoilCard = ({
  reading,
  onUpdate,
  onDelete,
}: {
  reading: SoilReading;
  onUpdate: (id: string, field: string, value: number) => void;
  onDelete: (id: string) => void;
}) => (
  <Box
    bg="white" borderRadius="16px" p={5}
    border="1.5px solid" borderColor={statusColor[reading.status] + '44'}
    boxShadow="0 2px 12px rgba(0,0,0,0.06)"
    flex="1" minW="260px"
    position="relative"
  >
    <Box
      position="absolute" top="10px" right="10px"
      as="button" fontSize="12px" color="gray.300"
      _hover={{ color: '#ef4444' }}
      onClick={() => onDelete(reading.id)}
      title="Delete zone"
    >✕</Box>

    <HStack justify="space-between" mb={4}>
      <Box>
        <Text fontWeight="700" color="#1a1a1a" fontSize="sm">{reading.zone}</Text>
        <Text fontSize="xs" color="gray.400">
          Updated: {new Date(reading.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </Box>
      <Badge
        px={3} py={1} borderRadius="full" fontSize="xs" fontWeight="700"
        bg={statusColor[reading.status] + '22'} color={statusColor[reading.status]}
        textTransform="capitalize"
      >
        {reading.status}
      </Badge>
    </HStack>

    <Flex gap={4} justify="space-around">
      {/* Moisture */}
      <Box textAlign="center">
        <Text fontSize="xl" fontWeight="800" color="#3b82f6">{reading.moisture}%</Text>
        <Text fontSize="10px" color="gray.400" fontWeight="600">💧 MOISTURE</Text>
        <Box bg="gray.100" borderRadius="full" h="4px" mt={1} overflow="hidden">
          <Box h="100%" bg="#3b82f6" w={`${reading.moisture}%`} borderRadius="full" />
        </Box>
        <HStack mt={1} gap={1} justify="center">
          <Box as="button" fontSize="9px" px={1.5} bg="blue.50" color="blue.400" borderRadius="full"
            onClick={() => onUpdate(reading.id, 'moisture', Math.max(0, reading.moisture - 5))}>−</Box>
          <Box as="button" fontSize="9px" px={1.5} bg="blue.50" color="blue.400" borderRadius="full"
            onClick={() => onUpdate(reading.id, 'moisture', Math.min(100, reading.moisture + 5))}>+</Box>
        </HStack>
      </Box>
      <Separator orientation="vertical" h="70px" borderColor="gray.100" />
      {/* pH */}
      <Box textAlign="center">
        <Text fontSize="xl" fontWeight="800" color="#f59e0b">{reading.ph}</Text>
        <Text fontSize="10px" color="gray.400" fontWeight="600">🧪 SOIL pH</Text>
        <Text fontSize="9px" color={reading.ph >= 6 && reading.ph <= 7 ? '#22c55e' : '#ef4444'} fontWeight="700" mt={1}>
          {reading.ph >= 6 && reading.ph <= 7 ? 'Optimal' : 'Adjust'}
        </Text>
        <HStack mt={1} gap={1} justify="center">
          <Box as="button" fontSize="9px" px={1.5} bg="yellow.50" color="yellow.600" borderRadius="full"
            onClick={() => onUpdate(reading.id, 'ph', Math.max(0, Math.round((reading.ph - 0.1) * 10) / 10))}>−</Box>
          <Box as="button" fontSize="9px" px={1.5} bg="yellow.50" color="yellow.600" borderRadius="full"
            onClick={() => onUpdate(reading.id, 'ph', Math.min(14, Math.round((reading.ph + 0.1) * 10) / 10))}>+</Box>
        </HStack>
      </Box>
      <Separator orientation="vertical" h="70px" borderColor="gray.100" />
      {/* Nitrogen */}
      <Box textAlign="center">
        <Text fontSize="xl" fontWeight="800" color="#8b5cf6">{reading.nitrogen}</Text>
        <Text fontSize="10px" color="gray.400" fontWeight="600">🌿 N (ppm)</Text>
        <Text fontSize="9px" color={reading.nitrogen >= 30 ? '#22c55e' : '#ef4444'} fontWeight="700" mt={1}>
          {reading.nitrogen >= 30 ? 'Good' : 'Low'}
        </Text>
        <HStack mt={1} gap={1} justify="center">
          <Box as="button" fontSize="9px" px={1.5} bg="purple.50" color="purple.400" borderRadius="full"
            onClick={() => onUpdate(reading.id, 'nitrogen', Math.max(0, reading.nitrogen - 5))}>−</Box>
          <Box as="button" fontSize="9px" px={1.5} bg="purple.50" color="purple.400" borderRadius="full"
            onClick={() => onUpdate(reading.id, 'nitrogen', reading.nitrogen + 5)}>+</Box>
        </HStack>
      </Box>
      <Separator orientation="vertical" h="70px" borderColor="gray.100" />
      {/* Temp */}
      <Box textAlign="center">
        <Text fontSize="xl" fontWeight="800" color="#ef4444">{reading.temp}°</Text>
        <Text fontSize="10px" color="gray.400" fontWeight="600">🌡️ TEMP</Text>
        <Text fontSize="9px" color={reading.temp <= 30 ? '#22c55e' : '#f59e0b'} fontWeight="700" mt={1}>
          {reading.temp <= 30 ? 'Normal' : 'Warm'}
        </Text>
        <HStack mt={1} gap={1} justify="center">
          <Box as="button" fontSize="9px" px={1.5} bg="red.50" color="red.300" borderRadius="full"
            onClick={() => onUpdate(reading.id, 'temp', reading.temp - 1)}>−</Box>
          <Box as="button" fontSize="9px" px={1.5} bg="red.50" color="red.300" borderRadius="full"
            onClick={() => onUpdate(reading.id, 'temp', reading.temp + 1)}>+</Box>
        </HStack>
      </Box>
    </Flex>
  </Box>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const ClimateTracker = () => {
  const { user } = useAuth();

  // Weather state
  const [forecast, setForecast] = useState<WeatherDay[]>([]);
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [locationName, setLocationName] = useState('Your Location');
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');

  // Soil state
  const [soilReadings, setSoilReadings] = useState<SoilReading[]>([]);
  const [soilLoading, setSoilLoading] = useState(true);

  // Add zone form
  const [showAddZone, setShowAddZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [addingZone, setAddingZone] = useState(false);

  // ── Fetch weather from Open-Meteo (free, no API key) ──────────────────────
  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setWeatherLoading(true);
    setWeatherError('');
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max` +
        `&hourly=relativehumidity_2m` +
        `&current_weather=true&timezone=auto&forecast_days=7`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather API failed');
      const json = await res.json();

      const { daily, current_weather, hourly } = json;

      // Current conditions
      const wmo = decodeWMO(current_weather.weathercode);
      const avgHumidity = Math.round(
        hourly.relativehumidity_2m.slice(0, 12).reduce((a: number, b: number) => a + b, 0) / 12
      );

      setCurrent({
        temp: Math.round(current_weather.temperature),
        condition: wmo.label,
        emoji: wmo.emoji,
        humidity: avgHumidity,
        rain: daily.precipitation_probability_max[0],
        uv: current_weather.temperature > 32 ? 'High' : current_weather.temperature > 28 ? 'Moderate' : 'Low',
        wind: Math.round(current_weather.windspeed),
      });

      // 7-day forecast
      const days: WeatherDay[] = daily.time.map((dateStr: string, i: number) => {
        const d = new Date(dateStr);
        const decoded = decodeWMO(daily.weathercode[i]);
        return {
          day: DAY_NAMES[d.getDay()],
          emoji: decoded.emoji,
          high: Math.round(daily.temperature_2m_max[i]),
          low: Math.round(daily.temperature_2m_min[i]),
          rain: daily.precipitation_probability_max[i] ?? 0,
          condition: decoded.label,
          windspeed: Math.round(daily.windspeed_10m_max[i]),
        };
      });
      setForecast(days);
    } catch (err) {
      setWeatherError('Could not load weather data. Please check your connection.');
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // Reverse geocode using Open-Meteo doesn't support it; use nominatim
  const fetchLocationName = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      const json = await res.json();
      const { city, town, village, county, country } = json.address ?? {};
      setLocationName([city || town || village || county, country].filter(Boolean).join(', '));
    } catch {
      // silently fail — location name is cosmetic
    }
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          fetchWeather(latitude, longitude);
          fetchLocationName(latitude, longitude);
        },
        () => {
          // Default to Manila, PH if geolocation denied
          fetchWeather(14.5995, 120.9842);
          setLocationName('Manila, Philippines');
        }
      );
    } else {
      fetchWeather(14.5995, 120.9842);
      setLocationName('Manila, Philippines');
    }
  }, [fetchWeather, fetchLocationName]);

  // ── Fetch soil readings from Supabase ─────────────────────────────────────
  const fetchSoil = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('soil_readings')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (!error && data) setSoilReadings(data as SoilReading[]);
    setSoilLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSoil();

    if (!user) return;
    const channel = supabase
      .channel('soil_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'soil_readings', filter: `user_id=eq.${user.id}` },
        () => fetchSoil())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchSoil]);

  // ── Soil CRUD ─────────────────────────────────────────────────────────────
  const handleUpdateSoil = async (id: string, field: string, value: number) => {
    const reading = soilReadings.find(r => r.id === id);
    if (!reading) return;
    const updated = { ...reading, [field]: value, updated_at: new Date().toISOString() };
    updated.status = deriveSoilStatus(updated);
    const { error } = await supabase
      .from('soil_readings')
      .update({ [field]: value, status: updated.status, updated_at: updated.updated_at })
      .eq('id', id);
    if (!error) setSoilReadings(prev => prev.map(r => r.id === id ? updated : r));
  };

  const handleDeleteSoil = async (id: string) => {
    const { error } = await supabase.from('soil_readings').delete().eq('id', id);
    if (!error) setSoilReadings(prev => prev.filter(r => r.id !== id));
  };

  const handleAddZone = async () => {
    if (!newZoneName.trim() || !user) return;
    setAddingZone(true);
    const newReading = {
      user_id: user.id,
      zone: newZoneName.trim(),
      moisture: 60,
      ph: 6.5,
      nitrogen: 35,
      temp: 28,
      status: 'good' as const,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('soil_readings').insert(newReading).select().single();
    if (!error && data) {
      setSoilReadings(prev => [data as SoilReading, ...prev]);
      setNewZoneName('');
      setShowAddZone(false);
    }
    setAddingZone(false);
  };

  // ── Smart advice based on real weather + soil ─────────────────────────────
  const smartAdvice = useCallback(() => {
    if (!current || !forecast.length) return [];
    const advice: { crop: string; emoji: string; advice: string; action: string }[] = [];

    const rainDays = forecast.filter(d => d.rain >= 60).map(d => d.day);
    const hotDays = forecast.filter(d => d.high >= 35).map(d => d.day);
    const poorSoil = soilReadings.filter(r => r.status === 'poor');
    const dryZones = soilReadings.filter(r => r.moisture < 30);
    const lowNitrogen = soilReadings.filter(r => r.nitrogen < 20);

    if (rainDays.length > 0) {
      advice.push({
        crop: 'All Crops',
        emoji: '🌧️',
        advice: `Heavy rain expected on ${rainDays.join(', ')}. Skip watering on those days and harvest ready crops beforehand.`,
        action: 'Skip Water',
      });
    }
    if (hotDays.length > 0) {
      advice.push({
        crop: 'Tomato / Pechay',
        emoji: '🍅',
        advice: `Temperatures reaching ${Math.max(...hotDays.map(d => forecast.find(f => f.day === d)?.high ?? 0))}°C on ${hotDays.join(', ')}. Add mulch to retain moisture.`,
        action: 'Add Mulch',
      });
    }
    if (dryZones.length > 0) {
      advice.push({
        crop: dryZones.map(z => z.zone).join(', '),
        emoji: '💧',
        advice: `Soil moisture critically low (${Math.min(...dryZones.map(z => z.moisture))}%). Water immediately to prevent crop stress.`,
        action: 'Water Now',
      });
    }
    if (lowNitrogen.length > 0) {
      advice.push({
        crop: lowNitrogen.map(z => z.zone).join(', '),
        emoji: '🌿',
        advice: `Nitrogen levels below 20 ppm. Apply balanced fertilizer to support leafy growth.`,
        action: 'Fertilize',
      });
    }
    if (advice.length === 0) {
      advice.push({
        crop: 'All Crops',
        emoji: '✅',
        advice: 'Conditions look great! Keep up your current farm routine.',
        action: 'Monitor',
      });
    }
    return advice;
  }, [current, forecast, soilReadings]);

  const advice = smartAdvice();

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box py={8} px={2}>
      {/* Header */}
      <Box mb={8}>
        <Text fontSize="sm" color="green.600" fontWeight="700" textTransform="uppercase" letterSpacing="wider">
          Climate & Soil Tracking
        </Text>
        <Heading size="3xl" color="green.900">🌤️ Farm Weather & Soil</Heading>
        <Text color="gray.500" mt={1}>
          Live weather and soil health data for your farm.
        </Text>
      </Box>

      {/* Weather Section */}
      {weatherLoading ? (
        <Center py={12}>
          <VStack gap={3}>
            <Spinner color="#16a34a" size="xl" />
            <Text color="gray.500" fontWeight="600">Fetching live weather…</Text>
          </VStack>
        </Center>
      ) : weatherError ? (
        <Box bg="#fee2e2" border="1.5px solid #fca5a5" borderRadius="16px" p={5} mb={6}>
          <HStack gap={3}>
            <Text fontSize="xl">⚠️</Text>
            <Text color="#dc2626" fontWeight="600">{weatherError}</Text>
          </HStack>
        </Box>
      ) : current && (
        <>
          {/* Today's Summary */}
          <Box
            bg="linear-gradient(135deg, #16a34a 0%, #065f46 100%)"
            borderRadius="20px" p={6} mb={6} color="white"
            position="relative" overflow="hidden"
          >
            <Box position="absolute" top="-20px" right="-20px" w="120px" h="120px" borderRadius="full" bg="rgba(255,255,255,0.08)" />
            <Box position="absolute" bottom="-30px" right="80px" w="80px" h="80px" borderRadius="full" bg="rgba(255,255,255,0.05)" />
            <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
              <Box>
                <Text fontSize="sm" color="green.200" fontWeight="600">
                  TODAY — {locationName.toUpperCase()}
                </Text>
                <HStack gap={3} mt={1}>
                  <Text fontSize="5xl">{current.emoji}</Text>
                  <Box>
                    <Text fontSize="4xl" fontWeight="900">{current.temp}°C</Text>
                    <Text fontSize="lg" color="green.200">{current.condition}</Text>
                  </Box>
                </HStack>
              </Box>
              <Flex gap={6} wrap="wrap">
                {[
                  { label: 'Humidity',    value: `${current.humidity}%`, icon: '💧' },
                  { label: 'Rain Chance', value: `${current.rain}%`,     icon: '🌧️' },
                  { label: 'UV Index',    value: current.uv,             icon: '☀️' },
                  { label: 'Wind',        value: `${current.wind} km/h`, icon: '💨' },
                ].map(stat => (
                  <Box key={stat.label} textAlign="center">
                    <Text fontSize="lg">{stat.icon}</Text>
                    <Text fontWeight="800" fontSize="lg">{stat.value}</Text>
                    <Text fontSize="xs" color="green.200">{stat.label}</Text>
                  </Box>
                ))}
              </Flex>
            </Flex>
          </Box>

          {/* 7-Day Forecast */}
          <Box mb={8}>
            <Heading size="lg" color="green.900" mb={4}>📅 7-Day Forecast</Heading>
            <Flex gap={3} wrap="wrap">
              {forecast.map((day, i) => (
                <WeatherCard key={day.day + i} day={day} isToday={i === 0} />
              ))}
            </Flex>
          </Box>

          {/* Heavy Rain Alert */}
          {forecast.some(d => d.rain >= 70) && (
            <Box bg="linear-gradient(135deg, #dbeafe, #eff6ff)" border="1.5px solid #93c5fd" borderRadius="16px" p={4} mb={8}>
              <HStack gap={3}>
                <Text fontSize="2xl">🌧️</Text>
                <Box>
                  <Text fontWeight="700" color="#1d4ed8">Heavy Rain Expected</Text>
                  <Text fontSize="sm" color="#3b82f6">
                    {forecast.filter(d => d.rain >= 70).map(d => d.day).join(', ')} — skip watering on those days and harvest ready crops beforehand.
                  </Text>
                </Box>
              </HStack>
            </Box>
          )}
        </>
      )}

      {/* Soil Readings */}
      <Box mb={8}>
        <HStack justify="space-between" mb={4}>
          <Heading size="lg" color="green.900">🌱 Soil Health by Zone</Heading>
          <HStack gap={2}>
            <Badge bg="#dcfce7" color="#16a34a" px={3} py={1} borderRadius="full" fontSize="xs" fontWeight="700">
              {soilReadings.length} zones
            </Badge>
            <Button
              size="xs" bg="#16a34a" color="white" borderRadius="full"
              fontWeight="700" _hover={{ bg: '#15803d' }}
              onClick={() => setShowAddZone(!showAddZone)}
            >
              + Add Zone
            </Button>
          </HStack>
        </HStack>

        {showAddZone && (
          <HStack mb={4} gap={2}>
            <Input
              placeholder="Zone name (e.g. Zone A – Pechay Bed)"
              value={newZoneName}
              onChange={e => setNewZoneName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddZone()}
              bg="white" borderRadius="12px" borderColor="gray.200" fontSize="sm"
            />
            <Button
              bg="#16a34a" color="white" borderRadius="12px" fontWeight="700"
              _hover={{ bg: '#15803d' }} flexShrink={0} px={4} size="sm"
              onClick={handleAddZone}
              loading={addingZone}
            >
              Add
            </Button>
            <Button size="sm" variant="outline" borderRadius="12px" onClick={() => setShowAddZone(false)}>
              Cancel
            </Button>
          </HStack>
        )}

        {soilLoading ? (
          <Center py={8}><Spinner color="#16a34a" /></Center>
        ) : soilReadings.length === 0 ? (
          <Box bg="white" borderRadius="16px" p={10} textAlign="center" border="2px dashed #d1fae5">
            <Text fontSize="3xl" mb={3}>🌱</Text>
            <Text fontWeight="700" color="gray.600" mb={1}>No soil zones yet</Text>
            <Text fontSize="sm" color="gray.400" mb={4}>Add your farm zones to track soil moisture, pH, and nutrients.</Text>
            <Button bg="#16a34a" color="white" borderRadius="full" fontWeight="700" _hover={{ bg: '#15803d' }}
              onClick={() => setShowAddZone(true)}>
              + Add Your First Zone
            </Button>
          </Box>
        ) : (
          <Flex gap={4} wrap="wrap">
            {soilReadings.map(r => (
              <SoilCard key={r.id} reading={r} onUpdate={handleUpdateSoil} onDelete={handleDeleteSoil} />
            ))}
          </Flex>
        )}
      </Box>

      {/* Smart Crop Advice */}
      <Box>
        <Heading size="lg" color="green.900" mb={2}>🤖 Smart Crop Advice</Heading>
        <Text fontSize="sm" color="gray.500" mb={4}>
          Based on today's live weather and your soil readings:
        </Text>
        <VStack gap={3} align="stretch">
          {advice.map((item, i) => (
            <HStack
              key={i}
              bg="white" borderRadius="12px" p={4}
              border="1.5px solid #e5e7eb" gap={3}
              _hover={{ borderColor: '#86efac', transform: 'translateX(4px)' }}
              transition="all 0.2s"
            >
              <Text fontSize="2xl">{item.emoji}</Text>
              <Box flex={1}>
                <Text fontWeight="700" fontSize="sm" color="#1a1a1a">{item.crop}</Text>
                <Text fontSize="xs" color="gray.500">{item.advice}</Text>
              </Box>
              <Badge px={3} py={1} borderRadius="full" fontSize="xs" fontWeight="700" bg="#dcfce7" color="#16a34a">
                {item.action}
              </Badge>
            </HStack>
          ))}
        </VStack>
      </Box>
    </Box>
  );
};

export default ClimateTracker;
