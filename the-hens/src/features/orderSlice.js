import { createAsyncThunk, createSlice, ReducerType } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const initialState = {
  loading: false,
  data: [],
  record: [],
  takenByList: [],
  error: null,
};

export const addOrder = createAsyncThunk(
  "addOrder",
  async function (formData, thunkAPI) {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/orders/add`, formData);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data || "something went wrong",
      );
    }
  },
);

export const fetchOrder = createAsyncThunk(
  "fetchOrder",
  async (_, thunkAPI) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/orders`);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data || "Failed to fetch orders",
      );
    }
  },
);

// FETCH ORDER TAKEN BY NAME LIST
export const fetchOrderTakenBy = createAsyncThunk(
  "order/fetchOrderTakenBy",
  async (_, thunkAPI) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/orders/ordername`);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data || "Failed to load names",
      );
    }
  },
);

export const orderSlice = createSlice({
  name: "order",
  initialState,
  extraReducers: (builder) => {
    builder.addCase(addOrder.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(addOrder.fulfilled, (state, action) => {
      state.loading = false;
      state.data.push(action.payload);
    });
    builder.addCase(addOrder.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
    builder.addCase(fetchOrder.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchOrder.fulfilled, (state, action) => {
      state.loading = false;
      state.record = Array.isArray(action.payload)
        ? action.payload
        : action.payload?.data || [];
    });

    builder.addCase(fetchOrder.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
    builder.addCase(fetchOrderTakenBy.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(fetchOrderTakenBy.fulfilled, (state, action) => {
      state.loading = false;
      state.takenByList = Array.isArray(action.payload)
        ? action.payload
        : action.payload?.data || [];
    });

    builder.addCase(fetchOrderTakenBy.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
  },
});

export default orderSlice.reducer;
