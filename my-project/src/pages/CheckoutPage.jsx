import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/format';
import orderService from '../services/orderService';
import paymentService from '../services/paymentService';
import addressService from '../services/addressService';
import toast from 'react-hot-toast';
import { CheckCircleIcon, TruckIcon, CreditCardIcon } from '@heroicons/react/24/outline';

const CheckoutPage = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { items: cartItems, clearCart } = useCart();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    sameAsBilling: true,
    paymentMethod: 'cod',
    saveInfo: false,
  });

  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [razorpayAvailable, setRazorpayAvailable] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(true); // Show form by default when no addresses
  const [addressSelectionKey, setAddressSelectionKey] = useState(0);
  const [editingAddressId, setEditingAddressId] = useState(null);

  // Check Razorpay availability on component mount
  useEffect(() => {
    const checkRazorpayAvailability = async () => {
      try {
        const config = await paymentService.getRazorpayConfig();
        setRazorpayAvailable(config.configured || false);
      } catch (error) {
        console.warn('Razorpay not available:', error.message);
        setRazorpayAvailable(false);
      }
    };

    checkRazorpayAvailability();
  }, []);

  const handleAddressSelect = (address) => {
    // Check if this is a legacy address (old format with single address field)
    if (!address.firstName || !address.lastName) {
      // Legacy address - show message and don't select it
      toast.error('This address format is outdated. Please add a new address with complete details.');
      return;
    }

    // Auto-fill the form with selected address data
    setFormData(prev => ({
      ...prev,
      firstName: address.firstName || '',
      lastName: address.lastName || '',
      email: address.email || '',
      phone: address.phone || '',
      address: address.street || '', // Map street to address field for backward compatibility
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zipCode || '',
      country: address.country || 'India'
    }));
    setSelectedAddressId(address._id);
    setShowAddressForm(true); // Keep form visible so user can see the filled data
    setEditingAddressId(null); // Ensure we are not in edit mode when just selecting
  };

  const handleEditAddress = (e, address) => {
    e.stopPropagation(); // Prevent selection when clicking edit
    setEditingAddressId(address._id);
    setSelectedAddressId(address._id); // Also select it
    setShowAddressForm(true);
    setAddressSelectionKey(prev => prev + 1);

    // Populate form
    setFormData(prev => ({
      ...prev,
      firstName: address.firstName || '',
      lastName: address.lastName || '',
      email: address.email || '',
      phone: address.phone || '',
      address: address.street || address.address || '', // Handle legacy address field
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zipCode || '',
      country: address.country || 'India',
      saveInfo: false // Don't show "save info" checkbox when editing
    }));

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingAddressId(null);
    setShowAddressForm(false);
    setSelectedAddressId(null);
    // Reset form to neutral state
    setFormData(prev => ({
      ...prev,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    }));
  };

  const handleNewAddress = () => {
    setSelectedAddressId(null);
    setEditingAddressId(null);
    setShowAddressForm(true);
    setAddressSelectionKey(prev => prev + 1); // Force re-render
    // Clear form to allow new address entry
    setFormData(prev => ({
      ...prev,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    }));
  };

  // Fetch saved addresses
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      if (!isAuthenticated) return;

      setAddressesLoading(true);
      try {
        const response = await addressService.getAddresses();
        if (response.success) {
          const addresses = response.data || [];
          setSavedAddresses(addresses);

          // If addresses exist, show form (addresses will pre-fill it)
          if (addresses.length > 0) {
            setShowAddressForm(true);
            // Auto-select default address if available
            const defaultAddress = addresses.find(addr => addr.is_default);
            if (defaultAddress && defaultAddress.firstName && defaultAddress.lastName) {
              setSelectedAddressId(defaultAddress._id);
              handleAddressSelect(defaultAddress);
            }
          } else {
            setShowAddressForm(true);
          }
        }
      } catch (error) {
        console.error('Error fetching addresses:', error);
        toast.error('Failed to load saved addresses');
        // On error, show form anyway
        setShowAddressForm(true);
      } finally {
        setAddressesLoading(false);
      }
    };

    fetchSavedAddresses();
  }, [isAuthenticated]);
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      navigate('/cart');
      return;
    }
  }, [isAuthenticated, cartItems, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      toast.error('Please login to place an order');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (formData.paymentMethod !== 'cod' && formData.paymentMethod !== 'razorpay') {
      toast.error('Please select a valid payment method');
      return;
    }

    // Handle Address Update
    if (editingAddressId) {
      setLoading(true);
      try {
        const addressData = {
          type: 'Home', // Preserve type or allow editing if added to form
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          street: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
          is_default: false // Preserve or update based on logic
        };

        const response = await addressService.updateAddress(editingAddressId, addressData);
        if (response.success || response) { // Check response structure
          toast.success('Address updated successfully');
          setEditingAddressId(null);
          // Refresh addresses
          const refreshResponse = await addressService.getAddresses();
          if (refreshResponse.success) {
            setSavedAddresses(refreshResponse.data || []);
            // Keep the updated address selected
            setSelectedAddressId(editingAddressId);
          }
        }
      } catch (error) {
        console.error('Error updating address:', error);
        toast.error('Failed to update address');
      } finally {
        setLoading(false);
      }
      return; // Stop here, don't place order immediately after update
    }

    // Save address if requested and it's a new address entry
    if (formData.saveInfo && showAddressForm && selectedAddressId === null) {
      try {
        const addressData = {
          type: 'Home', // Default type for new addresses
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          street: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
          is_default: false // Let user set default later if needed
        };

        const addressResponse = await addressService.createAddress(addressData);
        if (addressResponse.success) {
          toast.success('Address saved for future orders');
          // Refresh addresses list
          const response = await addressService.getAddresses();
          if (response.success) {
            setSavedAddresses(response.data || []);
          }
        }
      } catch (error) {
        console.error('Error saving address:', error);
        toast.error('Failed to save address, but order can still be placed');
      }
    }

    setLoading(true);

    try {
      // Prepare order data
      const orderData = {
        payment_method: formData.paymentMethod === 'cod' ? 'cash' : 'razorpay',
        shipping_address: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
          street: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country
        },
        items: cartItems.map(item => ({
          product_id: item.id || item.product_id,
          quantity: item.quantity,
          unit_price: item.price
        })),
        shipping_cost: shipping, // Use calculated shipping cost
        coupon_id: null
      };

      // Handle different payment methods
      if (formData.paymentMethod === 'razorpay') {
        // For Razorpay payments, initialize payment gateway
        await paymentService.initializeRazorpayPayment(
          orderData,
          (verificationResult) => {
            // Payment successful
            clearCart(true); // Force local clear
            setOrderDetails(verificationResult.order);
            setOrderPlaced(true);

            setTimeout(() => {
              navigate('/my-orders');
            }, 3000);
          },
          (error) => {
            // Payment failed
            console.error('Payment failed:', error);
            // Order is already marked as failed in backend
          }
        );
      } else {
        // For Cash on Delivery, place order directly
        const response = await orderService.placeOrder(orderData);

        if (response.success) {
          // Clear the cart locally (backend already cleared it during order placement)
          clearCart(true); // Force local clear

          // Set order details for confirmation
          setOrderDetails(response.order);
          setOrderPlaced(true);

          toast.success('Order placed successfully!');

          // Auto redirect to orders page after 3 seconds
          setTimeout(() => {
            navigate('/my-orders');
          }, 3000);
        } else {
          throw new Error(response.message || 'Failed to place order');
        }
      }

    } catch (error) {
      console.error('Order placement error:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 0 ? (subtotal > 500 ? 0 : 50) : 0; // Free shipping over $500
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + shipping + tax;

  // If order is placed, show success message
  if (orderPlaced && orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <CheckCircleIcon className="h-16 w-16 text-green-500" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Placed Successfully!</h2>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800 font-medium mb-2">Order Details:</p>
            <p className="text-lg font-bold text-green-900 mb-1">{orderDetails.invoice_no}</p>
            <p className="text-sm text-green-700">Total: {formatCurrency(orderDetails.total)}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
              {orderDetails.payment_method === 'razorpay' ? (
                <>
                  <CreditCardIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">Payment Successful</span>
                </>
              ) : (
                <>
                  <TruckIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">Cash on Delivery</span>
                </>
              )}
            </div>
            <p className="text-sm text-blue-700">
              {orderDetails.payment_method === 'razorpay'
                ? `Your payment of ${formatCurrency(orderDetails.total)} has been processed successfully.`
                : `You will pay ${formatCurrency(orderDetails.total)} in cash when your order is delivered.`
              }
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to="/my-orders"
              className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              View My Orders
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center justify-center w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            You will be redirected to your orders page in a few seconds...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Saved Addresses Section */}
            {savedAddresses.length > 0 && !addressesLoading && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Delivery Address</h2>

                {/* Show info message if there are legacy addresses */}
                {savedAddresses.some(addr => !addr.firstName || !addr.lastName) && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-yellow-800">
                        Some of your saved addresses use an older format. Please add new addresses for the best checkout experience.
                      </p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6" key={addressSelectionKey}>
                  {savedAddresses.map((address) => {
                    const isLegacyAddress = !address.firstName || !address.lastName;
                    return (
                      <div
                        key={address._id}
                        className={`relative rounded-lg border-2 p-4 transition-all ${selectedAddressId === address._id
                          ? 'border-blue-500 bg-blue-50'
                          : isLegacyAddress
                            ? 'border-gray-200 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                          }`}
                        onClick={() => !isLegacyAddress && handleAddressSelect(address)}
                      >
                        <div className="flex items-start">
                          <input
                            type="radio"
                            name="selectedAddress"
                            checked={selectedAddressId === address._id}
                            onChange={() => !isLegacyAddress && handleAddressSelect(address)}
                            disabled={isLegacyAddress}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">{address.type}</span>
                              <div className="flex items-center space-x-2">
                                {address.is_default && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Default
                                  </span>
                                )}
                                {isLegacyAddress && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Legacy Format
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleEditAddress(e, address)}
                                  className={`text-xs font-medium underline ml-2 ${isLegacyAddress ? 'text-blue-600 hover:text-blue-800' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                  {isLegacyAddress ? 'Update Format' : 'Edit'}
                                </button>
                              </div>
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
                                <>
                                  <p className="font-medium">{address.address || 'Address not available'}</p>
                                  <p className="text-xs text-yellow-600 mt-1">This address uses an old format. Please update it.</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add New Address Option */}
                  <div
                    className={`relative rounded-lg border-2 border-dashed p-4 cursor-pointer transition-all ${selectedAddressId === null && showAddressForm
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                      }`}
                    onClick={handleNewAddress}
                  >
                    <div className="flex items-center justify-center h-full min-h-[120px]">
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <p className="mt-2 text-sm font-medium text-gray-900">Add New Address</p>
                        <p className="text-sm text-gray-500">Enter a new delivery address</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {selectedAddressId ? 'Address selected - details shown below' : 'Select an address above or add a new one'}
                  </p>
                  {selectedAddressId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAddressId(null);
                        // Clear form to neutral state
                        setFormData(prev => ({
                          ...prev,
                          firstName: '',
                          lastName: '',
                          email: '',
                          phone: '',
                          address: '',
                          city: '',
                          state: '',
                          zipCode: '',
                          country: 'India'
                        }));
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Use different address
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Billing & Shipping Information */}
            {showAddressForm && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedAddressId ? 'Selected Address Details' : 'Billing & Shipping Information'}
                  </h2>
                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={editingAddressId ? handleCancelEdit : () => setShowAddressForm(false)}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      {editingAddressId ? 'Cancel Edit' : 'Cancel'}
                    </button>
                  )}
                </div>

                {selectedAddressId && !editingAddressId && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-green-800">
                        Address selected and form pre-filled. You can modify details if needed.
                      </p>
                    </div>
                  </div>
                )}

                {editingAddressId && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      <p className="text-sm text-blue-800">
                        Editing address. Update the details below and click "Update Address".
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="saveInfo"
                    name="saveInfo"
                    checked={formData.saveInfo}
                    onChange={handleChange}
                    disabled={!!editingAddressId} // Disable when editing
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <label htmlFor="saveInfo" className={`ml-2 text-sm ${editingAddressId ? 'text-gray-400' : 'text-gray-700'}`}>
                    Save this address for future orders
                  </label>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Method</h2>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="cod"
                    name="paymentMethod"
                    value="cod"
                    checked={formData.paymentMethod === 'cod'}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="cod" className="ml-3 flex items-center">
                    <span className="text-sm font-medium text-gray-700">Cash on Delivery</span>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Recommended
                    </span>
                  </label>
                </div>

                {formData.paymentMethod === 'cod' && (
                  <div className="ml-7 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <TruckIcon className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-green-800">Cash on Delivery</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Pay {formatCurrency(total)} in cash when your order is delivered to your door.
                    </p>
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="radio"
                    id="razorpay"
                    name="paymentMethod"
                    value="razorpay"
                    checked={formData.paymentMethod === 'razorpay'}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="razorpay" className="ml-3 flex items-center">
                    <span className="text-sm font-medium text-gray-700">Razorpay / UPI / Net Banking</span>
                    {!razorpayAvailable && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                        Pending Config
                      </span>
                    )}
                  </label>
                </div>

                {formData.paymentMethod === 'razorpay' && (
                  <div className="ml-7 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <CreditCardIcon className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-800">Secure Payment</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      Pay securely with credit card, debit card, UPI, or net banking. Your payment is protected.
                    </p>
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="radio"
                    id="credit-card"
                    name="paymentMethod"
                    value="credit-card"
                    checked={formData.paymentMethod === 'credit-card'}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    disabled
                  />
                  <label htmlFor="credit-card" className="ml-3 flex items-center">
                    <span className="text-sm font-medium text-gray-400">Credit Card</span>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      Coming Soon
                    </span>
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="radio"
                    id="paypal"
                    name="paymentMethod"
                    value="paypal"
                    checked={formData.paymentMethod === 'paypal'}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    disabled
                  />
                  <label htmlFor="paypal" className="ml-3 flex items-center">
                    <span className="text-sm font-medium text-gray-400">PayPal</span>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      Coming Soon
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <img
                        src={item.image || '/images/products/placeholder-product.svg'}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/images/products/placeholder-product.svg';
                        }}
                      />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-medium text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : formatCurrency(shipping)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-blue-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    {formData.paymentMethod === 'razorpay' ? 'Processing Payment...' : 'Placing Order...'}
                  </div>
                ) : (
                  editingAddressId
                    ? 'Update Address'
                    : formData.paymentMethod === 'razorpay'
                      ? `Pay ${formatCurrency(total)} Securely`
                      : `Place Order - ${formatCurrency(total)}`
                )}
              </button>

              <p className="mt-4 text-center text-sm text-gray-500">
                By placing your order, you agree to our{' '}
                <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link> and{' '}
                <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          </form>
        </div>v
      </div>
    </div>
  );
};

export default CheckoutPage;
