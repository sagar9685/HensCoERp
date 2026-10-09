import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

import App from "./App.jsx";
import { Provider } from "react-redux";
import store from "./redux/store.js";

// ============================================================
// AXIOS REQUEST INTERCEPTOR
// Har API request ke saath token automatically jayega
// ============================================================

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ============================================================
// AXIOS RESPONSE INTERCEPTOR
// User deactivate / token expire hua -> automatic logout
// ============================================================

axios.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    const forceLogoutCodes = [
      "ACCOUNT_INACTIVE",
      "SESSION_REVOKED",
      "TOKEN_EXPIRED",
      "INVALID_TOKEN",
      "USER_NOT_FOUND",
    ];

    if (status === 401 && forceLogoutCodes.includes(code)) {
      localStorage.removeItem("authData");
      localStorage.removeItem("token");
      localStorage.removeItem("role");

      // Already login page par ho to repeat redirect nahi
      if (window.location.pathname !== "/") {
        window.location.replace("/");
      }
    }

    return Promise.reject(error);
  },
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
