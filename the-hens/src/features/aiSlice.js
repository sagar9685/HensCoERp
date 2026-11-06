import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

export const askAiAction = createAsyncThunk(
  "ai/ask",
  async (question, { getState, rejectWithValue }) => {
    try {
      const history = getState()
        .ai.chatHistory.filter(
          (chat) =>
            chat.status !== "error" &&
            !chat.data?.length &&
            ["user", "ai"].includes(chat.sender),
        )
        .slice(-10)
        .map((chat) => ({
          role: chat.sender === "user" ? "user" : "assistant",
          content: chat.message || chat.text || "",
        }));

      // The reducer already added the current user message.
      // Remove it from history because it is sent as question.
      if (history.length && history.at(-1).role === "user") {
        history.pop();
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/ask`,
        { question, history },
        { timeout: 60000 },
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Unable to connect to AI.",
      );
    }
  },
);

const initialState = {
  chatHistory: [],
  loading: false,
  error: null,
};

const aiSlice = createSlice({
  name: "ai",
  initialState,
  reducers: {
    clearChat: (state) => {
      state.chatHistory = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(askAiAction.pending, (state, action) => {
        state.loading = true;
        state.error = null;

        state.chatHistory.push({
          sender: "user",
          text: action.meta.arg,
          timestamp: Date.now(),
        });
      })

      .addCase(askAiAction.fulfilled, (state, action) => {
        state.loading = false;

        const payload = action.payload || {};

        state.chatHistory.push({
          sender: "ai",
          message: payload.message || "No response received.",
          data: Array.isArray(payload.data) ? payload.data : [],
          query: payload.queryUsed || null,
          mode: payload.mode || "chat",
          rowCount: payload.rowCount || 0,
          timestamp: Date.now(),
        });
      })

      .addCase(askAiAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Something went wrong.";

        state.chatHistory.push({
          sender: "ai",
          message: state.error,
          status: "error",
          data: [],
          timestamp: Date.now(),
        });
      });
  },
});

export const { clearChat } = aiSlice.actions;
export default aiSlice.reducer;
