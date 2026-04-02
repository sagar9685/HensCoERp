const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../utils/db");

exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "Not authorized" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("UserID", sql.Int, decoded.userId)
      .query("SELECT TokenVersion FROM Users WHERE UserID=@UserID"); // ✅ FIX

    const user = result.recordset[0];

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // ✅ FIX (TokenVersion)
    if (user.TokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "Session expired, login again" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.log("JWT ERROR:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Role-based access
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Access denied" });
    }
    next();
  };
