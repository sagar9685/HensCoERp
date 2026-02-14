import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ⭐ SEND HANDOVER DATA TO BACKEND
export const addDenomination = createAsyncThunk(
  "denomination/add",
  async ({ deliveryManId, denominations }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/users/denominations`, {
        deliveryManId,
        denominations,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

export const handoverCash = createAsyncThunk(
  "denomination/handover",
  async (
    { deliveryManId, totalHandoverAmount, denominationJSON, orderPaymentIds },
    { rejectWithValue },
  ) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/users/handover`, {
        deliveryManId,
        totalHandoverAmount,
        denominationJSON,
        orderPaymentIds,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

// denominationSlice.js mein update karein
// Updated Thunk
export const fetchPendingCashOrders = createAsyncThunk(
  "denomination/fetchPendingOrders",
  async (deliveryManId, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/users/pending-cash/${deliveryManId}`, // Route match karein
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

const denominationSlice = createSlice({
  name: "denomination",
  initialState: {
    loading: false,
    success: "",
    error: "",
    orders: [],
    totalCash: 0,
  },
  reducers: {
    clearMessages: (state) => {
      state.success = "";
      state.error = "";
    },
    clearOrders: (state) => {
      state.orders = [];
      state.totalCash = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addDenomination.pending, (state) => {
        state.loading = true;
      })
      .addCase(addDenomination.fulfilled, (state, action) => {
        state.loading = false;
        state.success = action.payload.message;
        state.error = "";
      })
      .addCase(addDenomination.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = "";
      })
      .addCase(handoverCash.pending, (state) => {
        state.loading = true;
      })
      .addCase(handoverCash.fulfilled, (state, action) => {
        state.loading = false;
        state.success = action.payload.message;
        state.orders = [];
        state.error = "";
      })
      .addCase(handoverCash.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.error || action.payload;
        state.success = "";
      })
      .addCase(fetchPendingCashOrders.pending, (state) => {
        state.loading = true;
      })
      // denominationSlice.js
      .addCase(fetchPendingCashOrders.fulfilled, (state, action) => {
        state.loading = false;
        // Agar API direct array bhej rahi hai to:
        state.orders = Array.isArray(action.payload)
          ? action.payload
          : action.payload.orders || [];
        state.totalCash = action.payload.totalCash || 0;
      })
      .addCase(fetchPendingCashOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearMessages, clearOrders } = denominationSlice.actions;

export default denominationSlice.reducer;
