import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ============================================================
// GET PAYMENT VERIFICATION DETAILS
// ============================================================

export const fetchPaymentVerificationDetails = createAsyncThunk(
  "paymentVerificationDetails/fetchPaymentVerificationDetails",

  async (orderId, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/users/payment-verification-details/${orderId}`,
      );

      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || {
          message: "Unable to load payment verification details",
        },
      );
    }
  },
);

// ============================================================
// SLICE
// ============================================================

const paymentVerificationDetailsSlice = createSlice({
  name: "paymentVerificationDetails",

  initialState: {
    data: null,

    creditNoteAmount: 0,

    payment: null,

    loading: false,

    error: null,
  },

  reducers: {
    clearPaymentVerificationDetails: (state) => {
      state.data = null;
      state.creditNoteAmount = 0;
      state.payment = null;
      state.loading = false;
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // ===============================================
      // PENDING
      // ===============================================

      .addCase(fetchPaymentVerificationDetails.pending, (state) => {
        state.loading = true;

        state.error = null;
      })

      // ===============================================
      // SUCCESS
      // ===============================================

      .addCase(fetchPaymentVerificationDetails.fulfilled, (state, action) => {
        state.loading = false;

        state.error = null;

        state.data = action.payload;

        state.creditNoteAmount = Number(action.payload?.creditNoteAmount || 0);

        state.payment = action.payload?.payment || null;
      })

      // ===============================================
      // ERROR
      // ===============================================

      .addCase(fetchPaymentVerificationDetails.rejected, (state, action) => {
        state.loading = false;

        state.error =
          action.payload?.message ||
          "Unable to load payment verification details";
      });
  },
});

export const { clearPaymentVerificationDetails } =
  paymentVerificationDetailsSlice.actions;

export default paymentVerificationDetailsSlice.reducer;
