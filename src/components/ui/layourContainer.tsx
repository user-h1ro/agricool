import { Box } from '@chakra-ui/react';
import { PropsWithChildren } from 'react';

type Sizes = 'xl' | 'lg';

type LayoutProps = {
  size?: Sizes;
};

const mapSizing: { [key in Sizes]: string } = {
  lg: '1024px',
  xl: '1280px',
};

const LayoutContainer = ({
  size = 'xl',
  children,
}: PropsWithChildren<LayoutProps>) => {
  return (
    <Box 
      width={'100%'} 
      maxW={mapSizing[size]} 
      mx="auto" 
      px="8"
      bg="transparent"     // ← Important
    >
      {children}
    </Box>
  );
};

export default LayoutContainer;