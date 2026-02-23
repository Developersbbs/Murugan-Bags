import React, { useState, memo, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import toast from 'react-hot-toast';
import LazyImage from '../common/LazyImage';
import { ShareIcon } from '@heroicons/react/24/outline';

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { getFullImageUrl } from '../../utils/imageUtils';

function extractImageUrl(img) {
  if (!img) return null;
  let url = typeof img === 'string' ? img : (img.url || img.secure_url || img.path || null);
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    url = url.startsWith('/') ? url : `/${url}`;
  } else {
    url = `/uploads/${url}`;
  }
  return getFullImageUrl(url);
}

function firstImage(images) {
  if (!images) return null;
  const arr = Array.isArray(images) ? images : [images];
  for (const img of arr) {
    const url = extractImageUrl(img);
    if (url) return url;
  }
  return null;
}

function placeholderSvg() {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'>
    <rect width='400' height='300' fill='#f8f9fa'/>
    <text x='50%' y='50%' font-size='16' text-anchor='middle' dominant-baseline='middle' fill='#adb5bd' font-family='sans-serif'>No Image</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function getAttrValue(attributes, ...names) {
  if (!attributes) return null;
  for (const name of names) {
    for (const key of Object.keys(attributes)) {
      if (key.toLowerCase() === name.toLowerCase() && attributes[key]) {
        return attributes[key];
      }
    }
  }
  return null;
}

function detectSwatchType(attributes) {
  if (!attributes) return null;
  const keys = Object.keys(attributes).map(k => k.toLowerCase());
  if (keys.some(k => k === 'color' || k === 'colour')) return 'color';
  if (keys.some(k => k === 'size')) return 'size';
  return 'other';
}

// ─── Main Component ────────────────────────────────────────────────────────────
const ProductCard = memo(({ product, viewMode = 'grid', className = '' }) => {
  const { addToCart, isInCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // ── Variants ─────────────────────────────────────────────────────────────────
  const hasVariants = product.product_structure === 'variant' &&
    Array.isArray(product.product_variants) && product.product_variants.length > 0;

  const defaultVariantIdx = useMemo(() => {
    if (!hasVariants) return 0;
    const idx = product.product_variants.findIndex(v => v.published !== false);
    return idx >= 0 ? idx : 0;
  }, [hasVariants, product.product_variants]);

  const [selectedVariantIdx, setSelectedVariantIdx] = useState(defaultVariantIdx);
  const selectedVariant = hasVariants ? product.product_variants[selectedVariantIdx] : null;

  const swatchType = useMemo(() => {
    if (!hasVariants) return null;
    for (const v of product.product_variants) {
      const t = detectSwatchType(v.attributes);
      if (t) return t;
    }
    return 'other';
  }, [hasVariants, product.product_variants]);

  // ── Destructure ────────────────────────────────────────────────────────────
  const {
    _id, name, selling_price, price, image_url,
    averageRating, totalReviews, salePrice, slug, showRatings,
    _isVariant, isVariant, _variantData, _originalProductId,
    parentProductId: originalParentProductId,
    baseStock, minStock, status,
  } = product;

  const isLegacyVariant = isVariant || _isVariant;
  const parentId = _originalProductId || originalParentProductId;
  const effectiveId = parentId || _id;
  const productLink = parentId ? `/product/${parentId}` : `/product/${slug || _id}`;

  // ── Price ──────────────────────────────────────────────────────────────────
  let displayPrice;
  let displayMrp; // original/crossed-out price
  if (hasVariants && selectedVariant) {
    displayPrice = selectedVariant.selling_price || selectedVariant.salesPrice || 0;
    displayMrp = selectedVariant.cost_price && selectedVariant.cost_price > displayPrice ? selectedVariant.cost_price : null;
  } else if (isLegacyVariant && _variantData) {
    displayPrice = _variantData.selling_price || _variantData.salesPrice || selling_price || salePrice || price;
    displayMrp = null;
  } else {
    displayPrice = salePrice || selling_price || price || 0;
    displayMrp = salePrice && selling_price && selling_price > salePrice ? selling_price : null;
  }

  const discountPct = displayMrp && displayPrice ? Math.round((displayMrp - Number(displayPrice)) / displayMrp * 100) : 0;

  // ── Image ──────────────────────────────────────────────────────────────────
  let mainImage;
  let hoverImage = null; // Second image for hover effect

  const extractImages = (imagesArray) => {
    if (!imagesArray) return { main: null, hover: null };
    const arr = Array.isArray(imagesArray) ? imagesArray : [imagesArray];
    const extracted = arr.map(extractImageUrl).filter(Boolean);
    return {
      main: extracted[0] || null,
      hover: extracted.length > 1 ? extracted[1] : null
    };
  };

  if (hasVariants && selectedVariant) {
    const { main, hover } = extractImages(selectedVariant.images);
    mainImage = main || firstImage(image_url) || placeholderSvg();
    hoverImage = hover;
  } else if (isLegacyVariant && _variantData?.images?.length) {
    const { main, hover } = extractImages(_variantData.images);
    mainImage = main || firstImage(image_url) || placeholderSvg();
    hoverImage = hover;
  } else {
    // Check product.images first as it usually has the array of images
    let main, hover;
    const prodImages = extractImages(product.images);
    if (prodImages.main) {
      main = prodImages.main;
      hover = prodImages.hover;
    } else {
      const urlImages = extractImages(image_url);
      main = urlImages.main;
      hover = urlImages.hover;
    }
    mainImage = main || (product.image ? extractImageUrl(product.image) : null) || placeholderSvg();
    hoverImage = hover;
  }

  // Fallback: if no hover image was found in variants, try to use the main product's second image
  if (!hoverImage && product.images && product.images.length > 1) {
    hoverImage = extractImageUrl(product.images[1]);
  }

  // ── Stock ──────────────────────────────────────────────────────────────────
  let isOutOfStock;
  if (hasVariants && selectedVariant) {
    isOutOfStock = (selectedVariant.stock <= (selectedVariant.minStock || 0)) || selectedVariant.status === 'out_of_stock';
  } else {
    const currentStock = baseStock !== undefined ? baseStock : product.stock;
    isOutOfStock = currentStock <= (minStock || 0) || status === 'out_of_stock';
  }

  // ── Context ────────────────────────────────────────────────────────────────
  const variantId = isLegacyVariant ? _id : (hasVariants && selectedVariant ? (selectedVariant._id || selectedVariant.id) : null);
  const productInWishlist = isInWishlist(effectiveId, variantId);
  const productInCart = isInCart(effectiveId);
  const ratingValue = averageRating || 0;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleWishlist = async (e) => {
    e.preventDefault(); e.stopPropagation();
    try {
      if (productInWishlist) { await removeFromWishlist(effectiveId, variantId); toast.success('Removed from wishlist'); }
      else {
        await addToWishlist({
          ...product,
          _id: effectiveId,
          variant_id: variantId,
          selling_price: displayPrice,
          image_url: [mainImage]
        });
        toast.success('Added to wishlist');
      }
    } catch { toast.error('Failed to update wishlist'); }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (isAddingToCart || isOutOfStock) return;
    if (hasVariants) { navigate(productLink); return; }
    if (isLegacyVariant && _variantData) {
      setIsAddingToCart(true);
      try {
        await addToCart({ ..._variantData, _id: parentId, name: product.originalName || name, description: product.originalDescription || product.description, categories: product.originalCategories || product.categories }, _variantData, 1);
        toast.success('Added to cart');
      } catch { toast.error('Failed to add to cart'); } finally { setIsAddingToCart(false); }
      return;
    }
    setIsAddingToCart(true);
    try { await addToCart(product, null, 1); toast.success('Added to cart'); }
    catch { toast.error('Failed to add to cart'); } finally { setIsAddingToCart(false); }
  };

  const handleShare = async (e) => {
    e.preventDefault(); e.stopPropagation();
    try { await navigator.clipboard.writeText(`${window.location.origin}${productLink}`); toast.success('Link copied!'); }
    catch { toast.error('Failed to copy link'); }
  };

  const handleSwatchClick = (e, idx) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedVariantIdx(idx);
  };

  // ── Colour swatches ────────────────────────────────────────────────────────
  const renderColourSwatches = () => {
    if (!hasVariants || product.product_variants.length <= 1) return null;

    // Group variants by colour to avoid duplicate swatches for different sizes
    const uniqueColours = [];
    const colorSwatches = [];

    product.product_variants.forEach((variant, idx) => {
      const attrs = variant.attributes || {};
      const colorVal = getAttrValue(attrs, 'color', 'Color', 'colour', 'Colour');

      // If we found a colour and it's not already in our unique list
      if (colorVal) {
        const colorKey = colorVal.toLowerCase();
        if (!uniqueColours.includes(colorKey)) {
          uniqueColours.push(colorKey);
          colorSwatches.push({ variant, idx, colorVal });
        }
      } else if (swatchType !== 'color' && swatchType !== 'colour') {
        // For non-colour variant setups (like size only), just show all
        colorSwatches.push({ variant, idx, isOther: true });
      }
    });

    // If grouping resulted in only 1 swatch, no need to show it
    if (colorSwatches.length <= 1) return null;

    return (
      <div className="mt-2.5">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
          {swatchType === 'color' || swatchType === 'colour' ? 'Colour' : swatchType === 'size' ? 'Size' : 'Variant'}
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          {colorSwatches.map(({ variant, idx: originalIdx, colorVal, isOther }, mappingIdx) => {
            // Check if currently selected variant matches this swatch's colour/variant
            const isSelected = isOther
              ? selectedVariantIdx === originalIdx
              : getAttrValue(selectedVariant?.attributes, 'color', 'Color', 'colour', 'Colour')?.toLowerCase() === colorVal.toLowerCase();

            const attrs = variant.attributes || {};

            // Colour swatch
            if (colorVal) {
              const thumbImg = firstImage(variant.images);

              if (thumbImg) {
                return (
                  <button
                    key={mappingIdx}
                    type="button"
                    onClick={(e) => handleSwatchClick(e, originalIdx)}
                    title={colorVal || variant.name || `Variant ${mappingIdx + 1}`}
                    className={`w-12 h-12 rounded border-2 overflow-hidden transition-all duration-150 focus:outline-none flex-shrink-0
                      ${isSelected ? 'border-orange-400 scale-105 shadow-md' : 'border-gray-200 hover:border-gray-400'}`}
                  >
                    <img
                      src={thumbImg}
                      alt={colorVal || variant.name || ''}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </button>
                );
              }

              return (
                <button
                  key={mappingIdx}
                  type="button"
                  onClick={(e) => handleSwatchClick(e, originalIdx)}
                  title={colorVal}
                  style={{ backgroundColor: colorVal.toLowerCase() }}
                  className={`w-6 h-6 rounded-full border-2 transition-all duration-150 focus:outline-none flex-shrink-0
                    ${isSelected ? 'border-orange-500 scale-110 shadow-md ring-2 ring-orange-300 ring-offset-1' : 'border-gray-300 hover:border-gray-500 hover:scale-110'}`}
                />
              );
            }

            // Size pill fallback if no colours
            if (swatchType === 'size') {
              const sizeVal = getAttrValue(attrs, 'size', 'Size');
              return (
                <button
                  key={mappingIdx}
                  type="button"
                  onClick={(e) => handleSwatchClick(e, originalIdx)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded border transition-all duration-150 focus:outline-none
                    ${isSelected ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-700 hover:text-gray-900'}`}
                >
                  {sizeVal || variant.name || `V${mappingIdx + 1}`}
                </button>
              );
            }

            // Fallback text pill
            return (
              <button
                key={mappingIdx}
                type="button"
                onClick={(e) => handleSwatchClick(e, originalIdx)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded border transition-all duration-150 focus:outline-none
                  ${isSelected ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-700 hover:text-gray-900'}`}
              >
                {variant.name || `V${mappingIdx + 1}`}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── LIST VIEW ─────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 p-5 ${className}`}>
        <div className="flex items-start space-x-4">
          <Link to={productLink} className="flex-shrink-0">
            <div className="relative w-28 h-28 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
              <LazyImage src={mainImage} alt={name} className="w-full h-full object-contain p-1 hover:scale-105 transition-transform duration-200"
                placeholder={<div className="flex items-center justify-center h-full"><svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>}
              />
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={productLink}>
              <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2 hover:text-rose-600 transition-colors">{name}</h3>
            </Link>
            {renderColourSwatches()}
            <div className="flex items-baseline gap-2 mt-2 mb-2">
              <span className="text-lg font-bold text-gray-900">From ₹{Math.round(Number(displayPrice))}</span>
              {displayMrp && <span className="text-sm text-gray-400 line-through">₹{Math.round(displayMrp)}</span>}
              {discountPct > 0 && <span className="text-xs bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-semibold">{discountPct}% off</span>}
            </div>
            {showRatings !== false && ratingValue > 0 && (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className={`w-3.5 h-3.5 ${i < Math.round(ratingValue) ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="text-xs text-gray-500 ml-1">{ratingValue.toFixed(1)} ({totalReviews || 0})</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={toggleWishlist} className={`p-2 rounded-lg border ${productInWishlist ? 'bg-red-50 border-red-200 text-red-500' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-rose-500'}`}>
              <svg className="w-5 h-5" fill={productInWishlist ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </button>
            <button onClick={handleAddToCart} disabled={isAddingToCart || isOutOfStock}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-rose-600 text-white hover:bg-rose-700'} disabled:opacity-50`}>
              {isAddingToCart ? 'Adding...' : isOutOfStock ? 'Out of Stock' : hasVariants ? 'Select Size' : productInCart ? 'In Cart' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── GRID VIEW ─────────────────────────────────────────────────────────────
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm h-full flex flex-col overflow-hidden transition-all duration-300 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Image Block ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gray-50 group">
        <Link to={productLink} className="block relative aspect-square overflow-hidden">
          {/* Main Image (Always visible, serves as background during crossfade) */}
          <div className="absolute inset-0">
            <LazyImage
              src={mainImage}
              alt={name}
              className="w-full h-full object-cover"
              placeholder={
                <div className="flex items-center justify-center h-full bg-gray-50 text-gray-200">
                  <svg className="w-12 h-12 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              }
            />
          </div>

          {/* Hover Image (Fades in over main image on hover) */}
          {hoverImage && (
            <div className={`absolute inset-0 bg-white transition-opacity duration-500 ease-in-out ${isHovered ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <LazyImage
                src={hoverImage}
                alt={`${name} alt view`}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* ── "Select Size" hover overlay ─────────────────────── */}
          <div
            className={`absolute inset-x-0 bottom-0 z-20 transition-all duration-300 ease-in-out ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
              }`}
          >
            <div className="bg-rose-600/90 backdrop-blur-sm text-center py-2.5 px-4 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
              <span className="text-sm font-semibold text-white tracking-wide shadow-sm">
                {isOutOfStock ? 'Out of Stock' : hasVariants ? 'Select Size' : 'Add to Cart'}
              </span>
            </div>
          </div>
        </Link>

        {/* ── Badge: Sold Out ──────────────────────────────────── */}
        {isOutOfStock && (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">Sold Out</span>
          </div>
        )}

        {/* ── Discount badge ───────────────────────────────────── */}
        {discountPct > 0 && !isOutOfStock && (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">{discountPct}% off</span>
          </div>
        )}

        {/* ── Wishlist button ──────────────────────────────────── */}
        <button
          onClick={toggleWishlist}
          className={`absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-gray-100 shadow-sm transition-all duration-200 ${productInWishlist ? 'text-rose-500' : 'text-gray-400 hover:text-rose-500'}`}
          title={productInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill={productInWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        {/* ── Share button ─────────────────────────────────────── */}
        <button
          onClick={handleShare}
          className="absolute top-11 right-3 z-10 p-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-gray-100 shadow-sm transition-all duration-200 text-gray-400 hover:text-blue-500"
          title="Share"
        >
          <ShareIcon className="h-4 w-4" />
        </button>
      </div>

      {/* ── Card Body ───────────────────────────────────────────── */}
      <div className="p-4 flex flex-col flex-1">

        {/* Name */}
        <Link to={productLink} className="block mb-2">
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug hover:text-rose-600 transition-colors">
            {name}
          </h3>
        </Link>

        {/* Price row — Safari style */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-base font-bold text-rose-600">
            {hasVariants || displayMrp ? 'From ' : ''}₹{Math.round(Number(displayPrice))}
          </span>
          {displayMrp && (
            <span className="text-xs text-gray-400 line-through">₹{Math.round(displayMrp)}</span>
          )}
        </div>

        {/* Rating */}
        {showRatings !== false && ratingValue > 0 && (
          <div className="flex items-center gap-1 mb-1">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className={`w-3 h-3 ${i < Math.round(ratingValue) ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-[11px] text-gray-500 ml-0.5 font-medium">{ratingValue.toFixed(1)}</span>
          </div>
        )}

        {/* ── Colour swatches — below price/rating, just like Safari ── */}
        {renderColourSwatches()}

      </div>
    </div>
  );
});

export default ProductCard;
