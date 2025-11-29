import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBagIcon, TruckIcon, TagIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/format';

const CartSummary = ({ 
  items = [], 
  subtotal = 0, 
  shipping = 0, 
  discount = 0, 
  total = 0,
  onCheckout,
  loading = false 
}) => {
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const freeShippingThreshold = 500;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <ShoppingBagIcon className="h-5 w-5 mr-2 text-blue-600" />
        Order Summary
      </h2>
      
      {/* Item Count */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-600">
          {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
        </p>
      </div>

      {/* Free Shipping Progress */}
      {remainingForFreeShipping > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <div className="flex items-center mb-2">
            <TruckIcon className="h-4 w-4 text-blue-600 mr-2" />
            <p className="text-sm text-blue-800 font-medium">
              Add {formatCurrency(remainingForFreeShipping)} more for FREE shipping!
            </p>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Price Breakdown */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span className="flex items-center">
              <TagIcon className="h-4 w-4 mr-1" />
              Discount
            </span>
            <span className="font-medium">-{formatCurrency(discount)}</span>
          </div>
        )}
        
        <div className="flex justify-between text-sm">
          <span className="flex items-center text-gray-600">
            <TruckIcon className="h-4 w-4 mr-1" />
            Shipping
          </span>
          <span className="font-medium">
            {shipping === 0 ? (
              <span className="text-green-600">Free</span>
            ) : (
              formatCurrency(shipping)
            )}
          </span>
        </div>
        
        <div className="border-t pt-3 flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span className="text-blue-600">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button 
          onClick={onCheckout}
          disabled={loading || itemCount === 0}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Processing...' : 'Proceed to Checkout'}
        </button>
        
        <Link 
          to="/products" 
          className="block w-full text-center py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700"
        >
          Continue Shopping
        </Link>
      </div>

    </div>
  );
};

export default CartSummary;
