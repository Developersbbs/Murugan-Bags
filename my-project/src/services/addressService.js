import axios from 'axios';

import { API_BASE_URL } from '../config/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('jwt_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const addressService = {
  // Get all addresses for the current user
  getAddresses: async () => {
    try {
      const response = await api.get('/addresses');
      return response.data;
    } catch (error) {
      console.error('Error fetching addresses:', error);
      throw error;
    }
  },

  // Create a new address - supports both structured and legacy formats
  createAddress: async (addressData) => {
    try {
      // Ensure we have the required fields for structured format
      if (addressData.firstName && addressData.lastName && addressData.email &&
        addressData.phone && addressData.street && addressData.city &&
        addressData.state && addressData.zipCode) {
        // Use structured format
        const structuredData = {
          type: addressData.type || 'Home',
          firstName: addressData.firstName,
          lastName: addressData.lastName,
          email: addressData.email,
          phone: addressData.phone,
          street: addressData.street,
          city: addressData.city,
          state: addressData.state,
          zipCode: addressData.zipCode,
          country: addressData.country || 'India',
          is_default: addressData.is_default || false
        };
        const response = await api.post('/addresses', structuredData);
        return response.data;
      } else if (addressData.address) {
        // Use legacy format for backward compatibility
        const legacyData = {
          type: addressData.type || 'Home',
          address: addressData.address,
          is_default: addressData.is_default || false
        };
        const response = await api.post('/addresses', legacyData);
        return response.data;
      } else {
        throw new Error('Invalid address data. Must provide either structured fields or legacy address field.');
      }
    } catch (error) {
      console.error('Error creating address:', error);
      throw error;
    }
  },

  // Update an existing address - supports both structured and legacy formats
  updateAddress: async (addressId, addressData) => {
    try {
      // Determine if we're using structured or legacy format
      const updateData = {
        type: addressData.type
      };

      // Check if structured fields are provided
      if (addressData.firstName !== undefined || addressData.lastName !== undefined ||
        addressData.email !== undefined || addressData.phone !== undefined ||
        addressData.street !== undefined || addressData.city !== undefined ||
        addressData.state !== undefined || addressData.zipCode !== undefined ||
        addressData.country !== undefined) {
        // Add structured fields
        if (addressData.firstName !== undefined) updateData.firstName = addressData.firstName;
        if (addressData.lastName !== undefined) updateData.lastName = addressData.lastName;
        if (addressData.email !== undefined) updateData.email = addressData.email;
        if (addressData.phone !== undefined) updateData.phone = addressData.phone;
        if (addressData.street !== undefined) updateData.street = addressData.street;
        if (addressData.city !== undefined) updateData.city = addressData.city;
        if (addressData.state !== undefined) updateData.state = addressData.state;
        if (addressData.zipCode !== undefined) updateData.zipCode = addressData.zipCode;
        if (addressData.country !== undefined) updateData.country = addressData.country;
      }

      // Check if legacy address field is provided
      if (addressData.address !== undefined) {
        updateData.address = addressData.address;
      }

      // Add other common fields
      if (addressData.is_default !== undefined) updateData.is_default = addressData.is_default;

      const response = await api.put(`/addresses/${addressId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  },

  // Delete an address
  deleteAddress: async (addressId) => {
    try {
      const response = await api.delete(`/addresses/${addressId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  },

  // Set an address as default
  setDefaultAddress: async (addressId) => {
    try {
      const response = await api.patch(`/addresses/${addressId}/default`);
      return response.data;
    } catch (error) {
      console.error('Error setting default address:', error);
      throw error;
    }
  }
};

export default addressService;
