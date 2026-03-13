import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { completeOrder } from "./orderCompletionSlice";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// FETCH DELIVERY MEN
export const fetchDeliveryMen = createAsyncThunk(
  "assignedOrders/fetchDeliveryMen",
  async () => {
    const res = await axios.get(`${API_BASE_URL}/api/users/delivery-men`);

    return res.data;
  },
);

// FETCH PAYMENT MODES
export const fetchPaymentModes = createAsyncThunk(
  "assignedOrders/fetchPaymentModes",
  async () => {
    const res = await axios.get(`${API_BASE_URL}/api/users/payment-modes`);

    return res.data;
  },
);

export const fetchCashByDeliveryMen = createAsyncThunk(
  "/fetchcase",
  async () => {
    const res = await axios.get(`${API_BASE_URL}/api/users/cash`);
    return res.data;
  },
);

// ASSIGN ORDER
export const assignOrder = createAsyncThunk(
  "assignedOrders/assignOrder",
  async (formData) => {
    const authData = JSON.parse(localStorage.getItem("authData"));
    const username = authData?.name;

    const payload = {
      ...formData,
      username,
    };

    console.log("SENDING PAYLOAD:", payload);

    const res = await axios.post(
      `${API_BASE_URL}/api/users/assign-order`,
      payload,
    );

    return res.data;
  },
);

export const cancelAssignedOrder = createAsyncThunk(
  "assignedOrder/cancel",
  async ({ assignId, reason }) => {
    const authData = JSON.parse(localStorage.getItem("authData"));
    const username = authData?.name;

    const res = await axios.post(
      `${API_BASE_URL}/api/orders/cancel/${assignId}`,
      { reason, username }, // ✅ add
    );

    return res.data;
  },
);

export const cancelOrderBeforeAssign = createAsyncThunk(
  "orders/cancelBeforeAssign",
  async ({ orderId, reason }, { rejectWithValue }) => {
    try {
      const authData = JSON.parse(localStorage.getItem("authData"));
      const username = authData?.name;

      const response = await axios.post(
        `${API_BASE_URL}/api/orders/cancel-before-assign/${orderId}`,
        {
          reason: reason || "Cancelled by admin",
          username,
        },
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || "Cancel failed");
    }
  },
);

export const fetchAssignOrder = createAsyncThunk(
  "fetchAssignOrder",
  async () => {
    const res = await axios.get(`${API_BASE_URL}/api/users/assigned-orders`);
    return res.data;
  },
);

// assignedOrderSlice.js

// ────────────────────────────────────────────────
//  Add this new thunk
// ────────────────────────────────────────────────
// updateAssignedOrder thunk mein check karein ki URL sahi hai
export const updateAssignedOrder = createAsyncThunk(
  "assignedOrders/update",
  async ({ assignmentId, ...formData }, { rejectWithValue }) => {
    const authData = JSON.parse(localStorage.getItem("authData"));
    const username = authData?.name;

    try {
      const payload = {
        ...formData,
        username, // ✅ add
        deliveryManId:
          formData.deliveryManId === "other"
            ? null
            : Number(formData.deliveryManId),

        otherDeliveryManName:
          formData.deliveryManId === "other"
            ? formData.otherDeliveryManName
            : null,

        deliveryDate: formData.deliveryDate || null,
      };

      const res = await axios.put(
        `${API_BASE_URL}/api/users/assigned-orders/${assignmentId}`,
        payload,
      );

      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Something went wrong");
    }
  },
);
// You can also add it to extraReducers if you want to handle loading/error

