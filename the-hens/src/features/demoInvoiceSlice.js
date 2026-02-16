import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const saveDemoInvoice = createAsyncThunk(
  "demoInvoice/save",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/demo`, formData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

const demoInvoiceSlice = createSlice({
  name: "demoInvoice",
  initialState: { loading: false, success: false, error: null },
  reducers: {
    resetStatus: (state) => {
      state.success = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveDemoInvoice.pending, (state) => {
        state.loading = true;
      })
      .addCase(saveDemoInvoice.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(saveDemoInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetStatus } = demoInvoiceSlice.actions;
export default demoInvoiceSlice.reducer;
