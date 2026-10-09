const { sql, poolPromise } = require("../utils/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.signup = async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "Required fields missing" });

  const pool = await poolPromise;

  const existingUser = await pool
    .request()
    .input("Username", sql.NVarChar, username)
    .query("SELECT * FROM Users WHERE Username=@Username");

  if (existingUser.recordset.length > 0)
    return res.status(400).json({ message: "Username already exists!" });

  const hashedPassword = await bcrypt.hash(password, 10);

  await pool
    .request()
    .input("Username", sql.NVarChar, username)
    .input("Password", sql.NVarChar, hashedPassword)
    .input("Role", sql.NVarChar, role || "customer")
    .query(
      "INSERT INTO Users (Username, Password, Role) VALUES (@Username, @Password, @Role)",
    );

  res.status(201).json({ message: "User created successfully!" });
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // =====================================================
    // BASIC VALIDATION
    // =====================================================
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const pool = await poolPromise;

    // =====================================================
    // GET USER
    // =====================================================
    const result = await pool
      .request()
      .input("Username", sql.NVarChar, username.trim()).query(`
        SELECT
          UserID,
          Username,
          Password,
          Role,
          IsActive,
          ISNULL(tokenVersion, 0) AS tokenVersion
        FROM Users
        WHERE Username = @Username
      `);

    if (result.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    const user = result.recordset[0];

    // =====================================================
    // ACCOUNT ACTIVE CHECK
    // =====================================================
    if (
      user.IsActive === false ||
      user.IsActive === 0 ||
      user.IsActive === null
    ) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message:
          "Your account has been deactivated. Please contact the administrator.",
      });
    }

    // =====================================================
    // PASSWORD CHECK
    // =====================================================
    const isMatch = await bcrypt.compare(password, user.Password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PASSWORD",
        message: "Invalid password",
      });
    }

    // =====================================================
    // TOKEN VERSION
    // =====================================================
    const tokenVersion = Number(user.tokenVersion || 0);

    // =====================================================
    // GENERATE JWT
    // =====================================================
    const token = jwt.sign(
      {
        userId: user.UserID,
        role: user.Role,
        tokenVersion,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      },
    );

    // =====================================================
    // LOGIN SUCCESS
    // =====================================================
    return res.status(200).json({
      success: true,
      message: "Login successful",

      token,
      role: user.Role,
      name: user.Username,
      userId: user.UserID,
      tokenVersion,
    });
  } catch (err) {
    console.error("Login error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error, please try again later",
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?.userId; // Token se aane wali ID

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: "All fields are required" });

    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .query("SELECT * FROM Users WHERE UserID=@UserID");

    if (result.recordset.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = result.recordset[0];

    // Password match check
    const isMatch = await bcrypt.compare(oldPassword, user.Password);
    if (!isMatch)
      return res.status(400).json({ message: "Old password is incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password + tokenVersion (Security for multi-device logout)
    await pool
      .request()
      .input("UserID", sql.Int, userId)
      .input("Password", sql.NVarChar, hashedPassword).query(`
        UPDATE Users 
        SET Password = @Password, 
            tokenVersion = ISNULL(tokenVersion, 0) + 1 
        WHERE UserID = @UserID
      `);

    res.json({ message: "Password updated successfully. Logging out..." });
  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.checkSession = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Session active",
    user: req.user,
  });
};
