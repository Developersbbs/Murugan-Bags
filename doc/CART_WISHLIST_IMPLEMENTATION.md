# Cart and Wishlist Implementation with Cookie Storage

This implementation provides a complete cart and wishlist functionality that stores data in browser cookies for non-logged-in users and migrates to MongoDB when users log in.

## Features

- ✅ **Cookie Storage for Guests**: Cart and wishlist data stored in browser cookies for non-authenticated users
- ✅ **MongoDB Storage for Users**: Authenticated users have their data stored in MongoDB
- ✅ **Automatic Migration**: When users log in, cookie data is automatically migrated to MongoDB
- ✅ **Cross-tab Synchronization**: Changes sync across browser tabs
- ✅ **Context API Integration**: React Context provides global state management
- ✅ **Backend API**: RESTful endpoints for cart and wishlist operations
- ✅ **Error Handling**: Comprehensive error handling with user feedback
- ✅ **Loading States**: UI loading indicators during operations

## Architecture

### Frontend Structure
```
src/
├── context/
│   ├── CartContext.jsx          # Cart state management
│   └── WishlistContext.jsx      # Wishlist state management
├── utils/
│   ├── cookieUtils.js           # Cookie operations
│   ├── enhancedCartUtils.js     # Cart utilities with cookie support
│   └── enhancedWishlistUtils.js # Wishlist utilities with cookie support
├── services/
│   ├── cartService.js           # Cart API calls
│   └── wishlistService.js       # Wishlist API calls
└── components/
    └── common/
        ├── AddToCartButton.jsx  # Reusable cart button
        └── WishlistButton.jsx   # Reusable wishlist button
```

### Backend Structure
```
backend/
├── models/
│   ├── Cart.js                  # Cart MongoDB schema
│   └── Wishlist.js              # Wishlist MongoDB schema
└── routes/
    ├── cart.js                  # Cart API endpoints
    └── wishlist.js              # Wishlist API endpoints
```

## How It Works

### For Non-Logged-In Users (Guests)
1. **Storage**: Cart and wishlist data stored in browser cookies
2. **Cookie Names**: 
   - Cart: `sbbs_cart_guest`
   - Wishlist: `sbbs_wishlist_guest`
3. **Expiration**: Cookies expire after 30 days
4. **Security**: Cookies are httpOnly in production

### For Logged-In Users
1. **Storage**: Data stored in MongoDB collections
2. **Migration**: On login, cookie data is automatically migrated to MongoDB
3. **Cleanup**: Cookies are cleared after successful migration
4. **Sync**: All operations sync with backend API

### Migration Process
1. User logs in
2. Context detects authentication state change
3. Cookie data is retrieved and validated
4. Data is sent to backend `/sync` endpoints
5. Backend merges cookie data with existing user data
6. Cookies are cleared from browser
7. User sees success notification

## API Endpoints

### Cart Endpoints
- `GET /api/cart` - Get user's cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update/:itemId` - Update item quantity
- `DELETE /api/cart/remove/:itemId` - Remove item
- `DELETE /api/cart/clear` - Clear entire cart
- `GET /api/cart/count` - Get cart item count
- `POST /api/cart/sync` - Sync cart from cookies (migration)

### Wishlist Endpoints
- `GET /api/wishlist` - Get user's wishlist
- `POST /api/wishlist/add` - Add item to wishlist
- `DELETE /api/wishlist/remove/:itemId` - Remove item by item ID
- `DELETE /api/wishlist/remove-product/:productId` - Remove by product ID
- `DELETE /api/wishlist/clear` - Clear entire wishlist
- `GET /api/wishlist/count` - Get wishlist item count
- `GET /api/wishlist/check/:productId` - Check if product in wishlist
- `POST /api/wishlist/sync` - Sync wishlist from cookies (migration)

## Usage Examples

### Using Cart Context
```jsx
import { useCart } from '../context/CartContext';

function ProductCard({ product }) {
  const { addToCart, isInCart, getItemQuantity } = useCart();
  
  const handleAddToCart = () => {
    addToCart(product, null, 1);
  };
  
  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={handleAddToCart}>
        {isInCart(product._id) ? `In Cart (${getItemQuantity(product._id)})` : 'Add to Cart'}
      </button>
    </div>
  );
}
```

### Using Wishlist Context
```jsx
import { useWishlist } from '../context/WishlistContext';

function ProductCard({ product }) {
  const { toggleWishlistItem, isInWishlist } = useWishlist();
  
  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={() => toggleWishlistItem(product)}>
        {isInWishlist(product._id) ? '❤️ In Wishlist' : '🤍 Add to Wishlist'}
      </button>
    </div>
  );
}
```

### Using Reusable Components
```jsx
import AddToCartButton from '../components/common/AddToCartButton';
import WishlistButton from '../components/common/WishlistButton';

function ProductCard({ product }) {
  return (
    <div>
      <h3>{product.name}</h3>
      <div className="flex gap-2">
        <AddToCartButton product={product} />
        <WishlistButton product={product} showText />
      </div>
    </div>
  );
}
```

## Configuration

### Environment Variables
```env
REACT_APP_API_URL=http://localhost:5000/api
NODE_ENV=production  # For secure cookies in production
```

### Cookie Configuration
Cookies are configured with:
- **Expires**: 30 days
- **Path**: `/` (site-wide)
- **Secure**: Only in production
- **SameSite**: `lax`

## Data Flow

### Guest User Flow
```
User Action → Context → Enhanced Utils → Cookie Utils → Browser Cookies
```

### Authenticated User Flow
```
User Action → Context → Enhanced Utils → Local Storage → API Service → MongoDB
```

### Migration Flow
```
Login Event → Context → Migration Utils → API Sync → MongoDB → Cookie Cleanup
```

## Error Handling

- **Network Errors**: Graceful fallback to local storage
- **API Errors**: User-friendly error messages via toast notifications
- **Cookie Errors**: Automatic fallback to in-memory storage
- **Migration Errors**: Partial migration with user notification

## Testing

### Manual Testing Steps
1. **Guest User Testing**:
   - Add items to cart/wishlist without logging in
   - Verify data persists across browser sessions
   - Check cookie storage in browser dev tools

2. **Migration Testing**:
   - Add items as guest user
   - Log in and verify migration success notification
   - Check that cookies are cleared
   - Verify data appears in user account

3. **Cross-tab Testing**:
   - Open multiple tabs
   - Add items in one tab
   - Verify updates appear in other tabs

## Security Considerations

- Cookies are not httpOnly (needed for JavaScript access)
- Data is JSON-encoded and URI-encoded
- No sensitive information stored in cookies
- Automatic cleanup on login
- CORS properly configured for API calls

## Performance

- Minimal cookie size (only essential data)
- Efficient context updates (only when needed)
- Debounced API calls for frequent operations
- Lazy loading of wishlist/cart data

## Browser Compatibility

- Modern browsers with cookie support
- Graceful degradation for cookie-disabled browsers
- Cross-browser cookie handling

## Future Enhancements

- [ ] Offline support with service workers
- [ ] Cart abandonment tracking
- [ ] Wishlist sharing functionality
- [ ] Advanced analytics integration
- [ ] Performance optimizations with React.memo
