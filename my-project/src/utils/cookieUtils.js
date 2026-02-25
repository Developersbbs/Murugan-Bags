// Cookie utility functions for cart and wishlist storage
// Used when user is not logged in

import { isProduction } from '../config/api';

const COOKIE_OPTIONS = {
  expires: 30, // 30 days
  path: '/',
  secure: isProduction(),
  sameSite: 'lax'
};

// Set cookie
export const setCookie = (name, value, options = {}) => {
  if (typeof window === 'undefined') return;

  const cookieOptions = { ...COOKIE_OPTIONS, ...options };
  let cookieString = `${name}=${encodeURIComponent(JSON.stringify(value))}`;

  if (cookieOptions.expires) {
    const date = new Date();
    date.setTime(date.getTime() + (cookieOptions.expires * 24 * 60 * 60 * 1000));
    cookieString += `; expires=${date.toUTCString()}`;
  }

  if (cookieOptions.path) {
    cookieString += `; path=${cookieOptions.path}`;
  }

  if (cookieOptions.secure) {
    cookieString += `; secure`;
  }

  if (cookieOptions.sameSite) {
    cookieString += `; samesite=${cookieOptions.sameSite}`;
  }

  document.cookie = cookieString;
};

// Get cookie
export const getCookie = (name) => {
  if (typeof window === 'undefined') return null;

  const nameEQ = name + "=";
  const cookies = document.cookie.split(';');

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      try {
        return JSON.parse(decodeURIComponent(cookie.substring(nameEQ.length, cookie.length)));
      } catch (e) {
        console.warn('Error parsing cookie:', e);
        return null;
      }
    }
  }
  return null;
};

// Delete cookie
export const deleteCookie = (name, options = {}) => {
  if (typeof window === 'undefined') return;

  const cookieOptions = { ...COOKIE_OPTIONS, ...options };
  let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC`;

  if (cookieOptions.path) {
    cookieString += `; path=${cookieOptions.path}`;
  }

  document.cookie = cookieString;
};

// Check if cookies are enabled
export const areCookiesEnabled = () => {
  if (typeof window === 'undefined') return false;

  try {
    const testCookie = 'test_cookie';
    setCookie(testCookie, 'test', { expires: 1 });
    const result = getCookie(testCookie) === 'test';
    deleteCookie(testCookie);
    return result;
  } catch (e) {
    return false;
  }
};

// Cart specific cookie functions
const CART_COOKIE_NAME = 'sbbs_cart_guest';

export const getCartFromCookie = () => {
  const cart = getCookie(CART_COOKIE_NAME);
  return cart || [];
};

export const saveCartToCookie = (cartItems) => {
  setCookie(CART_COOKIE_NAME, cartItems);
};

export const clearCartCookie = () => {
  deleteCookie(CART_COOKIE_NAME);
};

// Wishlist specific cookie functions
const WISHLIST_COOKIE_NAME = 'sbbs_wishlist_guest';

export const getWishlistFromCookie = () => {
  const wishlist = getCookie(WISHLIST_COOKIE_NAME);
  return wishlist || [];
};

export const saveWishlistToCookie = (wishlistItems) => {
  setCookie(WISHLIST_COOKIE_NAME, wishlistItems);
};

export const clearWishlistCookie = () => {
  deleteCookie(WISHLIST_COOKIE_NAME);
};

// Migration helper functions
export const migrateCartFromCookie = () => {
  const cartData = getCartFromCookie();
  clearCartCookie();
  return cartData;
};

export const migrateWishlistFromCookie = () => {
  const wishlistData = getWishlistFromCookie();
  clearWishlistCookie();
  return wishlistData;
};

// Utility to check if user should use cookies (not logged in)
export const shouldUseCookieStorage = (user) => {
  return !user || !user.uid;
};
