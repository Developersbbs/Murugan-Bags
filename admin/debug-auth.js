/**
 * Debug utility to check authentication state
 * Run this in browser console to diagnose auth issues
 */

// Check localStorage
console.log('=== AUTH DEBUG ===');
console.log('localStorage authToken:', localStorage.getItem('authToken'));

// Check cookies
const cookies = document.cookie.split('; ');
const authCookie = cookies.find(row => row.startsWith('authToken='));
console.log('Cookie authToken:', authCookie ? authCookie.split('=')[1] : 'NOT FOUND');

// Check all cookies
console.log('All cookies:', document.cookie);

// Try to decode token
const token = localStorage.getItem('authToken');
if (token) {
    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            console.log('Token payload:', payload);
            console.log('Token expires:', new Date(payload.exp * 1000));
            console.log('Token expired?:', payload.exp < (Date.now() / 1000));
        }
    } catch (e) {
        console.error('Error decoding token:', e);
    }
} else {
    console.log('No token in localStorage');
}

console.log('=== END DEBUG ===');
