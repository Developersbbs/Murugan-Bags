import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { uploadProfilePhoto } from '../services/storageService';
import { setBackendUser } from '../redux/slices/authSlice';
import orderService from '../services/orderService';
import addressService from '../services/addressService';
import ratingService from '../services/ratingService';
import { Star, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { formatCurrency } from '../utils/format';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('profile');
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const { user, loading: authLoading } = useSelector((state) => state.auth);
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    avatar: 'https://via.placeholder.com/150',
    memberSince: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...userData });
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [isAddressesLoading, setIsAddressesLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    type: 'Home',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    is_default: false
  });
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  const fetchUserData = useCallback(async () => {
    try {
      if (!authChecked || authLoading) {
        console.log('fetchUserData: Skipping because authChecked:', authChecked, 'authLoading:', authLoading);
        return;
      }

      const currentUser = auth.currentUser;
      console.log('fetchUserData: currentUser:', currentUser ? { uid: currentUser.uid, email: currentUser.email } : 'null');

      if (!currentUser) {
        setError('Please sign in to view your profile');
        setIsPageLoading(false);
        return;
      }

      // Check cache first
      const CACHE_KEY = `sbbs_profile_${currentUser.uid}`;
      const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes
      const cached = localStorage.getItem(CACHE_KEY);

      if (cached) {
        try {
          const { timestamp, data: cachedData } = JSON.parse(cached);
          // CRITICAL: Validate auth token exists before using cache
          const token = localStorage.getItem('authToken') || localStorage.getItem('jwt_token');
          const hasValidAuth = token && currentUser && currentUser.uid;

          if (Date.now() - timestamp < CACHE_DURATION && hasValidAuth) {
            console.log('fetchUserData: Using cached profile data (auth validated)');
            setUserData(cachedData);
            setFormData(cachedData);
            setIsPageLoading(false);
            // Continue to fetch fresh data in background
          } else if (!hasValidAuth) {
            console.log('fetchUserData: Cache invalid or auth expired, clearing cache');
            localStorage.removeItem(CACHE_KEY);
          }
        } catch (e) {
          console.warn('fetchUserData: Cache parse error', e);
          localStorage.removeItem(CACHE_KEY);
        }
      }

      setIsPageLoading(true);
      setError(null);

      console.log('fetchUserData: Fetching profile for UID:', currentUser.uid);
      // Fetch user data from the backend using the new endpoint
      const response = await fetch(`${API_BASE_URL}/auth/profile/${currentUser.uid}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('fetchUserData: Response not ok:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to fetch user data');
      }

      const result = await response.json();
      console.log('fetchUserData: Raw API response:', result);

      if (!result.success) {
        console.error('fetchUserData: API returned success=false:', result);
        throw new Error(result.error || 'Failed to load profile data');
      }

      const data = result.data;
      console.log('fetchUserData: User data from API:', data);
      console.log('fetchUserData: image_url from API:', data.image_url);

      // Format the data for the form
      const formattedData = {
        firstName: data.name?.split(' ')[0] || '',
        lastName: data.name?.split(' ').slice(1).join(' ') || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        avatar: data.image_url || 'https://via.placeholder.com/150',
        memberSince: data.created_at ? new Date(data.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long'
        }) : 'N/A'
      };

      console.log('fetchUserData: Formatted data:', formattedData);
      console.log('fetchUserData: Avatar URL set to:', formattedData.avatar);

      setUserData(formattedData);
      setFormData(formattedData);

      // CRITICAL: Sync with Redux state so navbar updates immediately
      dispatch(setBackendUser(data));

      // Update cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: formattedData
      }));
    } catch (error) {
      console.error('Error fetching user data:', error);

      // Don't immediately show error if we have cached data
      // This prevents API failures from appearing as logout
      if (userData && userData.email) {
        console.log('fetchUserData: Using existing cached data due to fetch error');
        setError(null); // Clear error since we have cached data
        toast('Using cached profile data. Some information may be outdated.', {
          icon: '⚠️',
          style: {
            borderRadius: '10px',
            background: '#fff',
            color: '#333',
          },
        });
      } else {
        setError('Failed to load profile data. Please try refreshing the page.');
      }
    } finally {
      setIsPageLoading(false);
    }
  }, [authChecked, authLoading, auth]);

  const fetchUserOrders = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('fetchUserOrders: No current user');
        return;
      }

      setIsOrdersLoading(true);
      console.log('fetchUserOrders: Fetching orders for UID:', currentUser.uid);

      const response = await orderService.getMyOrders(currentUser.uid);
      console.log('fetchUserOrders: Orders response:', response);

      // orderService returns the orders array directly
      if (Array.isArray(response)) {
        setOrders(response);
        console.log('fetchUserOrders: Successfully loaded', response.length, 'orders');
      } else {
        console.error('fetchUserOrders: Invalid response format:', response);
        setOrders([]);
        toast.error('Failed to load orders - invalid response format');
      }
    } catch (error) {
      console.error('Error fetching user orders:', error);
      setOrders([]);
      toast.error('Failed to load orders');
    } finally {
      setIsOrdersLoading(false);
    }
  }, [auth]);

  const fetchUserAddresses = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('fetchUserAddresses: No current user');
        return;
      }

      setIsAddressesLoading(true);
      console.log('fetchUserAddresses: Fetching addresses for UID:', currentUser.uid);

      const response = await addressService.getAddresses();
      console.log('fetchUserAddresses: Addresses response:', response);

      if (response.success) {
        setAddresses(response.data || []);
      } else {
        console.error('fetchUserAddresses: Failed to fetch addresses:', response.error);
        setAddresses([]);
        toast.error('Failed to load addresses');
      }
    } catch (error) {
      console.error('Error fetching user addresses:', error);
      setAddresses([]);
      toast.error('Failed to load addresses');
    } finally {
      setIsAddressesLoading(false);
    }
  }, [auth]);

  const fetchUserReviews = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      setIsReviewsLoading(true);
      const response = await ratingService.getUserReviews();
      if (response.success) {
        setReviews(response.data || []);
      } else {
        toast.error('Failed to load reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setIsReviewsLoading(false);
    }
  }, [auth]);

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      await ratingService.deleteReview(reviewId);
      toast.success('Review deleted successfully');
      fetchUserReviews();
    } catch (err) {
      toast.error(err.message || 'Failed to delete review');
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      type: 'Home',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India',
      is_default: false
    });
    setShowAddressModal(true);
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressForm({
      type: address.type || 'Home',
      firstName: address.firstName || '',
      lastName: address.lastName || '',
      email: address.email || '',
      phone: address.phone || '',
      street: address.street || '',
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zipCode || '',
      country: address.country || 'India',
      is_default: address.is_default || false
    });
    setShowAddressModal(true);
  };

  const handleSaveAddress = async () => {
    try {
      // Validate required structured fields
      if (!addressForm.firstName.trim() || !addressForm.lastName.trim() || !addressForm.email.trim() || !addressForm.phone.trim() || !addressForm.street.trim() || !addressForm.city.trim() || !addressForm.state.trim() || !addressForm.zipCode.trim()) {
        toast.error('Please fill in all required address fields');
        return;
      }

      console.log('handleSaveAddress: Saving structured address', addressForm);

      let response;
      if (editingAddress) {
        // Update existing address
        response = await addressService.updateAddress(editingAddress._id, {
          type: addressForm.type,
          firstName: addressForm.firstName,
          lastName: addressForm.lastName,
          email: addressForm.email,
          phone: addressForm.phone,
          street: addressForm.street,
          city: addressForm.city,
          state: addressForm.state,
          zipCode: addressForm.zipCode,
          country: addressForm.country,
          is_default: addressForm.is_default || false
        });
      } else {
        // Create new address
        response = await addressService.createAddress({
          type: addressForm.type,
          firstName: addressForm.firstName,
          lastName: addressForm.lastName,
          email: addressForm.email,
          phone: addressForm.phone,
          street: addressForm.street,
          city: addressForm.city,
          state: addressForm.state,
          zipCode: addressForm.zipCode,
          country: addressForm.country,
          is_default: addressForm.is_default || false
        });
      }

      console.log('handleSaveAddress: Response:', response);

      if (response.success) {
        setShowAddressModal(false);
        setAddressForm({
          type: 'Home',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'India',
          is_default: false
        });
        setEditingAddress(null);
        toast.success(editingAddress ? 'Address updated successfully!' : 'Address added successfully!');

        // Refresh addresses
        await fetchUserAddresses();
      } else {
        throw new Error(response.error || 'Failed to save address');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Failed to save address. Please try again.');
    }
  };

  const handleDeleteAddress = async (address) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      console.log('handleDeleteAddress: Deleting address', address._id);

      const response = await addressService.deleteAddress(address._id);
      console.log('handleDeleteAddress: Response:', response);

      if (response.success) {
        toast.success('Address deleted successfully!');

        // Refresh addresses
        await fetchUserAddresses();
      } else {
        throw new Error(response.error || 'Failed to delete address');
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address. Please try again.');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthChecked(true);
      if (!user) {
        setError('Please sign in to view your profile');
        setIsPageLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Fetch orders when orders tab is active
  useEffect(() => {
    if (activeTab === 'orders' && auth.currentUser) {
      fetchUserOrders();
    }
  }, [activeTab, auth.currentUser, fetchUserOrders]);

  // Fetch addresses when addresses tab is active
  useEffect(() => {
    if (activeTab === 'addresses' && auth.currentUser) {
      fetchUserAddresses();
    }
  }, [activeTab, auth.currentUser, fetchUserAddresses]);

  // Fetch reviews when reviews tab is active
  useEffect(() => {
    if (activeTab === 'reviews' && auth.currentUser) {
      fetchUserReviews();
    }
  }, [activeTab, auth.currentUser, fetchUserReviews]);

  const handleEditProfile = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('handleEditProfile called, setting isEditing to true');
    setIsEditing(true);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('handleSubmit called, isEditing will be set to false');
    try {
      setIsSaving(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError('Please sign in to update your profile');
        setIsSaving(false);
        return;
      }

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      let avatarUrl = formData.avatar;

      if (selectedAvatarFile) {
        try {
          const { downloadURL } = await uploadProfilePhoto(currentUser.uid, selectedAvatarFile);
          avatarUrl = downloadURL;
        } catch (uploadError) {
          console.error('Error uploading profile photo:', uploadError);
          setError('Failed to upload profile photo. Please try again.');
          toast.error('Failed to upload profile photo. Please try again.');
          setIsSaving(false);
          return;
        }
      }

      if (typeof avatarUrl === 'string' && avatarUrl.startsWith('data:')) {
        avatarUrl = userData.avatar;
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile/${currentUser.uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: fullName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          image_url: avatarUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      // Update the local state with the new data
      const updatedData = {
        ...formData,
        avatar: avatarUrl,
        memberSince: userData.memberSince // Keep the original memberSince
      };

      setUserData(updatedData);
      setFormData(updatedData);
      setSelectedAvatarFile(null);
      setIsEditing(false);
      setError(null);
      toast.success('Profile updated successfully!');

      // Refetch user data to update the state and Redux
      await fetchUserData();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    console.log('handleCancel called, setting isEditing to false');
    setFormData({
      ...userData,
      // Ensure we're using the latest userData
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      phone: userData.phone || '',
      address: userData.address || '',
      avatar: userData.avatar || 'https://via.placeholder.com/150'
    });
    setSelectedAvatarFile(null);
    setIsEditing(false);
    setError(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.match('image.*')) {
        setError('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadstart = () => setIsUploadingImage(true);
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          avatar: reader.result
        }));
        setSelectedAvatarFile(file);
        setError(null);
        setIsUploadingImage(false);
      };
      reader.onerror = () => {
        setError('Error reading file');
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!authChecked || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!auth.currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="bg-gray-50 min-h-screen py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-red-700 break-words">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {/* Header Section - Mobile Optimized */}
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Account</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your account settings and view your order history.
              </p>
            </div>

            {/* Tabs Navigation - Mobile Optimized with Horizontal Scroll */}
            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="flex -mb-px min-w-max sm:min-w-0 px-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`${activeTab === 'profile' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-3 sm:px-6 border-b-2 font-medium text-xs sm:text-sm transition-colors duration-200`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`${activeTab === 'orders' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-3 sm:px-6 border-b-2 font-medium text-xs sm:text-sm transition-colors duration-200`}
                >
                  Orders
                </button>
                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`${activeTab === 'addresses' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-3 sm:px-6 border-b-2 font-medium text-xs sm:text-sm transition-colors duration-200`}
                >
                  Addresses
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`${activeTab === 'reviews' ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-3 sm:px-6 border-b-2 font-medium text-xs sm:text-sm transition-colors duration-200`}
                >
                  My Reviews
                </button>
              </nav>
            </div>

            {/* Profile Tab - Mobile Optimized */}
            {activeTab === 'profile' && (
              <div className="px-4 py-5 sm:p-6">
                {/* Header with Edit Button - Mobile Stacked */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium leading-6 text-gray-900">Profile Information</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Update your account's profile information and email address.
                    </p>
                  </div>
                  {!isEditing && (
                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleEditProfile}
                        className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                      >
                        Edit Profile
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <form key="edit-form" className="mt-6 space-y-6" onSubmit={handleSubmit}>
                    {/* Avatar Section - Mobile Optimized */}
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                      <div className="flex-shrink-0 flex justify-center sm:justify-start">
                        <img
                          className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
                          src={formData.avatar}
                          alt="Profile"
                        />
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <label
                          htmlFor="avatar"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 cursor-pointer"
                        >
                          Change Photo
                          <input
                            id="avatar"
                            name="avatar"
                            type="file"
                            className="sr-only"
                            onChange={handleFileChange}
                            accept="image/*"
                          />
                        </label>
                        <p className="mt-2 text-xs text-gray-500">JPG, GIF or PNG. Max size of 2MB</p>
                      </div>
                    </div>

                    {/* Form Fields - Mobile Optimized Grid */}
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <div className="sm:col-span-3">
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                          First name
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          id="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                          Last name
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          id="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email address
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          Phone number
                        </label>
                        <input
                          type="text"
                          name="phone"
                          id="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                          Address
                        </label>
                        <input
                          type="text"
                          name="address"
                          id="address"
                          value={formData.address}
                          onChange={handleChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    {/* Form Buttons - Mobile Stacked */}
                    <div className="pt-5">
                      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div key="view-mode" className="mt-6 border-t border-gray-200">
                    <dl className="divide-y divide-gray-200">
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">Full name</dt>
                        <dd className="mt-1 sm:mt-0 text-sm text-gray-900 sm:col-span-2 break-words">
                          {`${userData.firstName} ${userData.lastName}`}
                        </dd>
                      </div>
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">Email address</dt>
                        <dd className="mt-1 sm:mt-0 text-sm text-gray-900 sm:col-span-2 break-words">
                          {userData.email}
                        </dd>
                      </div>
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">Phone number</dt>
                        <dd className="mt-1 sm:mt-0 text-sm text-gray-900 sm:col-span-2 break-words">
                          {userData.phone}
                        </dd>
                      </div>
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">Address</dt>
                        <dd className="mt-1 sm:mt-0 text-sm text-gray-900 sm:col-span-2 break-words">
                          {userData.address}
                        </dd>
                      </div>
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">Member since</dt>
                        <dd className="mt-1 sm:mt-0 text-sm text-gray-900 sm:col-span-2 break-words">
                          {userData.memberSince}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab - Mobile Optimized */}
            {activeTab === 'orders' && (
              <div className="px-4 py-5 sm:p-6">
                {/* Header with Refresh - Mobile Stacked */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium leading-6 text-gray-900">Order History</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      View your recent orders and track their status.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => fetchUserOrders()}
                      disabled={isOrdersLoading}
                      className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50"
                    >
                      {isOrdersLoading ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  {isOrdersLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-500"></div>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
                      <p className="mt-1 text-sm text-gray-500">You haven't placed any orders yet.</p>
                      <div className="mt-6">
                        <Link
                          to="/shop"
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-rose-600 hover:bg-rose-700"
                        >
                          Start Shopping
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                      <ul className="divide-y divide-gray-200">
                        {orders.map((order) => (
                          <li key={order._id || order.id}>
                            <Link
                              to="/my-orders"
                              state={{ orderId: order._id || order.id }}
                              className="block hover:bg-gray-50 transition duration-150 ease-in-out"
                            >
                              <div className="px-4 py-4 sm:px-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                      <p className="text-sm font-medium text-rose-600 truncate">
                                        Order #{order.invoice_no || order.order_number || (order._id && order._id.length > 8 ? order._id.slice(-8) : (order._id || 'N/A'))}
                                      </p>
                                      <p className="text-xs sm:text-sm text-gray-500">
                                        {order.order_time || order.created_at ? new Date(order.order_time || order.created_at).toLocaleString('en-IN', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        }) : 'N/A'}
                                      </p>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                                      <span className="text-gray-500">
                                        {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                                      </span>
                                      <span className="text-gray-300 hidden sm:inline">•</span>
                                      <span className="text-gray-900 font-semibold">
                                        {formatCurrency(order.total_amount || order.total || 0)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-3 sm:mt-0 sm:ml-5 flex items-center justify-between sm:justify-start">
                                    <div className="flex items-center">
                                      <div className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${
                                        order.status === 'delivered' ? 'bg-green-500' :
                                        order.status === 'shipped' ? 'bg-rose-500' :
                                        order.status === 'processing' ? 'bg-yellow-500' : 'bg-gray-500'
                                      }`} />
                                      <span className="ml-2 text-xs sm:text-sm font-medium text-gray-900 capitalize">
                                        {order.status || 'Processing'}
                                      </span>
                                    </div>
                                    <svg className="ml-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Addresses Tab - Mobile Optimized */}
            {activeTab === 'addresses' && (
              <div className="px-4 py-5 sm:p-6">
                {/* Header with Actions - Mobile Stacked */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium leading-6 text-gray-900">Saved Addresses</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage your saved addresses for faster checkout.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => fetchUserAddresses()}
                      disabled={isAddressesLoading}
                      className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50"
                    >
                      {isAddressesLoading ? 'Loading...' : 'Refresh'}
                    </button>
                    <button
                      type="button"
                      onClick={handleAddAddress}
                      className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add New
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  {isAddressesLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-500"></div>
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No addresses</h3>
                      <p className="mt-1 text-sm text-gray-500">You haven't added any addresses yet.</p>
                      <div className="mt-6">
                        <button
                          type="button"
                          onClick={handleAddAddress}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-rose-600 hover:bg-rose-700"
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          Add Your First Address
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {addresses.map((address) => (
                        <div key={address._id || address.id} className="relative rounded-lg border border-gray-300 bg-white px-4 py-4 sm:px-6 sm:py-5 shadow-sm hover:border-gray-400 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-gray-900">{address.type}</p>
                              {address.is_default && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              {address.firstName && address.lastName ? (
                                <>
                                  <p className="font-medium">{address.firstName} {address.lastName}</p>
                                  <p className="break-words">{address.street}</p>
                                  <p>{address.city}, {address.state} {address.zipCode}</p>
                                  <p>{address.country || 'India'}</p>
                                  <p className="mt-2">{address.phone}</p>
                                  <p className="break-words">{address.email}</p>
                                </>
                              ) : (
                                <p className="font-medium break-words">{address.address || 'Address not available'}</p>
                              )}
                            </div>
                            <div className="mt-3 flex items-center space-x-3">
                              <button
                                className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                                onClick={() => handleEditAddress(address)}
                              >
                                Edit
                              </button>
                              {!address.is_default && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <button
                                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                                    onClick={() => handleDeleteAddress(address)}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Address Modal - Mobile Optimized */}
                {showAddressModal && (
                  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
                    <div className="relative top-4 sm:top-20 mx-auto max-w-sm sm:max-w-md p-5 border shadow-lg rounded-md bg-white">
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            {editingAddress ? 'Edit Address' : 'Add New Address'}
                          </h3>
                          <button
                            onClick={() => {
                              setShowAddressModal(false);
                              setEditingAddress(null);
                              setAddressForm({
                                type: 'Home',
                                firstName: '',
                                lastName: '',
                                email: '',
                                phone: '',
                                street: '',
                                city: '',
                                state: '',
                                zipCode: '',
                                country: 'India',
                                is_default: false
                              });
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                          <div>
                            <label htmlFor="addressType" className="block text-sm font-medium text-gray-700">
                              Address Type
                            </label>
                            <select
                              id="addressType"
                              value={addressForm.type}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, type: e.target.value }))}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                            >
                              <option value="Home">Home</option>
                              <option value="Work">Work</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                                First Name *
                              </label>
                              <input
                                type="text"
                                id="firstName"
                                value={addressForm.firstName}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, firstName: e.target.value }))}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                                Last Name *
                              </label>
                              <input
                                type="text"
                                id="lastName"
                                value={addressForm.lastName}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, lastName: e.target.value }))}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address *
                              </label>
                              <input
                                type="email"
                                id="email"
                                value={addressForm.email}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, email: e.target.value }))}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                Phone Number *
                              </label>
                              <input
                                type="tel"
                                id="phone"
                                value={addressForm.phone}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                              Street Address *
                            </label>
                            <input
                              type="text"
                              id="street"
                              value={addressForm.street}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                                City *
                              </label>
                              <input
                                type="text"
                                id="city"
                                value={addressForm.city}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                                State *
                              </label>
                              <input
                                type="text"
                                id="state"
                                value={addressForm.state}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                                ZIP Code *
                              </label>
                              <input
                                type="text"
                                id="zipCode"
                                value={addressForm.zipCode}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, zipCode: e.target.value }))}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm"
                                required
                              />
                            </div>
                          </div>

                          <div className="flex items-center">
                            <input
                              id="is_default"
                              type="checkbox"
                              checked={addressForm.is_default}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, is_default: e.target.checked }))}
                              className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-gray-300 rounded"
                            />
                            <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                              Set as default address
                            </label>
                          </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
                          <button
                            onClick={() => {
                              setShowAddressModal(false);
                              setEditingAddress(null);
                              setAddressForm({
                                type: 'Home',
                                firstName: '',
                                lastName: '',
                                email: '',
                                phone: '',
                                street: '',
                                city: '',
                                state: '',
                                zipCode: '',
                                country: 'India',
                                is_default: false
                              });
                            }}
                            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveAddress}
                            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-rose-600 border border-transparent rounded-md hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                          >
                            Save Address
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reviews Tab - Mobile Optimized */}
            {activeTab === 'reviews' && (
              <div className="px-4 py-5 sm:p-6">
                <div className="flex-1 min-w-0 mb-4">
                  <h2 className="text-lg font-medium leading-6 text-gray-900">My Reviews</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage reviews you have posted for products.
                  </p>
                </div>

                <div className="mt-4">
                  {isReviewsLoading ? (
                    <div className="flex justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-500"></div>
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 text-gray-500">
                      You haven't posted any reviews yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review._id} className="bg-white border rounded-lg p-4 flex flex-col sm:flex-row gap-4">
                          <div className="flex justify-center sm:justify-start">
                            <img
                              src={review.product_id?.image_url?.[0] || 'https://via.placeholder.com/64'}
                              alt={review.product_id?.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                              <div>
                                <h3 className="font-medium text-gray-900 text-sm sm:text-base break-words">
                                  {review.product_id?.name}
                                </h3>
                                <div className="flex items-center gap-1 mt-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      size={14}
                                      className={`${i < review.rating ? "fill-yellow-400 text-yellow-500" : "text-gray-300"}`}
                                    />
                                  ))}
                                  <span className="text-xs text-gray-500 ml-2">
                                    {new Date(review.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="inline-flex self-start bg-gray-100 rounded px-2 py-1 text-xs font-medium uppercase tracking-wide">
                                <span className={
                                  review.status === 'approved' ? 'text-green-700' :
                                    review.status === 'rejected' ? 'text-red-700' : 'text-yellow-700'
                                }>
                                  {review.status}
                                </span>
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-gray-600 break-words">{review.review}</p>
                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={() => handleDeleteReview(review._id)}
                                className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1 px-3 py-1"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;