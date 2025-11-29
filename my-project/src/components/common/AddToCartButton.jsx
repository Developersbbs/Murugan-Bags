import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { FaShoppingCart, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';

const AddToCartButton = ({ 
  product, 
  variant = null, 
  quantity = 1, 
  className = "",
  children,
  disabled = false 
}) => {
  const { addToCart, isInCart, getItemQuantity } = useCart();
  const [loading, setLoading] = useState(false);

  const handleAddToCart = async () => {
    if (disabled || loading) return;

    setLoading(true);
    try {
      await addToCart(product, variant, quantity);
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    } finally {
      setLoading(false);
    }
  };

  const isProductInCart = isInCart(
    variant ? variant._id : product._id, 
    variant ? variant.attributes : {}
  );

  const currentQuantity = getItemQuantity(
    variant ? variant._id : product._id, 
    variant ? variant.attributes : {}
  );

  const defaultClassName = `
    inline-flex items-center justify-center px-4 py-2 
    bg-blue-600 text-white rounded-md hover:bg-blue-700 
    transition-colors duration-200 disabled:opacity-50 
    disabled:cursor-not-allowed
  `;

  return (
    <button
      onClick={handleAddToCart}
      disabled={disabled || loading}
      className={className || defaultClassName}
      aria-label={`Add ${product.name} to cart`}
    >
      {loading ? (
        <FaSpinner className="animate-spin mr-2" />
      ) : (
        <FaShoppingCart className="mr-2" />
      )}
      {children || (
        <>
          {isProductInCart ? `In Cart (${currentQuantity})` : 'Add to Cart'}
        </>
      )}
    </button>
  );
};

export default AddToCartButton;
