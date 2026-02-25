import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../utils/format';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import OrderItem from '../components/orders/OrderItem';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import orderService from '../services/orderService';
import toast from 'react-hot-toast';

const MyOrdersPage = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const location = useLocation();

  // Handle auto-opening order details from navigation state
  useEffect(() => {
    if (!loading && orders.length > 0 && location.state?.orderId) {
      const orderId = location.state.orderId;
      console.log('MyOrdersPage: Detected orderId in state, opening details for:', orderId);

      const orderToOpen = orders.find(o => o.id === orderId);
      if (orderToOpen) {
        setSelectedOrder(orderToOpen);
        setShowOrderDetails(true);

        // Clear the state so it doesn't reopen if the user refreshes or navigates back
        window.history.replaceState({ ...location.state, orderId: null }, document.title);
      }
    }
  }, [orders, loading, location.state]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await orderService.getMyOrders(user.uid);
      if (response && response.length > 0) {
        // Transform backend order data to match our UI format
        const transformedOrders = response.map(order => ({
          id: order._id,
          orderNumber: order.invoice_no,
          date: order.order_time,
          status: order.status,
          total: order.total_amount,
          itemCount: order.items ? order.items.length : 0,
          estimatedDelivery: order.estimated_delivery,
          trackingNumber: order.tracking_number,
          shippingAddress: order.shipping_address || {},
          items: order.items || [],
          paymentMethod: order.payment_method === 'cash' ? 'Cash on Delivery' : order.payment_method,
          subtotal: order.total_amount * 0.9, // Approximate (total - tax)
          shipping: order.shipping_cost,
          tax: order.total_amount * 0.1 // Approximate
        }));
        setOrders(transformedOrders);
      } else {
        // No orders found
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
      toast.error('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'shipped':
        return <TruckIcon className="h-5 w-5 text-blue-500" />;
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      delivered: 'bg-green-100 text-green-800 border-green-200',
      shipped: 'bg-blue-100 text-blue-800 border-blue-200',
      processing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusConfig[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleTrackOrder = async (trackingNumber) => {
    if (!trackingNumber) {
      toast.error('No tracking number available');
      return;
    }

    try {
      const response = await orderService.trackOrder(trackingNumber);
      // For now, just show a success message with tracking info
      // In a real app, this would open a tracking modal or redirect to tracking page
      toast.success(`Order ${response.orderId} is ${response.status}`);

      // You could also open a tracking modal here or redirect to a tracking page
      // window.open(`/track/${trackingNumber}`, '_blank');
    } catch (error) {
      console.error('Error tracking order:', error);
      toast.error('Unable to track order. Please try again later.');
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      await orderService.downloadInvoice(orderId);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice. Please try again later.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to view your orders.</p>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSpinner size="lg" text="Loading your orders..." className="min-h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
              <p className="text-gray-600 mt-2">
                Track and manage your orders
              </p>
            </div>
            <button
              onClick={fetchOrders}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders or products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Orders</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={ClockIcon}
            title="No orders found"
            description={searchQuery || statusFilter !== 'all'
              ? "No orders match your current filters. Try adjusting your search or filter criteria."
              : "You haven't placed any orders yet. Start shopping and place your first order to see it here."
            }
            actionText="Start Shopping"
            actionLink="/products"
          />
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Order Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order {order.orderNumber}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Placed on {formatDate(order.date)}
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="mt-4 md:mt-0 text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(order.total)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Items Preview */}
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {order.items.slice(0, 3).map((item) => (
                      <OrderItem key={item.id} item={item} />
                    ))}
                    {order.items.length > 3 && (
                      <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                        <span className="text-gray-500 font-medium">
                          +{order.items.length - 3} more items
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping Address - Compact Display */}
                <div className="px-6 py-3 bg-blue-50 border-t border-gray-200">
                  <div className="flex items-center space-x-3">
                    <MapPinIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-blue-900 uppercase tracking-wide">Shipping To</p>
                      <div className="text-sm text-blue-800 mt-1">
                        {/* Handle structured and legacy address formats */}
                        {order.shippingAddress && order.shippingAddress.name ? (
                          // Structured address format - show compact version
                          <p className="font-medium truncate">
                            {order.shippingAddress.name} • {order.shippingAddress.city}, {order.shippingAddress.state}
                          </p>
                        ) : order.shippingAddress && typeof order.shippingAddress === 'string' ? (
                          // Legacy string address format
                          <p className="font-medium truncate">{order.shippingAddress}</p>
                        ) : (
                          // No address
                          <p className="text-blue-600 italic">Address not available</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Actions */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0 sm:space-x-3">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                      {order.trackingNumber && (
                        <button
                          onClick={() => handleTrackOrder(order.trackingNumber)}
                          className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <TruckIcon className="h-4 w-4 mr-2" />
                          Track Order
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleDownloadInvoice(order.id)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                      Download Invoice
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={showOrderDetails}
          onClose={() => setShowOrderDetails(false)}
          onTrackOrder={handleTrackOrder}
          onDownloadInvoice={handleDownloadInvoice}
        />
      )}
    </div>
  );
};

export default MyOrdersPage;
