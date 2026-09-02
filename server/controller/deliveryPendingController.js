const sql = require("mssql");
const { poolPromise } = require("../utils/db");
// ============================================================
// GET DELIVERY MAN PENDING SUMMARY
// ============================================================

const getDeliveryPendingSummary = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      WITH OrderTotals AS
      (
          SELECT
              o.OrderID,

              ISNULL(SUM(oi.Total), 0)
              + ISNULL(o.DeliveryCharge, 0) AS OrderTotal

          FROM OrdersTemp o

          LEFT JOIN OrderItems oi
              ON oi.OrderID = o.OrderID

          GROUP BY
              o.OrderID,
              o.DeliveryCharge
      ),

      LatestAssignment AS
      (
          SELECT
              AssignID,
              OrderID,
              DeliveryManID,
              DeliveryStatus,
              AssignedAt,

              ROW_NUMBER() OVER (
                  PARTITION BY OrderID
                  ORDER BY AssignID DESC
              ) AS rn

          FROM AssignedOrders
      )

      SELECT
          dm.DeliveryManID,
          dm.Name AS DeliveryManName,

          COUNT(la.OrderID) AS PendingOrders,

          ISNULL(SUM(ot.OrderTotal), 0) AS PendingAmount

      FROM DeliveryMen dm

      LEFT JOIN LatestAssignment la
          ON la.DeliveryManID = dm.DeliveryManID
          AND la.rn = 1
          AND la.DeliveryStatus = 'Pending'

      LEFT JOIN OrderTotals ot
          ON ot.OrderID = la.OrderID

      WHERE dm.IsActive = 1

      GROUP BY
          dm.DeliveryManID,
          dm.Name

      ORDER BY dm.Name;
    `);

    return res.status(200).json({
      success: true,
      count: result.recordset.length,
      data: result.recordset,
    });
  } catch (error) {
    console.error("getDeliveryPendingSummary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch delivery pending summary",
      error: error.message,
    });
  }
};

// ============================================================
// GET ONE DELIVERY MAN PENDING ORDERS
// ============================================================

const getDeliveryManPendingOrders = async (req, res) => {
  try {
    const { deliveryManId } = req.params;

    if (!deliveryManId || isNaN(Number(deliveryManId))) {
      return res.status(400).json({
        success: false,
        message: "Valid DeliveryManID is required",
      });
    }

    const pool = await poolPromise;

    // ----------------------------------------------------------
    // DELIVERY MAN
    // ----------------------------------------------------------

    const deliveryManResult = await pool
      .request()
      .input("DeliveryManID", sql.Int, Number(deliveryManId)).query(`
        SELECT
            DeliveryManID,
            Name,
            Area,
            MobileNo,
            IsActive
        FROM DeliveryMen
        WHERE DeliveryManID = @DeliveryManID;
      `);

    if (deliveryManResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Delivery man not found",
      });
    }

    // ----------------------------------------------------------
    // PENDING ORDERS
    // ----------------------------------------------------------

    const ordersResult = await pool
      .request()
      .input("DeliveryManID", sql.Int, Number(deliveryManId)).query(`
        WITH OrderTotals AS
        (
            SELECT
                o.OrderID,

                ISNULL(SUM(oi.Total), 0) AS ItemsTotal,

                ISNULL(o.DeliveryCharge, 0) AS DeliveryCharge,

                ISNULL(SUM(oi.Total), 0)
                + ISNULL(o.DeliveryCharge, 0) AS OrderTotal

            FROM OrdersTemp o

            LEFT JOIN OrderItems oi
                ON oi.OrderID = o.OrderID

            GROUP BY
                o.OrderID,
                o.DeliveryCharge
        ),

        LatestAssignment AS
        (
            SELECT
                AssignID,
                OrderID,
                DeliveryManID,
                OtherDeliveryManName,
                DeliveryDate,
                Remark,
                AssignedAt,
                DeliveryStatus,
                CompletionRemarks,
                ActualDeliveryDate,
                PaymentReceivedDate,

                ROW_NUMBER() OVER (
                    PARTITION BY OrderID
                    ORDER BY AssignID DESC
                ) AS rn

            FROM AssignedOrders
        )

        SELECT
            la.AssignID,
            la.OrderID,

            o.CustomerName,
            o.Address,
            o.Area,
            o.ContactNo,

            o.OrderDate,
            o.InvoiceNo,
            o.Po_No,
            o.Po_Date,
            o.InvoiceDate,

            la.DeliveryDate,
            la.AssignedAt,
            la.DeliveryStatus,
            la.Remark,

            ot.ItemsTotal,
            ot.DeliveryCharge,
            ot.OrderTotal

        FROM LatestAssignment la

        INNER JOIN OrdersTemp o
            ON o.OrderID = la.OrderID

        INNER JOIN OrderTotals ot
            ON ot.OrderID = la.OrderID

        WHERE
            la.rn = 1
            AND la.DeliveryStatus = 'Pending'
            AND la.DeliveryManID = @DeliveryManID

        ORDER BY
            la.DeliveryDate ASC,
            la.AssignID DESC;
      `);

    const orders = ordersResult.recordset;

    const totalPendingAmount = orders.reduce(
      (sum, order) => sum + Number(order.OrderTotal || 0),
      0,
    );

    return res.status(200).json({
      success: true,

      deliveryMan: deliveryManResult.recordset[0],

      summary: {
        pendingOrders: orders.length,
        pendingAmount: totalPendingAmount,
      },

      data: orders,
    });
  } catch (error) {
    console.error("getDeliveryManPendingOrders error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending orders",
      error: error.message,
    });
  }
};

// ============================================================
// GET ORDER ITEMS
// Optional: order detail modal ke andar items dikhane ke liye
// ============================================================

const getPendingOrderItems = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId || isNaN(Number(orderId))) {
      return res.status(400).json({
        success: false,
        message: "Valid OrderID is required",
      });
    }

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("OrderID", sql.Int, Number(orderId)).query(`
        SELECT
            ItemID,
            OrderID,
            ProductName,
            ProductType,
            Weight,
            Quantity,
            Rate,
            Total

        FROM OrderItems

        WHERE OrderID = @OrderID

        ORDER BY ItemID;
      `);

    return res.status(200).json({
      success: true,
      data: result.recordset,
    });
  } catch (error) {
    console.error("getPendingOrderItems error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch order items",
      error: error.message,
    });
  }
};

module.exports = {
  getDeliveryPendingSummary,
  getDeliveryManPendingOrders,
  getPendingOrderItems,
};
