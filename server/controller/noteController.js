const { sql, poolPromise } = require("../utils/db");

// ============================================================
// HELPER 1: ADJUST PHYSICAL STOCK
// Positive difference = ADD stock
// Negative difference = MINUS stock
// ============================================================

const adjustCreditStock = async (transaction, productType, difference) => {
  const product = String(productType || "").trim();
  const delta = Number(difference);

  if (!product || !Number.isFinite(delta)) {
    throw new Error("Invalid product or stock quantity");
  }

  if (delta === 0) return;

  const qty = Math.abs(delta);

  // ----------------------------------------------------------
  // ADD STOCK
  // ----------------------------------------------------------
  if (delta > 0) {
    const result = await transaction
      .request()
      .input("product", sql.NVarChar, product).query(`
        SELECT TOP 1 id
        FROM Stock WITH (UPDLOCK, HOLDLOCK)
        WHERE UPPER(LTRIM(RTRIM(item_name))) =
              UPPER(LTRIM(RTRIM(@product)))
        ORDER BY id DESC
      `);

    if (!result.recordset.length) {
      throw new Error(`Stock record not found for ${product}`);
    }

    const stockId = result.recordset[0].id;

    const updated = await transaction
      .request()
      .input("id", sql.Int, stockId)
      .input("qty", sql.Decimal(18, 2), qty).query(`
        UPDATE Stock
        SET quantity = quantity + @qty
        WHERE id = @id
      `);

    if (updated.rowsAffected[0] !== 1) {
      throw new Error(`Unable to add stock for ${product}`);
    }

    console.log(`Stock ADD: ${product} +${qty}`);

    return;
  }

  // ----------------------------------------------------------
  // MINUS STOCK (FIFO)
  // ----------------------------------------------------------
  const stocks = await transaction
    .request()
    .input("product", sql.NVarChar, product).query(`
      SELECT id, quantity
      FROM Stock WITH (UPDLOCK, HOLDLOCK)
      WHERE UPPER(LTRIM(RTRIM(item_name))) =
            UPPER(LTRIM(RTRIM(@product)))
        AND quantity > 0
      ORDER BY id ASC
    `);

  const available = stocks.recordset.reduce(
    (total, row) => total + Number(row.quantity),
    0,
  );

  if (available + 0.000001 < qty) {
    throw new Error(
      `Insufficient physical stock for ${product}. Available: ${available}, Required: ${qty}`,
    );
  }

  let remaining = qty;

  for (const stock of stocks.recordset) {
    if (remaining <= 0.000001) break;

    const deductQty = Math.min(Number(stock.quantity), remaining);

    if (deductQty <= 0) continue;

    const updated = await transaction
      .request()
      .input("id", sql.Int, stock.id)
      .input("qty", sql.Decimal(18, 2), deductQty).query(`
        UPDATE Stock
        SET quantity = quantity - @qty
        WHERE id = @id
          AND quantity >= @qty
      `);

    if (updated.rowsAffected[0] !== 1) {
      throw new Error(`Unable to deduct stock for ${product}`);
    }

    remaining = Math.max(0, remaining - deductQty);
  }

  if (remaining > 0.000001) {
    throw new Error(`Incomplete stock deduction for ${product}`);
  }

  console.log(`Stock MINUS: ${product} -${qty}`);
};

// ============================================================
// HELPER 2: GET PRODUCT WEIGHT
// From latest Stock record
// ============================================================

const getProductWeight = async (transaction, productType) => {
  const result = await transaction
    .request()
    .input("product", sql.NVarChar, productType).query(`
      SELECT TOP 1 weight
      FROM Stock
      WHERE UPPER(LTRIM(RTRIM(item_name))) =
            UPPER(LTRIM(RTRIM(@product)))
      ORDER BY id DESC
    `);

  return result.recordset[0]?.weight || "";
};

// ============================================================
// HELPER 3: STOCK HISTORY REFERENCE
// Each note item has its own unique reference.
// Example: CN000006#12
// ============================================================

const getCreditHistoryRef = (noteNo, noteId) => {
  return `${noteNo}#${noteId}`;
};

// ============================================================
// HELPER 4: VERIFY CREDIT NOTE STOCK HISTORY
// Prevents old, untracked notes from changing stock incorrectly.
// ============================================================

