import { Box, Flex, Text } from '@chakra-ui/react';

interface SeasonBarProps {
  //        Jan    Feb    Mar    Apr    May    Jun    Jul    Aug    Sep    Oct    Nov    Dec
  season: [boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean];
}

const SeasonBar = ({ season }: SeasonBarProps) => {
  return (
    <Box width={"100%"}>
      <Text
        fontSize="xs"
        fontWeight="500"
        color="gray.500"
        letterSpacing="wider"
        textTransform="uppercase"
        mb={2}
      >
        Peak Season (Monthly)
      </Text>

      <Flex gap="3px">
        {season.map((active, i) => (
          <Box
            key={i}
            flex={1}
            h="6px"
            borderRadius="full"
            bg={active ? 'green.400' : 'gray.200'}
          />
        ))}
      </Flex>

      <Flex justify="space-between" mt={1}>
        <Text fontSize="xs" color="gray.400">Jan</Text>
        <Text fontSize="xs" color="gray.400">Jun</Text>
        <Text fontSize="xs" color="gray.400">Dec</Text>
      </Flex>
    </Box>
  );
};

export default SeasonBar;