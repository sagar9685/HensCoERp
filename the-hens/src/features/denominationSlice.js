import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

 export const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ⭐ SEND HANDOVER DATA TO BACKEND
export const addDenomination = createAsyncThunk(
  "denomination/add",
  async ({ deliveryManId, denominations }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/users/denominations`, { deliveryManId, denominations });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const handoverCash = createAsyncThunk(
  "denomination/handover",
  async ({ deliveryManId, totalHandoverAmount, denominationJSON }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/users/handover`, {
        deliveryManId,
        totalHandoverAmount,
        denominationJSON,
        orderPaymentIds: [] // backend expects this
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);



const denominationSlice = createSlice({
  name: "denomination",
  initialState: {
    loading: false,
    success: "",
    error: ""
  },
  reducers: {
    clearMessages: (state) => {
      state.success = "";
      state.error = "";
    }
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
      .addCase(handoverCash.pending, (state) => { state.loading = true; })
      .addCase(handoverCash.fulfilled, (state, action) => {
        state.loading = false;
        state.success = action.payload.message;
        state.error = "";
      })
      .addCase(handoverCash.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.error || action.payload;
        state.success = "";
      });
  }
});

export const { clearMessages } = denominationSlice.actions;

export default denominationSlice.reducer;
