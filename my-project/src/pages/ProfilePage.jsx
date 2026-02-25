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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!auth.currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your account settings and view your order history.
              </p>
            </div>

            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`${activeTab === 'profile' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`${activeTab === 'orders' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  Orders
                </button>
                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`${activeTab === 'addresses' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  Addresses
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`${activeTab === 'reviews' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  My Reviews
                </button>
              </nav>
            </div>

            {activeTab === 'profile' && (
              <div className="px-4 py-5 sm:p-6">
                <div className="md:flex md:items-center md:justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium leading-6 text-gray-900">Profile Information</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Update your account's profile information and email address.
                    </p>
                  </div>
                  {(!isEditing && (
                    <div className="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4">
                      <button
                        type="button"
                        onClick={handleEditProfile}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Edit Profile
                      </button>
                    </div>
                  ))}
                </div>

                {isEditing ? (
                  <form key="edit-form" className="mt-6 space-y-6" onSubmit={handleSubmit}>
                    <div className="flex items-center space-x-6">
                      <div className="flex-shrink-0 h-24 w-24">
                        <img
                          className="h-24 w-24 rounded-full object-cover"
                          src={formData.avatar}
                          alt="Profile"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="avatar"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
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
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="pt-5">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                        <dd className="mt-1 flex text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <span className="flex-grow">{`${userData.firstName} ${userData.lastName}`}</span>
                        </dd>
                      </div>
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">Email address</dt>
                        <dd className="mt-1 flex text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <span className="flex-grow">{userData.email}</span>
                        </dd>
                      </div>
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">Phone number</dt>
                        <dd className="mt-1 flex text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <span className="flex-grow">{userData.phone}</span>
                        </dd>
                      </div>
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">Address</dt>
                        <dd className="mt-1 flex text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <span className="flex-grow">{userData.address}</span>
                        </dd>
                      </div>
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">Member since</dt>
                        <dd className="mt-1 flex text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          <span className="flex-grow">{userData.memberSince}</span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="px-4 py-5 sm:p-6">
                <div className="md:flex md:items-center md:justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium leading-6 text-gray-900">Order History</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      View your recent orders and track their status.
                    </p>
                  </div>
                  <div className="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4">
                    <button
                      type="button"
                      onClick={() => fetchUserOrders()}
                      disabled={isOrdersLoading}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isOrdersLoading ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                </div>

                <div className="mt-8">
                  {isOrdersLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
                      <p className="mt-1 text-sm text-gray-500">You haven't placed any orders yet.</p>
                      <div className="mt-6">
                        <Link
                          to="/shop"
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
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
                            <div className="px-4 py-4 flex items-center sm:px-6">
                              <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                                <div className="truncate">
                                  <div className="flex text-sm">
                                    <p className="font-medium text-blue-600 truncate">
                                      Order #{order.order_number || order._id?.slice(-8) || 'N/A'}
                                    </p>
                                    <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                                      on {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                                    </p>
                                  </div>
                                  <div className="mt-2 flex">
                                    <div className="flex items-center text-sm text-gray-500">
                                      <p>
                                        {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''} •
                                        Total: ${order.total_amount || order.total || 0}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                                  <div className="flex items-center">
                                    <div className={`h-5 w-5 rounded-full flex items-center justify-center ${order.status === 'delivered' ? 'bg-green-500' :
                                      order.status === 'shipped' ? 'bg-blue-500' :
                                        order.status === 'processing' ? 'bg-yellow-500' : 'bg-gray-500'
                                      }`}>
                                      <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                                      {order.status || 'Processing'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-5 flex-shrink-0">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="px-4 py-5 sm:p-6">
                <div className="md:flex md:items-center md:justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium leading-6 text-gray-900">Saved Addresses</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage your saved addresses for faster checkout.
                    </p>
                  </div>
                  <div className="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4">
                    <button
                      type="button"
                      onClick={() => fetchUserAddresses()}
                      disabled={isAddressesLoading}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 mr-3"
                    >
                      {isAddressesLoading ? 'Loading...' : 'Refresh'}
                    </button>
                    <button
                      type="button"
                      onClick={handleAddAddress}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add New Address
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  {isAddressesLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-12">
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
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          Add Your First Address
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {addresses.map((address) => (
                        <div key={address._id || address.id} className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <div className="flex-1 min-w-0">
                            <div className="focus:outline-none">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">{address.type}</p>
                                {address.is_default && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Default
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                {/* Handle both structured and legacy address formats */}
                                {address.firstName && address.lastName ? (
                                  // Structured address format
                                  <>
                                    <p className="font-medium">{address.firstName} {address.lastName}</p>
                                    <p>{address.street}, {address.city}, {address.state} {address.zipCode}</p>
                                    <p>{address.country || 'India'}</p>
                                    <p className="mt-1">{address.phone}</p>
                                    <p>{address.email}</p>
                                  </>
                                ) : (
                                  // Legacy address format (single address field)
                                  <p className="font-medium">{address.address || 'Address not available'}</p>
                                )}
                              </div>
                              <div className="mt-2 flex items-center space-x-2">
                                <div className="flex space-x-2">
                                  <button
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
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
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Address Modal */}
                {showAddressModal && (
                  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
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
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label htmlFor="addressType" className="block text-sm font-medium text-gray-700">
                              Address Type
                            </label>
                            <select
                              id="addressType"
                              value={addressForm.type}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, type: e.target.value }))}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              <option value="Home">Home</option>
                              <option value="Work">Work</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          {/* Name Fields */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                                First Name *
                              </label>
                              <input
                                type="text"
                                id="firstName"
                                value={addressForm.firstName}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, firstName: e.target.value }))}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                required
                              />
                            </div>
                          </div>

                          {/* Contact Fields */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address *
                              </label>
                              <input
                                type="email"
                                id="email"
                                value={addressForm.email}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, email: e.target.value }))}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                required
                              />
                            </div>
                          </div>

                          {/* Address Fields */}
                          <div>
                            <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                              Street Address *
                            </label>
                            <input
                              type="text"
                              id="street"
                              value={addressForm.street}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                                City *
                              </label>
                              <input
                                type="text"
                                id="city"
                                value={addressForm.city}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                              Set as default address
                            </label>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
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
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveAddress}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
            {activeTab === 'reviews' && (
              <div className="px-4 py-5 sm:p-6">
                <div className="md:flex md:items-center md:justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium leading-6 text-gray-900">My Reviews</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage reviews you have posted for products.
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  {isReviewsLoading ? (
                    <div className="flex justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      You haven't posted any reviews yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review._id} className="bg-white border rounded-lg p-4 flex gap-4">
                          <img
                            src={review.product_id?.image_url?.[0] || 'https://via.placeholder.com/64'}
                            alt={review.product_id?.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium text-gray-900">{review.product_id?.name}</h3>
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
                              <div className="flex bg-gray-100 rounded px-2 py-1 text-xs font-medium uppercase tracking-wide">
                                <span className={
                                  review.status === 'approved' ? 'text-green-700' :
                                    review.status === 'rejected' ? 'text-red-700' : 'text-yellow-700'
                                }>
                                  {review.status}
                                </span>
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">{review.review}</p>
                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={() => handleDeleteReview(review._id)}
                                className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                              >
                                <Trash2 size={14} /> Delete Review
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
