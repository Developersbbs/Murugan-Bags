// Guest storage utilities for cart and wishlist before login
// Uses sessionStorage to persist during browser session but not across browser restarts

const GUEST_CART_KEY = 'guest_cart_items';
const GUEST_WISHLIST_KEY = 'guest_wishlist_items';

// Guest Cart Functions
export const getGuestCart = () => {
  try {
    const cartData = localStorage.getItem(GUEST_CART_KEY);
    return cartData ? JSON.parse(cartData) : [];
  } catch (error) {
    console.error('Error reading guest cart:', error);
    return [];
  }
};

export const saveGuestCart = (items) => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    console.log('Guest cart saved:', items.length, 'items');
  } catch (error) {
    console.error('Error saving guest cart:', error);
  }
};

export const addToGuestCart = (product, variant = null, quantity = 1) => {
  try {
    const currentCart = getGuestCart();
    const productId = product._id;
    const variantKey = variant ? JSON.stringify(variant) : '';

    // Check if item already exists
    const existingItemIndex = currentCart.findIndex(item =>
      item.id === productId && JSON.stringify(item.variant || {}) === variantKey
    );

    if (existingItemIndex >= 0) {
      // Update quantity
      currentCart[existingItemIndex].quantity += quantity;
    } else {
      // Helper to extract image URL
      const getImageUrl = () => {
        // 1. Try variant image first
        if (variant && variant.images && variant.images.length > 0) {
          const img = variant.images[0];
          return typeof img === 'string' ? img : (img.url || img.secure_url);
        }

        // 2. Try product image_url (array of strings)
        if (product.image_url && Array.isArray(product.image_url) && product.image_url.length > 0) {
          return product.image_url[0];
        }

        // 3. Try product images (array of objects or strings)
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
          const img = product.images[0];
          return typeof img === 'string' ? img : (img.url || img.secure_url);
        }

        // 4. Try single image property
        if (product.image) return product.image;

        return null;
      };

      // Add new item
      const cartItem = {
        id: productId,
        name: product.name || 'Unknown Product',
        price: (variant && (variant.selling_price || variant.price)) || product.selling_price || product.price || 0,
        quantity: quantity,
        image: getImageUrl(),
        variant: variant || {},
        stock: (variant && variant.stock) || product.stock || 999,
        addedAt: new Date().toISOString()
      };
      currentCart.push(cartItem);
    }

    saveGuestCart(currentCart);
    return currentCart;
  } catch (error) {
    console.error('Error adding to guest cart:', error);
    return getGuestCart();
  }
};

export const removeFromGuestCart = (productId, variant = {}) => {
  try {
    const currentCart = getGuestCart();
    const variantKey = JSON.stringify(variant);

    const updatedCart = currentCart.filter(item =>
      !(item.id === productId && JSON.stringify(item.variant || {}) === variantKey)
    );

    saveGuestCart(updatedCart);
    return updatedCart;
  } catch (error) {
    console.error('Error removing from guest cart:', error);
    return getGuestCart();
  }
};

export const updateGuestCartQuantity = (productId, variant = {}, quantity) => {
  try {
    const currentCart = getGuestCart();
    const variantKey = JSON.stringify(variant);

    const updatedCart = currentCart.map(item => {
      if (item.id === productId && JSON.stringify(item.variant || {}) === variantKey) {
        return { ...item, quantity: Math.max(1, quantity) };
      }
      return item;
    });

    saveGuestCart(updatedCart);
    return updatedCart;
  } catch (error) {
    console.error('Error updating guest cart quantity:', error);
    return getGuestCart();
  }
};

export const clearGuestCart = () => {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
    console.log('Guest cart cleared');
    return [];
  } catch (error) {
    console.error('Error clearing guest cart:', error);
    return [];
  }
};

