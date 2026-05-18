import LayoutContainer from '@/components/ui/layourContainer';
import { Outlet } from 'react-router-dom';
import { Box } from '@chakra-ui/react';

const Dashboard = () => {
  return (
    <Box 
      minH="100vh" 
      bg="transparent" 
      pt={4}
    >
      <LayoutContainer size='lg'>
        <Outlet />
      </LayoutContainer>
    </Box>
  );
};

export default Dashboard;