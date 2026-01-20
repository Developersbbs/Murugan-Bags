import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';

const OrderItem = ({ item, showQuantity = true, showPrice = true }) => {
  const defaultImage = '/images/products/placeholder-product.svg';

  // DEBUG: Check what item data we are receiving
  React.useEffect(() => {
    console.log('OrderItem item:', item);
    console.log('OrderItem extracted URL:', getImageUrl(item));
  }, [item]);

  const getImageUrl = (item) => {
    if (!item) return defaultImage;

    // 1. Try direct image property
    if (item.image) return item.image;

    // 2. Try image_url (array or string)
    if (item.image_url) {
      if (Array.isArray(item.image_url) && item.image_url.length > 0) {
        return item.image_url[0];
      }
      if (typeof item.image_url === 'string') return item.image_url;
    }

    // 3. Try images (array)
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      const img = item.images[0];
      return typeof img === 'string' ? img : (img.url || img.secure_url);
    }

    // 4. Try product reference if populated
    if (item.product) {
      return getImageUrl(item.product);
    }

    return defaultImage;
  };

  const imageUrl = getImageUrl(item);

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {/* Product Image */}
      <div className="flex-shrink-0">
        <Link to={`/product/${item.id}`} className="block">
          <img
            src={imageUrl}
            alt={item.name}
            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = defaultImage;
            }}
          />
        </Link>
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <Link
          to={`/product/${item.id}`}
          className="block group"
        >
          <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
            {item.name}
          </h4>
        </Link>

        {item.sku && (
          <p className="text-xs text-gray-500 mt-1">
            SKU: {item.sku}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          {showQuantity && (
            <span className="text-xs text-gray-600">
              Qty: {item.quantity}
            </span>
          )}
          {showPrice && (
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(item.price)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderItem;
