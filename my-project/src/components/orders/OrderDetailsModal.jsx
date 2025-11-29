import React from 'react';
import { 
  XMarkIcon,
  TruckIcon,
  ArrowDownTrayIcon,
  MapPinIcon,
  CreditCardIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/format';
import OrderItem from './OrderItem';

const OrderDetailsModal = ({ 
  order, 
  isOpen, 
  onClose, 
  onTrackOrder, 
  onDownloadInvoice 
}) => {
  if (!isOpen || !order) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'shipped':
        return <TruckIcon className="h-6 w-6 text-blue-500" />;
      case 'processing':
        return <ClockIcon className="h-6 w-6 text-yellow-500" />;
      case 'cancelled':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      default:
        return <ClockIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600';
      case 'shipped':
        return 'text-blue-600';
      case 'processing':
        return 'text-yellow-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {getStatusIcon(order.status)}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Order {order.orderNumber}
                </h2>
                <p className="text-sm text-gray-600">
                  Placed on {formatDate(order.date)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Order Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`text-lg font-semibold capitalize ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    {order.trackingNumber && (
                      <span className="text-sm text-gray-600">
                        Tracking: {order.trackingNumber}
                      </span>
                    )}
                  </div>
                  {order.estimatedDelivery && (
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Est. Delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Order Items ({order.items.length})
                </h3>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4 flex-1">
                        <img
                          src={item.image || '/images/products/placeholder-product.svg'}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/products/placeholder-product.svg';
                          }}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          {item.sku && (
                            <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                          )}
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(item.price)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Total: {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  Shipping Address
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-gray-900">
                    {/* Handle structured and legacy address formats */}
                    {order.shippingAddress && order.shippingAddress.name ? (
                      // Structured address format
                      <>
                        <p className="font-medium">{order.shippingAddress.name}</p>
                        <p>{order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                        <p>{order.shippingAddress.country || 'USA'}</p>
                        <p className="mt-1">{order.shippingAddress.phone}</p>
                        <p>{order.shippingAddress.email}</p>
                      </>
                    ) : order.shippingAddress && typeof order.shippingAddress === 'string' ? (
                      // Legacy string address format
                      <p className="font-medium">{order.shippingAddress}</p>
                    ) : (
                      // No address or unexpected format
                      <p className="text-gray-500">Address not available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  Payment Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900">{order.paymentMethod}</p>
                </div>
              </div>

              {/* Order Summary */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Order Summary
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>{order.shipping === 0 ? 'Free' : formatCurrency(order.shipping)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{formatCurrency(order.tax)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2">
                    <div className="flex justify-between text-lg font-semibold text-gray-900">
                      <span>Total</span>
                      <span>{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-3">
              {order.trackingNumber && (
                <button
                  onClick={() => onTrackOrder(order.trackingNumber)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <TruckIcon className="h-4 w-4 mr-2" />
                  Track Order
                </button>
              )}
              <button
                onClick={() => onDownloadInvoice(order.id)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Download Invoice
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
