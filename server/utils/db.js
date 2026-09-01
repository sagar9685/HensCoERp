// for production
const sql = require("mssql");

const config = {
  user: "sa",
  password: "Ph@hoenix#g",
  server: "137.97.174.51",
  database: "hensCoErp",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log("Connected to SQL Server");
    return pool;
  })
  .catch((err) => {
    console.error("DB Connection Failed:", err.message || err);
    return null;
  });

module.exports = { sql, poolPromise };

// for local

// const sql = require("mssql");

// const config = {
//   user: "sa", // 👈 Updated to use SQL Login
//   password: "123", // 👈 The password you set in SSMS
//   server: "localhost",
//   database: "hensCoErp",
//   options: {
//     encrypt: false, // Keep false for local development
//     trustServerCertificate: true,
//   },
// };

// const poolPromise = new sql.ConnectionPool(config)
//   .connect()
//   .then((pool) => {
//     console.log("✅ SQL Server Connected successfully with 'sa' account!");
//     return pool;
//   })
//   .catch((err) => {
//     console.error("❌ SQL Connection Error:", err.message);
//   });

// module.exports = { sql, poolPromise };
