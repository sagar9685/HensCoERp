import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ============================================================
// FETCH SUMMARY
// ============================================================

export const fetchDeliveryPendingSummary = createAsyncThunk(
  "deliveryPending/fetchSummary",

  async (_, { rejectWithValue }) => {
    try {
      const url = `${API_BASE_URL}/api/delivery-pending/summary`;

      console.log("SUMMARY API URL:", url);

      const response = await axios.get(url);

      console.log("SUMMARY API RESPONSE:", response.data);

      return response.data?.data || [];
    } catch (error) {
      console.error(
        "SUMMARY API ERROR:",
        error.response?.status,
        error.response?.data || error.message,
      );

      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch delivery pending summary",
      );
    }
  },
);

// ============================================================
// FETCH DELIVERY MAN ORDERS
// ============================================================

export const fetchDeliveryManPendingOrders = createAsyncThunk(
  "deliveryPending/fetchOrders",

  async (deliveryManId, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/delivery-pending/${deliveryManId}/orders`,
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch delivery man pending orders",
      );
    }
  },
);

// ============================================================
// FETCH ORDER ITEMS
// ============================================================

export const fetchPendingOrderItems = createAsyncThunk(
  "deliveryPending/fetchItems",

  async (orderId, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/delivery-pending/order/${orderId}/items`,
      );

      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch order items",
      );
    }
  },
);

const initialState = {
  summary: [],

  selectedDeliveryMan: null,
  pendingOrders: [],
  pendingOrderSummary: {
    pendingOrders: 0,
    pendingAmount: 0,
  },

  selectedOrderItems: [],

  loading: false,
  orderLoading: false,
  itemLoading: false,

  error: null,
};

const deliveryPendingSlice = createSlice({
  name: "deliveryPending",

  initialState,

  reducers: {
    clearDeliveryOrders: (state) => {
      state.selectedDeliveryMan = null;
      state.pendingOrders = [];
      state.pendingOrderSummary = {
        pendingOrders: 0,
        pendingAmount: 0,
      };
    },

    clearOrderItems: (state) => {
      state.selectedOrderItems = [];
    },
  },

  extraReducers: (builder) => {
    builder

      // ========================================================
      // SUMMARY
      // ========================================================

      .addCase(fetchDeliveryPendingSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchDeliveryPendingSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = Array.isArray(action.payload) ? action.payload : [];

        console.log("REDUX SUMMARY:", action.payload);
      })

      .addCase(fetchDeliveryPendingSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ========================================================
      // DELIVERY MAN ORDERS
      // ========================================================

      .addCase(fetchDeliveryManPendingOrders.pending, (state) => {
        state.orderLoading = true;
        state.error = null;
      })

      .addCase(fetchDeliveryManPendingOrders.fulfilled, (state, action) => {
        state.orderLoading = false;

        state.selectedDeliveryMan = action.payload.deliveryMan;

        state.pendingOrders = action.payload.data;

        state.pendingOrderSummary = action.payload.summary;
      })

      .addCase(fetchDeliveryManPendingOrders.rejected, (state, action) => {
        state.orderLoading = false;
        state.error = action.payload;
      })

      // ========================================================
      // ITEMS
      // ========================================================

      .addCase(fetchPendingOrderItems.pending, (state) => {
        state.itemLoading = true;
      })

      .addCase(fetchPendingOrderItems.fulfilled, (state, action) => {
        state.itemLoading = false;
        state.selectedOrderItems = action.payload;
      })

      .addCase(fetchPendingOrderItems.rejected, (state, action) => {
        state.itemLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearDeliveryOrders, clearOrderItems } =
  deliveryPendingSlice.actions;

export default deliveryPendingSlice.reducer;
