import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { XMarkIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/format';
import { getFullImageUrl } from '../../utils/imageUtils';
import toast from 'react-hot-toast';

const WishlistSidebar = () => {
    const {
        items: wishlistItems,
        removeFromWishlist,
        loading,
        isSidebarOpen,
        closeSidebar
    } = useWishlist();

    const { addToCart } = useCart();

    // Lock body scroll when sidebar is open
    useEffect(() => {
        if (isSidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isSidebarOpen]);


    const handleRemoveItem = async (productId, variantId) => {
        try {
            await removeFromWishlist(productId, variantId);
        } catch (error) {
            console.error('Error removing from wishlist:', error);
        }
    };

    const handleMoveToCart = async (item) => {
        try {
            // Logic to find specific variant
            let variantToAdd = null;
            if (item.variant_id && item.product_variants && item.product_variants.length > 0) {
                // 1. Try exact ID match
                variantToAdd = item.product_variants.find(v =>
                    (v._id && v._id.toString() === item.variant_id.toString()) ||
                    (v.id && v.id.toString() === item.variant_id.toString())
                );

                // 2. Fallback: Try to parse index if variant_id looks like "productId-variant-index"
                if (!variantToAdd) {
                    const match = item.variant_id.toString().match(/-variant-(\d+)$/);
                    if (match && match[1]) {
                        const index = parseInt(match[1]);
                        if (index >= 0 && index < item.product_variants.length) {
                            variantToAdd = item.product_variants[index];
                        }
                    }
                }
            }

            // Fallback object to satisfy CartContext if full variant object is missing
            if (!variantToAdd && item.variant_id) {
                variantToAdd = { _id: item.variant_id };
            }

            const productId = item._id || item.id;

            // Add to cart with properly mapped properties
            await addToCart({
                _id: productId,
                name: item.name,
                selling_price: item.price,
                image_url: [item.image],
                product_variants: item.product_variants
            }, variantToAdd, 1);

            // Remove from wishlist
            await removeFromWishlist(productId, item.variant_id);
            toast.success('Moved to cart!');
        } catch (error) {
            console.error('Error moving to cart:', error);
            toast.error('Failed to move to cart');
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-70 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 z-[60]' : 'opacity-0 pointer-events-none z-[60]'
                    }`}
                onClick={closeSidebar}
            />

            {/* Sidebar */}
            <div
                className={`fixed right-0 top-0 h-screen w-full max-w-md bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-rose-600 to-pink-600 text-white">
                        <div className="flex items-center space-x-2">
                            <HeartSolidIcon className="w-6 h-6" />
                            <h2 className="text-lg font-bold">
                                My Wishlist ({wishlistItems.length})
                            </h2>
                        </div>
                        <button
                            onClick={closeSidebar}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            aria-label="Close wishlist"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Wishlist Items */}
                    <div className="flex-1 overflow-y-auto">
                        {wishlistItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                <HeartIcon className="w-16 h-16 text-gray-300 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Your wishlist is empty
                                </h3>
                                <p className="text-gray-500 mb-6">
                                    Save your favorite products here!
                                </p>
                                <Link
                                    to="/products"
                                    onClick={closeSidebar}
                                    className="inline-flex items-center px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors"
                                >
                                    Explore Products
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {wishlistItems.map((item) => (
                                    <div
                                        key={item.wishlistItemId || `${item.id}-${item.variant_id || 'default'}`}
                                        className="p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex gap-4">
                                            {/* Product Image */}
                                            <Link
                                                to={`/product/${item._id || item.id}`}
                                                onClick={closeSidebar}
                                                className="flex-shrink-0"
                                            >
                                                <img
                                                    src={getFullImageUrl(item.image)}
                                                    alt={item.name}
                                                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                                />
                                            </Link>

                                            {/* Product Info */}
                                            <div className="flex-1 min-w-0">
                                                <Link
                                                    to={`/product/${item._id || item.id}`}
                                                    onClick={closeSidebar}
                                                    className="block"
                                                >
                                                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-rose-600 transition-colors">
                                                        {item.name}
                                                    </h3>
                                                </Link>
                                                <p className="text-lg font-bold text-rose-600 mt-1">
                                                    {formatCurrency(item.price)}
                                                </p>

                                                {/* Actions */}
                                                <div className="flex items-center gap-3 mt-3">
                                                    <button
                                                        onClick={() => handleMoveToCart(item)}
                                                        disabled={loading}
                                                        className="flex-1 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Move to Cart
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveItem(item._id || item.id, item.variant_id)}
                                                        disabled={loading}
                                                        className="text-xs text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {wishlistItems.length > 0 && (
                        <div className="border-t bg-gray-50 p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Total Items:</span>
                                <span className="text-lg font-bold text-gray-900">{wishlistItems.length}</span>
                            </div>

                            {/* View All Button */}
                            <Link
                                to="/wishlist"
                                onClick={closeSidebar}
                                className="block w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-center font-bold py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                            >
                                View All Wishlist
                            </Link>

                            {/* Continue Shopping */}
                            <button
                                onClick={closeSidebar}
                                className="block w-full text-gray-600 hover:text-gray-900 text-center font-medium py-2 transition-colors"
                            >
                                Continue Shopping
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default WishlistSidebar;
