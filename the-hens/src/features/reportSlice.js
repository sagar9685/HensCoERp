import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchMonthlyReport = createAsyncThunk(
  "report/fetchMonthlyReport",
  async ({ year, month }, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/reports/monthly?year=${year}&month=${month}`, // ← full URL
      );
      return res.data;
    } catch (err) {
      console.error("Monthly API Error:", err.response?.data || err.message); // ← extra log
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

export const fetchWeeklyReport = createAsyncThunk(
  "report/fetchWeeklyReport",
  async ({ year, month, week }, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/reports/weekly?year=${year}&month=${month}&week=${week}`, // ← full URL
      );
      return res.data;
    } catch (err) {
      console.error("Weekly API Error:", err.response?.data || err.message); // ← extra log
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

export const fetchDailyReport = createAsyncThunk(
  "report/fetchDailyReport",
  async ({ date, deliveryBoyId }, { rejectWithValue }) => {
    try {
      let url = `${API_BASE_URL}/api/reports/daily?date=${date}`;
      if (deliveryBoyId && deliveryBoyId !== "all") {
        url += `&deliveryBoyId=${deliveryBoyId}`;
      }
      const res = await axios.get(url);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

// Change this specific thunk in reportSlice.js
export const fetchCustomerReport = createAsyncThunk(
  "customerReport/fetchCustomerReport",
  async ({ from, to, customerName }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/reports/customer-summary`,
        {
          params: {
            from,
            to,
            customer: customerName || "", // Send the single string name, not the array
          },
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Error");
    }
  },
);

export const fetchCustomerLedger = createAsyncThunk(
  "report/fetchCustomerLedger",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/reports/customer-ledger`,
      );
      // Standardize the response to an array
      return Array.isArray(response.data)
        ? response.data
        : response.data.recordset || [];
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Error fetching ledger",
      );
    }
  },
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

    daily: {
      summary: null,
      products: [],
      payments: [],
      date: null,
    },

    customer: {
      data: [],
    },
    ledger: {
      data: [],
    },

    monthlyLoading: false,
    weeklyLoading: false,
    dailyLoading: false,
    customerLoading: false,
    ledgerLoading: false,
    error: null,
  },

  reducers: {
    clearReport: (state) => {
      state.monthly = { summary: null, payment: [] };
      state.weekly = { week: null, from: null, to: null, data: [] };
      state.daily = { summary: null, products: [], payments: [], date: null };
      state.customer = { data: [] };
      state.ledger = { data: [] };
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
      })
      .addCase(fetchDailyReport.pending, (state) => {
        state.dailyLoading = true;
        state.error = null;
      })
      .addCase(fetchDailyReport.fulfilled, (state, action) => {
        state.dailyLoading = false;
        state.daily = {
          summary: action.payload.summary,
          products: action.payload.products,
          payments: action.payload.payments,
          date: action.payload.date,
        };
      })
      .addCase(fetchDailyReport.rejected, (state, action) => {
        state.dailyLoading = false;
        state.error = action.payload;
      })
      /* ---------- CUSTOMER REPORT ---------- */
      .addCase(fetchCustomerReport.pending, (state) => {
        state.customerLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomerReport.fulfilled, (state, action) => {
        state.customerLoading = false;
        state.customer.data = action.payload || [];
      })
      .addCase(fetchCustomerReport.rejected, (state, action) => {
        state.customerLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchCustomerLedger.pending, (state) => {
        state.ledgerLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomerLedger.fulfilled, (state, action) => {
        state.ledgerLoading = false;
        state.ledger.data = action.payload;
      })
      .addCase(fetchCustomerLedger.rejected, (state, action) => {
        state.ledgerLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearReport } = reportSlice.actions;
export default reportSlice.reducer;
