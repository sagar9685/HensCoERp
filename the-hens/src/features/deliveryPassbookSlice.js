import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

// =====================================================
// API BASE URL
// =====================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// =====================================================
// HELPER
// =====================================================

const buildPassbookParams = ({
  fromDate = "",
  toDate = "",
  page = 1,
  limit = 20,
}) => {
  const params = {
    page,
    limit,
  };

  if (fromDate) {
    params.fromDate = fromDate;
  }

  if (toDate) {
    params.toDate = toDate;
  }

  return params;
};

// =====================================================
// GET ALL DELIVERY BOY CASH ACCOUNTS
// =====================================================

export const fetchDeliveryCashAccounts = createAsyncThunk(
  "deliveryPassbook/fetchDeliveryCashAccounts",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/delivery-passbook`,
        {
          params,
        },
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch delivery cash accounts",
      );
    }
  },
);

// =====================================================
// GET DELIVERY BOY PASSBOOK
// =====================================================

export const fetchDeliveryBoyPassbook = createAsyncThunk(
  "deliveryPassbook/fetchDeliveryBoyPassbook",
  async (
    { deliveryManId, fromDate = "", toDate = "", page = 1, limit = 20 },
    { rejectWithValue },
  ) => {
    try {
      const params = buildPassbookParams({
        fromDate,
        toDate,
        page,
        limit,
      });

      const response = await axios.get(
        `${API_BASE_URL}/api/delivery-passbook/${deliveryManId}`,
        {
          params,
        },
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch delivery passbook",
      );
    }
  },
);

// =====================================================
// GET COMPLETE PASSBOOK FOR EXPORT
//
// Backend max limit = 100
// So this thunk automatically fetches all pages.
// =====================================================

export const fetchDeliveryPassbookExport = createAsyncThunk(
  "deliveryPassbook/fetchDeliveryPassbookExport",
  async (
    { deliveryManId, fromDate = "", toDate = "" },
    { rejectWithValue },
  ) => {
    try {
      // =================================================
      // FIRST PAGE
      // =================================================

      const firstResponse = await axios.get(
        `${API_BASE_URL}/api/delivery-passbook/${deliveryManId}`,
        {
          params: buildPassbookParams({
            fromDate,
            toDate,
            page: 1,
            limit: 100,
          }),
        },
      );

      const firstData = firstResponse.data;

      let allTransactions = [...(firstData?.transactions || [])];

      const totalPages = Number(firstData?.pagination?.totalPages || 0);

      // =================================================
      // REMAINING PAGES
      // =================================================

      if (totalPages > 1) {
        const pageRequests = [];

        for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
          pageRequests.push(
            axios.get(
              `${API_BASE_URL}/api/delivery-passbook/${deliveryManId}`,
              {
                params: buildPassbookParams({
                  fromDate,
                  toDate,
                  page: currentPage,
                  limit: 100,
                }),
              },
            ),
          );
        }

        const responses = await Promise.all(pageRequests);

        responses.forEach((response) => {
          allTransactions = [
            ...allTransactions,
            ...(response.data?.transactions || []),
          ];
        });
      }

      // =================================================
      // ENSURE CORRECT ORDER
      // =================================================

      allTransactions.sort(
        (a, b) => Number(a.RowNumber || 0) - Number(b.RowNumber || 0),
      );

      return {
        ...firstData,

        transactions: allTransactions,

        pagination: {
          ...firstData.pagination,
          page: 1,
          limit: allTransactions.length,
          totalRecords:
            firstData?.pagination?.totalRecords || allTransactions.length,
          totalPages: 1,
        },
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to prepare passbook export",
      );
    }
  },
);

// =====================================================
// INITIAL STATE
// =====================================================

const initialState = {
  accounts: [],
  accountsLoading: false,
  accountsError: null,

  deliveryMan: null,
  summary: null,
  openingEntry: null,
  transactions: [],

  filter: {
    fromDate: null,
    toDate: null,
  },

  pagination: {
    page: 1,
    limit: 20,
    totalRecords: 0,
    totalPages: 0,
  },

  passbookLoading: false,
  passbookError: null,

  exportLoading: false,
  exportError: null,
};

// =====================================================
// SLICE
// =====================================================

const deliveryPassbookSlice = createSlice({
  name: "deliveryPassbook",

  initialState,

  reducers: {
    clearPassbook: (state) => {
      state.deliveryMan = null;
      state.summary = null;
      state.openingEntry = null;
      state.transactions = [];

      state.filter = {
        fromDate: null,
        toDate: null,
      };

      state.pagination = {
        page: 1,
        limit: 20,
        totalRecords: 0,
        totalPages: 0,
      };

      state.passbookError = null;
      state.exportError = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // =================================================
      // DELIVERY CASH ACCOUNTS
      // =================================================

      .addCase(fetchDeliveryCashAccounts.pending, (state) => {
        state.accountsLoading = true;
        state.accountsError = null;
      })

      .addCase(fetchDeliveryCashAccounts.fulfilled, (state, action) => {
        state.accountsLoading = false;
        state.accounts = action.payload?.data || [];
      })

      .addCase(fetchDeliveryCashAccounts.rejected, (state, action) => {
        state.accountsLoading = false;
        state.accountsError = action.payload;
      })

      // =================================================
      // PASSBOOK
      // =================================================

      .addCase(fetchDeliveryBoyPassbook.pending, (state) => {
        state.passbookLoading = true;
        state.passbookError = null;
      })

      .addCase(fetchDeliveryBoyPassbook.fulfilled, (state, action) => {
        state.passbookLoading = false;

        state.deliveryMan = action.payload?.deliveryMan || null;

        state.summary = action.payload?.summary || null;

        state.openingEntry = action.payload?.openingEntry || null;

        state.transactions = action.payload?.transactions || [];

        state.filter = action.payload?.filter || {
          fromDate: null,
          toDate: null,
        };

        state.pagination = action.payload?.pagination || {
          page: 1,
          limit: 20,
          totalRecords: 0,
          totalPages: 0,
        };
      })

      .addCase(fetchDeliveryBoyPassbook.rejected, (state, action) => {
        state.passbookLoading = false;
        state.passbookError = action.payload;
      })

      // =================================================
      // EXPORT
      // =================================================

      .addCase(fetchDeliveryPassbookExport.pending, (state) => {
        state.exportLoading = true;
        state.exportError = null;
      })

      .addCase(fetchDeliveryPassbookExport.fulfilled, (state) => {
        state.exportLoading = false;
      })

      .addCase(fetchDeliveryPassbookExport.rejected, (state, action) => {
        state.exportLoading = false;
        state.exportError = action.payload;
      });
  },
});

export const { clearPassbook } = deliveryPassbookSlice.actions;

export default deliveryPassbookSlice.reducer;
