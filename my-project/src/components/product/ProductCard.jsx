import React, { useState, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import toast from 'react-hot-toast';
import LazyImage from '../common/LazyImage';

const ProductCard = memo(({ product, viewMode = 'grid', className = '' }) => {
  const { addToCart, isInCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Determine the effective product ID (use parent ID for variants to ensure valid ObjectId)
  const effectiveId = product._originalProductId || product.parentProductId || product._id;
  // Determine variant ID if this card represents a specific variant
  const variantId = (product.isVariant || product._isVariant) ? product._id : (product.variant_id || null);

  const productInWishlist = isInWishlist(effectiveId, variantId);
  const productInCart = isInCart(effectiveId);

  const {
    _id,
    name,
    selling_price,
    price,
    image_url,
    averageRating,
    totalReviews,
    salePrice,
    slug,
    product_variants,
    product_structure,
    parentProductId: originalParentProductId,
    isVariant,
    _isVariant,
    _variantData,
    _originalProductId,
    attributes,
    sku,
    baseStock,
    minStock,
    status,
    showRatings
  } = product;

  const isVariantProduct = isVariant || _isVariant;
  const variantData = _variantData || product.variantData;
  const parentProductId = _originalProductId || originalParentProductId;
  const productLink = parentProductId ? `/product/${parentProductId}` : `/product/${slug || _id}`;

  // Handle stock properly
  // In transformed products (like in ProductListPage), stock is passed as baseStock
  const currentStock = baseStock !== undefined ? baseStock : product.stock;
  const isOutOfStock = currentStock <= (minStock || 0) || status === 'out_of_stock';

  const toggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (productInWishlist) {
        await removeFromWishlist(effectiveId, variantId);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist({
          ...product,
          _id: effectiveId,
          variant_id: variantId
        });
        toast.success('Added to wishlist');
      }
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAddingToCart || isOutOfStock) return;

    if (isVariantProduct && variantData) {
      setIsAddingToCart(true);
      try {
        const variantForCart = {
          ...variantData,
          _id: parentProductId,
          name: product.originalName || product.name,
          description: product.originalDescription || product.description,
          categories: product.originalCategories || product.categories
        };

        await addToCart(variantForCart, variantData, 1);
        toast.success('Added to cart');
      } catch (error) {
        toast.error('Failed to add to cart');
      } finally {
        setIsAddingToCart(false);
      }
    } else if (product.product_structure === 'variant' && product.product_variants && product.product_variants.length > 0) {
      navigate(productLink);
    } else {
      setIsAddingToCart(true);
      try {
        await addToCart(product, null, 1);
        toast.success('Added to cart');
      } catch (error) {
        toast.error('Failed to add to cart');
      } finally {
        setIsAddingToCart(false);
      }
    }
  };

  let displayPrice = null;
  let displayImage = null;

  if (isVariantProduct && variantData) {
    displayPrice = variantData.selling_price || variantData.salesPrice || selling_price || salePrice || price;
    if (variantData.images && variantData.images.length > 0) {
      displayImage = variantData.images[0];
    }
  } else if (product_structure === 'variant' && product_variants && product_variants.length > 0) {
    const firstVariant = product_variants[0];
    displayPrice = firstVariant.selling_price || firstVariant.salesPrice || firstVariant.cost_price;
    if (firstVariant.images && firstVariant.images.length > 0) {
      displayImage = firstVariant.images[0];
    }
  } else {
    displayPrice = salePrice || selling_price || price;
  }

  const getPlaceholderImage = () => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'>
      <rect width='300' height='200' fill='#f3f4f6'/>
      <text x='50%' y='50%' font-size='14' text-anchor='middle' dominant-baseline='middle' fill='9ca3af' font-family='sans-serif'>
        No Image Available
      </text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const getMainImage = () => {
    const extractUrl = (img) => {
      if (!img) return null;
      let url = null;
      if (typeof img === 'string') {
        url = img;
      } else if (typeof img === 'object') {
        url = img.url || img.secure_url || img.path;
      }
      if (!url) return null;
      if (url.startsWith('http') || url.startsWith('data:')) return url;
      if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
        return url.startsWith('/') ? url : `/${url}`;
      }
      return `/uploads/${url}`;
    };

    if (displayImage) {
      const url = extractUrl(displayImage);
      if (url) return url;
    }

    if (image_url && Array.isArray(image_url) && image_url.length > 0) {
      for (const img of image_url) {
        const url = extractUrl(img);
        if (url) return url;
      }
    } else if (typeof image_url === 'string' && image_url) {
      return extractUrl(image_url);
    }

    // Fallback to product.images if image_url is missing
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      for (const img of product.images) {
        const url = extractUrl(img);
        if (url) return url;
      }
    }

    // Fallback to single image property
    if (product.image) {
      return extractUrl(product.image);
    }

    return getPlaceholderImage();
  };

  const mainImage = getMainImage();
  const ratingValue = averageRating || 0;

  const getVariantAttributes = () => {
    if (!isVariantProduct || !variantData || !variantData.attributes) return null;
    const attrs = Object.entries(variantData.attributes).map(([key, value]) => `${key}: ${value}`);
    return attrs.length > 0 ? attrs.join(', ') : null;
  };

  const variantAttributes = getVariantAttributes();

  return viewMode === 'list' ? (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 p-6 ${className}`}>
      <div className="flex items-center space-x-4">
        <Link to={productLink} className="flex-shrink-0">
          <div className="relative w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden">
            <LazyImage
              src={mainImage}
              alt={name}
              className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-200"
              placeholder={
                <div className="flex items-center justify-center h-full">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              }
            />
            {salePrice && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                Sale
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Link to={productLink}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2 hover:text-rose-600 transition-colors duration-200">
              {name}
            </h3>
          </Link>

          {variantAttributes && (
            <div className="mb-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">
                {variantAttributes}
              </span>
            </div>
          )}

          {isVariantProduct && sku && (
            <div className="mb-2">
              <span className="text-xs text-gray-500">SKU: {sku}</span>
            </div>
          )}

          {/* Corrected Stock for variants and list view */}
          <div className="mb-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${!isOutOfStock
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
              }`}>
              {!isOutOfStock ? `In Stock ${currentStock !== undefined ? `(${currentStock})` : ''}` : 'Out of Stock'}
            </span>
          </div>

          {showRatings !== false && (
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex items-center bg-yellow-50 px-2 py-1 rounded">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-3 h-3 ${i < Math.round(ratingValue) ? 'text-yellow-500' : 'text-gray-300'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="text-xs font-medium text-gray-700 ml-1">
                  {ratingValue > 0 ? ratingValue.toFixed(1) : '0.0'}
                </span>
              </div>
              <span className="text-xs text-gray-500">({totalReviews || 0} reviews)</span>
            </div>
          )}

          <div className="flex items-center space-x-3 mb-3">
            <div className="flex items-baseline space-x-2">
              {(salePrice || (product_structure === 'variant' && product_variants?.[0]?.selling_price && product_variants[0].cost_price > product_variants[0].selling_price)) && (
                <span className="text-sm text-gray-400 line-through">
                  ₹{product_structure === 'variant' ? product_variants?.[0]?.cost_price?.toFixed(2) : selling_price?.toFixed(2) || price?.toFixed(2) || '0.00'}
                </span>
              )}
              <span className="text-xl font-bold text-gray-900">
                ₹{displayPrice ? Number(displayPrice).toFixed(2) : '0.00'}
              </span>
            </div>
            {salePrice && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                {Math.round(((selling_price || price) - salePrice) / (selling_price || price) * 100)}% OFF
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-2">
          <button
            onClick={toggleWishlist}
            className={`p-2 rounded-lg border transition-all duration-200 ${productInWishlist
              ? 'bg-red-50 border-red-200 text-red-600'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            title={productInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <svg className="w-5 h-5" fill={productInWishlist ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          <button
            onClick={handleAddToCart}
            disabled={isAddingToCart || isOutOfStock}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${productInCart
              ? 'bg-green-600 text-white'
              : 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isAddingToCart ? 'Adding...' : isOutOfStock ? 'Out of Stock' : productInCart ? 'In Cart' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  ) : (
    // Grid View Layout
    <div className={`bg-white rounded-lg shadow-sm h-full flex flex-col border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300 ${className}`}>
      <div className="relative">
        <Link to={productLink} className="block relative aspect-[4/3] overflow-hidden bg-gray-50">
          <LazyImage
            src={mainImage}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            placeholder={
              <div className="flex items-center justify-center h-full bg-gray-50">
                <svg className="w-10 h-10 text-gray-300 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            }
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {salePrice && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">
              Sale
            </span>
          )}
          {isOutOfStock ? (
            <span className="bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">
              Sold Out
            </span>
          ) : (
            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">
              In Stock
            </span>
          )}
        </div>

        <button
          onClick={toggleWishlist}
          className={`absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm border border-gray-100 z-10 shadow-sm transition-all duration-300 ${productInWishlist ? 'text-rose-500' : 'text-gray-400 hover:text-rose-500'}`}
          title={productInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill={productInWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1">
        {showRatings !== false && (
          <div className="flex items-center space-x-1 mb-2">
            <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-bold text-gray-900 text-xs">{ratingValue > 0 ? ratingValue.toFixed(1) : '0.0'}</span>
            <span className="text-gray-400 text-[10px] ml-1">({totalReviews || 0})</span>
          </div>
        )}

        <Link to={productLink} className="mb-2 flex-grow">
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug hover:text-rose-600 transition-colors">
            {name}
          </h3>
        </Link>

        {variantAttributes && (
          <p className="text-[10px] text-gray-500 mb-2 truncate italic">{variantAttributes}</p>
        )}

        <div className="flex items-baseline space-x-2 mb-3">
          <span className="text-lg font-bold text-gray-900">
            ₹{displayPrice ? Math.round(Number(displayPrice)) : '0'}
          </span>
          {(salePrice || (product_structure === 'variant' && product_variants?.[0]?.selling_price && product_variants[0].cost_price > product_variants[0].selling_price)) && (
            <span className="text-gray-400 line-through text-xs">
              ₹{product_structure === 'variant' ? Math.round(product_variants?.[0]?.cost_price) : Math.round(selling_price || price || 0)}
            </span>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          disabled={isAddingToCart || isOutOfStock}
          className={`w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all font-bold text-xs uppercase tracking-wider ${isOutOfStock
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200 active:scale-95'
            }`}
        >
          {isAddingToCart ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Add...</span>
            </>
          ) : isOutOfStock ? (
            <span>Sold Out</span>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

export default ProductCard;
