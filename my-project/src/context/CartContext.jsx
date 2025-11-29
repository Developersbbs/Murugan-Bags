import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { cartAPI } from '../services/cartService';
import toast from 'react-hot-toast';
import {
  getGuestCart,
  addToGuestCart,
  removeFromGuestCart,
  updateGuestCartQuantity,
  clearGuestCart,
  getGuestDataForMigration,
  clearAllGuestData,
  isInGuestCart,
  getGuestCartCount
} from '../utils/guestStorage';

// Cart Context
const CartContext = createContext();

// Cart Actions
const CART_ACTIONS = {
  SET_CART: 'SET_CART',
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  SET_LOADING: 'SET_LOADING'
};

// Cart Reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.SET_CART:
      return {
        ...state,
        items: action.payload,
        itemCount: action.payload.reduce((total, item) => total + item.quantity, 0),
        loading: false
      };
    case CART_ACTIONS.ADD_ITEM:
      return {
        ...state,
        items: action.payload,
        itemCount: action.payload.reduce((total, item) => total + item.quantity, 0)
      };
    case CART_ACTIONS.REMOVE_ITEM:
      return {
        ...state,
        items: action.payload,
        itemCount: action.payload.reduce((total, item) => total + item.quantity, 0)
      };
    case CART_ACTIONS.UPDATE_QUANTITY:
      return {
        ...state,
        items: action.payload,
        itemCount: action.payload.reduce((total, item) => total + item.quantity, 0)
      };
    case CART_ACTIONS.CLEAR_CART:
      return {
        ...state,
        items: [],
        itemCount: 0
      };
    case CART_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    default:
      return state;
  }
};

// Initial State
const initialState = {
  items: [],
  itemCount: 0,
  loading: true
};

