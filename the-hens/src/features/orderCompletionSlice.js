import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const completeOrder = createAsyncThunk(
  "order/complete",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/users/payment-status`,
        payload
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const orderCompletionSlice = createSlice({
  name: "orderCompletion",
  initialState: {
    loading: false,
    success: false,
    error: null,
  },
  reducers: {
    resetOrderState: (state) => {
      state.loading = false;
      state.success = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(completeOrder.pending, (state) => {
        state.loading = true;
        state.success = false;
        state.error = null;
      })
      .addCase(completeOrder.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(completeOrder.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload;
      });
  },
});

export const { resetOrderState } = orderCompletionSlice.actions;

export default orderCompletionSlice.reducer;
