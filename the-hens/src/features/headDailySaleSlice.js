import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchHeadDailySale = createAsyncThunk(
  "headDailySale/fetch",
  async (deliveryBoyId = "all", { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/production?deliveryBoyId=${deliveryBoyId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error");
    }
  },
);

const headDailySaleSlice = createSlice({
  name: "headDailySale",
  initialState: {
    loading: false,
    data: null,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHeadDailySale.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHeadDailySale.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchHeadDailySale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default headDailySaleSlice.reducer;
