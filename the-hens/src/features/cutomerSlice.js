import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios"


const initialState = {
    isLoading : false,
    data : [],
    areaData : [],
    customerSuggestions: null,
    error : '',
}
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
 

export const addCustomerData = createAsyncThunk('addCustomer', async (formData, thunkAPI) => {
  try {
    console.log(" Data sending to backend:", formData);
    const res = await axios.post(`${API_BASE_URL}/api/customers/add`, formData);
   

    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data || 'Something went wrong');
  }
});
 

export const searchCustomers = createAsyncThunk(
  "customer/searchCustomers",
  async (name, thunkAPI) => {
    try {
         

      const res = await axios.get(`${API_BASE_URL}/api/customers/search?name=${name}`);
      console.log("Response from backend:", res.data);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || "Search failed");
    }
  }
);


export const fetchArea = createAsyncThunk("area",async(_,thunkAPI)=>{
  try{
      const res = await axios.get(`${API_BASE_URL}/api/area`);
      return res.data;
  } catch(err) {
    return thunkAPI.rejectWithValue(err.response?.data || "Search failed");
  }

})


const customerSlice = createSlice({
    name:'customer',
    initialState,
    reducers : {
        clearCustomer: (state) => {
            state.customerData = null
        }
    },
    extraReducers : (builder) =>  {
        builder.addCase(addCustomerData.fulfilled, (state,action) => {
            state.isLoading=false;
            state.data=action.payload
        });
        builder.addCase(addCustomerData.rejected, (state) => {
            state.isLoading = false;
            state.error = 'something went wrong'
        });
        builder.addCase(addCustomerData.pending, (state) => {
            state.isLoading = true
        });

           //  Fetch Customer By Name 
    builder
      .addCase(searchCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = "";
      })
      .addCase(searchCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
           state.customerSuggestions = Array.isArray(action.payload)
          ? action.payload
          : [action.payload];
         
      })
      .addCase(searchCustomers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.customerData = null;
      });
          // fetch area 
      builder
      .addCase(fetchArea.pending, (state)=> {
        state.isLoading = true;
      })
      .addCase(fetchArea.fulfilled, (state,action)=> {
        state.isLoading = false;
        state.areaData = action.payload;
      })
      .addCase(fetchArea.rejected, (state,action)=> {
        state.isLoading=false;
        state.error = action.payload
      })
    }
})

export const { clearCustomer } = customerSlice.actions;
export default customerSlice.reducer;
