import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  totalQuantity: 0,
  totalAmount: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action) => {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ ...action.payload, quantity: 1 });
      }
      state.totalQuantity += 1;
      state.totalAmount += action.payload.price;
    },
    removeItem: (state, action) => {
      const existingItem = state.items.find(item => item.id === action.payload);
      if (existingItem.quantity === 1) {
        state.items = state.items.filter(item => item.id !== action.payload);
      } else {
        existingItem.quantity -= 1;
      }
      state.totalQuantity -= 1;
      state.totalAmount -= existingItem.price;
    },
    removeAllItems: (state, action) => {
      const existingItem = state.items.find(item => item.id === action.payload);
      state.totalQuantity -= existingItem.quantity;
      state.totalAmount -= existingItem.price * existingItem.quantity;
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];
      state.totalQuantity = 0;
      state.totalAmount = 0;
    },
  },
});

export const { addItem, removeItem, removeAllItems, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
