import axios from 'axios';
import toast from 'react-hot-toast';

// Get API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance for payments
const paymentApi = axios.create({
  baseURL: `${API_BASE_URL}/payments`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to requests if available
paymentApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

class PaymentService {

  // Get Razorpay configuration
  async getRazorpayConfig() {
    try {
      const response = await paymentApi.get('/config');
      return response.data;
    } catch (error) {
      console.error('Failed to get Razorpay config:', error);
      throw new Error('Failed to load payment configuration');
    }
  }

  // Create Razorpay order
  async createRazorpayOrder(orderData) {
    try {
      const response = await paymentApi.post('/create-order', orderData);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create payment order');
      }

      return {
        order: response.data.order,
        razorpayOrder: response.data.razorpay_order
      };
    } catch (error) {
      console.error('Failed to create Razorpay order:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to create payment order');
    }
  }

  // Verify Razorpay payment
  async verifyPayment(paymentData) {
    try {
      const response = await paymentApi.post('/verify-payment', paymentData);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Payment verification failed');
      }

      return response.data;
    } catch (error) {
      console.error('Payment verification failed:', error);
      throw new Error(error.response?.data?.error || error.message || 'Payment verification failed');
    }
  }

  // Handle payment failure
  async handlePaymentFailure(failureData) {
    try {
      const response = await paymentApi.post('/payment-failed', failureData);
      return response.data;
    } catch (error) {
      console.error('Failed to handle payment failure:', error);
      // Don't throw error for failure handling, just log it
      return null;
    }
  }

  // Initialize Razorpay payment
  async initializeRazorpayPayment(orderData, onSuccess, onFailure) {
    try {
      // Step 1: Check if Razorpay is configured
      toast.loading('Checking payment configuration...', { id: 'razorpay-payment' });

      const config = await this.getRazorpayConfig();

      if (!config.configured) {
        toast.error('Payment gateway not configured. Please try Cash on Delivery.', { id: 'razorpay-payment' });
        if (onFailure) {
          onFailure(new Error('Payment gateway not configured'));
        }
        return;
      }

      toast.loading('Creating payment order...', { id: 'razorpay-payment' });

      const { order, razorpayOrder } = await this.createRazorpayOrder(orderData);

      toast.success('Payment order created!', { id: 'razorpay-payment' });

      // Step 2: Initialize Razorpay checkout
      const options = {
        key: config.key_id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'SBBS E-commerce',
        description: `Order #${order.invoice_no}`,
        order_id: razorpayOrder.id,
        handler: async (response) => {
          try {
            toast.loading('Verifying payment...', { id: 'razorpay-payment' });

            // Verify payment with backend
            const verificationData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: order.invoice_no
            };

            const verificationResult = await this.verifyPayment(verificationData);

            toast.success('Payment successful! Order confirmed.', { id: 'razorpay-payment' });

            if (onSuccess) {
              onSuccess(verificationResult);
            }
          } catch (error) {
            toast.error('Payment verification failed. Please contact support.', { id: 'razorpay-payment' });
            console.error('Payment verification error:', error);
          }
        },
        prefill: {
          name: orderData.shipping_address.name,
          email: orderData.shipping_address.email,
          contact: orderData.shipping_address.phone
        },
        notes: {
          address: `${orderData.shipping_address.street}, ${orderData.shipping_address.city}, ${orderData.shipping_address.state} ${orderData.shipping_address.zipCode}`
        },
        theme: {
          color: '#2563eb' // Blue theme
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled by user', { id: 'razorpay-payment' });
          }
        }
      };

      // Check if Razorpay is loaded
      if (typeof window.Razorpay === 'undefined') {
        // Load Razorpay script dynamically
        await this.loadRazorpayScript();
      }

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();

    } catch (error) {
      toast.error(error.message || 'Failed to initialize payment', { id: 'razorpay-payment' });
      console.error('Razorpay initialization error:', error);

      if (onFailure) {
        onFailure(error);
      }
    }
  }

  // Load Razorpay script dynamically
  loadRazorpayScript() {
    return new Promise((resolve, reject) => {
      if (typeof window.Razorpay !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  // Format amount for Razorpay (convert to paise)
  formatAmountForRazorpay(amount) {
    return Math.round(amount * 100);
  }

  // Format amount from Razorpay (convert from paise)
  formatAmountFromRazorpay(amountInPaise) {
    return amountInPaise / 100;
  }
}

const paymentService = new PaymentService();
export default paymentService;
