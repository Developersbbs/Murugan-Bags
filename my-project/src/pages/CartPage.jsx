import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/format';
import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import UnauthenticatedEmptyState from '../components/common/UnauthenticatedEmptyState';
import toast from 'react-hot-toast';

// Default product image as base64 encoded SVG
const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9IiNlZWVlZWUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNlZWVlZWIiLz4KICA8dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzk5OSI+Tm8gSW1hZ2UgQXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4=';

const CartPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { 
    items: cartItems, 
    itemCount: cartCount, 
    loading,
    updateQuantity, 
    removeFromCart, 
    clearCart,
    getTotal,
    isUsingCookies
  } = useCart();
  
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      // Add checkout logic here
      navigate('/checkout');
    } catch (error) {
      toast.error('Failed to proceed to checkout');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
      toast.success('Cart cleared');
    } catch (error) {
      toast.error('Failed to clear cart');
    }
  };

  const subtotal = getTotal();
  const shipping = subtotal > 0 ? (subtotal > 500 ? 0 : 50) : 0; // Free shipping over $500
  const discount = 0; // Add discount logic here
  const total = subtotal + shipping - discount;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner size="lg" text="Loading your cart..." className="min-h-64" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
              Shopping <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Cart</span>
            </h1>
            <p className="text-gray-600 text-lg">
              {cartItems.length > 0 ? `${cartItems.length} ${cartItems.length === 1 ? 'item' : 'items'} in your cart` : 'Your cart is empty'}
            </p>
          </div>
          {cartItems.length > 0 && (
            <button 
              onClick={handleClearCart}
              className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-medium rounded-xl transition-all duration-200 border border-red-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All Items
            </button>
          )}
        </div>
      
      {cartItems.length === 0 ? (
        // Show different empty states based on authentication status
        !isAuthenticated ? (
          <UnauthenticatedEmptyState type="cart" />
        ) : (
          <EmptyState
            icon={ShoppingCartIcon}
            title="Your cart is empty"
            description="Looks like you haven't added any items to your cart yet. Start shopping to fill it up!"
            actionText="Start Shopping"
            actionLink="/products"
          />
        )
      ) : (
        <div className="lg:flex gap-8">
          {/* Cart Items */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="font-semibold text-gray-900">
                  {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'} in Cart
                </h2>
              </div>
              
              {cartItems.map((item, index) => (
                <CartItem
                  key={`${item.id}-${item.cartItemId || item._id || index}-${item.variant ? JSON.stringify(item.variant) : 'no-variant'}`}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeFromCart}
                  loading={loading}
                />
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:w-1/3 mt-8 lg:mt-0">
            <CartSummary
              items={cartItems}
              subtotal={subtotal}
              shipping={shipping}
              discount={discount}
              total={total}
              onCheckout={handleCheckout}
              loading={isCheckingOut}
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default CartPage;
