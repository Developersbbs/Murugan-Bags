import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';

const OfferPopup = () => {
    const [popup, setPopup] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        // Check if popup has been shown in this session
        const popupShown = sessionStorage.getItem('offerPopupShown');

        if (!popupShown) {
            fetchPopup();
        }
    }, []);

    const fetchPopup = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const res = await fetch(`${API_URL}/offer-popups`);
            const data = await res.json();

            if (data.success && data.data) {
                setPopup(data.data);
                // Show popup after a short delay for better UX
                setTimeout(() => {
                    setIsVisible(true);
                }, 1000);
            }
        } catch (error) {
            console.error('Error fetching offer popup:', error);
        }
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
            sessionStorage.setItem('offerPopupShown', 'true');
        }, 300);
    };

    if (!isVisible || !popup) return null;

    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const imageUrl = `${API_BASE}${popup.image}`;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'
                    }`}
                onClick={handleClose}
            />

            {/* Popup Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className={`relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden pointer-events-auto transform transition-all duration-300 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                        }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-slate-700 rounded-full p-2 shadow-lg transition-all hover:scale-110"
                        aria-label="Close popup"
                    >
                        <FaTimes className="w-5 h-5" />
                    </button>

                    {/* Image Section */}
                    <div className="relative w-full h-64 md:h-80 bg-gradient-to-br from-rose-100 to-purple-100">
                        <img
                            src={imageUrl}
                            alt={popup.heading}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    </div>

                    {/* Content Section */}
                    <div className="p-8 md:p-10">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4 leading-tight">
                            {popup.heading}
                        </h2>
                        <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                            {popup.description}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                to={popup.buttonLink || '/products'}
                                onClick={handleClose}
                                className="flex-1 bg-gradient-to-r from-rose-600 to-pink-600 text-white px-8 py-4 rounded-xl font-semibold text-center hover:from-rose-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                {popup.buttonText || 'Shop Now'}
                            </Link>
                            <button
                                onClick={handleClose}
                                className="sm:w-auto px-6 py-4 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>

                    {/* Decorative Element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-400/20 to-purple-400/20 rounded-full blur-3xl -z-10" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-pink-400/20 to-rose-400/20 rounded-full blur-3xl -z-10" />
                </div>
            </div>
        </>
    );
};

export default OfferPopup;
