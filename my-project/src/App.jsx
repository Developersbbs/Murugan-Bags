import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { API_BASE_URL } from './config/api';
import { authPersistenceReady } from './firebase/config';

// Layout Components
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingScreen from './components/common/Loading';
import { setUser, clearError, serializeUser, setInitializationComplete, setBackendUser, setBackendUserLoading } from './redux/slices/authSlice';
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

        // Import token utilities dynamically to avoid circular dependencies
        const { getValidJWTToken } = await import('./services/authTokenService');

        // Get valid JWT token (will refresh if expired)
        console.log('App: Getting valid JWT token...');
        let token = await getValidJWTToken();

        // If still no token after refresh attempt, wait a bit and try again
        if (!token) {
          console.log('App: No token after first attempt, waiting and retrying...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          token = await getValidJWTToken();
        }

        if (!token) {
          console.error('App: JWT token not available after refresh attempts');
          // Don't clear user here, just stop loading backend data
          // This allows basic Firebase auth to still work even if backend sync fails
          dispatch(setBackendUserLoading(false));
          return;
        }

        console.log('App: Using valid token for backend user fetch');

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

    // Initialize authentication with proper persistence handling
    const initializeAuth = async () => {
      try {
        console.log('🚀 [APP] Starting authentication initialization...');

        // CRITICAL: Wait for Firebase persistence to be set BEFORE any auth operations
        console.log('⏳ [APP] Waiting for Firebase persistence to be ready...');
        const persistenceSuccess = await authPersistenceReady;

        if (!persistenceSuccess) {
          console.error('❌ [APP] CRITICAL: Firebase persistence failed to initialize!');
          console.error('❌ [APP] Auth may not persist across sessions');
          // Continue anyway, but log the issue
        }

        console.log('✅ [APP] Firebase persistence is ready, proceeding with auth initialization');

        // CRITICAL FIX: Use ONLY authInitService, not setupAuthListener
        // This eliminates race conditions between duplicate listeners
        authInitService.addAuthStateListener(async (user) => {
          console.log('[AUTH_DEBUG] App: Auth state listener called with user:', user ? { uid: user.uid, email: user.email } : 'null');

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
        console.log('✅ [APP] Authentication initialization completed successfully');

      } catch (error) {
        console.error('❌ [APP] Error initializing authentication:', error);
        console.error('❌ [APP] Error details:', {
          message: error.message,
          stack: error.stack
        });
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

  // Show loading state while checking auth - But allow public routes to render immediately
  // preventing the "White Screen / Spinner of Death" on cold starts
  const isPublicRoute =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/product') ||
    location.pathname.startsWith('/products') ||
    location.pathname.startsWith('/combo-offers') ||
    location.pathname.startsWith('/new-arrivals') ||
    location.pathname.startsWith('/bulk-orders') ||
    location.pathname === '/cart' || // Allow cart to show empty or local items
    location.pathname === '/wishlist'; // Allow wishlist to show proper redirect or empty

  if (loading && !isPublicRoute) {
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

      {/* Customized Toaster - Bottom Center with Enhanced Styling */}
      <Toaster
        position="bottom-center"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Default options
          className: '',
          duration: 3000,
          style: {
            background: '#fff',
            color: '#363636',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '500px',
          },

          // Success toast styling
          success: {
            duration: 3000,
            style: {
              background: '#10b981',
              color: '#fff',
              padding: '16px 20px',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3)',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10b981',
            },
          },

          // Error toast styling
          error: {
            duration: 4000,
            style: {
              background: '#ef4444',
              color: '#fff',
              padding: '16px 20px',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(239, 68, 68, 0.3)',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#ef4444',
            },
          },

          // Loading toast styling
          loading: {
            style: {
              background: '#3b82f6',
              color: '#fff',
              padding: '16px 20px',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(59, 130, 246, 0.3)',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#3b82f6',
            },
          },
        }}
      />
    </>
  );
};

export default App;