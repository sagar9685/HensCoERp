// src/features/aiSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL;

// Async Thunks
export const askAI = createAsyncThunk(
  'ai/askAI',
  async (question, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/api/ai/ask`, { question });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchQuickStats = createAsyncThunk(
  'ai/fetchQuickStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/api/ai/quick-stats`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchAssistantInfo = createAsyncThunk(
  'ai/fetchAssistantInfo',
  async (lang = 'english', { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/api/ai/assistant-info?lang=${lang}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getWeeklySummary = createAsyncThunk(
  'ai/getWeeklySummary',
  async (lang = 'english', { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/api/ai/weekly-summary?lang=${lang}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const aiSlice = createSlice({
  name: 'ai',
  initialState: {
    question: '',
    answer: null,
    conversation: [],
    quickStats: null,
    assistantInfo: null,
    loading: false,
    error: null,
    language: 'hindi',
    showQuickStats: false,
  },
  reducers: {
    setQuestion: (state, action) => {
      state.question = action.payload;
    },
    clearAnswer: (state) => {
      state.answer = null;
      state.error = null;
    },
    toggleLanguage: (state) => {
      state.language = state.language === 'hindi' ? 'english' : 'hindi';
    },
    toggleQuickStats: (state) => {
      state.showQuickStats = !state.showQuickStats;
    },
    clearConversation: (state) => {
      state.conversation = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Ask AI
      .addCase(askAI.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(askAI.fulfilled, (state, action) => {
        state.loading = false;
        state.answer = action.payload;
        state.conversation.push({
          id: Date.now(),
          question: state.question,
          answer: action.payload.answer,
          timestamp: new Date().toISOString(),
        });
        state.question = '';
      })
      .addCase(askAI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'An error occurred';
      })
      // Fetch Quick Stats
      .addCase(fetchQuickStats.fulfilled, (state, action) => {
        state.quickStats = action.payload.data;
      })
      .addCase(fetchQuickStats.rejected, (state, action) => {
        console.error('Failed to fetch quick stats:', action.payload);
      })
      // Fetch Assistant Info
      .addCase(fetchAssistantInfo.fulfilled, (state, action) => {
        state.assistantInfo = action.payload.data;
      })
      .addCase(fetchAssistantInfo.rejected, (state, action) => {
        console.error('Failed to fetch assistant info:', action.payload);
      });
  },
});

export const {
  setQuestion,
  clearAnswer,
  toggleLanguage,
  toggleQuickStats,
  clearConversation,
} = aiSlice.actions;

export default aiSlice.reducer;