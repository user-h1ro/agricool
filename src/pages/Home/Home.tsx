import { Box, Heading, HStack, Image, Text, VStack, Stack } from '@chakra-ui/react';
import agriCoolImage from '@/assets/agricool_logo.svg';
import { useAuth } from '@/context/AuthProvider';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '@/components/local/Login';

const FEATURES = [
  { icon: '🌾', label: 'Track your crops', desc: 'Monitor growth stages and health in real time.' },
  { icon: '☁️', label: 'Weather insights', desc: 'Get climate forecasts tailored to your farm.' },
  { icon: '🛒', label: 'Sell directly', desc: 'Connect with buyers without the middleman.' },
  { icon: '🎮', label: 'Gamified farming', desc: 'Earn badges and level up your farm.' },
];

const Home = () => {
  const { isAuth, loginControls } = useAuth();
  const { isOpen, onToggleLogin, onClose } = loginControls;
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    if (isAuth) navigate('/dashboard', { replace: true });
  }, [isAuth, navigate]);

  // Cycle through features
  useEffect(() => {
    const t = setInterval(() => setActiveFeature((p) => (p + 1) % FEATURES.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <Box
      minH="100vh"
      display="flex"
      flexDirection={{ base: 'column', lg: 'row' }}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Login modal/drawer — rendered at root level so it floats above everything */}
      <Login isOpen={isOpen} onClose={onClose} />

      {/* ── LEFT PANEL — Brand / Hero ──────────────────────────────────── */}
      <Box
        flex="1"
        position="relative"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        px={{ base: 8, lg: 16 }}
        py={16}
        overflow="hidden"
        style={{ background: 'linear-gradient(145deg, #1a4d1a 0%, #2d7a2d 50%, #1e5c1e 100%)' }}
      >
        {/* Decorative blobs */}
        <Box position="absolute" top="-80px" right="-80px" w="320px" h="320px" borderRadius="full"
          style={{ background: 'rgba(50,206,14,0.12)', filter: 'blur(60px)' }} pointerEvents="none" />
        <Box position="absolute" bottom="-60px" left="-60px" w="240px" h="240px" borderRadius="full"
          style={{ background: 'rgba(255,255,255,0.06)', filter: 'blur(40px)' }} pointerEvents="none" />
        <Box position="absolute" inset={0} pointerEvents="none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <VStack gap={8} alignItems="center" textAlign="center" position="relative" zIndex={1} maxW="420px">
          <HStack gap={3} alignItems="center">
            <Image src={agriCoolImage} w="56px" h="56px" />
            <Heading size="4xl" color="white" fontWeight="900" letterSpacing="-0.03em" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              AgriCool
            </Heading>
          </HStack>

          <Box>
            <Text color="rgba(255,255,255,0.6)" fontSize="xs" fontWeight="700" letterSpacing="widest" textTransform="uppercase" mb={3}>
              Where Agriculture Meets Innovation
            </Text>
            <Heading size="2xl" color="white" fontWeight="800" lineHeight="1.25" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Smarter farming starts here.
            </Heading>
          </Box>

          {/* Feature Carousel */}
          <Box
            w="100%" bg="rgba(255,255,255,0.08)" backdropFilter="blur(12px)"
            border="1px solid rgba(255,255,255,0.12)" borderRadius="2xl" p={5} minH="90px"
          >
            <HStack gap={4} alignItems="center">
              <Text fontSize="2xl">{FEATURES[activeFeature].icon}</Text>
              <VStack alignItems="flex-start" gap={0}>
                <Text color="white" fontWeight="700" fontSize="sm">{FEATURES[activeFeature].label}</Text>
                <Text color="rgba(255,255,255,0.6)" fontSize="xs">{FEATURES[activeFeature].desc}</Text>
              </VStack>
            </HStack>
            <HStack gap={1.5} mt={4} justifyContent="center">
              {FEATURES.map((_, i) => (
                <Box key={i} w={i === activeFeature ? '20px' : '6px'} h="6px" borderRadius="full"
                  bg={i === activeFeature ? '#32ce0e' : 'rgba(255,255,255,0.25)'}
                  cursor="pointer" onClick={() => setActiveFeature(i)} transition="all 0.3s" />
              ))}
            </HStack>
          </Box>

          {/* Stats row */}
          <HStack gap={8}>
            {[{ value: '10K+', label: 'Farmers' }, { value: '5', label: 'Countries' }, { value: '98%', label: 'Satisfaction' }].map((stat) => (
              <VStack key={stat.label} gap={0} alignItems="center">
                <Text color="white" fontWeight="800" fontSize="lg">{stat.value}</Text>
                <Text color="rgba(255,255,255,0.5)" fontSize="xs" fontWeight="500">{stat.label}</Text>
              </VStack>
            ))}
          </HStack>
        </VStack>
      </Box>

      {/* ── RIGHT PANEL — Auth Actions ─────────────────────────────────── */}
      <Box
        w={{ base: '100%', lg: '480px' }} flexShrink={0}
        display="flex" flexDirection="column" justifyContent="center" alignItems="center"
        px={{ base: 6, lg: 12 }} py={16}
        style={{ background: '#fafaf8' }}
      >
        <Stack gap={10} w="100%" maxW="360px">
          <VStack gap={2} alignItems="flex-start" w="100%">
            <Text fontSize="xs" fontWeight="700" color="#32ce0e" letterSpacing="widest" textTransform="uppercase">
              Get Started
            </Text>
            <Heading size="2xl" color="#1a1a1a" fontWeight="900" lineHeight="1.15" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Welcome back
            </Heading>
            <Text color="#888" fontSize="sm">Sign in to your farm dashboard or create a new account.</Text>
          </VStack>

          {/* Auth Buttons */}
          <Stack gap={3} w="100%">
            <Box
              as="button" w="100%" h="52px" borderRadius="xl"
              fontWeight="700" fontSize="sm" color="white" cursor="pointer"
              onClick={onToggleLogin}
              style={{
                background: 'linear-gradient(135deg, #32ce0e 0%, #28a80c 100%)',
                border: 'none',
                boxShadow: '0 4px 20px rgba(50,206,14,0.35)',
                transition: 'all 0.2s',
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e: any) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(50,206,14,0.45)'; }}
              onMouseLeave={(e: any) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(50,206,14,0.35)'; }}
            >
              🔑 &nbsp; Sign In
            </Box>

            <Box
              as="button" w="100%" h="52px" borderRadius="xl"
              fontWeight="700" fontSize="sm" color="#1a1a1a" cursor="pointer"
              onClick={() => navigate('/register')}
              style={{ background: 'white', border: '2px solid #e8e8e8', transition: 'all 0.2s', fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={(e: any) => { e.currentTarget.style.borderColor = '#32ce0e'; e.currentTarget.style.color = '#28a80c'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e: any) => { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.color = '#1a1a1a'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              🌱 &nbsp; Create Account
            </Box>
          </Stack>

          <HStack gap={3}>
            <Box flex={1} h="1px" bg="#ebebeb" />
            <Text fontSize="xs" color="#bbb" fontWeight="500">or continue with</Text>
            <Box flex={1} h="1px" bg="#ebebeb" />
          </HStack>

          {/* Feature list */}
          <Stack gap={3}>
            {FEATURES.map((f) => (
              <HStack key={f.label} gap={3} p={3} borderRadius="xl" bg="white" border="1px solid #f0f0f0" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <Box w="36px" h="36px" borderRadius="lg" bg="#f0fde8" display="flex" alignItems="center" justifyContent="center" fontSize="18px" flexShrink={0}>
                  {f.icon}
                </Box>
                <VStack alignItems="flex-start" gap={0}>
                  <Text fontWeight="700" fontSize="sm" color="#1a1a1a">{f.label}</Text>
                  <Text fontSize="xs" color="#aaa">{f.desc}</Text>
                </VStack>
              </HStack>
            ))}
          </Stack>

          <Text fontSize="xs" color="#bbb" textAlign="center">
            By signing in, you agree to our{' '}
            <Text as="span" color="#32ce0e" cursor="pointer" fontWeight="600">Terms of Service</Text>
            {' '}and{' '}
            <Text as="span" color="#32ce0e" cursor="pointer" fontWeight="600">Privacy Policy</Text>.
          </Text>
        </Stack>
      </Box>
    </Box>
  );
};

export default Home;