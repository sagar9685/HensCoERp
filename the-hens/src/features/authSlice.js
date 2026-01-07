import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const storeData = JSON.parse(localStorage.getItem("authData"));

const initialState = {
  loading: false,
  data: storeData || null,
  error: null,
};

export const userLogin = createAsyncThunk(
  "user/login",
  async (formData, thunkAPI) => {
    try {
      const result = await axios.post(
        `${API_BASE_URL}/api/users/login`,
        formData
      );

      return result.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data || "something went wrong"
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.data = null;
      state.error = null;
      state.loading = false;
      localStorage.removeItem("authData");
      localStorage.removeItem("token");
      localStorage.removeItem("role");
    },
  },
  extraReducers: (builder) => {
    builder.addCase(userLogin.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(userLogin.fulfilled, (state, action) => {
      state.loading = false;
      state.data = action.payload; // fixed
      localStorage.setItem("authData", JSON.stringify(action.payload));
      if (action.payload.token)
        localStorage.setItem("token", action.payload.token);
      if (action.payload.role)
        localStorage.setItem("role", action.payload.role);
    });
    builder.addCase(userLogin.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
  },
});

export const { logout } = authSlice.actions;

export default authSlice.reducer;
