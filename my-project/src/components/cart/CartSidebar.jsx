import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { XMarkIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/format';
import CartItem from './CartItem';

const CartSidebar = () => {
    const {
        items: cartItems,
        updateQuantity,
        removeFromCart,
        getTotal,
        loading,
        isSidebarOpen,
        closeSidebar
    } = useCart();

    const subtotal = getTotal();
    const shipping = subtotal > 0 ? (subtotal > 500 ? 0 : 50) : 0;
    const total = subtotal + shipping;

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
                            <ShoppingBagIcon className="w-6 h-6" />
                            <h2 className="text-lg font-bold">
                                Shopping Cart ({cartItems.length})
                            </h2>
                        </div>
                        <button
                            onClick={closeSidebar}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            aria-label="Close cart"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto">
                        {cartItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                <ShoppingBagIcon className="w-16 h-16 text-gray-300 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Your cart is empty
                                </h3>
                                <p className="text-gray-500 mb-6">
                                    Add some products to get started!
                                </p>
                                <Link
                                    to="/products"
                                    onClick={closeSidebar}
                                    className="inline-flex items-center px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors"
                                >
                                    Start Shopping
                                </Link>
                            </div>
                        ) : (
                            <div>
                                {cartItems.map((item, index) => (
                                    <CartItem
                                        key={`${item.id}-${item.cartItemId || item._id || index}-${item.variant ? JSON.stringify(item.variant) : 'no-variant'}`}
                                        item={item}
                                        onUpdateQuantity={updateQuantity}
                                        onRemove={removeFromCart}
                                        loading={loading}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer - Order Summary */}
                    {cartItems.length > 0 && (
                        <div className="border-t bg-gray-50 p-4 space-y-4">
                            {/* Subtotal */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Shipping</span>
                                    <span className="font-medium">
                                        {shipping === 0 ? (
                                            <span className="text-green-600">FREE</span>
                                        ) : (
                                            formatCurrency(shipping)
                                        )}
                                    </span>
                                </div>
                                <div className="border-t pt-2 flex justify-between">
                                    <span className="text-lg font-bold text-gray-900">Total</span>
                                    <span className="text-lg font-bold text-rose-600">
                                        {formatCurrency(total)}
                                    </span>
                                </div>
                            </div>

                            {/* Free shipping notice */}
                            {subtotal > 0 && subtotal < 500 && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-xs text-blue-800">
                                        Add {formatCurrency(500 - subtotal)} more for FREE shipping!
                                    </p>
                                    <div className="mt-2 bg-white rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-blue-500 h-full transition-all duration-300"
                                            style={{ width: `${(subtotal / 500) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Checkout Button */}
                            <Link
                                to="/checkout"
                                onClick={closeSidebar}
                                className="block w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-center font-bold py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                            >
                                Proceed to Checkout
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

export default CartSidebar;
