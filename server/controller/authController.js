const { sql, poolPromise } = require('../utils/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


exports.signup = async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Required fields missing' });

  const pool = await poolPromise;

  const existingUser = await pool.request()
    .input('Username', sql.NVarChar, username)
    .query('SELECT * FROM Users WHERE Username=@Username');

  if (existingUser.recordset.length > 0)
    return res.status(400).json({ message: 'Username already exists!' });

  const hashedPassword = await bcrypt.hash(password, 10);

  await pool.request()
    .input('Username', sql.NVarChar, username)
    .input('Password', sql.NVarChar, hashedPassword)
    .input('Role', sql.NVarChar, role || 'customer')
    .query('INSERT INTO Users (Username, Password, Role) VALUES (@Username, @Password, @Role)');

  res.status(201).json({ message: 'User created successfully!' });
};

exports.login = async (req, res) => {
  try{
  const { username, password } = req.body;
  const pool = await poolPromise;

  const result = await pool.request()
    .input('Username', sql.NVarChar, username)
    .query('SELECT * FROM Users WHERE Username=@Username');

  if (result.recordset.length === 0) return res.status(400).json({ message: 'User not found' });

  const user = result.recordset[0];
  console.log("User object from DB:", user); // 👈 ye print karega sab fields

  const isMatch = await bcrypt.compare(password, user.Password);
  if (!isMatch) return res.status(400).json({ message: 'Invalid password' });

  const token = jwt.sign(
    { userId: user.UserID, role: user.Role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  res.json({ token,
    role: user.Role, 
      name: user.Username,
      userId : user.userId
 });
}catch(err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error, please try again later" });
}
};
