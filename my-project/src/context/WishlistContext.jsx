import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { wishlistAPI } from '../services/wishlistService';
import toast from 'react-hot-toast';
import {
  getGuestWishlist,
  addToGuestWishlist,
  removeFromGuestWishlist,
  clearGuestWishlist,
  isInGuestWishlist,
  getGuestWishlistCount
} from '../utils/guestStorage';

// Wishlist Context
const WishlistContext = createContext();

// Wishlist Actions
const WISHLIST_ACTIONS = {
  SET_WISHLIST: 'SET_WISHLIST',
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  CLEAR_WISHLIST: 'CLEAR_WISHLIST',
  SET_LOADING: 'SET_LOADING'
};

// Wishlist Reducer
const wishlistReducer = (state, action) => {
  switch (action.type) {
    case WISHLIST_ACTIONS.SET_WISHLIST:
      return {
        ...state,
        items: action.payload,
        itemCount: action.payload.length,
        loading: false
      };
    case WISHLIST_ACTIONS.ADD_ITEM:
      return {
        ...state,
        items: action.payload,
        itemCount: action.payload.length
      };
    case WISHLIST_ACTIONS.REMOVE_ITEM:
      return {
        ...state,
        items: action.payload,
        itemCount: action.payload.length
      };
    case WISHLIST_ACTIONS.CLEAR_WISHLIST:
      return {
        ...state,
        items: [],
        itemCount: 0
      };
    case WISHLIST_ACTIONS.SET_LOADING:
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

// Wishlist Provider Component
export const WishlistProvider = ({ children }) => {
  const [state, dispatch] = useReducer(wishlistReducer, initialState);
  const { user, loading: authLoading, isAuthenticated } = useSelector((state) => state.auth);

  // Set current user globally for utility functions
  useEffect(() => {
    window.__CURRENT_USER__ = user;
  }, [user]);

  // Load wishlist on mount
  useEffect(() => {
    if (!user || !user.uid) {
      // Load guest wishlist for non-authenticated users
      const guestWishlist = getGuestWishlist();
      dispatch({ type: WISHLIST_ACTIONS.SET_WISHLIST, payload: guestWishlist });
      console.log('WishlistContext: Loaded guest wishlist with', guestWishlist.length, 'items');
    }
  }, []);

  // Handle user authentication changes
  useEffect(() => {
    console.log('WishlistContext: Auth state changed:', {
      user: user ? user.uid : 'null',
      authLoading,
      isAuthenticated
    });
    
    // Don't process if still loading authentication
    if (authLoading) {
      console.log('WishlistContext: Auth still loading, waiting...');
      return;
    }
    
    if (user && user.uid && isAuthenticated) {
      // User logged in - migrate guest wishlist and load from MongoDB
      console.log('WishlistContext: User authenticated, migrating guest wishlist and loading from MongoDB for:', user.uid);
      handleUserLogin();
    } else {
      // User logged out or not authenticated - load guest wishlist
      console.log('WishlistContext: User not authenticated, loading guest wishlist');
      const guestWishlist = getGuestWishlist();
      dispatch({ type: WISHLIST_ACTIONS.SET_WISHLIST, payload: guestWishlist });
    }
  }, [user, authLoading, isAuthenticated]);

  // Listen for auth events only (no localStorage sync)
  useEffect(() => {
    const handleAuthUserRestored = () => {
      console.log('WishlistContext: Auth user restored event received');
      if (user && user.uid && isAuthenticated) {
        console.log('WishlistContext: Triggering wishlist reload after auth restoration');
        handleUserLogin();
      }
    };

    window.addEventListener('auth:user-restored', handleAuthUserRestored);

    return () => {
      window.removeEventListener('auth:user-restored', handleAuthUserRestored);
    };
  }, [user, isAuthenticated]);

  // Removed loadWishlist function - we only use MongoDB data now

  const handleUserLogin = async (retryCount = 0) => {
    if (!user || !user.uid) {
      console.log('No valid user found, skipping wishlist load');
      return;
    }
    
    console.log('User logged in, loading wishlist from MongoDB for user:', user.uid, 'retry:', retryCount);
    dispatch({ type: WISHLIST_ACTIONS.SET_LOADING, payload: true });
    
    try {
      // Get guest wishlist for migration
      const guestWishlist = getGuestWishlist();
      console.log('Guest wishlist items to migrate:', guestWishlist.length);
      
      // Load existing wishlist from backend MongoDB
      const backendWishlistResponse = await wishlistAPI.getWishlist();
      
      if (backendWishlistResponse.success && backendWishlistResponse.data && backendWishlistResponse.data.items && backendWishlistResponse.data.items.length > 0) {
        console.log('Wishlist loaded from MongoDB:', backendWishlistResponse.data.items.length, 'items');
        
        const backendWishlistItems = backendWishlistResponse.data.items.map(item => ({
          _id: item.product_id._id || item.product_id,
          id: item.product_id._id || item.product_id, // Keep both for compatibility
          name: item.product_name,
          price: item.discounted_price,
          image: item.product_image,
          wishlistItemId: item._id
        }));
        
        dispatch({ type: WISHLIST_ACTIONS.SET_WISHLIST, payload: backendWishlistItems });
        
        // Migrate guest wishlist items if any
        if (guestWishlist.length > 0) {
          console.log('Migrating guest wishlist items to MongoDB...');
          await migrateGuestWishlistItems(guestWishlist);
        }
      } else {
        // No wishlist found in MongoDB, migrate guest wishlist if any
        console.log('No wishlist found in MongoDB');
        if (guestWishlist.length > 0) {
          console.log('Migrating guest wishlist items to MongoDB...');
          await migrateGuestWishlistItems(guestWishlist);
        } else {
          dispatch({ type: WISHLIST_ACTIONS.CLEAR_WISHLIST });
        }
      }
    } catch (error) {
      console.error('Error loading wishlist from MongoDB:', error);
      
      // Check if it's an authentication error
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.warn('Authentication error loading wishlist, user may need to re-login');
        
        // Retry once after a short delay for auth errors
        if (retryCount === 0) {
          console.log('Retrying wishlist load after auth error...');
          setTimeout(() => handleUserLogin(1), 1000);
          return;
        } else {
          toast.error('Please login again to access your wishlist');
        }
      } else {
        // For other errors, retry once
        if (retryCount === 0) {
          console.log('Retrying wishlist load after error...');
          setTimeout(() => handleUserLogin(1), 500);
          return;
        } else {
          toast.error('Failed to load wishlist data');
        }
      }
      
      // Start with empty wishlist on final error
      dispatch({ type: WISHLIST_ACTIONS.CLEAR_WISHLIST });
    } finally {
      dispatch({ type: WISHLIST_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Migrate guest wishlist items to MongoDB when user logs in
  const migrateGuestWishlistItems = async (guestWishlistItems) => {
    try {
      console.log('Starting guest wishlist migration:', guestWishlistItems.length, 'items');
      let migratedCount = 0;
      
      for (const guestItem of guestWishlistItems) {
        try {
          console.log('Migrating guest wishlist item:', guestItem);
          
          const wishlistItem = {
            product_id: guestItem._id || guestItem.id,
            product_name: guestItem.name,
            product_image: guestItem.image,
            price: guestItem.price,
            discounted_price: guestItem.price // Use same price as discounted for guest items
          };
          
          console.log('Sending wishlist item to backend:', wishlistItem);
          const response = await wishlistAPI.addToWishlist(wishlistItem);
          console.log('Backend response for wishlist migration:', response);
          
          if (response.success) {
            migratedCount++;
            console.log('Successfully migrated guest wishlist item:', guestItem.name);
          } else {
            console.error('Failed to migrate guest wishlist item - backend error:', guestItem.name, response);
          }
        } catch (error) {
          console.error('Failed to migrate guest wishlist item - exception:', guestItem.name, error);
        }
      }
      
      console.log('Guest wishlist migration completed:', migratedCount, 'of', guestWishlistItems.length, 'items migrated');
      
      // Reload wishlist to show migrated items
      if (migratedCount > 0) {
        // Load the updated wishlist from backend without recursion
        try {
          console.log('Reloading wishlist from backend after migration...');
          const backendWishlistResponse = await wishlistAPI.getWishlist();
          console.log('Backend wishlist response after migration:', backendWishlistResponse);
          
          if (backendWishlistResponse.success && backendWishlistResponse.data && backendWishlistResponse.data.items) {
            const backendWishlistItems = backendWishlistResponse.data.items.map(item => ({
              _id: item.product_id._id || item.product_id,
              id: item.product_id._id || item.product_id,
              name: item.product_name,
              price: item.discounted_price,
              image: item.product_image,
              wishlistItemId: item._id
            }));
            console.log('Setting wishlist with transformed items:', backendWishlistItems);
            dispatch({ type: WISHLIST_ACTIONS.SET_WISHLIST, payload: backendWishlistItems });
            
            // Clear guest wishlist only after successful reload
            console.log('Clearing guest wishlist after successful reload');
            clearGuestWishlist();
          } else {
            console.error('Failed to reload wishlist after migration - no items in response');
          }
        } catch (error) {
          console.error('Error reloading wishlist after migration:', error);
        }
        toast.success(`${migratedCount} items moved to your wishlist`);
      } else {
        // Clear guest wishlist even if no items were migrated
        console.log('Clearing guest wishlist - no items migrated');
        clearGuestWishlist();
      }
    } catch (error) {
      console.error('Error during guest wishlist migration:', error);
    }
  };

  const addToWishlist = async (product) => {
    try {
      console.log('WishlistContext: Adding to wishlist:', product._id);
      
      // For authenticated users, add directly to MongoDB
      if (user && user.uid) {
        // Enhanced price validation with better fallbacks
        const basePrice = product.selling_price || product.price || product.mrp || 1;
        const discountedPrice = product.salePrice || product.selling_price || product.price || product.mrp || basePrice;
        
        const wishlistItem = {
          product_id: product._id,
          product_name: product.name || 'Unknown Product',
          product_image: product.images?.[0]?.url || product.image_url?.[0] || null,
          price: basePrice,
          discounted_price: discountedPrice
        };
        
        console.log('WishlistContext: Sending wishlist item:', wishlistItem);
        console.log('WishlistContext: Original product data:', {
          _id: product._id,
          name: product.name,
          price: product.price,
          selling_price: product.selling_price,
          salePrice: product.salePrice,
          mrp: product.mrp
        });
        
        // Enhanced validation with detailed error messages
        if (!wishlistItem.product_id) {
          throw new Error('Product ID is required');
        }
        if (!wishlistItem.product_name) {
          throw new Error('Product name is required');
        }
        if (wishlistItem.price === undefined || wishlistItem.price === null) {
          throw new Error('Product price is required');
        }
        if (wishlistItem.discounted_price === undefined || wishlistItem.discounted_price === null) {
          throw new Error('Product discounted price is required');
        }
        if (wishlistItem.price <= 0) {
          console.warn('WishlistContext: Product has zero or negative price, using fallback value of 1');
          wishlistItem.price = 1;
        }
        if (wishlistItem.discounted_price <= 0) {
          console.warn('WishlistContext: Product has zero or negative discounted price, using price as fallback');
          wishlistItem.discounted_price = wishlistItem.price;
        }
        
        const response = await wishlistAPI.addToWishlist(wishlistItem);
        
        if (response.success && response.data && response.data.items) {
          // Update local state with backend response
          const backendWishlistItems = response.data.items.map(item => ({
            _id: item.product_id._id || item.product_id,
            id: item.product_id._id || item.product_id,
            name: item.product_name,
            price: item.discounted_price,
            image: item.product_image,
            wishlistItemId: item._id
          }));
          
          dispatch({ type: WISHLIST_ACTIONS.SET_WISHLIST, payload: backendWishlistItems });
          console.log('WishlistContext: Item added to MongoDB wishlist successfully');
        }
      } else {
        // For non-authenticated users, add to guest wishlist
        console.log('WishlistContext: Adding to guest wishlist for non-authenticated user');
        const updatedGuestWishlist = addToGuestWishlist(product);
        dispatch({ type: WISHLIST_ACTIONS.SET_WISHLIST, payload: updatedGuestWishlist });
        console.log('WishlistContext: Item added to guest wishlist successfully');
        
        // Show a subtle notification about signing in for better experience
        toast.success('Item added to wishlist! Sign in to save across devices.', {
          duration: 3000,
          icon: '❤️'
        });
      }
    } catch (error) {
      console.error('WishlistContext: Error adding to wishlist:', error);
      
      // Handle case where item already exists in wishlist
      if (error.response && error.response.status === 400 && 
          error.response.data && error.response.data.message === 'Item already exists in wishlist') {
        console.log('WishlistContext: Item already in wishlist, showing info message');
        toast.info('Item is already in your wishlist', {
          duration: 3000,
          icon: 'ℹ️'
        });
        return; // Don't throw error for this case
      }
      
      toast.error('Failed to add item to wishlist');
      throw error;
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      console.log('WishlistContext: Removing product from wishlist:', productId);
      
      // For authenticated users, remove from MongoDB
      if (user && user.uid) {
        console.log('WishlistContext: Syncing removal with backend for user:', user.uid);
        const response = await wishlistAPI.removeFromWishlistByProduct(productId);
        
        if (response.success) {
          console.log('WishlistContext: Item successfully removed from backend wishlist');
          
          // Update local state with backend response to ensure consistency
          if (response.data && response.data.items) {
            const backendWishlistItems = response.data.items.map(item => ({
              _id: item.product_id._id || item.product_id,
              id: item.product_id._id || item.product_id,
              name: item.product_id.name || item.product_name,
              price: item.product_id.selling_price || item.price,
              image: (item.product_id.image_url && item.product_id.image_url[0]) || item.product_image,
              category: item.product_id.category
            }));
            
            dispatch({ type: WISHLIST_ACTIONS.SET_WISHLIST, payload: backendWishlistItems });
          } else {
            // If no items returned, clear the wishlist
            dispatch({ type: WISHLIST_ACTIONS.CLEAR_WISHLIST });
          }
        }
      } else {
        // For non-authenticated users, remove from guest wishlist
        console.log('WishlistContext: Removing from guest wishlist for non-authenticated user');
        const updatedGuestWishlist = removeFromGuestWishlist(productId);
        dispatch({ type: WISHLIST_ACTIONS.SET_WISHLIST, payload: updatedGuestWishlist });
        console.log('WishlistContext: Item removed from guest wishlist successfully');
      }
    } catch (error) {
      console.error('WishlistContext: Error removing from wishlist:', error);
      toast.error('Failed to remove item from wishlist. Please try again.');
      throw error;
    }
  };

  const toggleWishlistItem = async (product) => {
    try {
      console.log('WishlistContext: Toggling wishlist item:', product._id);
      
      // Check if item is currently in wishlist (from current state)
      const wasInWishlist = state.items.some(item => item._id === product._id);
      
      if (wasInWishlist) {
        // Remove from wishlist
        await removeFromWishlist(product._id);
      } else {
        // Add to wishlist
        await addToWishlist(product);
      }
      
      console.log('WishlistContext: Wishlist item toggled successfully');
    } catch (error) {
      console.error('WishlistContext: Error toggling wishlist item:', error);
      throw error;
    }
  };

  const clearWishlist = async () => {
    try {
      console.log('WishlistContext: Clearing wishlist');
      
      // For authenticated users, clear MongoDB wishlist
      if (user && user.uid) {
        const response = await wishlistAPI.clearWishlist();
        
        if (response.success) {
          dispatch({ type: WISHLIST_ACTIONS.CLEAR_WISHLIST });
          console.log('WishlistContext: MongoDB wishlist cleared successfully');
        }
      } else {
        // For non-authenticated users, clear guest wishlist
        clearGuestWishlist();
        dispatch({ type: WISHLIST_ACTIONS.CLEAR_WISHLIST });
        console.log('WishlistContext: Guest wishlist cleared successfully');
      }
    } catch (error) {
      console.error('WishlistContext: Error clearing wishlist:', error);
      toast.error('Failed to clear wishlist');
      throw error;
    }
  };

  const isInWishlist = (productId) => {
    return state.items.some(item => item._id === productId);
  };

  const getWishlistItem = (productId) => {
    return state.items.find(item => item._id === productId);
  };

  const value = {
    // State
    items: state.items,
    itemCount: state.itemCount,
    loading: state.loading,
    
    // Actions
    addToWishlist,
    removeFromWishlist,
    toggleWishlistItem,
    clearWishlist,
    
    // Utility functions
    isInWishlist,
    getWishlistItem,
    
    // Utility
    isUsingCookies: false, // No longer using cookies, only MongoDB
    isAuthenticated: !!(user && user.uid), // Helper to check if user is authenticated
    isGuestMode: !(user && user.uid) // Helper to check if in guest mode
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

// Custom hook to use wishlist context
export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export default WishlistContext;
