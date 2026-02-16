import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchProductTypes = createAsyncThunk(
  "product/fetchProductTypes",
  async () => {
    const res = await axios.get(`${API_BASE_URL}/api/products/types`);
    return res.data.map((item) => item.ProductType);
  },
);

export const fetchWeightByType = createAsyncThunk(
  "product/fetchWeightByType",
  async (type, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/products/weight/${type}`,
      );
      return res.data.weight;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch weight",
      );
    }
  },
);

export const fetchRateByProductType = createAsyncThunk(
  "product/fetchRateByProductType",
  async (productType, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/rates/type/${productType}`,
      );
      const data = response.data;

      // if backend returns an array of rate history
      if (Array.isArray(data) && data.length > 0) {
        return data[0].Rate; // latest rate
      }

      // if backend returns single object like { rate: 150 }
      return data.Rate || data.rate || 0;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const fetchUPCByProductType = createAsyncThunk(
  "product/fetchUPCByProductType",
  async (type, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/products/upc/${type}`,
      );

      return response.data.UPC || response.data.upc || "";
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch UPC",
      );
    }
  },
);

const productSlice = createSlice({
  name: "product",
  initialState: {
    types: [],
    weight: [],
    rate: 0,
    upc: "",
    loading: false,
    error: null,
  },
  reducers: {
    clearWeight: (state) => {
      state.weight = "";
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchProductTypes.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.types = action.payload;
      })
      .addCase(fetchProductTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchWeightByType.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWeightByType.fulfilled, (state, action) => {
        state.loading = false;
        state.weight = Array.isArray(action.payload)
          ? action.payload
          : [action.payload];
      })
      .addCase(fetchWeightByType.rejected, (state, action) => {
        state.loading = true;
        state.error = action.payload;
      })
      .addCase(fetchRateByProductType.fulfilled, (state, action) => {
        state.rate = action.payload;
      })
      .addCase(fetchUPCByProductType.fulfilled, (state, action) => {
        state.upc = action.payload;
      });
  },
});

export const { clearWeight } = productSlice.actions;

export default productSlice.reducer;
