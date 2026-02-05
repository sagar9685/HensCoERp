// aiSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const askAI = createAsyncThunk(
  "ai/ask",
  async (question, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ai/ask-ai`, { question });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchQuickStats = createAsyncThunk(
  "ai/quickStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/ai/quick-stats`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const aiSlice = createSlice({
  name: "ai",
  initialState: {
    loading: false,
    answer: null,
    stats: null,
    history: [],
    error: null,
  },
  reducers: {
    clearAnswer: (state) => {
      state.answer = null;
      state.error = null;
    },
    addToHistory: (state, action) => {
      state.history.unshift(action.payload);
      // Keep only last 50 conversations
      if (state.history.length > 50) {
        state.history.pop();
      }
    },
    clearHistory: (state) => {
      state.history = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(askAI.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(askAI.fulfilled, (state, action) => {
        state.loading = false;
        state.answer = action.payload;
        state.error = null;
      })
      .addCase(askAI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.answer = null;
      })
      .addCase(fetchQuickStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchQuickStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload.data;
      })
      .addCase(fetchQuickStats.rejected, (state) => {
        state.loading = false;
      });
  }
});

export const { clearAnswer, addToHistory, clearHistory } = aiSlice.actions;
export default aiSlice.reducer;