/**
 * Cookie Management Utilities
 * Centralized functions for managing authentication cookies
 */

const AUTH_COOKIE_NAME = 'authToken';
const COOKIE_MAX_AGE = 604800; // 7 days in seconds

/**
 * Set authentication cookie with proper settings
 * @param token - JWT token to store
 */
export function setAuthCookie(token: string): void {
    if (typeof window === 'undefined') {
        return; // Only run in browser
    }

    // Use SameSite=Lax for better compatibility while maintaining security
    // Lax allows cookies on top-level navigation (like clicking a link)
    // but not on cross-site requests

    // Only use Secure flag on HTTPS (production)
    // On localhost (HTTP), Secure flag prevents cookie from being set
    const isSecure = window.location.protocol === 'https:';
    const secureFlag = isSecure ? '; Secure' : '';

    document.cookie = `${AUTH_COOKIE_NAME}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secureFlag}`;
}

/**
 * Get authentication cookie value
 * @returns Cookie value or null if not found
 */
export function getAuthCookie(): string | null {
    if (typeof window === 'undefined') {
        return null; // Only run in browser
    }

    const cookies = document.cookie.split('; ');
    const authCookie = cookies.find(row => row.startsWith(`${AUTH_COOKIE_NAME}=`));

    if (!authCookie) {
        return null;
    }

    return authCookie.split('=')[1] || null;
}

/**
 * Remove authentication cookie
 */
export function removeAuthCookie(): void {
    if (typeof window === 'undefined') {
        return; // Only run in browser
    }

    // Set expiry to past date to delete cookie
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

/**
 * Check if authentication cookie exists
 * @returns true if cookie exists
 */
export function hasAuthCookie(): boolean {
    return getAuthCookie() !== null;
}
