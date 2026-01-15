// features/uiSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Page load hote hi localStorage check karega
  sidebarOpen: localStorage.getItem("sidebarOpen")
    ? JSON.parse(localStorage.getItem("sidebarOpen"))
    : false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
      // Yahan save karne se refresh par state bani rahegi
      localStorage.setItem("sidebarOpen", JSON.stringify(state.sidebarOpen));
    },
  },
});

export const { toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;
