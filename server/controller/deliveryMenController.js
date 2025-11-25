const { sql, poolPromise } = require("../utils/db");

 
exports.getDeliveryMen = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM DeliveryMen");
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getDeliveryMenCash = async (req, res) => {
  try {
    const pool = await poolPromise;

   const query = `
SELECT 
    DM.DeliveryManID,
    DM.Name,
    DM.MobileNo,
    DM.Area,
    C.CurrentBalance AS TotalCash
FROM DeliveryMen DM
LEFT JOIN DeliveryMenCashBalance C
    ON DM.DeliveryManID = C.DeliveryManID
`;


    const result = await pool.request().query(query);

    return res.status(200).json({
      success: true,
      message: "Delivery men cash fetched successfully",
      data: result.recordset
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};
 
exports.addDeliveryMan = async (req, res) => {
  const { name } = req.body;

  if (!name) return res.status(400).json({ message: "Name is required" });

  try {
    const pool = await poolPromise;

    await pool
      .request()
      .input("Name", sql.NVarChar, name)
      .query("INSERT INTO DeliveryMen (Name) VALUES (@Name)");

    res.status(201).json({ message: "Delivery man added successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
