# Firebase Setup for Cart & Wishlist MongoDB Integration

## Issue Fixed
The cart and wishlist data wasn't being stored in MongoDB because the backend authentication was expecting JWT tokens, but the frontend uses Firebase authentication.

## Solution Implemented
1. **Created Firebase Authentication Middleware**: New middleware that verifies Firebase ID tokens
2. **Updated API Services**: Frontend now sends Firebase ID tokens to backend
3. **Auto-create Customers**: Backend automatically creates customer records from Firebase users
4. **Real-time Sync**: Cart/wishlist operations sync with MongoDB for logged-in users

## Firebase Admin SDK Setup (Required)

### 1. Generate Service Account Key
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`ecommerce-53a0d`)
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file

### 2. Configure Backend Environment
1. Copy `backend/.env.example` to `backend/.env`
2. Fill in the Firebase credentials from the downloaded JSON:

```env
FIREBASE_PROJECT_ID=ecommerce-53a0d
FIREBASE_PRIVATE_KEY_ID=your_private_key_id_from_json
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_from_json\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ecommerce-53a0d.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id_from_json
```

### 3. Test the Setup
1. Start backend server: `cd backend && npm start`
2. Look for: `✅ Firebase Admin SDK initialized successfully`
3. If you see errors, check your environment variables

## How It Works Now

### For Guest Users
- Cart/wishlist stored in browser cookies
- Data persists for 30 days
- No MongoDB interaction

### For Logged-In Users
- **Immediate Sync**: Every add/remove operation syncs with MongoDB
- **Migration on Login**: Cookie data automatically migrated to MongoDB
- **Cross-device Sync**: Data available across all devices
- **Persistent Storage**: Data stored permanently in MongoDB

### Authentication Flow
1. User logs in with Firebase
2. Frontend gets Firebase ID token
3. API calls include `Authorization: Bearer <firebase_id_token>`
4. Backend verifies token with Firebase Admin SDK
5. Backend finds/creates customer record in MongoDB
6. Cart/wishlist operations use customer ID

## Testing

### 1. Test Guest User Flow
```bash
# Add items as guest (stored in cookies)
# Check browser DevTools → Application → Cookies
# Look for: sbbs_cart_guest, sbbs_wishlist_guest
```

### 2. Test Logged-In User Flow
```bash
# Login to your account
# Add items to cart/wishlist
# Check MongoDB collections: carts, wishlists
# Verify customer record created in customers collection
```

### 3. Test Migration
```bash
# 1. Add items as guest user
# 2. Login to account
# 3. Watch for "Cart synced successfully" notification
# 4. Verify cookies are cleared
# 5. Check MongoDB for migrated data
```

## MongoDB Collections

### Customers Collection
```javascript
{
  _id: ObjectId,
  firebaseUid: "firebase_user_id",
  email: "user@example.com",
  displayName: "User Name",
  phoneNumber: "+1234567890",
  photoURL: "https://...",
  emailVerified: true,
  providerId: "google.com",
  isActive: true,
  createdAt: Date,
  updatedAt: Date
}
```

### Carts Collection
```javascript
{
  _id: ObjectId,
  customer_id: ObjectId, // References customers._id
  items: [{
    product_id: ObjectId,
    variant_sku: String,
    quantity: Number,
    price: Number,
    discounted_price: Number,
    product_name: String,
    product_image: String,
    variant_name: String,
    variant_attributes: Object,
    added_at: Date
  }],
  total_items: Number,
  total_amount: Number,
  total_discounted_amount: Number,
  created_at: Date,
  updated_at: Date
}
```

### Wishlists Collection
```javascript
{
  _id: ObjectId,
  customer_id: ObjectId, // References customers._id
  items: [{
    product_id: ObjectId,
    product_name: String,
    product_image: String,
    price: Number,
    discounted_price: Number,
    added_at: Date
  }],
  total_items: Number,
  created_at: Date,
  updated_at: Date
}
```

## Troubleshooting

### Firebase Admin SDK Not Initialized
**Error**: `⚠️ Firebase Admin SDK not initialized - missing credentials`

**Solution**: 
1. Check `.env` file has all Firebase variables
2. Ensure private key is properly formatted with `\n` for line breaks
3. Restart backend server after updating `.env`

### Authentication Errors
**Error**: `Invalid or expired token`

**Solution**:
1. Check if user is logged in on frontend
2. Verify Firebase project ID matches
3. Check browser console for token errors

### Data Not Syncing
**Problem**: Items added but not appearing in MongoDB

**Solution**:
1. Check backend logs for errors
2. Verify user is authenticated (not guest)
3. Test API endpoints directly with Postman
4. Check MongoDB connection

## API Endpoints (Now Working)

All endpoints now properly authenticate Firebase users:

- `GET /api/cart` - Get user's cart from MongoDB
- `POST /api/cart/add` - Add item to MongoDB cart
- `POST /api/cart/sync` - Migrate cookie data to MongoDB
- `GET /api/wishlist` - Get user's wishlist from MongoDB
- `POST /api/wishlist/add` - Add item to MongoDB wishlist
- `POST /api/wishlist/sync` - Migrate cookie data to MongoDB

## Success Indicators

✅ **Backend**: `✅ Firebase Admin SDK initialized successfully`  
✅ **Frontend**: Firebase ID tokens sent with API calls  
✅ **Database**: Customer records auto-created  
✅ **Migration**: "Cart/Wishlist synced successfully" notifications  
✅ **Persistence**: Data survives browser refresh and cross-device  

The cart and wishlist functionality now fully integrates with MongoDB for authenticated users while maintaining cookie storage for guests.