// Guest Wishlist Functions
export const getGuestWishlist = () => {
  try {
    const wishlistData = localStorage.getItem(GUEST_WISHLIST_KEY);
    return wishlistData ? JSON.parse(wishlistData) : [];
  } catch (error) {
    console.error('Error reading guest wishlist:', error);
    return [];
  }
};

export const saveGuestWishlist = (items) => {
  try {
    localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(items));
    console.log('Guest wishlist saved:', items.length, 'items');
  } catch (error) {
    console.error('Error saving guest wishlist:', error);
  }
};

export const addToGuestWishlist = (product) => {
  try {
    const currentWishlist = getGuestWishlist();
    const productId = product._id;
    const variantId = product.variant_id || null;

    // Check if item already exists (matching both product_id and variant_id)
    const existingItem = currentWishlist.find(item => {
      const sameProduct = item._id === productId;
      const sameVariant = variantId
        ? item.variant_id === variantId
        : !item.variant_id;
      return sameProduct && sameVariant;
    });

    if (!existingItem) {
      // Helper to extract image URL (Consistent with Cart)
      const getImageUrl = () => {
        // 1. Try product image_url (array of strings)
        if (product.image_url && Array.isArray(product.image_url) && product.image_url.length > 0) {
          return product.image_url[0];
        }

        // 2. Try product images (array of objects or strings)
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
          const img = product.images[0];
          return typeof img === 'string' ? img : (img.url || img.secure_url);
        }

        // 3. Try single image property
        if (product.image) return product.image;

        return null;
      };

      const wishlistItem = {
        _id: productId,
        id: productId,
        name: product.name || 'Unknown Product',
        price: product.selling_price || product.price || 0,
        image: getImageUrl(),
        variant_id: variantId,
        addedAt: new Date().toISOString()
      };

      currentWishlist.push(wishlistItem);
      saveGuestWishlist(currentWishlist);
    }

    return currentWishlist;
  } catch (error) {
    console.error('Error adding to guest wishlist:', error);
    return getGuestWishlist();
  }
};

export const removeFromGuestWishlist = (productId, variantId = null) => {
  try {
    const currentWishlist = getGuestWishlist();
    const updatedWishlist = currentWishlist.filter(item => {
      const sameProduct = item._id === productId;
      const sameVariant = variantId
        ? item.variant_id === variantId
        : !item.variant_id;
      return !(sameProduct && sameVariant);
    });

    saveGuestWishlist(updatedWishlist);
    return updatedWishlist;
  } catch (error) {
    console.error('Error removing from guest wishlist:', error);
    return getGuestWishlist();
  }
};

export const clearGuestWishlist = () => {
  try {
    localStorage.removeItem(GUEST_WISHLIST_KEY);
    console.log('Guest wishlist cleared');
    return [];
  } catch (error) {
    console.error('Error clearing guest wishlist:', error);
    return [];
  }
};

// Migration Functions (called when user logs in)
export const getGuestDataForMigration = () => {
  return {
    cart: getGuestCart(),
    wishlist: getGuestWishlist()
  };
};

export const clearAllGuestData = () => {
  clearGuestCart();
  clearGuestWishlist();
  console.log('All guest data cleared after migration');
};

// Utility Functions
export const isInGuestCart = (productId, variant = {}) => {
  const cart = getGuestCart();
  const variantKey = JSON.stringify(variant);
  return cart.some(item =>
    item.id === productId && JSON.stringify(item.variant || {}) === variantKey
  );
};

export const isInGuestWishlist = (productId, variantId = null) => {
  const wishlist = getGuestWishlist();
  return wishlist.some(item => {
    const sameProduct = item._id === productId;
    const sameVariant = variantId
      ? item.variant_id === variantId
      : !item.variant_id;
    return sameProduct && sameVariant;
  });
};

export const getGuestCartCount = () => {
  const cart = getGuestCart();
  return cart.reduce((total, item) => total + item.quantity, 0);
};

export const getGuestWishlistCount = () => {
  const wishlist = getGuestWishlist();
  return wishlist.length;
};
