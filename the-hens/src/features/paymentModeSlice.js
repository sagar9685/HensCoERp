import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const initialState = {
    list: [],
    loading: false,
    error: null,
}

export const fetchPaymentModes = createAsyncThunk("paymentModes", async (thunkAPI) => {
        try {

            const res = await axios.get (`${API_BASE_URL}/api/users/payment-modes`);
                return res.data;

        }catch(e) {
                return thunkAPI.rejectWithValue ( e.response ?. data ?.message || "Error");
        }
})


const paymentModeSlice = createSlice({
    name :'paymentModes',
    initialState,
    extraReducers : (builder) => {
        builder.addCase(fetchPaymentModes.pending, (state)=> {
            state.loading = true;
        })
        builder.addCase(fetchPaymentModes.fulfilled , (state,action)=> {
            state.loading = false;
            state.list = action.payload;
        })
        builder.addCase(fetchPaymentModes.rejected, (state,action)=> {
            state.loading = false;
                 state.error = action.payload;

        })
    } 
})


export default paymentModeSlice.reducer;