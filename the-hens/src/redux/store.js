 import { configureStore } from '@reduxjs/toolkit' 

 import customerReducer from '../features/cutomerSlice'
 import productReducer from '../features/productTypeSlice'
 
 const store = configureStore ({
    reducer : {
        customer : customerReducer,
        product : productReducer
        
    }
 })

 export default store;