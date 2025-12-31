 import { configureStore } from '@reduxjs/toolkit' 

 import customerReducer from '../features/cutomerSlice'
 import productReducer from '../features/productTypeSlice'
 import orderReducer from '../features/orderSlice'
 import authReducer from '../features/authSlice'
 import assignedOrderReducer from '../features/assignedOrderSlice'
 import paymentModeReducer, {pendingCashOrdersReducer} from '../features/paymentModeSlice'
 import orderCompletionReducer from '../features/orderCompletionSlice'
 import denominationReducer from '../features/denominationSlice'
 import purchaseOrderReducer from '../features/purchaseOrderSlice'
  import stockReducer from '../features/stockSlice'
 import customerAnalysisReducer from "../features/customerAnalysisSlice";
 
 const store = configureStore ({
    reducer : {
        customer : customerReducer,
        product : productReducer,
        order: orderReducer,
        auth : authReducer,
         stock: stockReducer,
         assignedOrders: assignedOrderReducer,
         paymentMode : paymentModeReducer,
             pendingCashOrders: pendingCashOrdersReducer,  
        orderCompletion: orderCompletionReducer,
           denomination: denominationReducer,
              purchaseOrder: purchaseOrderReducer,
                customerAnalysis: customerAnalysisReducer,
    }
 })

 export default store;