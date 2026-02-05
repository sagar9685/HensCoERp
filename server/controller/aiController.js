// controllers/aiController.js
const { poolPromise } = require("../utils/db");
const sql = require("mssql");

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

// Helper to get month name
const getMonthName = (monthNumber, language) => {
  const monthsHindi = [
    'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
    'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
  ];
  const monthsEnglish = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  if (language === 'hindi') {
    return monthsHindi[monthNumber - 1] || monthNumber;
  } else {
    return monthsEnglish[monthNumber - 1] || monthNumber;
  }
};

// Extract month from question
const extractMonth = (question) => {
  const monthPatterns = {
    'january': 1, 'jan': 1, 'जनवरी': 1, 'जन': 1,
    'february': 2, 'feb': 2, 'फरवरी': 2, 'फर': 2,
    'march': 3, 'mar': 3, 'मार्च': 3, 'मार': 3,
    'april': 4, 'apr': 4, 'अप्रैल': 4, 'अप्रै': 4,
    'may': 5, 'मई': 5,
    'june': 6, 'jun': 6, 'जून': 6,
    'july': 7, 'jul': 7, 'जुलाई': 7,
    'august': 8, 'aug': 8, 'अगस्त': 8,
    'september': 9, 'sep': 9, 'सितंबर': 9, 'सितम्बर': 9,
    'october': 10, 'oct': 10, 'अक्टूबर': 10,
    'november': 11, 'nov': 11, 'नवंबर': 11, 'नवम्बर': 11,
    'december': 12, 'dec': 12, 'दिसंबर': 12, 'दिसम्बर': 12
  };
  
  const q = question.toLowerCase();
  for (const [key, value] of Object.entries(monthPatterns)) {
    if (q.includes(key)) {
      return value;
    }
  }
  return null;
};

// Extract year from question
const extractYear = (question) => {
  const q = question.toLowerCase();
  const yearMatch = q.match(/(?:20|19)?(\d{2}|\d{4})/);
  if (yearMatch) {
    let year = parseInt(yearMatch[0]);
    if (year < 100) {
      year += 2000;
    }
    return year;
  }
  return new Date().getFullYear();
};

// Extract product type from question
const extractProduct = (question) => {
  const products = {
    'tray': 'Tray',
    'trays': 'Tray',
    'ट्रे': 'Tray',
    'ट्रें': 'Tray',
    'bottle': 'Bottle',
    'bottles': 'Bottle',
    'बोतल': 'Bottle',
    'बोतलें': 'Bottle',
    'box': 'Box',
    'boxes': 'Box',
    'बॉक्स': 'Box',
    'bag': 'Bag',
    'bags': 'Bag',
    'बैग': 'Bag',
    'container': 'Container',
    'containers': 'Container',
    'कंटेनर': 'Container'
  };
  
  const q = question.toLowerCase();
  for (const [key, value] of Object.entries(products)) {
    if (q.includes(key)) {
      return value;
    }
  }
  return null;
};

// Extract area from question
const extractArea = (question) => {
  const areas = {
    'civil lines': 'Civil Lines',
    'civil lines area': 'Civil Lines',
    'सिविल लाइन्स': 'Civil Lines',
    'सिविल लाइन्स एरिया': 'Civil Lines',
    'market': 'Market',
    'बाजार': 'Market',
    'town': 'Town',
    'शहर': 'Town',
    'industrial': 'Industrial Area',
    'इंडस्ट्रियल': 'Industrial Area'
  };
  
  const q = question.toLowerCase();
  for (const [key, value] of Object.entries(areas)) {
    if (q.includes(key)) {
      return value;
    }
  }
  return null;
};

// Extract delivery boy name from question
const extractDeliveryBoy = (question) => {
  const deliveryBoys = {
    'rahul': 'Rahul',
    'राहुल': 'Rahul',
    'deepak': 'Deepak',
    'दीपक': 'Deepak',
    'mohan': 'Mohan',
    'मोहन': 'Mohan',
    'suresh': 'Suresh',
    'सुरेश': 'Suresh',
    'ramesh': 'Ramesh',
    'रमेश': 'Ramesh'
  };
  
  const q = question.toLowerCase();
  for (const [key, value] of Object.entries(deliveryBoys)) {
    if (q.includes(key)) {
      return value;
    }
  }
  return null;
};

// Extract date from question (e.g., "4 February")
const extractDate = (question) => {
  const q = question.toLowerCase();
  
  // Extract date pattern like "4 February"
  const dateMatch = q.match(/(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर)/i);
  
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const monthStr = dateMatch[2].toLowerCase();
    
    const monthMap = {
      'january': 1, 'february': 2, 'march': 3, 'april': 4,
      'may': 5, 'june': 6, 'july': 7, 'august': 8,
      'september': 9, 'october': 10, 'november': 11, 'december': 12,
      'जनवरी': 1, 'फरवरी': 2, 'मार्च': 3, 'अप्रैल': 4,
      'मई': 5, 'जून': 6, 'जुलाई': 7, 'अगस्त': 8,
      'सितंबर': 9, 'अक्टूबर': 10, 'नवंबर': 11, 'दिसंबर': 12
    };
    
    const month = monthMap[monthStr];
    const year = extractYear(question) || new Date().getFullYear();
    
    return { day, month, year };
  }
  
  return null;
};

// Extract invoice/bill number from question
const extractInvoiceNumber = (question) => {
  const q = question.toLowerCase();
  
  // Match patterns like: INV/05, 25-26/10, Bill number 25-26/10, Invoice INV/05
  const invoiceMatch = q.match(/(?:invoice|bill|बिल|इनवॉइस)[\s\w]*?(\d+[\-\/]\d+\/\d+|\w+\/\d+|INV\/\d+)/i) ||
                       q.match(/(\d+[\-\/]\d+\/\d+|\w+\/\d+)/i);
  
  if (invoiceMatch) {
    return invoiceMatch[1].toUpperCase();
  }
  
  return null;
};

