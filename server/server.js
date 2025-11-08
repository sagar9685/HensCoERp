const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const customerRoutes = require('./routes/customerRoutes')
const orderRoutes = require('./routes/orderRoutes')
const productRoutes = require('./routes/productRoutes')

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());


const allowedOrigins = [
  "http://localhost:5173"    // local frontend
];


app.use('/api/customers',customerRoutes)
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
