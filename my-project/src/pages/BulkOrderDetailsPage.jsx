import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaBox, FaPhone, FaEnvelope, FaWhatsapp } from 'react-icons/fa';
import { Helmet } from 'react-helmet-async';

import { API_BASE_URL } from '../config/api';

const BulkOrderDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/bulk-orders/${id}`);
                const data = await res.json();

                if (data.success) {
                    setOrder(data.data);
                } else {
                    navigate('/bulk-orders');
                }
            } catch (error) {
                console.error('Error fetching bulk order details:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchOrderDetails();
        }
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-600"></div>
            </div>
        );
    }

    if (!order) return null;

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <Helmet>
                <title>{`${order.title} | Bulk Orders`}</title>
            </Helmet>

            <div className="max-w-7xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-slate-600 hover:text-slate-900 mb-8 transition-colors font-medium"
                >
                    <FaArrowLeft className="mr-2" /> Back to Bulk Orders
                </button>

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        {/* Image Section */}
                        <div className="h-96 lg:h-auto bg-slate-100 relative flex items-center justify-center p-8">
                            {order.image ? (
                                <img
                                    src={order.image}
                                    alt={order.title}
                                    className="max-w-full max-h-[500px] object-contain drop-shadow-xl"
                                />
                            ) : (
                                <div className="text-center p-12 text-slate-400">
                                    <FaBox className="text-8xl mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold">Bulk Package</h2>
                                </div>
                            )}
                        </div>

                        {/* Content Section */}
                        <div className="p-8 lg:p-12 flex flex-col justify-center">
                            <span className="inline-block bg-blue-100 text-blue-800 px-4 py-1.5 rounded-full text-sm font-bold mb-4 w-fit">
                                BULK PACKAGE
                            </span>

                            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                                {order.title}
                            </h1>

                            <div className="flex items-baseline gap-2 mb-8">
                                <span className="text-4xl font-extrabold text-slate-900">
                                    ₹{order.price.toLocaleString()}
                                </span>
                                <span className="text-slate-500 font-medium">/ unit</span>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Minimum Order Quantity</h3>
                                <p className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                    <FaBox className="text-blue-600" />
                                    {order.minQuantity} Units
                                </p>
                            </div>

                            <div className="prose prose-slate mb-10">
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Package Details</h3>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {order.description}
                                </p>
                            </div>

                            <div className="mt-auto">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Interested? Contact Us</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <a
                                        href="tel:+919884000951"
                                        className="flex items-center justify-center gap-2 bg-slate-900 text-white py-4 px-6 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                                    >
                                        <FaPhone /> Call Now
                                    </a>
                                    <a
                                        href="mailto:info@muruganbags.com"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            const gmailUrl = "https://mail.google.com/mail/?view=cm&fs=1&to=info@muruganbags.com";
                                            window.open(gmailUrl, '_blank');
                                        }}
                                        className="flex items-center justify-center gap-2 bg-blue-600 text-white py-4 px-6 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                                    >
                                        <FaEnvelope /> info@muruganbags.com
                                    </a>
                                    <a
                                        href="https://wa.me/919884000951"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 bg-green-600 text-white py-4 px-6 rounded-xl font-bold hover:bg-green-700 transition-colors"
                                    >
                                        <FaWhatsapp /> WhatsApp
                                    </a>
                                </div>
                                <p className="text-center text-slate-500 text-sm mt-4">
                                    Mention "Bulk Order: {order.title}" when you contact us.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkOrderDetailsPage;
