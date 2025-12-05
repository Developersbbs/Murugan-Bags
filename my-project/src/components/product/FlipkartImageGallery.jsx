import React, { useState, useRef, useCallback, useMemo } from 'react';

const FlipkartImageGallery = ({ images = [], productName }) => {
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showZoom, setShowZoom] = useState(false);
    const [lensPosition, setLensPosition] = useState({ x: 0, y: 0 });
    const imageContainerRef = useRef(null);
    const rafRef = useRef(null);
    const hideTimeoutRef = useRef(null);

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
    React.useEffect(() => {
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
    }, [lensPosition.x, lensPosition.y, LENS_SIZE]);

    return (
        <div className="flex gap-4">
            {/* Vertical Thumbnail Strip */}
            <div className="hidden md:flex flex-col gap-2 w-16 lg:w-20">
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {images.map((image, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedImageIndex(index)}
                            onMouseEnter={() => setSelectedImageIndex(index)}
                            className={`relative flex-shrink-0 w-full aspect-square rounded-md overflow-hidden border-2 transition-all duration-200 ${selectedImageIndex === index
                                ? 'border-indigo-500 ring-2 ring-indigo-200'
                                : 'border-gray-200 hover:border-gray-300'
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
                <div className="flex-1 relative bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div
                        ref={imageContainerRef}
                        className="relative w-full aspect-square cursor-crosshair select-none"
                        onMouseMove={handleMouseMove}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        <img
                            src={currentImage}
                            alt={`${productName} - View ${selectedImageIndex + 1}`}
                            className="w-full h-full object-contain p-4 select-none pointer-events-none"
                            draggable="false"
                            onError={(e) => {
                                e.target.src = '/images/products/placeholder-product.svg';
                            }}
                        />

                        {/* Zoom Lens Overlay */}
                        {showZoom && (
                            <div
                                className="absolute w-[100px] h-[100px] border-2 border-gray-400 bg-white bg-opacity-30 pointer-events-none transition-opacity duration-100"
                                style={{
                                    left: `${lensPosition.x}px`,
                                    top: `${lensPosition.y}px`,
                                }}
                            />
                        )}
                    </div>

                    {/* Mobile Thumbnail Strip */}
                    <div className="md:hidden mt-4 px-4 pb-4">
                        <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {images.map((image, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedImageIndex(index)}
                                    className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all duration-200 ${selectedImageIndex === index
                                        ? 'border-indigo-500 ring-2 ring-indigo-200'
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
                    className={`hidden lg:block absolute left-full top-0 ml-4 z-50 w-[400px] xl:w-[500px] h-[500px] bg-white rounded-lg border-2 border-gray-300 overflow-hidden shadow-xl transition-opacity duration-200 ${showZoom ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                >
                    <div
                        className="w-full h-full"
                        style={{
                            backgroundImage: `url(${currentImage})`,
                            backgroundSize: '200%',
                            backgroundPosition: zoomBackgroundPosition,
                            backgroundRepeat: 'no-repeat',
                            imageRendering: '-webkit-optimize-contrast',
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
      `}</style>
        </div>
    );
};

export default FlipkartImageGallery;
