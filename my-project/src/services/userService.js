import axios from 'axios';
import { getAuthToken } from './authTokenService';

export const updateUserProfile = async (userId, profileData) => {
  const token = getAuthToken();
  try {
    const response = await axios.put(
      `/api/auth/profile/${userId}`,
      profileData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update profile');
  }
};
