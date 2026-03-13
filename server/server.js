const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const compression = require("compression");
const http = require("http");
const { Server } = require("socket.io");

const customerRoutes = require("./routes/customerRoutes");
const orderRoutes = require("./routes/orderRoutes");
const productRoutes = require("./routes/productRoutes");
const rateRoutes = require("./routes/rateRoutes");
const authRoutes = require("./routes/authRoutes");
const assignedOrderRoutes = require("./routes/assignedOrderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const deliveryMenRoutes = require("./routes/deliveryMenRoutes");
const areaRoutes = require("./routes/areaRoutes");
const purchaseRoutes = require("./routes/purchaseOrderRoutes");
const stockRoutes = require("./routes/stockRoutes");
const customerAnalysisRoutes = require("./routes/customerAnalysisRoutes");
const reportRoutes = require("./routes/reportRoutes");
const analyticsRoutes = require("./routes/analyticRoutes");

const productionRoutes = require("./routes/productionRoutes");
const demoInvoice = require("./routes/demoInvoiceRoutes");
const aiRoutes = require("./routes/aiRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

dotenv.config();
const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Make io accessible in controllers
app.set("io", io);

/* 🔓 Allow ALL origins */
app.use(cors());
app.use(compression());

app.use(express.json());

/* Routes */
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/rates", rateRoutes);
app.use("/api/purchaseorders", purchaseRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api", areaRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reports", reportRoutes);

app.use("/api", demoInvoice);

app.use("/api/users", authRoutes);
app.use("/api/users", paymentRoutes);
app.use("/api/users", deliveryMenRoutes);
app.use("/api/users", assignedOrderRoutes);
app.use("/api/customer-analysis", customerAnalysisRoutes);

app.use("/api/production", productionRoutes);

app.use("/api", aiRoutes);
app.use("/api", notificationRoutes);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

/* Server listen */
const PORT = process.env.PORT || 5005;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
