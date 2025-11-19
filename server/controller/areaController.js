const { sql, poolPromise } = require("../utils/db");

exports.getAreaName = async(req,res) => {
    try{
        const pool = await poolPromise;
        const result = await pool.request().query("select * from Area");
        res.status(200).json(result.recordset);
    }catch(err) {
        res.status(500).json({message : err.message})
    }
}