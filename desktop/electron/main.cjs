const { app, BrowserWindow, shell, session, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

// =====================================================
// HENSCO ERP CONFIGURATION
// =====================================================

const APP_NAME = "HensCo ERP";
const APP_URL = "http://137.97.174.50:5006/";

const APP_ICON = path.join(__dirname, "../build/icon.ico");

app.setName(APP_NAME);

// =====================================================
// FIX: WINDOWS CACHE ACCESS DENIED (0x5)
// =====================================================

// Create dedicated writable application directories.
// These must be configured before Electron is ready.

const USER_DATA_PATH = path.join(app.getPath("appData"), "HensCo-ERP-Desktop");

const SESSION_DATA_PATH = path.join(USER_DATA_PATH, "SessionData");

try {
  fs.mkdirSync(USER_DATA_PATH, { recursive: true });
  fs.mkdirSync(SESSION_DATA_PATH, { recursive: true });

  app.setPath("userData", USER_DATA_PATH);
  app.setPath("sessionData", SESSION_DATA_PATH);

  console.log("[HensCo ERP] User data:", USER_DATA_PATH);
  console.log("[HensCo ERP] Session data:", SESSION_DATA_PATH);
} catch (error) {
  console.error("[HensCo ERP] Unable to configure application data:", error);
}

// =====================================================
// PREVENT MULTIPLE APP INSTANCES
// =====================================================

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow = null;

  // ===================================================
  // CREATE DESKTOP WINDOW
  // ===================================================

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1440,
      height: 900,

      minWidth: 1024,
      minHeight: 700,

      title: APP_NAME,

      icon: APP_ICON,

      backgroundColor: "#ffffff",

      autoHideMenuBar: true,

      show: false,

      center: true,

      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        devTools: !app.isPackaged,
      },
    });

    // =================================================
    // DISPLAY WINDOW
    // =================================================

    mainWindow.once("ready-to-show", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    // =================================================
    // SECURITY: PREVENT EXTERNAL NAVIGATION
    // =================================================

    mainWindow.webContents.on("will-navigate", (event, url) => {
      try {
        const targetOrigin = new URL(url).origin;
        const allowedOrigin = new URL(APP_URL).origin;

        if (targetOrigin !== allowedOrigin) {
          event.preventDefault();
        }
      } catch (error) {
        event.preventDefault();
      }
    });

    // =================================================
    // OPEN EXTERNAL LINKS IN DEFAULT BROWSER
    // =================================================

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const target = new URL(url);
        const allowedOrigin = new URL(APP_URL).origin;

        if (target.protocol === "https:" && target.origin !== allowedOrigin) {
          shell.openExternal(url).catch(console.error);
        }
      } catch (error) {
        console.error("[HensCo ERP] Invalid external URL:", error);
      }

      return { action: "deny" };
    });

    // =================================================
    // HANDLE WEBSITE LOAD ERRORS
    // =================================================

    mainWindow.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (!isMainFrame || errorCode === -3) {
          return;
        }

        console.error("[HensCo ERP] Website load failed", {
          errorCode,
          errorDescription,
          validatedURL,
        });

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();

          dialog
            .showMessageBox(mainWindow, {
              type: "warning",
              title: "HensCo ERP Connection Error",
              message: "Unable to connect to HensCo ERP server.",
              detail:
                "Please check your internet or office network connection and try again.",
              buttons: ["Retry", "Close"],
              defaultId: 0,
              noLink: true,
            })
            .then(({ response }) => {
              if (!mainWindow || mainWindow.isDestroyed()) {
                return;
              }

              if (response === 0) {
                mainWindow.loadURL(APP_URL).catch(console.error);
              } else {
                mainWindow.close();
              }
            })
            .catch(console.error);
        }
      },
    );

    // =================================================
    // LOAD HENSCO ERP
    // =================================================

    mainWindow.loadURL(APP_URL).catch((error) => {
      console.error("[HensCo ERP] Load error:", error.message);
    });

    // =================================================
    // WINDOW CLOSE EVENT
    // =================================================

    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  }

  // ===================================================
  // ELECTRON READY
  // ===================================================

  app
    .whenReady()
    .then(() => {
      // Deny permissions by default.
      // Allow specific permissions only when needed.
      session.defaultSession.setPermissionRequestHandler(
        (_webContents, _permission, callback) => {
          callback(false);
        },
      );

      createWindow();

      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });
    })
    .catch((error) => {
      console.error("[HensCo ERP] Startup failed:", error);
    });

  // ===================================================
  // SINGLE INSTANCE HANDLING
  // ===================================================

  app.on("second-instance", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.show();
      mainWindow.focus();
    }
  });

  // ===================================================
  // APP EXIT
  // ===================================================

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
