import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';

const FlipkartImageGallery = ({ images = [], productName }) => {
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showZoom, setShowZoom] = useState(false);
    const [lensPosition, setLensPosition] = useState({ x: 0, y: 0 });
    const [isImageLoading, setIsImageLoading] = useState(true);
    const imageContainerRef = useRef(null);
    const rafRef = useRef(null);
    const hideTimeoutRef = useRef(null);

    // Reset selection when images array changes (e.g. color variant change)
    useEffect(() => {
        setSelectedImageIndex(0);
    }, [images]);

    // If no images, show placeholder
    if (!images || images.length === 0) {
        return (
            <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                <img
                    src="/images/products/placeholder-product.svg"
                    alt={productName}
                    className="w-full h-full object-contain p-4"
                />
            </div>
        );
    }

    const currentImage = images[selectedImageIndex] || images[0];
    const LENS_SIZE = 100;

    // Handle image load start/end for transitions
    const handleImageLoad = () => {
        setIsImageLoading(false);
    };

    // When current image changes, set loading to true
    useEffect(() => {
        setIsImageLoading(true);
    }, [currentImage]);


    // Handle mouse movement for zoom with throttling
    const handleMouseMove = useCallback((e) => {
        if (!imageContainerRef.current) return;

        // Cancel any pending hide timeout
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }

        // Ensure zoom is shown
        if (!showZoom) {
            setShowZoom(true);
        }

        // Cancel previous animation frame
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }

        // Schedule update for next animation frame
        rafRef.current = requestAnimationFrame(() => {
            if (!imageContainerRef.current) return;

            const rect = imageContainerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check if mouse is within bounds
            if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                const lensX = Math.max(0, Math.min(x - LENS_SIZE / 2, rect.width - LENS_SIZE));
                const lensY = Math.max(0, Math.min(y - LENS_SIZE / 2, rect.height - LENS_SIZE));
                setLensPosition({ x: lensX, y: lensY });
            }
        });
    }, [showZoom, LENS_SIZE]);

    const handleMouseEnter = useCallback(() => {
        // Clear any pending hide timeout
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        setShowZoom(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        // Use a small delay before hiding to prevent flickering
        hideTimeoutRef.current = setTimeout(() => {
            setShowZoom(false);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        }, 50); // 50ms delay to prevent rapid toggling
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

    // Calculate zoom preview background position - memoized
    const zoomBackgroundPosition = useMemo(() => {
        if (!imageContainerRef.current) return '0% 0%';

        const rect = imageContainerRef.current.getBoundingClientRect();
        const percentX = (lensPosition.x / (rect.width - LENS_SIZE)) * 100;
        const percentY = (lensPosition.y / (rect.height - LENS_SIZE)) * 100;

        return `${Math.max(0, Math.min(100, percentX))}% ${Math.max(0, Math.min(100, percentY))}%`;
    }, [lensPosition.x, lensPosition.y, LENS_SIZE, showZoom]); // Added showZoom dependency to ensure update

    return (
        <div className="flex gap-4">
            {/* Vertical Thumbnail Strip */}
            <div className="hidden md:flex flex-col gap-2 w-16 lg:w-20">
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-1">
                    {images.map((image, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedImageIndex(index)}
                            onMouseEnter={() => setSelectedImageIndex(index)}
                            className={`relative flex-shrink-0 w-full aspect-square rounded-md overflow-hidden border-2 transition-all duration-200 ${selectedImageIndex === index
                                ? 'border-blue-600 ring-2 ring-blue-100'
                                : 'border-gray-200 hover:border-blue-300'
                                }`}
                        >
                            <img
                                src={image}
                                alt={`${productName} thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.src = '/images/products/placeholder-product.svg';
                                }}
                            />
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Image Area */}
            <div className="flex-1 flex gap-4">
                {/* Main Image Container */}
                <div className="flex-1 relative bg-white rounded-lg border border-gray-200 overflow-hidden min-h-[300px] lg:min-h-[400px]">
                    <div
                        ref={imageContainerRef}
                        className="relative w-full aspect-square cursor-crosshair select-none"
                        onMouseMove={handleMouseMove}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        {/* Loading State / Shimmer */}
                        {isImageLoading && (
                            <div className="absolute inset-0 z-10 bg-gray-100 flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 bg-[length:200%_100%] animate-shimmer" />
                                <div className="relative z-10 flex flex-col items-center">
                                    <svg className="w-10 h-10 text-gray-300 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                        )}

                        <img
                            key={currentImage} // Force re-render for animation
                            src={currentImage}
                            alt={`${productName} - View ${selectedImageIndex + 1}`}
                            className={`w-full h-full object-contain p-4 select-none pointer-events-none transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                            draggable="false"
                            onLoad={handleImageLoad}
                            onError={(e) => {
                                e.target.src = '/images/products/placeholder-product.svg';
                                setIsImageLoading(false);
                            }}
                        />

                        {/* Zoom Lens Overlay */}
                        {showZoom && !isImageLoading && (
                            <div
                                className="absolute w-[100px] h-[100px] border border-blue-400 bg-blue-50 bg-opacity-20 backdrop-blur-[1px] pointer-events-none shadow-lg rounded-sm"
                                style={{
                                    left: `${lensPosition.x}px`,
                                    top: `${lensPosition.y}px`,
                                    transform: 'translate3d(0,0,0)' // Hardware acceleration
                                }}
                            />
                        )}
                    </div>

                    {/* Mobile Thumbnail Strip */}
                    <div className="md:hidden mt-4 px-4 pb-4">
                        <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pb-2">
                            {images.map((image, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedImageIndex(index)}
                                    className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all duration-200 ${selectedImageIndex === index
                                        ? 'border-blue-600 ring-1 ring-blue-100 scale-105'
                                        : 'border-gray-200'
                                        }`}
                                >
                                    <img
                                        src={image}
                                        alt={`${productName} thumbnail ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.src = '/images/products/placeholder-product.svg';
                                        }}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Zoom Preview Panel */}
                <div
                    className={`hidden lg:block absolute left-full top-0 ml-4 z-50 w-[400px] xl:w-[500px] h-[500px] bg-white rounded-lg border-2 border-gray-100 overflow-hidden shadow-2xl transition-all duration-300 origin-left ${showZoom && !isImageLoading ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 -translate-x-4 pointer-events-none'
                        }`}
                >
                    <div
                        className="w-full h-full"
                        style={{
                            backgroundImage: `url(${currentImage})`,
                            backgroundSize: '200%',
                            backgroundPosition: zoomBackgroundPosition,
                            backgroundRepeat: 'no-repeat',
                            backgroundColor: '#fff',
                        }}
                    />
                </div>
            </div>

            <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s linear infinite;
        }
      `}</style>
        </div>
    );
};

export default FlipkartImageGallery;
