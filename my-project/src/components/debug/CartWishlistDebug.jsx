import React from 'react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useSelector } from 'react-redux';

const CartWishlistDebug = () => {
  const { items: cartItems, itemCount: cartCount, isUsingCookies: cartUsingCookies } = useCart();
  const { items: wishlistItems, itemCount: wishlistCount, isUsingCookies: wishlistUsingCookies } = useWishlist();
  const user = useSelector((state) => state.auth.user);

  // Don't show in production
  const isProduction = (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'production') || 
                      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
  
  if (isProduction) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold mb-2">Debug Info</h4>
      <div className="space-y-1">
        <div>User: {user ? user.email || user.displayName || 'Logged in' : 'Guest'}</div>
        <div>Cart: {cartCount} items ({cartUsingCookies ? 'Cookies' : 'MongoDB'})</div>
        <div>Wishlist: {wishlistCount} items ({wishlistUsingCookies ? 'Cookies' : 'MongoDB'})</div>
        <div className="text-xs opacity-75 mt-2">
          Cart Items: {cartItems.map(item => item.name).join(', ') || 'None'}
        </div>
        <div className="text-xs opacity-75">
          Wishlist Items: {wishlistItems.map(item => item.name).join(', ') || 'None'}
        </div>
      </div>
    </div>
  );
};

export default CartWishlistDebug;