export const updateDeliveryStatus = createAsyncThunk(
  "assignedOrders/updateStatus",
  async ({ assignId, status }, { rejectWithValue }) => {
    const authData = JSON.parse(localStorage.getItem("authData"));
    const username = authData?.name;

    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/users/assigned-orders/${assignId}/status`,
        { status, username }, // ✅ add
      );

      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Failed to update status");
    }
  },
);

const assignedOrderSlice = createSlice({
  name: "assignedOrders",
  initialState: {
    deliveryMen: [],
    paymentModes: [],
    cashList: [],
    data: [],
    loading: false,
    success: false,
    error: null,
  },

  reducers: {
    resetStatus(state) {
      state.success = false;
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchDeliveryMen.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDeliveryMen.fulfilled, (state, action) => {
        state.loading = false;
        state.deliveryMen = action.payload;
      })
      .addCase(fetchPaymentModes.fulfilled, (state, action) => {
        state.paymentModes = action.payload;
      })
      .addCase(assignOrder.fulfilled, (state) => {
        state.success = true;
      })
      .addCase(assignOrder.rejected, (state, action) => {
        state.error = action.error.message;
      })
      .addCase(fetchAssignOrder.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAssignOrder.fulfilled, (state, action) => {
        state.loading = false;

        // 1. Response data ko array ensure karein
        const rawData = Array.isArray(action.payload) ? action.payload : [];

        // 2. Map ka use karke unique OrderID nikalen
        // Isse agar backend 2 rows bhej bhi raha hai, toh UI sirf ek dikhayega
        const uniqueData = Array.from(
          new Map(rawData.map((item) => [item.OrderID, item])).values(),
        );

        state.data = uniqueData; // Unique orders hi state mein jayenge
      })
      .addCase(fetchAssignOrder.rejected, (state) => {
        state.loading = false;
        state.error = "something went wrong";
      })
      .addCase(fetchCashByDeliveryMen.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCashByDeliveryMen.fulfilled, (state, action) => {
        state.loading = false;
        state.cashList = action.payload.data; // 👈 store data here
      })
      .addCase(fetchCashByDeliveryMen.rejected, (state) => {
        state.loading = false;
        state.error = "Failed to fetch cash data";
      })
      // .addCase(updateDeliveryStatus.fulfilled, (state, action) => {
      //   // Action payload se data nikalein
      //   const { assignId, status } = action.meta.arg; // Ya action.payload agar backend return kar raha hai

      //   const index = state.data.findIndex((o) => o.AssignID == assignId);

      //   if (index !== -1) {
      //     // State mutation (Immer handles this)
      //     state.data[index].OrderStatus = status;
      //     state.data[index].DeliveryStatus = status;

      //     if (status === "Complete") {
      //       const now = new Date().toISOString();
      //       state.data[index].ActualDeliveryDate = now;
      //       state.data[index].PaymentReceivedDate = now;
      //     }
      //   }
      // })
      // assignedOrderSlice.js ke extraReducers mein:

      // assignedOrderSlice.js mein updateDeliveryStatus.fulfilled badlein:

      .addCase(updateDeliveryStatus.fulfilled, (state, action) => {
        // action.meta.arg mein wo data hota hai jo aapne dispatch karte waqt bheja tha
        const { assignId, status } = action.meta.arg;

        // Loose equality (==) use karein taaki string/number mismatch na ho
        const index = state.data.findIndex((o) => o.AssignID == assignId);

        if (index !== -1) {
          // Direct state update (Immer handle kar lega)
          state.data[index].DeliveryStatus = status;
          state.data[index].OrderStatus = status;

          if (status === "Complete") {
            const now = new Date().toISOString();
            state.data[index].ActualDeliveryDate = now;
            state.data[index].PaymentReceivedDate = now;
          }

          // Success flag ko true karein taaki UI re-render ho
          state.success = true;
        }
      })
      .addCase(cancelAssignedOrder.fulfilled, (state, action) => {
        const { assignId, reason } = action.meta.arg;
        const index = state.data.findIndex((o) => o.AssignID == assignId);

        if (index !== -1) {
          state.data[index].DeliveryStatus = "Cancel";
          state.data[index].OrderStatus = "Cancel";
          state.data[index].Remark = reason;
        }
      })
      .addCase(completeOrder.fulfilled, (state, action) => {
        // action.payload se orderId ya assignedOrderId nikalen (jo bhi backend return kar raha hai)
        const { assignedOrderId } = action.meta.arg; // meta.arg mein payload data hota hai

        const index = state.data.findIndex(
          (o) => o.AssignID == assignedOrderId,
        );

        if (index !== -1) {
          state.data[index].DeliveryStatus = "Complete";
          state.data[index].OrderStatus = "Complete";

          // Instant dates update
          const now = new Date().toISOString();
          state.data[index].ActualDeliveryDate = now;
          state.data[index].PaymentReceivedDate = now;
        }
      })
      .addCase(cancelOrderBeforeAssign.fulfilled, (state, action) => {
        const { orderId, reason } = action.meta.arg;

        const index = state.data.findIndex((o) => o.OrderID == orderId);

        if (index !== -1) {
          state.data[index].OrderStatus = "Cancel";
          state.data[index].DeliveryStatus = "Cancel";
          state.data[index].Remark = reason;
        }
      });
  },
});

export const { resetStatus } = assignedOrderSlice.actions;
export default assignedOrderSlice.reducer;
