import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
// ✅ API call using thunk

export const rejectStock = createAsyncThunk(
  "stock/rejectStock",
  async (data, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/stock/rejected-stock`,
        data,
      );
      dispatch(fetchAvailableStock()); // Refresh available stock after rejection
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const fetchRejectedStock = createAsyncThunk(
  "stock/fetchRejectedStock",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/stock/rejected-stock`,
      );
      return response.data; // assume backend returns array of stock items
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const addStock = createAsyncThunk(
  "stock/addStock",
  async (data, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/stock/add`, data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const fetchStock = createAsyncThunk(
  "stock/fetchStock",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stock`);
      return response.data; // assume backend returns array of stock items
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const fetchAvailableStock = createAsyncThunk(
  "stock/fetchAvailableStock",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stock/avilable`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const fetchStockMovement = createAsyncThunk(
  "stock/fetchStockMovement",
  async ({ fromDate, toDate }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/stock/report?fromDate=${fromDate}&toDate=${toDate}`,
      );

      console.log("API RESPONSE", response.data);

      return response.data;
    } catch (err) {
      console.log("API ERROR", err);
      return rejectWithValue(err.response?.data || "Something went wrong");
    }
  },
);

export const fetchProductionCurrentStock = createAsyncThunk(
  "currentStock/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/stock/current`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const dispatchToHeadoffice = createAsyncThunk(
  "currentStock/dispatch",
  async (data, { rejectWithValue, dispatch }) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/stock/dispatch`, data);
      dispatch(fetchProductionCurrentStock()); // Auto refresh
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response.data.message || "Dispatch failed");
    }
  },
);

const stockSlice = createSlice({
  name: "stock",
  initialState: {
    modalOpen: false,
    loading: false,
    lastInwardNo: null,
    items: [],
    currentStock: [],
    available: [],
    rejected: [],
    movementReport: [],
    dispatchSuccess: false,
  },
  reducers: {
    openStockModal: (state) => {
      state.modalOpen = true;
    },
    closeStockModal: (state) => {
      state.modalOpen = false;
    },
    resetDispatchStatus: (state) => {
      state.dispatchSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addStock.pending, (state) => {
        state.loading = true;
      })
      .addCase(addStock.fulfilled, (state, action) => {
        state.loading = false;
        state.modalOpen = false; // close modal after success
        state.lastInwardNo = action.payload.inward_no;
      })
      .addCase(addStock.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchStock.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchStock.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload; // ✅ update stock items
      })
      .addCase(fetchStock.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchAvailableStock.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAvailableStock.fulfilled, (state, action) => {
        state.loading = false;
        state.available = action.payload;
      })
      .addCase(fetchAvailableStock.rejected, (state) => {
        state.loading = false;
      })
      .addCase(rejectStock.pending, (state) => {
        state.loading = true;
      })
      .addCase(rejectStock.fulfilled, (state) => {
        state.loading = false;
        // Handle any specific success state here
      })
      .addCase(rejectStock.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchRejectedStock.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRejectedStock.fulfilled, (state, action) => {
        state.loading = false;
        state.rejected = action.payload;
        // Handle any specific success state here
      })
      .addCase(fetchRejectedStock.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchStockMovement.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchStockMovement.fulfilled, (state, action) => {
        state.loading = false;
        state.movementReport = action.payload;
      })
      .addCase(fetchStockMovement.rejected, (state, action) => {
        state.loading = false;
        state.movementReport = [];
        console.error("Stock movement error", action.payload);
      })
      .addCase(dispatchToHeadoffice.pending, (state) => {
        state.loading = true;
        state.dispatchSuccess = false;
      })
      .addCase(dispatchToHeadoffice.fulfilled, (state, action) => {
        state.loading = false;
        state.dispatchSuccess = true;
        // Agar aap chahte hain ki dispatch ke baad modal band ho jaye
        state.modalOpen = false;
      })
      .addCase(dispatchToHeadoffice.rejected, (state, action) => {
        state.loading = false;
        state.dispatchSuccess = false;
        alert(action.payload); // Error message dikhane ke liye
      })
      .addCase(fetchProductionCurrentStock.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductionCurrentStock.fulfilled, (state, action) => {
        state.loading = false;
        state.currentStock = action.payload;
      })
      .addCase(fetchProductionCurrentStock.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { openStockModal, closeStockModal, resetDispatchStatus } =
  stockSlice.actions;

export default stockSlice.reducer;
