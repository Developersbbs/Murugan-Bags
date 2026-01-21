import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import toast from 'react-hot-toast';

const uploadService = {
    /**
     * Upload a file to the server
     * @param {File} file - The file to upload
     * @param {string} folder - Optional folder name (default: 'uploads')
     * @returns {Promise<string>} - The public URL of the uploaded file
     */
    uploadFile: async (file, folder = 'reviews') => {
        try {
            if (!file) {
                throw new Error('No file provided');
            }

            // Validate file type (images only)
            if (!file.type.startsWith('image/')) {
                throw new Error('Only image files are allowed');
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('File size should be less than 5MB');
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', folder);

            const token = localStorage.getItem('authToken') || localStorage.getItem('jwt_token');

            const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            if (response.data.success) {
                return response.data.url;
            } else {
                throw new Error(response.data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload service error:', error);
            const message = error.response?.data?.error || error.message || 'Failed to upload image';
            toast.error(message);
            throw error;
        }
    }
};

export default uploadService;
