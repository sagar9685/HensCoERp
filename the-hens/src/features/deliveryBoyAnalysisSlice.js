import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
 
/**
 * 🔹 Fetch Delivery Summary (Date + Delivery Boy)
 */
export const fetchDeliverySummary = createAsyncThunk(
  "deliveryBoyAnalysis/fetchDeliverySummary",
  async ({ fromDeliveryDate, toDeliveryDate, deliveryManId }, thunkAPI) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/users/allByDay`, {
        fromDeliveryDate,
        toDeliveryDate,
        deliveryManId,
      });
      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to fetch delivery summary"
      );
    }
  }
);

const deliveryBoyAnalysisSlice = createSlice({
  name: "deliveryBoyAnalysis",
  initialState: {
    orders: [],
    summary: {
      totalSales: 0,
      cash: 0,
      gpay: 0,
      paytm: 0,
      foc: 0,
      bank: 0,
    },
    totalOrders: 0,
    loading: false,
    error: null,
    filters: {
      fromDeliveryDate: null,
      toDeliveryDate: null,
      deliveryManId: null,
    },
  },
  reducers: {
    resetDeliveryAnalysis: (state) => {
      state.orders = [];
      state.totalOrders = 0;
      state.summary = {
        totalSales: 0,
        cash: 0,
        gpay: 0,
        paytm: 0,
        foc: 0,
        bank: 0,
      };
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeliverySummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDeliverySummary.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.orders || [];
        state.summary = action.payload.summary || state.summary;
        state.totalOrders = action.payload.totalOrders || 0;
        state.filters = {
          fromDeliveryDate: action.payload.fromDeliveryDate,
          toDeliveryDate: action.payload.toDeliveryDate,
          deliveryManId: action.payload.deliveryManId,
        };
      })
      .addCase(fetchDeliverySummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetDeliveryAnalysis } = deliveryBoyAnalysisSlice.actions;

export default deliveryBoyAnalysisSlice.reducer;
