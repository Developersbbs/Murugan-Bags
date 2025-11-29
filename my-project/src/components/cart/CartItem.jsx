import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartIcon, TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { formatCurrency } from '../../utils/format';
import { useWishlist } from '../../context/WishlistContext';
import toast from 'react-hot-toast';

const CartItem = ({ 
  item, 
  onUpdateQuantity, 
  onRemove, 
  loading = false 
}) => {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  
  const inWishlist = isInWishlist(item.id);

  const handleQuantityChange = async (newQuantity) => {
    if (newQuantity < 1 || isUpdating) return;
    
    setIsUpdating(true);
    try {
      // Use cartItemId if available, otherwise fall back to id
      const itemIdentifier = item.cartItemId || item._id || item.id;
      await onUpdateQuantity(itemIdentifier, newQuantity);
      toast.success('Cart updated');
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update cart');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (isRemoving) return;
    
    setIsRemoving(true);
    try {
      // For authenticated users, use cartItemId (MongoDB cart item ID)
      // For guest users, use product id
      const itemIdentifier = item.cartItemId || item.id;
      await onRemove(itemIdentifier);
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleWishlistToggle = async () => {
    try {
      if (inWishlist) {
        await removeFromWishlist(item.id);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist({
          _id: item.id,
          name: item.name,
          selling_price: item.price,
          image_url: [item.image]
        });
        toast.success('Added to wishlist');
      }
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  const defaultImage = '/images/products/placeholder-product.svg';

  return (
    <div className="p-4 border-b bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-start space-x-4">
        {/* Product Image */}
        <Link 
          to={`/product/${item.id}`} 
          className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden group"
        >
          <img 
            src={item.image || defaultImage} 
            alt={item.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = defaultImage;
            }}
            loading="lazy"
          />
        </Link>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <Link 
            to={`/product/${item.id}`} 
            className="block group"
          >
            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
              {item.name}
            </h3>
          </Link>
          
          {/* Variant details */}
          {item.variant && Object.keys(item.variant).length > 0 && (
            <div className="mt-1 text-sm text-gray-500">
              {Object.entries(item.variant).map(([key, value]) => {
                // Handle different value types properly
                let displayValue;
                if (typeof value === 'object' && value !== null) {
                  // If it's an object, try to extract meaningful values
                  if (Array.isArray(value)) {
                    displayValue = value.join(', ');
                  } else {
                    displayValue = Object.values(value).join(', ') || JSON.stringify(value);
                  }
                } else {
                  displayValue = String(value);
                }
                
                return (
                  <span key={key} className="inline-block mr-3 px-2 py-1 bg-gray-100 rounded-md text-xs">
                    <span className="font-medium capitalize">{key}:</span> {displayValue}
                  </span>
                );
              })}
            </div>
          )}
          
          {/* Price */}
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(item.price)}
            </span>
            {item.originalPrice && item.originalPrice > item.price && (
              <span className="text-sm text-gray-500 line-through">
                {formatCurrency(item.originalPrice)}
              </span>
            )}
          </div>

          {/* Stock Status */}
          {item.stock && item.stock <= 5 && (
            <div className="mt-1 text-xs text-orange-600 font-medium">
              Only {item.stock} left in stock
            </div>
          )}
        </div>

        {/* Quantity and Actions */}
        <div className="flex flex-col items-end space-y-3">
          {/* Quantity Controls */}
          <div className="flex items-center border rounded-md">
            <button 
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={item.quantity <= 1 || isUpdating || loading}
              className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Decrease quantity"
            >
              <MinusIcon className="h-4 w-4" />
            </button>
            
            <span className="px-3 py-1 text-sm font-medium min-w-[3rem] text-center">
              {isUpdating ? '...' : item.quantity}
            </span>
            
            <button 
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={item.stock && item.quantity >= item.stock || isUpdating || loading}
              className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Increase quantity"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Total Price */}
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(item.price * item.quantity)}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleWishlistToggle}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            >
              {inWishlist ? (
                <HeartSolidIcon className="h-5 w-5 text-red-500" />
              ) : (
                <HeartIcon className="h-5 w-5" />
              )}
            </button>
            
            <button 
              onClick={handleRemove}
              disabled={isRemoving || loading}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              aria-label="Remove from cart"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
