// features/notificationSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Initial fetch of notifications
export const fetchNotifications = createAsyncThunk(
  "notifications/fetch",
  async (role) => {
    const res = await fetch(
      `http://localhost:5005/api/notifications?role=${role}`,
    );
    const data = await res.json();
    return data;
  },
);

const notificationSlice = createSlice({
  name: "notifications",
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {
    addNotification: (state, action) => {
      state.list.unshift(action.payload); // new notification on top
    },
    removeNotification: (state, action) => {
      state.list = state.list.filter(
        (n) => n.NotificationID !== action.payload,
      );
    },
    clearNotifications: (state) => {
      state.list = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { addNotification, clearNotifications, removeNotification } =
  notificationSlice.actions;
export default notificationSlice.reducer;
