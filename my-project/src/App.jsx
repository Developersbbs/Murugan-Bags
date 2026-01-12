import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { API_BASE_URL } from './config/api';

// Layout Components
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingScreen from './components/common/Loading';
import { setUser, clearError, serializeUser, setInitializationComplete, setBackendUser, setBackendUserLoading } from './redux/slices/authSlice';
import { setupAuthListener } from './services/authService';
import authInitService from './services/authInitService';

// Context Providers - Load these lazily to reduce initial bundle
const CartProvider = lazy(() => import('./context/CartContext').then(module => ({ default: module.CartProvider })));
const WishlistProvider = lazy(() => import('./context/WishlistContext').then(module => ({ default: module.WishlistProvider })));

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductListPage = lazy(() => import('./pages/ProductListPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const TestCartWishlistPage = lazy(() => import('./pages/TestCartWishlistPage'));
const LoadingDemoPage = lazy(() => import('./pages/LoadingDemoPage'));
const ComboOffersPage = lazy(() => import('./pages/ComboOffersPage'));
const ComboOfferDetailsPage = lazy(() => import('./pages/ComboOfferDetailsPage'));
const BulkOrdersPage = lazy(() => import('./pages/BulkOrdersPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const BulkOrderDetailsPage = lazy(() => import('./pages/BulkOrderDetailsPage'));
const NewArrivalsPage = lazy(() => import('./pages/NewArrivalsPage'));




// Debug components - only load in development
const CartWishlistDebug = lazy(() => import('./components/debug/CartWishlistDebug'));
const AuthCartDebug = lazy(() => import('./components/debug/AuthCartDebug'));

// Lazy load global handler
const GlobalLoginPromptHandler = lazy(() => import('./components/common/GlobalLoginPromptHandler'));
const CartSidebar = lazy(() => import('./components/cart/CartSidebar'));
const WishlistSidebar = lazy(() => import('./components/wishlist/WishlistSidebar'));

// Preload critical pages after initial load
const preloadCriticalPages = () => {
  // Preload cart and wishlist pages as they're commonly accessed
  import('./pages/CartPage');
  import('./pages/WishlistPage');
  // Preload home page components that might be needed
  import('./pages/ProductListPage');
};

const App = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading } = useSelector((state) => state.auth);

  // Initialize auth state with robust authentication service
  useEffect(() => {
    let isRealLogout = false;

    // Function to fetch backend user data with caching
    const fetchBackendUserData = async (firebaseUser) => {
      try {
        console.log('App: fetchBackendUserData called for user:', firebaseUser.uid);
        dispatch(setBackendUserLoading(true)); // Set loading to true

        const API_URL = API_BASE_URL;

        // Check if we already have backend user data in localStorage (cache)
        const cachedBackendUser = localStorage.getItem('sbbs_backend_user');
        if (cachedBackendUser) {
          try {
            const userData = JSON.parse(cachedBackendUser);
            if (userData && userData._id) {
              console.log('App: Using cached backend user data');
              dispatch(setBackendUser(userData));
              dispatch(setBackendUserLoading(false));
              return;
            }
          } catch (error) {
            console.warn('App: Error parsing cached backend user data:', error);
            localStorage.removeItem('sbbs_backend_user');
          }
        }

        // Wait for JWT token to be available (retry up to 20 times with 200ms delay = 4 seconds total)
        // Increased from 5 times to ensure we don't fail on slow networks
        let token = localStorage.getItem('authToken') || localStorage.getItem('jwt_token');
        let attempts = 0;
        const maxAttempts = 20;

        while (!token && attempts < maxAttempts) {
          if (attempts % 5 === 0) {
            console.log(`App: Waiting for JWT token, attempt: ${attempts + 1}/${maxAttempts}`);
          }
          await new Promise(resolve => setTimeout(resolve, 200));
          token = localStorage.getItem('authToken') || localStorage.getItem('jwt_token');
          attempts++;
        }

        if (!token) {
          console.error('App: JWT token not found after waiting 4 seconds');
          // Don't clear user here, just stop loading backend data
          // This allows basic Firebase auth to still work even if backend sync fails
          dispatch(setBackendUserLoading(false));
          return;
        }

        console.log('App: Using token for backend user fetch');

        const response = await fetch(`${API_URL}/auth/profile/${firebaseUser.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('App: fetchBackendUserData response status:', response.status);

        if (response.ok) {
          const result = await response.json();
          console.log('App: fetchBackendUserData response data:', result);

          if (result.success && result.data) {
            console.log('App: Fetched backend user data successfully, caching it');
            // Cache the backend user data
            localStorage.setItem('sbbs_backend_user', JSON.stringify(result.data));
            dispatch(setBackendUser(result.data));
            return;
          } else {
            console.warn('App: Backend API returned success=false');
          }
        } else {
          console.warn('App: Failed to fetch backend user data, status:', response.status);
          const errorText = await response.text();
          console.warn('App: Error response:', errorText);
        }

        dispatch(setBackendUserLoading(false));
      } catch (error) {
        console.error('App: Error fetching backend user data:', error);
        dispatch(setBackendUserLoading(false));
      }
    };

    // Initialize the auth service
    const initializeAuth = async () => {
      try {
        console.log('App: Initializing authentication...');

        // Add auth state listener
        authInitService.addAuthStateListener(async (user) => {
          console.log('App: Auth state listener called with user:', user ? user.uid : 'null');

          if (user) {
            // User is authenticated
            console.log('[AUTH_DEBUG] App: Setting Firebase user in Redux', user.uid);
            console.log('App: Setting Firebase user in Redux');
            dispatch(setUser(serializeUser(user)));
            isRealLogout = false;

            // Fetch and store backend user data
            console.log('App: Calling fetchBackendUserData');
            await fetchBackendUserData(user);

            // Trigger cart and wishlist reload after user is set
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('auth:user-restored'));
            }, 100);
          } else {
            // User is not authenticated
            if (isRealLogout) {
              // This is a real logout, clear everything
              console.log('[AUTH_DEBUG] App: Real logout detected, clearing auth data');
              console.log('App: Real logout detected, clearing auth data');
              dispatch(clearError());
              authInitService.forceLogout();
            } else {
              // Safeguard: Check if we have stored user in localStorage before giving up
              const storedAuth = localStorage.getItem('sbbs_auth');
              if (storedAuth) {
                try {
                  const parsedUser = JSON.parse(storedAuth);
                  if (parsedUser && parsedUser.uid) {
                    console.log('[AUTH_DEBUG] App: Ignoring null auth notification - restoring from storage');
                    dispatch(setUser(parsedUser));
                    // Also try to fetch backend user again 
                    fetchBackendUserData(parsedUser);
                    return;
                  }
                } catch (e) {
                  console.error('App: Error parsing stored auth for safeguard:', e);
                }
              }

              // This might be initial load or Firebase not ready yet
              console.log('[AUTH_DEBUG] App: User not authenticated on initial load - dispatching null');
              console.log('App: User not authenticated on initial load');
              dispatch(setUser(null));
              dispatch(setBackendUser(null));
            }
          }

          dispatch(setInitializationComplete());
        });

        // Start the initialization process
        await authInitService.initialize();
        console.log('App: Authentication initialization completed');

      } catch (error) {
        console.error('App: Error initializing authentication:', error);
        dispatch(setInitializationComplete());
      }
    };

    // Set up logout detection
    const handleLogout = () => {
      isRealLogout = true;
    };

    // Listen for logout events
    window.addEventListener('auth:logout', handleLogout);

    // Initialize authentication
    initializeAuth();

    // Cleanup on unmount
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
      authInitService.cleanup();
    };
  }, [dispatch]);

  // Preload critical pages after authentication is initialized
  useEffect(() => {
    if (!loading) {
      // Wait a bit after auth is done, then preload critical pages
      const preloadTimer = setTimeout(() => {
        preloadCriticalPages();
      }, 2000); // Preload after 2 seconds to not interfere with initial load

      return () => clearTimeout(preloadTimer);
    }
  }, [loading]);

  // Add reCAPTCHA container to the DOM
  useEffect(() => {
    let recaptchaDiv = null;

    // Create reCAPTCHA container if it doesn't exist
    if (!document.getElementById('recaptcha-container')) {
      recaptchaDiv = document.createElement('div');
      recaptchaDiv.id = 'recaptcha-container';
      recaptchaDiv.style.display = 'none';
      document.body.appendChild(recaptchaDiv);
    }

    // Cleanup on unmount
    return () => {
      if (recaptchaDiv && document.body.contains(recaptchaDiv)) {
        document.body.removeChild(recaptchaDiv);
      }
    };
  }, []);

  // Show loading state while checking auth
  if (loading && location.pathname !== '/login' && location.pathname !== '/register') {
    return <LoadingScreen message="Authenticating..." variant="ring" />;
  }

  return (
    <>
      <Suspense fallback={<LoadingScreen message="Loading..." variant="wave" />}>
        <CartProvider>
          <WishlistProvider>
            <Helmet>
              <title>Murugan Bags - Your One Stop Shop</title>
              <meta name="description" content="Shop the latest products at the best prices" />
            </Helmet>

            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="products" element={<ProductListPage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="product/:id" element={<ProductDetailPage />} />

                <Route path="cart" element={<CartPage />} />

                {/* Protected Routes */}
                {/* Public Routes */}
                <Route path="wishlist" element={<WishlistPage />} />
                <Route path="test-cart-wishlist" element={<TestCartWishlistPage />} />
                <Route path="loading-demo" element={<LoadingDemoPage />} />
                <Route path="combo-offers" element={<ComboOffersPage />} />
                <Route path="combo-offers/:id" element={<ComboOfferDetailsPage />} />
                <Route path="bulk-orders" element={<BulkOrdersPage />} />
                <Route path="bulk-orders/:id" element={<BulkOrderDetailsPage />} />
                <Route path="new-arrivals" element={<NewArrivalsPage />} />

                {/* Protected Routes */}
                <Route
                  path="checkout"
                  element={
                    <ProtectedRoute>
                      <CheckoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="my-orders"
                  element={
                    <ProtectedRoute>
                      <MyOrdersPage />
                    </ProtectedRoute>
                  }
                />

                {/* Auth Routes */}
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />

                {/* 404 Not Found */}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>

            {process.env.NODE_ENV === 'development' && (
              <Suspense fallback={null}>
                <GlobalLoginPromptHandler />
                {/* <AuthCartDebug /> */}
                {/* <CartWishlistDebug /> */}
              </Suspense>
            )}
            <CartSidebar />
            <WishlistSidebar />
          </WishlistProvider>
        </CartProvider>
      </Suspense>
      <Toaster position="bottom-right" />
    </>
  );
};

export default App;