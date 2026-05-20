import { Box, Flex, Text, HStack } from '@chakra-ui/react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface SeasonBarProps {
  //        Jan    Feb    Mar    Apr    May    Jun    Jul    Aug    Sep    Oct    Nov    Dec
  season: [boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean];
  dotColor?: string;
}

const SeasonBar = ({ season, dotColor = '#4ade80' }: SeasonBarProps) => {
  const inSeasonMonths = season.map((s, i) => (s ? MONTHS[i] : null)).filter(Boolean);

  return (
    <Box width="100%">
      <Flex gap="3px">
        {season.map((active, i) => (
          <Box
            key={i}
            flex={1}
            h="8px"
            borderRadius="full"
            bg={active ? dotColor : 'gray.200'}
            title={MONTHS[i]}
          />
        ))}
      </Flex>

      <Flex justify="space-between" mt={1}>
        <Text fontSize="10px" color="gray.400">Jan</Text>
        <Text fontSize="10px" color="gray.400">Jun</Text>
        <Text fontSize="10px" color="gray.400">Dec</Text>
      </Flex>

      <HStack mt={2} gap={1} flexWrap="wrap">
        <Text fontSize="11px" color="gray.500">In season:</Text>
        <Text fontSize="11px" fontWeight="700" color="gray.700">
          {inSeasonMonths.length === 12 ? 'Year-round' : inSeasonMonths.join(', ')}
        </Text>
      </HStack>
    </Box>
  );
};

export default SeasonBar;