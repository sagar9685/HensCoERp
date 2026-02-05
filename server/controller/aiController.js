// controllers/aiController.js
const { poolPromise } = require("../utils/db");

// Your personal branding
const MY_NAME = "Sagar";

// Helper function to detect language
const detectLanguage = (text) => {
  const hindiChars = /[\u0900-\u097F]/;
  return hindiChars.test(text) ? 'hindi' : 'english';
};

// Helper functions for personalized responses
const getPersonalizedGreeting = (language) => {
  const hour = new Date().getHours();
  let timeGreeting = "";
  
  if (language === 'hindi') {
    if (hour < 12) timeGreeting = "सुप्रभात";
    else if (hour < 18) timeGreeting = "नमस्ते";
    else timeGreeting = "शुभ संध्या";
    
    const hindiGreetings = [
      `${timeGreeting} ${MY_NAME} जी!`,
      `प्रणाम ${MY_NAME} जी!`,
      `स्वागत है ${MY_NAME} जी!`
    ];
    return hindiGreetings[Math.floor(Math.random() * hindiGreetings.length)];
  } else {
    if (hour < 12) timeGreeting = "Good morning";
    else if (hour < 18) timeGreeting = "Good afternoon";
    else timeGreeting = "Good evening";
    
    const englishGreetings = [
      `${timeGreeting} ${MY_NAME} ji!`,
      `Hello ${MY_NAME} sir!`,
      `Welcome ${MY_NAME} ji!`
    ];
    return englishGreetings[Math.floor(Math.random() * englishGreetings.length)];
  }
};

const getSignature = (language) => {
  if (language === 'hindi') {
    return `\n\n🤖 ${MY_NAME} के बिजनेस इंटेलिजेंस असिस्टेंट द्वारा`;
  } else {
    return `\n\n🤖 Powered by ${MY_NAME}'s Business Intelligence Assistant`;
  }
};

const formatNumber = (num, language) => {
  if (language === 'hindi') {
    return num.toLocaleString('hi-IN');
  } else {
    return num.toLocaleString('en-IN');
  }
};

