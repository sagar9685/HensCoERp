import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchProductTypes = createAsyncThunk(
  "productTypes/fetchAll",
  async () => {
    const res = await axios.get(`${API_BASE_URL}/api/productTypes`);
    return res.data;
  }
);

const productTypeSlice = createSlice({
  name: "productTypes",
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductTypes.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchProductTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default productTypeSlice.reducer;
