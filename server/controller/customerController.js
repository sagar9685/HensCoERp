const { sql, poolPromise } = require('../utils/db');

 
exports.addCustomer = async (req, res) => {
  try {
    console.log('recived body',req.body)
    const { CustomerName, Contact_No, Alternate_Phone, Area, Pincode, Address,GST_No } = req.body;

    if (!CustomerName || !Contact_No || !Area ||  !Address) {
      return res.status(400).json({ message: "Required fields are missing." });
    }

    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ message: "Database connection failed." });
    }

    const query = `
      INSERT INTO Customers (CustomerName, Contact_No, Alternate_Phone, Area, Pincode, Address, GST_No)
      VALUES (@CustomerName, @Contact_No, @Alternate_Phone, @Area, @Pincode, @Address, @GST_No)
    `;

    const request = pool.request();
    request.input("CustomerName", sql.NVarChar, CustomerName);
    request.input("Contact_No", sql.VarChar, Contact_No);
    request.input("Alternate_Phone", sql.VarChar, Alternate_Phone || null);
    request.input("Area", sql.NVarChar, Area);
    request.input("Pincode", sql.VarChar, Pincode || null);
    request.input("Address", sql.NVarChar, Address);
    request.input("GST_No", sql.VarChar, GST_No || null)

    await request.query(query);
    res.status(200).json({ message: "Customer added successfully!" });
  } catch (error) {
    console.error("Error adding customer:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


 
exports.getCustomers = async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ message: "Database connection failed." });
    }

    const result = await pool.request().query("SELECT * FROM Customers ORDER BY CustomerId DESC");
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


// Search customer by name (for suggestions)
exports.searchCustomersByName = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: "Name query too short" });
    }

    const pool = await poolPromise;
    const query = `
      SELECT TOP 10 * 
      FROM Customers 
      WHERE CustomerName LIKE '%' + @name + '%'
      ORDER BY CustomerId DESC
    `;

    const result = await pool.request()
      .input("name", sql.NVarChar, name)
      .query(query);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error searching customer:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


exports.updateCustomer = async(req,res) => {
  try{
    const {id} = req.params;

    const {
      CustomerName,
      Contact_No,
      Alternate_Phone,
      Area,
      Pincode,
      Address,
      GST_No
    } = req.body;

    if(!id) {
      return res.status(400).json({message : "Customer id is required"})
    }

    const pool = await poolPromise;
    if(!pool) {
      return res.status(500).json({message : "Db connection failed"})
    }

    const query = `
      UPDATE Customers
      SET
        CustomerName = @CustomerName,
        Contact_No = @Contact_No,
        Alternate_Phone = @Alternate_Phone,
        Area = @Area,
        Pincode = @Pincode,
        Address = @Address,
        GST_No = @GST_No
      WHERE CustomerId = @CustomerId
    `;

    const request = pool.request();
    request.input("CustomerId", sql.Int, id);
    request.input("CustomerName", sql.NVarChar,CustomerName);
     request.input("Contact_No", sql.VarChar, Contact_No);
    request.input("Alternate_Phone", sql.VarChar, Alternate_Phone || null);
    request.input("Area", sql.NVarChar, Area);
    request.input("Pincode", sql.VarChar, Pincode || null);
    request.input("Address", sql.NVarChar, Address);
    request.input("GST_No", sql.VarChar, GST_No || null);
    
    await request.query(query)

    res.status(200).json({
      message : "Customer updated successfully"
    })

  }catch (err) {
      console.log("Error updating customer:",err)
      res.status(500).json({
        message : "Internal server error"
      })
  }
}