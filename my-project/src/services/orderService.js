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

// API endpoints
const API_ENDPOINTS = {
  ORDERS: '/orders',
  ORDER_BY_ID: (id) => `/orders/${id}`,
  ORDERS_BY_CUSTOMER: (firebaseUid) => `/orders/customer/firebase/${firebaseUid}`, // Updated to use Firebase UID
  ORDER_TRACKING: (trackingNumber) => `/orders/track/${trackingNumber}`,
  ORDER_INVOICE: (id) => `/orders/${id}/invoice`,
  ORDER_CANCEL: (id) => `/orders/${id}/cancel`,
  ORDER_RETURN: (id) => `/orders/${id}/return`,
};

const orderService = {
  // Get orders by customer Firebase UID
  getMyOrders: async (firebaseUid) => {
    try {
      if (!firebaseUid) {
        throw new Error('Firebase UID is required');
      }

      const response = await api.get(API_ENDPOINTS.ORDERS_BY_CUSTOMER(firebaseUid));
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },

  // Place order (Cash on Delivery)
  placeOrder: async (orderData) => {
    try {
      const response = await api.post('/orders/place-order', orderData);
      return response.data;
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  },

  // Get specific order by ID
  getOrderById: async (orderId) => {
    try {
      const response = await api.get(API_ENDPOINTS.ORDER_BY_ID(orderId));
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  },

  // Track order by tracking number
  trackOrder: async (trackingNumber) => {
    try {
      const response = await api.get(API_ENDPOINTS.ORDER_TRACKING(trackingNumber));
      return response.data;
    } catch (error) {
      console.error('Error tracking order:', error);
      throw error;
    }
  },

  // Download order invoice
  downloadInvoice: async (orderId) => {
    try {
      const response = await api.get(API_ENDPOINTS.ORDER_INVOICE(orderId), {
        responseType: 'blob',
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${orderId}.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error downloading invoice:', error);
      throw error;
    }
  },

  // Cancel order
  cancelOrder: async (orderId, reason = '') => {
    try {
      const response = await api.post(API_ENDPOINTS.ORDER_CANCEL(orderId), {
        reason,
      });
      return response.data;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  },

  // Request order return
  requestReturn: async (orderId, items, reason = '') => {
    try {
      const response = await api.post(API_ENDPOINTS.ORDER_RETURN(orderId), {
        items,
        reason,
      });
      return response.data;
    } catch (error) {
      console.error('Error requesting return:', error);
      throw error;
    }
  },

  // Create new order (for checkout)
  createOrder: async (orderData) => {
    try {
      const response = await api.post(API_ENDPOINTS.ORDERS, orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  // Update order status (admin function)
  updateOrderStatus: async (orderId, status, trackingNumber = null) => {
    try {
      const response = await api.patch(API_ENDPOINTS.ORDER_BY_ID(orderId) + '/status', {
        status,
        trackingNumber,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },
};

export default orderService;
