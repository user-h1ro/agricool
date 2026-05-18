import { Provider } from '@/components/ui/provider';
import { useRoutes } from 'react-router-dom';
import { routes } from './router';
import { AuthProvider } from './context/AuthProvider';
import { RevenueProvider, useRevenue } from './context/RevenueProvider';
import { MusicProvider } from './context/MusicProvider';
import PaymentModal from './components/PaymentModal';
import { Box } from '@chakra-ui/react';

// Inner wrapper so useRevenue can access the context
function AppInner() {
  const { showPaymentModal, paymentModalType, setShowPaymentModal, refreshRevenue } = useRevenue();

  return (
    <Box minH="100vh" bg="transparent">
      {useRoutes(routes)}

      {/* Global Payment Modal — triggered from anywhere in the app */}
      {showPaymentModal && paymentModalType && (
        <PaymentModal
          type={paymentModalType}
          onSuccess={() => {
            setShowPaymentModal(false);
            refreshRevenue();
          }}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}
    </Box>
  );
}

function App() {
  return (
    <Provider>
      <AuthProvider>
        <RevenueProvider>
          {/* MusicProvider must be inside Router so useLocation() works */}
          <MusicProvider>
            <AppInner />
          </MusicProvider>
        </RevenueProvider>
      </AuthProvider>
    </Provider>
  );
}

export default App;