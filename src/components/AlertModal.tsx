import {
  Dialog,
  Portal,
  CloseButton,
  Button,
  VStack,
  Text,
  Box,
  HStack,
} from '@chakra-ui/react';

type AlertType = 'error' | 'success' | 'warning' | 'info';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: AlertType;
  title: string;
  message: string;
  confirmLabel?: string;
}

const CONFIG: Record<AlertType, {
  icon: string;
  bg: string;
  border: string;
  color: string;
  btnBg: string;
  btnHover: string;
}> = {
  error: {
    icon: '❌',
    bg: '#fff5f5',
    border: '#fed7d7',
    color: '#c53030',
    btnBg: '#e53e3e',
    btnHover: '#c53030',
  },
  success: {
    icon: '✅',
    bg: '#f0fde8',
    border: '#c6f6d5',
    color: '#276749',
    btnBg: '#38a169',
    btnHover: '#276749',
  },
  warning: {
    icon: '⚠️',
    bg: '#fffbeb',
    border: '#fde68a',
    color: '#92400e',
    btnBg: '#d97706',
    btnHover: '#b45309',
  },
  info: {
    icon: 'ℹ️',
    bg: '#ebf8ff',
    border: '#bee3f8',
    color: '#2b6cb0',
    btnBg: '#3182ce',
    btnHover: '#2b6cb0',
  },
};

const AlertModal = ({
  isOpen,
  onClose,
  type = 'info',
  title,
  message,
  confirmLabel = 'OK',
}: AlertModalProps) => {
  const c = CONFIG[type];

  return (
    <Dialog.Root lazyMount open={isOpen} placement="top" size="sm">
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.300" backdropFilter="blur(6px)" />
        <Dialog.Positioner>
          <Dialog.Content
            borderRadius="20px"
            overflow="hidden"
            boxShadow="0 20px 60px rgba(0,0,0,0.15)"
          >
            <Dialog.Body p={0}>
              {/* Coloured header */}
              <Box
                bg={c.bg}
                border="1px solid"
                borderColor={c.border}
                px={6}
                pt={6}
                pb={5}
              >
                <HStack gap={3} align="start">
                  <Text fontSize="2xl" lineHeight="1" mt={0.5}>
                    {c.icon}
                  </Text>
                  <VStack align="start" gap={1}>
                    <Text fontWeight="800" fontSize="md" color={c.color}>
                      {title}
                    </Text>
                    <Text fontSize="sm" color="gray.600" lineHeight="1.6">
                      {message}
                    </Text>
                  </VStack>
                </HStack>
              </Box>

              {/* Action */}
              <Box px={6} py={4} bg="white">
                <Button
                  w="full"
                  borderRadius="10px"
                  fontWeight="700"
                  fontSize="sm"
                  bg={c.btnBg}
                  color="white"
                  _hover={{ bg: c.btnHover }}
                  onClick={onClose}
                >
                  {confirmLabel}
                </Button>
              </Box>
            </Dialog.Body>
            <Dialog.CloseTrigger asChild>
              <CloseButton
                size="sm"
                onClick={onClose}
                position="absolute"
                top={3}
                right={3}
              />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default AlertModal;
