import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const verifyPayment = createAsyncThunk(
  "payment/verifyPayment",
  async ({ paymentId, receivedAmount, verificationRemarks }) => {
    const res = await axios.post(`${API_BASE_URL}/api/users/verify`, {
      paymentId,
      receivedAmount,
      verificationRemarks, // ✅ add this
    });
    return res.data;
  },
);

export const markVerified = createAsyncThunk(
  "payment/markVerified",
  async ({ paymentId }) => {
    const res = await axios.post(`${API_BASE_URL}/api/users/mark-verified`, {
      paymentId,
    });
    return res.data;
  },
);

export const verifyAdvancePayment = createAsyncThunk(
  "payment/verifyAdvancePayment",
  async (
    { orderId, paymentModeId, receivedAmount, verificationRemarks },
    { rejectWithValue },
  ) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/users/verify-advance-payment`,
        {
          orderId,
          paymentModeId,
          receivedAmount,
          verificationRemarks,
        },
      );

      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || {
          message: "Advance payment verification failed",
        },
      );
    }
  },
);

const paymentSlice = createSlice({
  name: "payment",
  initialState: {
    loading: false,
    message: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(verifyPayment.pending, (state) => {
        state.loading = true;
      })
      .addCase(verifyPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
      })
      .addCase(markVerified.pending, (state) => {
        state.loading = true;
      })
      .addCase(markVerified.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
      })
      .addCase(verifyAdvancePayment.pending, (state) => {
        state.loading = true;
      })
      .addCase(verifyAdvancePayment.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
      })
      .addCase(verifyAdvancePayment.rejected, (state, action) => {
        state.loading = false;
        state.message =
          action.payload?.message || "Advance payment verification failed";
      });
  },
});

export default paymentSlice.reducer;
