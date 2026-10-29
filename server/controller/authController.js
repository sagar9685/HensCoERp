const { sql, poolPromise } = require("../utils/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.signup = async (req, res) => {
  const { username, password, role, areaIds = [] } = req.body;

  if (!username?.trim() || !password || !Array.isArray(areaIds)) {
    return res.status(400).json({
      success: false,
      message: "Invalid signup details",
    });
  }

  const ids = [...new Set(areaIds.map(Number))];

  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    return res.status(400).json({
      success: false,
      message: "Invalid area IDs",
    });
  }

  let transaction;
  let started = false;

  try {
    const pool = await poolPromise;

    const existingUser = await pool
      .request()
      .input("Username", sql.NVarChar, username.trim()).query(`
        SELECT UserID
        FROM Users
        WHERE Username = @Username
      `);

    if (existingUser.recordset.length) {
      return res.status(400).json({
        success: false,
        message: "Username already exists!",
      });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();
    started = true;

    // Verify that every supplied area actually exists.
    if (ids.length) {
      const areaRequest = new sql.Request(transaction);

      const placeholders = ids.map((id, index) => {
        const name = `area${index}`;
        areaRequest.input(name, sql.Int, id);
        return `@${name}`;
      });

      const validAreas = await areaRequest.query(`
        SELECT areaId
        FROM dbo.area
        WHERE areaId IN (${placeholders.join(",")})
      `);

      if (validAreas.recordset.length !== ids.length) {
        await transaction.rollback();
        started = false;

        return res.status(400).json({
          success: false,
          message: "One or more selected areas do not exist",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userResult = await new sql.Request(transaction)
      .input("Username", sql.NVarChar, username.trim())
      .input("Password", sql.NVarChar, hashedPassword)
      .input("Role", sql.NVarChar, role || "customer").query(`
        INSERT INTO Users (Username, Password, Role)
        OUTPUT INSERTED.UserID
        VALUES (@Username, @Password, @Role)
      `);

    const userId = userResult.recordset[0].UserID;

    for (const areaId of ids) {
      await new sql.Request(transaction)
        .input("UserID", sql.Int, userId)
        .input("areaId", sql.Int, areaId).query(`
          INSERT INTO dbo.UserAreas (UserID, areaId)
          VALUES (@UserID, @areaId)
        `);
    }

    await transaction.commit();
    started = false;

    return res.status(201).json({
      success: true,
      message: "User created successfully!",
      userId,
      areaIds: ids,
      allAreasAccess: ids.length === 0,
    });
  } catch (error) {
    if (started) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Rollback Error:", rollbackError);
      }
    }

    console.error("Signup Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create user",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // =====================================================
    // 1. BASIC VALIDATION
    // =====================================================
    if (!username?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const pool = await poolPromise;

    // =====================================================
    // 2. GET USER
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
        FROM dbo.Users
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
    // 3. ACCOUNT ACTIVE CHECK
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
    // 4. PASSWORD CHECK
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
    // 5. FETCH USER ASSIGNED AREAS
    // =====================================================
    const areaResult = await pool
      .request()
      .input("UserID", sql.Int, user.UserID).query(`
        SELECT
          A.areaId,
          A.areaName
        FROM dbo.UserAreas UA
        INNER JOIN dbo.Area A
          ON UA.areaId = A.areaId
        WHERE UA.UserID = @UserID
        ORDER BY A.areaName
      `);

    const assignedAreas = areaResult.recordset;

    const areaIds = assignedAreas.map((area) => area.areaId);

    const areaNames = assignedAreas.map((area) => area.areaName.trim());

    // No area assigned = All areas access
    const allAreasAccess = assignedAreas.length === 0;

    // =====================================================
    // 6. TOKEN VERSION
    // =====================================================
    const tokenVersion = Number(user.tokenVersion || 0);

    // =====================================================
    // 7. GENERATE JWT
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
    // 8. LOGIN SUCCESS
    // =====================================================
    return res.status(200).json({
      success: true,
      message: "Login successful",

      token,
      role: user.Role,
      name: user.Username,
      userId: user.UserID,
      tokenVersion,

      // AREA ACCESS DETAILS
      assignedAreas,
      areaIds,
      areaNames,
      allAreasAccess,
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
