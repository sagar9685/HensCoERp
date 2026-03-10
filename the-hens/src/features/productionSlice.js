import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const addProduction = createAsyncThunk(
  "production/addProduction",
  async (data) => {
    const res = await axios.post(`${API_BASE_URL}/api/production`, data);
    return res.data;
  },
);

const productionSlice = createSlice({
  name: "production",
  initialState: {
    loading: false,
    success: false,
    error: null,
  },
  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(addProduction.pending, (state) => {
        state.loading = true;
      })
      .addCase(addProduction.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(addProduction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default productionSlice.reducer;
