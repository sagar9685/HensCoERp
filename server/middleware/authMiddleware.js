const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../utils/db");

exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      code: "NO_TOKEN",
      message: "Not authorized",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // =========================================================
    // VERIFY JWT
    // =========================================================
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // =========================================================
    // GET CURRENT USER STATUS FROM DATABASE
    // =========================================================
    const pool = await poolPromise;

    const result = await pool.request().input("UserID", sql.Int, decoded.userId)
      .query(`
        SELECT
          UserID,
          Username,
          Role,
          IsActive,
          ISNULL(tokenVersion, 0) AS TokenVersion
        FROM Users
        WHERE UserID = @UserID
      `);

    const user = result.recordset[0];

    // =========================================================
    // USER DOESN'T EXIST
    // =========================================================
    if (!user) {
      return res.status(401).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    // =========================================================
    // USER DEACTIVATED
    // =========================================================
    if (!user.IsActive) {
      return res.status(401).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message:
          "Your account has been deactivated. Please contact administrator.",
      });
    }

    // =========================================================
    // TOKEN VERSION CHECK
    // =========================================================
    if (Number(user.TokenVersion) !== Number(decoded.tokenVersion || 0)) {
      return res.status(401).json({
        success: false,
        code: "SESSION_REVOKED",
        message: "Session expired. Please login again.",
      });
    }

    // =========================================================
    // USER DATA FOR NEXT MIDDLEWARE / CONTROLLER
    // =========================================================
    req.user = {
      userId: user.UserID,
      username: user.Username,
      role: user.Role,
      tokenVersion: user.TokenVersion,
    };

    next();
  } catch (err) {
    console.log("JWT ERROR:", err.message);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message: "Session expired. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      code: "INVALID_TOKEN",
      message: "Invalid token",
    });
  }
};

// =============================================================
// ROLE BASED ACCESS
// =============================================================

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Access denied",
      });
    }

    next();
  };
