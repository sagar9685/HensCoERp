const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const customerRoutes = require('./routes/customerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const rateRoutes = require('./routes/rateRoutes');
const authRoutes = require('./routes/authRoutes');
const assignedOrderRoutes = require('./routes/assignedOrderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const deliveryMenRoutes = require('./routes/deliveryMenRoutes');
const areaRoutes = require('./routes/areaRoutes');
const purchaseRoutes = require('./routes/purchaseOrderRoutes');
const stockRoutes = require('./routes/stockRoutes');
const customerAnalysisRoutes = require('./routes/customerAnalysisRoutes');
dotenv.config();
const app = express();

/* 🔓 Allow ALL origins */
app.use(cors());

app.use(express.json());

/* Routes */
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/purchaseorders', purchaseRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api', areaRoutes);
app.use('/api/users', authRoutes);
app.use('/api/users', paymentRoutes);
app.use('/api/users', deliveryMenRoutes);
app.use('/api/users', assignedOrderRoutes);
app.use('/api/customer-analysis', customerAnalysisRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
