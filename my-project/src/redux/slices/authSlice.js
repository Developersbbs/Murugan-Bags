import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  registerWithEmail,
  loginWithEmail,
  sendOTP,
  verifyOTP,
  logoutUser as logoutService,
  getCurrentUser,
  signInWithGoogle as signInWithGoogleService,
  checkPhoneNumber as checkPhoneNumberService
} from '../../services/authService';
import { auth } from '../../firebase/config'; // Import initialized auth instance
import { API_BASE_URL } from '../../config/api';
// Logout User
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await logoutService();
      return {};
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to log out');
    }
  }
);

// Helper function to serialize Firebase user
export const serializeUser = (user) => {
  if (!user) return null;

  // Ensure we have a consistent email from the user object or provider data
  const getEmail = () => {
    if (user.email) return user.email;
    if (user.providerData && user.providerData.length > 0) {
      return user.providerData[0].email;
    }
    return '';
  };

  const serializedUser = {
    uid: user.uid,
    email: getEmail(),
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoURL,
    phoneNumber: user.phoneNumber,
    providerData: user.providerData ? user.providerData.map(provider => ({
      providerId: provider.providerId,
      uid: provider.uid,
      displayName: provider.displayName,
      email: provider.email || getEmail(), // Fallback to user email
      phoneNumber: provider.phoneNumber,
      photoURL: provider.photoURL
    })) : []
  };

  return serializedUser;
};

// Load backend user from localStorage
const loadBackendUserFromStorage = () => {
  if (typeof window === 'undefined') {
    console.log('loadBackendUserFromStorage: window is undefined, returning null');
    return null;
  }

  try {
    const storedBackendUser = localStorage.getItem('sbbs_backend_user');
    console.log('loadBackendUserFromStorage: stored data exists:', !!storedBackendUser);

    if (storedBackendUser) {
      const parsed = JSON.parse(storedBackendUser);
      console.log('loadBackendUserFromStorage: parsed data:', parsed);
      return parsed;
    }

    console.log('loadBackendUserFromStorage: no stored data, returning null');
    return null;
  } catch (error) {
    console.error('Error parsing stored backend user:', error);
    localStorage.removeItem('sbbs_backend_user');
    return null;
  }
};

// Load user from localStorage
const loadUserFromStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    const storedUser = localStorage.getItem('sbbs_auth');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error('Error parsing stored user:', error);
    localStorage.removeItem('sbbs_auth');
    return null;
  }
};

// Check if phone number exists
export const checkPhoneNumberExists = createAsyncThunk(
  'auth/checkPhoneNumber',
  async (phoneNumber, { rejectWithValue }) => {
    try {
      const exists = await checkPhoneNumberService(phoneNumber);
      return { exists };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to check phone number');
    }
  }
);

