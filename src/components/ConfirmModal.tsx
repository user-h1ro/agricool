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

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  variant?: ConfirmVariant;
  icon?: string;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

const CONFIG: Record<ConfirmVariant, {
  iconBg: string;
  titleColor: string;
  confirmBg: string;
  confirmHover: string;
}> = {
  danger: {
    iconBg: '#fff5f5',
    titleColor: '#c53030',
    confirmBg: '#e53e3e',
    confirmHover: '#c53030',
  },
  warning: {
    iconBg: '#fffbeb',
    titleColor: '#92400e',
    confirmBg: '#d97706',
    confirmHover: '#b45309',
  },
  info: {
    iconBg: '#ebf8ff',
    titleColor: '#2b6cb0',
    confirmBg: '#3182ce',
    confirmHover: '#2b6cb0',
  },
};

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  variant = 'danger',
  icon = '⚠️',
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
}: ConfirmModalProps) => {
  const c = CONFIG[variant];

  return (
    <Dialog.Root lazyMount open={isOpen} placement="top" size="sm">
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.400" backdropFilter="blur(6px)" />
        <Dialog.Positioner>
          <Dialog.Content
            borderRadius="20px"
            overflow="hidden"
            boxShadow="0 20px 60px rgba(0,0,0,0.15)"
          >
            <Dialog.Body p={0}>
              {/* Icon + text */}
              <Box px={6} pt={7} pb={5} textAlign="center">
                <Box
                  w="64px" h="64px"
                  bg={c.iconBg}
                  borderRadius="full"
                  display="flex" alignItems="center" justifyContent="center"
                  fontSize="1.8rem"
                  mx="auto"
                  mb={4}
                >
                  {icon}
                </Box>
                <Text fontWeight="800" fontSize="lg" color="gray.800" mb={2}>
                  {title}
                </Text>
                <Text fontSize="sm" color="gray.500" lineHeight="1.6">
                  {message}
                </Text>
              </Box>

              {/* Actions */}
              <Box px={6} pb={6}>
                <VStack gap={2}>
                  <Button
                    w="full"
                    borderRadius="10px"
                    fontWeight="700"
                    fontSize="sm"
                    bg={c.confirmBg}
                    color="white"
                    _hover={{ bg: c.confirmHover }}
                    onClick={onConfirm}
                    loading={loading}
                    loadingText="Please wait..."
                  >
                    {confirmLabel}
                  </Button>
                  <Button
                    w="full"
                    borderRadius="10px"
                    fontWeight="600"
                    fontSize="sm"
                    variant="ghost"
                    color="gray.500"
                    _hover={{ bg: 'gray.50' }}
                    onClick={onClose}
                    disabled={loading}
                  >
                    {cancelLabel}
                  </Button>
                </VStack>
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

export default ConfirmModal;
