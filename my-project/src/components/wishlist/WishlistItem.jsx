import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrashIcon, ShoppingCartIcon, EyeIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/format';
import { getFullImageUrl } from '../../utils/imageUtils';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

const WishlistItem = ({
  item,
  onRemove,
  loading = false,
  viewMode = 'grid',
  isSelected = false,
  onSelect
}) => {
  const { addToCart } = useCart();
  const [isRemoving, setIsRemoving] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const handleRemove = async () => {
    if (isRemoving) return;

    setIsRemoving(true);
    try {
      // Use _id or id, whichever is available
      const productId = item._id || item.id;
      console.log('WishlistItem: Removing item with ID:', productId);
      await onRemove(productId);
      toast.success('Removed from wishlist');
    } catch (error) {
      console.error('WishlistItem: Failed to remove item:', error);
      toast.error('Failed to remove item');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleAddToCart = async () => {
    if (isAddingToCart) return;

    setIsAddingToCart(true);
    try {
      await addToCart({
        _id: item._id || item.id,
        name: item.name,
        selling_price: item.price,
        image_url: [item.image]
      });
      toast.success('Added to cart');

      // Optionally remove from wishlist after adding to cart
      // await handleRemove();
    } catch (error) {
      toast.error('Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const defaultImage = '/images/products/placeholder-product.svg';

  if (viewMode === 'list') {
    return (
      <div className={`bg-white rounded-lg shadow-sm border-2 transition-all hover:shadow-md ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
        }`}>
        <div className="p-4">
          <div className="flex items-center space-x-4">
            {/* Selection Checkbox */}
            {onSelect && (
              <div className="flex-shrink-0">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={onSelect}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Product Image */}
            <div className="flex-shrink-0">
              <Link to={`/product/${item._id || item.id}`} className="block">
                <img
                  src={getFullImageUrl(item.image)}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = defaultImage;
                  }}
                  loading="lazy"
                />
              </Link>
            </div>

            {/* Product Details */}
            <div className="flex-1 min-w-0">
              <Link to={`/product/${item._id || item.id}`} className="block group">
                <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                  {item.name}
                </h3>
              </Link>

              <div className="flex items-center space-x-2 mt-1">
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(item.price)}
                </span>
                {item.originalPrice && item.originalPrice > item.price && (
                  <>
                    <span className="text-sm text-gray-500 line-through">
                      {formatCurrency(item.originalPrice)}
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>

              {item.addedAt && (
                <div className="text-xs text-gray-500 mt-1">
                  Added {new Date(item.addedAt).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart || loading || item.stock === 0}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <ShoppingCartIcon className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {isAddingToCart ? 'Adding...' : item.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </span>
              </button>

              <button
                onClick={handleRemove}
                disabled={isRemoving || loading}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Remove from wishlist"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className={`bg-white rounded-lg shadow-sm border-2 overflow-hidden hover:shadow-lg transition-all group ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}>
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white shadow-sm"
          />
        </div>
      )}

      {/* Product Image */}
      <div className="relative">
        <Link to={`/product/${item._id || item.id}`} className="block">
          <img
            src={getFullImageUrl(item.image)}
            alt={item.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = defaultImage;
            }}
            loading="lazy"
          />
        </Link>

        {/* Quick Actions Overlay */}
        <div className="absolute top-3 right-3 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            to={`/product/${item._id || item.id}`}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
            aria-label="View product"
          >
            <EyeIcon className="h-4 w-4 text-gray-600" />
          </Link>

          <button
            onClick={handleRemove}
            disabled={isRemoving || loading}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
            aria-label="Remove from wishlist"
          >
            <TrashIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Stock Status Badge */}
        {item.stock !== undefined && (
          <div className={`absolute ${onSelect ? 'top-12 left-3' : 'top-3 left-3'}`}>
            {item.stock === 0 ? (
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full shadow-sm">
                Out of Stock
              </span>
            ) : item.stock <= 5 ? (
              <span className="px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-full shadow-sm">
                Low Stock
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-4">
        <Link to={`/product/${item._id || item.id}`} className="block group">
          <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2 text-sm">
            {item.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(item.price)}
          </span>
          {item.originalPrice && item.originalPrice > item.price && (
            <>
              <span className="text-sm text-gray-500 line-through">
                {formatCurrency(item.originalPrice)}
              </span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
              </span>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handleAddToCart}
            disabled={isAddingToCart || loading || item.stock === 0}
            className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-1 text-sm font-medium"
          >
            <ShoppingCartIcon className="h-4 w-4" />
            <span>
              {isAddingToCart ? 'Adding...' : item.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </span>
          </button>

          <button
            onClick={handleRemove}
            disabled={isRemoving || loading}
            className="p-2 border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
            aria-label="Remove from wishlist"
          >
            <TrashIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Added Date */}
        {item.addedAt && (
          <div className="mt-3 text-xs text-gray-500 text-center">
            Added {new Date(item.addedAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistItem;
