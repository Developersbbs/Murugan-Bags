import React from 'react';
import { useGetProductsQuery } from '../../redux/services/products';
import ProductCard from './ProductCard';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const RelatedProducts = ({ currentProduct }) => {
    const { data: productsData, isLoading } = useGetProductsQuery({
        limit: 8,
        category: currentProduct?.categories?.[0]?.category?._id,
    });

    const products = productsData?.data || [];

    // Filter out current product and limit to 6 items
    const relatedProducts = products
        .filter(p => p._id !== currentProduct?._id)
        .slice(0, 6);

    const [scrollPosition, setScrollPosition] = React.useState(0);
    const scrollContainerRef = React.useRef(null);

    const scroll = (direction) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const scrollAmount = 300;
        const newPosition = direction === 'left'
            ? scrollPosition - scrollAmount
            : scrollPosition + scrollAmount;

        container.scrollTo({
            left: newPosition,
            behavior: 'smooth'
        });
        setScrollPosition(newPosition);
    };

    if (isLoading) {
        return (
            <div className="py-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">You May Also Like</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (relatedProducts.length === 0) {
        return null;
    }

    return (
        <div className="py-12 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">You May Also Like</h2>
                    <div className="hidden md:flex space-x-2">
                        <button
                            onClick={() => scroll('left')}
                            disabled={scrollPosition <= 0}
                            className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Scroll left"
                        >
                            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
                            aria-label="Scroll right"
                        >
                            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Desktop: Scrollable Row */}
                <div className="hidden md:block relative">
                    <div
                        ref={scrollContainerRef}
                        className="flex space-x-6 overflow-x-auto scrollbar-hide pb-4"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {relatedProducts.map((product) => (
                            <div key={product._id} className="flex-shrink-0 w-64">
                                <ProductCard product={product} viewMode="grid" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mobile: Grid */}
                <div className="md:hidden grid grid-cols-2 gap-4">
                    {relatedProducts.slice(0, 4).map((product) => (
                        <ProductCard key={product._id} product={product} viewMode="grid" />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RelatedProducts;