const verifyCreditHistory = async (transaction, note) => {
  const refNo = getCreditHistoryRef(note.note_no, note.note_id);

  const result = await transaction.request().input("ref_no", sql.VarChar, refNo)
    .query(`
      SELECT
        COUNT(*) AS EntryCount,
        ISNULL(SUM(quantity), 0) AS NetQuantity
      FROM StockHistory WITH (UPDLOCK, HOLDLOCK)
      WHERE ref_no = @ref_no
        AND type = 'RTV'
    `);

  const history = result.recordset[0];

  if (Number(history.EntryCount) === 0) {
    throw new Error(
      `Credit Note ${note.note_no}, item ${note.note_id} has no tracked stock history. Reconcile this existing note before editing or deleting it.`,
    );
  }

  const expectedQty =
    note.note_type === "Credit" && note.status !== "Cancelled"
      ? Number(note.note_qty)
      : 0;

  if (Math.abs(Number(history.NetQuantity) - expectedQty) > 0.000001) {
    throw new Error(
      `Stock history mismatch for ${note.note_no}, item ${note.note_id}. Expected ${expectedQty}, found ${history.NetQuantity}.`,
    );
  }

  return refNo;
};

// ============================================================
// HELPER 5: RECORD CREDIT NOTE STOCK MOVEMENT
//
// StockHistory TYPE = RTV
//
// Positive quantity -> Stock IN
// Negative quantity -> Stock OUT
//
// IMPORTANT:
// Existing stock dashboard already counts RTV.
// So no changes required in getStock or assignOrder.
// ============================================================

const recordCreditStockMovement = async (
  transaction,
  { noteNo, noteId, productType, difference, noteDate },
) => {
  const delta = Number(difference);

  if (!Number.isFinite(delta)) {
    throw new Error("Invalid stock movement quantity");
  }

  if (delta === 0) return;

  const product = String(productType || "").trim();

  if (!product || !noteDate) {
    throw new Error("Product and note date are required");
  }

  const refNo = getCreditHistoryRef(noteNo, noteId);

  const weight = await getProductWeight(transaction, product);

  // Step 1: Physical stock adjustment
  await adjustCreditStock(transaction, product, delta);

  // Step 2: StockHistory adjustment
  await transaction
    .request()
    .input("item_name", sql.NVarChar, product)
    .input("weight", sql.NVarChar, weight)
    .input("quantity", sql.Decimal(18, 2), delta)
    .input("type", sql.VarChar, "RTV")
    .input("ref_no", sql.VarChar, refNo)
    .input("date", sql.Date, noteDate).query(`
      INSERT INTO StockHistory
      (
        item_name,
        weight,
        quantity,
        type,
        ref_no,
        date
      )
      VALUES
      (
        @item_name,
        @weight,
        @quantity,
        @type,
        @ref_no,
        @date
      )
    `);

  console.log("Credit Note Stock Movement:", {
    noteNo,
    noteId,
    product,
    difference: delta,
    noteDate,
    refNo,
  });
};

// ============================================================
// CREATE CREDIT / DEBIT NOTE
// ============================================================

