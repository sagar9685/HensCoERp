import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

 
export const fetchMonthlyReport = createAsyncThunk(
  "report/fetchMonthlyReport",
  async ({ year, month }, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `/api/reports/monthly?year=${year}&month=${month}`
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchWeeklyReport = createAsyncThunk(
  "report/fetchWeeklyReport",
  async ({ month, from, to }, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `/api/reports/weekly?month=${month}&from=${from}&to=${to}`
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

 
const reportSlice = createSlice({
  name: "report",
  initialState: {
    monthly: null,
    weekly: [],
    loading: false,
    error: null
  },
  reducers: {
    clearReport: state => {
      state.monthly = null;
      state.weekly = [];
      state.error = null;
    }
  },
  extraReducers: builder => {
    builder

      /* ---------- MONTHLY ---------- */
      .addCase(fetchMonthlyReport.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMonthlyReport.fulfilled, (state, action) => {
        state.loading = false;
        state.monthly = action.payload;
      })
      .addCase(fetchMonthlyReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ---------- WEEKLY ---------- */
      .addCase(fetchWeeklyReport.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWeeklyReport.fulfilled, (state, action) => {
        state.loading = false;
        state.weekly = action.payload;
      })
      .addCase(fetchWeeklyReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearReport } = reportSlice.actions;
export default reportSlice.reducer;
