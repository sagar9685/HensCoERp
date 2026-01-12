const express = require("express");
const router = express.Router();
const analyticsController = require("../controller/analyticsController");

router.get("/area-orders", analyticsController.areaWiseOrders);
router.get("/area-sales", analyticsController.areaWiseSales);
router.get("/area-customer", analyticsController.areaCustomerAnalysis);
router.get("/month-orders", analyticsController.monthWiseOrders);
router.get("/month-sales", analyticsController.monthWiseSales);
router.get("/customer-best-month", analyticsController.customerBestMonth);
router.get("/product-sales", analyticsController.productTypeSales);
router.get("/top-customers", analyticsController.topCustomersByRevenue);
router.get("/best-area", analyticsController.bestAreaByRevenue);
router.get("/monthly-growth", analyticsController.monthlySalesGrowth);

module.exports = router;
