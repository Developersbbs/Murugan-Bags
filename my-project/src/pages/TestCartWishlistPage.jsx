import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useSelector } from 'react-redux';
import { API_BASE_URL } from '../config/api';
import AddToCartButton from '../components/common/AddToCartButton';
import WishlistButton from '../components/common/WishlistButton';
import toast from 'react-hot-toast';

// Mock product data for testing
const mockProducts = [
  {
    _id: '1',
    name: 'Test Product 1',
    price: 29.99,
    salePrice: 24.99,
    selling_price: 24.99,
    image_url: ['https://via.placeholder.com/300x300?text=Product+1'],
    images: [{ url: 'https://via.placeholder.com/300x300?text=Product+1' }],
    category: { name: 'Electronics' },
    slug: 'test-product-1',
    baseStock: 10
  },
  {
    _id: '2',
    name: 'Test Product 2',
    price: 49.99,
    salePrice: 39.99,
    selling_price: 39.99,
    image_url: ['https://via.placeholder.com/300x300?text=Product+2'],
    images: [{ url: 'https://via.placeholder.com/300x300?text=Product+2' }],
    category: { name: 'Clothing' },
    slug: 'test-product-2',
    baseStock: 5
  },
  {
    _id: '3',
    name: 'Test Product 3',
    price: 19.99,
    selling_price: 19.99,
    image_url: ['https://via.placeholder.com/300x300?text=Product+3'],
    images: [{ url: 'https://via.placeholder.com/300x300?text=Product+3' }],
    category: { name: 'Books' },
    slug: 'test-product-3',
    baseStock: 20
  }
];

const TestCartWishlistPage = () => {
  const user = useSelector((state) => state.auth.user);
  const { 
    items: cartItems, 
    itemCount: cartCount, 
    loading: cartLoading,
    clearCart,
    getTotal,
    isUsingCookies: cartUsingCookies
  } = useCart();
  
  const { 
    items: wishlistItems, 
    itemCount: wishlistCount, 
    loading: wishlistLoading,
    clearWishlist,
    isUsingCookies: wishlistUsingCookies
  } = useWishlist();

  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const handleClearCart = () => {
    try {
      clearCart();
      toast.success('Cart cleared successfully');
    } catch (error) {
      toast.error('Failed to clear cart');
    }
  };

  const handleAddToCart = async (product) => {
    try {
      await addToCart(product);
      toast.success('Item added to cart');
    } catch (error) {
      toast.error('Failed to add item to cart');
    }
  };

  const handleTestMongoSync = async () => {
    if (!user) {
      toast.error('Please login to test MongoDB sync');
      return;
    }

    try {
      toast.loading('Testing MongoDB sync...');
      
      // Test cart API
      const cartResponse = await fetch(`${API_BASE_URL}/api/cart`, {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });
      
      if (cartResponse.ok) {
        toast.success('MongoDB cart sync working!');
      } else {
        toast.error('MongoDB cart sync failed');
      }
    } catch (error) {
      console.error('MongoDB sync test failed:', error);
      toast.error('MongoDB sync test failed');
    }
  };

  const handleClearWishlist = () => {
    try {
      clearWishlist();
      toast.success('Wishlist cleared successfully');
    } catch (error) {
      toast.error('Failed to clear wishlist');
    }
  };

  const StorageIndicator = ({ isUsingCookies, type }) => (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      isUsingCookies 
        ? 'bg-orange-100 text-orange-800' 
        : 'bg-green-100 text-green-800'
    }`}>
      {isUsingCookies ? '🍪 Cookies' : '💾 MongoDB'}
      <span className="ml-1">({type})</span>
    </div>
  );

  if (cartLoading || wishlistLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Cart & Wishlist Test Page
        </h1>
        
        {/* User Status */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-2">Current Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">User Status:</p>
              <p className="font-medium">
                {user ? `Logged in as ${user.displayName || user.email}` : 'Guest User'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cart Storage:</p>
              <StorageIndicator isUsingCookies={cartUsingCookies} type="Cart" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Wishlist Storage:</p>
              <StorageIndicator isUsingCookies={wishlistUsingCookies} type="Wishlist" />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Testing Instructions:</h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
            <li>As a guest user, add items to cart/wishlist (stored in cookies)</li>
            <li>Log in to see automatic migration to MongoDB</li>
            <li>Open multiple tabs to test cross-tab synchronization</li>
            <li>Check browser dev tools → Application → Cookies to see cookie storage</li>
          </ol>
          
          {user && (
            <div className="mt-4">
              <button 
                onClick={handleTestMongoSync}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Test MongoDB Sync
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Test Products */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Test Products</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity to Add:
          </label>
          <select 
            value={selectedQuantity} 
            onChange={(e) => setSelectedQuantity(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            {[1, 2, 3, 4, 5].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockProducts.map((product) => (
            <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <img 
                src={product.images[0].url} 
                alt={product.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    {product.salePrice ? (
                      <>
                        <span className="text-lg font-bold text-green-600">
                          ${product.salePrice}
                        </span>
                        <span className="ml-2 text-sm text-gray-500 line-through">
                          ${product.price}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">
                        ${product.price}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{product.category.name}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <AddToCartButton 
                    product={product} 
                    quantity={selectedQuantity}
                    className="flex-1 mr-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  />
                  <WishlistButton 
                    product={product}
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current State Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Cart State */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Cart ({cartCount} items)</h2>
            {cartItems.length > 0 && (
              <button 
                onClick={handleClearCart}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Clear Cart
              </button>
            )}
          </div>
          
          {cartItems.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Cart is empty</p>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {cartItems.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        ${item.price} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span>${getTotal().toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Wishlist State */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Wishlist ({wishlistCount} items)</h2>
            {wishlistItems.length > 0 && (
              <button 
                onClick={handleClearWishlist}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Clear Wishlist
              </button>
            )}
          </div>
          
          {wishlistItems.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Wishlist is empty</p>
          ) : (
            <div className="space-y-3">
              {wishlistItems.map((item) => (
                <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.salePrice ? (
                        <>
                          <span className="text-green-600">${item.salePrice}</span>
                          <span className="ml-2 line-through">${item.price}</span>
                        </>
                      ) : (
                        <span>${item.price}</span>
                      )}
                    </p>
                  </div>
                  <WishlistButton 
                    product={item}
                    className="p-1 text-red-500 hover:text-red-700"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestCartWishlistPage;
