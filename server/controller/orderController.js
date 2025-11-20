const { sql, poolPromise } = require('../utils/db');

exports.addOrder = async (req, res) => {
  try {
    const {
      CustomerName,
      Address,
      Area,
      ContactNo,
      DeliveryCharge,
      OrderDate,
      Items
    } = req.body;

    if (!Items || !Array.isArray(Items) || Items.length === 0) {
      return res.status(400).json({ message: "Order must contain at least one item." });
    }

    const pool = await poolPromise;

    // Insert into Orders table
    const orderQuery = `
      INSERT INTO OrdersTemp (CustomerName, Address, Area, ContactNo, DeliveryCharge, OrderDate)
      OUTPUT INSERTED.OrderID
      VALUES (@CustomerName, @Address, @Area, @ContactNo, @DeliveryCharge, @OrderDate);
    `;

    const orderRequest = pool.request();
    orderRequest.input("CustomerName", sql.NVarChar, CustomerName);
    orderRequest.input("Address", sql.NVarChar, Address);
    orderRequest.input("Area", sql.NVarChar, Area);
    orderRequest.input("ContactNo", sql.VarChar, ContactNo);
    orderRequest.input("DeliveryCharge", sql.Decimal(10, 2), DeliveryCharge);
    orderRequest.input("OrderDate", sql.Date, OrderDate);

    const result = await orderRequest.query(orderQuery);
    const orderId = result.recordset[0].OrderID;

    // Insert multiple items
    for (let item of Items) {
      const itemQuery = `
        INSERT INTO OrderItems (OrderID, ProductName, ProductType, Weight, Quantity, Rate, Total)
        VALUES (@OrderID, @ProductName, @ProductType, @Weight, @Quantity, @Rate, @Total)
      `;

      const itemReq = pool.request();
      itemReq.input("OrderID", sql.Int, orderId);
      itemReq.input("ProductName", sql.NVarChar, item.ProductName);
      itemReq.input("ProductType", sql.NVarChar, item.ProductType);
      itemReq.input("Weight", sql.NVarChar, item.Weight);
      itemReq.input("Quantity", sql.Int, item.Quantity);
      itemReq.input("Rate", sql.Decimal(10, 2), item.Rate);
      itemReq.input("Total", sql.Decimal(10, 2), item.Quantity * item.Rate);

      await itemReq.query(itemQuery);
    }

    res.status(200).json({
      message: "Order added successfully with multiple items!",
      orderId
    });

  } catch (error) {
    console.error("❌ Error adding order:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

exports.getAllorder = async(req,res) => {

  try{
    const pool = await poolPromise;
    if(!pool) {
      return res.status(500).json({message: "DataBase connection failed"});
    }

    const result = await pool.request().query("select * from orderstemp order by OrderID desc");
    res.status(200).json(result.recordset);

  }
  catch(error){
    console.log(error,"error getting on all order");
    res.status(500).json({message : "Internal server error",error: error.message})

  }

}