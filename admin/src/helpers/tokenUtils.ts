/**
 * JWT Token Utilities
 * Provides functions for validating and managing JWT tokens
 */

interface DecodedToken {
    id: string;
    email?: string;
    role?: string;
    type?: string;
    iat?: number;
    exp?: number;
}

/**
 * Decode a JWT token without verification
 * @param token - JWT token string
 * @returns Decoded token payload or null if invalid
 */
export function decodeToken(token: string): DecodedToken | null {
    try {
        if (!token || typeof token !== 'string') {
            return null;
        }

        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        // Decode the payload (second part)
        const payload = parts[1];
        const decoded = JSON.parse(atob(payload));

        return decoded as DecodedToken;
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
}

/**
 * Check if a token is expired
 * @param token - JWT token string or decoded token object
 * @returns true if token is expired, false otherwise
 */
export function isTokenExpired(token: string | DecodedToken): boolean {
    try {
        const decoded = typeof token === 'string' ? decodeToken(token) : token;

        if (!decoded || !decoded.exp) {
            return true; // Consider invalid tokens as expired
        }

        // exp is in seconds, Date.now() is in milliseconds
        const currentTime = Math.floor(Date.now() / 1000);

        // Add a 30-second buffer to account for clock skew
        return decoded.exp < (currentTime + 30);
    } catch (error) {
        console.error('Error checking token expiry:', error);
        return true;
    }
}

/**
 * Get token expiration timestamp
 * @param token - JWT token string
 * @returns Expiration timestamp in milliseconds, or null if invalid
 */
export function getTokenExpiry(token: string): number | null {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
        return null;
    }

    // Convert from seconds to milliseconds
    return decoded.exp * 1000;
}

/**
 * Validate token format and expiry
 * @param token - JWT token string
 * @returns true if token is valid and not expired
 */
export function validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
        return false;
    }

    // Check format (should have 3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
        return false;
    }

    // Check if token is expired
    if (isTokenExpired(token)) {
        return false;
    }

    return true;
}

/**
 * Get time until token expires
 * @param token - JWT token string
 * @returns Time until expiry in milliseconds, or 0 if expired/invalid
 */
export function getTimeUntilExpiry(token: string): number {
    const expiry = getTokenExpiry(token);
    if (!expiry) {
        return 0;
    }

    const timeUntilExpiry = expiry - Date.now();
    return Math.max(0, timeUntilExpiry);
}
