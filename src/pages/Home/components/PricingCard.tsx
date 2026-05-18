import { Box, Text, VStack, HStack, Badge } from '@chakra-ui/react';

const PricingCard = () => {
  return (
    <HStack gap={6} align="stretch">
      {/* FREE PLAN */}
      <Box
        flex="1"
        p={6}
        borderRadius="xl"
        border="1px solid"
        borderColor="gray.200"
        bg="white"
      >
        <VStack align="start" gap={4}>
          <Text fontWeight="bold" fontSize="lg">
            Free
          </Text>

          <Text fontSize="2xl" fontWeight="bold">
            ₱0
          </Text>

          <VStack align="start" gap={2} fontSize="sm" color="gray.600">
            <Text>• With ads</Text>
            <Text>• Limited task queue</Text>
            <Text>• Core almanac access</Text>
          </VStack>
        </VStack>
      </Box>

      {/* PREMIUM PLAN */}
      <Box
        flex="1"
        p={6}
        borderRadius="xl"
        border="2px solid"
        borderColor="bg.primary"
        bg="green.50"
        position="relative"
      >
        {/* Optional badge */}
        <Badge
          position="absolute"
          top="-10px"
          right="16px"
          bgColor={'bg.primary'}
          //   colorScheme="green"
          borderRadius="full"
          px={3}
        >
          <Text color={'white'}>Most Popular</Text>
        </Badge>

        <VStack align="start" gap={4}>
          <Text fontWeight="bold" fontSize="lg">
            Premium
          </Text>

          <Text fontSize="2xl" fontWeight="bold">
            ₱99/mo
          </Text>

          <VStack align="start" gap={2} fontSize="sm" color="gray.700">
            <Text>• Ad-free experience</Text>
            <Text>• Unlimited plant queuing</Text>
            <Text>• All crop varieties</Text>
          </VStack>
        </VStack>
      </Box>
    </HStack>
  );
};

export default PricingCard;