exports.createNote = async (req, res) => {
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

  if (!["Credit", "Debit"].includes(note_type)) {
    return res.status(400).json({
      success: false,
      message: "Invalid note type",
    });
  }

  if (!note_date) {
    return res.status(400).json({
      success: false,
      message: "Note date is required",
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No items found",
    });
  }

  let transaction;
  let started = false;

  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);

    await transaction.begin();
    started = true;

    const prefix = note_type === "Credit" ? "CN" : "DN";

    // Lock for safe note number generation
    const lock = await transaction
      .request()
      .input("resource", sql.NVarChar, `note-number-${prefix}`).query(`
        DECLARE @result INT;

        EXEC @result = sp_getapplock
          @Resource = @resource,
          @LockMode = 'Exclusive',
          @LockOwner = 'Transaction',
          @LockTimeout = 10000;

        SELECT @result AS lockResult;
      `);

    if (lock.recordset[0].lockResult < 0) {
      throw new Error("Unable to generate note number");
    }

    const lastNote = await transaction
      .request()
      .input("prefix", sql.VarChar, prefix).query(`
        SELECT
          ISNULL(
            MAX(
              TRY_CONVERT(
                INT,
                SUBSTRING(note_no, 3, 20)
              )
            ),
            0
          ) AS lastNumber
        FROM credit_debit_notes
        WHERE LEFT(note_no, 2) = @prefix
      `);

    const nextNumber = Number(lastNote.recordset[0].lastNumber) + 1;

    const note_no = prefix + String(nextNumber).padStart(6, "0");

    // --------------------------------------------------------
    // INSERT NOTE ITEMS
    // --------------------------------------------------------
    for (const item of items) {
      const noteQty = Number(item.note_qty);

      if (!Number.isFinite(noteQty) || noteQty <= 0) {
        throw new Error("Note quantity must be greater than zero");
      }

      const result = await transaction
        .request()
        .input("note_no", sql.VarChar, note_no)
        .input("order_id", sql.Int, order_id)
        .input("invoice_no", sql.VarChar, invoice_no)
        .input("customer_id", sql.Int, customer_id)
        .input("customer_name", sql.VarChar, customer_name)
        .input("product_id", sql.Int, item.product_id ?? null)
        .input("product_name", sql.VarChar, item.product_name)
        .input("product_type", sql.VarChar, item.product_type)
        .input("note_type", sql.VarChar, note_type)
        .input("original_qty", sql.Decimal(18, 2), item.original_qty)
        .input("note_qty", sql.Decimal(18, 2), noteQty)
        .input("rate", sql.Decimal(18, 2), item.rate)
        .input("amount", sql.Decimal(18, 2), item.amount)
        .input("reason", sql.VarChar, item.reason ?? null)
        .input("remarks", sql.VarChar, item.remarks ?? null)
        .input("freight", sql.Decimal(18, 2), item.freight ?? 0)
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
          OUTPUT INSERTED.note_id
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

      const noteId = result.recordset[0].note_id;

      // ------------------------------------------------------
      // CREDIT NOTE -> ADD STOCK ON NOTE DATE
      // ------------------------------------------------------
      if (note_type === "Credit") {
        await recordCreditStockMovement(transaction, {
          noteNo: note_no,
          noteId,
          productType: item.product_type,
          difference: noteQty,
          noteDate: note_date,
        });
      }
    }

    await transaction.commit();
    started = false;

    return res.status(201).json({
      success: true,
      message: "Note Created Successfully",
      note_no,
    });
  } catch (err) {
    if (started) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error("Create rollback error:", rollbackErr);
      }
    }

    console.error("Create Note Error:", err);

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

// ============================================================
// UPDATE CREDIT / DEBIT NOTE
// ============================================================

