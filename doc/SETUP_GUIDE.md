# Cart & Wishlist Setup Guide

## Quick Setup Instructions

### 1. Install Dependencies
The implementation uses existing dependencies. No additional packages needed.

### 2. Backend Setup
The backend routes are already registered in `server.js`. Make sure your MongoDB connection is working.

### 3. Frontend Setup
The context providers are already integrated into `App.jsx`. No additional setup required.

### 4. Test the Implementation

#### Option A: Use the Test Page
1. Start your backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start your frontend server:
   ```bash
   cd frontend_react/my-project
   npm start
   ```

3. Navigate to: `http://localhost:3000/test-cart-wishlist`

#### Option B: Manual Testing
1. **As Guest User**:
   - Visit any product page
   - Add items to cart/wishlist
   - Check browser cookies in DevTools → Application → Cookies
   - Look for `sbbs_cart_guest` and `sbbs_wishlist_guest`

2. **Test Migration**:
   - Add items as guest
   - Log in to your account
   - Watch for "Cart synced successfully" and "Wishlist synced successfully" notifications
   - Verify cookies are cleared after login

3. **Cross-tab Testing**:
   - Open multiple browser tabs
   - Add items in one tab
   - Verify updates appear in other tabs

## Integration with Existing Components

### Add Cart/Wishlist Buttons to Product Cards
```jsx
import AddToCartButton from '../components/common/AddToCartButton';
import WishlistButton from '../components/common/WishlistButton';

// In your product component:
<div className="product-actions">
  <AddToCartButton product={product} />
  <WishlistButton product={product} showText />
</div>
```

### Add Cart/Wishlist Indicator to Navigation
```jsx
import CartWishlistIndicator from '../components/common/CartWishlistIndicator';

// In your header/navigation component:
<CartWishlistIndicator className="ml-4" />
```

### Use Context in Components
```jsx
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

function MyComponent() {
  const { items, addToCart, itemCount } = useCart();
  const { items: wishlistItems, addToWishlist } = useWishlist();
  
  // Your component logic
}
```

## Environment Variables

Add to your `.env` file:
```env
# Frontend (.env in frontend_react/my-project/)
REACT_APP_API_URL=http://localhost:5000/api

# Backend (.env in backend/)
NODE_ENV=development  # or production
```

## File Structure Created

```
frontend_react/my-project/src/
├── context/
│   ├── CartContext.jsx
│   └── WishlistContext.jsx
├── utils/
│   ├── cookieUtils.js
│   ├── enhancedCartUtils.js
│   └── enhancedWishlistUtils.js
├── services/
│   ├── cartService.js
│   └── wishlistService.js
├── components/common/
│   ├── AddToCartButton.jsx
│   ├── WishlistButton.jsx
│   └── CartWishlistIndicator.jsx
└── pages/
    └── TestCartWishlistPage.jsx

backend/
├── models/
│   └── Wishlist.js  (Cart.js already existed)
└── routes/
    └── wishlist.js  (cart.js was enhanced)
```

## Key Features Implemented

✅ **Cookie Storage**: Guest users' data stored in browser cookies  
✅ **MongoDB Integration**: Authenticated users' data in database  
✅ **Automatic Migration**: Seamless data transfer on login  
✅ **Context API**: Global state management  
✅ **Reusable Components**: Ready-to-use UI components  
✅ **Error Handling**: Comprehensive error management  
✅ **Loading States**: User feedback during operations  
✅ **Cross-tab Sync**: Real-time updates across browser tabs  

## Troubleshooting

### Common Issues

1. **Cookies not working**:
   - Check if cookies are enabled in browser
   - Verify domain/path settings in `cookieUtils.js`

2. **Migration not happening**:
   - Check browser console for errors
   - Verify backend API endpoints are accessible
   - Ensure authentication token is being sent

3. **Cross-tab sync not working**:
   - Verify `storage` event listeners are set up
   - Check if localStorage is available

4. **API calls failing**:
   - Verify backend server is running
   - Check CORS configuration
   - Ensure API endpoints match frontend service calls

### Debug Mode

Add this to your component to debug context state:
```jsx
const { items, isUsingCookies } = useCart();
console.log('Cart items:', items);
console.log('Using cookies:', isUsingCookies);
```

## Performance Notes

- Cookie data is automatically cleaned up on login
- Context updates are optimized to prevent unnecessary re-renders
- API calls are debounced for frequent operations
- Loading states prevent multiple simultaneous operations

## Security Notes

- Cookies are not httpOnly (required for JavaScript access)
- No sensitive data stored in cookies
- Automatic cleanup prevents data leakage
- CORS properly configured for API security

## Next Steps

1. **Test thoroughly** with the test page
2. **Integrate components** into your existing product pages
3. **Customize styling** to match your design system
4. **Add analytics** tracking for cart/wishlist events
5. **Implement advanced features** like cart abandonment emails

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify network requests in DevTools
3. Test with the provided test page
4. Review the implementation documentation in `CART_WISHLIST_IMPLEMENTATION.md`
