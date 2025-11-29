import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';

const OrderItem = ({ item, showQuantity = true, showPrice = true }) => {
  const defaultImage = '/images/products/placeholder-product.svg';

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {/* Product Image */}
      <div className="flex-shrink-0">
        <Link to={`/product/${item.id}`} className="block">
          <img
            src={item.image || defaultImage}
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