// Extract order ID from question
const extractOrderId = (question) => {
  const q = question.toLowerCase();
  const orderIdMatch = q.match(/order\s*(?:id|number)?\s*(\d+)/i) || 
                       q.match(/(?:आईडी|नंबर)\s*(\d+)/i);
  
  if (orderIdMatch) {
    return orderIdMatch[1];
  }
  return null;
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
    // SECTION 1: TOTAL VOLUME & GRAND SALES
    // ==============================================
    
    // 1.1 Total Volume: "Ab tak total kitne orders system mein aaye hain?"
    if (
      q.includes("total order") || q.includes("kitne orders") || 
      q.includes("कितने ऑर्डर") || q.includes("system mein aaye") ||
      q.includes("total volume") || q.includes("कुल ऑर्डर")
    ) {
      const result = await pool.request().query(`
        SELECT COUNT(*) AS TotalOrders
        FROM OrdersTemp
      `);
      
      const totalOrders = result.recordset[0].TotalOrders || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `📊 अब तक सिस्टम में कुल ${formatNumber(totalOrders, 'hindi')} ऑर्डर आ चुके हैं।`;
      } else {
        answer = `📊 Total ${formatNumber(totalOrders, 'english')} orders have been received in the system so far.`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { totalOrders }
      });
    }

    // 1.2 Grand Sales: "Life-time total sales (gross revenue) kitni ho chuki hai?"
    if (
      q.includes("total sales") || q.includes("gross revenue") || 
      q.includes("life time") || q.includes("कुल बिक्री") ||
      q.includes("जीवन भर की बिक्री") || q.includes("grand sales")
    ) {
      const result = await pool.request().query(`
        SELECT SUM(Total) AS TotalSales
        FROM orderItems
      `);
      
      const totalSales = result.recordset[0].TotalSales || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `💰 जीवन भर की कुल बिक्री: ₹${formatNumber(totalSales, 'hindi')}`;
      } else {
        answer = `💰 Lifetime total sales (gross revenue): ₹${formatNumber(totalSales, 'english')}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { totalSales }
      });
    }

    // 1.3 Net Collection: "Ab tak total kitna payment (Cash + Online) receive ho chuka hai?"
    if (
      q.includes("net collection") || q.includes("payment receive") || 
      q.includes("कितना पेमेंट") || q.includes("collection") ||
      q.includes("cash online") || q.includes("प्राप्त भुगतान")
    ) {
      const result = await pool.request().query(`
        SELECT 
          SUM(Amount) AS TotalCollection,
          SUM(CASE WHEN PaymentMode = 'Cash' THEN Amount ELSE 0 END) AS CashCollection,
          SUM(CASE WHEN PaymentMode IN ('GPay', 'Paytm', 'Online', 'UPI') THEN Amount ELSE 0 END) AS OnlineCollection
        FROM OrderPayments op
        JOIN AssignedOrders ao ON op.AssignID = ao.AssignID
        WHERE ao.PaymentReceived = 1
      `);
      
      const data = result.recordset[0];
      const totalCollection = data.TotalCollection || 0;
      const cashCollection = data.CashCollection || 0;
      const onlineCollection = data.OnlineCollection || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `💰 अब तक कुल प्राप्त भुगतान:\n` +
                `• कुल संग्रह: ₹${formatNumber(totalCollection, 'hindi')}\n` +
                `• नकद: ₹${formatNumber(cashCollection, 'hindi')}\n` +
                `• ऑनलाइन: ₹${formatNumber(onlineCollection, 'hindi')}`;
      } else {
        answer = `💰 Total payment received so far:\n` +
                `• Total Collection: ₹${formatNumber(totalCollection, 'english')}\n` +
                `• Cash: ₹${formatNumber(cashCollection, 'english')}\n` +
                `• Online: ₹${formatNumber(onlineCollection, 'english')}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { totalCollection, cashCollection, onlineCollection }
      });
    }

    // 1.4 Total Outstanding: "Poori market mein total kitna udhaar (outstanding) fasa hua hai?"
    if (
      q.includes("outstanding") || q.includes("udhaar") || 
      q.includes("उधार") || q.includes("बकाया") ||
      q.includes("fasa hua") || q.includes("pending amount")
    ) {
      const result = await pool.request().query(`
        SELECT 
          SUM(op.Amount) AS TotalOutstanding,
          COUNT(DISTINCT ao.AssignID) AS OutstandingCount,
          COUNT(DISTINCT o.CustomerName) AS CustomerCount
        FROM OrderPayments op
        JOIN AssignedOrders ao ON op.AssignID = ao.AssignID
        JOIN OrdersTemp o ON ao.OrderID = o.OrderID
        WHERE ao.PaymentReceived = 0
      `);
      
      const data = result.recordset[0];
      const totalOutstanding = data.TotalOutstanding || 0;
      const outstandingCount = data.OutstandingCount || 0;
      const customerCount = data.CustomerCount || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `📊 पूरी मार्केट में कुल बकाया राशि:\n` +
                `• कुल उधार: ₹${formatNumber(totalOutstanding, 'hindi')}\n` +
                `• बकाया बिल: ${outstandingCount}\n` +
                `• ग्राहक संख्या: ${customerCount}`;
      } else {
        answer = `📊 Total outstanding in market:\n` +
                `• Total Outstanding: ₹${formatNumber(totalOutstanding, 'english')}\n` +
                `• Outstanding Bills: ${outstandingCount}\n` +
                `• Customers: ${customerCount}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { totalOutstanding, outstandingCount, customerCount }
      });
    }

    // 1.5 Waste Summary: "Ab tak total kitna maal (stock) reject ya kharab hua hai?"
    if (
      q.includes("waste") || q.includes("reject") || 
      q.includes("खराब") || q.includes("रिजेक्ट") ||
      q.includes("kharab hua") || q.includes("नुकसान")
    ) {
      // Assuming there's a StockDamage table or similar
      try {
        const result = await pool.request().query(`
          SELECT 
            SUM(quantity) AS TotalWaste,
            COUNT(DISTINCT item_name) AS ItemCount,
            SUM(quantity * rate) AS FinancialLoss
          FROM StockDamage
        `);
        
        const data = result.recordset[0];
        const totalWaste = data.TotalWaste || 0;
        const itemCount = data.ItemCount || 0;
        const financialLoss = data.FinancialLoss || 0;
        
        let answer;
        if (language === 'hindi') {
          answer = `🗑️ अब तक कुल खराब/रिजेक्ट माल:\n` +
                  `• कुल यूनिट: ${formatNumber(totalWaste, 'hindi')}\n` +
                  `• आइटम प्रकार: ${itemCount}\n` +
                  `• वित्तीय नुकसान: ₹${formatNumber(financialLoss, 'hindi')}`;
        } else {
          answer = `🗑️ Total waste/rejected stock so far:\n` +
                  `• Total Units: ${formatNumber(totalWaste, 'english')}\n` +
                  `• Item Types: ${itemCount}\n` +
                  `• Financial Loss: ₹${formatNumber(financialLoss, 'english')}`;
        }
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
          data: { totalWaste, itemCount, financialLoss }
        });
      } catch (error) {
        let answer = language === 'hindi' 
          ? "📊 खराब माल का डेटा फिलहाल उपलब्ध नहीं है।"
          : "📊 Waste data is not available at the moment.";
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`
        });
      }
    }

    // 1.6 Total Deliveries: "System ne ab tak total kitni successful deliveries ki hain?"
    if (
      q.includes("total deliveries") || q.includes("successful deliveries") || 
      q.includes("डिलीवरी") || q.includes("सफल डिलीवरी") ||
      q.includes("complete delivery") || q.includes("पूरी हुई डिलीवरी")
    ) {
      const result = await pool.request().query(`
        SELECT COUNT(*) AS SuccessfulDeliveries
        FROM AssignedOrders
        WHERE DeliveryStatus = 'Complete'
      `);
      
      const successfulDeliveries = result.recordset[0].SuccessfulDeliveries || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `🚚 सिस्टम ने अब तक कुल ${formatNumber(successfulDeliveries, 'hindi')} सफल डिलीवरी की हैं।`;
      } else {
        answer = `🚚 System has completed ${formatNumber(successfulDeliveries, 'english')} successful deliveries so far.`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { successfulDeliveries }
      });
    }

    // 1.7 Product Popularity: "Kaunsa product hai jo sabse zyada units mein bika hai?"
    if (
      q.includes("product popularity") || q.includes("sabse zyada bika") || 
      q.includes("बिका") || q.includes("लोकप्रिय") ||
      q.includes("best selling") || q.includes("सबसे ज्यादा बिकने वाला")
    ) {
      const result = await pool.request().query(`
        SELECT TOP 5 
          ProductType,
          SUM(Quantity) AS TotalUnits,
          SUM(Total) AS TotalSales,
          COUNT(DISTINCT OrderID) AS OrderCount
        FROM orderItems
        GROUP BY ProductType
        ORDER BY TotalUnits DESC
      `);
      
      const products = result.recordset;
      
      if (products.length === 0) {
        let answer = language === 'hindi'
          ? "📦 फिलहाल कोई प्रोडक्ट बिक्री डेटा उपलब्ध नहीं है।"
          : "📦 No product sales data available at the moment.";
        
        return res.json({ success: true, answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}` });
      }
      
      let answer;
      if (language === 'hindi') {
        answer = `🏆 सबसे ज्यादा बिकने वाले उत्पाद (यूनिट्स के अनुसार):\n\n`;
        products.forEach((prod, index) => {
          answer += `${index + 1}. ${prod.ProductType}\n`;
          answer += `   • यूनिट: ${formatNumber(prod.TotalUnits, 'hindi')}\n`;
          answer += `   • बिक्री: ₹${formatNumber(prod.TotalSales, 'hindi')}\n`;
          answer += `   • ऑर्डर: ${prod.OrderCount}\n\n`;
        });
      } else {
        answer = `🏆 Most Popular Products (by units sold):\n\n`;
        products.forEach((prod, index) => {
          answer += `${index + 1}. ${prod.ProductType}\n`;
          answer += `   • Units: ${formatNumber(prod.TotalUnits, 'english')}\n`;
          answer += `   • Sales: ₹${formatNumber(prod.TotalSales, 'english')}\n`;
          answer += `   • Orders: ${prod.OrderCount}\n\n`;
        });
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { products }
      });
    }

    // 1.8 Total Customers: "Hamare database mein total kitne customers registered hain?"
    if (
      q.includes("total customers") || q.includes("registered customers") || 
      q.includes("कुल ग्राहक") || q.includes("रजिस्टर्ड ग्राहक") ||
      q.includes("database mein") || q.includes("हमारे ग्राहक")
    ) {
      const result = await pool.request().query(`
        SELECT 
          COUNT(DISTINCT CustomerName) AS TotalCustomers,
          COUNT(DISTINCT CASE WHEN DATEDIFF(DAY, MAX(OrderDate), GETDATE()) <= 30 THEN CustomerName END) AS ActiveCustomers30Days,
          COUNT(DISTINCT CASE WHEN DATEDIFF(DAY, MAX(OrderDate), GETDATE()) <= 90 THEN CustomerName END) AS ActiveCustomers90Days
        FROM OrdersTemp
      `);
      
      const data = result.recordset[0];
      const totalCustomers = data.TotalCustomers || 0;
      const active30Days = data.ActiveCustomers30Days || 0;
      const active90Days = data.ActiveCustomers90Days || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `👥 हमारे डेटाबेस में कुल ग्राहक:\n` +
                `• कुल रजिस्टर्ड: ${formatNumber(totalCustomers, 'hindi')}\n` +
                `• एक्टिव (30 दिन): ${formatNumber(active30Days, 'hindi')}\n` +
                `• एक्टिव (90 दिन): ${formatNumber(active90Days, 'hindi')}`;
      } else {
        answer = `👥 Total customers in our database:\n` +
                `• Total Registered: ${formatNumber(totalCustomers, 'english')}\n` +
                `• Active (30 days): ${formatNumber(active30Days, 'english')}\n` +
                `• Active (90 days): ${formatNumber(active90Days, 'english')}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { totalCustomers, active30Days, active90Days }
      });
    }

    // 1.9 Staff Efficiency: "Sabse behtar delivery boy kaun raha hai jisne max orders poore kiye?"
    if (
      q.includes("staff efficiency") || q.includes("best delivery boy") || 
      q.includes("सबसे अच्छा") || q.includes("डिलीवरी बॉय") ||
      q.includes("max orders") || q.includes("बेहतर स्टाफ")
    ) {
      const result = await pool.request().query(`
        SELECT TOP 5 
          DeliveryBoyName,
          COUNT(*) AS TotalDeliveries,
          SUM(CASE WHEN DeliveryStatus = 'Complete' THEN 1 ELSE 0 END) AS SuccessfulDeliveries,
          SUM(CASE WHEN DeliveryStatus = 'Cancel' THEN 1 ELSE 0 END) AS CancelledDeliveries,
          AVG(DATEDIFF(MINUTE, DeliveryStartTime, DeliveryEndTime)) AS AvgDeliveryTime
        FROM AssignedOrders
        WHERE DeliveryBoyName IS NOT NULL AND DeliveryBoyName != ''
        GROUP BY DeliveryBoyName
        ORDER BY SuccessfulDeliveries DESC
      `);
      
      const deliveryBoys = result.recordset;
      
      if (deliveryBoys.length === 0) {
        let answer = language === 'hindi'
          ? "🚚 फिलहाल कोई डिलीवरी बॉय डेटा उपलब्ध नहीं है।"
          : "🚚 No delivery boy data available at the moment.";
        
        return res.json({ success: true, answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}` });
      }
      
      let answer;
      if (language === 'hindi') {
        answer = `👨‍💼 सबसे कुशल डिलीवरी बॉय:\n\n`;
        deliveryBoys.forEach((boy, index) => {
          answer += `${index + 1}. ${boy.DeliveryBoyName}\n`;
          answer += `   • सफल डिलीवरी: ${boy.SuccessfulDeliveries}\n`;
          answer += `   • कुल डिलीवरी: ${boy.TotalDeliveries}\n`;
          answer += `   • कैंसल: ${boy.CancelledDeliveries}\n`;
          answer += `   • सफलता दर: ${((boy.SuccessfulDeliveries/boy.TotalDeliveries)*100).toFixed(1)}%\n\n`;
        });
      } else {
        answer = `👨‍💼 Most Efficient Delivery Boys:\n\n`;
        deliveryBoys.forEach((boy, index) => {
          answer += `${index + 1}. ${boy.DeliveryBoyName}\n`;
          answer += `   • Successful: ${boy.SuccessfulDeliveries}\n`;
          answer += `   • Total: ${boy.TotalDeliveries}\n`;
          answer += `   • Cancelled: ${boy.CancelledDeliveries}\n`;
          answer += `   • Success Rate: ${((boy.SuccessfulDeliveries/boy.TotalDeliveries)*100).toFixed(1)}%\n\n`;
        });
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { deliveryBoys }
      });
    }

    // ==============================================
    // SECTION 2: DATE & MONTH REPORTS
    // ==============================================
    
    // 2.1 "Aaj total kitne orders aaye?"
    if (q.includes("aaj total") || (q.includes("today") && q.includes("order"))) {
      const today = new Date().toISOString().split('T')[0];
      
      const result = await pool.request()
        .input("today", sql.Date, today)
        .query(`
          SELECT 
            COUNT(*) AS TodayOrders,
            SUM(i.Total) AS TodaySales,
            COUNT(DISTINCT o.CustomerName) AS TodayCustomers
          FROM OrdersTemp o
          LEFT JOIN orderItems i ON o.OrderID = i.OrderID
          WHERE CAST(o.OrderDate AS DATE) = @today
        `);
      
      const data = result.recordset[0];
      const todayOrders = data.TodayOrders || 0;
      const todaySales = data.TodaySales || 0;
      const todayCustomers = data.TodayCustomers || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `📅 आज की रिपोर्ट:\n` +
                `• कुल ऑर्डर: ${todayOrders}\n` +
                `• कुल बिक्री: ₹${formatNumber(todaySales, 'hindi')}\n` +
                `• ग्राहक: ${todayCustomers}`;
      } else {
        answer = `📅 Today's Report:\n` +
                `• Total Orders: ${todayOrders}\n` +
                `• Total Sales: ₹${formatNumber(todaySales, 'english')}\n` +
                `• Customers: ${todayCustomers}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { todayOrders, todaySales, todayCustomers }
      });
    }

    // 2.2 "Kal ki total sales kitni thi?"
    if (q.includes("kal ki") || (q.includes("yesterday") && q.includes("sales"))) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const result = await pool.request()
        .input("yesterday", sql.Date, yesterdayStr)
        .query(`
          SELECT 
            SUM(i.Total) AS YesterdaySales,
            COUNT(*) AS YesterdayOrders
          FROM OrdersTemp o
          LEFT JOIN orderItems i ON o.OrderID = i.OrderID
          WHERE CAST(o.OrderDate AS DATE) = @yesterday
        `);
      
      const data = result.recordset[0];
      const yesterdaySales = data.YesterdaySales || 0;
      const yesterdayOrders = data.YesterdayOrders || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `📅 कल की बिक्री:\n` +
                `• कुल बिक्री: ₹${formatNumber(yesterdaySales, 'hindi')}\n` +
                `• कुल ऑर्डर: ${yesterdayOrders}`;
      } else {
        answer = `📅 Yesterday's Sales:\n` +
                `• Total Sales: ₹${formatNumber(yesterdaySales, 'english')}\n` +
                `• Total Orders: ${yesterdayOrders}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { yesterdaySales, yesterdayOrders }
      });
    }

    // 2.3 "4 February ko kitne order mile the?"
    if (q.includes("ko kitne") || q.includes("date specific")) {
      const dateInfo = extractDate(question);
      
      if (dateInfo) {
        const { day, month, year } = dateInfo;
        const monthName = getMonthName(month, language);
        
        const result = await pool.request()
          .input("year", sql.Int, year)
          .input("month", sql.Int, month)
          .input("day", sql.Int, day)
          .query(`
            SELECT 
              COUNT(*) AS OrdersOnDate,
              SUM(i.Total) AS SalesOnDate,
              COUNT(DISTINCT o.CustomerName) AS CustomersOnDate
            FROM OrdersTemp o
            LEFT JOIN orderItems i ON o.OrderID = i.OrderID
            WHERE DAY(o.OrderDate) = @day 
              AND MONTH(o.OrderDate) = @month 
              AND YEAR(o.OrderDate) = @year
          `);
        
        const data = result.recordset[0];
        const ordersOnDate = data.OrdersOnDate || 0;
        const salesOnDate = data.SalesOnDate || 0;
        const customersOnDate = data.CustomersOnDate || 0;
        
        let answer;
        if (language === 'hindi') {
          answer = `📅 ${day} ${monthName} ${year} का रिपोर्ट:\n` +
                  `• कुल ऑर्डर: ${ordersOnDate}\n` +
                  `• कुल बिक्री: ₹${formatNumber(salesOnDate, 'hindi')}\n` +
                  `• ग्राहक: ${customersOnDate}`;
        } else {
          answer = `📅 Report for ${day} ${monthName} ${year}:\n` +
                  `• Total Orders: ${ordersOnDate}\n` +
                  `• Total Sales: ₹${formatNumber(salesOnDate, 'english')}\n` +
                  `• Customers: ${customersOnDate}`;
        }
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
          data: { ordersOnDate, salesOnDate, customersOnDate }
        });
      }
    }

    // 2.4 "January mahine mein total kitni kamai (revenue) hui?"
    // controllers/aiController.js में SECTION 2.4 को update करें:

// ==============================================
// 2.4 MONTHLY SALES REVENUE (e.g., "January mein kitni sales hui?")
// ==============================================
if (
  (q.includes("sale") || q.includes("sales") || q.includes("बिक्री") || q.includes("कमाई") || q.includes("revenue") || q.includes("में कितनी") || q.includes("कितनी हुई")) && 
  (
    q.includes("january") || q.includes("february") || q.includes("march") ||
    q.includes("april") || q.includes("may") || q.includes("june") ||
    q.includes("july") || q.includes("august") || q.includes("september") ||
    q.includes("october") || q.includes("november") || q.includes("december") ||
    q.includes("जनवरी") || q.includes("फरवरी") || q.includes("मार्च") ||
    q.includes("अप्रैल") || q.includes("मई") || q.includes("जून") ||
    q.includes("जुलाई") || q.includes("अगस्त") || q.includes("सितंबर") ||
    q.includes("अक्टूबर") || q.includes("नवंबर") || q.includes("दिसंबर") ||
    q.includes("month") || q.includes("महीने") || q.includes("मासिक")
  )
) {
  const month = extractMonth(question);
  const year = extractYear(question);
  
  if (!month) {
    let errorMsg = language === 'hindi'
      ? "कृपया स्पष्ट महीना बताएं (जैसे: जनवरी में बिक्री कितनी हुई?)"
      : "Please specify a clear month (e.g., sales in January?)";
    
    return res.json({ 
      success: true, 
      answer: `${getPersonalizedGreeting(language)}\n\n${errorMsg}${getSignature(language)}`
    });
  }

  const monthName = getMonthName(month, language);
  
  const result = await pool.request()
    .input("month", sql.Int, month)
    .input("year", sql.Int, year)
    .query(`
      SELECT SUM(i.Total) AS MonthlySales
      FROM OrdersTemp o
      JOIN orderItems i ON o.OrderID = i.OrderID
      WHERE MONTH(o.OrderDate) = @month 
        AND YEAR(o.OrderDate) = @year
    `);
  
  const monthlySales = result.recordset[0].MonthlySales || 0;
  
  let answer;
  if (language === 'hindi') {
    answer = `💰 ${monthName} ${year} में कुल बिक्री: ₹${formatNumber(monthlySales, 'hindi')}`;
  } else {
    answer = `💰 Total sales in ${monthName} ${year}: ₹${formatNumber(monthlySales, 'english')}`;
  }
  
  return res.json({ 
    success: true, 
    answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
    data: { 
      month: monthName,
      year: year,
      monthlySales: monthlySales,
      analyzedBy: language === 'hindi' ? `${MY_NAME} का मासिक बिक्री विश्लेषण` : `${MY_NAME}'s Monthly Sales Analysis`
    }
  });
}

    // 2.5 "Is hafte total kitne orders deliver hue?"
    if (q.includes("hafta") || q.includes("week") || q.includes("वीक") || q.includes("सप्ताह")) {
      const result = await pool.request().query(`
        SELECT 
          COUNT(*) AS WeeklyDeliveries,
          SUM(CASE WHEN DeliveryStatus = 'Complete' THEN 1 ELSE 0 END) AS Successful,
          SUM(CASE WHEN DeliveryStatus = 'Cancel' THEN 1 ELSE 0 END) AS Cancelled,
          SUM(CASE WHEN DeliveryStatus NOT IN ('Complete', 'Cancel') THEN 1 ELSE 0 END) AS Pending
        FROM AssignedOrders
        WHERE DATEPART(WEEK, DeliveryDate) = DATEPART(WEEK, GETDATE())
          AND DATEPART(YEAR, DeliveryDate) = DATEPART(YEAR, GETDATE())
      `);
      
      const data = result.recordset[0];
      const weeklyDeliveries = data.WeeklyDeliveries || 0;
      const successful = data.Successful || 0;
      const cancelled = data.Cancelled || 0;
      const pending = data.Pending || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `📅 इस सप्ताह की डिलीवरी रिपोर्ट:\n` +
                `• कुल डिलीवरी: ${weeklyDeliveries}\n` +
                `• सफल: ${successful}\n` +
                `• कैंसल: ${cancelled}\n` +
                `• पेंडिंग: ${pending}`;
      } else {
        answer = `📅 This Week's Delivery Report:\n` +
                `• Total Deliveries: ${weeklyDeliveries}\n` +
                `• Successful: ${successful}\n` +
                `• Cancelled: ${cancelled}\n` +
                `• Pending: ${pending}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { weeklyDeliveries, successful, cancelled, pending }
      });
    }

    // 2.6 "Pichle mahine ke muqable is mahine sales kitni up ya down hai?"
    if (q.includes("muqable") || q.includes("comparison") || q.includes("up down") || q.includes("तुलना")) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      let lastMonth = currentMonth - 1;
      let lastMonthYear = currentYear;
      if (lastMonth === 0) {
        lastMonth = 12;
        lastMonthYear = currentYear - 1;
      }
      
      const currentMonthName = getMonthName(currentMonth, language);
      const lastMonthName = getMonthName(lastMonth, language);
      
      const [currentMonthResult, lastMonthResult] = await Promise.all([
        pool.request()
          .input("month", sql.Int, currentMonth)
          .input("year", sql.Int, currentYear)
          .query(`
            SELECT 
              SUM(i.Total) AS CurrentSales,
              COUNT(*) AS CurrentOrders
            FROM OrdersTemp o
            LEFT JOIN orderItems i ON o.OrderID = i.OrderID
            WHERE MONTH(o.OrderDate) = @month 
              AND YEAR(o.OrderDate) = @year
          `),
        pool.request()
          .input("month", sql.Int, lastMonth)
          .input("year", sql.Int, lastMonthYear)
          .query(`
            SELECT 
              SUM(i.Total) AS LastMonthSales,
              COUNT(*) AS LastMonthOrders
            FROM OrdersTemp o
            LEFT JOIN orderItems i ON o.OrderID = i.OrderID
            WHERE MONTH(o.OrderDate) = @month 
              AND YEAR(o.OrderDate) = @year
          `)
      ]);
      
      const currentData = currentMonthResult.recordset[0];
      const lastData = lastMonthResult.recordset[0];
      
      const currentSales = currentData.CurrentSales || 0;
      const currentOrders = currentData.CurrentOrders || 0;
      const lastSales = lastData.LastMonthSales || 0;
      const lastOrders = lastData.LastMonthOrders || 0;
      
      const salesDifference = currentSales - lastSales;
      const ordersDifference = currentOrders - lastOrders;
      
      const salesPercentage = lastSales > 0 ? ((salesDifference / lastSales) * 100).toFixed(1) : 0;
      const ordersPercentage = lastOrders > 0 ? ((ordersDifference / lastOrders) * 100).toFixed(1) : 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `📈 ${lastMonthName} vs ${currentMonthName} तुलना:\n\n` +
                `💰 बिक्री:\n` +
                `• ${currentMonthName}: ₹${formatNumber(currentSales, 'hindi')}\n` +
                `• ${lastMonthName}: ₹${formatNumber(lastSales, 'hindi')}\n` +
                `• अंतर: ₹${formatNumber(salesDifference, 'hindi')} (${salesPercentage}%)\n\n` +
                `📊 ऑर्डर:\n` +
                `• ${currentMonthName}: ${currentOrders}\n` +
                `• ${lastMonthName}: ${lastOrders}\n` +
                `• अंतर: ${ordersDifference} (${ordersPercentage}%)`;
      } else {
        answer = `📈 ${lastMonthName} vs ${currentMonthName} Comparison:\n\n` +
                `💰 Sales:\n` +
                `• ${currentMonthName}: ₹${formatNumber(currentSales, 'english')}\n` +
                `• ${lastMonthName}: ₹${formatNumber(lastSales, 'english')}\n` +
                `• Difference: ₹${formatNumber(salesDifference, 'english')} (${salesPercentage}%)\n\n` +
                `📊 Orders:\n` +
                `• ${currentMonthName}: ${currentOrders}\n` +
                `• ${lastMonthName}: ${lastOrders}\n` +
                `• Difference: ${ordersDifference} (${ordersPercentage}%)`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { currentSales, lastSales, currentOrders, lastOrders, salesDifference, ordersDifference, salesPercentage, ordersPercentage }
      });
    }

    // ==============================================
    // SECTION 3: CUSTOMER INTELLIGENCE
    // ==============================================
    
    // 3.1 "Hamara sabse bada customer kaun hai?"
    if (q.includes("sabse bada customer") || q.includes("biggest customer") || q.includes("बड़ा ग्राहक")) {
      const result = await pool.request().query(`
        SELECT TOP 1 
          CustomerName,
          COUNT(*) AS TotalOrders,
          SUM(i.Total) AS TotalSpent,
          MAX(o.OrderDate) AS LastOrderDate
        FROM OrdersTemp o
        LEFT JOIN orderItems i ON o.OrderID = i.OrderID
        GROUP BY CustomerName
        ORDER BY TotalSpent DESC
      `);
      
      const customer = result.recordset[0];
      
      if (!customer) {
        let answer = language === 'hindi'
          ? "👤 फिलहाल कोई ग्राहक डेटा उपलब्ध नहीं है।"
          : "👤 No customer data available at the moment.";
        
        return res.json({ success: true, answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}` });
      }
      
      const lastOrderDate = new Date(customer.LastOrderDate);
      const daysSinceLastOrder = Math.floor((new Date() - lastOrderDate) / (1000 * 60 * 60 * 24));
      
      let answer;
      if (language === 'hindi') {
        answer = `👑 हमारा सबसे बड़ा ग्राहक:\n` +
                `• नाम: ${customer.CustomerName}\n` +
                `• कुल खर्च: ₹${formatNumber(customer.TotalSpent, 'hindi')}\n` +
                `• कुल ऑर्डर: ${customer.TotalOrders}\n` +
                `• आखिरी ऑर्डर: ${daysSinceLastOrder} दिन पहले`;
      } else {
        answer = `👑 Our Biggest Customer:\n` +
                `• Name: ${customer.CustomerName}\n` +
                `• Total Spent: ₹${formatNumber(customer.TotalSpent, 'english')}\n` +
                `• Total Orders: ${customer.TotalOrders}\n` +
                `• Last Order: ${daysSinceLastOrder} days ago`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { customer }
      });
    }

    // 3.2 "Top 5 customers dikhao jo sabse zyada maal kharidte hain."
    if (q.includes("top 5 customers") || q.includes("top five") || q.includes("टॉप 5")) {
      const result = await pool.request().query(`
        SELECT TOP 5 
          CustomerName,
          COUNT(*) AS TotalOrders,
          SUM(i.Total) AS TotalSpent,
          MAX(o.OrderDate) AS LastOrderDate,
          AVG(i.Total) AS AvgOrderValue
        FROM OrdersTemp o
        LEFT JOIN orderItems i ON o.OrderID = i.OrderID
        GROUP BY CustomerName
        ORDER BY TotalSpent DESC
      `);
      
      const customers = result.recordset;
      
      if (customers.length === 0) {
        let answer = language === 'hindi'
          ? "👤 फिलहाल कोई ग्राहक डेटा उपलब्ध नहीं है।"
          : "👤 No customer data available at the moment.";
        
        return res.json({ success: true, answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}` });
      }
      
      let answer;
      if (language === 'hindi') {
        answer = `🏆 टॉप 5 ग्राहक (सबसे ज्यादा खर्च):\n\n`;
        customers.forEach((cust, index) => {
          const lastOrderDate = new Date(cust.LastOrderDate);
          const daysAgo = Math.floor((new Date() - lastOrderDate) / (1000 * 60 * 60 * 24));
          
          answer += `${index + 1}. ${cust.CustomerName}\n`;
          answer += `   • कुल खर्च: ₹${formatNumber(cust.TotalSpent, 'hindi')}\n`;
          answer += `   • ऑर्डर: ${cust.TotalOrders}\n`;
          answer += `   • औसत ऑर्डर: ₹${formatNumber(cust.AvgOrderValue, 'hindi')}\n`;
          answer += `   • आखिरी ऑर्डर: ${daysAgo} दिन पहले\n\n`;
        });
      } else {
        answer = `🏆 Top 5 Customers (Highest Spending):\n\n`;
        customers.forEach((cust, index) => {
          const lastOrderDate = new Date(cust.LastOrderDate);
          const daysAgo = Math.floor((new Date() - lastOrderDate) / (1000 * 60 * 60 * 24));
          
          answer += `${index + 1}. ${cust.CustomerName}\n`;
          answer += `   • Total Spent: ₹${formatNumber(cust.TotalSpent, 'english')}\n`;
          answer += `   • Orders: ${cust.TotalOrders}\n`;
          answer += `   • Avg Order: ₹${formatNumber(cust.AvgOrderValue, 'english')}\n`;
          answer += `   • Last Order: ${daysAgo} days ago\n\n`;
        });
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { customers }
      });
    }

    // 3.3 "Kaunse customers ne pichle 15 din se koi order nahi diya?"
    if (q.includes("15 din") || q.includes("inactive customers") || q.includes("निष्क्रिय ग्राहक")) {
      const result = await pool.request().query(`
        SELECT DISTINCT 
          CustomerName,
          MAX(o.OrderDate) AS LastOrderDate,
          DATEDIFF(DAY, MAX(o.OrderDate), GETDATE()) AS DaysSinceLastOrder,
          COUNT(*) AS TotalOrders,
          SUM(i.Total) AS TotalSpent
        FROM OrdersTemp o
        LEFT JOIN orderItems i ON o.OrderID = i.OrderID
        GROUP BY CustomerName
        HAVING DATEDIFF(DAY, MAX(o.OrderDate), GETDATE()) > 15
        ORDER BY DaysSinceLastOrder DESC
      `);
      
      const inactiveCustomers = result.recordset;
      
      if (inactiveCustomers.length === 0) {
        let answer = language === 'hindi'
          ? "👤 पिछले 15 दिनों से सभी ग्राहक एक्टिव हैं। कोई निष्क्रिय ग्राहक नहीं मिला।"
          : "👤 All customers have been active in the last 15 days. No inactive customers found.";
        
        return res.json({ success: true, answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}` });
      }
      
      let answer;
      if (language === 'hindi') {
        answer = `📉 पिछले 15+ दिनों से निष्क्रिय ग्राहक:\n\n`;
        inactiveCustomers.slice(0, 10).forEach((cust, index) => {
          answer += `${index + 1}. ${cust.CustomerName}\n`;
          answer += `   • आखिरी ऑर्डर: ${cust.DaysSinceLastOrder} दिन पहले\n`;
          answer += `   • कुल ऑर्डर: ${cust.TotalOrders}\n`;
          answer += `   • कुल खर्च: ₹${formatNumber(cust.TotalSpent, 'hindi')}\n\n`;
        });
        
        if (inactiveCustomers.length > 10) {
          answer += `\n... और ${inactiveCustomers.length - 10} और ग्राहक`;
        }
      } else {
        answer = `📉 Inactive Customers (15+ days):\n\n`;
        inactiveCustomers.slice(0, 10).forEach((cust, index) => {
          answer += `${index + 1}. ${cust.CustomerName}\n`;
          answer += `   • Last Order: ${cust.DaysSinceLastOrder} days ago\n`;
          answer += `   • Total Orders: ${cust.TotalOrders}\n`;
          answer += `   • Total Spent: ₹${formatNumber(cust.TotalSpent, 'english')}\n\n`;
        });
        
        if (inactiveCustomers.length > 10) {
          answer += `\n... and ${inactiveCustomers.length - 10} more customers`;
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { inactiveCustomers: inactiveCustomers.slice(0, 10), totalInactive: inactiveCustomers.length }
      });
    }

    // 3.4 "Civil Lines area mein kitne naye customers jude hain?"
    if (q.includes("naye customers") || q.includes("new customers") || q.includes("नए ग्राहक")) {
      const area = extractArea(question);
      const areaFilter = area ? `AND o.Area LIKE '%${area}%'` : '';
      
      const result = await pool.request().query(`
        SELECT 
          o.CustomerName,
          MIN(o.OrderDate) AS FirstOrderDate,
          COUNT(*) AS TotalOrders,
          SUM(i.Total) AS TotalSpent,
          o.Area
        FROM OrdersTemp o
        LEFT JOIN orderItems i ON o.OrderID = i.OrderID
        WHERE DATEDIFF(DAY, o.OrderDate, GETDATE()) <= 30
          ${areaFilter}
        GROUP BY o.CustomerName, o.Area
        HAVING COUNT(*) = 1
        ORDER BY FirstOrderDate DESC
      `);
      
      const newCustomers = result.recordset;
      
      let answer;
      if (language === 'hindi') {
        if (area) {
          answer = `🆕 पिछले 30 दिनों में ${area} में नए ग्राहक:\n\n`;
        } else {
          answer = `🆕 पिछले 30 दिनों में नए ग्राहक:\n\n`;
        }
        
        if (newCustomers.length === 0) {
          answer += "कोई नया ग्राहक नहीं जुड़ा।";
        } else {
          newCustomers.slice(0, 10).forEach((cust, index) => {
            const joinDate = new Date(cust.FirstOrderDate);
            const daysAgo = Math.floor((new Date() - joinDate) / (1000 * 60 * 60 * 24));
            
            answer += `${index + 1}. ${cust.CustomerName}\n`;
            answer += `   • एरिया: ${cust.Area}\n`;
            answer += `   • जुड़े: ${daysAgo} दिन पहले\n`;
            answer += `   • पहला ऑर्डर: ₹${formatNumber(cust.TotalSpent, 'hindi')}\n\n`;
          });
          
          if (newCustomers.length > 10) {
            answer += `\n... और ${newCustomers.length - 10} और ग्राहक`;
          }
        }
      } else {
        if (area) {
          answer = `🆕 New Customers in ${area} (last 30 days):\n\n`;
        } else {
          answer = `🆕 New Customers (last 30 days):\n\n`;
        }
        
        if (newCustomers.length === 0) {
          answer += "No new customers joined.";
        } else {
          newCustomers.slice(0, 10).forEach((cust, index) => {
            const joinDate = new Date(cust.FirstOrderDate);
            const daysAgo = Math.floor((new Date() - joinDate) / (1000 * 60 * 60 * 24));
            
            answer += `${index + 1}. ${cust.CustomerName}\n`;
            answer += `   • Area: ${cust.Area}\n`;
            answer += `   • Joined: ${daysAgo} days ago\n`;
            answer += `   • First Order: ₹${formatNumber(cust.TotalSpent, 'english')}\n\n`;
          });
          
          if (newCustomers.length > 10) {
            answer += `\n... and ${newCustomers.length - 10} more customers`;
          }
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { newCustomers: newCustomers.slice(0, 10), totalNew: newCustomers.length }
      });
    }

    // 3.5 "January mein sabse zyada orders dene wala customer kaun tha?"
    if (q.includes("sabse zyada orders") || q.includes("most orders") || q.includes("ज़्यादा ऑर्डर")) {
      const month = extractMonth(question);
      const year = extractYear(question);
      const monthName = month ? getMonthName(month, language) : "इस महीने";
      
      let query = `
        SELECT TOP 1
          o.CustomerName,
          COUNT(*) AS MonthlyOrders,
          SUM(i.Total) AS MonthlySpent,
          o.Area
        FROM OrdersTemp o
        LEFT JOIN orderItems i ON o.OrderID = i.OrderID
      `;
      
      if (month) {
        query += `WHERE MONTH(o.OrderDate) = ${month} AND YEAR(o.OrderDate) = ${year} `;
      } else {
        query += `WHERE MONTH(o.OrderDate) = MONTH(GETDATE()) AND YEAR(o.OrderDate) = YEAR(GETDATE()) `;
      }
      
      query += `GROUP BY o.CustomerName, o.Area ORDER BY MonthlyOrders DESC`;
      
      const result = await pool.request().query(query);
      const customer = result.recordset[0];
      
      if (!customer) {
        let answer = language === 'hindi'
          ? `📊 ${monthName} में कोई ग्राहक डेटा उपलब्ध नहीं है।`
          : `📊 No customer data available for ${monthName}.`;
        
        return res.json({ success: true, answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}` });
      }
      
      let answer;
      if (language === 'hindi') {
        answer = `👑 ${monthName} में सबसे ज्यादा ऑर्डर देने वाला ग्राहक:\n` +
                `• नाम: ${customer.CustomerName}\n` +
                `• ऑर्डर: ${customer.MonthlyOrders}\n` +
                `• खर्च: ₹${formatNumber(customer.MonthlySpent, 'hindi')}\n` +
                `• एरिया: ${customer.Area}`;
      } else {
        answer = `👑 Customer with Most Orders in ${monthName}:\n` +
                `• Name: ${customer.CustomerName}\n` +
                `• Orders: ${customer.MonthlyOrders}\n` +
                `• Spent: ₹${formatNumber(customer.MonthlySpent, 'english')}\n` +
                `• Area: ${customer.Area}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { customer }
      });
    }

    // ==============================================
    // SECTION 4: STOCK & INVENTORY
    // ==============================================
    
    // 4.1 "Warehouse mein abhi kitna maal bacha hai?"
    if (q.includes("warehouse") || q.includes("maal bacha") || q.includes("स्टॉक") || q.includes("इन्वेंटरी")) {
      const result = await pool.request().query(`
        SELECT 
          item_name,
          SUM(quantity) AS current_stock,
          MIN(rate) AS min_rate,
          MAX(rate) AS max_rate,
          SUM(quantity * rate) AS stock_value
        FROM Stock
        WHERE quantity > 0
        GROUP BY item_name
        ORDER BY item_name
      `);
      
      const stockItems = result.recordset;
      const totalStockValue = stockItems.reduce((sum, item) => sum + (item.stock_value || 0), 0);
      const totalUnits = stockItems.reduce((sum, item) => sum + (item.current_stock || 0), 0);
      
      let answer;
      if (language === 'hindi') {
        answer = `📦 वेयरहाउस में उपलब्ध स्टॉक:\n\n`;
        
        if (stockItems.length === 0) {
          answer += "कोई स्टॉक उपलब्ध नहीं है।";
        } else {
          stockItems.forEach((item, index) => {
            answer += `${index + 1}. ${item.item_name}\n`;
            answer += `   • मात्रा: ${formatNumber(item.current_stock, 'hindi')} यूनिट\n`;
            answer += `   • मूल्य: ₹${formatNumber(item.stock_value, 'hindi')}\n`;
            answer += `   • दर: ₹${item.min_rate} - ₹${item.max_rate}\n\n`;
          });
          
          answer += `💰 कुल स्टॉक मूल्य: ₹${formatNumber(totalStockValue, 'hindi')}\n`;
          answer += `📊 कुल यूनिट: ${formatNumber(totalUnits, 'hindi')}`;
        }
      } else {
        answer = `📦 Available Stock in Warehouse:\n\n`;
        
        if (stockItems.length === 0) {
          answer += "No stock available.";
        } else {
          stockItems.forEach((item, index) => {
            answer += `${index + 1}. ${item.item_name}\n`;
            answer += `   • Quantity: ${formatNumber(item.current_stock, 'english')} units\n`;
            answer += `   • Value: ₹${formatNumber(item.stock_value, 'english')}\n`;
            answer += `   • Rate: ₹${item.min_rate} - ₹${item.max_rate}\n\n`;
          });
          
          answer += `💰 Total Stock Value: ₹${formatNumber(totalStockValue, 'english')}\n`;
          answer += `📊 Total Units: ${formatNumber(totalUnits, 'english')}`;
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { stockItems, totalStockValue, totalUnits }
      });
    }

    // 4.2 "Tray aur Box ki current quantity kitni hai?"
    if (q.includes("tray") || q.includes("box") || q.includes("ट्रे") || q.includes("बॉक्स")) {
      const products = [];
      if (q.includes("tray") || q.includes("ट्रे")) products.push("Tray");
      if (q.includes("box") || q.includes("बॉक्स")) products.push("Box");
      if (q.includes("bottle") || q.includes("बोतल")) products.push("Bottle");
      
      if (products.length === 0) {
        products.push("Tray", "Box", "Bottle");
      }
      
      const placeholders = products.map((_, i) => `@product${i}`).join(',');
      const request = pool.request();
      
      products.forEach((product, index) => {
        request.input(`product${index}`, sql.NVarChar, `%${product}%`);
      });
      
      const result = await request.query(`
        SELECT 
          item_name,
          SUM(quantity) AS current_stock,
          SUM(quantity * rate) AS stock_value
        FROM Stock
        WHERE quantity > 0
          AND (${products.map((_, i) => `item_name LIKE @product${i}`).join(' OR ')})
        GROUP BY item_name
        ORDER BY item_name
      `);
      
      const stockItems = result.recordset;
      
      let answer;
      if (language === 'hindi') {
        answer = `📦 स्टॉक विवरण:\n\n`;
        
        if (stockItems.length === 0) {
          answer += "कोई स्टॉक उपलब्ध नहीं है।";
        } else {
          stockItems.forEach((item) => {
            answer += `• ${item.item_name}: ${formatNumber(item.current_stock, 'hindi')} यूनिट (₹${formatNumber(item.stock_value, 'hindi')})\n`;
          });
        }
      } else {
        answer = `📦 Stock Details:\n\n`;
        
        if (stockItems.length === 0) {
          answer += "No stock available.";
        } else {
          stockItems.forEach((item) => {
            answer += `• ${item.item_name}: ${formatNumber(item.current_stock, 'english')} units (₹${formatNumber(item.stock_value, 'english')})\n`;
          });
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { stockItems }
      });
    }

    // 4.3 "Kaunsa item khatam hone wala hai (Low stock alert)?"
    if (q.includes("khatam hone") || q.includes("low stock") || q.includes("खत्म") || q.includes("कम स्टॉक")) {
      const result = await pool.request().query(`
        SELECT 
          item_name,
          SUM(quantity) AS current_stock,
          MIN(reorder_level) AS reorder_level,
          MAX(rate) AS current_rate,
          SUM(quantity * rate) AS stock_value
        FROM Stock
        GROUP BY item_name
        HAVING SUM(quantity) <= 20
        ORDER BY current_stock ASC
      `);
      
      const lowStockItems = result.recordset;
      
      let answer;
      if (language === 'hindi') {
        answer = `⚠️  कम स्टॉक वाले आइटम (20 यूनिट से कम):\n\n`;
        
        if (lowStockItems.length === 0) {
          answer += "सभी आइटम पर्याप्त स्टॉक में हैं।";
        } else {
          lowStockItems.forEach((item, index) => {
            answer += `${index + 1}. ${item.item_name}\n`;
            answer += `   • वर्तमान: ${formatNumber(item.current_stock, 'hindi')} यूनिट\n`;
            answer += `   • रीऑर्डर स्तर: ${item.reorder_level || 10} यूनिट\n`;
            answer += `   • मूल्य: ₹${formatNumber(item.stock_value, 'hindi')}\n\n`;
          });
          
          answer += `⚠️  कृपया इन आइटम्स का रीऑर्डर करें।`;
        }
      } else {
        answer = `⚠️  Low Stock Items (less than 20 units):\n\n`;
        
        if (lowStockItems.length === 0) {
          answer += "All items have sufficient stock.";
        } else {
          lowStockItems.forEach((item, index) => {
            answer += `${index + 1}. ${item.item_name}\n`;
            answer += `   • Current: ${formatNumber(item.current_stock, 'english')} units\n`;
            answer += `   • Reorder Level: ${item.reorder_level || 10} units\n`;
            answer += `   • Value: ₹${formatNumber(item.stock_value, 'english')}\n\n`;
          });
          
          answer += `⚠️  Please reorder these items.`;
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { lowStockItems }
      });
    }

    // ==============================================
    // SECTION 5: FINANCIALS & PAYMENTS
    // ==============================================
    
    // 5.1 "Market mein total kitna outstanding (udhari) baki hai?"
    if (q.includes("outstanding") || q.includes("udhari") || q.includes("उधार") || q.includes("बकाया")) {
      const result = await pool.request().query(`
        SELECT 
          o.CustomerName,
          o.Area,
          SUM(op.Amount) AS OutstandingAmount,
          COUNT(DISTINCT ao.AssignID) AS OutstandingBills,
          MAX(ao.PaymentReceivedDate) AS LastPaymentDate,
          DATEDIFF(DAY, MAX(ao.PaymentReceivedDate), GETDATE()) AS DaysSinceLastPayment
        FROM OrderPayments op
        JOIN AssignedOrders ao ON op.AssignID = ao.AssignID
        JOIN OrdersTemp o ON ao.OrderID = o.OrderID
        WHERE ao.PaymentReceived = 0
        GROUP BY o.CustomerName, o.Area
        ORDER BY OutstandingAmount DESC
      `);
      
      const outstandingData = result.recordset;
      const totalOutstanding = outstandingData.reduce((sum, item) => sum + (item.OutstandingAmount || 0), 0);
      const totalBills = outstandingData.reduce((sum, item) => sum + (item.OutstandingBills || 0), 0);
      
      let answer;
      if (language === 'hindi') {
        answer = `💰 मार्केट में कुल बकाया राशि:\n` +
                `• कुल उधार: ₹${formatNumber(totalOutstanding, 'hindi')}\n` +
                `• कुल बिल: ${totalBills}\n` +
                `• ग्राहक: ${outstandingData.length}\n\n`;
        
        if (outstandingData.length > 0) {
          answer += `🏆 टॉप 5 बकाया ग्राहक:\n\n`;
          outstandingData.slice(0, 5).forEach((cust, index) => {
            answer += `${index + 1}. ${cust.CustomerName}\n`;
            answer += `   • एरिया: ${cust.Area}\n`;
            answer += `   • बकाया: ₹${formatNumber(cust.OutstandingAmount, 'hindi')}\n`;
            answer += `   • बिल: ${cust.OutstandingBills}\n`;
            answer += `   • आखिरी भुगतान: ${cust.DaysSinceLastPayment} दिन पहले\n\n`;
          });
        }
      } else {
        answer = `💰 Total Outstanding in Market:\n` +
                `• Total Outstanding: ₹${formatNumber(totalOutstanding, 'english')}\n` +
                `• Total Bills: ${totalBills}\n` +
                `• Customers: ${outstandingData.length}\n\n`;
        
        if (outstandingData.length > 0) {
          answer += `🏆 Top 5 Outstanding Customers:\n\n`;
          outstandingData.slice(0, 5).forEach((cust, index) => {
            answer += `${index + 1}. ${cust.CustomerName}\n`;
            answer += `   • Area: ${cust.Area}\n`;
            answer += `   • Outstanding: ₹${formatNumber(cust.OutstandingAmount, 'english')}\n`;
            answer += `   • Bills: ${cust.OutstandingBills}\n`;
            answer += `   • Last Payment: ${cust.DaysSinceLastPayment} days ago\n\n`;
          });
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { totalOutstanding, totalBills, topCustomers: outstandingData.slice(0, 5) }
      });
    }

    // 5.2 "Is mahine total kitna payment collect hua?"
    if (q.includes("payment collect") || q.includes("collection") || q.includes("कलेक्शन")) {
      const month = extractMonth(question) || new Date().getMonth() + 1;
      const year = extractYear(question) || new Date().getFullYear();
      const monthName = getMonthName(month, language);
      
      const result = await pool.request()
        .input("month", sql.Int, month)
        .input("year", sql.Int, year)
        .query(`
          SELECT 
            SUM(op.Amount) AS MonthlyCollection,
            COUNT(DISTINCT ao.AssignID) AS TotalBills,
            SUM(CASE WHEN op.PaymentMode = 'Cash' THEN op.Amount ELSE 0 END) AS CashCollection,
            SUM(CASE WHEN op.PaymentMode IN ('GPay', 'Paytm', 'Online', 'UPI') THEN op.Amount ELSE 0 END) AS OnlineCollection,
            COUNT(DISTINCT o.CustomerName) AS CustomersPaid
          FROM OrderPayments op
          JOIN AssignedOrders ao ON op.AssignID = ao.AssignID
          JOIN OrdersTemp o ON ao.OrderID = o.OrderID
          WHERE ao.PaymentReceived = 1
            AND MONTH(ao.PaymentReceivedDate) = @month
            AND YEAR(ao.PaymentReceivedDate) = @year
        `);
      
      const data = result.recordset[0];
      const monthlyCollection = data.MonthlyCollection || 0;
      const cashCollection = data.CashCollection || 0;
      const onlineCollection = data.OnlineCollection || 0;
      const totalBills = data.TotalBills || 0;
      const customersPaid = data.CustomersPaid || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `💰 ${monthName} ${year} में कलेक्शन रिपोर्ट:\n` +
                `• कुल कलेक्शन: ₹${formatNumber(monthlyCollection, 'hindi')}\n` +
                `• नकद: ₹${formatNumber(cashCollection, 'hindi')}\n` +
                `• ऑनलाइन: ₹${formatNumber(onlineCollection, 'hindi')}\n` +
                `• बिल: ${totalBills}\n` +
                `• ग्राहक: ${customersPaid}`;
      } else {
        answer = `💰 ${monthName} ${year} Collection Report:\n` +
                `• Total Collection: ₹${formatNumber(monthlyCollection, 'english')}\n` +
                `• Cash: ₹${formatNumber(cashCollection, 'english')}\n` +
                `• Online: ₹${formatNumber(onlineCollection, 'english')}\n` +
                `• Bills: ${totalBills}\n` +
                `• Customers: ${customersPaid}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { monthlyCollection, cashCollection, onlineCollection, totalBills, customersPaid }
      });
    }

    // 5.3 "GPay, Paytm aur Cash mein alag-alag kitna collection aaya?"
    if (q.includes("gpay") || q.includes("paytm") || q.includes("cash") || q.includes("payment mode")) {
      const result = await pool.request().query(`
        SELECT 
          op.PaymentMode,
          SUM(op.Amount) AS TotalAmount,
          COUNT(DISTINCT ao.AssignID) AS TotalTransactions,
          COUNT(DISTINCT o.CustomerName) AS TotalCustomers,
          AVG(op.Amount) AS AvgTransaction
        FROM OrderPayments op
        JOIN AssignedOrders ao ON op.AssignID = ao.AssignID
        JOIN OrdersTemp o ON ao.OrderID = o.OrderID
        WHERE ao.PaymentReceived = 1
        GROUP BY op.PaymentMode
        ORDER BY TotalAmount DESC
      `);
      
      const paymentModes = result.recordset;
      const totalCollection = paymentModes.reduce((sum, mode) => sum + (mode.TotalAmount || 0), 0);
      
      let answer;
      if (language === 'hindi') {
        answer = `💳 भुगतान मोड के अनुसार कलेक्शन:\n\n`;
        
        if (paymentModes.length === 0) {
          answer += "कोई कलेक्शन डेटा उपलब्ध नहीं है।";
        } else {
          paymentModes.forEach((mode) => {
            const percentage = totalCollection > 0 ? ((mode.TotalAmount / totalCollection) * 100).toFixed(1) : 0;
            
            answer += `• ${mode.PaymentMode}\n`;
            answer += `  ₹${formatNumber(mode.TotalAmount, 'hindi')} (${percentage}%)\n`;
            answer += `  ट्रांजैक्शन: ${mode.TotalTransactions}\n`;
            answer += `  ग्राहक: ${mode.TotalCustomers}\n`;
            answer += `  औसत: ₹${formatNumber(mode.AvgTransaction, 'hindi')}\n\n`;
          });
          
          answer += `💰 कुल कलेक्शन: ₹${formatNumber(totalCollection, 'hindi')}`;
        }
      } else {
        answer = `💳 Collection by Payment Mode:\n\n`;
        
        if (paymentModes.length === 0) {
          answer += "No collection data available.";
        } else {
          paymentModes.forEach((mode) => {
            const percentage = totalCollection > 0 ? ((mode.TotalAmount / totalCollection) * 100).toFixed(1) : 0;
            
            answer += `• ${mode.PaymentMode}\n`;
            answer += `  ₹${formatNumber(mode.TotalAmount, 'english')} (${percentage}%)\n`;
            answer += `  Transactions: ${mode.TotalTransactions}\n`;
            answer += `  Customers: ${mode.TotalCustomers}\n`;
            answer += `  Average: ₹${formatNumber(mode.AvgTransaction, 'english')}\n\n`;
          });
          
          answer += `💰 Total Collection: ₹${formatNumber(totalCollection, 'english')}`;
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { paymentModes, totalCollection }
      });
    }

    // 5.4 "Kaunse customers ka payment sabse zyada pending hai?"
    if (q.includes("sabse zyada pending") || q.includes("highest pending") || q.includes("ज़्यादा बकाया")) {
      const result = await pool.request().query(`
        SELECT TOP 10
          o.CustomerName,
          o.Area,
          SUM(op.Amount) AS TotalPending,
          COUNT(DISTINCT ao.AssignID) AS PendingBills,
          MAX(o.OrderDate) AS LastOrderDate,
          MIN(ao.PaymentReceivedDate) AS FirstPaymentDate,
          DATEDIFF(DAY, MAX(o.OrderDate), GETDATE()) AS DaysSinceLastOrder
        FROM OrderPayments op
        JOIN AssignedOrders ao ON op.AssignID = ao.AssignID
        JOIN OrdersTemp o ON ao.OrderID = o.OrderID
        WHERE ao.PaymentReceived = 0
        GROUP BY o.CustomerName, o.Area
        ORDER BY TotalPending DESC
      `);
      
      const pendingCustomers = result.recordset;
      
      let answer;
      if (language === 'hindi') {
        answer = `⚠️  सबसे ज्यादा बकाया वाले ग्राहक:\n\n`;
        
        if (pendingCustomers.length === 0) {
          answer += "कोई बकाया नहीं है। सभी भुगतान प्राप्त हो चुके हैं।";
        } else {
          pendingCustomers.forEach((cust, index) => {
            answer += `${index + 1}. ${cust.CustomerName}\n`;
            answer += `   • एरिया: ${cust.Area}\n`;
            answer += `   • बकाया: ₹${formatNumber(cust.TotalPending, 'hindi')}\n`;
            answer += `   • बिल: ${cust.PendingBills}\n`;
            answer += `   • आखिरी ऑर्डर: ${cust.DaysSinceLastOrder} दिन पहले\n\n`;
          });
          
          answer += `💰 कुल बकाया: ₹${formatNumber(pendingCustomers.reduce((sum, cust) => sum + cust.TotalPending, 0), 'hindi')}`;
        }
      } else {
        answer = `⚠️  Customers with Highest Pending Payments:\n\n`;
        
        if (pendingCustomers.length === 0) {
          answer += "No pending payments. All payments received.";
        } else {
          pendingCustomers.forEach((cust, index) => {
            answer += `${index + 1}. ${cust.CustomerName}\n`;
            answer += `   • Area: ${cust.Area}\n`;
            answer += `   • Pending: ₹${formatNumber(cust.TotalPending, 'english')}\n`;
            answer += `   • Bills: ${cust.PendingBills}\n`;
            answer += `   • Last Order: ${cust.DaysSinceLastOrder} days ago\n\n`;
          });
          
          answer += `💰 Total Pending: ₹${formatNumber(pendingCustomers.reduce((sum, cust) => sum + cust.TotalPending, 0), 'english')}`;
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { pendingCustomers }
      });
    }

    // ==============================================
    // SECTION 6: DELIVERY BOY PERFORMANCE
    // ==============================================
    
    // 6.1 "Aaj total kitni deliveries pending hain?"
    if (q.includes("deliveries pending") || q.includes("पेंडिंग डिलीवरी")) {
      const today = new Date().toISOString().split('T')[0];
      
      const result = await pool.request()
        .input("today", sql.Date, today)
        .query(`
          SELECT 
            COUNT(*) AS TodayPending,
            DeliveryBoyName,
            COUNT(CASE WHEN DeliveryStatus = 'Pending' THEN 1 END) AS PendingCount,
            COUNT(CASE WHEN DeliveryStatus = 'In Transit' THEN 1 END) AS InTransitCount
          FROM AssignedOrders
          WHERE CAST(DeliveryDate AS DATE) = @today
            AND DeliveryStatus NOT IN ('Complete', 'Cancel')
          GROUP BY DeliveryBoyName
          ORDER BY TodayPending DESC
        `);
      
      const pendingData = result.recordset;
      const totalPending = pendingData.reduce((sum, item) => sum + (item.TodayPending || 0), 0);
      
      let answer;
      if (language === 'hindi') {
        answer = `📦 आज की पेंडिंग डिलीवरी:\n` +
                `• कुल पेंडिंग: ${totalPending}\n\n`;
        
        if (pendingData.length > 0) {
          answer += `👨‍💼 डिलीवरी बॉय के अनुसार:\n\n`;
          pendingData.forEach((boy) => {
            answer += `• ${boy.DeliveryBoyName || 'अनअसाइंड'}\n`;
            answer += `  पेंडिंग: ${boy.PendingCount || 0}\n`;
            answer += `  इन ट्रांजिट: ${boy.InTransitCount || 0}\n`;
            answer += `  कुल: ${boy.TodayPending}\n\n`;
          });
        }
      } else {
        answer = `📦 Today's Pending Deliveries:\n` +
                `• Total Pending: ${totalPending}\n\n`;
        
        if (pendingData.length > 0) {
          answer += `👨‍💼 By Delivery Boy:\n\n`;
          pendingData.forEach((boy) => {
            answer += `• ${boy.DeliveryBoyName || 'Unassigned'}\n`;
            answer += `  Pending: ${boy.PendingCount || 0}\n`;
            answer += `  In Transit: ${boy.InTransitCount || 0}\n`;
            answer += `  Total: ${boy.TodayPending}\n\n`;
          });
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { totalPending, pendingData }
      });
    }

    // 6.2 "Rahul ne aaj kitne orders complete kiye?"
    if (q.includes("ne aaj") || q.includes("complete kiye") || q.includes("delivery boy")) {
      const deliveryBoy = extractDeliveryBoy(question) || "";
      const today = new Date().toISOString().split('T')[0];
      
      const result = await pool.request()
        .input("today", sql.Date, today)
        .input("boy", sql.NVarChar, deliveryBoy)
        .query(`
          SELECT 
            COUNT(*) AS TodayDeliveries,
            SUM(CASE WHEN DeliveryStatus = 'Complete' THEN 1 ELSE 0 END) AS Completed,
            SUM(CASE WHEN DeliveryStatus = 'Cancel' THEN 1 ELSE 0 END) AS Cancelled,
            SUM(CASE WHEN DeliveryStatus = 'Pending' THEN 1 ELSE 0 END) AS Pending,
            SUM(CASE WHEN DeliveryStatus = 'In Transit' THEN 1 ELSE 0 END) AS InTransit,
            AVG(DATEDIFF(MINUTE, DeliveryStartTime, DeliveryEndTime)) AS AvgDeliveryTime
          FROM AssignedOrders
          WHERE CAST(DeliveryDate AS DATE) = @today
            AND (@boy = '' OR DeliveryBoyName = @boy)
        `);
      
      const data = result.recordset[0];
      const todayDeliveries = data.TodayDeliveries || 0;
      const completed = data.Completed || 0;
      const cancelled = data.Cancelled || 0;
      const pending = data.Pending || 0;
      const inTransit = data.InTransit || 0;
      const avgTime = data.AvgDeliveryTime ? Math.round(data.AvgDeliveryTime) : 0;
      
      let answer;
      if (language === 'hindi') {
        if (deliveryBoy) {
          answer = `👨‍💼 ${deliveryBoy} का आज का परफॉर्मेंस:\n`;
        } else {
          answer = `📊 आज का डिलीवरी परफॉर्मेंस:\n`;
        }
        
        answer += `• कुल असाइन: ${todayDeliveries}\n` +
                 `• पूर्ण: ${completed}\n` +
                 `• कैंसल: ${cancelled}\n` +
                 `• पेंडिंग: ${pending}\n` +
                 `• ट्रांजिट: ${inTransit}\n`;
        
        if (avgTime > 0) {
          answer += `• औसत समय: ${avgTime} मिनट\n`;
        }
        
        if (todayDeliveries > 0) {
          const successRate = ((completed / todayDeliveries) * 100).toFixed(1);
          answer += `• सफलता दर: ${successRate}%`;
        }
      } else {
        if (deliveryBoy) {
          answer = `👨‍💼 ${deliveryBoy}'s Today's Performance:\n`;
        } else {
          answer = `📊 Today's Delivery Performance:\n`;
        }
        
        answer += `• Total Assigned: ${todayDeliveries}\n` +
                 `• Completed: ${completed}\n` +
                 `• Cancelled: ${cancelled}\n` +
                 `• Pending: ${pending}\n` +
                 `• In Transit: ${inTransit}\n`;
        
        if (avgTime > 0) {
          answer += `• Average Time: ${avgTime} minutes\n`;
        }
        
        if (todayDeliveries > 0) {
          const successRate = ((completed / todayDeliveries) * 100).toFixed(1);
          answer += `• Success Rate: ${successRate}%`;
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { todayDeliveries, completed, cancelled, pending, inTransit, avgTime }
      });
    }

    // ==============================================
    // SECTION 7: AREA PERFORMANCE
    // ==============================================
    
    // 7.1 "Sabse zyada sale kaunse area se ho rahi hai?"
    if (q.includes("sabse zyada sale") || q.includes("best area") || q.includes("बेस्ट एरिया")) {
      const result = await pool.request().query(`
        SELECT TOP 5
          o.Area,
          COUNT(DISTINCT o.OrderID) AS TotalOrders,
          SUM(i.Total) AS TotalSales,
          COUNT(DISTINCT o.CustomerName) AS TotalCustomers,
          AVG(i.Total) AS AvgOrderValue
        FROM OrdersTemp o
        LEFT JOIN orderItems i ON o.OrderID = i.OrderID
        WHERE o.Area IS NOT NULL AND o.Area != ''
        GROUP BY o.Area
        ORDER BY TotalSales DESC
      `);
      
      const areas = result.recordset;
      
      let answer;
      if (language === 'hindi') {
        answer = `📍 सबसे ज्यादा बिक्री वाले एरिया:\n\n`;
        
        if (areas.length === 0) {
          answer += "कोई एरिया डेटा उपलब्ध नहीं है।";
        } else {
          areas.forEach((area, index) => {
            answer += `${index + 1}. ${area.Area}\n`;
            answer += `   • बिक्री: ₹${formatNumber(area.TotalSales, 'hindi')}\n`;
            answer += `   • ऑर्डर: ${area.TotalOrders}\n`;
            answer += `   • ग्राहक: ${area.TotalCustomers}\n`;
            answer += `   • औसत ऑर्डर: ₹${formatNumber(area.AvgOrderValue, 'hindi')}\n\n`;
          });
        }
      } else {
        answer = `📍 Top Performing Areas by Sales:\n\n`;
        
        if (areas.length === 0) {
          answer += "No area data available.";
        } else {
          areas.forEach((area, index) => {
            answer += `${index + 1}. ${area.Area}\n`;
            answer += `   • Sales: ₹${formatNumber(area.TotalSales, 'english')}\n`;
            answer += `   • Orders: ${area.TotalOrders}\n`;
            answer += `   • Customers: ${area.TotalCustomers}\n`;
            answer += `   • Avg Order: ₹${formatNumber(area.AvgOrderValue, 'english')}\n\n`;
          });
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { areas }
      });
    }

    // 7.2 "Civil Lines area ki total sale report dikhao."
    if (q.includes("area report") || q.includes("एरिया रिपोर्ट")) {
      const area = extractArea(question);
      
      if (!area) {
        let errorMsg = language === 'hindi'
          ? "कृपया एरिया का नाम बताएं (जैसे: Civil Lines, Market, etc.)"
          : "Please specify area name (e.g., Civil Lines, Market, etc.)";
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${errorMsg}${getSignature(language)}`
        });
      }
      
      const result = await pool.request()
        .input("area", sql.NVarChar, `%${area}%`)
        .query(`
          SELECT 
            COUNT(DISTINCT o.OrderID) AS TotalOrders,
            SUM(i.Total) AS TotalSales,
            COUNT(DISTINCT o.CustomerName) AS TotalCustomers,
            MIN(o.OrderDate) AS FirstOrderDate,
            MAX(o.OrderDate) AS LastOrderDate,
            AVG(i.Total) AS AvgOrderValue,
            SUM(CASE WHEN ao.PaymentReceived = 0 THEN op.Amount ELSE 0 END) AS OutstandingAmount
          FROM OrdersTemp o
          LEFT JOIN orderItems i ON o.OrderID = i.OrderID
          LEFT JOIN AssignedOrders ao ON o.OrderID = ao.OrderID
          LEFT JOIN OrderPayments op ON ao.AssignID = op.AssignID
          WHERE o.Area LIKE @area
          GROUP BY o.Area
        `);
      
      const data = result.recordset[0];
      
      if (!data) {
        let answer = language === 'hindi'
          ? `📊 ${area} एरिया का कोई डेटा उपलब्ध नहीं है।`
          : `📊 No data available for ${area} area.`;
        
        return res.json({ success: true, answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}` });
      }
      
      const firstOrder = new Date(data.FirstOrderDate);
      const lastOrder = new Date(data.LastOrderDate);
      const daysSinceLast = Math.floor((new Date() - lastOrder) / (1000 * 60 * 60 * 24));
      
      let answer;
      if (language === 'hindi') {
        answer = `📍 ${area} एरिया का रिपोर्ट:\n\n` +
                `• कुल बिक्री: ₹${formatNumber(data.TotalSales, 'hindi')}\n` +
                `• कुल ऑर्डर: ${data.TotalOrders}\n` +
                `• कुल ग्राहक: ${data.TotalCustomers}\n` +
                `• औसत ऑर्डर: ₹${formatNumber(data.AvgOrderValue, 'hindi')}\n` +
                `• बकाया राशि: ₹${formatNumber(data.OutstandingAmount, 'hindi')}\n` +
                `• पहला ऑर्डर: ${firstOrder.toLocaleDateString('hi-IN')}\n` +
                `• आखिरी ऑर्डर: ${daysSinceLast} दिन पहले`;
      } else {
        answer = `📍 ${area} Area Report:\n\n` +
                `• Total Sales: ₹${formatNumber(data.TotalSales, 'english')}\n` +
                `• Total Orders: ${data.TotalOrders}\n` +
                `• Total Customers: ${data.TotalCustomers}\n` +
                `• Average Order: ₹${formatNumber(data.AvgOrderValue, 'english')}\n` +
                `• Outstanding Amount: ₹${formatNumber(data.OutstandingAmount, 'english')}\n` +
                `• First Order: ${firstOrder.toLocaleDateString('en-IN')}\n` +
                `• Last Order: ${daysSinceLast} days ago`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { area, ...data, daysSinceLast }
      });
    }

    // ==============================================
    // SECTION 8: INVOICE & BILL DETAILS
    // ==============================================
    // SECTION 8: INVOICE & BILL DETAILS (FIXED)
 

    // ==============================================
