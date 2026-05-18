import { useState, useRef, useEffect } from 'react';
import { Box, HStack, IconButton, Slider } from '@chakra-ui/react';
import { useMusic } from '@/context/MusicProvider';

// Simple inline SVG icons so we don't need extra deps
const IconMusicOn = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

const IconMusicOff = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

// Animated music note bars (playing indicator)
const PlayingBars = ({ active }: { active: boolean }) => (
  <HStack gap="2px" align="flex-end" h="14px" ml={1}>
    {[0, 1, 2].map(i => (
      <Box
        key={i}
        w="3px"
        bg="yellow.300"
        borderRadius="1px"
        style={{
          height: active ? undefined : '4px',
          animation: active ? `musicBar${i} 0.8s ease-in-out infinite alternate` : 'none',
          animationDelay: `${i * 0.15}s`,
        }}
      />
    ))}
    <style>{`
      @keyframes musicBar0 { from { height: 4px } to { height: 14px } }
      @keyframes musicBar1 { from { height: 8px } to { height: 5px } }
      @keyframes musicBar2 { from { height: 3px } to { height: 12px } }
    `}</style>
  </HStack>
);

export function MusicToggle() {
  const { isMuted, toggleMute, volume, setVolume, isPlaying } = useMusic();
  const [showSlider, setShowSlider] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close slider when clicking outside
  useEffect(() => {
    if (!showSlider) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSlider(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSlider]);

  return (
    <Box ref={containerRef} position="relative">
      <HStack gap={1} align="center">
        {/* Animated bars when music is playing */}
        {!isMuted && <PlayingBars active={isPlaying} />}

        {/* Mute / unmute toggle */}
        <Box position="relative">
          <IconButton
            aria-label={isMuted ? 'Unmute music' : 'Mute music'}
            variant="ghost"
            color={isMuted ? 'whiteAlpha.500' : 'white'}
            _hover={{ bg: 'whiteAlpha.300' }}
            size="md"
            onClick={toggleMute}
            title={isMuted ? 'Unmute music' : 'Mute music'}
          >
            {isMuted ? <IconMusicOff /> : <IconMusicOn />}
          </IconButton>
          {/* Volume knob — click to expand */}
          <Box
            as="button"
            position="absolute"
            bottom="-2px"
            left="50%"
            transform="translateX(-50%)"
            w="14px"
            h="6px"
            bg="whiteAlpha.400"
            borderRadius="full"
            cursor="pointer"
            _hover={{ bg: 'yellow.300' }}
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowSlider(v => !v); }}
            title="Volume"
          />
        </Box>
      </HStack>

      {/* Volume slider popover */}
      {showSlider && (
        <Box
          position="absolute"
          top="calc(100% + 8px)"
          right={0}
          bg="green.800"
          border="1px solid"
          borderColor="green.600"
          borderRadius="xl"
          p={3}
          boxShadow="lg"
          zIndex={200}
          minW="140px"
        >
          <Box fontSize="10px" color="whiteAlpha.700" mb={2} textAlign="center" letterSpacing="wider" textTransform="uppercase">
            Volume
          </Box>
          <Slider.Root
            value={[volume]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={({ value }) => setVolume(value[0])}
          >
            <Slider.Control>
              <Slider.Track bg="whiteAlpha.300" h="4px">
                <Slider.Range bg="yellow.300" />
              </Slider.Track>
              <Slider.Thumb index={0} boxSize="14px" bg="white" boxShadow="sm" />
            </Slider.Control>
          </Slider.Root>
          <Box display="flex" justifyContent="space-between" mt={1} fontSize="10px" color="whiteAlpha.600">
            <span>0</span>
            <span>{Math.round(volume * 100)}%</span>
            <span>100</span>
          </Box>
        </Box>
      )}
    </Box>
  );
}