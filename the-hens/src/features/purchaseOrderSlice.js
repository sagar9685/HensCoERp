import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const createPurchaseOrder = createAsyncThunk(
  "purchaseOrder/create",
  async (purchaseData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/purchaseorders`,
        purchaseData
      );
      return response.data; // { message, po_number }
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { error: "Something went wrong" }
      );
    }
  }
);

// Async thunk to get all purchase orders
export const fetchPurchaseOrders = createAsyncThunk(
  "purchaseOrder/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/purchaseorders`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { error: "Something went wrong" }
      );
    }
  }
);

const purchaseOrderSlice = createSlice({
  name: "purchaseOrder",
  initialState: {
    orders: [],
    loading: false,
    error: null,
    lastCreatedPO: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // create
      .addCase(createPurchaseOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPurchaseOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.lastCreatedPO = action.payload;
      })
      .addCase(createPurchaseOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetch all
      .addCase(fetchPurchaseOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPurchaseOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchPurchaseOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default purchaseOrderSlice.reducer;
