import { lazy, PropsWithChildren, Suspense } from 'react';
import { useAuth } from './context/AuthProvider';
import { Navigate, Outlet, RouteObject, useLocation } from 'react-router-dom';

import { Center, Spinner } from '@chakra-ui/react';
import TopBar from './components/local/TopBar';
import Login from './components/local/Login';

const Home = lazy(() => import('@/pages/Home'));
const Almanac = lazy(() => import('@/pages/Almanac'));
const MarketPlace = lazy(() => import('@/pages/MarketPlace'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Dashboard = lazy(() => import('@/pages/Dashboard/Dashboard'));
const Profile = lazy(() => import('@/pages/Profile/profile'));
const FarmLocation = lazy(() => import('@/pages/Profile/FarmLocation'));
const Notifications = lazy(() => import('@/pages/Profile/Notifications'));
const Map = lazy(() => import('@/pages/Map/Map'));
const Register = lazy(() => import('@/pages/Register/Register'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword/ResetPassword'));
const Cart = lazy(() => import('@/pages/Cart/Cart'));

const GamifiedDashboard = lazy(() => import('@/pages/GamifiedDashboard/GamifiedDashboard'));
const ClimateTracker = lazy(() => import('@/pages/ClimateTracker/ClimateTracker'));

const LoadingFallback = () => (
  <Center width="100%" height="100vh">
    <Spinner color="#32ce0e" size="lg" />
  </Center>
);

// Layout WITH TopBar — only for dashboard and app pages
const WithTopBar = ({ children }: PropsWithChildren) => (
  <>
    <TopBar />
    {children}
  </>
);

// Layout WITHOUT TopBar — for auth pages (Home, Register)
const AuthLayout = () => {
  const { isOpen, onClose } = useAuth().loginControls;
  return (
    <>
      <Outlet />
      <Login isOpen={isOpen} onClose={onClose} />
    </>
  );
};

// Layout WITH TopBar — for dashboard pages
const AppLayout = () => (
  <WithTopBar>
    <Outlet />
  </WithTopBar>
);

export const routes: RouteObject[] = [
  // ── Auth pages (no TopBar) ───────────────────────────────────────────────
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: 'register',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Register />
          </Suspense>
        ),
      },
    ],
  },

  // ── App pages (with TopBar) ──────────────────────────────────────────────
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<LoadingFallback />}>
          <AppLayout />
        </Suspense>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="tracker" replace />,
      },
      {
        path: 'tracker',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <GamifiedDashboard />
          </Suspense>
        ),
      },
      {
        path: 'climate',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ClimateTracker />
          </Suspense>
        ),
      },
      {
        path: 'marketplace',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <MarketPlace />
          </Suspense>
        ),
      },
      {
        path: 'almanac',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Almanac />
          </Suspense>
        ),
      },
      {
        path: 'profile',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Profile />
          </Suspense>
        ),
      },
      {
        path: 'profile/farm-location',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <FarmLocation />
          </Suspense>
        ),
      },
      {
        path: 'notifications',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Notifications />
          </Suspense>
        ),
      },
      {
        path: 'map',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Map />
          </Suspense>
        ),
      },
      {
        path: 'cart',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <Cart />
          </Suspense>
        ),
      },
    ],
  },

  // ── Misc ─────────────────────────────────────────────────────────────────
  {
    path: 'reset-password',
    element: <ResetPassword />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
];

function ProtectedRoute({ children }: PropsWithChildren) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.isAuth) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}