import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../../utils/format';
import { getFullImageUrl } from '../../utils/imageUtils';
import { addToCart } from '../../utils/cartUtils';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  StarIcon,
  ShoppingCartIcon,
  TruckIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import RatingReview from './RatingReview';
import RelatedProducts from './RelatedProducts';
import SocialShare from '../common/SocialShare';
import FlipkartImageGallery from './FlipkartImageGallery';

const ProductDetails = ({ product, isLoading, isError, onCartUpdate }) => {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [showStickyBar, setShowStickyBar] = useState(false);

  const { addToCart: addToCartContext } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  // Use the passed product data
  const displayProduct = product;

  // Sticky add-to-cart bar on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setShowStickyBar(scrollPosition > 600);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (displayProduct?.product_structure === 'variant' && displayProduct?.product_variants?.length > 0) {
      // Set the first variant as default selected
      setSelectedVariant(displayProduct.product_variants[0]);

      // Initialize selected attributes based on the first variant
      if (displayProduct.product_variants[0].attributes) {
        setSelectedAttributes({ ...displayProduct.product_variants[0].attributes });
      }
    }
  }, [displayProduct]);

  // Handle variant selection based on attributes
  const handleAttributeChange = (attribute, value) => {
    const newAttributes = {
      ...selectedAttributes,
      [attribute]: value
    };
    setSelectedAttributes(newAttributes);

    // Find matching variant
    if (displayProduct?.product_variants) {
      const matchingVariant = displayProduct.product_variants.find(variant => {
        if (!variant.attributes) return false;

        return Object.entries(newAttributes).every(([key, val]) => {
          const attrValue = getAttributeValue(variant.attributes, key);
          return attrValue === val;
        });
      });

      if (matchingVariant) {
        setSelectedVariant(matchingVariant);
      }
    }
  };

  // Helper function to safely get attribute value
  const getAttributeValue = (attributes, key) => {
    if (!attributes) return null;
    // Handle both Map and plain object
    if (attributes instanceof Map) {
      return attributes.get(key);
    }
    return attributes[key];
  };

  // Get available options for a specific attribute
  const getAttributeOptions = (attributeName) => {
    if (!displayProduct?.product_variants) return [];

    const options = new Set();
    displayProduct.product_variants.forEach(variant => {
      const value = getAttributeValue(variant.attributes, attributeName);
      if (value) {
        options.add(value);
      }
    });
    return Array.from(options);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (isError || !displayProduct) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800">Product Not Found</h1>
          <p className="text-gray-600 mt-2">The product you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // Determine which price and stock to show
  const displayPrice = displayProduct.product_structure === 'simple'
    ? displayProduct.selling_price
    : selectedVariant?.selling_price || 0;

  const displayStock = displayProduct.product_structure === 'simple'
    ? displayProduct.baseStock
    : selectedVariant?.stock || 0;

  // Stock status
  const getStockStatus = () => {
    if (displayProduct.product_type === 'digital') {
      return { status: 'In Stock', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    }
    if (displayStock > 10) {
      return { status: 'In Stock', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    } else if (displayStock > 0) {
      return { status: `Only ${displayStock} left!`, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
    } else {
      return { status: 'Out of Stock', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    }
  };

  const stockStatus = getStockStatus();


  // Get all available images - prioritize variant images for variant products
  const allImages = useMemo(() => {
    console.log('🖼️ DEBUG: Computing allImages for product:', displayProduct?.name);
    console.log('🖼️ DEBUG: Product structure:', displayProduct?.product_structure);
    console.log('🖼️ DEBUG: Product image_url:', displayProduct?.image_url);
    console.log('🖼️ DEBUG: Selected variant:', selectedVariant);

    // 1. Try selected variant's images
    if (displayProduct?.product_structure === 'variant' && selectedVariant?.images?.length > 0) {
      console.log('🖼️ DEBUG: Using selected variant images:', selectedVariant.images);
      return selectedVariant.images.map(img => getFullImageUrl(img));
    }

    // 2. If selected variant has no images, try to find another variant with the same color that has images
    if (displayProduct?.product_structure === 'variant' && selectedVariant?.attributes?.color) {
      const colorVariant = displayProduct.product_variants.find(v =>
        v.attributes?.color === selectedVariant.attributes.color && v.images?.length > 0
      );
      if (colorVariant) {
        console.log('🖼️ DEBUG: Using color variant images:', colorVariant.images);
        return colorVariant.images.map(img => getFullImageUrl(img));
      }
    }

    // 3. Fallback to main product images
    if (displayProduct?.image_url && displayProduct.image_url.length > 0) {
      console.log('🖼️ DEBUG: Using main product images:', displayProduct.image_url);
      const mappedImages = displayProduct.image_url.map(img => getFullImageUrl(img));
      console.log('🖼️ DEBUG: Mapped image URLs:', mappedImages);
      return mappedImages;
    }

    // 4. Last resort: Use the first variant's images if available (better than placeholder)
    if (displayProduct?.product_structure === 'variant' && displayProduct.product_variants?.[0]?.images?.length > 0) {
      console.log('🖼️ DEBUG: Using first variant images:', displayProduct.product_variants[0].images);
      return displayProduct.product_variants[0].images.map(img => getFullImageUrl(img));
    }

    // 5. Placeholder
    console.log('🖼️ DEBUG: Using placeholder image');
    return ['/images/products/placeholder-product.svg'];
  }, [displayProduct, selectedVariant]);

  // Pre-load images for smoother transitions
  useEffect(() => {
    if (allImages?.length > 0) {
      allImages.forEach(src => {
        const img = new Image();
        img.src = src;
      });
    }
  }, [allImages]);

  const currentImage = allImages[0] || '/images/products/placeholder-product.svg';

  const handleAddToCart = async () => {
    try {
      await addToCartContext(displayProduct, selectedVariant, quantity);
      toast.success(`${quantity} item(s) added to cart!`);
      if (onCartUpdate) onCartUpdate();
    } catch (error) {
      toast.error('Failed to add item to cart');
    }
  };

  const handleWishlistToggle = async () => {
    try {
      const mainProductId = product._id; // Use the main product's ID
      const variantId = selectedVariant ? selectedVariant._id : null;

      if (isInWishlist(mainProductId, variantId)) {
        await removeFromWishlist(mainProductId, variantId);
        toast.success('Removed from wishlist');
      } else {
        // Ensure we pass the currently displayed price and image
        await addToWishlist({
          ...displayProduct,
          _id: mainProductId,
          variant_id: variantId,
          // Explicitly pass selling_price and image_url to ensure context uses them
          selling_price: displayPrice,
          image_url: [currentImage]
        });
        toast.success('Added to wishlist');
      }
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Add to Cart Bar */}
      <div
        className={`fixed top-0 left-0 right-0 bg-white shadow-lg z-40 transition-transform duration-300 ${showStickyBar ? 'translate-y-0' : '-translate-y-full'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src={currentImage}
                alt={displayProduct.name}
                className="w-12 h-12 object-cover rounded"
                onError={(e) => {
                  e.target.src = '/images/products/placeholder-product.svg';
                }}
              />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 truncate max-w-xs">{displayProduct.name}</h3>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(displayPrice)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                >
                  -
                </button>
                <span className="px-4 py-1 border border-gray-300 rounded">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={displayProduct.product_type === 'physical' && displayStock <= 0}
                className={`px-6 py-2 rounded-md text-white font-medium ${displayProduct.product_type === 'physical' && displayStock <= 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700'
                  }`}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <a href="/" className="text-gray-500 hover:text-gray-700">Home</a>
              </li>
              <li>
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
              </li>
              <li>
                <a href="/products" className="text-gray-500 hover:text-gray-700">Products</a>
              </li>
              <li>
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
              </li>
              <li className="text-gray-900 font-medium truncate">{displayProduct.name}</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-8 lg:items-start">
          {/* Left Column: Image Gallery & Actions */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 z-30">
            {/* Image Gallery */}
            <div className="mb-6 relative">
              <FlipkartImageGallery
                images={allImages}
                productName={displayProduct.name}
              />
            </div>

            {/* Action Buttons - Desktop */}
            <div className="hidden lg:flex flex-row gap-4 mt-4">
              <button
                onClick={handleAddToCart}
                disabled={displayProduct.product_type === 'physical' && displayStock <= 0}
                className={`flex-1 flex items-center justify-center rounded-sm border px-6 py-4 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${displayProduct.product_type === 'physical' && displayStock <= 0
                  ? 'bg-gray-300 text-white border-transparent cursor-not-allowed'
                  : 'bg-white border-2 border-rose-600 text-rose-600 hover:bg-rose-50 focus:ring-rose-500'
                  }`}
              >
                <ShoppingCartIcon className="h-5 w-5 mr-2" />
                {displayProduct.product_type === 'physical' && displayStock <= 0
                  ? 'OUT OF STOCK'
                  : 'ADD TO CART'}
              </button>

              <button
                onClick={() => {
                  handleAddToCart();
                  // Ideally redirect to checkout here
                }}
                disabled={displayProduct.product_type === 'physical' && displayStock <= 0}
                className={`flex-1 flex items-center justify-center rounded-sm border border-transparent px-6 py-4 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${displayProduct.product_type === 'physical' && displayStock <= 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-600'
                  }`}
              >
                <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                BUY NOW
              </button>
            </div>
          </div>

          {/* Right Column: Product Details */}
          <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0 lg:col-span-7">
            <div className="flex justify-between items-start">
              <h1 className="text-xl sm:text-2xl font-medium text-gray-900 flex-1">{displayProduct.name}</h1>
              <button
                onClick={handleWishlistToggle}
                className="ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                aria-label={isInWishlist(product._id, selectedVariant?._id) ? "Remove from wishlist" : "Add to wishlist"}
              >
                {isInWishlist(product._id, selectedVariant?._id) ? (
                  <HeartSolidIcon className="h-7 w-7 text-rose-600" />
                ) : (
                  <HeartIcon className="h-7 w-7 text-gray-400 hover:text-rose-600" />
                )}
              </button>
            </div>

            {/* Reviews */}
            {displayProduct.showRatings !== false && (
              <div className="mt-3">
                <h3 className="sr-only">Reviews</h3>
                <div className="flex items-center">
                  <div className="flex items-center bg-green-600 px-2 py-0.5 rounded text-white text-sm font-bold">
                    {displayProduct?.averageRating || 0} <StarSolidIcon className="h-3 w-3 ml-1 text-white" />
                  </div>
                  <p className="sr-only">{displayProduct?.averageRating || 0} out of 5 stars</p>
                  <a href="#ratings" className="ml-3 text-sm font-medium text-gray-500 hover:text-gray-600">
                    {displayProduct?.totalReviews > 0 && (
                      <span className="text-gray-500 font-medium">
                        {displayProduct?.totalReviews} Ratings & Reviews
                      </span>
                    )}
                  </a>
                </div>
              </div>
            )}

            {/* Price */}
            <div className="mt-4 flex items-center">
              <p className="text-3xl font-medium text-gray-900">{formatCurrency(displayPrice)}</p>
              {displayProduct.product_structure === 'simple' && displayProduct.cost_price > displayPrice && (
                <>
                  <p className="ml-3 text-lg text-gray-500 line-through">{formatCurrency(displayProduct.cost_price)}</p>
                  <p className="ml-3 text-lg font-medium text-green-600">
                    {Math.round(((displayProduct.cost_price - displayPrice) / displayProduct.cost_price) * 100)}% off
                  </p>
                </>
              )}
            </div>

            {/* Stock Status */}
            <div className="mt-2">
              <span className={`inline-flex items-center text-sm font-medium ${stockStatus.color}`}>
                {stockStatus.status}
              </span>
            </div>

            {/* Social Share */}
            <div className="mt-4">
              <SocialShare
                product={displayProduct}
                url={window.location.href}
              />
            </div>

            {/* Variant Selection with Enhanced Color Swatches */}
            {displayProduct.product_structure === 'variant' && displayProduct.product_variants && (
              <div className="mt-6">
                <div className="space-y-6">
                  {Array.from(new Set(
                    displayProduct.product_variants.flatMap(v => {
                      if (!v.attributes) return [];
                      if (v.attributes instanceof Map) {
                        return Array.from(v.attributes.keys());
                      } else if (typeof v.attributes === 'object') {
                        return Object.keys(v.attributes);
                      }
                      return [];
                    }).filter(Boolean)
                  )).map(attributeName => {
                    const isColorAttribute = attributeName.toLowerCase().includes('color') ||
                      attributeName.toLowerCase().includes('colour');

                    return (
                      <div key={attributeName}>
                        <h3 className="text-sm font-medium text-gray-900 mb-3">
                          {attributeName}:
                          <span className="ml-2 text-gray-600 font-normal">
                            {selectedAttributes[attributeName] || 'Select'}
                          </span>
                        </h3>

                        {isColorAttribute ? (
                          /* Visual Color Swatches */
                          <div className="flex flex-wrap gap-3">
                            {getAttributeOptions(attributeName).map(option => {
                              const isSelected = selectedAttributes[attributeName] === option;
                              const colorMap = {
                                'Black': '#000000',
                                'White': '#FFFFFF',
                                'Red': '#EF4444',
                                'Blue': '#3B82F6',
                                'Green': '#10B981',
                                'Yellow': '#F59E0B',
                                'Orange': '#F97316',
                                'Purple': '#A855F7',
                                'Pink': '#EC4899',
                                'Brown': '#92400E',
                                'Gray': '#6B7280',
                                'Grey': '#6B7280',
                                'Navy': '#1E3A8A',
                                'Beige': '#F5F5DC',
                                'Maroon': '#7F1D1D',
                                'Teal': '#14B8A6',
                                'Gold': '#F59E0B',
                                'Silver': '#D1D5DB',
                              };

                              const bgColor = colorMap[option] || colorMap[option?.toLowerCase()] || '#9CA3AF';
                              const isLightColor = ['White', 'Beige', 'Silver', 'Yellow'].includes(option);

                              return (
                                <button
                                  key={option}
                                  onClick={() => handleAttributeChange(attributeName, option)}
                                  className={`group relative flex flex-col items-center transition-all duration-200 ${isSelected ? 'scale-110' : 'hover:scale-105'
                                    }`}
                                  title={option}
                                >
                                  <div
                                    className={`w-12 h-12 rounded-full border-2 transition-all duration-200 ${isSelected
                                      ? 'border-blue-600 shadow-lg ring-2 ring-blue-200'
                                      : isLightColor
                                        ? 'border-gray-300 hover:border-gray-400'
                                        : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                    style={{ backgroundColor: bgColor }}
                                  >
                                    {isSelected && (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <svg
                                          className={`w-6 h-6 ${isLightColor ? 'text-gray-800' : 'text-white'}`}
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  <span className={`mt-2 text-xs font-medium transition-colors ${isSelected ? 'text-blue-600' : 'text-gray-600 group-hover:text-gray-900'
                                    }`}>
                                    {option}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          /* Regular attribute selection (Size, etc.) */
                          <div className="flex flex-wrap gap-2">
                            {getAttributeOptions(attributeName).map(option => (
                              <label key={option} className="relative cursor-pointer">
                                <input
                                  type="radio"
                                  name={attributeName}
                                  value={option}
                                  checked={selectedAttributes[attributeName] === option}
                                  onChange={() => handleAttributeChange(attributeName, option)}
                                  className="sr-only"
                                />
                                <div className={`rounded-md border px-4 py-2 text-sm font-medium transition-all ${selectedAttributes[attributeName] === option
                                  ? 'border-blue-600 text-blue-600 bg-blue-50 shadow-sm'
                                  : 'border-gray-300 text-gray-900 hover:border-blue-400 hover:bg-gray-50'
                                  }`}>
                                  {option}
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector - Only show if not digital */}
            {displayProduct.product_type !== 'digital' && (
              <div className="mt-6 flex items-center">
                <h3 className="text-sm font-medium text-gray-500 w-24">Quantity:</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 text-center border-gray-300 rounded-md text-sm"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Product Tags */}
            {displayProduct.tags && displayProduct.tags.length > 0 && (
              <div className="mt-6">
                <div className="flex flex-wrap gap-2">
                  {displayProduct.tags.slice(0, 5).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Trust Badges */}
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-b border-gray-200 py-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
                <span>100% Authentic</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CheckBadgeIcon className="h-5 w-5 text-blue-600" />
                <span>Quality Checked</span>
              </div>
              {displayProduct.isFreeShipping !== false && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <TruckIcon className="h-5 w-5 text-green-600" />
                  <span>Free Delivery</span>
                </div>
              )}
              {displayProduct.isCodAvailable !== false && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <CurrencyDollarIcon className="h-5 w-5 text-rose-600" />
                  <span>Cash on Delivery</span>
                </div>
              )}
              {displayProduct.warranty && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                  <span>{displayProduct.warranty}</span>
                </div>
              )}
            </div>

            {/* Tabbed Information Section */}
            <div className="mt-8">
              <div className="border border-gray-200 rounded-md">
                <div className="border-b border-gray-200 bg-gray-50">
                  <nav className="-mb-px flex" aria-label="Tabs">
                    <button
                      onClick={() => setActiveTab('description')}
                      className={`${activeTab === 'description'
                        ? 'border-blue-500 text-blue-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm text-center transition-colors`}
                    >
                      Description
                    </button>
                    <button
                      onClick={() => setActiveTab('specifications')}
                      className={`${activeTab === 'specifications'
                        ? 'border-blue-500 text-blue-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm text-center transition-colors`}
                    >
                      Specifications
                    </button>
                    <button
                      onClick={() => setActiveTab('reviews')}
                      className={`${activeTab === 'reviews'
                        ? 'border-blue-500 text-blue-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm text-center transition-colors`}
                    >
                      Reviews
                    </button>
                  </nav>
                </div>

                <div className="p-6">
                  {/* Description Tab */}
                  {activeTab === 'description' && (
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <div dangerouslySetInnerHTML={{ __html: displayProduct.description || 'No description available.' }} />
                    </div>
                  )}

                  {/* Specifications Tab */}
                  {activeTab === 'specifications' && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 w-1/3">SKU</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{displayProduct.sku || 'N/A'}</td>
                          </tr>
                          {displayProduct.weight && (
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">Weight</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{displayProduct.weight} kg</td>
                            </tr>
                          )}
                          {displayProduct.color && (
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">Color</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{displayProduct.color}</td>
                            </tr>
                          )}
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">Product Type</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{displayProduct.product_type || 'Physical'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Reviews Tab */}
                  {activeTab === 'reviews' && (
                    <div id="ratings">
                      <RatingReview productId={displayProduct._id} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Action Buttons (Fixed Bottom) */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 flex gap-2 lg:hidden z-50">
              <button
                onClick={handleAddToCart}
                disabled={displayProduct.product_type === 'physical' && displayStock <= 0}
                className={`flex-1 flex items-center justify-center rounded-sm border px-4 py-3 text-sm font-medium shadow-sm ${displayProduct.product_type === 'physical' && displayStock <= 0
                  ? 'bg-gray-300 text-white border-transparent cursor-not-allowed'
                  : 'bg-white text-rose-600 border-2 border-rose-600'
                  }`}
              >
                {displayProduct.product_type === 'physical' && displayStock <= 0
                  ? 'Out of Stock'
                  : 'Add to Cart'}
              </button>
              <button
                onClick={() => {
                  handleAddToCart();
                  // Redirect
                }}
                disabled={displayProduct.product_type === 'physical' && displayStock <= 0}
                className={`flex-1 flex items-center justify-center rounded-sm border border-transparent px-4 py-3 text-sm font-medium text-white shadow-sm ${displayProduct.product_type === 'physical' && displayStock <= 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700'
                  }`}
              >
                Buy Now
              </button>
            </div>

          </div>
        </div>

        {/* Related Products */}
        <div className="mt-16">
          <RelatedProducts currentProduct={displayProduct} />
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
