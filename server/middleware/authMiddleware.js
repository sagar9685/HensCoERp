const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../utils/db"); // 👈 ADD THIS

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
      .query("SELECT tokenVersion FROM Users WHERE UserID=@UserID");

    const user = result.recordset[0];

    // ✅ Yaha check aayega (correct place)
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 🔥 MAIN LOGIC (all device logout)
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "Session expired, login again" });
    }

    req.user = decoded;
    next();
  } catch (err) {
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
