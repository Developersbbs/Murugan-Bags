import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartIcon, TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { formatCurrency } from '../../utils/format';
import { useWishlist } from '../../context/WishlistContext';
import { getFullImageUrl } from '../../utils/imageUtils';
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

  const inWishlist = isInWishlist(item.id, item.variant_id);

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
        await removeFromWishlist(item.id, item.variant_id);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist({
          _id: item.id,
          name: item.name,
          selling_price: item.price,
          image_url: [item.image],
          variant_id: item.variant_id
        });
        toast.success('Added to wishlist');
      }
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  const defaultImage = '/images/products/placeholder-product.svg';

  return (
    <div className="group relative bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 mb-3 mx-2">
      <div className="flex gap-4">
        {/* Product Image */}
        <Link
          to={`/product/${item.id}`}
          className="relative flex-shrink-0 w-24 h-24 bg-gray-50 rounded-lg overflow-hidden border border-gray-100"
        >
          <img
            src={getFullImageUrl(item.image)}
            alt={item.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = defaultImage;
            }}
            loading="lazy"
          />
        </Link>

        {/* Content Container */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start gap-2">
              <Link
                to={`/product/${item.id}`}
                className="block"
              >
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-rose-600 transition-colors line-clamp-2 leading-snug">
                  {item.name}
                </h3>
              </Link>

              {/* Remove Button (Top Right) */}
              <button
                onClick={handleRemove}
                disabled={isRemoving || loading}
                className="text-gray-400 hover:text-red-500 p-1 -mr-1 -mt-1 rounded-full hover:bg-red-50 transition-all"
                aria-label="Remove from cart"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Variant details */}
            {(() => {
              // Determine what attributes to show
              let displayAttributes = {};

              if (item.variant && item.variant.attributes) {
                // If variant has an 'attributes' property, use that (standard structure)
                displayAttributes = item.variant.attributes;
              } else if (item.variant) {
                // Otherwise use the variant object itself but filter out technical fields
                const technicalKeys = [
                  '_id', 'id', 'sku', 'stock', 'images', 'image_url', 'price',
                  'cost_price', 'selling_price', 'originalPrice', 'quantity',
                  'isActive', 'createdAt', 'updatedAt', 'product_id', '__v'
                ];

                Object.entries(item.variant).forEach(([key, value]) => {
                  if (!technicalKeys.includes(key) && typeof value !== 'object') {
                    displayAttributes[key] = value;
                  } else if (key === 'attributes' && typeof value === 'object') {
                    // Handle case where attributes might be nested but not detected above
                    Object.assign(displayAttributes, value);
                  }
                });
              }

              if (Object.keys(displayAttributes).length === 0) return null;

              return (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {Object.entries(displayAttributes).map(([key, value]) => (
                    <span key={key} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      <span className="opacity-60 mr-1 capitalize">{key}:</span> {String(value)}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Bottom Row: Price & Controls */}
          <div className="flex items-end justify-between mt-3">
            {/* Price */}
            <div className="flex flex-col">
              <span className="text-base font-bold text-gray-900">
                {formatCurrency(item.price * item.quantity)}
              </span>
              {item.quantity > 1 && (
                <span className="text-xs text-gray-500">
                  {formatCurrency(item.price)} each
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Wishlist Button */}
              <button
                onClick={handleWishlistToggle}
                className={`p-1.5 rounded-full transition-colors ${inWishlist
                  ? 'bg-rose-50 text-rose-500'
                  : 'text-gray-400 hover:text-rose-500 hover:bg-gray-50'
                  }`}
                aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
              >
                {inWishlist ? (
                  <HeartSolidIcon className="h-5 w-5" />
                ) : (
                  <HeartIcon className="h-5 w-5" />
                )}
              </button>

              {/* Quantity Stepper */}
              <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-0.5">
                <button
                  onClick={() => handleQuantityChange(item.quantity - 1)}
                  disabled={item.quantity <= 1 || isUpdating || loading}
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  aria-label="Decrease quantity"
                >
                  <MinusIcon className="h-3.5 w-3.5" />
                </button>

                <span className="w-8 text-center text-xs font-semibold text-gray-900">
                  {isUpdating ? (
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce mx-auto" />
                  ) : item.quantity}
                </span>

                <button
                  onClick={() => handleQuantityChange(item.quantity + 1)}
                  disabled={(item.stock && item.quantity >= item.stock) || isUpdating || loading}
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  aria-label="Increase quantity"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Warning */}
      {item.stock && item.stock <= 5 && (
        <div className="absolute bottom-2 left-28 text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
          Only {item.stock} left
        </div>
      )}
    </div>
  );
};

export default CartItem;