// Async thunks
export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const user = await getCurrentUser();
      return { user: serializeUser(user) };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ email, password, displayName, firstName, lastName, phone }, { rejectWithValue }) => {
    try {
      const userData = {
        firstName: firstName || displayName?.split(' ')[0] || '',
        lastName: lastName || displayName?.split(' ').slice(1).join(' ') || '',
        phone: phone || ''
      };

      const { user, error } = await registerWithEmail(email, password, userData);
      if (error) throw new Error(error);

      return {
        user: {
          ...serializeUser(user),
          displayName: displayName || user.displayName,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone
        }
      };
    } catch (error) {
      console.error('Registration error:', error);
      return rejectWithValue(error.message || 'Failed to register. Please try again.');
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      console.log('Login attempt with email:', email);
      const { user, error } = await loginWithEmail(email, password);

      if (error) {
        const errorObj = new Error(error);
        errorObj.code = error.code;
        throw errorObj;
      }

      if (!user) {
        throw new Error('No user data returned from login');
      }

      console.log('User data after login:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        providerData: user.providerData?.map(p => ({
          providerId: p.providerId,
          email: p.email
        }))
      });

      // Get the latest user data from Firebase
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Failed to get current user after login');
      }

      // Create a properly serialized user object
      const userData = {
        uid: currentUser.uid,
        email: email, // Use the email from login credentials
        emailVerified: currentUser.emailVerified,
        displayName: currentUser.displayName || user.displayName || email.split('@')[0],
        photoURL: currentUser.photoURL,
        phoneNumber: currentUser.phoneNumber,
        providerData: (currentUser.providerData || []).map(provider => ({
          providerId: provider.providerId,
          uid: provider.uid,
          displayName: provider.displayName,
          email: provider.email || email, // Fallback to login email if missing
          phoneNumber: provider.phoneNumber,
          photoURL: provider.photoURL
        }))
      };

      // Save to localStorage and return
      const serialized = serializeUser(userData);
      console.log('Final serialized user data:', serialized);

      // Fetch backend user data asynchronously (don't await to avoid blocking login)
      setTimeout(async () => {
        await fetchBackendUserDataForLogin(userData, dispatch);
      }, 100);

      return { user: serialized };
    } catch (error) {
      console.error('Login error:', error);
      return rejectWithValue(
        error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential'
          ? 'Invalid email or password.'
          : error.message || 'Failed to sign in. Please try again.'
      );
    }
  }
);

