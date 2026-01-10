import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchMonthlyReport = createAsyncThunk(
  "report/fetchMonthlyReport",
  async ({ year, month }, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/reports/monthly?year=${year}&month=${month}` // ← full URL
      );
      return res.data;
    } catch (err) {
      console.error("Monthly API Error:", err.response?.data || err.message); // ← extra log
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchWeeklyReport = createAsyncThunk(
  "report/fetchWeeklyReport",
  async ({ year, month, week }, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/reports/weekly?year=${year}&month=${month}&week=${week}` // ← full URL
      );
      return res.data;
    } catch (err) {
      console.error("Weekly API Error:", err.response?.data || err.message); // ← extra log
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const reportSlice = createSlice({
  name: "report",
  initialState: {
    monthly: {
      summary: null,
      payment: [],
    },
    weekly: {
      week: null,
      from: null,
      to: null,
      data: [],
    },

    monthlyLoading: false,
    weeklyLoading: false,
    error: null,
  },

  reducers: {
    clearReport: (state) => {
      state.monthly = { summary: null, payment: [] };
      state.weekly = { week: null, from: null, to: null, data: [] };
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder

      /* ---------- MONTHLY ---------- */
      .addCase(fetchMonthlyReport.pending, (state) => {
        state.monthlyLoading = true;
        state.error = null;
      })
      .addCase(fetchMonthlyReport.fulfilled, (state, action) => {
        state.monthlyLoading = false;
        state.monthly = {
          summary: action.payload?.summary || null,
          payment: action.payload?.payment || [],
        };
      })
      .addCase(fetchMonthlyReport.rejected, (state, action) => {
        state.monthlyLoading = false;
        state.error = action.payload;
      })

      /* ---------- WEEKLY ---------- */
      .addCase(fetchWeeklyReport.pending, (state) => {
        state.weeklyLoading = true;
        state.error = null;
      })
      .addCase(fetchWeeklyReport.fulfilled, (state, action) => {
        state.weeklyLoading = false;
        state.weekly = {
          week: action.payload.week ? String(action.payload.week).trim() : null, // ← .trim() compulsory
          from: action.payload.from,
          to: action.payload.to,
          data: action.payload.data || [],
        };
      })
      .addCase(fetchWeeklyReport.rejected, (state, action) => {
        state.weeklyLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearReport } = reportSlice.actions;
export default reportSlice.reducer;