// Main AI Assistant Function
exports.askAI = async (req, res) => {
  const { question } = req.body;
  
  if (!question || typeof question !== "string" || question.trim() === "") {
    return res.status(400).json({ 
      success: false, 
      message: "Please provide a valid question!" 
    });
  }

  const q = question.toLowerCase().trim();
  const language = detectLanguage(question);
  
  try {
    const pool = await poolPromise;

    // ==============================================
    // 1. TOTAL ORDERS
    // ==============================================
    if (
      q.includes("kitne orders") || 
      q.includes("total orders") || 
      q.includes("कितने ऑर्डर") ||
      q.includes("orders count") ||
      q.includes("how many orders") ||
      q.includes("कुल ऑर्डर") ||
      q.includes("total order")
    ) {
      const result = await pool.request().query(`SELECT COUNT(*) AS TotalOrders FROM OrdersTemp`);
      const totalOrders = result.recordset[0].TotalOrders;
      
      let answer;
      if (language === 'hindi') {
        answer = `📊 कुल ${totalOrders} ऑर्डर सिस्टम में उपलब्ध हैं।`;
      } else {
        answer = `📊 Total ${totalOrders} orders available in the system.`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { 
          totalOrders,
          analyzedBy: language === 'hindi' ? `${MY_NAME} का AI` : `${MY_NAME}'s AI`
        }
      });
    }

    // ==============================================
    // 2. TOP CUSTOMERS
    // ==============================================
    if (
      q.includes("top customer") || 
      q.includes("best customers") || 
      q.includes("सबसे ज्यादा ऑर्डर किसने दिए") ||
      q.includes("सबसे अच्छे ग्राहक") ||
      q.includes("highest spending") ||
      q.includes("top 3 customers") ||
      q.includes("ग्राहक रैंकिंग") ||
      q.includes("who spends most") ||
      q.includes("कौन सबसे ज्यादा खर्च करता है")
    ) {
      const result = await pool.request().query(`
        SELECT TOP 5 CustomerName, SUM(Total) AS TotalSpent
        FROM OrdersTemp o
        JOIN orderItems i ON o.OrderID = i.OrderID
        GROUP BY CustomerName
        ORDER BY TotalSpent DESC
      `);
      
      const topCustomers = result.recordset;
      
      if (topCustomers.length === 0) {
        let noDataMsg = language === 'hindi' 
          ? "फिलहाल कोई ग्राहक डेटा उपलब्ध नहीं है।"
          : "No customer data available at the moment.";
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${noDataMsg}${getSignature(language)}`
        });
      }
      
      let answer;
      if (language === 'hindi') {
        const customerList = topCustomers.map((cust, index) => 
          `${index + 1}. ${cust.CustomerName}: ₹${formatNumber(cust.TotalSpent, 'hindi')}`
        ).join("\n");
        answer = `🏆 शीर्ष ग्राहक रेवेन्यू के अनुसार:\n${customerList}`;
      } else {
        const customerList = topCustomers.map((cust, index) => 
          `${index + 1}. ${cust.CustomerName}: ₹${formatNumber(cust.TotalSpent, 'english')}`
        ).join("\n");
        answer = `🏆 Top Customers by Revenue:\n${customerList}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: {
          topCustomers,
          analyzedBy: language === 'hindi' ? `${MY_NAME} का बिजनेस इंटेलिजेंस` : `${MY_NAME}'s Business Intelligence`
        }
      });
    }

    // ==============================================
    // 3. STOCK AVAILABLE
    // ==============================================
    if (
      q.includes("stock") || 
      q.includes("available stock") || 
      q.includes("स्टॉक") ||
      q.includes("स्टॉक की स्थिति") ||
      q.includes("kitna stock hai") ||
      q.includes("stock availability") ||
      q.includes("current stock") ||
      q.includes("माल कितना बचा है") ||
      q.includes("stock ki jankari") ||
      q.includes("what's in stock")
    ) {
      const result = await pool.request().query(`
        SELECT item_name, SUM(quantity) AS available_stock
        FROM Stock
        GROUP BY item_name
        ORDER BY item_name ASC
      `);
      
      const stock = result.recordset;
      
      if (stock.length === 0) {
        let noStockMsg = language === 'hindi'
          ? "📦 फिलहाल कोई स्टॉक डेटा उपलब्ध नहीं है।"
          : "📦 No stock data available at the moment.";
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${noStockMsg}${getSignature(language)}`
        });
      }
      
      let answer;
      if (language === 'hindi') {
        const stockList = stock.map(s => `• ${s.item_name}: ${s.available_stock} यूनिट`).join("\n");
        answer = `📦 उपलब्ध स्टॉक:\n${stockList}`;
      } else {
        const stockList = stock.map(s => `• ${s.item_name}: ${s.available_stock} units`).join("\n");
        answer = `📦 Available Stock:\n${stockList}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: {
          stock,
          analyzedBy: language === 'hindi' ? `${MY_NAME} का इन्वेंटरी सिस्टम` : `${MY_NAME}'s Inventory System`
        }
      });
    }

    // ==============================================
    // 4. TOTAL SALES REVENUE
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
      q.includes("कितना टर्नओवर हुआ")
    ) {
      const result = await pool.request().query(`
        SELECT SUM(Total) AS TotalSales
        FROM orderItems
      `);
      
      const totalSales = result.recordset[0].TotalSales || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `💰 कुल बिक्री रेवेन्यू: ₹${formatNumber(totalSales, 'hindi')}`;
      } else {
        answer = `💰 Total Sales Revenue: ₹${formatNumber(totalSales, 'english')}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { 
          totalRevenue: totalSales,
          analyzedBy: language === 'hindi' ? `${MY_NAME} का रेवेन्यू एनालिटिक्स` : `${MY_NAME}'s Revenue Analytics`
        }
      });
    }

    // ==============================================
    // 5. PENDING DELIVERIES
    // ==============================================
    if (
      q.includes("pending") || 
      q.includes("delivery pending") || 
      q.includes("लंबित डिलीवरी") ||
      q.includes("pending deliveries") ||
      q.includes("कितनी डिलीवरी बाकी है") ||
      q.includes("delivery status") ||
      q.includes("how many pending") ||
      q.includes("डिलीवरी की स्थिति")
    ) {
      const result = await pool.request().query(`
        SELECT 
          SUM(CASE WHEN DeliveryStatus NOT IN ('Complete', 'Cancel') THEN 1 ELSE 0 END) AS Pending,
          SUM(CASE WHEN DeliveryStatus = 'Complete' THEN 1 ELSE 0 END) AS Completed,
          SUM(CASE WHEN DeliveryStatus = 'Cancel' THEN 1 ELSE 0 END) AS Cancelled,
          COUNT(*) AS Total
        FROM AssignedOrders
      `);
      
      const data = result.recordset[0];
      const pending = data.Pending || 0;
      const completed = data.Completed || 0;
      const cancelled = data.Cancelled || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `📦 डिलीवरी स्थिति:\n• लंबित: ${pending}\n• पूर्ण: ${completed}\n• रद्द: ${cancelled}`;
      } else {
        answer = `📦 Delivery Status:\n• Pending: ${pending}\n• Completed: ${completed}\n• Cancelled: ${cancelled}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { 
          pendingDeliveries: pending,
          completedDeliveries: completed,
          cancelledDeliveries: cancelled,
          totalDeliveries: data.Total || 0,
          analyzedBy: language === 'hindi' ? `${MY_NAME} का डिलीवरी ट्रैकर` : `${MY_NAME}'s Delivery Tracker`
        }
      });
    }

    // ==============================================
    // 6. AREA-WISE PERFORMANCE
    // ==============================================
    if (
      q.includes("area") || 
      q.includes("best area") || 
      q.includes("क्षेत्र") ||
      q.includes("top area") ||
      q.includes("which area has highest sales") ||
      q.includes("कौन सा क्षेत्र सबसे अच्छा है") ||
      q.includes("best sales area") ||
      q.includes("सबसे अच्छा इलाका")
    ) {
      const result = await pool.request().query(`
        SELECT TOP 3 o.Area, SUM(i.Total) AS Revenue
        FROM OrdersTemp o
        JOIN orderItems i ON o.OrderID = i.OrderID
        GROUP BY o.Area
        ORDER BY Revenue DESC
      `);
      
      const areas = result.recordset;
      
      if (areas.length === 0) {
        let noAreaMsg = language === 'hindi'
          ? "कोई एरिया डेटा उपलब्ध नहीं है।"
          : "No area data available.";
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${noAreaMsg}${getSignature(language)}`
        });
      }
      
      let answer;
      if (language === 'hindi') {
        const areaList = areas.map((area, index) => 
          `${index + 1}. ${area.Area}: ₹${formatNumber(area.Revenue, 'hindi')}`
        ).join("\n");
        answer = `📍 शीर्ष प्रदर्शन करने वाले क्षेत्र:\n${areaList}`;
      } else {
        const areaList = areas.map((area, index) => 
          `${index + 1}. ${area.Area}: ₹${formatNumber(area.Revenue, 'english')}`
        ).join("\n");
        answer = `📍 Top Performing Areas:\n${areaList}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: {
          topAreas: areas,
          analyzedBy: language === 'hindi' ? `${MY_NAME} का जियोग्राफिक एनालिटिक्स` : `${MY_NAME}'s Geographic Analytics`
        }
      });
    }

    // ==============================================
    // 7. TODAY'S REPORT
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
      q.includes("today's business")
    ) {
      const today = new Date().toISOString().split('T')[0];
      
      try {
        // Get today's sales
        const salesResult = await pool.request()
          .input("today", sql.Date, today)
          .query(`
            SELECT SUM(i.Total) AS totalSaleAmount
            FROM OrdersTemp o
            JOIN orderItems i ON o.OrderID = i.OrderID
            WHERE CAST(o.OrderDate AS DATE) = @today
          `);
        
        const totalSales = salesResult.recordset[0].totalSaleAmount || 0;
        
        // Get today's payments
        const paymentsResult = await pool.request()
          .input("today", sql.Date, today)
          .query(`
            SELECT SUM(op.Amount) AS totalReceived
            FROM OrderPayments op
            JOIN AssignedOrders ao ON op.AssignID = ao.AssignID
            WHERE CAST(ao.PaymentReceivedDate AS DATE) = @today
          `);
        
        const totalReceived = paymentsResult.recordset[0].totalReceived || 0;
        const totalOutstanding = Math.max(0, totalSales - totalReceived);
        
        let answer;
        if (language === 'hindi') {
          answer = `📊 आज की रिपोर्ट:\n• बिक्री: ₹${formatNumber(totalSales, 'hindi')}\n• प्राप्त: ₹${formatNumber(totalReceived, 'hindi')}\n• बकाया: ₹${formatNumber(totalOutstanding, 'hindi')}`;
        } else {
          answer = `📊 Today's Report:\n• Sales: ₹${formatNumber(totalSales, 'english')}\n• Received: ₹${formatNumber(totalReceived, 'english')}\n• Outstanding: ₹${formatNumber(totalOutstanding, 'english')}`;
        }
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
          data: {
            summary: {
              totalSaleAmount: totalSales,
              totalReceived: totalReceived,
              totalOutstanding: totalOutstanding
            },
            analyzedBy: language === 'hindi' ? `${MY_NAME} का दैनिक रिपोर्ट सिस्टम` : `${MY_NAME}'s Daily Report System`
          }
        });
      } catch (error) {
        let errorMsg = language === 'hindi'
          ? `📊 आज के लिए रिपोर्ट उपलब्ध नहीं है।`
          : `📊 Report not available for today.`;
        
        return res.json({
          success: true,
          answer: `${getPersonalizedGreeting(language)}\n\n${errorMsg}${getSignature(language)}`
        });
      }
    }

    // ==============================================
    // 8. PRODUCT PERFORMANCE
    // ==============================================
    if (
      q.includes("product") || 
      q.includes("best product") || 
      q.includes("उत्पाद") ||
      q.includes("best selling product") ||
      q.includes("top product") ||
      q.includes("सबसे ज्यादा बिकने वाला उत्पाद") ||
      q.includes("which product sells most")
    ) {
      const result = await pool.request().query(`
        SELECT TOP 3 ProductType, SUM(Total) AS TotalSales
        FROM orderItems
        GROUP BY ProductType
        ORDER BY TotalSales DESC
      `);
      
      const products = result.recordset;
      
      if (products.length === 0) {
        let noDataMsg = language === 'hindi'
          ? "कोई उत्पाद बिक्री डेटा उपलब्ध नहीं है।"
          : "No product sales data available.";
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${noDataMsg}${getSignature(language)}`
        });
      }
      
      let answer;
      if (language === 'hindi') {
        const productList = products.map((prod, index) => 
          `${index + 1}. ${prod.ProductType}: ₹${formatNumber(prod.TotalSales, 'hindi')}`
        ).join("\n");
        answer = `🏆 शीर्ष बिकने वाले उत्पाद:\n${productList}`;
      } else {
        const productList = products.map((prod, index) => 
          `${index + 1}. ${prod.ProductType}: ₹${formatNumber(prod.TotalSales, 'english')}`
        ).join("\n");
        answer = `🏆 Top Selling Products:\n${productList}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: {
          topProducts: products,
          analyzedBy: language === 'hindi' ? `${MY_NAME} का उत्पाद एनालिटिक्स` : `${MY_NAME}'s Product Analytics`
        }
      });
    }

    // ==============================================
    // 9. WHO CREATED / DEVELOPER INFO
    // ==============================================
    if (
      q.includes("who created") || 
      q.includes("who made") || 
      q.includes("developer") ||
      q.includes("creator") ||
      q.includes("तुम्हें किसने बनाया") ||
      q.includes("तुम्हारा निर्माता कौन है") ||
      q.includes("तुम्हें बनाया किसने") ||
      q.includes("डेवलपर कौन है") ||
      q.includes(MY_NAME.toLowerCase())
    ) {
      let creatorResponse;
      
      if (language === 'hindi') {
        creatorResponse = `🎯 मुझे **${MY_NAME}** ने बनाया है - आपके बिजनेस इंटेलिजेंस विशेषज्ञ!\n\n` +
          `📍 **${MY_NAME} के बारे में:**\n` +
          `• फुल स्टैक डेवलपर और बिजनेस एनालिस्ट\n` +
          `• बिजनेस इंटेलिजेंस सॉल्यूशंस में विशेषज्ञ\n` +
          `• इस AI-पावर्ड बिजनेस असिस्टेंट के निर्माता\n\n` +
          `💡 **मेरी क्षमताएं:**\n` +
          `• रियल-टाइम बिजनेस एनालिटिक्स\n` +
          `• बिक्री और आय ट्रैकिंग\n` +
          `• इन्वेंटरी मैनेजमेंट\n` +
          `• डिलीवरी मॉनिटरिंग\n` +
          `• ग्राहक इनसाइट्स\n` +
          `• क्षेत्रवार प्रदर्शन विश्लेषण\n\n` +
          `📞 **${MY_NAME} से संपर्क करें:**\n` +
          `• कस्टम बिजनेस सॉल्यूशंस के लिए\n` +
          `• वेबसाइट डेवलपमेंट\n` +
          `• मोबाइल एप्लिकेशन\n` +
          `• बिजनेस इंटेलिजेंस डैशबोर्ड\n\n` +
          `_"डेटा को निर्णयों में बदलना"_ - ${MY_NAME}`;
      } else {
        creatorResponse = `🎯 I was created by **${MY_NAME}** - your business intelligence expert!\n\n` +
          `📍 **About ${MY_NAME}:**\n` +
          `• Full Stack Developer & Business Analyst\n` +
          `• Specializes in Business Intelligence Solutions\n` +
          `• Creator of this AI-powered Business Assistant\n\n` +
          `💡 **Capabilities I provide:**\n` +
          `• Real-time Business Analytics\n` +
          `• Sales & Revenue Tracking\n` +
          `• Inventory Management\n` +
          `• Delivery Monitoring\n` +
          `• Customer Insights\n` +
          `• Area-wise Performance Analysis\n\n` +
          `📞 **Contact ${MY_NAME}:**\n` +
          `• For custom business solutions\n` +
          `• Website development\n` +
          `• Mobile applications\n` +
          `• Business intelligence dashboards\n\n` +
          `_"Transforming data into decisions"_ - ${MY_NAME}`;
      }
      
      return res.json({
        success: true,
        answer: `${getPersonalizedGreeting(language)}\n\n${creatorResponse}${getSignature(language)}`,
        data: { 
          creator: MY_NAME,
          role: language === 'hindi' ? "बिजनेस इंटेलिजेंस डेवलपर" : "Business Intelligence Developer",
          contact: language === 'hindi' ? "कस्टम सॉल्यूशंस के लिए उपलब्ध" : "Available for custom solutions"
        }
      });
    }

    // ==============================================
    // 10. HELP / GUIDANCE
    // ==============================================
    if (
      q.includes("help") || 
      q.includes("what can") || 
      q.includes("मदद") ||
      q.includes("सहायता") ||
      q.includes("how to use") ||
      q.includes("क्या-क्या पूछ सकता हूँ") ||
      q.includes("तुम क्या-क्या बता सकते हो")
    ) {
      let helpText;
      
      if (language === 'hindi') {
        helpText = `🤖 **${MY_NAME} जी, मैं आपकी इन चीज़ों में मदद कर सकता हूँ:**\n\n` +
          `📊 **ऑर्डर और ग्राहक:**\n` +
          `• कुल ऑर्डर संख्या\n` +
          `• शीर्ष ग्राहक\n` +
          `• ग्राहक विश्लेषण\n\n` +
          
          `📦 **स्टॉक और इन्वेंटरी:**\n` +
          `• उपलब्ध स्टॉक\n` +
          `• स्टॉक स्थिति\n` +
          `• इन्वेंटरी प्रबंधन\n\n` +
          
          `💰 **बिक्री और आय:**\n` +
          `• कुल बिक्री\n` +
          `• मासिक/साप्ताहिक/दैनिक बिक्री\n` +
          `• आय विश्लेषण\n\n` +
          
          `🚚 **डिलीवरी:**\n` +
          `• लंबित डिलीवरी\n` +
          `• डिलीवरी स्थिति\n` +
          `• पूर्णता दर\n\n` +
          
          `📍 **क्षेत्र विश्लेषण:**\n` +
          `• शीर्ष क्षेत्र\n` +
          `• क्षेत्रवार बिक्री\n` +
          `• प्रदर्शन विश्लेषण\n\n` +
          
          `🏆 **उत्पाद प्रदर्शन:**\n` +
          `• शीर्ष बिकने वाले उत्पाद\n` +
          `• उत्पादवार बिक्री\n` +
          `• इन्वेंटरी टर्नओवर\n\n` +
          
          `💡 **उदाहरण प्रश्न:**\n` +
          `• "आज कितने ऑर्डर आए?"\n` +
          `• "स्टॉक कितना है?"\n` +
          `• "कौन सा एरिया सबसे अच्छा है?"\n` +
          `• "पेंडिंग डिलीवरी कितनी हैं?"\n\n` +
          
          `बस मुझसे कुछ भी पूछें! 😊`;
      } else {
        helpText = `🤖 **${MY_NAME} ji, I can help you with:**\n\n` +
          `📊 **Orders & Customers:**\n` +
          `• Total orders count\n` +
          `• Top customers\n` +
          `• Customer analysis\n\n` +
          
          `📦 **Stock & Inventory:**\n` +
          `• Available stock\n` +
          `• Stock status\n` +
          `• Inventory management\n\n` +
          
          `💰 **Sales & Revenue:**\n` +
          `• Total sales\n` +
          `• Monthly/Weekly/Daily sales\n` +
          `• Revenue analysis\n\n` +
          
          `🚚 **Deliveries:**\n` +
          `• Pending deliveries\n` +
          `• Delivery status\n` +
          `• Completion rate\n\n` +
          
          `📍 **Area Analysis:**\n` +
          `• Top areas\n` +
          `• Area-wise sales\n` +
          `• Performance analysis\n\n` +
          
          `🏆 **Product Performance:**\n` +
          `• Best selling products\n` +
          `• Product-wise sales\n` +
          `• Inventory turnover\n\n` +
          
          `💡 **Example Questions:**\n` +
          `• "How many orders today?"\n` +
          `• "What's the stock status?"\n` +
          `• "Which area is best?"\n` +
          `• "How many pending deliveries?"\n\n` +
          
          `Just ask me anything! 😊`;
      }

      return res.json({
        success: true,
        answer: `${getPersonalizedGreeting(language)}\n\n${helpText}${getSignature(language)}`,
        data: { 
          developer: MY_NAME,
          assistantName: language === 'hindi' ? `${MY_NAME} का बिजनेस असिस्टेंट` : `${MY_NAME}'s Business Assistant`
        }
      });
    }

    // ==============================================
    // 11. BUSINESS STATUS (COMPREHENSIVE)
    // ==============================================
    if (
      q.includes("कैसा चल रहा") || 
      q.includes("business status") || 
      q.includes("हाल-चाल") ||
      q.includes("कैसा है") ||
      q.includes("how's business") ||
      q.includes("status report") ||
      q.includes("overview")
    ) {
      // Get all data in parallel
      const [
        ordersResult,
        salesResult,
        stockResult,
        deliveryResult,
        areaResult,
        productResult,
        customerResult
      ] = await Promise.all([
        pool.request().query(`SELECT COUNT(*) AS TotalOrders FROM OrdersTemp`),
        pool.request().query(`SELECT SUM(Total) AS TotalSales FROM orderItems`),
        pool.request().query(`SELECT COUNT(DISTINCT item_name) AS StockItems FROM Stock WHERE quantity > 0`),
        pool.request().query(`
          SELECT 
            SUM(CASE WHEN DeliveryStatus NOT IN ('Complete', 'Cancel') THEN 1 ELSE 0 END) AS Pending
          FROM AssignedOrders
        `),
        pool.request().query(`
          SELECT TOP 1 Area, SUM(i.Total) AS Revenue
          FROM OrdersTemp o
          JOIN orderItems i ON o.OrderID = i.OrderID
          GROUP BY Area
          ORDER BY Revenue DESC
        `),
        pool.request().query(`
          SELECT TOP 1 ProductType, SUM(Total) AS TotalSales
          FROM orderItems
          GROUP BY ProductType
          ORDER BY TotalSales DESC
        `),
        pool.request().query(`
          SELECT TOP 1 CustomerName, SUM(i.Total) AS TotalSpent
          FROM OrdersTemp o
          JOIN orderItems i ON o.OrderID = i.OrderID
          GROUP BY CustomerName
          ORDER BY TotalSpent DESC
        `)
      ]);

      const totalOrders = ordersResult.recordset[0].TotalOrders || 0;
      const totalSales = salesResult.recordset[0].TotalSales || 0;
      const stockItems = stockResult.recordset[0].StockItems || 0;
      const pendingDeliveries = deliveryResult.recordset[0].Pending || 0;
      const topArea = areaResult.recordset[0] || { Area: "N/A", Revenue: 0 };
      const topProduct = productResult.recordset[0] || { ProductType: "N/A", TotalSales: 0 };
      const topCustomer = customerResult.recordset[0] || { CustomerName: "N/A", TotalSpent: 0 };

      let answer;
      if (language === 'hindi') {
        answer = `📊 बिजनेस स्थिति:\n\n` +
          `• कुल ऑर्डर: ${totalOrders}\n` +
          `• कुल बिक्री: ₹${formatNumber(totalSales, 'hindi')}\n` +
          `• स्टॉक आइटम: ${stockItems}\n` +
          `• पेंडिंग डिलीवरी: ${pendingDeliveries}\n` +
          `• शीर्ष क्षेत्र: ${topArea.Area} (₹${formatNumber(topArea.Revenue, 'hindi')})\n` +
          `• शीर्ष उत्पाद: ${topProduct.ProductType} (₹${formatNumber(topProduct.TotalSales, 'hindi')})\n` +
          `• शीर्ष ग्राहक: ${topCustomer.CustomerName} (₹${formatNumber(topCustomer.TotalSpent, 'hindi')})`;
      } else {
        answer = `📊 Business Status:\n\n` +
          `• Total Orders: ${totalOrders}\n` +
          `• Total Sales: ₹${formatNumber(totalSales, 'english')}\n` +
          `• Stock Items: ${stockItems}\n` +
          `• Pending Deliveries: ${pendingDeliveries}\n` +
          `• Top Area: ${topArea.Area} (₹${formatNumber(topArea.Revenue, 'english')})\n` +
          `• Top Product: ${topProduct.ProductType} (₹${formatNumber(topProduct.TotalSales, 'english')})\n` +
          `• Top Customer: ${topCustomer.CustomerName} (₹${formatNumber(topCustomer.TotalSpent, 'english')})`;
      }

      return res.json({
        success: true,
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: {
          totalOrders,
          totalSales,
          stockItems,
          pendingDeliveries,
          topArea,
          topProduct,
          topCustomer,
          analyzedBy: language === 'hindi' ? `${MY_NAME} का AI असिस्टेंट` : `${MY_NAME}'s AI Assistant`
        }
      });
    }

    // ==============================================
    // FALLBACK: Generic response
    // ==============================================
    let fallbackResponse;
    
    if (language === 'hindi') {
      const hindiResponses = [
        `${MY_NAME} जी, मैं आपके बिजनेस डेटा के बारे में बता सकता हूँ। कृपया विशेष रूप से पूछें।`,
        `${MY_NAME} सर, आप मुझसे ऑर्डर, स्टॉक, बिक्री, डिलीवरी के बारे में पूछ सकते हैं।`,
        `${MY_NAME} जी, पूछने का प्रयास करें: 'आज कितने ऑर्डर?' या 'स्टॉक कितना है?'`,
        `नमस्ते ${MY_NAME} जी! मैं आपके बिजनेस का AI असिस्टेंट हूँ। आप क्या जानना चाहते हैं?`
      ];
      fallbackResponse = hindiResponses[Math.floor(Math.random() * hindiResponses.length)];
    } else {
      const englishResponses = [
        `${MY_NAME} ji, I can tell you about your business data. Please ask specifically.`,
        `${MY_NAME} sir, you can ask me about orders, stock, sales, or deliveries.`,
        `${MY_NAME} ji, try asking: 'How many orders today?' or 'What's the stock status?'`,
        `Hello ${MY_NAME} ji! I'm your business AI assistant. What would you like to know?`
      ];
      fallbackResponse = englishResponses[Math.floor(Math.random() * englishResponses.length)];
    }
    
    return res.json({ 
      success: true,
      answer: `${getPersonalizedGreeting(language)}\n\n${fallbackResponse}${getSignature(language)}`,
      data: {
        assistant: language === 'hindi' ? `${MY_NAME} का AI असिस्टेंट` : `${MY_NAME}'s AI Assistant`,
        language: language
      }
    });

  } catch (err) {
    console.error("AI Error:", err.message);
    
    let errorMessage;
    if (language === 'hindi') {
      errorMessage = `${MY_NAME} जी, माफ़ कीजिए! डेटा प्रोसेस करने में समस्या आ रही है। कृपया थोड़ी देर बाद फिर से प्रयास करें।`;
    } else {
      errorMessage = `${MY_NAME} ji, sorry! There's an issue processing your request. Please try again in a moment.`;
    }
    
    return res.status(500).json({ 
      success: false, 
      message: `${errorMessage}\n\n${language === 'hindi' ? '🤖 Sagar के असिस्टेंट द्वारा' : '🤖 By Sagar\'s Assistant'}`,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Quick Stats Function
exports.getQuickStats = async (req, res) => {
  try {
    const pool = await poolPromise;

    const [
      ordersResult,
      stockResult,
      salesResult,
      deliveryResult
    ] = await Promise.all([
      pool.request().query(`SELECT COUNT(*) AS TotalOrders FROM OrdersTemp`),
      pool.request().query(`SELECT COUNT(DISTINCT item_name) AS StockItems FROM Stock WHERE quantity > 0`),
      pool.request().query(`SELECT SUM(Total) AS TotalSales FROM orderItems`),
      pool.request().query(`
        SELECT COUNT(*) AS PendingDeliveries 
        FROM AssignedOrders 
        WHERE DeliveryStatus NOT IN ('Complete', 'Cancel')
      `)
    ]);

    const stats = {
      totalOrders: ordersResult.recordset[0].TotalOrders || 0,
      stockItems: stockResult.recordset[0].StockItems || 0,
      totalSales: salesResult.recordset[0].TotalSales || 0,
      pendingDeliveries: deliveryResult.recordset[0].PendingDeliveries || 0,
      timestamp: new Date().toISOString(),
      analyzedBy: `${MY_NAME}'s AI Assistant`
    };

    res.json({
      success: true,
      message: `${MY_NAME} ji, quick stats fetched successfully`,
      data: stats
    });

  } catch (err) {
    console.error("Quick Stats Error:", err);
    res.status(500).json({ 
      success: false, 
      message: `${MY_NAME} ji, failed to fetch quick stats` 
    });
  }
};

// Assistant Info Function
exports.getAssistantInfo = (req, res) => {
  const language = req.query.lang || 'english';
  
  if (language === 'hindi') {
    res.json({
      success: true,
      data: {
        name: `${MY_NAME} का बिजनेस इंटेलिजेंस असिस्टेंट`,
        developer: MY_NAME,
        version: "1.0.0",
        capabilities: [
          "ऑर्डर विश्लेषण",
          "स्टॉक प्रबंधन",
          "बिक्री ट्रैकिंग",
          "डिलीवरी मॉनिटरिंग",
          "ग्राहक इनसाइट्स",
          "क्षेत्रवार एनालिटिक्स",
          "उत्पाद प्रदर्शन",
          "रियल-टाइम रिपोर्टिंग"
        ],
        features: [
          "द्विभाषी सपोर्ट (हिंदी और अंग्रेजी)",
          "व्यक्तिगत प्रतिक्रियाएं",
          "बिजनेस हेल्थ मॉनिटरिंग",
          "अलर्ट सिस्टम",
          "तुलनात्मक विश्लेषण",
          "विस्तृत रिपोर्टिंग"
        ],
        contact: `${MY_NAME} द्वारा विकसित - बिजनेस इंटेलिजेंस विशेषज्ञ`
      }
    });
  } else {
    res.json({
      success: true,
      data: {
        name: `${MY_NAME}'s Business Intelligence Assistant`,
        developer: MY_NAME,
        version: "1.0.0",
        capabilities: [
          "Order Analysis",
          "Stock Management",
          "Sales Tracking",
          "Delivery Monitoring",
          "Customer Insights",
          "Area-wise Analytics",
          "Product Performance",
          "Real-time Reporting"
        ],
        features: [
          "Bilingual Support (Hindi & English)",
          "Personalized Responses",
          "Business Health Monitoring",
          "Alert System",
          "Comparative Analysis",
          "Detailed Reporting"
        ],
        contact: `Developed by ${MY_NAME} - Business Intelligence Expert`
      }
    });
  }
};