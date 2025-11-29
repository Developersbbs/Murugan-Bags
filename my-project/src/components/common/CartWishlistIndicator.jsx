import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { FaShoppingCart, FaHeart } from 'react-icons/fa';

const CartWishlistIndicator = ({ className = "" }) => {
  const { itemCount: cartCount, loading: cartLoading } = useCart();
  const { itemCount: wishlistCount, loading: wishlistLoading } = useWishlist();

  if (cartLoading || wishlistLoading) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <div className="animate-pulse bg-gray-200 rounded-full w-8 h-8"></div>
        <div className="animate-pulse bg-gray-200 rounded-full w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Cart Link */}
      <Link 
        to="/cart" 
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        aria-label={`Cart with ${cartCount} items`}
      >
        <FaShoppingCart className="w-6 h-6" />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </Link>

      {/* Wishlist Link */}
      <Link 
        to="/wishlist" 
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        aria-label={`Wishlist with ${wishlistCount} items`}
      >
        <FaHeart className="w-6 h-6" />
        {wishlistCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {wishlistCount > 99 ? '99+' : wishlistCount}
          </span>
        )}
      </Link>
    </div>
  );
};

export default CartWishlistIndicator;
