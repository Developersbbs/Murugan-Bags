# Troubleshooting Guide

## Fixed: `process is not defined` Error

**Problem**: Getting `ReferenceError: process is not defined` in browser console.

**Solution**: Updated all service files to use a centralized API configuration that handles environment variables properly for both Vite and Create React App.

### What was changed:
1. Created `src/config/api.js` with robust environment variable handling
2. Updated `cartService.js` and `wishlistService.js` to use centralized config
3. Updated `cookieUtils.js` to use centralized environment detection

### Environment Setup:
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update the API URL in `.env.local`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

3. Restart your development server after changing environment variables.

## Other Common Issues

### 1. CORS Errors
**Problem**: API calls blocked by CORS policy.

**Solution**: 
- Ensure backend server is running on port 5000
- Check CORS configuration in `backend/server.js`
- Verify frontend is running on an allowed origin (3000, 5173, etc.)

### 2. Authentication Token Issues
**Problem**: API calls return 401 Unauthorized.

**Solution**:
- Check if user is properly logged in
- Verify token is stored in localStorage or sessionStorage
- Check token format in API service interceptors

### 3. Cookie Storage Not Working
**Problem**: Cart/wishlist data not persisting for guest users.

**Solution**:
- Check if cookies are enabled in browser
- Verify cookie domain/path settings
- Check browser console for cookie-related errors

### 4. Migration Not Happening
**Problem**: Data not transferring from cookies to MongoDB on login.

**Solution**:
- Check browser console for migration errors
- Verify backend sync endpoints are working
- Ensure authentication state change is detected

### 5. Context Not Available
**Problem**: `useCart` or `useWishlist` hooks throwing errors.

**Solution**:
- Ensure components are wrapped with `CartProvider` and `WishlistProvider`
- Check that providers are imported correctly in `App.jsx`

## Testing Steps

### 1. Test Environment Variables
```javascript
// Add this to any component to test API URL
console.log('API Base URL:', import.meta.env?.VITE_API_URL || 'fallback');
```

### 2. Test Cookie Storage
1. Open browser DevTools → Application → Cookies
2. Add items to cart as guest user
3. Look for `sbbs_cart_guest` and `sbbs_wishlist_guest` cookies

### 3. Test Migration
1. Add items as guest user
2. Log in
3. Watch for success notifications
4. Verify cookies are cleared after login

### 4. Test API Endpoints
Use browser DevTools → Network tab to monitor API calls:
- Cart operations should hit `/api/cart/*` endpoints
- Wishlist operations should hit `/api/wishlist/*` endpoints

## Debug Mode

Add this to your component for debugging:
```javascript
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

function DebugComponent() {
  const cart = useCart();
  const wishlist = useWishlist();
  
  console.log('Cart state:', cart);
  console.log('Wishlist state:', wishlist);
  
  return <div>Check console for debug info</div>;
}
```

## Getting Help

If issues persist:
1. Check browser console for detailed error messages
2. Verify all files were created correctly
3. Ensure backend server is running and accessible
4. Test with the provided test page at `/test-cart-wishlist`
