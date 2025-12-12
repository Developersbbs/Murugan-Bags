import React, { useState, useEffect, memo } from 'react';
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

  const toggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (productInWishlist) {
        await removeFromWishlist(effectiveId, variantId);
        toast.success('Removed from wishlist');
      } else {
        // Ensure we send the product with the correct ID (main product ID)
        // This fixes the "Invalid product ID" error when wishlisting variants
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

    if (isAddingToCart) return;

    // Check if this is a variant product (handle both old and new structure)
    if (isVariantProduct && variantData) {
      // Add the specific variant directly to cart
      setIsAddingToCart(true);
      try {
        // Create a variant object that matches what the cart expects
        const variantForCart = {
          ...variantData,
          _id: parentProductId, // Use parent product ID
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
    }
    // Check if original product has variants (not expanded)
    else if (product.product_structure === 'variant' && product.product_variants && product.product_variants.length > 0) {
      // For original variant products, navigate to product details page
      navigate(`/product/${slug || _id}`);
    } else {
      // Add simple product directly to cart
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

  const {
    _id,
    name,
    selling_price,
    price,
    image_url,
    averageRating,
    numReviews,
    salePrice,
    slug,
    product_variants,
    product_structure,
    parentProductId: originalParentProductId,
    isVariant,
    _isVariant,
    _variantData,
    _parentProduct,
    _originalProductId,
    attributes,
    sku,
    stock,
    status,
    published,
    warranty,
    isCodAvailable,
    isFreeShipping,
    showRatings
  } = product;

  // Determine the correct product link (handle both old and new structure)
  const isVariantProduct = isVariant || _isVariant;

  // DEBUG: Log product data for variants
  if (isVariantProduct) {
    console.log('ProductCard Variant Debug:', {
      name,
      isVariantProduct,
      image_url,
      _variantData,
      variantData: product.variantData
    });
  }

  const variantData = _variantData || product.variantData;
  const parentProductId = _originalProductId || originalParentProductId;
  // Prioritize parent ID if available (for variants), otherwise use slug or ID
  const productLink = parentProductId ? `/product/${parentProductId}` : `/product/${slug || _id}`;

  // Handle different price field scenarios
  let displayPrice = null;
  let displayImage = null;

  // For variant products (transformed), use variant-specific data
  if (isVariantProduct && variantData) {
    displayPrice = variantData.selling_price || variantData.salesPrice || selling_price || salePrice || price;

    // Use variant image if available, otherwise fall back to main product image
    if (variantData.images && variantData.images.length > 0) {
      displayImage = variantData.images[0];
    }
  }
  // For original variant products (not transformed), use the first variant's data
  else if (product_structure === 'variant' && product_variants && product_variants.length > 0) {
    const firstVariant = product_variants[0];
    displayPrice = firstVariant.selling_price || firstVariant.salesPrice || firstVariant.cost_price;

    // Use variant image if available, otherwise fall back to main product image
    if (firstVariant.images && firstVariant.images.length > 0) {
      displayImage = firstVariant.images[0];
    }
  }
  // Otherwise use the product's direct price fields
  else {
    displayPrice = salePrice || selling_price || price;
  }
  // Create a data URL for a simple SVG placeholder
  const getPlaceholderImage = () => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'>
      <rect width='300' height='200' fill='#f3f4f6'/>
      <text x='50%' y='50%' font-size='14' text-anchor='middle' dominant-baseline='middle' fill='9ca3af' font-family='sans-serif'>
        No Image Available
      </text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // Get the first valid image URL or use placeholder
  const getMainImage = () => {
    // Helper to extract URL from an image item (string or object)
    const extractUrl = (img) => {
      if (!img) return null;

      let url = null;
      if (typeof img === 'string') {
        url = img;
      } else if (typeof img === 'object') {
        url = img.url || img.secure_url || img.path;
      }

      if (!url) return null;

      // Check if it's already a full URL
      if (url.startsWith('http') || url.startsWith('data:')) {
        return url;
      }

      // Check if it already has /uploads/ prefix
      if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
        return url.startsWith('/') ? url : `/${url}`;
      }

      // Default to /uploads/ prefix for relative paths
      return `/uploads/${url}`;
    };

    // 1. Try to use the specific display image determined earlier (from variant)
    if (displayImage) {
      const url = extractUrl(displayImage);
      if (url) return url;
    }

    // 2. Try to use the product's main image_url array
    if (image_url && Array.isArray(image_url) && image_url.length > 0) {
      // Find the first valid image URL
      for (const img of image_url) {
        const url = extractUrl(img);
        if (url) return url;
      }
    }
    // Handle case where image_url might be a single string
    else if (typeof image_url === 'string' && image_url) {
      return extractUrl(image_url);
    }

    // 3. Fallback to placeholder
    return getPlaceholderImage();
  };

  const mainImage = getMainImage();
  const ratingValue = averageRating || 0;

  // Format variant attributes for display
  const getVariantAttributes = () => {
    if (!isVariantProduct || !variantData || !variantData.attributes) return null;

    const attrs = Object.entries(variantData.attributes).map(([key, value]) => {
      return `${key}: ${value}`;
    });

    return attrs.length > 0 ? attrs.join(', ') : null;
  };

  const variantAttributes = getVariantAttributes();

  const handleShare = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const fullUrl = `${window.location.origin}${productLink}`;

    navigator.clipboard.writeText(fullUrl).then(() => {
      toast.success('Product link copied to clipboard!');
    }).catch((err) => {
      console.error('Failed to copy: ', err);
      toast.error('Failed to copy link');
    });
  };

  return viewMode === 'list' ? (
    // List View Layout
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 p-6 ${className}`}>
      <div className="flex items-center space-x-4">
        {/* Image */}
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

          {/* Variant Attributes */}
          {variantAttributes && (
            <div className="mb-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">
                {variantAttributes}
              </span>
            </div>
          )}

          {/* SKU for variants */}
          {isVariantProduct && sku && (
            <div className="mb-2">
              <span className="text-xs text-gray-500">SKU: {sku}</span>
            </div>
          )}

          {/* Stock for variants */}
          {isVariantProduct && stock !== undefined && (
            <div className="mb-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stock > 0
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
                }`}>
                {stock > 0 ? `In Stock (${stock})` : 'Out of Stock'}
              </span>
            </div>
          )}

          {/* Rating and Reviews */}
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
              <span className="text-xs text-gray-500">({numReviews || 0} reviews)</span>
            </div>
          )}

          {/* Price */}
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

          {/* Stock Status */}
          <div className="flex items-center text-xs text-gray-600 mb-3">
            <div className={`w-2 h-2 rounded-full mr-2 ${product.stockQuantity > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
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
        </div>
      </div>
    </div>
  ) : (
    // Grid View Layout (Simple Design)
    <div className={`bg-white rounded-lg shadow-sm h-full flex flex-col border border-gray-200 overflow-hidden ${className}`}>
      <div className="relative">
        <Link to={productLink} className="block relative aspect-[4/3] overflow-hidden bg-gray-50">
          <LazyImage
            src={mainImage}
            alt={name}
            className="w-full h-full object-cover"
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
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {salePrice && (
            <span className="bg-rose-500 text-white text-xs font-medium px-2 py-1 rounded">
              Sale
            </span>
          )}
          {/* You can add a 'New' badge logic here if available in product data */}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={toggleWishlist}
          className={`absolute top-4 right-4 p-2 rounded-full bg-white border border-gray-200 z-10 ${productInWishlist ? 'text-rose-500' : 'text-gray-400'}`}
          title={productInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill={productInWishlist ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* Rating */}
        {showRatings !== false && (
          <div className="flex items-center space-x-1 mb-2">
            <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-bold text-gray-900 text-sm">{ratingValue > 0 ? ratingValue.toFixed(1) : '0.0'}</span>
            <span className="text-gray-400 text-sm ml-1">({numReviews || 0}+ reviews)</span>
          </div>
        )}

        {/* Title */}
        <Link to={productLink} className="mb-2">
          <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
            {name}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-baseline space-x-2 mb-3">
          <span className="text-xl font-bold text-gray-900">
            ₹{displayPrice ? Number(displayPrice).toFixed(0) : '0'}
          </span>
          {(salePrice || (product_structure === 'variant' && product_variants?.[0]?.selling_price && product_variants[0].cost_price > product_variants[0].selling_price)) && (
            <span className="text-gray-400 line-through text-sm font-medium">
              ₹{product_structure === 'variant' ? product_variants?.[0]?.cost_price?.toFixed(0) : selling_price?.toFixed(0) || price?.toFixed(0) || '0'}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <div className="mt-auto pt-2">
          <button
            onClick={handleAddToCart}
            disabled={isAddingToCart || (stock !== undefined && stock <= 0) || status === 'out_of_stock'}
            className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors font-medium text-sm ${(stock !== undefined && stock <= 0) || status === 'out_of_stock'
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 hover:bg-gray-800 text-white'
              }`}
          >
            {isAddingToCart ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Adding...</span>
              </>
            ) : (stock !== undefined && stock <= 0) || status === 'out_of_stock' ? (
              <span>Out of Stock</span>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Variant Selection Modal
  return (
    <>
      {viewMode === 'list' ? (
        // List View Layout
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 p-4">
          <div className="flex items-center space-x-4">
            {/* Image */}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2 hover:text-blue-600 transition-colors duration-200">
                  {name}
                </h3>
              </Link>

              {/* Rating and Reviews */}
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
                <span className="text-xs text-gray-500">({numReviews || 0} reviews)</span>
              </div>

              {/* Price */}
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

              {/* Stock Status */}
              <div className="flex items-center text-xs text-gray-600 mb-3">
                <div className={`w-2 h-2 rounded-full mr-2 ${product.stockQuantity > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
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
                disabled={isAddingToCart || product.stockQuantity <= 0}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${productInCart
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isAddingToCart ? 'Adding...' : productInCart ? 'In Cart' :
                  (product.product_structure === 'variant' && product.product_variants && product.product_variants.length > 0) ?
                    'Select Options' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Grid View Layout (original design)
        <div className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 h-full flex flex-col border border-gray-100 hover:border-blue-200">
          <Link to={productLink} className="flex-1 flex flex-col">
            <div className="relative flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 h-72 overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}></div>
              </div>

              <LazyImage
                src={mainImage}
                alt={name}
                className="max-w-full max-h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500 filter group-hover:brightness-110"
                placeholder={
                  <div className="flex items-center justify-center h-full">
                    <svg className="w-8 h-8 text-gray-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                }
              />

              {/* Wishlist and Sale Badge */}
              <div className="absolute top-4 right-4 flex flex-col space-y-2">
                <button
                  onClick={toggleWishlist}
                  className={`p-3 rounded-full shadow-xl backdrop-blur-sm transition-all duration-300 transform hover:scale-125 ${productInWishlist
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white animate-pulse'
                    : 'bg-white/95 text-gray-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-500'
                    }`}
                  aria-label={productInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill={productInWishlist ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
                {salePrice && (
                  <div className="relative">
                    <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-3 py-2 rounded-full shadow-xl animate-bounce">
                      🔥 SALE
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-400 rounded-full animate-ping opacity-75"></div>
                  </div>
                )}
              </div>

              {/* Stock Status */}
              <div className="absolute top-4 left-4">
                {(stock !== undefined && stock <= 0) || (status === 'out_of_stock') ? (
                  <div className="bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg uppercase">
                    SOLD OUT
                  </div>
                ) : (
                  <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    ✓ In Stock
                  </div>
                )}
              </div>

              {/* Quick Action Buttons */}
              <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                <div className="flex justify-center space-x-2">
                  <button className="bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg hover:bg-white transition-colors duration-200">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button className="bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg hover:bg-white transition-colors duration-200">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 h-12 overflow-hidden group-hover:text-blue-600 transition-colors duration-200">
                {name}
              </h3>

              {/* Rating and Reviews */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center bg-gradient-to-r from-yellow-50 to-orange-50 px-2 py-1 rounded-lg">
                  <div className="flex items-center mr-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-3 h-3 ${star <= Math.round(ratingValue) ? 'text-yellow-500' : 'text-gray-300'
                          } transition-colors duration-200`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gray-700">
                    {ratingValue > 0 ? ratingValue.toFixed(1) : '0.0'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {numReviews || 0} reviews
                </div>
              </div>

              {/* Product Features */}
              <div className="flex flex-wrap gap-1 mb-3">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Fast Delivery
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Warranty
                </span>
              </div>
            </div>
          </Link>

          {/* Pricing and Actions */}
          <div className="px-4 pb-4">
            {/* Price Section */}
            <div className="mb-4 bg-gradient-to-r from-gray-50 to-blue-50 p-3 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline space-x-2">
                  {/* Show original price with strikethrough if there's a sale */}
                  {(salePrice || (product_structure === 'variant' && product_variants?.[0]?.selling_price && product_variants[0].cost_price > product_variants[0].selling_price)) && (
                    <span className="text-lg text-gray-400 line-through font-medium">
                      ₹{product_structure === 'variant' ? product_variants?.[0]?.cost_price?.toFixed(2) : selling_price?.toFixed(2) || price?.toFixed(2) || '0.00'}
                    </span>
                  )}
                  {/* Show current price */}
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    ₹{displayPrice ? Number(displayPrice).toFixed(2) : '0.00'}
                  </span>
                </div>
                {salePrice && (
                  <div className="flex flex-col items-end">
                    <span className="text-xs bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full font-bold shadow-lg">
                      {Math.round(((selling_price || price) - salePrice) / (selling_price || price) * 100)}% OFF
                    </span>
                    <span className="text-xs text-green-600 font-semibold mt-1">
                      Save ₹{((selling_price || price) - salePrice).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Price Benefits */}
              <div className="flex items-center space-x-4 text-xs text-gray-600">
                <div className="flex items-center">
                  <svg className="w-3 h-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Free Shipping
                </div>
                <div className="flex items-center">
                  <svg className="w-3 h-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  COD Available
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex space-x-3">
              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className={`flex-1 px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl ${productInCart
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-2 border-emerald-300 shadow-emerald-200 hover:from-emerald-600 hover:to-green-600'
                  : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-indigo-200/50'
                  } ${isAddingToCart ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}`}
              >
                {isAddingToCart ? (
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Adding...</span>
                  </span>
                ) : productInCart ? (
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>In Cart</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span>
                      {(product.product_structure === 'variant' && product.product_variants && product.product_variants.length > 0) ?
                        'Select Options' : 'Add to Cart'}
                    </span>
                  </span>
                )}
              </button>

              {/* View Details Button */}
              <Link
                to={productLink}
                className="px-6 py-4 border-2 border-gray-200 hover:border-indigo-300 rounded-2xl text-sm font-bold text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-300 text-center flex items-center justify-center space-x-2 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>View</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default ProductCard;
