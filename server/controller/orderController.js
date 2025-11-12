const { sql, poolPromise } = require('../utils/db');

exports.addOrder = async (req, res) => {
  console.log('add order',req.body)
  try {
    const {
      ProductName,
      ProductType,
      Weight,
      Quantity,
      Rate,
      DeliveryCharge,
      CustomerName,
      Address,
      Area,
      ContactNo,
      OrderDate
    } = req.body;

    
    if (
      !ProductName || !ProductType || !Weight ||
      !Quantity || !Rate || !DeliveryCharge ||
      !CustomerName || !Address
    ) {
      return res.status(400).json({ message: "Required fields are missing." });
    }

    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ message: "Database connection failed." });
    }

    const query = `
      INSERT INTO Orders (
        ProductName, ProductType, Weight, Quantity, Rate,
        DeliveryCharge, CustomerName, Address, Area, ContactNo, OrderDate
      )
      VALUES (
        @ProductName, @ProductType, @Weight, @Quantity, @Rate,
        @DeliveryCharge, @CustomerName, @Address, @Area, @ContactNo, 
        ISNULL(@OrderDate, GETDATE())
      )
    `;

    const request = pool.request();
    request.input("ProductName", sql.NVarChar, ProductName);
    request.input("ProductType", sql.NVarChar, ProductType);
    request.input("Weight", sql.NVarChar, Weight);
    request.input("Quantity", sql.Int, Quantity);
    request.input("Rate", sql.Decimal(10, 2), Rate);
    request.input("DeliveryCharge", sql.Decimal(10, 2), DeliveryCharge);
    request.input("CustomerName", sql.NVarChar, CustomerName);
    request.input("Address", sql.NVarChar, Address);
    request.input("Area", sql.NVarChar, Area || null);
    request.input("ContactNo", sql.VarChar, ContactNo || null);
    request.input("OrderDate", sql.Date, OrderDate || null);

    await request.query(query);

    res.status(200).json({ message: "Order added successfully!" });
  } catch (error) {
    console.error("❌ Error adding order:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.getAllorder = async(req,res) => {

  try{
    const pool = await poolPromise;
    if(!pool) {
      return res.status(500).json({message: "DataBase connection failed"});
    }

    const result = await pool.request().query("select * from orders order by OrderID desc");
    res.status(200).json(result.recordset);

  }
  catch(error){
    console.log(error,"error getting on all order");
    res.status(500).json({message : "Internal server error",error: error.message})

  }

}