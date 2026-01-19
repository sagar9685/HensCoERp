import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_URL = `${API_BASE_URL}/api/customer-analysis`;
 

export const fetchWeekWise = createAsyncThunk(
  "customerAnalysis/fetchWeekWise",
  async () => {
    const res = await axios.get(`${API_URL}/week-wise`);
    return res.data;
  }
);

export const fetchMonthWise = createAsyncThunk(
  "customerAnalysis/fetchMonthWise",
  async () => {
    const res = await axios.get(`${API_URL}/month-wise`);
    return res.data;
  }
);

export const fetchYearWise = createAsyncThunk(
  "customerAnalysis/fetchYearWise",
  async () => {
    const res = await axios.get(`${API_URL}/year-wise`);
    return res.data;
  }
);

const customerAnalysisSlice = createSlice({
  name: "customerAnalysis",
  initialState: {
    weekWise: [],
    monthWise: [],
    yearWise: [],
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
    .addMatcher(
      (action) => action.type.endsWith("/rejected"),
      (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      }
    );
}

});

export default customerAnalysisSlice.reducer;
