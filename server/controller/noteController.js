const sql = require("mssql");
const { poolPromise } = require("../utils/db");
exports.createNote = async (req, res) => {
  try {
    const {
      order_id,
      invoice_no,
      customer_id,
      customer_name,
      note_type,
      created_by,
      note_date,
      items,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items found",
      });
    }

    const pool = await poolPromise;

    const prefix = note_type === "Credit" ? "CN" : "DN";

    const lastNote = await pool.request().query(`
      SELECT TOP 1 note_no
      FROM credit_debit_notes
      WHERE note_type='${note_type}'
      ORDER BY note_id DESC
    `);

    let note_no;

    if (lastNote.recordset.length === 0) {
      note_no = `${prefix}000001`;
    } else {
      const last = lastNote.recordset[0].note_no;
      const number = parseInt(last.replace(prefix, ""), 10) + 1;
      note_no = prefix + number.toString().padStart(6, "0");
    }

    for (const item of items) {
      await pool
        .request()
        .input("note_no", sql.VarChar, note_no)
        .input("order_id", sql.Int, order_id)
        .input("invoice_no", sql.VarChar, invoice_no)
        .input("customer_id", sql.Int, customer_id)
        .input("customer_name", sql.VarChar, customer_name)
        .input("product_id", sql.Int, item.product_id || null)
        .input("product_name", sql.VarChar, item.product_name)
        .input("product_type", sql.VarChar, item.product_type)
        .input("note_type", sql.VarChar, note_type)
        .input("original_qty", sql.Decimal(18, 2), item.original_qty)
        .input("note_qty", sql.Decimal(18, 2), item.note_qty)
        .input("rate", sql.Decimal(18, 2), item.rate)
        .input("amount", sql.Decimal(18, 2), item.amount)
        .input("reason", sql.VarChar, item.reason)
        .input("remarks", sql.VarChar, item.remarks)
        .input("freight", sql.Decimal(18, 2), item.freight || 0)
        .input("created_by", sql.Int, created_by)
        .input("note_date", sql.Date, note_date).query(`
          INSERT INTO credit_debit_notes
          (
            note_no,
            order_id,
            invoice_no,
            customer_id,
            customer_name,
            product_id,
            product_name,
            product_type,
            note_type,
            original_qty,
            note_qty,
            rate,
            amount,
            reason,
            remarks,
            freight,
            created_by,
            note_date
          )
          VALUES
          (
            @note_no,
            @order_id,
            @invoice_no,
            @customer_id,
            @customer_name,
            @product_id,
            @product_name,
            @product_type,
            @note_type,
            @original_qty,
            @note_qty,
            @rate,
            @amount,
            @reason,
            @remarks,
            @freight,
            @created_by,
            @note_date
          )
        `);
    }

    return res.status(201).json({
      success: true,
      message: "Note Created Successfully",
      note_no,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getNotes = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
           SELECT
    -- Credit / Debit Note
    n.note_id,
    n.note_no,
    n.order_id,
    n.invoice_no AS NoteInvoiceNo,
    n.customer_id,
    n.customer_name AS NoteCustomerName,
    n.product_id,
    n.product_name,
    n.product_type,
    n.note_date,
    n.freight,

    -- Product Master
    pt.DefaultWeight,
    pt.ProductUPC,

    -- Original Order Item Details
    oi.Quantity AS OriginalOrderQty,
    oi.Rate AS OriginalRate,
    oi.Total AS OriginalTotal,
    oi.Weight AS OriginalWeight,

    n.note_type,
    n.original_qty,
    n.note_qty,
    n.rate,
    n.amount,
    n.reason,
    n.remarks,
    n.status,
    n.created_by,
    n.created_at,

    -- Order Details
    o.CustomerName,
    o.Address,
    o.Area,
    o.ContactNo,
    o.DeliveryCharge,
    o.OrderDate,
    o.OrderTakenBy,
    o.InvoiceNo,
    o.Po_No,
    o.Po_Date,
    o.InvoiceDate,

    -- Delivery Details
    da.DeliveryDate,
    da.DeliveryStatus,
    da.ActualDeliveryDate,
    da.PaymentReceivedDate,
    da.Remark AS DeliveryRemark,
    da.CompletionRemarks,

    -- Delivery Boy
    da.DeliveryManID,
    dm.Name AS DeliveryManName,
    dm.MobileNo AS DeliveryBoyMobile,
    dm.Area AS DeliveryBoyArea

FROM credit_debit_notes n

LEFT JOIN OrdersTemp o
    ON o.OrderID = n.order_id

LEFT JOIN AssignedOrders da
    ON da.OrderID = n.order_id
    AND da.AssignID = (
        SELECT MAX(a.AssignID)
        FROM AssignedOrders a
        WHERE a.OrderID = n.order_id
    )

LEFT JOIN DeliveryMen dm
    ON dm.DeliveryManID = da.DeliveryManID

LEFT JOIN ProductTypes pt
    ON LTRIM(RTRIM(pt.ProductType)) = LTRIM(RTRIM(n.product_type))

LEFT JOIN OrderItems oi
    ON oi.OrderID = n.order_id
   AND LTRIM(RTRIM(oi.ProductType)) = LTRIM(RTRIM(n.product_type))

ORDER BY n.created_at DESC, n.note_id ASC;
    `);

    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;

    const result = await pool.request().input("id", sql.Int, id).query(`
        SELECT *
        FROM credit_debit_notes
        WHERE note_id=@id
      `);

    res.json({
      success: true,
      data: result.recordset[0],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { note_type, freight, items } = req.body;

    console.log(req.body, "inside note");

    if (!items || !items.length) {
      return res.status(400).json({
        success: false,
        message: "No items found",
      });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      for (const item of items) {
        if (item.status === "Cancelled") {
          await transaction.request().input("id", sql.Int, item.note_id).query(`
            DELETE FROM credit_debit_notes
            WHERE note_id=@id
        `);

          continue;
        }
        const result = await transaction
          .request()
          .input("id", sql.Int, item.note_id)
          .input("note_type", sql.VarChar, note_type)
          .input("note_qty", sql.Decimal(18, 2), item.note_qty)
          .input("rate", sql.Decimal(18, 2), item.rate)
          .input("amount", sql.Decimal(18, 2), item.amount)
          .input("reason", sql.VarChar, item.reason)
          .input("remarks", sql.VarChar, item.remarks)
          .input("freight", sql.Decimal(18, 2), freight)
          .input("status", sql.VarChar, item.status).query(`
      UPDATE credit_debit_notes
      SET
          note_type=@note_type,
          note_qty=@note_qty,
          rate=@rate,
          amount=@amount,
          reason=@reason,
          remarks=@remarks,
          freight=@freight,
          status=@status
      WHERE note_id=@id
  `);

        console.log(result.rowsAffected);
      }

      await transaction.commit();

      res.json({
        success: true,
        message: "Notes updated successfully",
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;

    await pool
      .request()

      .input("id", sql.Int, id).query(`
        DELETE FROM credit_debit_notes
        WHERE note_id=@id
      `);

    res.json({
      success: true,
      message: "Deleted Successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
