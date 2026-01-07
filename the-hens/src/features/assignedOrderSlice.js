import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// FETCH DELIVERY MEN
export const fetchDeliveryMen = createAsyncThunk(
  "assignedOrders/fetchDeliveryMen",
  async () => {
    const res = await axios.get(`${API_BASE_URL}/api/users/delivery-men`);

    return res.data;
  }
);

// FETCH PAYMENT MODES
export const fetchPaymentModes = createAsyncThunk(
  "assignedOrders/fetchPaymentModes",
  async () => {
    const res = await axios.get(`${API_BASE_URL}/api/users/payment-modes`);

    return res.data;
  }
);

export const fetchCashByDeliveryMen = createAsyncThunk(
  "/fetchcase",
  async () => {
    const res = await axios.get(`${API_BASE_URL}/api/users/cash`);
    return res.data;
  }
);

// ASSIGN ORDER
export const assignOrder = createAsyncThunk(
  "assignedOrders/assignOrder",
  async (formData) => {
    const res = await axios.post(
      `${API_BASE_URL}/api/users/assign-order`,
      formData
    );
    return res.data;
  }
);

export const fetchAssignOrder = createAsyncThunk(
  "fetchAssignOrder",
  async () => {
    const res = await axios.get(`${API_BASE_URL}/api/users/assigned-orders`);
    return res.data;
  }
);

const assignedOrderSlice = createSlice({
  name: "assignedOrders",
  initialState: {
    deliveryMen: [],
    paymentModes: [],
    cashList: [],
    data: [],
    loading: false,
    success: false,
    error: null,
  },

  reducers: {
    resetStatus(state) {
      state.success = false;
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchDeliveryMen.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDeliveryMen.fulfilled, (state, action) => {
        state.loading = false;
        state.deliveryMen = action.payload;
      })
      .addCase(fetchPaymentModes.fulfilled, (state, action) => {
        state.paymentModes = action.payload;
      })
      .addCase(assignOrder.fulfilled, (state) => {
        state.success = true;
      })
      .addCase(assignOrder.rejected, (state, action) => {
        state.error = action.error.message;
      })
      .addCase(fetchAssignOrder.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAssignOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAssignOrder.rejected, (state) => {
        state.loading = false;
        state.error = "something went wrong";
      })
      .addCase(fetchCashByDeliveryMen.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCashByDeliveryMen.fulfilled, (state, action) => {
        state.loading = false;
        state.cashList = action.payload.data; // 👈 store data here
      })
      .addCase(fetchCashByDeliveryMen.rejected, (state) => {
        state.loading = false;
        state.error = "Failed to fetch cash data";
      });
  },
});

export const { resetStatus } = assignedOrderSlice.actions;
export default assignedOrderSlice.reducer;
