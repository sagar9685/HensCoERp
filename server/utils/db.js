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
//   user: "sa",
//   password: "123",
//   server: "localhost",
//   database: "hensCoErp",

//   // Connection establish hone ka maximum time
//   connectionTimeout: 30000,

//   // Ek SQL query ko maximum time
//   requestTimeout: 120000, // 2 minutes

//   // Connection pool
//   pool: {
//     max: 10,
//     min: 0,
//     idleTimeoutMillis: 30000,
//   },

//   options: {
//     encrypt: false,
//     trustServerCertificate: true,
//     enableArithAbort: true,
//   },
// };

// // ============================================================
// // SQL CONNECTION POOL
// // ============================================================

// const pool = new sql.ConnectionPool(config);

// pool.on("error", (err) => {
//   console.error("❌ SQL Pool Error:", err);
// });

// const poolPromise = pool
//   .connect()
//   .then((connectedPool) => {
//     console.log("✅ SQL Server Connected successfully with 'sa' account!");

//     return connectedPool;
//   })
//   .catch((err) => {
//     console.error("❌ SQL Server Connection Failed:", err);

//     // Important:
//     // error ko swallow mat karo
//     throw err;
//   });

// module.exports = {
//   sql,
//   poolPromise,
// };
