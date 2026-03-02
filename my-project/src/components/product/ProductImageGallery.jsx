import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Navigation, Thumbs } from 'swiper/modules';
import InnerImageZoom from 'react-inner-image-zoom';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';

// Import InnerImageZoom styles
import 'react-inner-image-zoom/lib/styles.min.css';

// Custom hook for detecting mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Standard mobile breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

const ProductImageGallery = ({ images = [], productName }) => {
    const [thumbsSwiper, setThumbsSwiper] = useState(null);
    const isMobile = useIsMobile();

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

    return (
        <div className="product-gallery space-y-4">
            {/* Main Image Slider */}
            <div className="w-full bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                <Swiper
                    style={{
                        '--swiper-navigation-color': '#4f46e5',
                        '--swiper-pagination-color': '#4f46e5',
                    }}
                    spaceBetween={10}
                    navigation={true}
                    thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
                    modules={[FreeMode, Navigation, Thumbs]}
                    className="mySwiper2 w-full aspect-square"
                >
                    {images.map((img, index) => (
                        <SwiperSlide key={index} className="bg-white flex items-center justify-center">
                            <div className="w-full h-full flex items-center justify-center p-2">
                                {isMobile ? (
                                    // On mobile: just show a regular image without zoom
                                    <img
                                        src={img}
                                        alt={`${productName} - View ${index + 1}`}
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    // On desktop: use InnerImageZoom with hover effect
                                    <InnerImageZoom
                                        src={img}
                                        zoomSrc={img}
                                        alt={`${productName} - View ${index + 1}`}
                                        zoomType="hover"
                                        zoomPreload={true}
                                        className="w-full h-full object-contain"
                                        hideHint={true}
                                    />
                                )}
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>

            {/* Thumbnail Slider */}
            {images.length > 1 && (
                <Swiper
                    onSwiper={setThumbsSwiper}
                    spaceBetween={10}
                    slidesPerView={4}
                    freeMode={true}
                    watchSlidesProgress={true}
                    modules={[FreeMode, Navigation, Thumbs]}
                    className="mySwiper thumbs-gallery"
                    style={{ height: 'auto', minHeight: '80px' }}
                    breakpoints={{
                        320: {
                            slidesPerView: 3,
                            spaceBetween: 8
                        },
                        480: {
                            slidesPerView: 4,
                            spaceBetween: 10
                        },
                        640: {
                            slidesPerView: 4,
                            spaceBetween: 10
                        },
                        768: {
                            slidesPerView: 5,
                            spaceBetween: 12
                        },
                        1024: {
                            slidesPerView: 5,
                            spaceBetween: 12
                        }
                    }}
                >
                    {images.map((img, index) => (
                        <SwiperSlide key={index} className="cursor-pointer rounded-md overflow-hidden border border-gray-200 hover:border-indigo-500 transition-colors">
                            <div className="w-full h-full bg-white flex items-center justify-center aspect-square">
                                <img
                                    src={img}
                                    alt={`Thumbnail ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            )}

            <style jsx global>{`
        .mySwiper .swiper-slide {
          opacity: 0.6;
          transition: opacity 0.3s;
        }
        .mySwiper .swiper-slide-thumb-active {
          opacity: 1;
          border-color: #4f46e5;
        }
        .iiz__img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        /* Mobile optimizations */
        @media (max-width: 767px) {
          .product-gallery .swiper-button-next,
          .product-gallery .swiper-button-prev {
            display: none;
          }
          
          .product-gallery .swiper-pagination {
            display: block;
          }
          
          .thumbs-gallery {
            margin-top: 8px;
          }
          
          .thumbs-gallery .swiper-slide {
            height: auto;
          }
        }
        
        /* Desktop optimizations */
        @media (min-width: 768px) {
          .product-gallery .swiper-pagination {
            display: none;
          }
        }
      `}</style>
        </div>
    );
};

export default ProductImageGallery;