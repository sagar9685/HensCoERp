// controller/demoInvoiceController.js
const { poolPromise, sql } = require("../utils/db");

exports.saveDemoInvoice = async (req, res) => {
  try {
    const data = req.body;

    // Use the existing poolPromise instead of sql.connect()
    const pool = await poolPromise;

    await pool
      .request()
      .input("InvoiceNo", sql.NVarChar, data.InvoiceNo)
      .input("CustomerName", sql.NVarChar, data.CustomerName)
      .input("Address", sql.NVarChar, data.Address)
      .input("Area", sql.NVarChar, data.Area)
      .input("ContactNo", sql.NVarChar, data.ContactNo)
      .input("Gst_No", sql.NVarChar, data.Gst_No)
      .input("PAN_No", sql.NVarChar, data.PAN_No)
      .input("OrderDate", sql.Date, data.OrderDate)
      .input("DeliveryManName", sql.NVarChar, data.DeliveryManName)
      .input("Po_No", sql.NVarChar, data.Po_No)
      .input("Po_Date", sql.Date, data.Po_Date)
      .input("ProductNames", sql.NVarChar, data.ProductNames)
      .input("ProductTypes", sql.NVarChar, data.ProductTypes)
      .input("Weights", sql.NVarChar, data.Weights)
      .input("Quantities", sql.NVarChar, data.Quantities)
      .input("Rates", sql.NVarChar, data.Rates)
      .input("MRPs", sql.NVarChar, data.MRPs)
      .input("ProductUPCs", sql.NVarChar, data.ProductUPCs)
      .input("DeliveryCharge", sql.Decimal(18, 2), data.DeliveryCharge).query(`
                INSERT INTO DemoInvoices 
                (InvoiceNo, CustomerName, Address, Area, ContactNo, Gst_No, PAN_No, OrderDate, DeliveryManName, Po_No, Po_Date, ProductNames, ProductTypes, Weights, Quantities, Rates, MRPs, ProductUPCs, DeliveryCharge)
                VALUES 
                (@InvoiceNo, @CustomerName, @Address, @Area, @ContactNo, @Gst_No, @PAN_No, @OrderDate, @DeliveryManName, @Po_No, @Po_Date, @ProductNames, @ProductTypes, @Weights, @Quantities, @Rates, @MRPs, @ProductUPCs, @DeliveryCharge)
            `);

    res.status(200).json({ message: "Invoice saved successfully!" });
  } catch (err) {
    console.error("SQL Error:", err.message);
    res.status(500).json({ error: "Database error", details: err.message });
  }
};