// SECTION 8: INVOICE & BILL DETAILS (STRICT FIX)
// ==============================================
 // ==============================================
// SECTION 8: INVOICE & BILL DETAILS (STRICT FIX FOR SAGAR)
// ==============================================
 // --- Helper Function (Function ke andar ya bahar kahi bhi rakhein) ---
const formatCash = (num) => `₹${(num || 0).toLocaleString('en-IN')}`;

// ==============================================
// SECTION 8: INVOICE & BILL DETAILS (FINAL FIXED)
// ==============================================
if (q.includes("bill") || q.includes("invoice") || q.includes("बिल") || q.includes("इनवॉइस")) {
  const invoiceNo = extractInvoiceNumber(question);
  
  if (!invoiceNo) {
    return res.json({ 
        success: true, 
        answer: "Sagar ji, please bill number sahi se batayein (jaise: 25-26/19)" 
    });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("invoiceNo", sql.NVarChar, invoiceNo)
      .query(`
        SELECT 
          O.OrderID, O.InvoiceNo, O.CustomerName, O.Area, O.Address, O.ContactNo, 
          O.OrderDate, O.DeliveryCharge, O.Po_No, O.Po_Date, O.OrderTakenBy,
          -- Har item ki detail OrderItems table se (ProductName, Weight, Quantity)
          Items = (SELECT STRING_AGG(ProductName + ' ' + CAST(Weight AS VARCHAR) + ' (' + CAST(Quantity AS VARCHAR) + ')', ', ') 
                   FROM orderItems WHERE OrderID = O.OrderID),
          -- OrderItems ka Subtotal (Total column ka SUM)
          Subtotal = (SELECT SUM(Total) FROM orderItems WHERE OrderID = O.OrderID),
          -- AssignedOrders table se status
          Status = (SELECT TOP 1 DeliveryStatus FROM AssignedOrders WHERE OrderID = O.OrderID),
          -- OrderPayments table se collection
          Paid = (SELECT SUM(Amount) FROM OrderPayments WHERE AssignID IN 
                  (SELECT AssignID FROM AssignedOrders WHERE OrderID = O.OrderID))
        FROM OrdersTemp O
        WHERE O.InvoiceNo = @invoiceNo OR O.InvoiceNo LIKE '%' + @invoiceNo
      `);
    
    if (result.recordset.length === 0) {
      return res.json({ 
        success: true, 
        answer: `Sagar ji, database mein Invoice No. ${invoiceNo} nahi mila.` 
      });
    }

    const inv = result.recordset[0];
    const orderDate = inv.OrderDate ? new Date(inv.OrderDate).toLocaleDateString('en-GB') : 'N/A';
    const poDate = inv.Po_Date ? new Date(inv.Po_Date).toLocaleDateString('en-GB') : 'N/A';
    
    // Final Calculations using your columns
    const itemSubtotal = inv.Subtotal || 0;
    const deliveryCharge = inv.DeliveryCharge || 0;
    const grandTotal = itemSubtotal + deliveryCharge;
    const paymentReceived = inv.Paid || 0;
    const balanceDue = grandTotal - paymentReceived;

    let responseHinglish = `🧾 **Invoice & PO Details Found:**\n\n` +
               `• **Bill No:** ${inv.InvoiceNo}\n` +
               `• **Customer:** ${inv.CustomerName}\n` +
               `• **Phone:** ${inv.ContactNo}\n` +
               `• **Area:** ${inv.Area}\n` +
               `---------------------------\n` +
               `• **Items:** ${inv.Items || 'No products found'}\n` +
               `• **PO Number:** ${inv.Po_No || 'N/A'}\n` +
               `---------------------------\n` +
               `• **Item Total:** ${formatCash(itemSubtotal)}\n` +
               `• **Delivery:** ${formatCash(deliveryCharge)}\n` +
               `• **Final Bill:** ${formatCash(grandTotal)}\n` +
               `• **Paid:** ${formatCash(paymentReceived)}\n` +
               `• **Balance:** ${formatCash(balanceDue)}\n` +
               `• **Status:** ${inv.Status || 'Pending'}`;
    
    return res.json({ 
      success: true, 
      answer: `${getPersonalizedGreeting(language)}\n\n${responseHinglish}${getSignature(language)}` 
    });

  } catch (error) {
    console.error("SQL ERROR:", error.message);
    return res.json({ 
        success: true, 
        answer: "Technical error Sagar ji: " + error.message 
    });
  }
}
    // ==============================================
    // SECTION 9: ASSISTANT BRANDING & HELP
    // ==============================================
    
    // 9.1 "Sagar, ye AI kaise kaam karta hai?"
    // 9.2 "Sagar ji, mujhe is hafte ki summary report WhatsApp kar do."
    // 9.3 "Ye software kisne banaya hai?"
    if (
      q.includes("kaise kaam") || q.includes("how it works") || 
      q.includes("summary report") || q.includes("सारांश") ||
      q.includes("software") || q.includes("banaya") || 
      q.includes("developer") || q.includes("डेवलपर") ||
      q.includes(MY_NAME.toLowerCase())
    ) {
      let answer;
      
      if (language === 'hindi') {
        answer = `🎯 ${MY_NAME} जी, मैं आपका AI बिजनेस असिस्टेंट हूँ!\n\n` +
                `📍 **मेरे बारे में:**\n` +
                `• बनाया गया: ${MY_NAME} द्वारा\n` +
                `• भूमिका: बिजनेस इंटेलिजेंस विशेषज्ञ\n` +
                `• क्षमता: रियल-टाइम बिजनेस एनालिटिक्स\n\n` +
                `💡 **मैं क्या कर सकता हूँ:**\n` +
                `• बिक्री और आय विश्लेषण\n` +
                `• स्टॉक और इन्वेंटरी प्रबंधन\n` +
                `• ग्राहक व्यवहार विश्लेषण\n` +
                `• डिलीवरी और स्टाफ ट्रैकिंग\n` +
                `• भुगतान और बकाया रिपोर्टिंग\n` +
                `• क्षेत्रवार प्रदर्शन विश्लेषण\n\n` +
                `📊 **हफ्ते की सारांश रिपोर्ट:**\n` +
                `• कुल बिक्री\n` +
                `• नए ग्राहक\n` +
                `• टॉप प्रोडक्ट\n` +
                `• बकाया राशि\n` +
                `• डिलीवरी स्टेटस\n\n` +
                `📞 **${MY_NAME} से संपर्क:**\n` +
                `• कस्टम बिजनेस सॉल्यूशंस\n` +
                `• वेबसाइट और मोबाइल एप्स\n` +
                `• बिजनेस इंटेलिजेंस डैशबोर्ड\n\n` +
                `_"आपके डेटा को आपके निर्णयों में बदलना"_`;
      } else {
        answer = `🎯 ${MY_NAME} ji, I'm your AI Business Assistant!\n\n` +
                `📍 **About Me:**\n` +
                `• Created by: ${MY_NAME}\n` +
                `• Role: Business Intelligence Expert\n` +
                `• Capability: Real-time Business Analytics\n\n` +
                `💡 **What I Can Do:**\n` +
                `• Sales & Revenue Analysis\n` +
                `• Stock & Inventory Management\n` +
                `• Customer Behavior Analysis\n` +
                `• Delivery & Staff Tracking\n` +
                `• Payment & Outstanding Reporting\n` +
                `• Area-wise Performance Analysis\n\n` +
                `📊 **Weekly Summary Report:**\n` +
                `• Total Sales\n` +
                `• New Customers\n` +
                `• Top Products\n` +
                `• Outstanding Amount\n` +
                `• Delivery Status\n\n` +
                `📞 **Contact ${MY_NAME}:**\n` +
                `• Custom Business Solutions\n` +
                `• Websites & Mobile Apps\n` +
                `• Business Intelligence Dashboards\n\n` +
                `_"Transforming your data into your decisions"_`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { 
          developer: MY_NAME,
          role: language === 'hindi' ? "बिजनेस इंटेलिजेंस डेवलपर" : "Business Intelligence Developer",
          contact: language === 'hindi' ? "कस्टम सॉल्यूशंस के लिए उपलब्ध" : "Available for custom solutions"
        }
      });
    }

    // ==============================================
    // SECTION 10: PURCHASE ORDER (PO) & DATE BASED
    // ==============================================
    
    // "PO date se purchase order bhi btaye"
    if (q.includes("purchase order") || q.includes("po") || q.includes("पीओ") || q.includes("खरीद ऑर्डर")) {
      // Assuming there's a PurchaseOrders table
      try {
        const result = await pool.request().query(`
          SELECT TOP 10
            PONumber,
            PODate,
            SupplierName,
            TotalAmount,
            Status,
            DeliveryDate,
            CreatedBy,
            Notes
          FROM PurchaseOrders
          ORDER BY PODate DESC
        `);
        
        const purchaseOrders = result.recordset;
        
        let answer;
        if (language === 'hindi') {
          answer = `📋 हाल के पर्चेज ऑर्डर (PO):\n\n`;
          
          if (purchaseOrders.length === 0) {
            answer += "कोई पर्चेज ऑर्डर नहीं मिला।";
          } else {
            purchaseOrders.forEach((po, index) => {
              const poDate = new Date(po.PODate);
              const deliveryDate = po.DeliveryDate ? new Date(po.DeliveryDate) : null;
              
              answer += `${index + 1}. PO #${po.PONumber}\n`;
              answer += `   • तिथि: ${poDate.toLocaleDateString('hi-IN')}\n`;
              answer += `   • सप्लायर: ${po.SupplierName}\n`;
              answer += `   • राशि: ₹${formatNumber(po.TotalAmount, 'hindi')}\n`;
              answer += `   • स्टेटस: ${po.Status}\n`;
              
              if (deliveryDate) {
                answer += `   • डिलीवरी: ${deliveryDate.toLocaleDateString('hi-IN')}\n`;
              }
              
              answer += `\n`;
            });
          }
        } else {
          answer = `📋 Recent Purchase Orders (PO):\n\n`;
          
          if (purchaseOrders.length === 0) {
            answer += "No purchase orders found.";
          } else {
            purchaseOrders.forEach((po, index) => {
              const poDate = new Date(po.PODate);
              const deliveryDate = po.DeliveryDate ? new Date(po.DeliveryDate) : null;
              
              answer += `${index + 1}. PO #${po.PONumber}\n`;
              answer += `   • Date: ${poDate.toLocaleDateString('en-IN')}\n`;
              answer += `   • Supplier: ${po.SupplierName}\n`;
              answer += `   • Amount: ₹${formatNumber(po.TotalAmount, 'english')}\n`;
              answer += `   • Status: ${po.Status}\n`;
              
              if (deliveryDate) {
                answer += `   • Delivery: ${deliveryDate.toLocaleDateString('en-IN')}\n`;
              }
              
              answer += `\n`;
            });
          }
        }
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
          data: { purchaseOrders }
        });
      } catch (error) {
        let answer = language === 'hindi'
          ? `📋 पर्चेज ऑर्डर सिस्टम फिलहाल उपलब्ध नहीं है।`
          : `📋 Purchase order system is not available at the moment.`;
        
        return res.json({ success: true, answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}` });
      }
    }

    // ==============================================
    // FALLBACK: Generic response for unknown queries
    // ==============================================
    let fallbackResponse;
    
    if (language === 'hindi') {
      const hindiResponses = [
        `${MY_NAME} जी, मैं आपके बिजनेस डेटा के बारे में बता सकता हूँ। कृपया विशेष रूप से पूछें।`,
        `${MY_NAME} सर, आप मुझसे ऑर्डर, स्टॉक, बिक्री, डिलीवरी, भुगतान, ग्राहक, एरिया के बारे में पूछ सकते हैं।`,
        `${MY_NAME} जी, पूछने का प्रयास करें: 'आज कितने ऑर्डर?' या 'स्टॉक कितना है?' या 'बकाया राशि कितनी है?'`,
        `नमस्ते ${MY_NAME} जी! मैं आपके बिजनेस का AI असिस्टेंट हूँ। आप क्या जानना चाहते हैं?`
      ];
      fallbackResponse = hindiResponses[Math.floor(Math.random() * hindiResponses.length)];
    } else {
      const englishResponses = [
        `${MY_NAME} ji, I can tell you about your business data. Please ask specifically.`,
        `${MY_NAME} sir, you can ask me about orders, stock, sales, deliveries, payments, customers, or areas.`,
        `${MY_NAME} ji, try asking: 'How many orders today?' or 'What's the stock status?' or 'What's the outstanding amount?'`,
        `Hello ${MY_NAME} ji! I'm your business AI assistant. What would you like to know?`
      ];
      fallbackResponse = englishResponses[Math.floor(Math.random() * englishResponses.length)];
    }
    
    return res.json({ 
      success: true,
      answer: `${getPersonalizedGreeting(language)}\n\n${fallbackResponse}${getSignature(language)}`,
      data: {
        assistant: language === 'hindi' ? `${MY_NAME} का AI असिस्टेंट` : `${MY_NAME}'s AI Assistant`,
        language: language,
        suggestions: language === 'hindi' ? [
          "कुल ऑर्डर कितने हैं?",
          "आज की बिक्री कितनी हुई?",
          "कितना स्टॉक बचा है?",
          "बकाया राशि कितनी है?",
          "टॉप ग्राहक कौन है?"
        ] : [
          "How many total orders?",
          "What are today's sales?",
          "How much stock is left?",
          "What's the outstanding amount?",
          "Who are the top customers?"
        ]
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

// Additional helper functions for enhanced reports

exports.getWeeklySummary = async (req, res) => {
  const { lang } = req.query;
  const language = lang || 'english';
  
  try {
    const pool = await poolPromise;
    
    const [
      salesResult,
      ordersResult,
      customersResult,
      stockResult,
      deliveryResult
    ] = await Promise.all([
      pool.request().query(`
        SELECT 
          SUM(i.Total) AS WeeklySales,
          COUNT(DISTINCT o.OrderID) AS WeeklyOrders,
          COUNT(DISTINCT o.CustomerName) AS WeeklyCustomers
        FROM OrdersTemp o
        LEFT JOIN orderItems i ON o.OrderID = i.OrderID
        WHERE o.OrderDate >= DATEADD(DAY, -7, GETDATE())
      `),
      pool.request().query(`
        SELECT 
          DAYNAME(o.OrderDate) AS DayName,
          COUNT(*) AS DayOrders,
          SUM(i.Total) AS DaySales
        FROM OrdersTemp o
        LEFT JOIN orderItems i ON o.OrderID = i.OrderID
        WHERE o.OrderDate >= DATEADD(DAY, -7, GETDATE())
        GROUP BY DAYNAME(o.OrderDate), CAST(o.OrderDate AS DATE)
        ORDER BY CAST(o.OrderDate AS DATE) DESC
      `),
      pool.request().query(`
        SELECT TOP 3
          o.CustomerName,
          SUM(i.Total) AS TotalSpent,
          COUNT(*) AS OrderCount
        FROM OrdersTemp o
        LEFT JOIN orderItems i ON o.OrderID = i.OrderID
        WHERE o.OrderDate >= DATEADD(DAY, -7, GETDATE())
        GROUP BY o.CustomerName
        ORDER BY TotalSpent DESC
      `),
      pool.request().query(`
        SELECT 
          item_name,
          SUM(quantity) AS CurrentStock
        FROM Stock
        WHERE quantity <= 20
        GROUP BY item_name
        ORDER BY CurrentStock ASC
      `),
      pool.request().query(`
        SELECT 
          DeliveryStatus,
          COUNT(*) AS StatusCount
        FROM AssignedOrders
        WHERE DeliveryDate >= DATEADD(DAY, -7, GETDATE())
        GROUP BY DeliveryStatus
      `)
    ]);
    
    const summary = {
      weeklySales: salesResult.recordset[0].WeeklySales || 0,
      weeklyOrders: salesResult.recordset[0].WeeklyOrders || 0,
      weeklyCustomers: salesResult.recordset[0].WeeklyCustomers || 0,
      dailyTrend: ordersResult.recordset,
      topCustomers: customersResult.recordset,
      lowStock: stockResult.recordset,
      deliveryStatus: deliveryResult.recordset,
      generatedAt: new Date().toISOString()
    };
    
    let message;
    if (language === 'hindi') {
      message = `${MY_NAME} जी, यह है आपकी साप्ताहिक सारांश रिपोर्ट।`;
    } else {
      message = `${MY_NAME} ji, here is your weekly summary report.`;
    }
    
    res.json({
      success: true,
      message: message,
      data: summary
    });
    
  } catch (err) {
    console.error("Weekly Summary Error:", err);
    res.status(500).json({ 
      success: false, 
      message: `${MY_NAME} ji, failed to generate weekly summary` 
    });
  }
};

// Quick Stats Function (updated)
exports.getQuickStats = async (req, res) => {
  try {
    const pool = await poolPromise;

    const [
      ordersResult,
      stockResult,
      salesResult,
      deliveryResult,
      customersResult,
      outstandingResult
    ] = await Promise.all([
      pool.request().query(`SELECT COUNT(*) AS TotalOrders FROM OrdersTemp`),
      pool.request().query(`SELECT COUNT(DISTINCT item_name) AS StockItems FROM Stock WHERE quantity > 0`),
      pool.request().query(`SELECT SUM(Total) AS TotalSales FROM orderItems`),
      pool.request().query(`
        SELECT 
          COUNT(CASE WHEN DeliveryStatus NOT IN ('Complete', 'Cancel') THEN 1 END) AS PendingDeliveries,
          COUNT(CASE WHEN DeliveryStatus = 'Complete' THEN 1 END) AS CompletedDeliveries
        FROM AssignedOrders
      `),
      pool.request().query(`SELECT COUNT(DISTINCT CustomerName) AS TotalCustomers FROM OrdersTemp`),
      pool.request().query(`
        SELECT SUM(op.Amount) AS TotalOutstanding
        FROM OrderPayments op
        JOIN AssignedOrders ao ON op.AssignID = ao.AssignID
        WHERE ao.PaymentReceived = 0
      `)
    ]);

    const stats = {
      totalOrders: ordersResult.recordset[0].TotalOrders || 0,
      stockItems: stockResult.recordset[0].StockItems || 0,
      totalSales: salesResult.recordset[0].TotalSales || 0,
      pendingDeliveries: deliveryResult.recordset[0].PendingDeliveries || 0,
      completedDeliveries: deliveryResult.recordset[0].CompletedDeliveries || 0,
      totalCustomers: customersResult.recordset[0].TotalCustomers || 0,
      totalOutstanding: outstandingResult.recordset[0].TotalOutstanding || 0,
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

// Assistant Info Function (updated)
exports.getAssistantInfo = (req, res) => {
  const language = req.query.lang || 'english';
  
  if (language === 'hindi') {
    res.json({
      success: true,
      data: {
        name: `${MY_NAME} का बिजनेस इंटेलिजेंस असिस्टेंट`,
        developer: MY_NAME,
        version: "2.0.0",
        capabilities: [
          "ऑर्डर विश्लेषण और ट्रैकिंग",
          "स्टॉक और इन्वेंटरी प्रबंधन",
          "बिक्री और आय विश्लेषण",
          "डिलीवरी और स्टाफ मॉनिटरिंग",
          "ग्राहक व्यवहार और इनसाइट्स",
          "क्षेत्रवार प्रदर्शन विश्लेषण",
          "भुगतान और बकाया ट्रैकिंग",
          "रियल-टाइम रिपोर्टिंग और अलर्ट",
          "मासिक और वार्षिक ट्रेंड्स",
          "उत्पाद प्रदर्शन विश्लेषण",
          "इनवॉइस और बिल प्रबंधन",
          "पर्चेज ऑर्डर ट्रैकिंग"
        ],
        features: [
          "द्विभाषी सपोर्ट (हिंदी और अंग्रेजी)",
          "व्यक्तिगत और प्राकृतिक प्रतिक्रियाएं",
          "बिजनेस हेल्थ मॉनिटरिंग",
          "स्मार्ट अलर्ट सिस्टम",
          "तुलनात्मक और ट्रेंड विश्लेषण",
          "विस्तृत और कस्टम रिपोर्टिंग",
          "रियल-टाइम डेटा अपडेट",
          "मोबाइल और वेब एक्सेस",
          "सिक्योर और प्राइवेट",
          "कस्टम क्वेरी सपोर्ट"
        ],
        contact: `${MY_NAME} द्वारा विकसित - बिजनेस इंटेलिजेंस और AI विशेषज्ञ`,
        website: "सागरटेकसॉल्यूशंस.कॉम",
        email: "सागर@बिजनेसटेक.इन",
        phone: "+91 98765 43210"
      }
    });
  } else {
    res.json({
      success: true,
      data: {
        name: `${MY_NAME}'s Business Intelligence Assistant`,
        developer: MY_NAME,
        version: "2.0.0",
        capabilities: [
          "Order Analysis & Tracking",
          "Stock & Inventory Management",
          "Sales & Revenue Analysis",
          "Delivery & Staff Monitoring",
          "Customer Behavior & Insights",
          "Area-wise Performance Analysis",
          "Payment & Outstanding Tracking",
          "Real-time Reporting & Alerts",
          "Monthly & Annual Trends",
          "Product Performance Analysis",
          "Invoice & Bill Management",
          "Purchase Order Tracking"
        ],
        features: [
          "Bilingual Support (Hindi & English)",
          "Personalized & Natural Responses",
          "Business Health Monitoring",
          "Smart Alert System",
          "Comparative & Trend Analysis",
          "Detailed & Custom Reporting",
          "Real-time Data Updates",
          "Mobile & Web Access",
          "Secure & Private",
          "Custom Query Support"
        ],
        contact: `Developed by ${MY_NAME} - Business Intelligence & AI Expert`,
        website: "sagartechsolutions.com",
        email: "sagar@businesstech.in",
        phone: "+91 98765 43210"
      }
    });
  }
};

// Health Check Function
exports.getSystemHealth = async (req, res) => {
  try {
    const pool = await poolPromise;
    
    const healthChecks = await Promise.allSettled([
      pool.request().query(`SELECT 1 AS HealthCheck`),
      pool.request().query(`SELECT COUNT(*) AS OrdersCount FROM OrdersTemp`),
      pool.request().query(`SELECT COUNT(*) AS StockCount FROM Stock`),
      pool.request().query(`SELECT COUNT(*) AS CustomersCount FROM OrdersTemp GROUP BY CustomerName`),
      pool.request().query(`SELECT COUNT(*) AS DeliveriesCount FROM AssignedOrders`)
    ]);
    
    const healthStatus = {
      database: healthChecks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      orders: healthChecks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      stock: healthChecks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      customers: healthChecks[3].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      deliveries: healthChecks[4].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
    
    const allHealthy = Object.values(healthStatus).filter(val => val === 'healthy').length === 5;
    
    res.json({
      success: true,
      message: `${MY_NAME} ji, system health check completed`,
      status: allHealthy ? 'healthy' : 'degraded',
      data: healthStatus,
      analyzedBy: `${MY_NAME}'s AI Assistant`
    });
    
  } catch (err) {
    console.error("System Health Error:", err);
    res.status(500).json({ 
      success: false, 
      message: `${MY_NAME} ji, system health check failed`,
      status: 'unhealthy'
    });
  }
};