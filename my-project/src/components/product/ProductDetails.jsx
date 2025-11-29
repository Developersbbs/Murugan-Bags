import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../../utils/format';
import { addToCart } from '../../utils/cartUtils';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { ChevronLeftIcon, ChevronRightIcon, HeartIcon, StarIcon, ShoppingCartIcon, EyeIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import RatingReview from './RatingReview';

const ProductDetails = ({ product, isLoading, isError, onCartUpdate }) => {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showDescription, setShowDescription] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [showShipping, setShowShipping] = useState(false);
  
  const { addToCart: addToCartContext } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  
  // Use the passed product data
  const displayProduct = product;

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

  // Get all available images - prioritize variant images for variant products
  const allImages = useMemo(() => {
    // For variant products, use the selected variant's images if available
    if (displayProduct?.product_structure === 'variant' && selectedVariant?.images?.length > 0) {
      return selectedVariant.images;
    }
    
    // Fallback to main product images or placeholder
    return displayProduct?.image_url && displayProduct.image_url.length > 0 
      ? displayProduct.image_url 
      : ['/images/products/placeholder-product.svg'];
  }, [displayProduct, selectedVariant]);

  const currentImage = allImages[selectedImageIndex] || '/images/products/placeholder-product.svg';

  // Reset image index when variant changes
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [allImages]);

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
      if (isInWishlist(displayProduct._id)) {
        await removeFromWishlist(displayProduct._id);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist(displayProduct);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
          {/* Image Gallery */}
          <div className="flex flex-col-reverse">
            {/* Image Thumbnails */}
            {allImages.length > 1 && (
              <div className="hidden mt-6 w-full max-w-2xl mx-auto sm:block lg:max-w-none">
                <div className="grid grid-cols-4 gap-6">
                  {allImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative h-24 bg-white rounded-md flex items-center justify-center text-sm font-medium uppercase text-gray-900 cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring focus:ring-opacity-50 focus:ring-offset-4 ${
                        index === selectedImageIndex
                          ? 'ring-2 ring-indigo-500'
                          : 'ring-1 ring-gray-300'
                      }`}
                    >
                      <span className="sr-only">Image {index + 1}</span>
                      <span className="absolute inset-0 rounded-md overflow-hidden">
                        <img
                          src={image}
                          alt={`${displayProduct.name} ${index + 1}`}
                          className="w-full h-full object-center object-cover"
                          onError={(e) => {
                            e.target.src = '/images/products/placeholder-product.svg';
                          }}
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main Image */}
            <div className="w-full aspect-w-1 aspect-h-1">
              <div className="relative bg-white rounded-lg shadow-lg overflow-hidden group">
                <img
                  src={currentImage}
                  alt={displayProduct.name}
                  className="w-full h-full object-center object-cover group-hover:opacity-75 transition-opacity duration-300"
                  style={{ aspectRatio: '1/1', minHeight: '400px' }}
                  onError={(e) => {
                    e.target.src = '/images/products/placeholder-product.svg';
                  }}
                />
                
                {/* Image Navigation Arrows */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setSelectedImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                    </button>
                  </>
                )}

                {/* Zoom Button */}
                <button
                  onClick={() => setShowImageModal(true)}
                  className="absolute top-4 right-4 bg-white/80 hover:bg-white rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <EyeIcon className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{displayProduct.name}</h1>

            {/* Reviews */}
            <div className="mt-3">
              <h3 className="sr-only">Reviews</h3>
              <div className="flex items-center">
                <div className="flex items-center">
                  {[0, 1, 2, 3, 4].map((rating) => (
                    <StarSolidIcon
                      key={rating}
                      className={`h-5 w-5 flex-shrink-0 ${
                        rating < Math.round(displayProduct?.averageRating || 0) ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p className="sr-only">{displayProduct?.averageRating || 0} out of 5 stars</p>
                <a href="#ratings" className="ml-3 text-sm font-medium text-indigo-600 hover:text-indigo-500">
                  {displayProduct?.totalReviews > 0 && (
                    <span className="text-gray-500 font-normal">
                      {' • '}{displayProduct?.totalReviews} {displayProduct?.totalReviews === 1 ? 'review' : 'reviews'}
                    </span>
                  )}
                </a>
              </div>
              {displayProduct?.totalRatings > 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  {displayProduct?.totalReviews === 0 && displayProduct?.totalRatings > 0 && (
                    <span className="ml-2">No reviews yet</span>
                  )}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="mt-4">
              <h2 className="sr-only">Product information</h2>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(displayPrice)}</p>
            </div>


            {/* Description */}
            <div className="mt-6">
              <h3 className="sr-only">Description</h3>
              <div className="text-base text-gray-700 space-y-6">
                <div dangerouslySetInnerHTML={{ __html: displayProduct.description || 'No description available.' }} />
              </div>
            </div>

            {/* Variant Selection */}
            {displayProduct.product_structure === 'variant' && displayProduct.product_variants && (
              <div className="mt-8">
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
                  )).map(attributeName => (
                    <div key={attributeName}>
                      <h3 className="text-sm font-medium text-gray-900">{attributeName}</h3>
                      <fieldset className="mt-2">
                        <legend className="sr-only">Choose a {attributeName}</legend>
                        <div className="flex items-center space-x-3">
                          {getAttributeOptions(attributeName).map(option => (
                            <label key={option} className="relative">
                              <input
                                type="radio"
                                name={attributeName}
                                value={option}
                                checked={selectedAttributes[attributeName] === option}
                                onChange={() => handleAttributeChange(attributeName, option)}
                                className="sr-only"
                              />
                              <div className={`cursor-pointer rounded-md border py-3 px-6 flex items-center justify-center text-sm font-medium uppercase sm:flex-1 ${
                                selectedAttributes[attributeName] === option
                                  ? 'bg-indigo-600 border-transparent text-white hover:bg-indigo-700'
                                  : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
                              }`}>
                                {option}
                              </div>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  ))}
                  
                  {selectedVariant?.name && (
                    <div className="text-sm text-gray-600 bg-gray-50 rounded-md p-3">
                      <span className="font-medium">Selected variant:</span> {selectedVariant.name}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Quantity</h3>
              </div>
              <div className="mt-2 flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  -
                </button>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="block w-16 rounded-md border-gray-300 text-center shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart and Wishlist */}
            <div className="mt-10 flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
              <button
                onClick={handleAddToCart}
                disabled={displayProduct.product_type === 'physical' && displayStock <= 0}
                className={`flex-1 flex items-center justify-center rounded-md border border-transparent px-8 py-3 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  displayProduct.product_type === 'physical' && displayStock <= 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <ShoppingCartIcon className="h-5 w-5 mr-2" />
                {displayProduct.product_type === 'physical' && displayStock <= 0 
                  ? 'Out of Stock' 
                  : 'Add to Cart'}
              </button>
              
              <button
                onClick={handleWishlistToggle}
                className={`flex items-center justify-center rounded-md border px-8 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  isInWishlist(displayProduct._id)
                    ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                {isInWishlist(displayProduct._id) ? (
                  <HeartSolidIcon className="h-5 w-5 mr-2 text-red-500" />
                ) : (
                  <HeartIcon className="h-5 w-5 mr-2" />
                )}
                {isInWishlist(displayProduct._id) ? 'In Wishlist' : 'Add to Wishlist'}
              </button>
            </div>

            {/* Product Details */}
            <div className="mt-10 border-t border-gray-200 pt-10">
              <h3 className="text-sm font-medium text-gray-900">Product Details</h3>
              <div className="mt-4 prose prose-sm text-gray-500">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-900">SKU</dt>
                    <dd className="mt-1 text-sm text-gray-500">{displayProduct.sku || 'N/A'}</dd>
                  </div>
                  {displayProduct.weight && (
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Weight</dt>
                      <dd className="mt-1 text-sm text-gray-500">{displayProduct.weight} kg</dd>
                    </div>
                  )}
                  {displayProduct.color && (
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Color</dt>
                      <dd className="mt-1 text-sm text-gray-500">{displayProduct.color}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-900">Product Type</dt>
                    <dd className="mt-1 text-sm text-gray-500 capitalize">{displayProduct.product_type || 'Physical'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Shipping Information */}
            <div className="mt-8 border-t border-gray-200 pt-8">
              <h3 className="text-sm font-medium text-gray-900">Shipping & Returns</h3>
              <div className="mt-4 text-sm text-gray-500">
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full mr-2"></span>
                    Free shipping on orders over $50
                  </li>
                  <li className="flex items-center">
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full mr-2"></span>
                    30-day return policy
                  </li>
                  <li className="flex items-center">
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full mr-2"></span>
                    Ships within 2-3 business days
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Image Modal */}
        {showImageModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowImageModal(false)}></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={() => setShowImageModal(false)}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                    {displayProduct.name}
                  </h3>
                  <div className="mt-2">
                    <img
                      src={currentImage}
                      alt={displayProduct.name}
                      className="w-full h-auto max-h-96 object-contain mx-auto"
                      onError={(e) => {
                        e.target.src = '/images/products/placeholder-product.svg';
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Rating and Review Section */}
      <div id="ratings" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RatingReview productId={displayProduct._id} />
      </div>
    </div>
  );
};

export default ProductDetails;
