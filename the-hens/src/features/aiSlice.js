import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}`;

export const askAiAction = createAsyncThunk(
  "ai/ask",
  async (question, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ask`, {
        question,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Server Error");
    }
  },
);

const aiSlice = createSlice({
  name: "ai",
  initialState: {
    chatHistory: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearChat: (state) => {
      state.chatHistory = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(askAiAction.pending, (state) => {
        state.loading = true;
      })
      .addCase(askAiAction.fulfilled, (state, action) => {
        state.loading = false;
        const userQuestion = action.meta.arg.toLowerCase();

        // Identity Check Logic
        const isIdentity =
          userQuestion.includes("who made you") ||
          userQuestion.includes("kisne banaya");
        const aiMessage = isIdentity
          ? "HensCo AI Identity:"
          : "Yes Sagar, here is the data I found for you:";

        state.chatHistory.push({ sender: "user", text: action.meta.arg });

        state.chatHistory.push({
          sender: "ai",
          message: aiMessage,
          data: isIdentity
            ? "I was developed and created by Sagar Gupta for The Hens Co. ERP system."
            : action.payload.answer,
          query: action.payload.queryUsed,
        });
      })
      .addCase(askAiAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Something went wrong";
      });
  },
});

export const { clearChat } = aiSlice.actions;
export default aiSlice.reducer;
