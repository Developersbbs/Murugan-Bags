import axios from 'axios';

import { API_BASE_URL as API_URL } from '../config/api';

const ratingService = {
    // Submit a review
    submitReview: async (reviewData) => {
        const response = await axios.post(`${API_URL}/ratings`, reviewData, {
            headers: {
                'Content-Type': 'application/json',
                // Auth header is handled by interceptor usually, but if not we might need to add it
                // Assuming global axios interceptor handles token
                'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('jwt_token')}`
            }
        });
        return response.data;
    },

    // Get reviews for a product
    getProductReviews: async (productId, page = 1) => {
        const response = await axios.get(`${API_URL}/ratings/product/${productId}?page=${page}`);
        return response.data;
    },

    // Get user's own reviews
    getUserReviews: async () => {
        const response = await axios.get(`${API_URL}/ratings/my-reviews`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('jwt_token')}`
            }
        });
        return response.data;
    },

    deleteReview: async (reviewId) => {
        const response = await axios.delete(`${API_URL}/ratings/${reviewId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('jwt_token')}`
            }
        });
        return response.data;
    }
};

export default ratingService;
