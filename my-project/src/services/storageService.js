import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import axios from 'axios'; // Import axios
import { getAuthToken } from './authTokenService'; // Import getAuthToken function

const sanitizeFileName = (name = '') => name.replace(/[^a-zA-Z0-9.\-_]/g, '_');

export const uploadProfilePhoto = async (userId, file) => {
  if (!userId) throw new Error('User ID is required');
  if (!file) throw new Error('File is required');

  try {
    const fileExtension = file.name?.split('.').pop() || 'jpg';
    const baseName = file.name?.slice(0, file.name.lastIndexOf('.')) || 'profile';
    const sanitizedBaseName = sanitizeFileName(baseName);
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fileName = `${sanitizedBaseName}-${uniqueSuffix}.${fileExtension}`;
    const storagePath = `profilePhotos/${userId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const metadata = {
      contentType: file.type || 'image/jpeg',
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString()
      }
    };

    // Upload the file
    console.log('Starting file upload...', { storagePath, size: file.size });
    await uploadBytes(storageRef, file, metadata);
    console.log('File uploaded, getting download URL...');

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log('Successfully got download URL');

    // Note: Profile image update in the database is handled by the caller (ProfilePage.jsx)
    // after getting the downloadURL to ensure all data is synced at once.

    return { downloadURL, storagePath };
  } catch (error) {
    console.error('Upload error:', {
      error: error.message,
      code: error.code,
      details: error.details
    });
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};