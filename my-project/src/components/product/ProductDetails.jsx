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

// ─────────────────────────────────────────────────────────────
// MOBILE IMAGE GALLERY — Flipkart-style swipeable gallery
// Used only on mobile (hidden on lg+). Keeps FlipkartImageGallery for desktop.
// ─────────────────────────────────────────────────────────────
const MobileImageGallery = ({ images, productName }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = React.useRef(null);

  const safeImages = images && images.length > 0
    ? images
    : ['/images/products/placeholder-product.svg'];

  const goTo = (index) => {
    setActiveIndex(Math.max(0, Math.min(index, safeImages.length - 1)));
    setDragX(0);
  };

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
    setIsDragging(false);
    setDragX(0);
  };

  const handleTouchMove = (e) => {
    if (touchStartX === null) return;
    const diff = e.touches[0].clientX - touchStartX;
    setDragX(diff);
    setIsDragging(true);
  };

  const handleTouchEnd = () => {
    if (Math.abs(dragX) > 50) {
      if (dragX < 0 && activeIndex < safeImages.length - 1) goTo(activeIndex + 1);
      else if (dragX > 0 && activeIndex > 0) goTo(activeIndex - 1);
      else setDragX(0);
    } else {
      setDragX(0);
    }
    setTouchStartX(null);
    setIsDragging(false);
  };

  return (
    <div className="w-full bg-white select-none">
      {/* Main image with swipe */}
      <div
        className="relative w-full overflow-hidden bg-gray-50"
        style={{ aspectRatio: '1 / 1' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image track — slides horizontally */}
        <div
          ref={trackRef}
          className="flex h-full"
          style={{
            width: `${safeImages.length * 100}%`,
            transform: `translateX(calc(${-activeIndex * (100 / safeImages.length)}% + ${dragX / safeImages.length}px))`,
            transition: isDragging ? 'none' : 'transform 0.3s ease',
          }}
        >
          {safeImages.map((src, i) => (
            <div
              key={i}
              className="h-full flex items-center justify-center bg-white"
              style={{ width: `${100 / safeImages.length}%` }}
            >
              <img
                src={src}
                alt={`${productName} ${i + 1}`}
                className="w-full h-full object-contain p-2"
                onError={(e) => { e.target.src = '/images/products/placeholder-product.svg'; }}
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Dot indicators */}
        {safeImages.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
            {safeImages.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === activeIndex
                    ? 'w-4 h-1.5 bg-rose-600'
                    : 'w-1.5 h-1.5 bg-gray-400 opacity-60'
                }`}
              />
            ))}
          </div>
        )}

        {/* Image counter badge */}
        <div className="absolute top-3 right-3 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">
          {activeIndex + 1}/{safeImages.length}
        </div>
      </div>

      {/* Thumbnail strip — horizontal scroll */}
      {safeImages.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-white border-t border-gray-100">
          {safeImages.map((src, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`flex-shrink-0 w-14 h-14 rounded border-2 overflow-hidden transition-all ${
                i === activeIndex
                  ? 'border-rose-500 shadow-sm'
                  : 'border-gray-200 opacity-60'
              }`}
            >
              <img
                src={src}
                alt={`thumb ${i + 1}`}
                className="w-full h-full object-contain p-1"
                onError={(e) => { e.target.src = '/images/products/placeholder-product.svg'; }}
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// COLOR UTILITIES

/**
 * Resolves ANY color name/hex to a valid CSS color string.
 * Priority: extended map → CSS named colors (via browser canvas) → grey fallback
 */
const resolveColor = (() => {
  const EXTENDED_MAP = {
    // ── Basic / Default colors ──────────────────────────────
    red:          '#EF4444',
    rose:         '#3B82F6',
    green:        '#10B981',
    yellow:       '#F59E0B',
    orange:       '#F97316',
    purple:       '#A855F7',
    pink:         '#EC4899',
    black:        '#000000',
    white:        '#FFFFFF',
    gray:         '#6B7280',
    grey:         '#6B7280',
    brown:        '#92400E',
    cyan:         '#06B6D4',
    magenta:      '#FF00FF',
    lime:         '#84CC16',
    indigo:       '#4B0082',
    violet:       '#EE82EE',
    turquoise:    '#40E0D0',
    aqua:         '#00FFFF',

    // ── Greens ───────────────────────────────────────────────
    olive:        '#708238',
    'olive green':'#708238',
    spearmint:    '#AAD9BB',
    mint:         '#98FF98',
    sage:         '#B2AC88',
    'sage green': '#B2AC88',
    forest:       '#228B22',
    'forest green':'#228B22',
    hunter:       '#355E3B',
    'hunter green':'#355E3B',
    moss:         '#8A9A5B',
    pistachio:    '#93C572',
    seafoam:      '#71EEB8',
    emerald:      '#50C878',
    jade:         '#00A86B',
    avocado:      '#568203',
    khaki:        '#C3B091',
    'light green':'#90EE90',
    'dark green': '#006400',
    pista:        '#93C572',

    // ── Blues ────────────────────────────────────────────────
    navy:         '#1E3A8A',
    'navy rose':  '#1E3A8A',
    cobalt:       '#0047AB',
    denim:        '#1560BD',
    slate:        '#708090',
    'slate rose': '#6A5ACD',
    powder:       '#B0E0E6',
    'powder rose':'#B0E0E6',
    'baby rose':  '#89CFF0',
    baby:         '#89CFF0',
    royal:        '#4169E1',
    'royal rose': '#4169E1',
    cerulean:     '#007BA7',
    sky:          '#87CEEB',
    'sky rose':   '#87CEEB',
    arctic:       '#C9E8F0',
    periwinkle:   '#CCCCFF',
    'light rose': '#ADD8E6',
    'dark rose':  '#00008B',
    steel:        '#4682B4',
    'steel rose': '#4682B4',
    teal:         '#14B8A6',
    ocean:        '#006994',

    // ── Reds / Pinks ─────────────────────────────────────────
    coral:        '#FF7F50',
    salmon:       '#FA8072',
    blush:        '#DE5D83',
    rose:         '#FF007F',
    'rose gold':  '#B76E79',
    'dusty rose': '#C4A0A0',
    dusty:        '#C4A0A0',
    crimson:      '#DC143C',
    burgundy:     '#800020',
    maroon:       '#800000',
    wine:         '#722F37',
    fuchsia:      '#FF00FF',
    'hot pink':   '#FF69B4',
    hot:          '#FF69B4',
    mauve:        '#E0B0FF',
    watermelon:   '#FC6C85',
    raspberry:    '#C0196B',
    'light pink': '#FFB6C1',
    'dark red':   '#8B0000',
    scarlet:      '#FF2400',
    vermillion:   '#E34234',
    cherry:       '#DE3163',

    // ── Oranges / Yellows ────────────────────────────────────
    peach:        '#FFCBA4',
    apricot:      '#FBCEB1',
    tangerine:    '#F28500',
    amber:        '#FFBF00',
    mustard:      '#FFDB58',
    lemon:        '#FFF44F',
    butter:       '#FFFAA0',
    cream:        '#FFFDD0',
    champagne:    '#F7E7CE',
    vanilla:      '#F3E5AB',
    sand:         '#C2B280',
    camel:        '#C19A6B',
    tan:          '#D2B48C',
    'light yellow':'#FFFFE0',
    gold:         '#FFD700',
    saffron:      '#F4C430',
    turmeric:     '#CCA804',

    // ── Purples ──────────────────────────────────────────────
    lavender:     '#E6E6FA',
    lilac:        '#C8A2C8',
    plum:         '#8E4585',
    grape:        '#6F2DA8',
    mulberry:     '#C54B8C',
    orchid:       '#DA70D6',
    thistle:      '#D8BFD8',
    heather:      '#9B8DB4',
    eggplant:     '#614051',
    aubergine:    '#614051',
    'dark purple':'#301934',

    // ── Neutrals / Earth tones ───────────────────────────────
    ivory:        '#FFFFF0',
    'off white':  '#FAF9F6',
    off_white:    '#FAF9F6',
    ecru:         '#C2B280',
    linen:        '#FAF0E6',
    oatmeal:      '#E8D9C0',
    taupe:        '#483C32',
    mocha:        '#9A7B4F',
    espresso:     '#4B2E2E',
    chocolate:    '#7B3F00',
    caramel:      '#C68642',
    toffee:       '#B5692A',
    walnut:       '#7B5544',
    stone:        '#918E85',
    pebble:       '#9E9E8E',
    smoke:        '#9FA3A8',
    ash:          '#B2BEB5',
    charcoal:     '#36454F',
    graphite:     '#4C5461',
    onyx:         '#353839',
    beige:        '#F5F5DC',
    'off-white':  '#FAF9F6',
    'dark gray':  '#A9A9A9',
    'dark grey':  '#A9A9A9',
    'dark brown': '#5C4033',
    'light gray': '#D3D3D3',
    'light grey': '#D3D3D3',
    silver:       '#C0C0C0',

    // ── Metallics ────────────────────────────────────────────
    bronze:       '#CD7F32',
    copper:       '#B87333',
    gunmetal:     '#2A3439',
    chrome:       '#DBE4EE',
    platinum:     '#E5E4E2',

    // ── Fashion / Misc ───────────────────────────────────────
    dusk:         '#C49A93',
    merlot:       '#731635',
    terracotta:   '#E2725B',
    clay:         '#B66A50',
    rust:         '#B7410E',
    cinnamon:     '#D2691E',
    sienna:       '#A0522D',
    auburn:       '#A52A2A',
    nude:         '#F2C59A',
    neon:         '#39FF14',
    'neon green': '#39FF14',
    'neon pink':  '#FF6EC7',
    'neon rose':  '#1F51FF',
    'neon orange':'#FF6103',
    'neon yellow':'#FFFF00',
    electric:     '#7DF9FF',
    pastel:       '#AEC6CF',
    'pastel rose':'#AEC6CF',
    'pastel pink':'#FFD1DC',
    'pastel green':'#B5EAD7',
    'pastel yellow':'#FDFD96',
    'pastel purple':'#B39EB5',
  };

  const cache = new Map();

  let ctx = null;
  const getCtx = () => {
    if (!ctx) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        ctx = canvas.getContext('2d');
      } catch (e) { ctx = null; }
    }
    return ctx;
  };

  return (colorName) => {
    if (!colorName) return '#9CA3AF';
    const key = colorName.trim().toLowerCase();
    if (cache.has(key)) return cache.get(key);

    // 1. Extended map
    if (EXTENDED_MAP[key]) {
      cache.set(key, EXTENDED_MAP[key]);
      return EXTENDED_MAP[key];
    }

    // 2. Already a hex/rgb value
    if (key.startsWith('#') || key.startsWith('rgb')) {
      cache.set(key, colorName);
      return colorName;
    }

    // 3. Let browser resolve via canvas (handles all 140+ CSS named colors)
    const context = getCtx();
    if (context) {
      context.fillStyle = '#010101';
      context.fillStyle = key;
      const resolved = context.fillStyle;
      if (resolved !== '#010101') {
        cache.set(key, resolved);
        return resolved;
      }
      if (['black', '#000', '#000000'].includes(key)) {
        cache.set(key, '#000000');
        return '#000000';
      }
    }

    // 4. Unknown — neutral grey
    cache.set(key, '#9CA3AF');
    return '#9CA3AF';
  };
})();

/**
 * Returns true if the color is light enough to need dark text/checkmark.
 */
const isLightColor = (hexColor) => {
  try {
    const hex = hexColor.replace('#', '');
    if (hex.length < 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.65;
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

const ProductDetails = ({ product, isLoading, isError, onCartUpdate }) => {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [showStickyBar, setShowStickyBar] = useState(false);

  const { addToCart: addToCartContext, openSidebar } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);

  const displayProduct = product;

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (displayProduct?.product_structure === 'variant' && displayProduct?.product_variants?.length > 0) {
      setSelectedVariant(displayProduct.product_variants[0]);
      if (displayProduct.product_variants[0].attributes) {
        setSelectedAttributes({ ...displayProduct.product_variants[0].attributes });
      }
    }
  }, [displayProduct]);

  const handleAttributeChange = (attribute, value) => {
    const newAttributes = { ...selectedAttributes, [attribute]: value };
    setSelectedAttributes(newAttributes);

    if (displayProduct?.product_variants) {
      const matchingVariant = displayProduct.product_variants.find(variant => {
        if (!variant.attributes) return false;
        return Object.entries(newAttributes).every(([key, val]) => {
          return getAttributeValue(variant.attributes, key) === val;
        });
      });
      if (matchingVariant) setSelectedVariant(matchingVariant);
    }
  };

  const getAttributeValue = (attributes, key) => {
    if (!attributes) return null;
    if (attributes instanceof Map) return attributes.get(key);
    return attributes[key];
  };

  const getAttributeOptions = (attributeName) => {
    if (!displayProduct?.product_variants) return [];
    const options = new Set();
    displayProduct.product_variants.forEach(variant => {
      const value = getAttributeValue(variant.attributes, attributeName);
      if (value) options.add(value);
    });
    return Array.from(options);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500 mx-auto"></div>
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

  const displayPrice = displayProduct.product_structure === 'simple'
    ? displayProduct.selling_price
    : selectedVariant?.selling_price || 0;

  const displayStock = displayProduct.product_structure === 'simple'
    ? displayProduct.baseStock
    : selectedVariant?.stock || 0;

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

  const allImages = useMemo(() => {
    const ensureArray = (val) => {
      if (!val) return [];
      return (Array.isArray(val) ? val : [val]).filter(Boolean);
    };

    if (displayProduct?.product_structure === 'variant' && selectedVariant?.images) {
      const vImages = ensureArray(selectedVariant.images);
      if (vImages.length > 0) return vImages.map(img => getFullImageUrl(img));
    }

    if (displayProduct?.product_structure === 'variant' && selectedVariant?.attributes?.color) {
      const colorVariant = displayProduct.product_variants.find(v =>
        v.attributes?.color === selectedVariant.attributes.color && ensureArray(v.images).length > 0
      );
      if (colorVariant) {
        return ensureArray(colorVariant.images).map(img => getFullImageUrl(img));
      }
    }

    const mainImages = ensureArray(displayProduct?.images?.length ? displayProduct.images : displayProduct?.image_url);
    if (mainImages.length > 0) return mainImages.map(img => getFullImageUrl(img));

    if (displayProduct?.product_structure === 'variant' && displayProduct.product_variants?.[0]?.images) {
      const firstVImages = ensureArray(displayProduct.product_variants[0].images);
      if (firstVImages.length > 0) return firstVImages.map(img => getFullImageUrl(img));
    }

    return ['/images/products/placeholder-product.svg'];
  }, [displayProduct, selectedVariant]);

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
    if (isAddingToCart) return;
    setIsAddingToCart(true);
    try {
      await addToCartContext(displayProduct, selectedVariant, quantity);
      toast.success(`${quantity} item(s) added to cart!`);
      if (onCartUpdate) onCartUpdate();
    } catch (error) {
      toast.error('Failed to add item to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (isUpdatingWishlist) return;
    setIsUpdatingWishlist(true);
    try {
      const mainProductId = product._id;
      const variantId = selectedVariant ? selectedVariant._id : null;
      if (isInWishlist(mainProductId, variantId)) {
        await removeFromWishlist(mainProductId, variantId);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist({
          ...displayProduct,
          _id: mainProductId,
          variant_id: variantId,
          selling_price: displayPrice,
          image_url: [currentImage]
        });
        toast.success('Added to wishlist');
      }
    } catch (error) {
      toast.error('Failed to update wishlist');
    } finally {
      setIsUpdatingWishlist(false);
    }
  };

  return (
    // FIX: Added overflow-x-hidden to prevent any child from causing horizontal scroll
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">

      {/* Sticky Add to Cart Bar */}
      <div
        className={`fixed top-0 left-0 right-0 bg-white shadow-lg z-40 transition-transform duration-300 ${
          showStickyBar ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        {/* FIX: px-3 on mobile, px-6 on larger screens */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <img
                src={currentImage}
                alt={displayProduct.name}
                className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded flex-shrink-0"
                onError={(e) => { e.target.src = '/images/products/placeholder-product.svg'; }}
              />
              <div className="min-w-0 flex-1">
                {/* FIX: truncate prevents text overflow */}
                <h3 className="text-sm font-semibold text-gray-900 truncate">{displayProduct.name}</h3>
                <p className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(displayPrice)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* FIX: hide quantity controls on very small screens in sticky bar to save space */}
              <div className="hidden sm:flex items-center space-x-1">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">-</button>
                <span className="px-3 py-1 border border-gray-300 rounded text-sm">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">+</button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={(displayProduct.product_type === 'physical' && displayStock <= 0) || isAddingToCart}
                className={`px-4 py-2 rounded-md text-white text-sm font-medium whitespace-nowrap ${
                  displayProduct.product_type === 'physical' && displayStock <= 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700'
                } disabled:opacity-50 flex items-center justify-center`}
              >
                {isAddingToCart
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  : 'Add to Cart'
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        {/* FIX: consistent px-4 on all screens */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 min-w-0">
              <li className="flex-shrink-0"><a href="/" className="text-gray-500 hover:text-gray-700 text-sm">Home</a></li>
              <li className="flex-shrink-0"><ChevronRightIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" /></li>
              <li className="flex-shrink-0"><a href="/products" className="text-gray-500 hover:text-gray-700 text-sm">Products</a></li>
              <li className="flex-shrink-0"><ChevronRightIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" /></li>
              {/* FIX: truncate long product names in breadcrumb */}
              <li className="text-gray-900 font-medium text-sm truncate min-w-0">{displayProduct.name}</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* FIX: Single consistent padding wrapper - px-4 mobile, px-6 tablet, px-8 desktop */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">

        {/*
          FIX: Replaced lg:grid with a proper responsive layout.
          - Mobile: single column, image on top, details below (no left cutoff)
          - Desktop (lg+): two columns side by side with sticky image
        */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-8 lg:items-start">

          {/* ── Left Column: Image Gallery ── */}
          {/*
            Mobile: MobileImageGallery (swipeable, not sticky, full-width, scrolls naturally)
            Desktop (lg+): FlipkartImageGallery with sticky positioning
          */}
          <div className="w-full lg:col-span-5 lg:sticky lg:top-24 lg:z-30">

            {/* Mobile gallery — swipeable, aspect-ratio based, not fixed */}
            <div className="block lg:hidden w-full mb-4">
              <MobileImageGallery images={allImages} productName={displayProduct.name} />
            </div>

            {/* Desktop gallery — original FlipkartImageGallery unchanged */}
            <div className="hidden lg:block mb-6">
              <FlipkartImageGallery images={allImages} productName={displayProduct.name} />
            </div>

            {/* Action Buttons - Desktop only */}
            <div className="hidden lg:flex flex-row gap-4 mt-4">
              <button
                onClick={handleAddToCart}
                disabled={(displayProduct.product_type === 'physical' && displayStock <= 0) || isAddingToCart}
                className={`flex-1 flex items-center justify-center rounded-sm border px-6 py-4 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  displayProduct.product_type === 'physical' && displayStock <= 0
                    ? 'bg-gray-300 text-white border-transparent cursor-not-allowed'
                    : 'bg-white border-2 border-rose-600 text-rose-600 hover:bg-rose-50 focus:ring-rose-500'
                } disabled:opacity-50`}
              >
                {isAddingToCart
                  ? <div className="w-5 h-5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                  : (
                    <>
                      <ShoppingCartIcon className="h-5 w-5 mr-2" />
                      {displayProduct.product_type === 'physical' && displayStock <= 0 ? 'OUT OF STOCK' : 'ADD TO CART'}
                    </>
                  )
                }
              </button>

              <button
                onClick={async () => { await handleAddToCart(); openSidebar(); }}
                disabled={displayProduct.product_type === 'physical' && displayStock <= 0}
                className={`flex-1 flex items-center justify-center rounded-sm border border-transparent px-6 py-4 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  displayProduct.product_type === 'physical' && displayStock <= 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-600'
                }`}
              >
                <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                BUY NOW
              </button>
            </div>
          </div>

          {/* ── Right Column: Product Details ── */}
          {/*
            FIX: Removed "px-4 sm:px-0" which was causing left content cutoff on mobile.
            mt-6 on mobile (was mt-10 sm:mt-16), proper lg:mt-0.
          */}
          <div className="mt-6 sm:mt-8 lg:mt-0 lg:col-span-7">

            {/* Product Name + Wishlist */}
            <div className="flex justify-between items-start gap-3">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900 flex-1 leading-snug">
                {displayProduct.name}
              </h1>
              <button
                onClick={handleWishlistToggle}
                disabled={isUpdatingWishlist}
                className="flex-shrink-0 ml-2 p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50"
                aria-label={isInWishlist(product._id, selectedVariant?._id) ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                {isUpdatingWishlist
                  ? <div className="w-6 h-6 sm:w-7 sm:h-7 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                  : isInWishlist(product._id, selectedVariant?._id)
                    ? <HeartSolidIcon className="h-6 w-6 sm:h-7 sm:w-7 text-rose-600" />
                    : <HeartIcon className="h-6 w-6 sm:h-7 sm:w-7 text-gray-400 hover:text-rose-600" />
                }
              </button>
            </div>

            {/* Reviews */}
            {displayProduct.showRatings !== false && (
              <div className="mt-3">
                <h3 className="sr-only">Reviews</h3>
                <div className="flex items-center">
                  <div className="flex items-center bg-green-600 px-2 py-0.5 rounded text-white text-sm font-bold">
                    {displayProduct?.averageRating || 0}
                    <StarSolidIcon className="h-3 w-3 ml-1 text-white" />
                  </div>
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
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-2xl sm:text-3xl font-medium text-gray-900">{formatCurrency(displayPrice)}</p>
              {displayProduct.product_structure === 'simple' && displayProduct.cost_price > displayPrice && (
                <>
                  <p className="text-base sm:text-lg text-gray-500 line-through">{formatCurrency(displayProduct.cost_price)}</p>
                  <p className="text-base sm:text-lg font-medium text-green-600">
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
              <SocialShare product={displayProduct} url={window.location.href} />
            </div>

            {/* ── Variant Selection ── */}
            {displayProduct.product_structure === 'variant' && displayProduct.product_variants && (
              <div className="mt-6">
                <div className="space-y-5">
                  {Array.from(new Set(
                    displayProduct.product_variants.flatMap(v => {
                      if (!v.attributes) return [];
                      if (v.attributes instanceof Map) return Array.from(v.attributes.keys());
                      if (typeof v.attributes === 'object') return Object.keys(v.attributes);
                      return [];
                    }).filter(Boolean)
                  )).map(attributeName => {
                    const isColorAttribute =
                      attributeName.toLowerCase().includes('color') ||
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
                          /* ── Color Swatches ── */
                          // FIX: flex-wrap + gap ensure swatches wrap on small screens without overflow
                          <div className="flex flex-wrap gap-3">
                            {getAttributeOptions(attributeName).map(option => {
                              const isSelected = selectedAttributes[attributeName] === option;
                              const bgColor = resolveColor(option);
                              const light = isLightColor(bgColor);

                              return (
                                <button
                                  key={option}
                                  onClick={() => handleAttributeChange(attributeName, option)}
                                  className={`group relative flex flex-col items-center transition-all duration-200 ${
                                    isSelected ? 'scale-110' : 'hover:scale-105'
                                  }`}
                                  title={option}
                                >
                                  <div
                                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all duration-200 ${
                                      isSelected
                                        ? 'border-rose-600 shadow-lg ring-2 ring-rose-200'
                                        : light
                                          ? 'border-gray-300 hover:border-gray-400'
                                          : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    style={{ backgroundColor: bgColor }}
                                  >
                                    {isSelected && (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <svg
                                          className={`w-5 h-5 sm:w-6 sm:h-6 ${light ? 'text-gray-800' : 'text-white'}`}
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
                                  <span className={`mt-1.5 text-xs font-medium transition-colors ${
                                    isSelected ? 'text-rose-600' : 'text-gray-600 group-hover:text-gray-900'
                                  }`}>
                                    {option}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          /* ── Regular Attribute (Size, etc.) ── */
                          // FIX: flex-wrap so size buttons wrap on small screens
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
                                <div className={`rounded-md border px-3 py-2 sm:px-4 text-sm font-medium transition-all ${
                                  selectedAttributes[attributeName] === option
                                    ? 'border-rose-600 text-rose-600 bg-rose-50 shadow-sm'
                                    : 'border-gray-300 text-gray-900 hover:border-rose-400 hover:bg-gray-50'
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

            {/* Quantity Selector */}
            {displayProduct.product_type !== 'digital' && (
              <div className="mt-6 flex items-center">
                <h3 className="text-sm font-medium text-gray-500 w-20 sm:w-24 flex-shrink-0">Quantity:</h3>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg leading-none"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 text-center border border-gray-300 rounded-md text-sm py-1"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg leading-none"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Product Tags */}
            {displayProduct.tags && displayProduct.tags.length > 0 && (
              <div className="mt-5">
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
            {/* FIX: grid-cols-2 on all sizes, consistent padding */}
            <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-3 sm:gap-4 border-t border-b border-gray-200 py-4">
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                <ShieldCheckIcon className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 flex-shrink-0" />
                <span>100% Authentic</span>
              </div>
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                <CheckBadgeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 flex-shrink-0" />
                <span>Quality Checked</span>
              </div>
              {displayProduct.isFreeShipping !== false && (
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                  <TruckIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                  <span>Free Delivery</span>
                </div>
              )}
              {displayProduct.isCodAvailable !== false && (
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                  <CurrencyDollarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 flex-shrink-0" />
                  <span>Cash on Delivery</span>
                </div>
              )}
              {displayProduct.warranty && (
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                  <ShieldCheckIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                  <span>{displayProduct.warranty}</span>
                </div>
              )}
            </div>

            {/* Tabbed Information Section */}
            <div className="mt-6 sm:mt-8">
              <div className="border border-gray-200 rounded-md">
                <div className="border-b border-gray-200 bg-gray-50">
                  <nav className="-mb-px flex" aria-label="Tabs">
                    {['description', 'specifications', 'reviews'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`${
                          activeTab === tab
                            ? 'border-rose-500 text-rose-600 bg-white'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } flex-1 whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm text-center transition-colors capitalize`}
                      >
                        {tab}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* FIX: p-4 on mobile, p-6 on larger screens */}
                <div className="p-4 sm:p-6">
                  {activeTab === 'description' && (
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <div dangerouslySetInnerHTML={{ __html: displayProduct.description || 'No description available.' }} />
                    </div>
                  )}

                  {activeTab === 'specifications' && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-500 w-1/3">SKU</td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">{displayProduct.sku || 'N/A'}</td>
                          </tr>
                          {displayProduct.weight && (
                            <tr>
                              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-500">Weight</td>
                              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">{displayProduct.weight} kg</td>
                            </tr>
                          )}
                          {displayProduct.color && (
                            <tr>
                              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-500">Color</td>
                              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">{displayProduct.color}</td>
                            </tr>
                          )}
                          <tr>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-500">Product Type</td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 capitalize">{displayProduct.product_type || 'Physical'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <div id="ratings">
                      <RatingReview productId={displayProduct._id} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FIX: Extra bottom padding so mobile fixed bar doesn't overlap content */}
            <div className="h-20 lg:h-0" />
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-10 sm:mt-16">
          <RelatedProducts currentProduct={displayProduct} />
        </div>
      </div>

      {/* Mobile Action Buttons - Fixed at bottom */}
      {/* FIX: safe-area-inset for notched phones, proper z-index, full width */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-3 py-2 flex gap-2 lg:hidden z-50"
           style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <button
          onClick={handleAddToCart}
          disabled={(displayProduct.product_type === 'physical' && displayStock <= 0) || isAddingToCart}
          className={`flex-1 flex items-center justify-center rounded border px-3 py-3 text-sm font-medium shadow-sm ${
            displayProduct.product_type === 'physical' && displayStock <= 0
              ? 'bg-gray-300 text-white border-transparent cursor-not-allowed'
              : 'bg-white text-rose-600 border-2 border-rose-600'
          } disabled:opacity-50`}
        >
          {isAddingToCart
            ? <div className="w-5 h-5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
            : displayProduct.product_type === 'physical' && displayStock <= 0
              ? 'Out of Stock'
              : (
                <span className="flex items-center gap-1.5">
                  <ShoppingCartIcon className="h-4 w-4" />
                  Add to Cart
                </span>
              )
          }
        </button>
        <button
          onClick={async () => { await handleAddToCart(); openSidebar(); }}
          disabled={displayProduct.product_type === 'physical' && displayStock <= 0}
          className={`flex-1 flex items-center justify-center rounded border border-transparent px-3 py-3 text-sm font-medium text-white shadow-sm ${
            displayProduct.product_type === 'physical' && displayStock <= 0
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <CurrencyDollarIcon className="h-4 w-4" />
            Buy Now
          </span>
        </button>
      </div>
    </div>
  );
};

export default ProductDetails;