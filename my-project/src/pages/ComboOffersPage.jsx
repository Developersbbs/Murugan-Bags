import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Helmet } from 'react-helmet-async';
import { FaShoppingBag, FaTag, FaClock } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config/api';

const ComboOffersPage = () => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();

    const API_URL = API_BASE_URL;

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        try {
            const res = await fetch(`${API_URL}/combo-offers?limit=100`);
            const data = await res.json();
            if (data.success) {
                setOffers(data.data);
            }
        } catch (error) {
            console.error('Error fetching offers:', error);
            toast.error('Failed to load combo offers');
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = async (offer) => {
        try {
            // Adapt combo offer to product structure expected by cart
            const productData = {
                _id: offer._id,
                name: offer.title,
                price: offer.originalPrice,
                selling_price: offer.price,
                salePrice: offer.price,
                mrp: offer.originalPrice,
                image_url: offer.image ? [offer.image] : ['https://placehold.co/600x400?text=Combo+Offer'],
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <Helmet>
                <title>Combo Offers | Murugan Bags</title>
                <meta name="description" content="Exclusive combo offers and deals on bags and luggage." />
            </Helmet>

            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
                        Exclusive <span className="text-rose-600">Combo Offers</span>
                    </h1>
                    <p className="mt-5 max-w-xl mx-auto text-xl text-slate-500">
                        Save more with our carefully curated bundles. Limited time deals!
                    </p>
                </div>

                {offers.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-xl text-slate-500">No active combo offers at the moment. Check back soon!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {offers.map((offer) => (
                            <div key={offer._id} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 flex flex-col">
                                <Link to={`/combo-offers/${offer._id}`} className="h-48 bg-gradient-to-r from-rose-500 to-orange-500 flex items-center justify-center relative overflow-hidden group-hover:opacity-95 transition-opacity">
                                    {offer.image ? (
                                        <img
                                            src={offer.image}
                                            alt={offer.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.style.display = 'none';
                                                e.target.parentElement.classList.add('bg-gradient-to-r', 'from-rose-500', 'to-orange-500');
                                            }}
                                        />
                                    ) : (
                                        <span className="text-white text-4xl font-bold flex items-center gap-2">
                                            <FaTag /> Combo Deal
                                        </span>
                                    )}
                                    {offer.isLimitedTime && (
                                        <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 z-10 shadow-md">
                                            <FaClock /> LIMITED TIME
                                        </div>
                                    )}
                                </Link>

                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <Link to={`/combo-offers/${offer._id}`}>
                                            <h3 className="text-2xl font-bold text-slate-800 hover:text-rose-600 transition-colors">{offer.title}</h3>
                                        </Link>
                                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                                            SAVE {offer.savingsPercent}%
                                        </span>
                                    </div>

                                    <p className="text-slate-600 mb-6 flex-1">{offer.description}</p>

                                    <div className="mt-auto">
                                        <div className="flex items-baseline mb-6">
                                            <span className="text-3xl font-bold text-slate-900">₹{offer.price.toLocaleString()}</span>
                                            <span className="ml-3 text-lg text-slate-400 line-through">₹{offer.originalPrice.toLocaleString()}</span>
                                        </div>

                                        <button
                                            onClick={() => handleAddToCart(offer)}
                                            className="w-full bg-slate-900 text-white py-3 px-6 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <FaShoppingBag /> Add to Cart
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComboOffersPage;
