const express = require("express");
const router = express.Router();
const axios = require("axios");

// Base URL configuration
const BASE_URL = process.env.BACKEND_URL || "http://localhost:5005";

router.post("/ask-ai", async (req, res) => {
  const { question } = req.body;
  
  if (!question || typeof question !== "string" || question.trim() === "") {
    return res.status(400).json({ 
      success: false, 
      message: "Please provide a valid question!" 
    });
  }

  const q = question.toLowerCase().trim();

  try {
    // ==============================================
    // 1. BUSINESS STATUS / OVERALL HEALTH
    // ==============================================
    if (
      q.includes("कैसा चल रहा") || 
      q.includes("business status") || 
      q.includes("हाल-चाल") ||
      q.includes("कैसा है") ||
      q.includes("how's business") ||
      q.includes("status report") ||
      q.includes("overview") ||
      q.includes("सारांश") ||
      q.includes("बिजनेस हेल्थ") ||
      q.includes("complete status")
    ) {
      try {
        // Check time for greeting
        const hour = new Date().getHours();
        const greeting = hour < 12 ? "सुप्रभात" : hour < 18 ? "नमस्ते" : "शुभ संध्या";
        
        // Parallel API calls
        const [ordersRes, salesRes, assignedRes, areasRes, productsRes, customersRes] = 
          await Promise.allSettled([
            axios.get(`${BASE_URL}/api/orders`),
            axios.get(`${BASE_URL}/api/analytics/month-sales`),
            axios.get(`${BASE_URL}/api/users/assigned-orders`),
            axios.get(`${BASE_URL}/api/analytics/best-area`),
            axios.get(`${BASE_URL}/api/analytics/product-sales`),
            axios.get(`${BASE_URL}/api/analytics/top-customers`)
          ]);

        // Extract data with fallbacks
        const totalOrders = ordersRes.status === 'fulfilled' ? ordersRes.value.data.length : 0;
        
        const totalSales = salesRes.status === 'fulfilled' ? 
          salesRes.value.data.reduce((sum, item) => sum + (item.TotalSales || 0), 0) : 0;
        
        const pendingDeliveries = assignedRes.status === 'fulfilled' ?
          assignedRes.value.data.filter(o => 
            o.OrderStatus !== "Complete" && o.OrderStatus !== "Cancel"
          ).length : 0;
        
        const topArea = areasRes.status === 'fulfilled' && areasRes.value.data[0] ? 
          areasRes.value.data[0] : { Area: "डेटा उपलब्ध नहीं", Revenue: 0 };
        
        const topProduct = productsRes.status === 'fulfilled' && productsRes.value.data[0] ?
          productsRes.value.data[0] : { ProductType: "डेटा उपलब्ध नहीं", TotalSales: 0 };
        
        const topCustomer = customersRes.status === 'fulfilled' && customersRes.value.data[0] ?
          customersRes.value.data[0] : { CustomerName: "डेटा उपलब्ध नहीं", TotalSpent: 0 };

        // Determine mood and comment based on business health
        let mood = "😊";
        let comment = "सब कुछ अच्छा चल रहा है!";
        
        if (pendingDeliveries > 10) {
          mood = "⚠️";
          comment = "कुछ डिलीवरी पेंडिंग हैं, ध्यान दें!";
        }
        
        if (totalSales < 10000) {
          mood = "📉";
          comment = "आज की कमाई सामान्य से कम है!";
        }

        // Create friendly response
        const answer = `${greeting} भाई साहब! ${mood}\n\n` +
          `📅 ${new Date().toLocaleDateString('hi-IN')}\n` +
          `📊 कुल ऑर्डर: ${totalOrders}\n` +
          `💰 कुल कमाई: ₹${totalSales.toLocaleString()}\n` +
          `📦 पेंडिंग डिलीवरी: ${pendingDeliveries}\n` +
          `📍 टॉप एरिया: ${topArea.Area} (₹${topArea.Revenue?.toLocaleString() || '0'})\n` +
          `🏆 टॉप प्रोडक्ट: ${topProduct.ProductType} (₹${topProduct.TotalSales?.toLocaleString() || '0'})\n` +
          `👥 टॉप कस्टमर: ${topCustomer.CustomerName} (₹${topCustomer.TotalSpent?.toLocaleString() || '0'})\n\n` +
          `${comment}`;

        return res.json({
          success: true,
          answer: answer,
          data: {
            totalOrders,
            totalSales,
            pendingDeliveries,
            topArea,
            topProduct,
            topCustomer
          }
        });

      } catch (error) {
        console.error("Business status error:", error);
        return res.json({
          success: true,
          answer: "भाई, डेटा फ़ेच करने में थोड़ी दिक्कत आ रही है। थोड़ी देर में फिर से पूछ लेना! 🤖"
        });
      }
    }

    // ==============================================
    // 2. ORDERS ANALYSIS
    // ==============================================
    if (
      q.includes("kitne orders") || 
      q.includes("total orders") || 
      q.includes("कितने ऑर्डर") ||
      q.includes("orders count") ||
      q.includes("ऑर्डर संख्या") ||
      q.includes("orders ki sankhya") ||
      q.includes("how many orders") ||
      q.includes("कुल ऑर्डर")
    ) {
      const response = await axios.get(`${BASE_URL}/api/orders`);
      const orders = response.data;
      return res.json({ 
        success: true, 
        answer: `📊 Total ${orders.length} orders available in the system.`,
        data: { totalOrders: orders.length }
      });
    }

    // ==============================================
    // 3. TOP CUSTOMERS
    // ==============================================
    if (
      q.includes("top customer") || 
      q.includes("best customers") || 
      q.includes("सबसे ज्यादा ऑर्डर किसने दिए") ||
      q.includes("सबसे अच्छे ग्राहक") ||
      q.includes("highest spending") ||
      q.includes("top 3 customers") ||
      q.includes("top 5 customers") ||
      q.includes("ग्राहक रैंकिंग") ||
      q.includes("customer ranking") ||
      q.includes("who spends most") ||
      q.includes("कौन सबसे ज्यादा खर्च करता है")
    ) {
      const response = await axios.get(`${BASE_URL}/api/analytics/top-customers`);
      const topCustomers = response.data.slice(0, 5); // Top 5
      
      if (topCustomers.length === 0) {
        return res.json({ 
          success: true, 
          answer: "No customer data available at the moment." 
        });
      }
      
      const answer = topCustomers.map((cust, index) => 
        `${index + 1}. ${cust.CustomerName}: ₹${cust.TotalSpent.toLocaleString()}`
      ).join("\n");
      
      return res.json({ 
        success: true, 
        answer: `🏆 Top Customers by Revenue:\n${answer}`,
        data: topCustomers
      });
    }

    // ==============================================
    // 4. STOCK AVAILABLE
    // ==============================================
    if (
      q.includes("stock") || 
      q.includes("available stock") || 
      q.includes("स्टॉक") ||
      q.includes("स्टॉक की स्थिति") ||
      q.includes("inventory status") ||
      q.includes("kitna stock hai") ||
      q.includes("stock availability") ||
      q.includes("current stock") ||
      q.includes("माल कितना बचा है") ||
      q.includes("stock ki jankari") ||
      q.includes("what's in stock") ||
      q.includes("inventory count")
    ) {
      const response = await axios.get(`${BASE_URL}/api/stock/avilable`);
      const stock = response.data;
      
      if (stock.length === 0) {
        return res.json({ 
          success: true, 
          answer: "📦 No stock data available at the moment." 
        });
      }
      
      const stockList = stock.map(s => `• ${s.item_name || s.ProductType}: ${s.available_stock || s.AvailableQty} units`).join("\n");
      
      return res.json({ 
        success: true, 
        answer: `📦 Available Stock:\n${stockList}`,
        data: stock
      });
    }

    // ==============================================
    // 5. TOTAL SALES REVENUE
    // ==============================================
    if (
      q.includes("total sales") || 
      q.includes("revenue") || 
      q.includes("कुल कमाई") ||
      q.includes("total revenue") ||
      q.includes("sales amount") ||
      q.includes("कुल बिक्री") ||
      q.includes("business revenue") ||
      q.includes("turnover") ||
      q.includes("kitna revenue hai") ||
      q.includes("कितना टर्नओवर हुआ") ||
      q.includes("sales summary") ||
      q.includes("revenue kitna hai")
    ) {
      const response = await axios.get(`${BASE_URL}/api/analytics/month-sales`);
      const sales = response.data;
      
      const totalSales = sales.reduce((sum, item) => sum + (item.TotalSales || 0), 0);
      
      return res.json({ 
        success: true, 
        answer: `💰 Total Sales Revenue: ₹${totalSales.toLocaleString()}`,
        data: { totalRevenue: totalSales }
      });
    }

    // ==============================================
    // 6. PENDING DELIVERIES
    // ==============================================
    if (
      q.includes("pending") || 
      q.includes("delivery pending") || 
      q.includes("लंबित डिलीवरी") ||
      q.includes("pending deliveries") ||
      q.includes("undelivered orders") ||
      q.includes("कितनी डिलीवरी बाकी है") ||
      q.includes("delivery status") ||
      q.includes("how many pending") ||
      q.includes("delivery progress") ||
      q.includes("डिलीवरी की स्थिति") ||
      q.includes("कौन सी डिलीवरी बाकी है")
    ) {
      const response = await axios.get(`${BASE_URL}/api/users/assigned-orders`);
      const allOrders = response.data;
      
      const pending = allOrders.filter(o => 
        o.OrderStatus !== "Complete" && o.OrderStatus !== "Cancel"
      ).length;
      
      const completed = allOrders.filter(o => o.OrderStatus === "Complete").length;
      const cancelled = allOrders.filter(o => o.OrderStatus === "Cancel").length;
      
      return res.json({ 
        success: true, 
        answer: `📦 Delivery Status:\n• Pending: ${pending}\n• Completed: ${completed}\n• Cancelled: ${cancelled}`,
        data: { 
          pendingDeliveries: pending,
          completedDeliveries: completed,
          cancelledDeliveries: cancelled,
          totalDeliveries: allOrders.length
        }
      });
    }

    // ==============================================
    // 7. AREA-WISE PERFORMANCE
    // ==============================================
    if (
      q.includes("area") || 
      q.includes("best area") || 
      q.includes("क्षेत्र") ||
      q.includes("top area") ||
      q.includes("area wise performance") ||
      q.includes("which area has highest sales") ||
      q.includes("कौन सा क्षेत्र सबसे अच्छा है") ||
      q.includes("area ranking") ||
      q.includes("best sales area") ||
      q.includes("क्षेत्रवार प्रदर्शन") ||
      q.includes("leading area") ||
      q.includes("सबसे अच्छा इलाका")
    ) {
      const response = await axios.get(`${BASE_URL}/api/analytics/best-area`);
      const areas = response.data;
      
      if (areas.length === 0) {
        return res.json({ 
          success: true, 
          answer: "No area data available." 
        });
      }
      
      // Get top 3 areas
      const topAreas = areas.slice(0, 3);
      const areaList = topAreas.map((area, index) => 
        `${index + 1}. ${area.Area}: ₹${area.Revenue.toLocaleString()}`
      ).join("\n");
      
      return res.json({ 
        success: true, 
        answer: `📍 Top Performing Areas:\n${areaList}`,
        data: topAreas
      });
    }

    // ==============================================
    // 8. MONTHLY SALES
    // ==============================================
    if (
      q.includes("this month") || 
      q.includes("current month") || 
      q.includes("इस महीने") ||
      q.includes("monthly performance") ||
      q.includes("monthly summary") ||
      q.includes("महीने की रिपोर्ट") ||
      q.includes("month wise sales") ||
      q.includes("इस महीने का प्रदर्शन") ||
      q.includes("how's this month") ||
      q.includes("monthly business status") ||
      q.includes("महीने का हिसाब") ||
      q.includes("monthly overview")
    ) {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const monthNames = ["January", "February", "March", "April", "May", "June", 
                         "July", "August", "September", "October", "November", "December"];
      
      try {
        const response = await axios.get(
          `${BASE_URL}/api/reports/monthly?year=${currentYear}&month=${currentMonth}`
        );
        
        const summary = response.data.summary;
        if (summary) {
          return res.json({ 
            success: true, 
            answer: `📅 ${monthNames[currentMonth-1]} ${currentYear} Performance:\n• Orders: ${summary.TotalOrders}\n• Sales: ₹${summary.TotalSales.toLocaleString()}\n• Received: ₹${summary.TotalReceived.toLocaleString()}\n• Outstanding: ₹${summary.TotalOutstanding.toLocaleString()}`,
            data: summary
          });
        }
      } catch (error) {
        // If monthly report fails, try analytics
        const response = await axios.get(`${BASE_URL}/api/analytics/month-sales`);
        const monthData = response.data.find(m => m.OrderMonth === currentMonth);
        
        if (monthData) {
          return res.json({ 
            success: true, 
            answer: `📅 ${monthNames[currentMonth-1]} Sales: ₹${monthData.TotalSales.toLocaleString()}`,
            data: monthData
          });
        }
      }
    }

    // ==============================================
    // 9. TODAY'S REPORT
    // ==============================================
    if (
      q.includes("today") || 
      q.includes("आज") ||
      q.includes("today's report") ||
      q.includes("आज की रिपोर्ट") ||
      q.includes("today's sales") ||
      q.includes("daily summary") ||
      q.includes("aaj ka performance") ||
      q.includes("आज का बिजनेस") ||
      q.includes("today's business") ||
      q.includes("daily sales report") ||
      q.includes("aaj ki kamai") ||
      q.includes("today's status")
    ) {
      const today = new Date().toISOString().split('T')[0];
      const todayHindi = new Date().toLocaleDateString('hi-IN');
      
      try {
        const response = await axios.get(
          `${BASE_URL}/api/reports/daily?date=${today}`
        );
        
        const data = response.data;
        if (data.summary) {
          return res.json({ 
            success: true, 
            answer: `📊 Today's Report (${todayHindi}):\n• Sales: ₹${data.summary.totalSaleAmount.toLocaleString()}\n• Received: ₹${data.summary.totalReceived.toLocaleString()}\n• Outstanding: ₹${data.summary.totalOutstanding.toLocaleString()}`,
            data: data
          });
        } else {
          return res.json({
            success: true,
            answer: `📊 आज (${todayHindi}) के लिए कोई डेटा उपलब्ध नहीं है।`
          });
        }
      } catch (error) {
        return res.json({
          success: true,
          answer: `📊 आज (${todayHindi}) के लिए रिपोर्ट उपलब्ध नहीं है।`
        });
      }
    }

    // ==============================================
    // 10. PRODUCT PERFORMANCE
    // ==============================================
    if (
      q.includes("product") || 
      q.includes("best product") || 
      q.includes("उत्पाद") ||
      q.includes("best selling product") ||
      q.includes("top product") ||
      q.includes("सबसे ज्यादा बिकने वाला उत्पाद") ||
      q.includes("which product sells most") ||
      q.includes("product performance") ||
      q.includes("उत्पाद प्रदर्शन") ||
      q.includes("most popular product") ||
      q.includes("highest selling item") ||
      q.includes("कौन सा प्रोडक्ट सबसे अच्छा चल रहा है") ||
      q.includes("best product sales")
    ) {
      const response = await axios.get(`${BASE_URL}/api/analytics/product-sales`);
      const products = response.data;
      
      if (products.length === 0) {
        return res.json({ 
          success: true, 
          answer: "No product sales data available." 
        });
      }
      
      // Get top 3 products
      const topProducts = products.slice(0, 3);
      const productList = topProducts.map((prod, index) => 
        `${index + 1}. ${prod.ProductType}: ₹${prod.TotalSales.toLocaleString()}`
      ).join("\n");
      
      return res.json({ 
        success: true, 
        answer: `🏆 Top Selling Products:\n${productList}`,
        data: topProducts
      });
    }

    // ==============================================
    // 11. WEEKLY REPORT
    // ==============================================
    if (
      q.includes("this week") || 
      q.includes("weekly") || 
      q.includes("सप्ताह") ||
      q.includes("weekly report") ||
      q.includes("सप्ताह की रिपोर्ट") ||
      q.includes("week wise sales") ||
      q.includes("हफ्ते का हिसाब") ||
      q.includes("current week status") ||
      q.includes("weekly summary") ||
      q.includes("सप्ताहिक विवरण") ||
      q.includes("how's this week") ||
      q.includes("weekly business")
    ) {
      const today = new Date();
      const currentWeek = Math.ceil(today.getDate() / 7);
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      
      try {
        const response = await axios.get(
          `${BASE_URL}/api/reports/weekly?year=${currentYear}&month=${currentMonth}&week=${currentWeek}`
        );
        
        const data = response.data;
        if (data.data && data.data.length > 0) {
          const totalSales = data.data.reduce((sum, item) => sum + (item.TotalSales || 0), 0);
          const totalOrders = data.data.reduce((sum, item) => sum + (item.Orders || 0), 0);
          
          return res.json({ 
            success: true, 
            answer: `📅 Week ${currentWeek} Report:\n• Orders: ${totalOrders}\n• Sales: ₹${totalSales.toLocaleString()}\n• From: Day ${data.from}\n• To: Day ${data.to}`,
            data: data
          });
        } else {
          return res.json({
            success: true,
            answer: `📅 Week ${currentWeek} के लिए कोई डेटा उपलब्ध नहीं है।`
          });
        }
      } catch (error) {
        return res.json({
          success: true,
          answer: `📅 Week ${currentWeek} के लिए रिपोर्ट उपलब्ध नहीं है।`
        });
      }
    }

    // ==============================================
    // 12. COMPARATIVE ANALYSIS
    // ==============================================
    if (
      q.includes("compare") || 
      q.includes("तुलना") || 
      q.includes("comparison") ||
      q.includes("which is better") ||
      q.includes("क्या बेहतर है") ||
      q.includes("top vs bottom") ||
      q.includes("comparison of") ||
      q.includes("तुलना करो")
    ) {
      try {
        // Fetch data for comparison
        const [areasRes, productsRes, customersRes] = await Promise.allSettled([
          axios.get(`${BASE_URL}/api/analytics/best-area`),
          axios.get(`${BASE_URL}/api/analytics/product-sales`),
          axios.get(`${BASE_URL}/api/analytics/top-customers`)
        ]);

        const areas = areasRes.status === 'fulfilled' ? areasRes.value.data.slice(0, 2) : [];
        const products = productsRes.status === 'fulfilled' ? productsRes.value.data.slice(0, 2) : [];
        
        let comparisonText = "";
        
        if (areas.length >= 2) {
          comparisonText += `📍 Area Comparison:\n• ${areas[0].Area}: ₹${areas[0].Revenue.toLocaleString()}\n• ${areas[1].Area}: ₹${areas[1].Revenue.toLocaleString()}\n\n`;
        }
        
        if (products.length >= 2) {
          comparisonText += `🏆 Product Comparison:\n• ${products[0].ProductType}: ₹${products[0].TotalSales.toLocaleString()}\n• ${products[1].ProductType}: ₹${products[1].TotalSales.toLocaleString()}\n\n`;
        }
        
        if (comparisonText) {
          return res.json({ 
            success: true, 
            answer: `📊 Comparative Analysis:\n\n${comparisonText}`,
            data: { areas, products }
          });
        } else {
          return res.json({
            success: true,
            answer: "Comparative data not available for analysis."
          });
        }
        
      } catch (error) {
        return res.json({
          success: true,
          answer: "तुलना करने में समस्या आ रही है।"
        });
      }
    }

    // ==============================================
    // 13. PROBLEM AREAS / ALERTS
    // ==============================================
    if (
      q.includes("problem") || 
      q.includes("issue") || 
      q.includes("समस्या") ||
      q.includes("what's wrong") ||
      q.includes("क्या गलत है") ||
      q.includes("needs improvement") ||
      q.includes("weaknesses") ||
      q.includes("कमजोरियाँ") ||
      q.includes("where to focus") ||
      q.includes("कहाँ ध्यान दें") ||
      q.includes("urgent") ||
      q.includes("तुरंत ध्यान") ||
      q.includes("alert") ||
      q.includes("आपातकालीन")
    ) {
      try {
        const [stockRes, assignedRes, salesRes] = await Promise.allSettled([
          axios.get(`${BASE_URL}/api/stock/avilable`),
          axios.get(`${BASE_URL}/api/users/assigned-orders`),
          axios.get(`${BASE_URL}/api/analytics/month-sales`)
        ]);

        let alerts = [];
        
        // Check low stock
        if (stockRes.status === 'fulfilled') {
          const lowStock = stockRes.value.data.filter(item => 
            (item.available_stock || item.AvailableQty) < 10
          );
          if (lowStock.length > 0) {
            alerts.push(`📉 Low Stock: ${lowStock.map(item => item.item_name || item.ProductType).join(', ')}`);
          }
        }
        
        // Check pending deliveries
        if (assignedRes.status === 'fulfilled') {
          const pending = assignedRes.value.data.filter(o => 
            o.OrderStatus !== "Complete" && o.OrderStatus !== "Cancel"
          ).length;
          if (pending > 5) {
            alerts.push(`🚚 High Pending Deliveries: ${pending} orders pending`);
          }
        }
        
        // Check sales performance
        if (salesRes.status === 'fulfilled') {
          const currentMonth = new Date().getMonth() + 1;
          const currentSales = salesRes.value.data.find(m => m.OrderMonth === currentMonth);
          if (currentSales && currentSales.TotalSales < 50000) {
            alerts.push(`💰 Low Sales: Current month sales below ₹50,000`);
          }
        }
        
        if (alerts.length > 0) {
          return res.json({ 
            success: true, 
            answer: `⚠️ Attention Required:\n\n${alerts.join('\n')}\n\nPlease address these issues promptly.`,
            data: { alerts }
          });
        } else {
          return res.json({
            success: true,
            answer: "✅ All systems are running smoothly. No major issues detected!",
            data: { status: "healthy" }
          });
        }
        
      } catch (error) {
        return res.json({
          success: true,
          answer: "समस्याओं का पता लगाने में दिक्कत आ रही है।"
        });
      }
    }

    // ==============================================
    // 14. HELP / GUIDANCE
    // ==============================================
    if (
      q.includes("help") || 
      q.includes("what can") || 
      q.includes("मदद") ||
      q.includes("सहायता") ||
      q.includes("how to use") ||
      q.includes("available commands") ||
      q.includes("features") ||
      q.includes("क्या-क्या पूछ सकता हूँ") ||
      q.includes("तुम क्या-क्या बता सकते हो") ||
      q.includes("सलाह") ||
      q.includes("advice") ||
      q.includes("suggestions") ||
      q.includes("टिप्स")
    ) {
      const helpText = `🤖 **I Can Help You With:**\n\n` +
        `📊 **Orders & Customers:**\n` +
        `• Total orders count\n` +
        `• Top customers by spending\n` +
        `• Customer frequency analysis\n\n` +
        
        `📦 **Stock & Inventory:**\n` +
        `• Available stock status\n` +
        `• Low stock alerts\n` +
        `• Inventory levels\n\n` +
        
        `💰 **Sales & Revenue:**\n` +
        `• Total sales revenue\n` +
        `• Monthly/Weekly/Daily sales\n` +
        `• Revenue trends\n\n` +
        
        `🚚 **Deliveries:**\n` +
        `• Pending deliveries\n` +
        `• Delivery status\n` +
        `• Completion rates\n\n` +
        
        `📍 **Area Analysis:**\n` +
        `• Best performing areas\n` +
        `• Area-wise sales\n` +
        `• Regional performance\n\n` +
        
        `🏆 **Product Performance:**\n` +
        `• Best selling products\n` +
        `• Product-wise sales\n` +
        `• Inventory turnover\n\n` +
        
        `📈 **Reports:**\n` +
        `• Today's report\n` +
        `• Weekly summary\n` +
        `• Monthly performance\n\n` +
        
        `⚠️ **Alerts & Issues:**\n` +
        `• Problem areas\n` +
        `• Urgent matters\n` +
        `• Improvement suggestions\n\n` +
        
        `💡 **Tips:**\n` +
        `• Ask in Hindi or English\n` +
        `• Be specific with timeframes\n` +
        `• Use comparative questions\n\n` +
        
        `**Examples:**\n` +
        `• "आज कितने ऑर्डर आए?"\n` +
        `• "स्टॉक कितना है?"\n` +
        `• "कौन सा एरिया सबसे अच्छा है?"\n` +
        `• "पेंडिंग डिलीवरी कितनी हैं?"\n\n` +
        
        `Just ask me anything! 😊`;

      return res.json({
        success: true,
        answer: helpText,
        data: { 
          categories: [
            "Orders & Customers",
            "Stock & Inventory", 
            "Sales & Revenue",
            "Deliveries",
            "Area Analysis",
            "Product Performance",
            "Reports",
            "Alerts & Issues"
          ]
        }
      });
    }

    // ==============================================
    // 15. DETAILED BUSINESS REPORT
    // ==============================================
    if (
      q.includes("detailed") || 
      q.includes("विस्तृत") || 
      q.includes("complete report") ||
      q.includes("full details") ||
      q.includes("सभी विवरण") ||
      q.includes("everything") ||
      q.includes("सब कुछ बताओ") ||
      q.includes("पूरी जानकारी") ||
      q.includes("comprehensive report") ||
      q.includes("थोड़ा विस्तार से")
    ) {
      try {
        const [ordersRes, stockRes, salesRes, assignedRes, areasRes, productsRes, customersRes] = 
          await Promise.allSettled([
            axios.get(`${BASE_URL}/api/orders`),
            axios.get(`${BASE_URL}/api/stock/avilable`),
            axios.get(`${BASE_URL}/api/analytics/month-sales`),
            axios.get(`${BASE_URL}/api/users/assigned-orders`),
            axios.get(`${BASE_URL}/api/analytics/best-area`),
            axios.get(`${BASE_URL}/api/analytics/product-sales`),
            axios.get(`${BASE_URL}/api/analytics/top-customers`)
          ]);

        const totalOrders = ordersRes.status === 'fulfilled' ? ordersRes.value.data.length : 0;
        const stockCount = stockRes.status === 'fulfilled' ? stockRes.value.data.length : 0;
        
        const totalSales = salesRes.status === 'fulfilled' ? 
          salesRes.value.data.reduce((sum, item) => sum + (item.TotalSales || 0), 0) : 0;
        
        const pendingDeliveries = assignedRes.status === 'fulfilled' ?
          assignedRes.value.data.filter(o => 
            o.OrderStatus !== "Complete" && o.OrderStatus !== "Cancel"
          ).length : 0;
        
        const topAreas = areasRes.status === 'fulfilled' ? areasRes.value.data.slice(0, 3) : [];
        const topProducts = productsRes.status === 'fulfilled' ? productsRes.value.data.slice(0, 3) : [];
        const topCustomers = customersRes.status === 'fulfilled' ? customersRes.value.data.slice(0, 3) : [];

        const detailedReport = `📋 **COMPREHENSIVE BUSINESS REPORT**\n\n` +
          `📊 **ORDERS SUMMARY:**\n` +
          `• Total Orders: ${totalOrders}\n\n` +
          
          `💰 **FINANCIAL SUMMARY:**\n` +
          `• Total Sales Revenue: ₹${totalSales.toLocaleString()}\n\n` +
          
          `📦 **INVENTORY SUMMARY:**\n` +
          `• Stock Items: ${stockCount}\n` +
          `• Available Products: ${stockRes.status === 'fulfilled' ? 
            stockRes.value.data.map(s => s.item_name || s.ProductType).join(', ') : 'N/A'}\n\n` +
          
          `🚚 **DELIVERY STATUS:**\n` +
          `• Pending Deliveries: ${pendingDeliveries}\n\n` +
          
          `📍 **TOP PERFORMING AREAS:**\n` +
          `${topAreas.map((area, i) => `${i+1}. ${area.Area}: ₹${area.Revenue?.toLocaleString() || '0'}`).join('\n') || 'No data'}\n\n` +
          
          `🏆 **TOP SELLING PRODUCTS:**\n` +
          `${topProducts.map((prod, i) => `${i+1}. ${prod.ProductType}: ₹${prod.TotalSales?.toLocaleString() || '0'}`).join('\n') || 'No data'}\n\n` +
          
          `👥 **TOP CUSTOMERS:**\n` +
          `${topCustomers.map((cust, i) => `${i+1}. ${cust.CustomerName}: ₹${cust.TotalSpent?.toLocaleString() || '0'}`).join('\n') || 'No data'}\n\n` +
          
          `📅 **Report Generated:** ${new Date().toLocaleString('hi-IN')}\n` +
          `🤖 **Generated by:** Business AI Assistant`;

        return res.json({
          success: true,
          answer: detailedReport,
          data: {
            totalOrders,
            totalSales,
            stockCount,
            pendingDeliveries,
            topAreas,
            topProducts,
            topCustomers
          }
        });

      } catch (error) {
        return res.json({
          success: true,
          answer: "विस्तृत रिपोर्ट तैयार करने में समस्या आ रही है।"
        });
      }
    }

    // ==============================================
    // FALLBACK: Generic response
    // ==============================================
    const fallbackResponses = [
      "I understand you're asking about business data. Could you be more specific?",
      "मैं आपके बिजनेस डेटा के बारे में बता सकता हूँ। कृपया विशेष रूप से पूछें।",
      "You can ask me about orders, stock, sales, deliveries, areas, products, or customers.",
      "आप मुझसे ऑर्डर, स्टॉक, बिक्री, डिलीवरी, इलाके, उत्पाद, या ग्राहकों के बारे में पूछ सकते हैं।",
      "Try asking: 'How many orders today?' or 'What's the stock status?'",
      "पूछने का प्रयास करें: 'आज कितने ऑर्डर?' या 'स्टॉक कितना है?'"
    ];
    
    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    return res.json({ 
      success: true,
      answer: randomResponse
    });

  } catch (err) {
    console.error("AI Error:", err.message);
    
    // Handle specific error types
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        success: false, 
        message: "Backend service is unavailable. Please try again later." 
      });
    }
    
    if (err.response?.status === 404) {
      return res.status(404).json({ 
        success: false, 
        message: "Requested data endpoint not found." 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: "Sorry, I encountered an error while processing your request. Please try again.",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Additional endpoint for quick stats summary
router.get("/quick-stats", async (req, res) => {
  try {
    // Fetch multiple endpoints in parallel
    const [ordersRes, stockRes, salesRes, assignedRes] = await Promise.allSettled([
      axios.get(`${BASE_URL}/api/orders`),
      axios.get(`${BASE_URL}/api/stock/avilable`),
      axios.get(`${BASE_URL}/api/analytics/month-sales`),
      axios.get(`${BASE_URL}/api/users/assigned-orders`)
    ]);

    const stats = {
      totalOrders: ordersRes.status === 'fulfilled' ? ordersRes.value.data.length : 0,
      stockItems: stockRes.status === 'fulfilled' ? stockRes.value.data.length : 0,
      totalSales: salesRes.status === 'fulfilled' ? 
        salesRes.value.data.reduce((sum, item) => sum + (item.TotalSales || 0), 0) : 0,
      pendingDeliveries: assignedRes.status === 'fulfilled' ? 
        assignedRes.value.data.filter(o => 
          o.OrderStatus !== "Complete" && o.OrderStatus !== "Cancel"
        ).length : 0,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      message: "Quick stats fetched successfully",
      data: stats
    });

  } catch (err) {
    console.error("Quick Stats Error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch quick stats" 
    });
  }
});

// New endpoint for conversation history
router.get("/conversation-history", async (req, res) => {
  // This would typically fetch from a database
  // For now, returning sample data
  res.json({
    success: true,
    data: {
      totalConversations: 0,
      recentQueries: [],
      popularCategories: []
    }
  });
});

module.exports = router;