const { sql, poolPromise } = require("../utils/db"); // tumhare db config ke hisab se

// GET Notifications
exports.getNotifications = async (req, res) => {
  const { role } = req.query;
  const pool = await poolPromise;

  const result = await pool.request().input("role", sql.NVarChar, role).query(`
      SELECT *
      FROM Notifications
      WHERE UserRole = @role
      ORDER BY CreatedAt DESC
    `);

  res.json(result.recordset);
};

// DELETE Notification
exports.readNotification = async (req, res) => {
  const { id } = req.params;
  const pool = await poolPromise;

  await pool
    .request()
    .input("id", sql.Int, id)
    .query(`DELETE FROM Notifications WHERE NotificationID=@id`);

  res.json({ message: "Notification removed" });
};

// CREATE Notification + Emit to frontend
// exports.createNotification = async (req, res) => {
//   const { UserRole, Message, OrderID, CustomerName } = req.body;

//   const pool = await poolPromise;

//   const result = await pool
//     .request()
//     .input("UserRole", sql.NVarChar, UserRole)
//     .input("Message", sql.NVarChar, Message)
//     .input("OrderID", sql.Int, OrderID)
//     .input("CustomerName", sql.NVarChar, CustomerName) // new field
//     .query(
//       `INSERT INTO Notifications (UserRole, Message, OrderID,CustomerName) ) OUTPUT INSERTED.* VALUES (@UserRole,@Message,@OrderID)`,
//     );

//   // Emit to frontend via socket
//   const io = req.app.get("io");
//   io.emit("newNotification", result.recordset[0]);

//   res.status(201).json(result.recordset[0]);
// };

exports.createNotification = async (req, res) => {
  const { UserRole, Message, OrderID, CustomerName } = req.body;

  const pool = await poolPromise;

  const result = await pool
    .request()
    .input("UserRole", sql.NVarChar, UserRole)
    .input("Message", sql.NVarChar, Message)
    .input("OrderID", sql.Int, OrderID)
    .input("CustomerName", sql.NVarChar, CustomerName).query(`
      INSERT INTO Notifications (UserRole, Message, OrderID, CustomerName)
      OUTPUT INSERTED.*
      VALUES (@UserRole, @Message, @OrderID, @CustomerName)
    `);

  // Emit to frontend via socket
  const io = req.app.get("io");
  io.emit("newNotification", result.recordset[0]);

  res.status(201).json(result.recordset[0]);
};
