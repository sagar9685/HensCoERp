import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const initialState = {
    isLoading : false,
    customers : [],
    areaData : [],
    customerSuggestions: null,
    customerName : [],
    error : '',
}

 

export const addCustomerData = createAsyncThunk('addCustomer', async (formData, thunkAPI) => {
  try {
    
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


export const fetchCustomerName = createAsyncThunk("customerName",async(_,thunkAPI) => {
  try{
    const res = await axios.get(`${API_BASE_URL}/api/customers`);
    return res.data
  }catch(err) {
    return thunkAPI.rejectWithValue(err.response?.data || "fetch customer name failed")
  }

})

export const updateCustomer = createAsyncThunk(
  "customer/updateCustomer",
  async ({ id, data }, thunkAPI) => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/customers/update/${id}`,
        data
      );
      return { id, data };
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data || "Update failed"
      );
    }
  }
);



const customerSlice = createSlice({
    name:'customer',
    initialState,
    reducers : {
        clearCustomerSuggestions: (state) => {
      state.customerSuggestions = null;
    },
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
        state.customerSuggestions  = null;
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
      builder
      .addCase(fetchCustomerName.pending, (state)=> {
        state.isLoading = true;
      })
      .addCase(fetchCustomerName.fulfilled, (state,action)=> {
        state.isLoading = false;
        state.customerName = action.payload
      })
      .addCase(fetchCustomerName.rejected, (state,action)=> {
        state.isLoading = false;
        state.error = action.payload
      })
      builder
  .addCase(updateCustomer.pending, (state) => {
    state.isLoading = true;
  })
  .addCase(updateCustomer.fulfilled, (state, action) => {
    state.isLoading = false;

    const index = state.customerName.findIndex(
      (c) => c.CustomerId === action.payload.id
    );

    if (index !== -1) {
      state.customerName[index] = {
        ...state.customerName[index],
        ...action.payload.data,
      };
    }
  })
  .addCase(updateCustomer.rejected, (state, action) => {
    state.isLoading = false;
    state.error = action.payload;
  });

    }
})

export const { clearCustomerSuggestions  } = customerSlice.actions;
export default customerSlice.reducer;
