 import { configureStore } from '@reduxjs/toolkit' 

 import customerReducer from '../features/cutomerSlice'
 
 const store = configureStore ({
    reducer : {
        customer : customerReducer,
    }
 })

 export default store;