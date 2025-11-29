import { createSlice } from '@reduxjs/toolkit';

// Load wishlist from localStorage if available
const loadWishlistFromLocalStorage = () => {
  try {
    const serializedWishlist = localStorage.getItem('sbbs_wishlist');
    if (serializedWishlist === null) {
      return [];
    }
    return JSON.parse(serializedWishlist);
  } catch (e) {
    console.warn('Could not load wishlist from localStorage', e);
    return [];
  }
};

// Save wishlist to localStorage
const saveWishlistToLocalStorage = (items) => {
  try {
    const serializedWishlist = JSON.stringify(items);
    localStorage.setItem('sbbs_wishlist', serializedWishlist);
  } catch (e) {
    console.warn('Could not save wishlist to localStorage', e);
  }
};

const initialState = {
  items: loadWishlistFromLocalStorage(),
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addToWishlist: (state, action) => {
      const itemInWishlist = state.items.find(item => item._id === action.payload._id);
      if (!itemInWishlist) {
        const newItems = [...state.items, { ...action.payload, inWishlist: true }];
        state.items = newItems;
        saveWishlistToLocalStorage(newItems);
      }
    },
    removeFromWishlist: (state, action) => {
      const newItems = state.items.filter(item => item._id !== action.payload);
      state.items = newItems;
      saveWishlistToLocalStorage(newItems);
    },
    clearWishlist: (state) => {
      state.items = [];
      saveWishlistToLocalStorage([]);
    },
  },
});

export const { addToWishlist, removeFromWishlist, clearWishlist } = wishlistSlice.actions;

export const selectWishlistItems = (state) => state.wishlist.items;

export default wishlistSlice.reducer;
