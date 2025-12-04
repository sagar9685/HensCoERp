const { sql, poolPromise } = require('../utils/db'); // import poolPromise

// Generate PO Number
const generatePONumber = async () => {
    const pool = await poolPromise;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // 1–12

    // ---- Calculate Financial Year ----
    let fyStart, fyEnd;

    if (month >= 4) {
        // From April to December → current FY = year-year+1
        fyStart = year % 100; 
        fyEnd = (year + 1) % 100;
    } else {
        // From Jan to March → previousYear-currentYear
        fyStart = (year - 1) % 100;
        fyEnd = year % 100;
    }

    const fyString = `${String(fyStart).padStart(2, "0")}-${String(fyEnd).padStart(2, "0")}`;
    const prefix = `PO-${fyString}-`;

    // ---- Get Last PO Number ----
    const result = await pool.request()
        .input("prefix", sql.VarChar, prefix + '%')
        .query(`
            SELECT TOP 1 po_number 
            FROM purchase_orders 
            WHERE po_number LIKE @prefix 
            ORDER BY id DESC
        `);

    let nextNumber = 1;

    if (result.recordset.length > 0) {
        const lastPONo = result.recordset[0].po_number;
        const parts = lastPONo.split('-');
        nextNumber = parseInt(parts[3]) + 1; 
    }

    return `${prefix}${String(nextNumber).padStart(2, "0")}`;
};


// Create Purchase Order
exports.createPurchaseOrder = async (req, res) => {
    try {
        const { orderDate, supplier, notes, items } = req.body;

        const pool = await poolPromise;

        const poNumber = await generatePONumber();

        // Insert into purchase_orders
        const poQuery = await pool.request()
            .input("po_number", sql.VarChar, poNumber)
            .input("order_date", sql.Date, orderDate)
            .input("supplier", sql.VarChar, supplier || "Phoenix Poultry")
            .input("notes", sql.Text, notes || "")
            .input("total_items", sql.Int, items.length)
            .input("total_quantity", sql.Int, items.reduce((sum, x) => sum + x.quantity, 0))
            .query(`
                INSERT INTO purchase_orders 
                (po_number, order_date, supplier, notes, total_items, total_quantity)
                OUTPUT INSERTED.id
                VALUES (@po_number, @order_date, @supplier, @notes, @total_items, @total_quantity)
            `);

        const purchaseOrderId = poQuery.recordset[0].id;

        // Insert items
        for (const item of items) {
            await pool.request()
                .input("purchase_order_id", sql.Int, purchaseOrderId)
                .input("item_name", sql.VarChar, item.itemName)
                .input("weight", sql.VarChar, item.weight)
                .input("quantity", sql.Int, item.quantity)
                .input("unit_price", sql.Decimal(10, 2), item.unitPrice || 0)
                .input("total", sql.Decimal(10, 2), (item.quantity * item.unitPrice) || 0)
                .query(`
                    INSERT INTO purchase_order_items 
                    (purchase_order_id, item_name, weight, quantity, unit_price, total)
                    VALUES (@purchase_order_id, @item_name, @weight, @quantity, @unit_price, @total)
                `);
        }

        res.status(201).json({
            message: "Purchase order created successfully",
            po_number: poNumber,
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Get all Purchase Orders
exports.getPurchaseOrders = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
           select * from purchase_orders po join purchase_order_items poi on po.id = poi.purchase_order_id ORDER BY po.id DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get single Purchase Order by ID
exports.getPurchaseOrderById = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;

        const po = await pool.request()
            .input("id", sql.Int, id)
            .query(`SELECT * FROM purchase_orders WHERE id = @id`);

        const items = await pool.request()
            .input("id", sql.Int, id)
            .query(`SELECT * FROM purchase_order_items WHERE purchase_order_id = @id`);

        res.json({
            ...po.recordset[0],
            items: items.recordset
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete Purchase Order
exports.deletePurchaseOrder = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;

        await pool.request()
            .input("id", sql.Int, id)
            .query(`DELETE FROM purchase_orders WHERE id = @id`);

        res.json({ message: "Purchase order deleted successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
