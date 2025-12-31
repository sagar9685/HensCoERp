import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = "http://localhost:5000/api/customer-analysis";

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
      .addMatcher(
        (action) => action.type.endsWith("/pending"),
        (state) => {
          state.loading = true;
        }
      )
      .addMatcher(
        (action) => action.type.endsWith("/fulfilled"),
        (state, action) => {
          state.loading = false;

          if (action.type.includes("WeekWise")) state.weekWise = action.payload;
          if (action.type.includes("MonthWise")) state.monthWise = action.payload;
          if (action.type.includes("YearWise")) state.yearWise = action.payload;
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

export default customerAnalysisSlice.reducer;
