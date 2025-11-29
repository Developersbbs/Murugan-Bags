import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { getGuestCart, getGuestWishlist } from '../../utils/guestStorage';

const AuthCartDebug = () => {
  const { user, loading: authLoading, isAuthenticated } = useSelector((state) => state.auth);
  const { items: cartItems, loading: cartLoading, isGuestMode: cartGuestMode } = useCart();
  const { items: wishlistItems, loading: wishlistLoading, isGuestMode: wishlistGuestMode } = useWishlist();
  
  const [guestCart, setGuestCart] = useState([]);
  const [guestWishlist, setGuestWishlist] = useState([]);

  useEffect(() => {
    // Update guest storage state
    setGuestCart(getGuestCart());
    setGuestWishlist(getGuestWishlist());
  }, []);

  // Update guest storage every 2 seconds to see changes
  useEffect(() => {
    const interval = setInterval(() => {
      setGuestCart(getGuestCart());
      setGuestWishlist(getGuestWishlist());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold text-yellow-400 mb-2">🐛 Auth & Cart Debug</h3>
      
      <div className="mb-2">
        <strong className="text-blue-400">Authentication:</strong>
        <div>User: {user ? `${user.name || user.displayName || 'Unknown'} (${user.uid})` : 'None'}</div>
        <div>Auth Loading: {authLoading ? '⏳' : '✅'}</div>
        <div>Is Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
      </div>

      <div className="mb-2">
        <strong className="text-green-400">Cart ({cartItems.length} items):</strong>
        <div>Loading: {cartLoading ? '⏳' : '✅'}</div>
        <div>Guest Mode: {cartGuestMode ? '👤' : '🔐'}</div>
        <div>Items: {cartItems.map(item => item.name).join(', ') || 'Empty'}</div>
      </div>

      <div className="mb-2">
        <strong className="text-purple-400">Wishlist ({wishlistItems.length} items):</strong>
        <div>Loading: {wishlistLoading ? '⏳' : '✅'}</div>
        <div>Guest Mode: {wishlistGuestMode ? '👤' : '🔐'}</div>
        <div>Items: {wishlistItems.map(item => item.name).join(', ') || 'Empty'}</div>
      </div>

      <div className="mb-2">
        <strong className="text-orange-400">Guest Storage:</strong>
        <div>Cart: {guestCart.length} items</div>
        <div>Wishlist: {guestWishlist.length} items</div>
      </div>

      <div className="text-xs text-gray-400 mt-2">
        Refresh to test persistence
      </div>
    </div>
  );
};

export default AuthCartDebug;