// Cart Provider Component
export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { user, loading: authLoading, isAuthenticated } = useSelector((state) => state.auth);

  // Set current user globally for utility functions
  useEffect(() => {
    window.__CURRENT_USER__ = user;
  }, [user]);

  // Load cart on mount
  useEffect(() => {
    if (!user || !user.uid) {
      // Load guest cart for non-authenticated users
      const guestCart = getGuestCart();
      dispatch({ type: CART_ACTIONS.SET_CART, payload: guestCart });
      console.log('CartContext: Loaded guest cart with', guestCart.length, 'items');
    }
  }, []);

  // Handle user authentication changes - optimized to reduce API calls
  useEffect(() => {
    console.log('CartContext: Auth state changed:', {
      user: user ? user.uid : 'null',
      authLoading,
      isAuthenticated
    });
    
    // Don't process if still loading authentication
    if (authLoading) {
      console.log('CartContext: Auth still loading, waiting...');
      return;
    }
    
    if (user && user.uid && isAuthenticated) {
      // User logged in - load from MongoDB with debouncing
      console.log('CartContext: User authenticated, scheduling cart load for:', user.uid);
      
      // Debounce cart loading to avoid multiple rapid calls
      const loadTimer = setTimeout(() => {
        if (user && user.uid && isAuthenticated) {
          console.log('CartContext: Triggering cart load after debounce');
          handleUserLogin();
        }
      }, 500); // 500ms debounce
      
      return () => clearTimeout(loadTimer);
    } else {
      // User logged out or not authenticated - load guest cart
      console.log('CartContext: User not authenticated, loading guest cart');
      const guestCart = getGuestCart();
      dispatch({ type: CART_ACTIONS.SET_CART, payload: guestCart });
    }
  }, [user, authLoading, isAuthenticated]);

  // Listen for auth events only (no localStorage sync)
  useEffect(() => {
    const handleAuthUserRestored = () => {
      console.log('CartContext: Auth user restored event received');
      if (user && user.uid && isAuthenticated) {
        console.log('CartContext: Triggering cart reload after auth restoration');
        handleUserLogin();
      }
    };

    window.addEventListener('auth:user-restored', handleAuthUserRestored);

    return () => {
      window.removeEventListener('auth:user-restored', handleAuthUserRestored);
    };
  }, [user, isAuthenticated]);

  // Removed loadCart function - we only use MongoDB data now

  const handleUserLogin = async (retryCount = 0) => {
    if (!user || !user.uid) {
      console.log('No valid user found, skipping cart load');
      return;
    }
    
    console.log('User logged in, loading cart from MongoDB for user:', user.uid, 'retry:', retryCount);
    dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
    
    try {
      // Get guest cart for migration
      const guestCart = getGuestCart();
      console.log('Guest cart items to migrate:', guestCart.length);
      
      // Load existing cart from backend MongoDB
      const backendCart = await cartAPI.getCart();
      
      if (backendCart.success && backendCart.data && backendCart.data.items && backendCart.data.items.length > 0) {
        console.log('Cart loaded from MongoDB:', backendCart.data.items.length, 'items');
        
        // Transform backend cart format to frontend format
        const transformedItems = backendCart.data.items.map(item => ({
          id: item.product_id._id || item.product_id,
          cartItemId: item._id,
          name: item.product_id.name || item.name || 'Unknown Product',
          price: item.product_id.selling_price || item.price || 0,
          quantity: item.quantity || 1,
          image: (item.product_id.image_url && item.product_id.image_url[0]) || item.image || null,
          variant: item.variant_attributes || {},
          stock: item.product_id.stock || 999
        }));
        
        dispatch({ type: CART_ACTIONS.SET_CART, payload: transformedItems });
        
        // Migrate guest cart items if any
        if (guestCart.length > 0) {
          console.log('User has existing MongoDB cart AND guest cart - migrating guest items...');
          await migrateGuestCartItems(guestCart);
        } else {
          console.log('User has existing MongoDB cart, no guest items to migrate');
        }
      } else {
        // No cart found in MongoDB, migrate guest cart if any
        console.log('No cart found in MongoDB for user');
        if (guestCart.length > 0) {
          console.log('Migrating guest cart items to empty MongoDB cart...');
          await migrateGuestCartItems(guestCart);
        } else {
          console.log('No guest cart items to migrate, starting with empty cart');
          dispatch({ type: CART_ACTIONS.CLEAR_CART });
        }
      }
    } catch (error) {
      console.error('Error loading cart from MongoDB:', error);
      
      // Check if it's an authentication error
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.warn('Authentication error loading cart, user may need to re-login');
        
        // Retry once after a short delay for auth errors
        if (retryCount === 0) {
          console.log('Retrying cart load after auth error...');
          setTimeout(() => handleUserLogin(1), 1000);
          return;
        } else {
          toast.error('Please login again to access your cart');
        }
      } else {
        // For other errors, retry once
        if (retryCount === 0) {
          console.log('Retrying cart load after error...');
          setTimeout(() => handleUserLogin(1), 500);
          return;
        } else {
          toast.error('Failed to load cart data');
        }
      }
      
      // Start with empty cart on final error
      dispatch({ type: CART_ACTIONS.CLEAR_CART });
    } finally {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Migrate guest cart items to MongoDB when user logs in
  const migrateGuestCartItems = async (guestCartItems) => {
    try {
      console.log('Starting guest cart migration:', guestCartItems.length, 'items');
      let migratedCount = 0;
      
      for (const guestItem of guestCartItems) {
        try {
          console.log('Migrating guest cart item:', guestItem);
          
          const cartItem = {
            product_id: guestItem.id,
            quantity: guestItem.quantity,
            price: guestItem.price,
            discounted_price: guestItem.price, // Use same price as discounted for guest items
            product_name: guestItem.name,
            product_image: guestItem.image,
            variant_attributes: guestItem.variant || {}
          };
          
          console.log('Sending cart item to backend:', cartItem);
          const response = await cartAPI.addToCart(cartItem);
          console.log('Backend response for cart migration:', response);
          
          if (response.success) {
            migratedCount++;
            console.log('Successfully migrated guest cart item:', guestItem.name);
          } else {
            console.error('Failed to migrate guest cart item - backend error:', guestItem.name, response);
          }
        } catch (error) {
          console.error('Failed to migrate guest cart item - exception:', guestItem.name, error);
        }
      }
      
      console.log('Guest cart migration completed:', migratedCount, 'of', guestCartItems.length, 'items migrated');
      
      // Reload cart to show migrated items
      if (migratedCount > 0) {
        // Load the updated cart from backend without recursion
        try {
          console.log('Reloading cart from backend after migration...');
          const backendCart = await cartAPI.getCart();
          console.log('Backend cart response after migration:', backendCart);
          
          if (backendCart.success && backendCart.data && backendCart.data.items) {
            const transformedItems = backendCart.data.items.map(item => ({
              id: item.product_id._id || item.product_id,
              cartItemId: item._id,
              name: item.product_id.name || item.name || 'Unknown Product',
              price: item.product_id.selling_price || item.price || 0,
              quantity: item.quantity || 1,
              image: (item.product_id.image_url && item.product_id.image_url[0]) || item.image || null,
              variant: item.variant_attributes || {},
              stock: item.product_id.stock || 999
            }));
            console.log('Setting cart with transformed items:', transformedItems);
            dispatch({ type: CART_ACTIONS.SET_CART, payload: transformedItems });
            
            // Clear guest cart only after successful reload
            console.log('Clearing guest cart after successful reload');
            clearGuestCart();
          } else {
            console.error('Failed to reload cart after migration - no items in response');
          }
        } catch (error) {
          console.error('Error reloading cart after migration:', error);
        }
        toast.success(`${migratedCount} items moved to your cart`);
      } else {
        // Clear guest cart even if no items were migrated
        console.log('Clearing guest cart - no items migrated');
        clearGuestCart();
      }
    } catch (error) {
      console.error('Error during guest cart migration:', error);
    }
  };

  const addToCart = async (product, variant = null, quantity = 1) => {
    try {
      console.log('CartContext: Adding to cart:', product._id);
      
      // For authenticated users, add directly to MongoDB
      if (user && user.uid) {
        // Enhanced price validation with better fallbacks
        const basePrice = product.selling_price || product.price || product.mrp || 1;
        const discountedPrice = product.salePrice || product.selling_price || product.price || product.mrp || basePrice;
        
        const cartItem = {
          product_id: product._id,
          quantity: quantity,
          price: basePrice,
          discounted_price: discountedPrice,
          product_name: product.name || 'Unknown Product',
          product_image: (product.image_url && product.image_url[0]) || product.images?.[0]?.url || null,
          variant_attributes: variant || {}
        };
        
        console.log('CartContext: Sending cart item:', cartItem);
        console.log('CartContext: Original product data:', {
          _id: product._id,
          name: product.name,
          price: product.price,
          selling_price: product.selling_price,
          salePrice: product.salePrice,
          mrp: product.mrp
        });
        
        // Enhanced validation with detailed error messages
        if (!cartItem.product_id) {
          throw new Error('Product ID is required');
        }
        if (!cartItem.product_name) {
          throw new Error('Product name is required');
        }
        if (cartItem.price === undefined || cartItem.price === null) {
          throw new Error('Product price is required');
        }
        if (cartItem.discounted_price === undefined || cartItem.discounted_price === null) {
          throw new Error('Product discounted price is required');
        }
        if (cartItem.price <= 0) {
          console.warn('CartContext: Product has zero or negative price, using fallback value of 1');
          cartItem.price = 1;
        }
        if (cartItem.discounted_price <= 0) {
          console.warn('CartContext: Product has zero or negative discounted price, using price as fallback');
          cartItem.discounted_price = cartItem.price;
        }
        
        const response = await cartAPI.addToCart(cartItem);
        
        if (response.success && response.data && response.data.items) {
          // Update local state with backend response
          const backendCartItems = response.data.items.map(item => ({
            id: item.product_id._id || item.product_id,
            cartItemId: item._id,
            name: item.product_id.name || item.name || 'Unknown Product',
            price: item.product_id.selling_price || item.price || 0,
            quantity: item.quantity || 1,
            image: (item.product_id.image_url && item.product_id.image_url[0]) || item.image || null,
            variant: item.variant_attributes || {},
            stock: item.product_id.stock || 999
          }));
          
          dispatch({ type: CART_ACTIONS.SET_CART, payload: backendCartItems });
          console.log('CartContext: Item added to MongoDB cart successfully');
        }
      } else {
        // For non-authenticated users, add to guest cart
        console.log('CartContext: Adding to guest cart for non-authenticated user');
        const updatedGuestCart = addToGuestCart(product, variant, quantity);
        dispatch({ type: CART_ACTIONS.SET_CART, payload: updatedGuestCart });
        console.log('CartContext: Item added to guest cart successfully');
        
        // Show a subtle notification about signing in for better experience
        toast.success('Item added to cart! Sign in to save across devices.', {
          duration: 3000,
          icon: '🛒'
        });
      }
    } catch (error) {
      console.error('CartContext: Error adding to cart:', error);
      toast.error('Failed to add item to cart');
      throw error;
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      console.log('CartContext: Removing from cart:', itemId);
      
      // For authenticated users, remove from MongoDB
      if (user && user.uid) {
        const response = await cartAPI.removeFromCart(itemId);
        
        if (response.success) {
          // Reload cart from backend to ensure consistency
          await handleUserLogin();
          console.log('CartContext: Item removed from MongoDB cart successfully');
        }
      } else {
        // For non-authenticated users, remove from guest cart
        console.log('CartContext: Removing from guest cart for non-authenticated user');
        // Find the item in current state to get product ID and variant
        const currentItem = state.items.find(item => item.cartItemId === itemId || item.id === itemId);
        if (currentItem) {
          const updatedGuestCart = removeFromGuestCart(currentItem.id, currentItem.variant);
          dispatch({ type: CART_ACTIONS.SET_CART, payload: updatedGuestCart });
          console.log('CartContext: Item removed from guest cart successfully');
        }
      }
    } catch (error) {
      console.error('CartContext: Error removing from cart:', error);
      toast.error('Failed to remove item from cart');
      throw error;
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      console.log('CartContext: Updating cart item quantity:', itemId, quantity);
      
      // For authenticated users, update in MongoDB
      if (user && user.uid) {
        const response = await cartAPI.updateCartItem(itemId, quantity);
        
        if (response.success) {
          // Reload cart from backend to ensure consistency
          await handleUserLogin();
          console.log('CartContext: Cart item quantity updated in MongoDB successfully');
        }
      } else {
        // For non-authenticated users, update guest cart
        console.log('CartContext: Updating guest cart quantity for non-authenticated user');
        // Find the item in current state to get product ID and variant
        const currentItem = state.items.find(item => item.cartItemId === itemId || item.id === itemId);
        if (currentItem) {
          const updatedGuestCart = updateGuestCartQuantity(currentItem.id, currentItem.variant, quantity);
          dispatch({ type: CART_ACTIONS.SET_CART, payload: updatedGuestCart });
          console.log('CartContext: Guest cart quantity updated successfully');
        }
      }
    } catch (error) {
      console.error('CartContext: Error updating cart item quantity:', error);
      toast.error('Failed to update cart item');
      throw error;
    }
  };

  const clearCart = async (forceLocalClear = false) => {
    try {
      console.log('CartContext: Clearing cart');
      
      // For authenticated users, clear MongoDB cart
      if (user && user.uid && !forceLocalClear) {
        const response = await cartAPI.clearCart();
        
        if (response.success) {
          dispatch({ type: CART_ACTIONS.CLEAR_CART });
          console.log('CartContext: MongoDB cart cleared successfully');
        }
      } else {
        // For non-authenticated users or forced local clear, clear guest cart
        clearGuestCart();
        dispatch({ type: CART_ACTIONS.CLEAR_CART });
        console.log('CartContext: Guest cart cleared successfully');
      }
    } catch (error) {
      console.error('CartContext: Error clearing cart:', error);
      
      // If it's a 404 or network error, but we know the cart should be cleared (e.g., after order placement),
      // force clear the local cart state
      if (forceLocalClear || error.response?.status === 404 || !error.response) {
        console.log('CartContext: Forcing local cart clear due to API error');
        clearGuestCart();
        dispatch({ type: CART_ACTIONS.CLEAR_CART });
      } else {
        toast.error('Failed to clear cart');
        throw error;
      }
    }
  };

  const getTotal = () => {
    return state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getDiscountedTotal = () => {
    return state.items.reduce((total, item) => {
      const price = item.discounted_price || item.price;
      return total + (price * item.quantity);
    }, 0);
  };

  const isInCart = (productId, variantAttributes = {}) => {
    return state.items.some(item => 
      item.id === productId && 
      JSON.stringify(item.variant || {}) === JSON.stringify(variantAttributes)
    );
  };

  const getItemQuantity = (productId, variantAttributes = {}) => {
    const item = state.items.find(item => 
      item.id === productId && 
      JSON.stringify(item.variant || {}) === JSON.stringify(variantAttributes)
    );
    return item ? item.quantity : 0;
  };

  const value = {
    // State
    items: state.items,
    itemCount: state.itemCount,
    loading: state.loading,
    
    // Actions
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    
    // Computed values
    getTotal,
    getDiscountedTotal,
    isInCart,
    getItemQuantity,
    
    // Utility
    isUsingCookies: false, // No longer using cookies, only MongoDB
    isAuthenticated: !!(user && user.uid), // Helper to check if user is authenticated
    isGuestMode: !(user && user.uid) // Helper to check if in guest mode
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
