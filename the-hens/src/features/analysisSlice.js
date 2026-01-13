import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // Adjust to your backend URL

// Async thunks for each API
export const fetchAreaWiseOrders = createAsyncThunk(
  "analysis/fetchAreaWiseOrders",
  async () => {
    const response = await axios.get(`${API_BASE_URL}/area-orders`); // Adjust endpoint if needed
    return response.data;
  }
);

export const fetchAreaWiseSales = createAsyncThunk(
  "analysis/fetchAreaWiseSales",
  async () => {
    const response = await axios.get(`${API_BASE_URL}/area-sales`);
    return response.data;
  }
);

export const fetchAreaCustomerAnalysis = createAsyncThunk(
  "analysis/fetchAreaCustomerAnalysis",
  async () => {
    const response = await axios.get(`${API_BASE_URL}/area-customer`);
    return response.data;
  }
);

export const fetchMonthWiseOrders = createAsyncThunk(
  "analysis/fetchMonthWiseOrders",
  async () => {
    const response = await axios.get(`${API_BASE_URL}/month-orders`);
    return response.data;
  }
);

export const fetchMonthWiseSales = createAsyncThunk(
  "analysis/fetchMonthWiseSales",
  async () => {
    const response = await axios.get(`${API_BASE_URL}/month-sales`);
    return response.data;
  }
);

export const fetchCustomerBestMonth = createAsyncThunk(
  "analysis/fetchCustomerBestMonth",
  async () => {
    const response = await axios.get(`${API_BASE_URL}/customer-best-month`);
    return response.data;
  }
);

export const fetchProductTypeSales = createAsyncThunk(
  "analysis/fetchProductTypeSales",
  async () => {
    const response = await axios.get(`${API_BASE_URL}/product-sales`);
    return response.data;
  }
);

export const fetchTopCustomersByRevenue = createAsyncThunk(
  "analysis/fetchTopCustomersByRevenue",
  async () => {
    const response = await axios.get(`${API_BASE_URL}/top-customers`);
    return response.data;
  }
);

export const fetchBestAreaByRevenue = createAsyncThunk(
  "analysis/fetchBestAreaByRevenue",
  async () => {
    const response = await axios.get(`${API_BASE_URL}/best-area`);
    return response.data;
  }
);

export const fetchMonthlySalesGrowth = createAsyncThunk(
  "analysis/fetchMonthlySalesGrowth",
  async () => {
    const response = await axios.get(`${API_BASE_URL}/monthly-growth`);
    return response.data;
  }
);

const analysisSlice = createSlice({
  name: "analysis",
  initialState: {
    areaWiseOrders: [],
    areaWiseSales: [],
    areaCustomerAnalysis: [],
    monthWiseOrders: [],
    monthWiseSales: [],
    customerBestMonth: [],
    productTypeSales: [],
    topCustomersByRevenue: [],
    bestAreaByRevenue: [],
    monthlySalesGrowth: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAreaWiseOrders.fulfilled, (state, action) => {
        state.areaWiseOrders = action.payload;
      })
      .addCase(fetchAreaWiseSales.fulfilled, (state, action) => {
        state.areaWiseSales = action.payload;
      })
      .addCase(fetchAreaCustomerAnalysis.fulfilled, (state, action) => {
        state.areaCustomerAnalysis = action.payload;
      })
      .addCase(fetchMonthWiseOrders.fulfilled, (state, action) => {
        state.monthWiseOrders = action.payload;
      })
      .addCase(fetchMonthWiseSales.fulfilled, (state, action) => {
        state.monthWiseSales = action.payload;
      })
      .addCase(fetchCustomerBestMonth.fulfilled, (state, action) => {
        state.customerBestMonth = action.payload;
      })
      .addCase(fetchProductTypeSales.fulfilled, (state, action) => {
        state.productTypeSales = action.payload;
      })
      .addCase(fetchTopCustomersByRevenue.fulfilled, (state, action) => {
        state.topCustomersByRevenue = action.payload;
      })
      .addCase(fetchBestAreaByRevenue.fulfilled, (state, action) => {
        state.bestAreaByRevenue = action.payload;
      })
      .addCase(fetchMonthlySalesGrowth.fulfilled, (state, action) => {
        state.monthlySalesGrowth = action.payload;
      })
      // Handle loading and errors as needed
      .addMatcher(
        (action) => action.type.endsWith("/pending"),
        (state) => {
          state.loading = true;
        }
      )
      .addMatcher(
        (action) => action.type.endsWith("/fulfilled"),
        (state) => {
          state.loading = false;
        }
      )
      .addMatcher(
        (action) => action.type.endsWith("/rejected"),
        (state, action) => {
          state.loading = false;
          state.error = action.error.message;
        }
      );
  },
});

export default analysisSlice.reducer;
