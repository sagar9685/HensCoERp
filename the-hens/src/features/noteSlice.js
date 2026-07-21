import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;

const getToken = () => localStorage.getItem("token");

// ================= CREATE =================

export const createNote = createAsyncThunk(
  "note/createNote",
  async (noteData, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${API_URL}/api/note/create`, noteData, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

// ================= GET ALL =================

export const getNotes = createAsyncThunk(
  "note/getNotes",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${API_URL}/api/note/all`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

// ================= GET BY ID =================

export const getNoteById = createAsyncThunk(
  "note/getNoteById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${API_URL}/${id}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

// ================= UPDATE =================

export const updateNote = createAsyncThunk(
  "note/updateNote",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await axios.put(`${API_URL}/api/note/update/${id}`, data, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

// ================= DELETE =================

export const deleteNote = createAsyncThunk(
  "note/deleteNote",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}/api/note/delete/${id}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

// ================= SLICE =================

const noteSlice = createSlice({
  name: "note",

  initialState: {
    notes: [],
    note: null,
    loading: false,
    error: null,
    success: false,
  },

  reducers: {
    clearNoteState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.note = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // CREATE

      .addCase(createNote.pending, (state) => {
        state.loading = true;
      })

      .addCase(createNote.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })

      .addCase(createNote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // GET ALL

      .addCase(getNotes.pending, (state) => {
        state.loading = true;
      })

      .addCase(getNotes.fulfilled, (state, action) => {
        state.loading = false;
        state.notes = action.payload;
      })

      .addCase(getNotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // GET BY ID

      .addCase(getNoteById.fulfilled, (state, action) => {
        state.note = action.payload;
      })

      // UPDATE

      .addCase(updateNote.fulfilled, (state) => {
        state.success = true;
      })

      // DELETE

      .addCase(deleteNote.fulfilled, (state, action) => {
        state.notes = state.notes.filter(
          (item) => item.note_id !== action.payload,
        );
      });
  },
});

export const { clearNoteState } = noteSlice.actions;

export default noteSlice.reducer;
