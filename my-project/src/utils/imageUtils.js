/**
 * Utility to resolve full image URLs from relative paths
 * @param {string} imagePath - The path or URL of the image
 * @returns {string} - The resolved full image URL
 */
export const getFullImageUrl = (imagePath) => {
    if (!imagePath) return '/images/products/placeholder-product.svg';

    let path = imagePath;

    // Force HTTP for localhost to avoid SSL Protocol Errors in local development
    if (typeof path === 'string' && path.startsWith('https://localhost')) {
        path = path.replace('https://localhost', 'http://localhost');
    }

    // If it's already a full URL or blob, return as is
    if (
        path.startsWith('http://') ||
        path.startsWith('https://') ||
        path.startsWith('data:') ||
        path.startsWith('blob:')
    ) {
        return path;
    }

    // If it's a local asset path
    if (path.startsWith('/images/') || path.startsWith('/assets/')) {
        return path;
    }

    // Handle backend image paths (e.g., /uploads/products/image.jpg)
    let API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

    // Force HTTP for localhost to avoid SSL Protocol Errors
    if (typeof API_BASE === 'string' && API_BASE.startsWith('https://localhost')) {
        API_BASE = API_BASE.replace('https://localhost', 'http://localhost');
    }

    // Ensure we don't double slash if the path already starts with /
    const sanitizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${API_BASE}${sanitizedPath}`;
};
