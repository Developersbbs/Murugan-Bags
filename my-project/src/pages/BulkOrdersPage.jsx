import { useState, useEffect } from 'react';
import { FaBox, FaPhone, FaEnvelope } from 'react-icons/fa';

export default function BulkOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchBulkOrders();
    }, []);

    const fetchBulkOrders = async () => {
        try {
            const res = await fetch(`${API_URL}/bulk-orders`);
            const data = await res.json();

            if (data.success && data.data && data.data.length > 0) {
                setOrders(data.data);
            }
        } catch (error) {
            console.error('Error fetching bulk orders:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Bulk Orders</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Special packages for corporate gifts, events, and large quantity orders.
                        Get the best prices for bulk purchases.
                    </p>
                </div>

                {/* Bulk Order Packages */}
                {orders.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                        {orders.map((order) => (
                            <div
                                key={order._id}
                                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                            >
                                {order.image && (
                                    <div className="h-64 overflow-hidden">
                                        <img
                                            src={order.image}
                                            alt={order.title}
                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                )}

                                <div className="p-6">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                        {order.title}
                                    </h3>

                                    <p className="text-gray-600 mb-4 line-clamp-3">
                                        {order.description}
                                    </p>

                                    <div className="flex items-center gap-2 mb-4 text-blue-600">
                                        <FaBox />
                                        <span className="font-medium">
                                            Minimum Quantity: {order.minQuantity} units
                                        </span>
                                    </div>

                                    <div className="border-t pt-4">
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-sm text-gray-500">Price per unit</span>
                                            <span className="text-3xl font-bold text-gray-900">
                                                ₹{order.price.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <FaBox className="mx-auto text-6xl text-gray-300 mb-4" />
                        <p className="text-xl text-gray-500">No bulk order packages available at the moment.</p>
                    </div>
                )}

                {/* Contact Section */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-xl p-8 text-white">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-4">Need a Custom Bulk Order?</h2>
                        <p className="text-lg mb-6 text-blue-100">
                            Contact us for customized bulk orders, special pricing, and branding options.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <a
                                href="tel:+919876543210"
                                className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                            >
                                <FaPhone />
                                <span>Call Us</span>
                            </a>
                            <a
                                href="mailto:bulk@muruganbags.com"
                                className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                            >
                                <FaEnvelope />
                                <span>Email Us</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
