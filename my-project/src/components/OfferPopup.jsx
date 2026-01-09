import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';

import { API_BASE_URL } from '../config/api';

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
            const API_URL = API_BASE_URL;
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

    const API_BASE = API_BASE_URL.replace('/api', '');
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
                    className={`relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden pointer-events-auto transform transition-all duration-300 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                        }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Background Image */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src={imageUrl}
                            alt={popup.heading}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                        {/* Gradient Overlay for Readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/20" />
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 z-20 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 backdrop-blur-sm transition-all hover:scale-110 border border-white/20"
                        aria-label="Close popup"
                    >
                        <FaTimes className="w-5 h-5" />
                    </button>

                    {/* Content Section */}
                    <div className="relative z-10 p-8 md:p-10 flex flex-col items-center text-center h-full min-h-[400px] justify-end">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight drop-shadow-lg">
                            {popup.heading}
                        </h2>
                        <p className="text-gray-100 text-lg mb-8 leading-relaxed drop-shadow-md max-w-sm">
                            {popup.description}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-col w-full gap-3">
                            <Link
                                to={popup.buttonLink || '/products'}
                                onClick={handleClose}
                                className="w-full bg-white text-slate-900 px-8 py-3.5 rounded-xl font-bold text-lg hover:bg-rose-50 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
                            >
                                {popup.buttonText || 'Shop Now'}
                            </Link>
                            <button
                                onClick={handleClose}
                                className="w-full px-6 py-2 text-white/80 hover:text-white font-medium transition-colors text-sm"
                            >
                                No thanks, maybe later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default OfferPopup;
