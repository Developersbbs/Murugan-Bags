import {
  getWishlistFromCookie,
  saveWishlistToCookie,
  clearWishlistCookie,
  shouldUseCookieStorage
} from './cookieUtils';

const WISHLIST_STORAGE_KEY = 'sbbs_wishlist';

// Get current user from Redux store or context
const getCurrentUser = () => {
  // This will be set by the wishlist context
  return window.__CURRENT_USER__ || null;
};

// Get wishlist from appropriate storage (cookie for guests, localStorage for logged-in users)
export const getWishlist = () => {
  if (typeof window === 'undefined') return [];

  const user = getCurrentUser();

  if (shouldUseCookieStorage(user)) {
    // Guest user - use cookies
    return getWishlistFromCookie();
  } else {
    // Logged-in user - use localStorage
    const wishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
    return wishlist ? JSON.parse(wishlist) : [];
  }
};

// Save wishlist to appropriate storage
export const saveWishlist = (wishlist) => {
  if (typeof window === 'undefined') return;

  const user = getCurrentUser();

  if (shouldUseCookieStorage(user)) {
    // Guest user - save to cookies
    saveWishlistToCookie(wishlist);
  } else {
    // Logged-in user - save to localStorage
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
  }

  // Dispatch custom event to notify about wishlist update
  window.dispatchEvent(new Event('wishlistUpdated'));
};

// Add item to wishlist
export const addToWishlist = (product) => {
  const wishlist = getWishlist();

  // Check if item already exists
  const existingItemIndex = wishlist.findIndex(item => item._id === product._id);

  if (existingItemIndex === -1) {
    // Add new item to wishlist
    const wishlistItem = {
      _id: product._id,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      images: product.images || product.image_url,
      category: product.category,
      slug: product.slug,
      inWishlist: true,
      addedAt: new Date().toISOString()
    };

    wishlist.push(wishlistItem);
    saveWishlist(wishlist);
  }

  return wishlist;
};

// Remove item from wishlist
export const removeFromWishlist = (productId) => {
  const wishlist = getWishlist();
  const updatedWishlist = wishlist.filter(item => item._id !== productId);
  saveWishlist(updatedWishlist);
  return updatedWishlist;
};

// Check if item is in wishlist
export const isInWishlist = (productId) => {
  const wishlist = getWishlist();
  return wishlist.some(item => item._id === productId);
};

// Clear the wishlist
export const clearWishlist = () => {
  const user = getCurrentUser();

  if (shouldUseCookieStorage(user)) {
    clearWishlistCookie();
  } else {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(WISHLIST_STORAGE_KEY);
    }
  }

  // Dispatch update event
  window.dispatchEvent(new Event('wishlistUpdated'));
  return [];
};

// Get wishlist item count
export const getWishlistItemCount = () => {
  const wishlist = getWishlist();
  return wishlist.length;
};

// Toggle item in wishlist
export const toggleWishlistItem = (product) => {
  if (isInWishlist(product._id)) {
    return removeFromWishlist(product._id);
  } else {
    return addToWishlist(product);
  }
};

// Migrate wishlist data from cookies to localStorage (called on login)
export const migrateWishlistFromCookies = () => {
  const cookieWishlist = getWishlistFromCookie();
  if (cookieWishlist && cookieWishlist.length > 0) {
    // Get existing localStorage wishlist
    const localWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
    const existingWishlist = localWishlist ? JSON.parse(localWishlist) : [];

    // Merge wishlists (avoid duplicates)
    const mergedWishlist = [...existingWishlist];

    cookieWishlist.forEach(cookieItem => {
      const existingIndex = mergedWishlist.findIndex(item => item._id === cookieItem._id);

      if (existingIndex === -1) {
        // Add new item
        mergedWishlist.push(cookieItem);
      }
      // If item already exists, keep the existing one (no need to merge)
    });

    // Save merged wishlist to localStorage
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(mergedWishlist));

    // Clear cookie wishlist
    clearWishlistCookie();

    // Dispatch update event
    window.dispatchEvent(new Event('wishlistUpdated'));

    return mergedWishlist;
  }

  return [];
};
