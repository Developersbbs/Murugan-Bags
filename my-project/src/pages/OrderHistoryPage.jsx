import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const OrderHistoryPage = () => {
  // Sample order data - replace with actual data from your API
  const [orders, setOrders] = useState([
    {
      id: 'WU881911',
      date: '2023-05-15',
      status: 'Delivered',
      total: 129.97,
      items: [
        { id: 1, name: 'Wireless Headphones', price: 99.99, quantity: 1, image: 'https://via.placeholder.com/80' },
        { id: 2, name: 'USB-C Cable', price: 14.99, quantity: 2, image: 'https://via.placeholder.com/80' },
      ],
    },
    {
      id: 'WU881910',
      date: '2023-04-10',
      status: 'Delivered',
      total: 45.98,
      items: [
        { id: 3, name: 'Smartphone Case', price: 19.99, quantity: 2, image: 'https://via.placeholder.com/80' },
        { id: 4, name: 'Screen Protector', price: 5.99, quantity: 1, image: 'https://via.placeholder.com/80' },
      ],
    },
  ]);

  const [selectedOrder, setSelectedOrder] = useState(null);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'Delivered': 'bg-green-100 text-green-800',
      'Shipped': 'bg-blue-100 text-blue-800',
      'Processing': 'bg-yellow-100 text-yellow-800',
      'Cancelled': 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto lg:max-w-none">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Order History</h1>
          <p className="mt-2 text-sm text-gray-500">
            Check the status of recent orders, manage returns, and download invoices.
          </p>

          <div className="mt-12">
            {orders.length === 0 ? (
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You haven't placed any orders yet.
                </p>
                <div className="mt-6">
                  <Link
                    to="/products"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {orders.map((order) => (
                  <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-4 sm:px-6 sm:py-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Order #{order.id}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            Placed on <time dateTime={order.date}>{formatDate(order.date)}</time>
                          </p>
                        </div>
                        <div className="mt-3 sm:mt-0">
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-200">
                      {order.items.map((item) => (
                        <div key={item.id} className="p-4 sm:px-6">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-16 w-16 overflow-hidden rounded-md border border-gray-200">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-cover object-center"
                              />
                            </div>
                            <div className="ml-4 flex-1">
                              <div className="flex justify-between text-base font-medium text-gray-900">
                                <h3>
                                  <Link to={`/product/${item.id}`}>
                                    {item.name}
                                  </Link>
                                </h3>
                                <p className="ml-4">${item.price.toFixed(2)}</p>
                              </div>
                              <p className="mt-1 text-sm text-gray-500">
                                Qty: {item.quantity}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                      <div className="flex justify-between text-sm font-medium text-gray-900">
                        <p>Total</p>
                        <p>${order.total.toFixed(2)}</p>
                      </div>
                      <div className="mt-4 flex space-x-3">
                        <Link
                          to={`/orders/${order.id}`}
                          className="flex-1 flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          View Order
                        </Link>
                        <button
                          type="button"
                          className="flex-1 flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Track Order
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderHistoryPage;
