'use client';

import {
  CloseButton,
  Dialog,
  DialogContentProps,
  DialogRootProps,
  Portal,
} from '@chakra-ui/react';
import { PropsWithChildren } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  placement?: DialogRootProps['placement'];
  size?: DialogRootProps['size'];
  maxW?: DialogContentProps['maxW'];
}

const Modal = (props: PropsWithChildren<ModalProps>) => {
  const {
    size,
    maxW,
    title,
    isOpen,
    onClose,
    children,
    placement = 'top',
  } = props;

  return (
    <Dialog.Root size={size} lazyMount open={isOpen} placement={placement}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.200" backdropFilter="blur(6px)" />
        <Dialog.Positioner>
          <Dialog.Content maxW={maxW}>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>{children}</Dialog.Body>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" onClick={onClose} />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default Modal;
