// src/store/slices/aiSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Async Thunks
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
  "ai/fetchQuickStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/ai/quick-stats`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchAssistantInfo = createAsyncThunk(
  "ai/fetchAssistantInfo",
  async (lang = "english", { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/ai/assistant-info?lang=${lang}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// Initial State
const initialState = {
  question: "",
  answer: null,
  conversation: [],
  quickStats: null,
  assistantInfo: null,
  loading: false,
  error: null,
  language: "english", // 'english' or 'hindi'
  showQuickStats: false,
};

// Slice
const aiSlice = createSlice({
  name: "ai",
  initialState,
  reducers: {
    setQuestion: (state, action) => {
      state.question = action.payload;
    },
    clearQuestion: (state) => {
      state.question = "";
    },
    clearAnswer: (state) => {
      state.answer = null;
      state.error = null;
    },
    clearConversation: (state) => {
      state.conversation = [];
    },
    toggleLanguage: (state) => {
      state.language = state.language === "english" ? "hindi" : "english";
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    toggleQuickStats: (state) => {
      state.showQuickStats = !state.showQuickStats;
    },
    addToConversation: (state, action) => {
      state.conversation.unshift({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...action.payload,
      });
      // Keep only last 50 conversations
      if (state.conversation.length > 50) {
        state.conversation.pop();
      }
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
        state.error = null;
        
        // Add to conversation history
        if (state.question && action.payload.success) {
          state.conversation.unshift({
            id: Date.now(),
            question: state.question,
            answer: action.payload.answer,
            timestamp: new Date().toISOString(),
            data: action.payload.data,
          });
          
          // Keep only last 50 conversations
          if (state.conversation.length > 50) {
            state.conversation.pop();
          }
        }
        
        state.question = "";
      })
      .addCase(askAI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.answer = null;
      })
      
      // Fetch Quick Stats
      .addCase(fetchQuickStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchQuickStats.fulfilled, (state, action) => {
        state.loading = false;
        state.quickStats = action.payload.data;
      })
      .addCase(fetchQuickStats.rejected, (state) => {
        state.loading = false;
      })
      
      // Fetch Assistant Info
      .addCase(fetchAssistantInfo.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAssistantInfo.fulfilled, (state, action) => {
        state.loading = false;
        state.assistantInfo = action.payload.data;
      })
      .addCase(fetchAssistantInfo.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const {
  setQuestion,
  clearQuestion,
  clearAnswer,
  clearConversation,
  toggleLanguage,
  setLanguage,
  toggleQuickStats,
  addToConversation,
} = aiSlice.actions;

export default aiSlice.reducer;