exports.updateNote = async (req, res) => {
  const { note_type, freight, items } = req.body;

  if (!["Credit", "Debit"].includes(note_type)) {
    return res.status(400).json({
      success: false,
      message: "Invalid note type",
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No items found",
    });
  }

  // Prevent the same item being updated twice
  const ids = items.map((item) => Number(item.note_id));

  if (
    ids.some((id) => !Number.isInteger(id) || id <= 0) ||
    new Set(ids).size !== ids.length
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid or duplicate note item IDs",
    });
  }

  let transaction;
  let started = false;

  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);

    await transaction.begin();
    started = true;

    for (const item of items) {
      const oldResult = await transaction
        .request()
        .input("id", sql.Int, item.note_id).query(`
          SELECT
            note_id,
            note_no,
            product_type,
            note_qty,
            note_type,
            note_date,
            status
          FROM credit_debit_notes WITH (UPDLOCK, HOLDLOCK)
          WHERE note_id = @id
        `);

      if (!oldResult.recordset.length) {
        throw new Error(`Note item ${item.note_id} not found`);
      }

      const oldNote = oldResult.recordset[0];

      const oldQty = Number(oldNote.note_qty);

      const productType = oldNote.product_type;

      const noteNo = oldNote.note_no;

      const noteDate = oldNote.note_date;

      // Do not change CN into DN or DN into CN
      if (oldNote.note_type !== note_type) {
        throw new Error("Note type cannot be changed after creation");
      }

      // ------------------------------------------------------
      // CANCEL NOTE ITEM
      // ------------------------------------------------------
      if (item.status === "Cancelled") {
        if (oldNote.note_type === "Credit") {
          if (oldNote.status !== "Cancelled") {
            await verifyCreditHistory(transaction, oldNote);

            await recordCreditStockMovement(transaction, {
              noteNo,
              noteId: oldNote.note_id,
              productType,
              difference: -oldQty,
              noteDate,
            });
          }
        }

        // Preserve existing behavior: delete cancelled item
        await transaction.request().input("id", sql.Int, item.note_id).query(`
            DELETE FROM credit_debit_notes
            WHERE note_id = @id
          `);

        continue;
      }

      if (oldNote.status === "Cancelled") {
        throw new Error("A cancelled note cannot be reactivated");
      }

      const newQty = Number(item.note_qty);

      if (!Number.isFinite(newQty) || newQty <= 0) {
        throw new Error(`Invalid quantity for note item ${item.note_id}`);
      }

      // ------------------------------------------------------
      // CREDIT NOTE QUANTITY DIFFERENCE
      // ------------------------------------------------------
      if (note_type === "Credit") {
        await verifyCreditHistory(transaction, oldNote);

        const difference = Math.round((newQty - oldQty) * 100) / 100;

        if (difference !== 0) {
          await recordCreditStockMovement(transaction, {
            noteNo,
            noteId: oldNote.note_id,
            productType,
            difference,
            noteDate,
          });
        }
      }

      // ------------------------------------------------------
      // UPDATE NOTE DETAILS
      // ------------------------------------------------------
      await transaction
        .request()
        .input("id", sql.Int, item.note_id)
        .input("note_type", sql.VarChar, note_type)
        .input("note_qty", sql.Decimal(18, 2), newQty)
        .input("rate", sql.Decimal(18, 2), item.rate)
        .input("amount", sql.Decimal(18, 2), item.amount)
        .input("reason", sql.VarChar, item.reason ?? null)
        .input("remarks", sql.VarChar, item.remarks ?? null)
        .input("freight", sql.Decimal(18, 2), freight ?? 0)
        .input("status", sql.VarChar, item.status ?? oldNote.status).query(`
          UPDATE credit_debit_notes
          SET
            note_type = @note_type,
            note_qty = @note_qty,
            rate = @rate,
            amount = @amount,
            reason = @reason,
            remarks = @remarks,
            freight = @freight,
            status = @status
          WHERE note_id = @id
        `);
    }

    await transaction.commit();
    started = false;

    return res.json({
      success: true,
      message: "Notes and Stock Updated Successfully",
    });
  } catch (err) {
    if (started) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error("Update rollback error:", rollbackErr);
      }
    }

    console.error("Update Note Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================================================
// DELETE CREDIT / DEBIT NOTE
// ============================================================

exports.deleteNote = async (req, res) => {
  const { id } = req.params;

  let transaction;
  let started = false;

  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);

    await transaction.begin();
    started = true;

    const result = await transaction.request().input("id", sql.Int, id).query(`
        SELECT
          note_id,
          note_no,
          product_type,
          note_qty,
          note_type,
          note_date,
          status
        FROM credit_debit_notes WITH (UPDLOCK, HOLDLOCK)
        WHERE note_id = @id
      `);

    if (!result.recordset.length) {
      await transaction.rollback();
      started = false;

      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    const note = result.recordset[0];

    // --------------------------------------------------------
    // CREDIT NOTE DELETE -> REVERSE STOCK
    // --------------------------------------------------------
    if (note.note_type === "Credit" && note.status !== "Cancelled") {
      await verifyCreditHistory(transaction, note);

      await recordCreditStockMovement(transaction, {
        noteNo: note.note_no,
        noteId: note.note_id,
        productType: note.product_type,
        difference: -Number(note.note_qty),
        noteDate: note.note_date,
      });
    }

    // Delete note only after stock adjustment
    await transaction.request().input("id", sql.Int, id).query(`
        DELETE FROM credit_debit_notes
        WHERE note_id = @id
      `);

    await transaction.commit();
    started = false;

    return res.json({
      success: true,
      message: "Note Deleted and Stock Adjusted Successfully",
    });
  } catch (err) {
    if (started) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error("Delete rollback error:", rollbackErr);
      }
    }

    console.error("Delete Note Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
