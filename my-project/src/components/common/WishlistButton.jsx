import React, { useState } from 'react';
import { useWishlist } from '../../context/WishlistContext';
import { FaHeart, FaRegHeart, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';

const WishlistButton = ({ 
  product, 
  className = "",
  showText = false,
  disabled = false 
}) => {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [loading, setLoading] = useState(false);

  const isProductInWishlist = isInWishlist(product._id);

  const handleToggleWishlist = async () => {
    if (disabled || loading) return;

    setLoading(true);
    try {
      if (isProductInWishlist) {
        await removeFromWishlist(product._id);
        toast.success(`${product.name} removed from wishlist`);
      } else {
        await addToWishlist(product);
        toast.success(`${product.name} added to wishlist!`);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast.error('Failed to update wishlist');
    } finally {
      setLoading(false);
    }
  };

  const defaultClassName = `
    inline-flex items-center justify-center p-2 
    rounded-full transition-colors duration-200 
    disabled:opacity-50 disabled:cursor-not-allowed
    ${isProductInWishlist 
      ? 'text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100' 
      : 'text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50'
    }
  `;

  return (
    <button
      onClick={handleToggleWishlist}
      disabled={disabled || loading}
      className={className || defaultClassName}
      aria-label={
        isProductInWishlist 
          ? `Remove ${product.name} from wishlist` 
          : `Add ${product.name} to wishlist`
      }
      title={
        isProductInWishlist 
          ? 'Remove from wishlist' 
          : 'Add to wishlist'
      }
    >
      {loading ? (
        <FaSpinner className="animate-spin h-5 w-5" />
      ) : isProductInWishlist ? (
        <FaHeart className="h-5 w-5" />
      ) : (
        <FaRegHeart className="h-5 w-5" />
      )}
      {showText && (
        <span className="ml-2">
          {isProductInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
        </span>
      )}
    </button>
  );
};

export default WishlistButton;
