import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Update Order Rate
export const updateOrderRate = createAsyncThunk(
  "rate/updateOrderRate",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/rates/update-order-rate`,
        payload,
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update rate",
      );
    }
  },
);

const rateSlice = createSlice({
  name: "rate",
  initialState: {
    loading: false,
    success: false,
    error: null,
    data: null,
  },
  reducers: {
    resetRateState: (state) => {
      state.loading = false;
      state.success = false;
      state.error = null;
      state.data = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateOrderRate.pending, (state) => {
        state.loading = true;
        state.success = false;
        state.error = null;
      })
      .addCase(updateOrderRate.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.data = action.payload;
      })
      .addCase(updateOrderRate.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload;
      });
  },
});

export const { resetRateState } = rateSlice.actions;

export default rateSlice.reducer;
