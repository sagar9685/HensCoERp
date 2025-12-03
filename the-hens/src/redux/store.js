 import { configureStore } from '@reduxjs/toolkit' 

 import customerReducer from '../features/cutomerSlice'
 import productReducer from '../features/productTypeSlice'
 import orderReducer from '../features/orderSlice'
 import authReducer from '../features/authSlice'
 import assignedOrderReducer from '../features/assignedOrderSlice'
 import paymentModeReducer from '../features/paymentModeSlice'
 import orderCompletionReducer from '../features/orderCompletionSlice'
 import denominationReducer from '../features/denominationSlice'
 import purchaseOrderReducer from '../features/purchaseOrderSlice'
 
 const store = configureStore ({
    reducer : {
        customer : customerReducer,
        product : productReducer,
        order: orderReducer,
        auth : authReducer,
         assignedOrders: assignedOrderReducer,
         paymentMode : paymentModeReducer,
        orderCompletion: orderCompletionReducer,
           denomination: denominationReducer,
              purchaseOrder: purchaseOrderReducer,
    }
 })

 export default store;