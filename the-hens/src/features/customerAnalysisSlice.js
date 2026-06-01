import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_URL = `${API_BASE_URL}/api/customer-analysis`;

export const fetchBulkCustomerOrders = createAsyncThunk(
  "customerAnalysis/fetchBulkCustomerOrders",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();

      if (filters.fromDate) {
        params.append("fromDate", filters.fromDate);
      }

      if (filters.toDate) {
        params.append("toDate", filters.toDate);
      }

      if (filters.bulkCustomer === "bulk") {
        params.append("bulkMode", "1");
      }

      if (filters.bulkCustomer === "normal") {
        params.append("bulkMode", "0");
      }

      const res = await axios.get(
        `${API_BASE_URL}/api/bulk?${params.toString()}`,
      );

      return res.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
);

export const fetchWeekWise = createAsyncThunk(
  "customerAnalysis/fetchWeekWise",
  async () => {
    const res = await axios.get(`${API_URL}/week-wise`);
    return res.data;
  },
);

export const fetchMonthWise = createAsyncThunk(
  "customerAnalysis/fetchMonthWise",
  async () => {
    const res = await axios.get(`${API_URL}/month-wise`);
    return res.data;
  },
);

export const fetchYearWise = createAsyncThunk(
  "customerAnalysis/fetchYearWise",
  async () => {
    const res = await axios.get(`${API_URL}/year-wise`);
    return res.data;
  },
);

const customerAnalysisSlice = createSlice({
  name: "customerAnalysis",
  initialState: {
    weekWise: [],
    monthWise: [],
    yearWise: [],
    bulkCustomerOrders: [],
    loading: false,
    error: null,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWeekWise.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWeekWise.fulfilled, (state, action) => {
        state.loading = false;
        state.weekWise = action.payload;
      })
      .addCase(fetchMonthWise.fulfilled, (state, action) => {
        state.loading = false;
        state.monthWise = action.payload;
      })
      .addCase(fetchYearWise.fulfilled, (state, action) => {
        state.loading = false;
        state.yearWise = action.payload;
      })
      .addCase(fetchBulkCustomerOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBulkCustomerOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.bulkCustomerOrders = action.payload;
      })
      .addMatcher(
        (action) => action.type.endsWith("/rejected"),
        (state, action) => {
          state.loading = false;
          state.error = action.error.message;
        },
      );
  },
});

export default customerAnalysisSlice.reducer;
