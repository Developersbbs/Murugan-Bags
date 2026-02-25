const CART_STORAGE_KEY = 'sbbs_cart';

// Get cart from local storage
export const getCart = () => {
  if (typeof window === 'undefined') return [];
  const cart = localStorage.getItem(CART_STORAGE_KEY);
  return cart ? JSON.parse(cart) : [];
};

// Save cart to local storage and dispatch update event
export const saveCart = (cart) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    // Dispatch custom event to notify about cart update
    window.dispatchEvent(new Event('cartUpdated'));
    // Also trigger storage event for cross-tab sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: CART_STORAGE_KEY,
      newValue: JSON.stringify(cart)
    }));
  }
};

// Add item to cart
export const addToCart = (product, variant = null, quantity = 1) => {
  const cart = getCart();

  // For variant products, use variant ID, otherwise use product ID
  const itemId = variant ? variant._id : product._id;
  const existingItemIndex = cart.findIndex(item =>
    item.id === itemId &&
    JSON.stringify(item.variant) === JSON.stringify(variant?.attributes || {})
  );

  if (existingItemIndex >= 0) {
    // Update quantity if item already in cart
    cart[existingItemIndex].quantity += quantity;
  } else {
    // Add new item to cart
    cart.push({
      id: itemId,
      productId: product._id,
      name: variant ? `${product.name} - ${variant.name || 'Variant'}` : product.name,
      price: variant ? variant.selling_price : product.selling_price,
      image: product.image_url?.[0] || '/images/placeholder-product.png',
      quantity,
      variant: variant ? variant.attributes : null,
      variantId: variant ? variant._id : null,
      stock: variant ? variant.stock : product.baseStock,
      productType: product.product_type
    });
  }

  saveCart(cart);
  return cart;
};

// Remove item from cart
export const removeFromCart = (itemId, variantAttributes = {}) => {
  const cart = getCart();
  const updatedCart = cart.filter(
    item => !(item.id === itemId &&
      JSON.stringify(item.variant || {}) === JSON.stringify(variantAttributes))
  );
  saveCart(updatedCart);
  return updatedCart;
};

// Update item quantity in cart
export const updateCartItemQuantity = (itemId, quantity, variantAttributes = {}) => {
  if (quantity < 1) return removeFromCart(itemId, variantAttributes);

  const cart = getCart();
  const itemIndex = cart.findIndex(
    item => item.id === itemId &&
      JSON.stringify(item.variant || {}) === JSON.stringify(variantAttributes)
  );

  if (itemIndex >= 0) {
    cart[itemIndex].quantity = quantity;
    saveCart(cart);
  }

  return cart;
};

// Clear the cart
export const clearCart = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CART_STORAGE_KEY);
  }
  return [];
};

// Get cart item count
export const getCartItemCount = () => {
  const cart = getCart();
  return cart.reduce((total, item) => total + item.quantity, 0);
};