// Helper function to fetch backend user data
const fetchBackendUserDataForLogin = async (firebaseUser, dispatch) => {
  try {
    console.log('LoginThunk: fetchBackendUserData called for user:', firebaseUser.uid);

    // Wait for JWT token to be available (retry up to 10 times with 100ms delay)
    let token = localStorage.getItem('authToken') || localStorage.getItem('jwt_token');
    let attempts = 0;
    while (!token && attempts < 10) {
      console.log('LoginThunk: Waiting for JWT token, attempt:', attempts + 1);
      await new Promise(resolve => setTimeout(resolve, 100));
      token = localStorage.getItem('authToken') || localStorage.getItem('jwt_token');
      attempts++;
    }

    if (!token) {
      console.error('LoginThunk: JWT token not found after waiting');
      return;
    }

    console.log('LoginThunk: Using token:', token ? 'present' : 'missing');

    const API_URL = API_BASE_URL;
    const response = await fetch(`${API_URL}/auth/profile/${firebaseUser.uid}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('LoginThunk: fetchBackendUserData response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('LoginThunk: fetchBackendUserData response data:', result);

      if (result.success && result.data) {
        console.log('LoginThunk: Fetched backend user data successfully:', result.data);
        dispatch(setBackendUser(result.data));
        return;
      } else {
        console.warn('LoginThunk: Backend API returned success=false');
      }
    } else {
      console.warn('LoginThunk: Failed to fetch backend user data, status:', response.status);
      const errorText = await response.text();
      console.warn('LoginThunk: Error response:', errorText);
    }
  } catch (error) {
    console.error('LoginThunk: Error fetching backend user data:', error);
  }
};

export const sendPhoneOTP = createAsyncThunk(
  'auth/sendOTP',
  async (phoneNumber, { rejectWithValue }) => {
    try {
      const { success, error } = await sendOTP(phoneNumber);
      if (error) throw new Error(error);
      return { success };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const verifyPhoneOTP = createAsyncThunk(
  'auth/verifyOTP',
  async (otp, { rejectWithValue }) => {
    try {
      const { user, error } = await verifyOTP(otp);
      if (error) throw new Error(error);
      return { user: serializeUser(user) };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const { user, error } = await signInWithGoogleService();
      if (error) {
        throw new Error(error);
      }

      const serializedUser = serializeUser(user);

      // Fetch backend user data asynchronously after successful Google sign in
      setTimeout(async () => {
        await fetchBackendUserDataForLogin(user, dispatch);
      }, 100);

      return { user: serializedUser };
    } catch (error) {
      console.error('Google sign in error:', error);
      return rejectWithValue(
        error.message || 'Failed to sign in with Google. Please try again.'
      );
    }
  }
);

// Fetch User Profile Thunk
export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (uid, { rejectWithValue, dispatch }) => {
    try {
      console.log('fetchUserProfile: called for uid:', uid);

      // Wait for JWT token to be available
      let token = localStorage.getItem('authToken') || localStorage.getItem('jwt_token');
      if (!token) {
        // Retry once after a short delay
        await new Promise(resolve => setTimeout(resolve, 500));
        token = localStorage.getItem('authToken') || localStorage.getItem('jwt_token');
      }

      if (!token) {
        throw new Error('No authentication token found');
      }

      const API_URL = API_BASE_URL;
      const response = await fetch(`${API_URL}/auth/profile/${uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const result = await response.json();
      if (result.success && result.data) {
        dispatch(setBackendUser(result.data));
        return result.data;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('fetchUserProfile error:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Clear all auth-related data from localStorage
export const clearAuthData = () => {
  if (typeof window !== 'undefined') {
    // Clear all auth-related keys
    const authKeys = [
      'sbbs_auth',
      'firebase:authUser',
      'firebaseui::rememberedAccounts',
      'firebaseui::pendingCredential'
    ];

    authKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Clear all cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
  }
};

export const userLogout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      // Clear all auth data first
      clearAuthData();

      // Sign out from Firebase
      await logoutUser();

      // Reset the entire Redux state
      dispatch({ type: 'RESET_STATE' });

      return {};
    } catch (error) {
      // Even if there's an error, we still want to clear the local data
      clearAuthData();
      return rejectWithValue(error.message || 'Failed to log out');
    }
  }
);

// Reset the entire auth state
const initialState = {
  user: null,
  backendUser: null, // Backend customer data with image_url
  backendUserLoading: false, // Loading state for backend user data
  isAuthenticated: false,
  loading: false,
  error: null,
  otpSent: false,
  otpVerified: false,
  otpError: null,
  otpLoading: false,
  phoneNumberExists: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    ...initialState,
    user: loadUserFromStorage(),
    backendUser: loadBackendUserFromStorage(), // Load backend user data
    isAuthenticated: !!loadUserFromStorage(),
    loading: !!loadUserFromStorage(), // Set loading to true if we have stored user data
    backendUserLoading: false, // Not loading initially
    error: null,
    otpSent: false,
    otpVerified: false,
    otpError: null,
    otpLoading: false,
  },
  reducers: {
    setUser: (state, action) => {
      const serializedUser = serializeUser(action.payload);
      state.user = serializedUser;
      state.isAuthenticated = !!serializedUser;
      state.error = null;
      state.loading = false;

      if (serializedUser && typeof window !== 'undefined') {
        // Save to localStorage when user is set
        localStorage.setItem('sbbs_auth', JSON.stringify(serializedUser));
      } else if (!serializedUser && typeof window !== 'undefined') {
        localStorage.removeItem('sbbs_auth');
      }
    },
    setBackendUser: (state, action) => {
      console.log('setBackendUser: called with payload:', action.payload);
      state.backendUser = action.payload;
      state.backendUserLoading = false; // Set loading to false when data is received

      if (action.payload && typeof window !== 'undefined') {
        console.log('setBackendUser: storing to localStorage:', action.payload);
        localStorage.setItem('sbbs_backend_user', JSON.stringify(action.payload));
      } else if (!action.payload && typeof window !== 'undefined') {
        console.log('setBackendUser: removing from localStorage');
        localStorage.removeItem('sbbs_backend_user');
      }
    },
    setBackendUserLoading: (state, action) => {
      state.backendUserLoading = action.payload;
    },
    forceLogout: (state) => {
      state.user = null;
      state.backendUser = null; // Clear backend user data
      state.backendUserLoading = false; // Reset loading state
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.otpSent = false;
      state.otpVerified = false;
      state.otpError = null;
      state.otpLoading = false;
      state.phoneNumberExists = false;

      if (typeof window !== 'undefined') {
        localStorage.removeItem('sbbs_auth');
        localStorage.removeItem('sbbs_backend_user'); // Clear backend user data
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    resetOtpState: (state) => {
      state.otpSent = false;
      state.otpVerified = false;
      state.otpError = null;
      state.otpLoading = false;
    },
    setInitializationComplete: (state) => {
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    // Add reset state case
    builder.addCase('RESET_STATE', (state) => {
      return { ...initialState };
    });
    // Register User
    builder.addCase(registerUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(registerUser.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      // Save to localStorage
      if (action.payload.user) {
        localStorage.setItem('sbbs_auth', JSON.stringify(action.payload.user));
      }
    });
    builder.addCase(registerUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Registration failed';
    });

    // Login User
    builder.addCase(loginUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginUser.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
      // Save to localStorage
      if (action.payload.user) {
        localStorage.setItem('sbbs_auth', JSON.stringify(action.payload.user));
      }

      // Note: backendUser is handled separately in the thunk
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Login failed';
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('sbbs_auth');
    });

    // Check Auth Status
    builder.addCase(checkAuth.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(checkAuth.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload?.user || null;
      state.isAuthenticated = !!action.payload?.user;
      // Update localStorage if we have user data
      if (action.payload?.user) {
        localStorage.setItem('sbbs_auth', JSON.stringify(action.payload.user));
      } else {
        localStorage.removeItem('sbbs_auth');
      }
    });
    builder.addCase(checkAuth.rejected, (state) => {
      state.loading = false;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('sbbs_auth');
    });

    // Logout User
    builder.addCase(logoutUser.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(logoutUser.fulfilled, (state) => {
      // Reset all state to initial values
      state.user = null;
      state.backendUser = null; // Clear backend user data
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.otpSent = false;
      state.otpVerified = false;
      state.otpError = null;
      state.otpLoading = false;
      state.phoneNumberExists = false;

      // Clear all possible localStorage keys
      if (typeof window !== 'undefined') {
        const authKeys = [
          'sbbs_auth',
          'sbbs_backend_user', // Clear backend user data
          'sbbs_user',
          'sbbs_token',
          'firebase_auth_token',
          'firebase_user',
          'auth_token',
          'user_data'
        ];

        authKeys.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });
      }
    });
    builder.addCase(logoutUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Logout failed';
      // Even if logout fails, clear the local state
      state.user = null;
      state.isAuthenticated = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sbbs_auth');
      }
    });

    // Google Sign In
    builder.addCase(signInWithGoogle.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signInWithGoogle.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
      // Save to localStorage
      if (action.payload.user) {
        localStorage.setItem('sbbs_auth', JSON.stringify(action.payload.user));
      }
    });
    builder.addCase(signInWithGoogle.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Google sign in failed';
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('sbbs_auth');
    });

    // Send OTP
    builder.addCase(sendPhoneOTP.pending, (state) => {
      state.otpLoading = true;
      state.otpError = null;
    });
    builder.addCase(sendPhoneOTP.fulfilled, (state) => {
      state.otpLoading = false;
      state.otpSent = true;
    });
    builder.addCase(sendPhoneOTP.rejected, (state, action) => {
      state.otpLoading = false;
      state.otpError = action.payload;
    });

    // Verify OTP
    builder.addCase(verifyPhoneOTP.pending, (state) => {
      state.otpLoading = true;
      state.otpError = null;
    });
    builder.addCase(verifyPhoneOTP.fulfilled, (state) => {
      state.otpLoading = false;
      state.otpVerified = true;
      state.otpSent = false;
    });
    builder.addCase(verifyPhoneOTP.rejected, (state, action) => {
      state.otpLoading = false;
      state.otpError = action.payload;
      state.isAuthenticated = false;
      state.otpSent = false;
      state.verificationId = null;
      state.error = null;
      state.loading = false;
    });
  },
});

export const { setUser, setBackendUser, setBackendUserLoading, clearError, resetOtpState, forceLogout, setInitializationComplete } = authSlice.actions;
export default authSlice.reducer;
