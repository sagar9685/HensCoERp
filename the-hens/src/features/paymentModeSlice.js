import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ----------- PAYMENT MODES ------------
const paymentModeInitialState = {
  list: [],
  loading: false,
  error: null,
};

export const fetchPaymentModes = createAsyncThunk(
  "paymentModes/fetch",
  async (_, thunkAPI) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/payment-modes`);
      return res.data;
    } catch (e) {
      return thunkAPI.rejectWithValue(e.response?.data?.message || "Error");
    }
  }
);

const paymentModeSlice = createSlice({
  name: "paymentModes",
  initialState: paymentModeInitialState,
  extraReducers: (builder) => {
    builder
      .addCase(fetchPaymentModes.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPaymentModes.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchPaymentModes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// ----------- PENDING CASH ORDERS ------------
const pendingCashOrdersInitialState = {
  list: [],
  loading: false,
  error: null,
};

export const fetchPendingCashOrders = createAsyncThunk(
  "pendingCashOrders/fetch",
  async (deliveryManId, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/users/cash/pending/${deliveryManId}`
      );
      return res.data.orders || [];
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const pendingCashOrdersSlice = createSlice({
  name: "pendingCashOrders",
  initialState: pendingCashOrdersInitialState,
  reducers: {
    clearPendingOrders: (state) => {
      state.list = [];
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPendingCashOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPendingCashOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchPendingCashOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearPendingOrders } = pendingCashOrdersSlice.actions;

export { paymentModeSlice, pendingCashOrdersSlice };

export default paymentModeSlice.reducer;
export const pendingCashOrdersReducer = pendingCashOrdersSlice.reducer;
