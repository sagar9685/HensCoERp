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
        data
      );
      dispatch(fetchAvailableStock()); // Refresh available stock after rejection
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);


export const fetchRejectedStock = createAsyncThunk(
  "stock/fetchRejectedStock",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stock/rejected-stock`);
      return response.data; // assume backend returns array of stock items
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
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
  }
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
  }
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
  }
);

const stockSlice = createSlice({
  name: "stock",
  initialState: {
    modalOpen: false,
    loading: false,
    lastInwardNo: null,
    items: [],
    available: [],
    rejected :[]
  },
  reducers: {
    openStockModal: (state) => {
      state.modalOpen = true;
    },
    closeStockModal: (state) => {
      state.modalOpen = false;
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
      .addCase(fetchRejectedStock.fulfilled, (state,action) => {
        state.loading = false;
        state.rejected = action.payload
        // Handle any specific success state here
      })
      .addCase(fetchRejectedStock.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { openStockModal, closeStockModal } = stockSlice.actions;

export default stockSlice.reducer;
