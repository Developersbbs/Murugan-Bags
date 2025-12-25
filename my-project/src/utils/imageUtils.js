/**
 * Utility to resolve full image URLs from relative paths
 * @param {string} imagePath - The path or URL of the image
 * @returns {string} - The resolved full image URL
 */
export const getFullImageUrl = (imagePath) => {
    if (!imagePath) return '/images/products/placeholder-product.svg';

    // If it's already a full URL or blob, return as is
    if (
        imagePath.startsWith('http://') ||
        imagePath.startsWith('https://') ||
        imagePath.startsWith('data:') ||
        imagePath.startsWith('blob:')
    ) {
        return imagePath;
    }

    // If it's a local asset path
    if (imagePath.startsWith('/images/') || imagePath.startsWith('/assets/')) {
        return imagePath;
    }

    // Handle backend image paths (e.g., /uploads/products/image.jpg)
    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

    // Ensure we don't double slash if the path already starts with /
    const sanitizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

    return `${API_BASE}${sanitizedPath}`;
};
