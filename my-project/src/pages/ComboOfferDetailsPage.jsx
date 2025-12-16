import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Helmet } from 'react-helmet-async';
import { FaShoppingBag, FaTag, FaClock, FaArrowLeft, FaCheck, FaShieldAlt, FaTruck } from 'react-icons/fa';
import toast from 'react-hot-toast';

const ComboOfferDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [offer, setOffer] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        const fetchOfferDetails = async () => {
            try {
                const res = await fetch(`${API_URL}/combo-offers/${id}`);
                const data = await res.json();

                if (data.success) {
                    setOffer(data.data);
                } else {
                    toast.error('Combo offer not found');
                    navigate('/combo-offers');
                }
            } catch (error) {
                console.error('Error fetching offer details:', error);
                toast.error('Failed to load offer details');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchOfferDetails();
        }
    }, [id, API_URL, navigate]);

    const handleAddToCart = async () => {
        if (!offer) return;

        try {
            const productData = {
                _id: offer._id,
                name: offer.title,
                price: offer.originalPrice,
                selling_price: offer.price,
                salePrice: offer.price,
                mrp: offer.originalPrice,
                image_url: [offer.image || 'https://placehold.co/600x400?text=Combo+Offer'],
                stock: 100, // Assume available
                isCombo: true
            };

            await addToCart(productData, null, 1);
            toast.success('Combo offer added to cart!');
        } catch (error) {
            console.error('Error adding combo to cart:', error);
            toast.error('Failed to add to cart');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-600"></div>
            </div>
        );
    }

    if (!offer) return null;

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <Helmet>
                <title>{`${offer.title} | Murugan Bags`}</title>
                <meta name="description" content={offer.description} />
            </Helmet>

            <div className="max-w-7xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-slate-600 hover:text-rose-600 mb-8 transition-colors font-medium"
                >
                    <FaArrowLeft className="mr-2" /> Back to Offers
                </button>

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        {/* Image Section */}
                        <div className="h-96 lg:h-auto bg-gradient-to-br from-slate-100 to-white relative flex items-center justify-center p-8">
                            {offer.image ? (
                                <img
                                    src={offer.image}
                                    alt={offer.title}
                                    className="max-w-full max-h-[500px] object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                        e.target.parentElement.classList.add('bg-gradient-to-r', 'from-rose-500', 'to-orange-500');
                                    }}
                                />
                            ) : (
                                <div className="text-center p-12 bg-gradient-to-r from-rose-500 to-orange-500 w-full h-full flex items-center justify-center text-white">
                                    <div>
                                        <FaTag className="text-8xl mx-auto mb-4 opacity-50" />
                                        <h2 className="text-4xl font-bold">Combo Deal</h2>
                                    </div>
                                </div>
                            )}

                            {offer.isLimitedTime && (
                                <div className="absolute top-6 right-6 bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-pulse">
                                    <FaClock /> LIMITED TIME OFFER
                                </div>
                            )}
                        </div>

                        {/* Content Section */}
                        <div className="p-8 lg:p-12 flex flex-col justify-center">
                            <span className="inline-block bg-rose-100 text-rose-600 px-4 py-1.5 rounded-full text-sm font-bold mb-4 w-fit">
                                EXCLUSIVE BUNDLE
                            </span>

                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                                {offer.title}
                            </h1>

                            <div className="flex items-end gap-4 mb-8">
                                <span className="text-4xl sm:text-5xl font-extrabold text-slate-900">
                                    ₹{offer.price.toLocaleString()}
                                </span>
                                <div className="flex flex-col mb-1">
                                    <span className="text-xl text-slate-400 line-through">
                                        ₹{offer.originalPrice.toLocaleString()}
                                    </span>
                                    <span className="text-green-600 font-bold">
                                        You Save {offer.savingsPercent}%
                                    </span>
                                </div>
                            </div>

                            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                {offer.description}
                            </p>

                            <div className="space-y-4 mb-10">
                                <div className="flex items-center gap-3 text-slate-700">
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <FaCheck className="w-3 h-3" />
                                    </div>
                                    <span className="font-medium">100% Authentic Products</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-700">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <FaTruck className="w-3 h-3" />
                                    </div>
                                    <span className="font-medium">Free Shipping Available</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-700">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                        <FaShieldAlt className="w-3 h-3" />
                                    </div>
                                    <span className="font-medium">Warranty Covered</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 mt-auto">
                                <button
                                    onClick={handleAddToCart}
                                    className="flex-1 bg-slate-900 hover:bg-rose-600 text-white py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:-translate-y-1 shadow-xl hover:shadow-Rose-500/20 flex items-center justify-center gap-3"
                                >
                                    <FaShoppingBag /> Add to Cart
                                </button>
                                <button
                                    onClick={() => navigate('/combo-offers')}
                                    className="flex-1 bg-white border-2 border-slate-200 hover:border-slate-900 text-slate-900 py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300"
                                >
                                    View More Offers
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComboOfferDetailsPage;
