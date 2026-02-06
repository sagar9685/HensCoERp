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

// Helper to format date in Indian format
const formatDateIndian = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN');
};

// Extract month from question
const extractMonthFromText = (text) => {
  const monthPatterns = {
    'january': 1, 'jan': 1, 'जनवरी': 1,
    'february': 2, 'feb': 2, 'फरवरी': 2, 'fb': 2,
    'march': 3, 'mar': 3, 'मार्च': 3,
    'april': 4, 'apr': 4, 'अप्रैल': 4,
    'may': 5, 'मई': 5,
    'june': 6, 'jun': 6, 'जून': 6,
    'july': 7, 'jul': 7, 'जुलाई': 7,
    'august': 8, 'aug': 8, 'अगस्त': 8,
    'september': 9, 'sep': 9, 'sept': 9, 'सितंबर': 9,
    'october': 10, 'oct': 10, 'अक्टूबर': 10,
    'november': 11, 'nov': 11, 'नवंबर': 11,
    'december': 12, 'dec': 12, 'दिसंबर': 12
  };
  
  const q = text.toLowerCase();
  for (const [key, value] of Object.entries(monthPatterns)) {
    if (q.includes(key)) {
      return value;
    }
  }
  
  // Check for month numbers (1-12)
  const monthNumberMatch = q.match(/\b(1[0-2]|[1-9])\b/);
  if (monthNumberMatch) {
    const monthNum = parseInt(monthNumberMatch[0]);
    if (monthNum >= 1 && monthNum <= 12) {
      return monthNum;
    }
  }
  
  return null;
};

// Extract year from question
const extractYearFromText = (text) => {
  const q = text.toLowerCase();
  
  // Check for full year (2024, 2023, etc.)
  const fullYearMatch = q.match(/(20\d{2}|19\d{2})/);
  if (fullYearMatch) {
    return parseInt(fullYearMatch[0]);
  }
  
  // Check for short year (24, 23, etc.)
  const shortYearMatch = q.match(/\b(\d{2})\b/);
  if (shortYearMatch && parseInt(shortYearMatch[0]) >= 0 && parseInt(shortYearMatch[0]) <= 99) {
    const year = parseInt(shortYearMatch[0]);
    return year + 2000; // Assuming 2000s
  }
  
  return new Date().getFullYear();
};

// Extract date in various formats
const extractDateFromText = (text) => {
  const q = text.toLowerCase();
  
  // Format 1: dd/mm/yy or dd-mm-yy (e.g., 04/02/26, 4-2-2026)
  const slashDateMatch = q.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (slashDateMatch) {
    let [_, day, month, year] = slashDateMatch;
    day = parseInt(day);
    month = parseInt(month);
    year = parseInt(year);
    
    // Convert 2-digit year to 4-digit
    if (year < 100) {
      year = year + 2000;
    }
    
    // Validate date
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { day, month, year };
    }
  }
  
  // Format 2: dd month yyyy (e.g., 4 February 2026)
  const monthMap = {
    'january': 1, 'jan': 1, 'जनवरी': 1,
    'february': 2, 'feb': 2, 'फरवरी': 2,
    'march': 3, 'mar': 3, 'मार्च': 3,
    'april': 4, 'apr': 4, 'अप्रैल': 4,
    'may': 5, 'मई': 5,
    'june': 6, 'jun': 6, 'जून': 6,
    'july': 7, 'jul': 7, 'जुलाई': 7,
    'august': 8, 'aug': 8, 'अगस्त': 8,
    'september': 9, 'sep': 9, 'सितंबर': 9,
    'october': 10, 'oct': 10, 'अक्टूबर': 10,
    'november': 11, 'nov': 11, 'नवंबर': 11,
    'december': 12, 'dec': 12, 'दिसंबर': 12
  };
  
  const textDateMatch = q.match(/(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर)/i);
  if (textDateMatch) {
    const day = parseInt(textDateMatch[1]);
    const monthStr = textDateMatch[2].toLowerCase();
    const yearMatch = q.match(/(?:19|20)?\d{2}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
    
    const month = monthMap[monthStr];
    if (month && day >= 1 && day <= 31) {
      return { day, month, year };
    }
  }
  
  return null;
};

// Extract product type from question
const extractProductFromText = (text) => {
  const products = {
    'tray': 'Tray',
    'ट्रे': 'Tray',
    '30 eggs': 'Tray',
    '30 अंडे': 'Tray',
    'box': 'Box',
    'बॉक्स': 'Box',
    '6 eggs': 'Box',
    '6 अंडे': 'Box',
    'kids box': 'Box (Kids)',
    'बच्चों का बॉक्स': 'Box (Kids)',
    'women box': 'Box (Women)',
    'महिलाओं का बॉक्स': 'Box (Women)',
    'wings': 'Wings',
    'विंग्स': 'Wings',
    'drumstick': 'DrumStick',
    'ड्रमस्टिक': 'DrumStick',
    'lolipop': 'Lolipop',
    'लॉलीपॉप': 'Lolipop',
    'whole bird': 'Whole Bird',
    'पूरा चिकन': 'Whole Bird',
    'chicken breast': 'Chicken Breast',
    'चिकन ब्रेस्ट': 'Chicken Breast',
    'curry cut': 'Curry Cut',
    'करी कट': 'Curry Cut',
    'boneless': 'Curry Cut Boneless',
    'बोनलेस': 'Curry Cut Boneless',
    'tikka': 'Chicken Tikka',
    'टिक्का': 'Chicken Tikka',
    'liver': 'Liver',
    'लिवर': 'Liver',
    'gizzard': 'Gizzard',
    'गिजार्ड': 'Gizzard',
    'pet food': 'Pet Food',
    'पेट फूड': 'Pet Food'
  };
  
  const q = text.toLowerCase();
  for (const [key, value] of Object.entries(products)) {
    if (q.includes(key)) {
      return value;
    }
  }
  return null;
};

// Extract delivery boy from question
const extractDeliveryBoyFromText = (text) => {
  const deliveryBoys = {
    'yash': 'Yash Patel',
    'यश': 'Yash Patel',
    'yash patel': 'Yash Patel',
    'रोहित': 'Rohit Lodhi',
    'rohit': 'Rohit Lodhi',
    'rohit lodhi': 'Rohit Lodhi',
    'शिवांशु': 'Shivanshu Lodhi',
    'shivanshu': 'Shivanshu Lodhi',
    'shivanshu lodhi': 'Shivanshu Lodhi',
    'विजय खुशवाहा': 'Vijay Khushwaha',
    'vijay khushwaha': 'Vijay Khushwaha',
    'अरुण': 'Arun Gupta',
    'arun': 'Arun Gupta',
    'arun gupta': 'Arun Gupta',
    'विजय सिंह': 'Vijay Singh',
    'vijay singh': 'Vijay Singh',
    'सतीश': 'Satish Kewat',
    'satish': 'Satish Kewat',
    'satish kewat': 'Satish Kewat',
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
  
  const q = text.toLowerCase();
  for (const [key, value] of Object.entries(deliveryBoys)) {
    if (q.includes(key)) {
      return value;
    }
  }
  return null;
};

// Extract area from question
const extractAreaFromText = (text) => {
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
  
  const q = text.toLowerCase();
  for (const [key, value] of Object.entries(areas)) {
    if (q.includes(key)) {
      return value;
    }
  }
  return null;
};

// Extract invoice/bill number from question
const extractInvoiceNumberFromText = (text) => {
  const q = text.toLowerCase();
  
  // Match patterns like: INV/05, 25-26/10, Bill number 25-26/10, Invoice INV/05
  const invoiceMatch = q.match(/(?:invoice|bill|बिल|इनवॉइस)[\s\w]*?(\d+[\-\/]\d+\/\d+|\w+\/\d+|INV\/\d+)/i) ||
                       q.match(/(\d+[\-\/]\d+\/\d+|\w+\/\d+)/i);
  
  if (invoiceMatch) {
    return invoiceMatch[1].toUpperCase();
  }
  
  return null;
};

// Helper to format cash
const formatCash = (num) => `₹${(num || 0).toLocaleString('en-IN')}`;

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
  if (q.includes("outstanding") || q.includes("udhari") || q.includes("उधार") || q.includes("paisa")) {
            const result = await pool.request().query(`
                SELECT 
                    (SELECT SUM(Total) FROM OrderItems) + (SELECT SUM(DeliveryCharge) FROM OrdersTemp) as Gross,
                    (SELECT SUM(Amount) FROM OrderPayments) as Received,
                    (SELECT SUM(ShortAmount) FROM OrderPayments) as TotalShort
            `);
            const { Gross, Received, TotalShort } = result.recordset[0];
            const outstanding = (Gross || 0) - (Received || 0);

            const answer = lang === 'hindi' 
                ? `💰 **फाइनेंशियल रिपोर्ट:**\n• कुल बिक्री: ${formatCash(Gross)}\n• कुल वसूली: ${formatCash(Received)}\n• **मार्केट उधार: ${formatCash(outstanding)}**\n• कुल शॉर्ट अमाउंट: ${formatCash(TotalShort)}`
                : `💰 **Financial Report:**\n• Gross Sales: ${formatCash(Gross)}\n• Net Received: ${formatCash(Received)}\n• **Outstanding: ${formatCash(outstanding)}**\n• Total Short: ${formatCash(TotalShort)}`;
            
            return res.json({ success: true, answer: answer + getSignature(lang) });
        }

    // 1.5 Waste Summary: "Ab tak total kitna maal (stock) reject ya kharab hua hai?"
    if (
      q.includes("waste") || q.includes("reject") || 
      q.includes("खराब") || q.includes("रिजेक्ट") ||
      q.includes("kharab hua") || q.includes("नुकसान")
    ) {
      try {
        const result = await pool.request().query(`
          SELECT 
            SUM(quantity) AS TotalWaste,
            COUNT(DISTINCT item_name) AS ItemCount,
            COUNT(*) AS TotalEntries
          FROM RejectedStock
        `);
        
        const data = result.recordset[0];
        const totalWaste = data.TotalWaste || 0;
        const itemCount = data.ItemCount || 0;
        const totalEntries = data.TotalEntries || 0;
        
        let answer;
        if (language === 'hindi') {
          answer = `🗑️ अब तक कुल खराब/रिजेक्ट माल:\n` +
                  `• कुल यूनिट: ${formatNumber(totalWaste, 'hindi')}\n` +
                  `• आइटम प्रकार: ${itemCount}\n` +
                  `• टोटल एंट्री: ${totalEntries}`;
        } else {
          answer = `🗑️ Total waste/rejected stock so far:\n` +
                  `• Total Units: ${formatNumber(totalWaste, 'english')}\n` +
                  `• Item Types: ${itemCount}\n` +
                  `• Total Entries: ${totalEntries}`;
        }
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
          data: { totalWaste, itemCount, totalEntries }
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
          DM.Name AS DeliveryBoyName,
          COUNT(*) AS TotalDeliveries,
          SUM(CASE WHEN A.DeliveryStatus = 'Complete' THEN 1 ELSE 0 END) AS SuccessfulDeliveries,
          SUM(CASE WHEN A.DeliveryStatus = 'Cancel' THEN 1 ELSE 0 END) AS CancelledDeliveries
        FROM AssignedOrders A
        JOIN DeliveryMen DM ON A.DeliveryManID = DM.DeliveryManID
        WHERE DM.Name IS NOT NULL AND DM.Name != ''
        GROUP BY DM.Name
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
          const successRate = boy.TotalDeliveries > 0 ? ((boy.SuccessfulDeliveries/boy.TotalDeliveries)*100).toFixed(1) : 0;
          answer += `${index + 1}. ${boy.DeliveryBoyName}\n`;
          answer += `   • सफल डिलीवरी: ${boy.SuccessfulDeliveries}\n`;
          answer += `   • कुल डिलीवरी: ${boy.TotalDeliveries}\n`;
          answer += `   • कैंसल: ${boy.CancelledDeliveries}\n`;
          answer += `   • सफलता दर: ${successRate}%\n\n`;
        });
      } else {
        answer = `👨‍💼 Most Efficient Delivery Boys:\n\n`;
        deliveryBoys.forEach((boy, index) => {
          const successRate = boy.TotalDeliveries > 0 ? ((boy.SuccessfulDeliveries/boy.TotalDeliveries)*100).toFixed(1) : 0;
          answer += `${index + 1}. ${boy.DeliveryBoyName}\n`;
          answer += `   • Successful: ${boy.SuccessfulDeliveries}\n`;
          answer += `   • Total: ${boy.TotalDeliveries}\n`;
          answer += `   • Cancelled: ${boy.CancelledDeliveries}\n`;
          answer += `   • Success Rate: ${successRate}%\n\n`;
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
    if (
      q.includes("aaj total") || 
      q.includes("today order") || 
      q.includes("aaj kitne") || 
      (q.includes("today") && q.includes("order")) ||
      q.includes("आज के ऑर्डर") ||
      (q.includes("aaj") && q.includes("orders"))
    ) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const result = await pool.request()
        .input("today", sql.Date, todayStr)
        .query(`
          SELECT 
            COUNT(*) AS TodayOrders,
            SUM(oi.Total) AS TodaySales,
            COUNT(DISTINCT ot.CustomerName) AS TodayCustomers,
            SUM(ot.DeliveryCharge) AS TodayDeliveryCharges
          FROM OrdersTemp ot
          LEFT JOIN OrderItems oi ON ot.OrderID = oi.OrderID
          WHERE CAST(ot.OrderDate AS DATE) = @today
        `);
      
      const data = result.recordset[0];
      const todayOrders = data.TodayOrders || 0;
      const todaySales = data.TodaySales || 0;
      const todayCustomers = data.TodayCustomers || 0;
      const todayDeliveryCharges = data.TodayDeliveryCharges || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `📅 आज की रिपोर्ट (${today.toLocaleDateString('hi-IN')}):\n\n` +
                `• कुल ऑर्डर: ${todayOrders}\n` +
                `• कुल बिक्री: ₹${formatNumber(todaySales, 'hindi')}\n` +
                `• ग्राहक: ${todayCustomers}\n` +
                `• डिलीवरी चार्ज: ₹${formatNumber(todayDeliveryCharges, 'hindi')}`;
      } else {
        answer = `📅 Today's Report (${today.toLocaleDateString('en-IN')}):\n\n` +
                `• Total Orders: ${todayOrders}\n` +
                `• Total Sales: ₹${formatNumber(todaySales, 'english')}\n` +
                `• Customers: ${todayCustomers}\n` +
                `• Delivery Charges: ₹${formatNumber(todayDeliveryCharges, 'english')}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { 
          todayOrders, 
          todaySales, 
          todayCustomers, 
          todayDeliveryCharges,
          date: todayStr 
        }
      });
    }

    // 2.2 "Kal ki total sales kitni thi?"
    if (
      q.includes("kal ki") || 
      q.includes("yesterday") || 
      q.includes("कल") ||
      q.includes("बीता हुआ दिन")
    ) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const result = await pool.request()
        .input("yesterday", sql.Date, yesterdayStr)
        .query(`
          SELECT 
            COUNT(*) AS YesterdayOrders,
            SUM(oi.Total) AS YesterdaySales,
            COUNT(DISTINCT ot.CustomerName) AS YesterdayCustomers,
            SUM(ot.DeliveryCharge) AS YesterdayDeliveryCharges
          FROM OrdersTemp ot
          LEFT JOIN OrderItems oi ON ot.OrderID = oi.OrderID
          WHERE CAST(ot.OrderDate AS DATE) = @yesterday
        `);
      
      const data = result.recordset[0];
      const yesterdayOrders = data.YesterdayOrders || 0;
      const yesterdaySales = data.YesterdaySales || 0;
      const yesterdayCustomers = data.YesterdayCustomers || 0;
      const yesterdayDeliveryCharges = data.YesterdayDeliveryCharges || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `📅 कल की रिपोर्ट (${yesterday.toLocaleDateString('hi-IN')}):\n\n` +
                `• कुल ऑर्डर: ${yesterdayOrders}\n` +
                `• कुल बिक्री: ₹${formatNumber(yesterdaySales, 'hindi')}\n` +
                `• ग्राहक: ${yesterdayCustomers}\n` +
                `• डिलीवरी चार्ज: ₹${formatNumber(yesterdayDeliveryCharges, 'hindi')}`;
      } else {
        answer = `📅 Yesterday's Report (${yesterday.toLocaleDateString('en-IN')}):\n\n` +
                `• Total Orders: ${yesterdayOrders}\n` +
                `• Total Sales: ₹${formatNumber(yesterdaySales, 'english')}\n` +
                `• Customers: ${yesterdayCustomers}\n` +
                `• Delivery Charges: ₹${formatNumber(yesterdayDeliveryCharges, 'english')}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { 
          yesterdayOrders, 
          yesterdaySales, 
          yesterdayCustomers, 
          yesterdayDeliveryCharges,
          date: yesterdayStr 
        }
      });
    }

    // 2.3 "4 February ko kitne order mile the?" OR "Orders on specific date"
    if (
      q.includes("ko kitne") || 
      q.includes("date") || 
      q.includes("/") || 
      q.includes("-") || 
      q.includes("तारीख") ||
      (q.includes("orders") && (q.includes("on") || q.includes("in")))
    ) {
      const dateInfo = extractDateFromText(question);
      
      if (dateInfo) {
        const { day, month, year } = dateInfo;
        const monthName = getMonthName(month, language);
        
        const result = await pool.request()
          .input("day", sql.Int, day)
          .input("month", sql.Int, month)
          .input("year", sql.Int, year)
          .query(`
            SELECT 
              COUNT(*) AS OrdersOnDate,
              SUM(oi.Total) AS SalesOnDate,
              COUNT(DISTINCT ot.CustomerName) AS CustomersOnDate,
              SUM(ot.DeliveryCharge) AS DeliveryCharges
            FROM OrdersTemp ot
            LEFT JOIN OrderItems oi ON ot.OrderID = oi.OrderID
            WHERE DAY(ot.OrderDate) = @day 
              AND MONTH(ot.OrderDate) = @month 
              AND YEAR(ot.OrderDate) = @year
          `);

        const data = result.recordset[0];
        const orders = data.OrdersOnDate || 0;
        const sales = data.SalesOnDate || 0;
        const customers = data.CustomersOnDate || 0;
        const deliveryCharges = data.DeliveryCharges || 0;

        let answer;
        if (language === 'hindi') {
          answer = `📅 ${day} ${monthName} ${year} की रिपोर्ट:\n\n` +
                  `• कुल ऑर्डर: ${orders}\n` +
                  `• कुल बिक्री: ₹${formatNumber(sales, 'hindi')}\n` +
                  `• ग्राहक: ${customers}\n` +
                  `• डिलीवरी चार्ज: ₹${formatNumber(deliveryCharges, 'hindi')}`;
        } else {
          answer = `📅 Report for ${day} ${monthName} ${year}:\n\n` +
                  `• Total Orders: ${orders}\n` +
                  `• Total Sales: ₹${formatNumber(sales, 'english')}\n` +
                  `• Customers: ${customers}\n` +
                  `• Delivery Charges: ₹${formatNumber(deliveryCharges, 'english')}`;
        }
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
          data: { day, month, year, orders, sales, customers, deliveryCharges }
        });
      }
    }

    // 2.4 "January mahine mein total kitni kamai (revenue) hui?"
    if (
      (q.includes("month") || q.includes("महीने") || q.includes("मासिक")) &&
      (q.includes("sales") || q.includes("revenue") || q.includes("बिक्री") || q.includes("कमाई"))
    ) {
      const month = extractMonthFromText(question);
      const year = extractYearFromText(question);
      
      if (!month) {
        let errorMsg = language === 'hindi'
          ? "कृपया स्पष्ट महीना बताएं (जैसे: जनवरी में कितनी बिक्री?)"
          : "Please specify a clear month (e.g., How much sales in January?)";
        
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
          SELECT 
            COUNT(*) AS MonthlyOrders,
            SUM(oi.Total) AS MonthlySales,
            COUNT(DISTINCT ot.CustomerName) AS MonthlyCustomers,
            AVG(oi.Total) AS AvgOrderValue
          FROM OrdersTemp ot
          LEFT JOIN OrderItems oi ON ot.OrderID = oi.OrderID
          WHERE MONTH(ot.OrderDate) = @month 
            AND YEAR(ot.OrderDate) = @year
        `);
      
      const data = result.recordset[0];
      const monthlyOrders = data.MonthlyOrders || 0;
      const monthlySales = data.MonthlySales || 0;
      const monthlyCustomers = data.MonthlyCustomers || 0;
      const avgOrderValue = data.AvgOrderValue || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `📊 ${monthName} ${year} का बिक्री रिपोर्ट:\n\n` +
                `• कुल ऑर्डर: ${formatNumber(monthlyOrders, 'hindi')}\n` +
                `• कुल बिक्री: ₹${formatNumber(monthlySales, 'hindi')}\n` +
                `• ग्राहक: ${formatNumber(monthlyCustomers, 'hindi')}\n` +
                `• औसत ऑर्डर: ₹${formatNumber(avgOrderValue, 'hindi')}`;
      } else {
        answer = `📊 Sales Report for ${monthName} ${year}:\n\n` +
                `• Total Orders: ${formatNumber(monthlyOrders, 'english')}\n` +
                `• Total Sales: ₹${formatNumber(monthlySales, 'english')}\n` +
                `• Customers: ${formatNumber(monthlyCustomers, 'english')}\n` +
                `• Average Order: ₹${formatNumber(avgOrderValue, 'english')}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { 
          month: monthName,
          year: year,
          monthlyOrders,
          monthlySales,
          monthlyCustomers,
          avgOrderValue
        }
      });
    }

    // 2.5 "Is hafte total kitne orders deliver hue?"
    if (
      q.includes("hafta") || 
      q.includes("week") || 
      q.includes("वीक") || 
      q.includes("सप्ताह") ||
      q.includes("इस हफ्ते") ||
      (q.includes("this") && q.includes("week"))
    ) {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);
      
      const result = await pool.request()
        .input("startDate", sql.DateTime, startOfWeek)
        .input("endDate", sql.DateTime, endOfWeek)
        .query(`
          SELECT 
            COUNT(*) AS WeeklyOrders,
            SUM(oi.Total) AS WeeklySales,
            COUNT(DISTINCT ot.CustomerName) AS WeeklyCustomers,
            SUM(ot.DeliveryCharge) AS WeeklyDeliveryCharges
          FROM OrdersTemp ot
          LEFT JOIN OrderItems oi ON ot.OrderID = oi.OrderID
          WHERE ot.OrderDate BETWEEN @startDate AND @endDate
        `);
      
      const data = result.recordset[0];
      const weeklyOrders = data.WeeklyOrders || 0;
      const weeklySales = data.WeeklySales || 0;
      const weeklyCustomers = data.WeeklyCustomers || 0;
      const weeklyDeliveryCharges = data.WeeklyDeliveryCharges || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `📅 इस सप्ताह की रिपोर्ट:\n\n` +
                `• कुल ऑर्डर: ${weeklyOrders}\n` +
                `• कुल बिक्री: ₹${formatNumber(weeklySales, 'hindi')}\n` +
                `• ग्राहक: ${weeklyCustomers}\n` +
                `• डिलीवरी चार्ज: ₹${formatNumber(weeklyDeliveryCharges, 'hindi')}`;
      } else {
        answer = `📅 This Week's Report:\n\n` +
                `• Total Orders: ${weeklyOrders}\n` +
                `• Total Sales: ₹${formatNumber(weeklySales, 'english')}\n` +
                `• Customers: ${weeklyCustomers}\n` +
                `• Delivery Charges: ₹${formatNumber(weeklyDeliveryCharges, 'english')}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { 
          weeklyOrders, 
          weeklySales, 
          weeklyCustomers,
          weeklyDeliveryCharges,
          weekStart: startOfWeek.toISOString().split('T')[0],
          weekEnd: endOfWeek.toISOString().split('T')[0]
        }
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
                `• अंतर: ₹${formatNumber(salesDifference, 'hindi')} (${salesDifference > 0 ? '+' : ''}${salesPercentage}%)\n\n` +
                `📊 ऑर्डर:\n` +
                `• ${currentMonthName}: ${currentOrders}\n` +
                `• ${lastMonthName}: ${lastOrders}\n` +
                `• अंतर: ${ordersDifference} (${ordersDifference > 0 ? '+' : ''}${ordersPercentage}%)`;
      } else {
        answer = `📈 ${lastMonthName} vs ${currentMonthName} Comparison:\n\n` +
                `💰 Sales:\n` +
                `• ${currentMonthName}: ₹${formatNumber(currentSales, 'english')}\n` +
                `• ${lastMonthName}: ₹${formatNumber(lastSales, 'english')}\n` +
                `• Difference: ₹${formatNumber(salesDifference, 'english')} (${salesDifference > 0 ? '+' : ''}${salesPercentage}%)\n\n` +
                `📊 Orders:\n` +
                `• ${currentMonthName}: ${currentOrders}\n` +
                `• ${lastMonthName}: ${lastOrders}\n` +
                `• Difference: ${ordersDifference} (${ordersDifference > 0 ? '+' : ''}${ordersPercentage}%)`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { 
          currentSales, 
          lastSales, 
          currentOrders, 
          lastOrders, 
          salesDifference, 
          ordersDifference, 
          salesPercentage, 
          ordersPercentage 
        }
      });
    }
// aiController.js में नया SECTION जोड़ें (SECTION 2 के बाद)

// 2.7 "4 February 2026 ko total kitne orders aaye?" - Improved version
if (q.includes("ko kitne") || q.includes("date") || q.includes("orders on") || q.includes("तारीख") || q.includes("को कितने")) {
  const dateInfo = extractDateFromText(question);
  const month = extractMonthFromText(question);
  const year = extractYearFromText(question);
  
  if (dateInfo) {
    const { day, month, year } = dateInfo;
    const monthName = getMonthName(month, language);
    
    const result = await pool.request()
      .input("day", sql.Int, day)
      .input("month", sql.Int, month)
      .input("year", sql.Int, year)
      .query(`
        SELECT 
          O.OrderID,
          O.InvoiceNo,
          O.CustomerName,
          O.Area,
          O.OrderDate,
          O.DeliveryCharge,
          O.ContactNo,
          O.OrderTakenBy,
          (
            SELECT STRING_AGG(CONCAT(ProductType, ' (', Quantity, ' × ₹', Rate, ')'), ', ')
            FROM orderItems I
            WHERE I.OrderID = O.OrderID
          ) AS Items,
          (
            SELECT SUM(Total)
            FROM orderItems I
            WHERE I.OrderID = O.OrderID
          ) AS Subtotal,
          A.DeliveryStatus,
          A.ActualDeliveryDate,
          (
            SELECT SUM(Amount)
            FROM OrderPayments OP
            WHERE OP.AssignID = A.AssignID
          ) AS AmountPaid
        FROM OrdersTemp O
        LEFT JOIN AssignedOrders A ON O.OrderID = A.OrderID
        WHERE DAY(O.OrderDate) = @day 
          AND MONTH(O.OrderDate) = @month 
          AND YEAR(O.OrderDate) = @year
        ORDER BY O.OrderDate DESC
      `);

    const orders = result.recordset;
    
    let answer;
    if (language === 'hindi') {
      if (orders.length === 0) {
        answer = `📅 ${day} ${monthName} ${year} को कोई ऑर्डर नहीं मिला।`;
      } else {
        const totalSales = orders.reduce((sum, order) => sum + (order.Subtotal || 0), 0);
        const totalDelivery = orders.reduce((sum, order) => sum + (order.DeliveryCharge || 0), 0);
        const totalAmount = totalSales + totalDelivery;
        
        answer = `📅 ${day} ${monthName} ${year} के ऑर्डर विवरण:\n\n` +
                `• कुल ऑर्डर: ${orders.length}\n` +
                `• कुल बिक्री: ₹${formatNumber(totalSales, 'hindi')}\n` +
                `• कुल डिलीवरी चार्ज: ₹${formatNumber(totalDelivery, 'hindi')}\n` +
                `• कुल राशि: ₹${formatNumber(totalAmount, 'hindi')}\n` +
                `• ग्राहक: ${new Set(orders.map(o => o.CustomerName)).size}\n\n`;
        
        // Show top 5 orders
        if (orders.length > 0) {
          answer += `📋 हाल के ऑर्डर:\n`;
          orders.slice(0, 5).forEach((order, index) => {
            const orderDate = new Date(order.OrderDate);
            const formattedDate = orderDate.toLocaleDateString('hi-IN');
            
            answer += `\n${index + 1}. ${order.CustomerName}\n`;
            answer += `   📞 ${order.ContactNo || 'N/A'}\n`;
            answer += `   📍 ${order.Area || 'N/A'}\n`;
            answer += `   📝 ${order.Items || 'कोई आइटम नहीं'}\n`;
            answer += `   💰 ₹${formatNumber(order.Subtotal || 0, 'hindi')}\n`;
            answer += `   🚚 ${order.DeliveryStatus || 'Pending'}\n`;
            answer += `   🧾 बिल: ${order.InvoiceNo || 'N/A'}\n`;
          });
          
          if (orders.length > 5) {
            answer += `\n... और ${orders.length - 5} और ऑर्डर`;
          }
        }
      }
    } else {
      if (orders.length === 0) {
        answer = `📅 No orders found for ${day} ${monthName} ${year}.`;
      } else {
        const totalSales = orders.reduce((sum, order) => sum + (order.Subtotal || 0), 0);
        const totalDelivery = orders.reduce((sum, order) => sum + (order.DeliveryCharge || 0), 0);
        const totalAmount = totalSales + totalDelivery;
        
        answer = `📅 Order Details for ${day} ${monthName} ${year}:\n\n` +
                `• Total Orders: ${orders.length}\n` +
                `• Total Sales: ₹${formatNumber(totalSales, 'english')}\n` +
                `• Total Delivery Charges: ₹${formatNumber(totalDelivery, 'english')}\n` +
                `• Total Amount: ₹${formatNumber(totalAmount, 'english')}\n` +
                `• Customers: ${new Set(orders.map(o => o.CustomerName)).size}\n\n`;
        
        // Show top 5 orders
        if (orders.length > 0) {
          answer += `📋 Recent Orders:\n`;
          orders.slice(0, 5).forEach((order, index) => {
            const orderDate = new Date(order.OrderDate);
            const formattedDate = orderDate.toLocaleDateString('en-IN');
            
            answer += `\n${index + 1}. ${order.CustomerName}\n`;
            answer += `   📞 ${order.ContactNo || 'N/A'}\n`;
            answer += `   📍 ${order.Area || 'N/A'}\n`;
            answer += `   📝 ${order.Items || 'No items'}\n`;
            answer += `   💰 ₹${formatNumber(order.Subtotal || 0, 'english')}\n`;
            answer += `   🚚 ${order.DeliveryStatus || 'Pending'}\n`;
            answer += `   🧾 Invoice: ${order.InvoiceNo || 'N/A'}\n`;
          });
          
          if (orders.length > 5) {
            answer += `\n... and ${orders.length - 5} more orders`;
          }
        }
      }
    }
    
    return res.json({ 
      success: true, 
      answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
      data: { 
        date: { day, month, year },
        totalOrders: orders.length,
        orders: orders.slice(0, 10),
        summary: {
          totalSales: orders.reduce((sum, order) => sum + (order.Subtotal || 0), 0),
          totalDelivery: orders.reduce((sum, order) => sum + (order.DeliveryCharge || 0), 0),
          totalCustomers: new Set(orders.map(o => o.CustomerName)).size
        }
      }
    });
  }
}


// 2.8 "February 2026 mein total kitne orders aaye?" - Improved version
if ((q.includes("month") || q.includes("mahine") || q.includes("महीने")) && 
    (q.includes("order") || q.includes("orders") || q.includes("ऑर्डर"))) {
  const month = extractMonthFromText(question);
  const year = extractYearFromText(question);
  
  if (!month) {
    let errorMsg = language === 'hindi'
      ? `${MY_NAME} जी, कृपया स्पष्ट महीना बताएं (जैसे: February 2026 में कितने orders?)`
      : `${MY_NAME} ji, please specify a clear month (e.g., How many orders in February 2026?)`;
    
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
      SELECT 
        O.OrderID,
        O.InvoiceNo,
        O.CustomerName,
        O.Area,
        O.OrderDate,
        O.DeliveryCharge,
        O.ContactNo,
        (
          SELECT STRING_AGG(CONCAT(ProductType, ' (', Quantity, ')'), ', ')
          FROM orderItems I
          WHERE I.OrderID = O.OrderID
        ) AS Items,
        (
          SELECT SUM(Total)
          FROM orderItems I
          WHERE I.OrderID = O.OrderID
        ) AS Subtotal,
        A.DeliveryStatus,
        DAY(O.OrderDate) AS OrderDay
      FROM OrdersTemp O
      LEFT JOIN AssignedOrders A ON O.OrderID = A.OrderID
      WHERE MONTH(O.OrderDate) = @month 
        AND YEAR(O.OrderDate) = @year
      ORDER BY O.OrderDate DESC
    `);
  
  const orders = result.recordset;
  const totalSales = orders.reduce((sum, order) => sum + (order.Subtotal || 0), 0);
  const totalDelivery = orders.reduce((sum, order) => sum + (order.DeliveryCharge || 0), 0);
  const totalAmount = totalSales + totalDelivery;
  
  // Daily breakdown
  const dailyStats = {};
  orders.forEach(order => {
    const day = order.OrderDay;
    if (!dailyStats[day]) {
      dailyStats[day] = { orders: 0, sales: 0 };
    }
    dailyStats[day].orders++;
    dailyStats[day].sales += (order.Subtotal || 0);
  });
  
  let answer;
  if (language === 'hindi') {
    answer = `📊 ${monthName} ${year} का विस्तृत रिपोर्ट:\n\n` +
            `• कुल ऑर्डर: ${orders.length}\n` +
            `• कुल बिक्री: ₹${formatNumber(totalSales, 'hindi')}\n` +
            `• कुल डिलीवरी चार्ज: ₹${formatNumber(totalDelivery, 'hindi')}\n` +
            `• कुल राशि: ₹${formatNumber(totalAmount, 'hindi')}\n` +
            `• ग्राहक: ${new Set(orders.map(o => o.CustomerName)).size}\n\n`;
    
    // Daily breakdown
    answer += `📅 दैनिक ब्रेकडाउन:\n`;
    Object.entries(dailyStats).sort((a, b) => b[1].sales - a[1].sales).slice(0, 5).forEach(([day, stats]) => {
      answer += `• ${day} ${monthName}: ${stats.orders} ऑर्डर, ₹${formatNumber(stats.sales, 'hindi')}\n`;
    });
    
    if (Object.keys(dailyStats).length > 5) {
      answer += `• ... और ${Object.keys(dailyStats).length - 5} और दिन\n\n`;
    }
    
    // Top 5 orders
    if (orders.length > 0) {
      answer += `🏆 सबसे बड़े ऑर्डर:\n`;
      orders.slice(0, 3).forEach((order, index) => {
        const orderDate = new Date(order.OrderDate);
        const formattedDate = orderDate.toLocaleDateString('hi-IN');
        
        answer += `\n${index + 1}. ${order.CustomerName}\n`;
        answer += `   📍 ${order.Area || 'N/A'}\n`;
        answer += `   💰 ₹${formatNumber(order.Subtotal || 0, 'hindi')}\n`;
        answer += `   🧾 ${order.InvoiceNo || 'N/A'}\n`;
        answer += `   📝 ${order.Items ? order.Items.substring(0, 50) + (order.Items.length > 50 ? '...' : '') : 'कोई आइटम नहीं'}\n`;
      });
    }
  } else {
    answer = `📊 Detailed Report for ${monthName} ${year}:\n\n` +
            `• Total Orders: ${orders.length}\n` +
            `• Total Sales: ₹${formatNumber(totalSales, 'english')}\n` +
            `• Total Delivery Charges: ₹${formatNumber(totalDelivery, 'english')}\n` +
            `• Total Amount: ₹${formatNumber(totalAmount, 'english')}\n` +
            `• Customers: ${new Set(orders.map(o => o.CustomerName)).size}\n\n`;
    
    // Daily breakdown
    answer += `📅 Daily Breakdown:\n`;
    Object.entries(dailyStats).sort((a, b) => b[1].sales - a[1].sales).slice(0, 5).forEach(([day, stats]) => {
      answer += `• ${day} ${monthName}: ${stats.orders} orders, ₹${formatNumber(stats.sales, 'english')}\n`;
    });
    
    if (Object.keys(dailyStats).length > 5) {
      answer += `• ... and ${Object.keys(dailyStats).length - 5} more days\n\n`;
    }
    
    // Top 5 orders
    if (orders.length > 0) {
      answer += `🏆 Biggest Orders:\n`;
      orders.slice(0, 3).forEach((order, index) => {
        const orderDate = new Date(order.OrderDate);
        const formattedDate = orderDate.toLocaleDateString('en-IN');
        
        answer += `\n${index + 1}. ${order.CustomerName}\n`;
        answer += `   📍 ${order.Area || 'N/A'}\n`;
        answer += `   💰 ₹${formatNumber(order.Subtotal || 0, 'english')}\n`;
        answer += `   🧾 ${order.InvoiceNo || 'N/A'}\n`;
        answer += `   📝 ${order.Items ? order.Items.substring(0, 50) + (order.Items.length > 50 ? '...' : '') : 'No items'}\n`;
      });
    }
  }
  
  return res.json({ 
    success: true, 
    answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
    data: { 
      month: { number: month, name: monthName, year },
      totalOrders: orders.length,
      totalSales,
      totalDelivery,
      totalAmount,
      dailyStats,
      orders: orders.slice(0, 10)
    }
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
      const area = extractAreaFromText(question);
      
      let query = `
        SELECT 
          o.CustomerName,
          MIN(o.OrderDate) AS FirstOrderDate,
          COUNT(*) AS TotalOrders,
          SUM(i.Total) AS TotalSpent,
          o.Area
        FROM OrdersTemp o
        LEFT JOIN orderItems i ON o.OrderID = i.OrderID
        WHERE DATEDIFF(DAY, o.OrderDate, GETDATE()) <= 30
      `;
      
      if (area) {
        query += ` AND o.Area LIKE '%${area}%' `;
      }
      
      query += ` GROUP BY o.CustomerName, o.Area HAVING COUNT(*) = 1 ORDER BY FirstOrderDate DESC`;
      
      const result = await pool.request().query(query);
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
      const month = extractMonthFromText(question);
      const year = extractYearFromText(question);
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
            answer += `   • मूल्य: ₹${formatNumber(item.stock_value, 'hindi')}\n\n`;
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
            answer += `   • Value: ₹${formatNumber(item.stock_value, 'english')}\n\n`;
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
      
      if (products.length === 0) {
        products.push("Tray", "Box");
      }
      
      const productList = products.map(p => `'%${p}%'`).join(', ');
      
      const result = await pool.request().query(`
        SELECT 
          item_name,
          SUM(quantity) AS current_stock,
          SUM(quantity * rate) AS stock_value
        FROM Stock
        WHERE quantity > 0
          AND (${products.map((_, i) => `item_name LIKE '%${products[i]}%'`).join(' OR ')})
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

    // 4.4 "Is mahine kitna stock reject hua?"
    if (q.includes("stock reject") || q.includes("reject hua") || q.includes("खराब माल") || q.includes("रिजेक्ट स्टॉक")) {
      const month = extractMonthFromText(question) || new Date().getMonth() + 1;
      const year = extractYearFromText(question) || new Date().getFullYear();
      const monthName = getMonthName(month, language);
      
      const result = await pool.request()
        .input("month", sql.Int, month)
        .input("year", sql.Int, year)
        .query(`
          SELECT 
            item_name,
            SUM(quantity) AS TotalRejected,
            reason,
            COUNT(*) AS RejectionsCount
          FROM RejectedStock
          WHERE MONTH(reject_date) = @month 
            AND YEAR(reject_date) = @year
          GROUP BY item_name, reason
          ORDER BY TotalRejected DESC
        `);
      
      const rejectedItems = result.recordset;
      const totalRejected = rejectedItems.reduce((sum, item) => sum + (item.TotalRejected || 0), 0);
      
      let answer;
      if (language === 'hindi') {
        answer = `🗑️ ${monthName} ${year} में रिजेक्ट/खराब माल:\n\n`;
        
        if (rejectedItems.length === 0) {
          answer += "इस महीने कोई माल रिजेक्ट नहीं हुआ।";
        } else {
          answer += `• कुल रिजेक्ट यूनिट: ${formatNumber(totalRejected, 'hindi')}\n`;
          answer += `• रिजेक्ट प्रकार: ${rejectedItems.length}\n\n`;
          
          rejectedItems.forEach((item, index) => {
            answer += `${index + 1}. ${item.item_name}\n`;
            answer += `   • मात्रा: ${formatNumber(item.TotalRejected, 'hindi')}\n`;
            answer += `   • कारण: ${item.reason || 'नोट नहीं'}\n`;
            answer += `   • बार: ${item.RejectionsCount}\n\n`;
          });
        }
      } else {
        answer = `🗑️ Rejected/Damaged Stock in ${monthName} ${year}:\n\n`;
        
        if (rejectedItems.length === 0) {
          answer += "No stock was rejected this month.";
        } else {
          answer += `• Total Rejected Units: ${formatNumber(totalRejected, 'english')}\n`;
          answer += `• Rejection Types: ${rejectedItems.length}\n\n`;
          
          rejectedItems.forEach((item, index) => {
            answer += `${index + 1}. ${item.item_name}\n`;
            answer += `   • Quantity: ${formatNumber(item.TotalRejected, 'english')}\n`;
            answer += `   • Reason: ${item.reason || 'Not noted'}\n`;
            answer += `   • Times: ${item.RejectionsCount}\n\n`;
          });
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { rejectedItems, totalRejected, month: monthName, year }
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
      const month = extractMonthFromText(question) || new Date().getMonth() + 1;
      const year = extractYearFromText(question) || new Date().getFullYear();
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

    // 5.5 "Aaj kitna short amount collection mein aaya?"
    if (q.includes("short amount") || q.includes("कम राशि") || q.includes("शॉर्ट अमाउंट")) {
      const today = new Date().toISOString().split('T')[0];
      
      const result = await pool.request()
        .input("today", sql.Date, today)
        .query(`
          SELECT 
            SUM(ShortAmount) AS TotalShortAmount,
            COUNT(*) AS ShortTransactions,
            STRING_AGG(CONCAT(CustomerName, ' (₹', ShortAmount, ')'), ', ') AS ShortDetails
          FROM OrderPayments op
          JOIN AssignedOrders ao ON op.AssignID = ao.AssignID
          JOIN OrdersTemp o ON ao.OrderID = o.OrderID
          WHERE CAST(ao.PaymentReceivedDate AS DATE) = @today
            AND ShortAmount > 0
        `);
      
      const data = result.recordset[0];
      const totalShort = data.TotalShortAmount || 0;
      const shortTransactions = data.ShortTransactions || 0;
      const shortDetails = data.ShortDetails || 'कोई डिटेल नहीं';
      
      let answer;
      if (language === 'hindi') {
        answer = `⚠️  आज की शॉर्ट कलेक्शन:\n\n` +
                `• कुल शॉर्ट राशि: ₹${formatNumber(totalShort, 'hindi')}\n` +
                `• शॉर्ट ट्रांजैक्शन: ${shortTransactions}\n`;
        
        if (shortTransactions > 0) {
          answer += `• डिटेल: ${shortDetails}`;
        }
      } else {
        answer = `⚠️  Today's Short Collection:\n\n` +
                `• Total Short Amount: ₹${formatNumber(totalShort, 'english')}\n` +
                `• Short Transactions: ${shortTransactions}\n`;
        
        if (shortTransactions > 0) {
          answer += `• Details: ${shortDetails}`;
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { totalShort, shortTransactions, shortDetails }
      });
    }

    // ==============================================
    // SECTION 6: DELIVERY & STAFF PERFORMANCE
    // ==============================================
    
    // 6.1 "Aaj total kitni deliveries pending hain?"
    if (q.includes("deliveries pending") || q.includes("पेंडिंग डिलीवरी")) {
      const today = new Date().toISOString().split('T')[0];
      
      const result = await pool.request()
        .input("today", sql.Date, today)
        .query(`
          SELECT 
            COUNT(*) AS TodayPending,
            DM.Name AS DeliveryBoyName,
            COUNT(CASE WHEN A.DeliveryStatus = 'Pending' THEN 1 END) AS PendingCount,
            COUNT(CASE WHEN A.DeliveryStatus = 'In Transit' THEN 1 END) AS InTransitCount
          FROM AssignedOrders A
          LEFT JOIN DeliveryMen DM ON A.DeliveryManID = DM.DeliveryManID
          WHERE CAST(A.DeliveryDate AS DATE) = @today
            AND A.DeliveryStatus NOT IN ('Complete', 'Cancel')
          GROUP BY DM.Name
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
      const deliveryBoy = extractDeliveryBoyFromText(question);
      const today = new Date().toISOString().split('T')[0];
      
      let query = `
        SELECT 
          COUNT(*) AS TodayDeliveries,
          SUM(CASE WHEN A.DeliveryStatus = 'Complete' THEN 1 ELSE 0 END) AS Completed,
          SUM(CASE WHEN A.DeliveryStatus = 'Cancel' THEN 1 ELSE 0 END) AS Cancelled,
          SUM(CASE WHEN A.DeliveryStatus = 'Pending' THEN 1 ELSE 0 END) AS Pending,
          SUM(CASE WHEN A.DeliveryStatus = 'In Transit' THEN 1 ELSE 0 END) AS InTransit
        FROM AssignedOrders A
        WHERE CAST(A.DeliveryDate AS DATE) = '${today}'
      `;
      
      if (deliveryBoy) {
        query += ` AND A.DeliveryManID IN (SELECT DeliveryManID FROM DeliveryMen WHERE Name LIKE '%${deliveryBoy}%')`;
      }
      
      const result = await pool.request().query(query);
      
      const data = result.recordset[0];
      const todayDeliveries = data.TodayDeliveries || 0;
      const completed = data.Completed || 0;
      const cancelled = data.Cancelled || 0;
      const pending = data.Pending || 0;
      const inTransit = data.InTransit || 0;
      
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
        
        if (todayDeliveries > 0) {
          const successRate = ((completed / todayDeliveries) * 100).toFixed(1);
          answer += `• Success Rate: ${successRate}%`;
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { todayDeliveries, completed, cancelled, pending, inTransit }
      });
    }

    // 6.3 "Sabse zyada fast delivery kaunsa boy kar raha hai?"
    if (q.includes("fast delivery") || q.includes("तेज डिलीवरी") || q.includes("क्विक डिलीवरी")) {
      const result = await pool.request().query(`
        SELECT TOP 5
          DM.Name AS DeliveryBoyName,
          COUNT(*) AS TotalDeliveries,
          AVG(DATEDIFF(MINUTE, A.DeliveryDate, A.ActualDeliveryDate)) AS AvgDeliveryTime,
          MIN(DATEDIFF(MINUTE, A.DeliveryDate, A.ActualDeliveryDate)) AS FastestDelivery,
          SUM(CASE WHEN A.DeliveryStatus = 'Complete' THEN 1 ELSE 0 END) AS Completed
        FROM AssignedOrders A
        JOIN DeliveryMen DM ON A.DeliveryManID = DM.DeliveryManID
        WHERE A.ActualDeliveryDate IS NOT NULL
          AND A.DeliveryStatus = 'Complete'
        GROUP BY DM.Name
        HAVING COUNT(*) > 5
        ORDER BY AvgDeliveryTime ASC
      `);
      
      const fastBoys = result.recordset;
      
      if (fastBoys.length === 0) {
        let answer = language === 'hindi'
          ? "🚚 फिलहाल पर्याप्त डिलीवरी डेटा उपलब्ध नहीं है।"
          : "🚚 Not enough delivery data available at the moment.";
        
        return res.json({ success: true, answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}` });
      }
      
      let answer;
      if (language === 'hindi') {
        answer = `⚡ सबसे तेज डिलीवरी करने वाले बॉय:\n\n`;
        fastBoys.forEach((boy, index) => {
          const avgTime = Math.round(boy.AvgDeliveryTime || 0);
          const fastest = Math.round(boy.FastestDelivery || 0);
          const successRate = boy.TotalDeliveries > 0 ? ((boy.Completed / boy.TotalDeliveries) * 100).toFixed(1) : 0;
          
          answer += `${index + 1}. ${boy.DeliveryBoyName}\n`;
          answer += `   • औसत समय: ${avgTime} मिनट\n`;
          answer += `   • सबसे तेज: ${fastest} मिनट\n`;
          answer += `   • कुल डिलीवरी: ${boy.TotalDeliveries}\n`;
          answer += `   • सफलता दर: ${successRate}%\n\n`;
        });
      } else {
        answer = `⚡ Fastest Delivery Boys:\n\n`;
        fastBoys.forEach((boy, index) => {
          const avgTime = Math.round(boy.AvgDeliveryTime || 0);
          const fastest = Math.round(boy.FastestDelivery || 0);
          const successRate = boy.TotalDeliveries > 0 ? ((boy.Completed / boy.TotalDeliveries) * 100).toFixed(1) : 0;
          
          answer += `${index + 1}. ${boy.DeliveryBoyName}\n`;
          answer += `   • Average Time: ${avgTime} minutes\n`;
          answer += `   • Fastest: ${fastest} minutes\n`;
          answer += `   • Total Deliveries: ${boy.TotalDeliveries}\n`;
          answer += `   • Success Rate: ${successRate}%\n\n`;
        });
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { fastBoys }
      });
    }

    // 6.4 "Kitne orders cancel hue aur kyun?"
    if (q.includes("cancel hue") || q.includes("cancelled orders") || q.includes("कैंसल ऑर्डर")) {
      const month = extractMonthFromText(question) || new Date().getMonth() + 1;
      const year = extractYearFromText(question) || new Date().getFullYear();
      const monthName = getMonthName(month, language);
      
      const result = await pool.request()
        .input("month", sql.Int, month)
        .input("year", sql.Int, year)
        .query(`
          SELECT 
            COUNT(*) AS TotalCancelled,
            STRING_AGG(DISTINCT CompletionRemarks, ', ') AS Reasons,
            COUNT(DISTINCT CustomerName) AS CustomersCancelled,
            SUM(oi.Total) AS CancelledAmount
          FROM AssignedOrders A
          JOIN OrdersTemp O ON A.OrderID = O.OrderID
          LEFT JOIN OrderItems oi ON O.OrderID = oi.OrderID
          WHERE A.DeliveryStatus = 'Cancel'
            AND MONTH(A.ActualDeliveryDate) = @month
            AND YEAR(A.ActualDeliveryDate) = @year
        `);
      
      const data = result.recordset[0];
      const totalCancelled = data.TotalCancelled || 0;
      const reasons = data.Reasons || 'कोई कारण नहीं बताया';
      const customersCancelled = data.CustomersCancelled || 0;
      const cancelledAmount = data.CancelledAmount || 0;
      
      let answer;
      if (language === 'hindi') {
        answer = `❌ ${monthName} ${year} में कैंसल किए गए ऑर्डर:\n\n` +
                `• कुल कैंसल: ${totalCancelled}\n` +
                `• कैंसल ग्राहक: ${customersCancelled}\n` +
                `• कैंसल राशि: ₹${formatNumber(cancelledAmount, 'hindi')}\n` +
                `• कारण: ${reasons}`;
      } else {
        answer = `❌ Cancelled Orders in ${monthName} ${year}:\n\n` +
                `• Total Cancelled: ${totalCancelled}\n` +
                `• Customers Cancelled: ${customersCancelled}\n` +
                `• Cancelled Amount: ₹${formatNumber(cancelledAmount, 'english')}\n` +
                `• Reasons: ${reasons}`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { totalCancelled, reasons, customersCancelled, cancelledAmount }
      });
    }

    // ==============================================
    // SECTION 7: AREA-WISE PERFORMANCE
    // ==============================================
    
    // 7.1 "Sabse behtar (top performing) area kaunsa hai?"
    if (
      q.includes("sabse behtar area") || 
      q.includes("top performing area") || 
      q.includes("बेस्ट एरिया") ||
      q.includes("टॉप परफॉर्मिंग एरिया")
    ) {
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
      
      if (areas.length === 0) {
        let answer = language === 'hindi'
          ? "📍 कोई एरिया डेटा उपलब्ध नहीं है।"
          : "📍 No area data available.";
        
        return res.json({ success: true, answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}` });
      }
      
      let answer;
      if (language === 'hindi') {
        answer = `🏆 टॉप परफॉर्मिंग एरिया:\n\n`;
        areas.forEach((area, index) => {
          answer += `${index + 1}. ${area.Area}\n`;
          answer += `   • बिक्री: ₹${formatNumber(area.TotalSales, 'hindi')}\n`;
          answer += `   • ऑर्डर: ${area.TotalOrders}\n`;
          answer += `   • ग्राहक: ${area.TotalCustomers}\n`;
          answer += `   • औसत ऑर्डर: ₹${formatNumber(area.AvgOrderValue, 'hindi')}\n\n`;
        });
      } else {
        answer = `🏆 Top Performing Areas:\n\n`;
        areas.forEach((area, index) => {
          answer += `${index + 1}. ${area.Area}\n`;
          answer += `   • Sales: ₹${formatNumber(area.TotalSales, 'english')}\n`;
          answer += `   • Orders: ${area.TotalOrders}\n`;
          answer += `   • Customers: ${area.TotalCustomers}\n`;
          answer += `   • Avg Order: ₹${formatNumber(area.AvgOrderValue, 'english')}\n\n`;
        });
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { areas }
      });
    }

    // 7.2 "Kis area se sabse kam orders aa rahe hain?"
    if (q.includes("sabse kam orders") || q.includes("least orders") || q.includes("कम ऑर्डर")) {
      const result = await pool.request().query(`
        SELECT TOP 5
          o.Area,
          COUNT(DISTINCT o.OrderID) AS TotalOrders,
          SUM(i.Total) AS TotalSales,
          COUNT(DISTINCT o.CustomerName) AS TotalCustomers,
          MAX(o.OrderDate) AS LastOrderDate
        FROM OrdersTemp o
        LEFT JOIN orderItems i ON o.OrderID = i.OrderID
        WHERE o.Area IS NOT NULL AND o.Area != ''
        GROUP BY o.Area
        HAVING COUNT(DISTINCT o.OrderID) > 0
        ORDER BY TotalOrders ASC
      `);
      
      const areas = result.recordset;
      
      if (areas.length === 0) {
        let answer = language === 'hindi'
          ? "📍 कोई एरिया डेटा उपलब्ध नहीं है।"
          : "📍 No area data available.";
        
        return res.json({ success: true, answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}` });
      }
      
      let answer;
      if (language === 'hindi') {
        answer = `📉 सबसे कम ऑर्डर वाले एरिया:\n\n`;
        areas.forEach((area, index) => {
          const lastOrderDate = new Date(area.LastOrderDate);
          const daysAgo = Math.floor((new Date() - lastOrderDate) / (1000 * 60 * 60 * 24));
          
          answer += `${index + 1}. ${area.Area}\n`;
          answer += `   • ऑर्डर: ${area.TotalOrders}\n`;
          answer += `   • बिक्री: ₹${formatNumber(area.TotalSales, 'hindi')}\n`;
          answer += `   • ग्राहक: ${area.TotalCustomers}\n`;
          answer += `   • आखिरी ऑर्डर: ${daysAgo} दिन पहले\n\n`;
        });
      } else {
        answer = `📉 Areas with Least Orders:\n\n`;
        areas.forEach((area, index) => {
          const lastOrderDate = new Date(area.LastOrderDate);
          const daysAgo = Math.floor((new Date() - lastOrderDate) / (1000 * 60 * 60 * 24));
          
          answer += `${index + 1}. ${area.Area}\n`;
          answer += `   • Orders: ${area.TotalOrders}\n`;
          answer += `   • Sales: ₹${formatNumber(area.TotalSales, 'english')}\n`;
          answer += `   • Customers: ${area.TotalCustomers}\n`;
          answer += `   • Last Order: ${daysAgo} days ago\n\n`;
        });
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { areas }
      });
    }

    // 7.3 "Area-wise sales growth kya hai?"
    if (q.includes("area wise growth") || q.includes("एरिया वाइज ग्रोथ")) {
      const result = await pool.request().query(`
        WITH CurrentMonth AS (
          SELECT 
            o.Area,
            SUM(i.Total) AS CurrentSales,
            COUNT(*) AS CurrentOrders
          FROM OrdersTemp o
          LEFT JOIN orderItems i ON o.OrderID = i.OrderID
          WHERE MONTH(o.OrderDate) = MONTH(GETDATE())
            AND YEAR(o.OrderDate) = YEAR(GETDATE())
            AND o.Area IS NOT NULL AND o.Area != ''
          GROUP BY o.Area
        ),
        LastMonth AS (
          SELECT 
            o.Area,
            SUM(i.Total) AS LastSales,
            COUNT(*) AS LastOrders
          FROM OrdersTemp o
          LEFT JOIN orderItems i ON o.OrderID = i.OrderID
          WHERE MONTH(o.OrderDate) = MONTH(DATEADD(MONTH, -1, GETDATE()))
            AND YEAR(o.OrderDate) = YEAR(DATEADD(MONTH, -1, GETDATE()))
            AND o.Area IS NOT NULL AND o.Area != ''
          GROUP BY o.Area
        )
        SELECT 
          COALESCE(c.Area, l.Area) AS Area,
          ISNULL(c.CurrentSales, 0) AS CurrentSales,
          ISNULL(c.CurrentOrders, 0) AS CurrentOrders,
          ISNULL(l.LastSales, 0) AS LastSales,
          ISNULL(l.LastOrders, 0) AS LastOrders,
          CASE 
            WHEN ISNULL(l.LastSales, 0) = 0 THEN 0
            ELSE ((ISNULL(c.CurrentSales, 0) - ISNULL(l.LastSales, 0)) / ISNULL(l.LastSales, 0)) * 100
          END AS SalesGrowthPercentage
        FROM CurrentMonth c
        FULL OUTER JOIN LastMonth l ON c.Area = l.Area
        WHERE COALESCE(c.CurrentSales, l.LastSales) > 0
        ORDER BY SalesGrowthPercentage DESC
      `);
      
      const growthData = result.recordset;
      
      let answer;
      if (language === 'hindi') {
        answer = `📈 एरिया-वाइज सेल्स ग्रोथ (इस महीने vs पिछले महीने):\n\n`;
        
        if (growthData.length === 0) {
          answer += "कोई ग्रोथ डेटा उपलब्ध नहीं है।";
        } else {
          growthData.forEach((area, index) => {
            const growthSign = area.SalesGrowthPercentage >= 0 ? '+' : '';
            answer += `${index + 1}. ${area.Area}\n`;
            answer += `   • इस महीने: ₹${formatNumber(area.CurrentSales, 'hindi')} (${area.CurrentOrders} ऑर्डर)\n`;
            answer += `   • पिछले महीने: ₹${formatNumber(area.LastSales, 'hindi')} (${area.LastOrders} ऑर्डर)\n`;
            answer += `   • ग्रोथ: ${growthSign}${parseFloat(area.SalesGrowthPercentage).toFixed(1)}%\n\n`;
          });
        }
      } else {
        answer = `📈 Area-wise Sales Growth (This Month vs Last Month):\n\n`;
        
        if (growthData.length === 0) {
          answer += "No growth data available.";
        } else {
          growthData.forEach((area, index) => {
            const growthSign = area.SalesGrowthPercentage >= 0 ? '+' : '';
            answer += `${index + 1}. ${area.Area}\n`;
            answer += `   • This Month: ₹${formatNumber(area.CurrentSales, 'english')} (${area.CurrentOrders} orders)\n`;
            answer += `   • Last Month: ₹${formatNumber(area.LastSales, 'english')} (${area.LastOrders} orders)\n`;
            answer += `   • Growth: ${growthSign}${parseFloat(area.SalesGrowthPercentage).toFixed(1)}%\n\n`;
          });
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { growthData }
      });
    }

    // ==============================================
    // SECTION 8: PRODUCT ANALYTICS
    // ==============================================
    
    // 8.1 "Sabse zyada bikne wala product kaunsa hai?"
    if (
      q.includes("sabse zyada bikne") || 
      q.includes("best seller") || 
      q.includes("बेस्ट सेलर") ||
      q.includes("top product")
    ) {
      const result = await pool.request().query(`
        SELECT TOP 5
          ProductType,
          SUM(Quantity) AS TotalUnits,
          SUM(Total) AS TotalSales,
          COUNT(DISTINCT OrderID) AS OrderCount,
          AVG(Rate) AS AvgPrice
        FROM orderItems
        WHERE ProductType IS NOT NULL AND ProductType != ''
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
        answer = `🏆 सबसे ज्यादा बिकने वाले उत्पाद:\n\n`;
        products.forEach((prod, index) => {
          answer += `${index + 1}. ${prod.ProductType}\n`;
          answer += `   • यूनिट: ${formatNumber(prod.TotalUnits, 'hindi')}\n`;
          answer += `   • बिक्री: ₹${formatNumber(prod.TotalSales, 'hindi')}\n`;
          answer += `   • ऑर्डर: ${prod.OrderCount}\n`;
          answer += `   • औसत दाम: ₹${formatNumber(prod.AvgPrice, 'hindi')}\n\n`;
        });
      } else {
        answer = `🏆 Best Selling Products:\n\n`;
        products.forEach((prod, index) => {
          answer += `${index + 1}. ${prod.ProductType}\n`;
          answer += `   • Units: ${formatNumber(prod.TotalUnits, 'english')}\n`;
          answer += `   • Sales: ₹${formatNumber(prod.TotalSales, 'english')}\n`;
          answer += `   • Orders: ${prod.OrderCount}\n`;
          answer += `   • Avg Price: ₹${formatNumber(prod.AvgPrice, 'english')}\n\n`;
        });
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { products }
      });
    }

    // 8.2 "Milk aur Curd mein se kiski sale zyada hai?"
    if (q.includes("milk") || q.includes("curd") || q.includes("दूध") || q.includes("दही")) {
      const products = [];
      if (q.includes("milk") || q.includes("दूध")) products.push("Milk");
      if (q.includes("curd") || q.includes("दही")) products.push("Curd");
      
      if (products.length === 0) {
        products.push("Milk", "Curd");
      }
      
      const productList = products.map(p => `'%${p}%'`).join(', ');
      
      const result = await pool.request().query(`
        SELECT 
          ProductType,
          SUM(Quantity) AS TotalUnits,
          SUM(Total) AS TotalSales,
          COUNT(DISTINCT OrderID) AS OrderCount
        FROM orderItems
        WHERE (${products.map(p => `ProductType LIKE '%${p}%'`).join(' OR ')})
        GROUP BY ProductType
        ORDER BY TotalSales DESC
      `);
      
      const productData = result.recordset;
      
      let answer;
      if (language === 'hindi') {
        answer = `🥛 दूध और दही की बिक्री तुलना:\n\n`;
        
        if (productData.length === 0) {
          answer += "इन प्रोडक्ट्स की कोई बिक्री डेटा उपलब्ध नहीं है।";
        } else {
          productData.forEach((prod, index) => {
            answer += `${index + 1}. ${prod.ProductType}\n`;
            answer += `   • यूनिट: ${formatNumber(prod.TotalUnits, 'hindi')}\n`;
            answer += `   • बिक्री: ₹${formatNumber(prod.TotalSales, 'hindi')}\n`;
            answer += `   • ऑर्डर: ${prod.OrderCount}\n\n`;
          });
          
          // Compare if both products exist
          if (productData.length >= 2) {
            const product1 = productData[0];
            const product2 = productData[1];
            const difference = product1.TotalSales - product2.TotalSales;
            const betterProduct = difference > 0 ? product1.ProductType : product2.ProductType;
            
            answer += `🏆 ${betterProduct} की बिक्री ₹${formatNumber(Math.abs(difference), 'hindi')} ज्यादा है।`;
          }
        }
      } else {
        answer = `🥛 Milk vs Curd Sales Comparison:\n\n`;
        
        if (productData.length === 0) {
          answer += "No sales data available for these products.";
        } else {
          productData.forEach((prod, index) => {
            answer += `${index + 1}. ${prod.ProductType}\n`;
            answer += `   • Units: ${formatNumber(prod.TotalUnits, 'english')}\n`;
            answer += `   • Sales: ₹${formatNumber(prod.TotalSales, 'english')}\n`;
            answer += `   • Orders: ${prod.OrderCount}\n\n`;
          });
          
          // Compare if both products exist
          if (productData.length >= 2) {
            const product1 = productData[0];
            const product2 = productData[1];
            const difference = product1.TotalSales - product2.TotalSales;
            const betterProduct = difference > 0 ? product1.ProductType : product2.ProductType;
            
            answer += `🏆 ${betterProduct} has ₹${formatNumber(Math.abs(difference), 'english')} more sales.`;
          }
        }
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { productData }
      });
    }

    // 8.3 "Product-wise sales details do."
    if (
      q.includes("product wise") || 
      q.includes("product-wise") || 
      q.includes("प्रोडक्ट वाइज") ||
      q.includes("product details")
    ) {
      const result = await pool.request().query(`
        SELECT 
          ProductType,
          SUM(Quantity) AS TotalUnits,
          SUM(Total) AS TotalSales,
          COUNT(DISTINCT OrderID) AS OrderCount,
          AVG(Rate) AS AvgPrice,
          MIN(Rate) AS MinPrice,
          MAX(Rate) AS MaxPrice
        FROM orderItems
        WHERE ProductType IS NOT NULL AND ProductType != ''
        GROUP BY ProductType
        ORDER BY TotalSales DESC
      `);
      
      const products = result.recordset;
      const totalSales = products.reduce((sum, prod) => sum + (prod.TotalSales || 0), 0);
      
      let answer;
      if (language === 'hindi') {
        answer = `📊 प्रोडक्ट-वाइज बिक्री विवरण:\n\n` +
                `• कुल बिक्री: ₹${formatNumber(totalSales, 'hindi')}\n` +
                `• प्रोडक्ट प्रकार: ${products.length}\n\n`;
        
        answer += `📈 प्रोडक्ट ब्रेकडाउन:\n\n`;
        products.forEach((prod, index) => {
          const percentage = totalSales > 0 ? ((prod.TotalSales / totalSales) * 100).toFixed(1) : 0;
          
          answer += `${index + 1}. ${prod.ProductType}\n`;
          answer += `   • बिक्री: ₹${formatNumber(prod.TotalSales, 'hindi')} (${percentage}%)\n`;
          answer += `   • यूनिट: ${formatNumber(prod.TotalUnits, 'hindi')}\n`;
          answer += `   • ऑर्डर: ${prod.OrderCount}\n`;
          answer += `   • दाम: ₹${formatNumber(prod.MinPrice, 'hindi')} - ₹${formatNumber(prod.MaxPrice, 'hindi')}\n`;
          answer += `   • औसत: ₹${formatNumber(prod.AvgPrice, 'hindi')}\n\n`;
        });
      } else {
        answer = `📊 Product-wise Sales Details:\n\n` +
                `• Total Sales: ₹${formatNumber(totalSales, 'english')}\n` +
                `• Product Types: ${products.length}\n\n`;
        
        answer += `📈 Product Breakdown:\n\n`;
        products.forEach((prod, index) => {
          const percentage = totalSales > 0 ? ((prod.TotalSales / totalSales) * 100).toFixed(1) : 0;
          
          answer += `${index + 1}. ${prod.ProductType}\n`;
          answer += `   • Sales: ₹${formatNumber(prod.TotalSales, 'english')} (${percentage}%)\n`;
          answer += `   • Units: ${formatNumber(prod.TotalUnits, 'english')}\n`;
          answer += `   • Orders: ${prod.OrderCount}\n`;
          answer += `   • Price: ₹${formatNumber(prod.MinPrice, 'english')} - ₹${formatNumber(prod.MaxPrice, 'english')}\n`;
          answer += `   • Average: ₹${formatNumber(prod.AvgPrice, 'english')}\n\n`;
        });
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { products, totalSales }
      });
    }

    // ==============================================
    // SECTION 9: ORDER & INVOICE SEARCH
    // ==============================================
    
    // 9.1 Invoice/Bill details search
    if (q.includes("bill") || q.includes("invoice") || q.includes("बिल") || q.includes("इनवॉइस")) {
      const invoiceNo = extractInvoiceNumberFromText(question);
      
      if (!invoiceNo) {
        let errorMsg = language === 'hindi'
          ? `${MY_NAME} जी, कृपया बिल नंबर सही से बताएं (जैसे: 25-26/19)`
          : `${MY_NAME} ji, please provide the bill number correctly (e.g., 25-26/19)`;
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${errorMsg}${getSignature(language)}`
        });
      }

      try {
        const result = await pool.request()
          .input("invoiceNo", sql.NVarChar, invoiceNo)
          .query(`
            SELECT 
              O.OrderID, O.InvoiceNo, O.CustomerName, O.Area, O.Address, O.ContactNo, 
              O.OrderDate, O.DeliveryCharge, O.Po_No, O.Po_Date, O.OrderTakenBy,
              Items = (SELECT STRING_AGG(ProductName + ' ' + CAST(Weight AS VARCHAR) + ' (' + CAST(Quantity AS VARCHAR) + ')', ', ') 
                       FROM orderItems WHERE OrderID = O.OrderID),
              Subtotal = (SELECT SUM(Total) FROM orderItems WHERE OrderID = O.OrderID),
              Status = (SELECT TOP 1 DeliveryStatus FROM AssignedOrders WHERE OrderID = O.OrderID),
              Paid = (SELECT SUM(Amount) FROM OrderPayments WHERE AssignID IN 
                      (SELECT AssignID FROM AssignedOrders WHERE OrderID = O.OrderID))
            FROM OrdersTemp O
            WHERE O.InvoiceNo = @invoiceNo OR O.InvoiceNo LIKE '%' + @invoiceNo
          `);
        
        if (result.recordset.length === 0) {
          let errorMsg = language === 'hindi'
            ? `${MY_NAME} जी, डेटाबेस में Invoice No. ${invoiceNo} नहीं मिला।`
            : `${MY_NAME} ji, Invoice No. ${invoiceNo} not found in database.`;
          
          return res.json({ 
            success: true, 
            answer: `${getPersonalizedGreeting(language)}\n\n${errorMsg}${getSignature(language)}`
          });
        }

        const inv = result.recordset[0];
        const orderDate = inv.OrderDate ? new Date(inv.OrderDate).toLocaleDateString('en-GB') : 'N/A';
        const poDate = inv.Po_Date ? new Date(inv.Po_Date).toLocaleDateString('en-GB') : 'N/A';
        
        // Final Calculations
        const itemSubtotal = inv.Subtotal || 0;
        const deliveryCharge = inv.DeliveryCharge || 0;
        const grandTotal = itemSubtotal + deliveryCharge;
        const paymentReceived = inv.Paid || 0;
        const balanceDue = grandTotal - paymentReceived;

        let answer;
        if (language === 'hindi') {
          answer = `🧾 **बिल और PO डिटेल:**\n\n` +
                   `• **बिल नंबर:** ${inv.InvoiceNo}\n` +
                   `• **ग्राहक:** ${inv.CustomerName}\n` +
                   `• **फोन:** ${inv.ContactNo}\n` +
                   `• **एरिया:** ${inv.Area}\n` +
                   `• **ऑर्डर तिथि:** ${orderDate}\n` +
                   `---------------------------\n` +
                   `• **आइटम:** ${inv.Items || 'कोई प्रोडक्ट नहीं मिला'}\n` +
                   `• **PO नंबर:** ${inv.Po_No || 'N/A'}\n` +
                   `• **PO तिथि:** ${poDate}\n` +
                   `---------------------------\n` +
                   `• **आइटम टोटल:** ${formatCash(itemSubtotal)}\n` +
                   `• **डिलीवरी चार्ज:** ${formatCash(deliveryCharge)}\n` +
                   `• **फाइनल बिल:** ${formatCash(grandTotal)}\n` +
                   `• **पेड:** ${formatCash(paymentReceived)}\n` +
                   `• **बैलेंस:** ${formatCash(balanceDue)}\n` +
                   `• **स्टेटस:** ${inv.Status || 'पेंडिंग'}`;
        } else {
          answer = `🧾 **Invoice & PO Details:**\n\n` +
                   `• **Bill No:** ${inv.InvoiceNo}\n` +
                   `• **Customer:** ${inv.CustomerName}\n` +
                   `• **Phone:** ${inv.ContactNo}\n` +
                   `• **Area:** ${inv.Area}\n` +
                   `• **Order Date:** ${orderDate}\n` +
                   `---------------------------\n` +
                   `• **Items:** ${inv.Items || 'No products found'}\n` +
                   `• **PO Number:** ${inv.Po_No || 'N/A'}\n` +
                   `• **PO Date:** ${poDate}\n` +
                   `---------------------------\n` +
                   `• **Item Total:** ${formatCash(itemSubtotal)}\n` +
                   `• **Delivery:** ${formatCash(deliveryCharge)}\n` +
                   `• **Final Bill:** ${formatCash(grandTotal)}\n` +
                   `• **Paid:** ${formatCash(paymentReceived)}\n` +
                   `• **Balance:** ${formatCash(balanceDue)}\n` +
                   `• **Status:** ${inv.Status || 'Pending'}`;
        }
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
          data: { 
            invoiceNo: inv.InvoiceNo,
            customerName: inv.CustomerName,
            contactNo: inv.ContactNo,
            area: inv.Area,
            orderDate: orderDate,
            items: inv.Items,
            poNo: inv.Po_No,
            poDate: poDate,
            itemSubtotal,
            deliveryCharge,
            grandTotal,
            paymentReceived,
            balanceDue,
            status: inv.Status
          }
        });

      } catch (error) {
        console.error("Invoice Search Error:", error.message);
        let errorMsg = language === 'hindi'
          ? `${MY_NAME} जी, बिल खोजने में तकनीकी समस्या आई।`
          : `${MY_NAME} ji, technical error in searching bill.`;
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${errorMsg}\nError: ${error.message}${getSignature(language)}`
        });
      }
    }

    // 9.2 "Kya order ID 500 complete ho gaya?"
    if (q.includes("order id") || q.includes("order number") || q.includes("ऑर्डर आईडी") || q.includes("ऑर्डर नंबर")) {
      const orderIdMatch = q.match(/\d+/);
      
      if (!orderIdMatch) {
        let errorMsg = language === 'hindi'
          ? `${MY_NAME} जी, कृपया ऑर्डर आईडी बताएं (जैसे: ऑर्डर आईडी 500)`
          : `${MY_NAME} ji, please provide order ID (e.g., order ID 500)`;
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${errorMsg}${getSignature(language)}`
        });
      }

      const orderId = orderIdMatch[0];
      
      try {
        const result = await pool.request()
          .input("orderId", sql.Int, orderId)
          .query(`
            SELECT 
              O.OrderID,
              O.CustomerName,
              O.InvoiceNo,
              O.OrderDate,
              A.DeliveryStatus,
              A.ActualDeliveryDate,
              A.PaymentReceivedDate,
              Items = (SELECT STRING_AGG(CONCAT(ProductType, ' (', Quantity, ')'), ', ') 
                       FROM orderItems WHERE OrderID = O.OrderID),
              Total = (SELECT SUM(Total) FROM orderItems WHERE OrderID = O.OrderID)
            FROM OrdersTemp O
            LEFT JOIN AssignedOrders A ON O.OrderID = A.OrderID
            WHERE O.OrderID = @orderId
          `);
        
        if (result.recordset.length === 0) {
          let errorMsg = language === 'hindi'
            ? `${MY_NAME} जी, ऑर्डर आईडी ${orderId} नहीं मिला।`
            : `${MY_NAME} ji, Order ID ${orderId} not found.`;
          
          return res.json({ 
            success: true, 
            answer: `${getPersonalizedGreeting(language)}\n\n${errorMsg}${getSignature(language)}`
          });
        }

        const order = result.recordset[0];
        const orderDate = order.OrderDate ? new Date(order.OrderDate).toLocaleDateString('en-GB') : 'N/A';
        const deliveryDate = order.ActualDeliveryDate ? new Date(order.ActualDeliveryDate).toLocaleDateString('en-GB') : 'N/A';
        const paymentDate = order.PaymentReceivedDate ? new Date(order.PaymentReceivedDate).toLocaleDateString('en-GB') : 'N/A';
        
        let answer;
        if (language === 'hindi') {
          answer = `📋 ऑर्डर डिटेल (आईडी: ${orderId}):\n\n` +
                  `• **ग्राहक:** ${order.CustomerName}\n` +
                  `• **बिल नंबर:** ${order.InvoiceNo || 'N/A'}\n` +
                  `• **ऑर्डर तिथि:** ${orderDate}\n` +
                  `• **आइटम:** ${order.Items || 'N/A'}\n` +
                  `• **कुल राशि:** ₹${formatNumber(order.Total || 0, 'hindi')}\n` +
                  `• **डिलीवरी स्टेटस:** ${order.DeliveryStatus || 'पेंडिंग'}\n` +
                  `• **डिलीवरी तिथि:** ${deliveryDate}\n` +
                  `• **पेमेंट तिथि:** ${paymentDate}`;
        } else {
          answer = `📋 Order Details (ID: ${orderId}):\n\n` +
                  `• **Customer:** ${order.CustomerName}\n` +
                  `• **Invoice No:** ${order.InvoiceNo || 'N/A'}\n` +
                  `• **Order Date:** ${orderDate}\n` +
                  `• **Items:** ${order.Items || 'N/A'}\n` +
                  `• **Total Amount:** ₹${formatNumber(order.Total || 0, 'english')}\n` +
                  `• **Delivery Status:** ${order.DeliveryStatus || 'Pending'}\n` +
                  `• **Delivery Date:** ${deliveryDate}\n` +
                  `• **Payment Date:** ${paymentDate}`;
        }
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
          data: { 
            orderId: order.OrderID,
            customerName: order.CustomerName,
            invoiceNo: order.InvoiceNo,
            orderDate: orderDate,
            items: order.Items,
            total: order.Total,
            deliveryStatus: order.DeliveryStatus,
            deliveryDate: deliveryDate,
            paymentDate: paymentDate
          }
        });

      } catch (error) {
        console.error("Order Search Error:", error.message);
        let errorMsg = language === 'hindi'
          ? `${MY_NAME} जी, ऑर्डर खोजने में तकनीकी समस्या आई।`
          : `${MY_NAME} ji, technical error in searching order.`;
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${errorMsg}\nError: ${error.message}${getSignature(language)}`
        });
      }
    }

    // ==============================================
    // SECTION 10: DELIVERY BOY CASH & HANDOVER
    // ==============================================
    
    // 10.1 "Deepak (Delivery Man) ke paas abhi kitna cash bacha hai?"
    if (q.includes("cash bacha") || q.includes("balance") || q.includes("कैश बचा") || q.includes("बैलेंस")) {
      const deliveryBoy = extractDeliveryBoyFromText(question);
      
      if (!deliveryBoy) {
        let errorMsg = language === 'hindi'
          ? `${MY_NAME} जी, कृपया डिलीवरी बॉय का नाम बताएं (जैसे: Deepak के पास कितना cash है?)`
          : `${MY_NAME} ji, please provide delivery boy name (e.g., How much cash does Deepak have?)`;
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${errorMsg}${getSignature(language)}`
        });
      }
      
      try {
        const result = await pool.request()
          .input("boyName", sql.NVarChar, `%${deliveryBoy}%`)
          .query(`
            SELECT 
              DM.Name,
              DM.MobileNo,
              DM.Area,
              COALESCE(DCB.CurrentBalance, 0) AS CurrentBalance,
              (SELECT COUNT(*) FROM AssignedOrders WHERE DeliveryManID = DM.DeliveryManID AND DeliveryStatus = 'Complete') AS CompletedDeliveries,
              (SELECT SUM(Amount) FROM CashHandoverHistory WHERE DeliveryManID = DM.DeliveryManID AND TransactionType = 'Credit') AS TotalCollected,
              (SELECT SUM(Amount) FROM CashHandoverHistory WHERE DeliveryManID = DM.DeliveryManID AND TransactionType = 'Debit') AS TotalSubmitted
            FROM DeliveryMen DM
            LEFT JOIN DeliveryMenCashBalance DCB ON DM.DeliveryManID = DCB.DeliveryManID
            WHERE DM.Name LIKE @boyName
          `);
        
        if (result.recordset.length === 0) {
          let errorMsg = language === 'hindi'
            ? `${MY_NAME} जी, डिलीवरी बॉय ${deliveryBoy} नहीं मिला।`
            : `${MY_NAME} ji, Delivery Boy ${deliveryBoy} not found.`;
          
          return res.json({ 
            success: true, 
            answer: `${getPersonalizedGreeting(language)}\n\n${errorMsg}${getSignature(language)}`
          });
        }

        const boyData = result.recordset[0];
        
        let answer;
        if (language === 'hindi') {
          answer = `💰 डिलीवरी बॉय कैश डिटेल:\n\n` +
                  `• **नाम:** ${boyData.Name}\n` +
                  `• **मोबाइल:** ${boyData.MobileNo || 'N/A'}\n` +
                  `• **एरिया:** ${boyData.Area || 'N/A'}\n` +
                  `• **वर्तमान बैलेंस:** ₹${formatNumber(boyData.CurrentBalance, 'hindi')}\n` +
                  `• **कुल कलेक्टेड:** ₹${formatNumber(boyData.TotalCollected || 0, 'hindi')}\n` +
                  `• **कुल सबमिटेड:** ₹${formatNumber(boyData.TotalSubmitted || 0, 'hindi')}\n` +
                  `• **पूर्ण डिलीवरी:** ${boyData.CompletedDeliveries || 0}`;
        } else {
          answer = `💰 Delivery Boy Cash Details:\n\n` +
                  `• **Name:** ${boyData.Name}\n` +
                  `• **Mobile:** ${boyData.MobileNo || 'N/A'}\n` +
                  `• **Area:** ${boyData.Area || 'N/A'}\n` +
                  `• **Current Balance:** ₹${formatNumber(boyData.CurrentBalance, 'english')}\n` +
                  `• **Total Collected:** ₹${formatNumber(boyData.TotalCollected || 0, 'english')}\n` +
                  `• **Total Submitted:** ₹${formatNumber(boyData.TotalSubmitted || 0, 'english')}\n` +
                  `• **Completed Deliveries:** ${boyData.CompletedDeliveries || 0}`;
        }
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
          data: { 
            name: boyData.Name,
            mobile: boyData.MobileNo,
            area: boyData.Area,
            currentBalance: boyData.CurrentBalance,
            totalCollected: boyData.TotalCollected || 0,
            totalSubmitted: boyData.TotalSubmitted || 0,
            completedDeliveries: boyData.CompletedDeliveries || 0
          }
        });

      } catch (error) {
        console.error("Delivery Boy Cash Error:", error.message);
        let errorMsg = language === 'hindi'
          ? `${MY_NAME} जी, डिलीवरी बॉय कैश डेटा खोजने में समस्या आई।`
          : `${MY_NAME} ji, error in fetching delivery boy cash data.`;
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${errorMsg}\nError: ${error.message}${getSignature(language)}`
        });
      }
    }

    // 10.2 "Is hafte ka total cash handover kitna hua?"
    if (q.includes("cash handover") || q.includes("हैंडओवर") || q.includes("कैश हैंडओवर")) {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);
      
      try {
        const result = await pool.request()
          .input("startDate", sql.DateTime, startOfWeek)
          .input("endDate", sql.DateTime, endOfWeek)
          .query(`
            SELECT 
              SUM(Amount) AS TotalHandover,
              COUNT(*) AS HandoverCount,
              STRING_AGG(CONCAT(DM.Name, ' (₹', Amount, ')'), ', ') AS HandoverDetails
            FROM CashHandoverHistory CHH
            JOIN DeliveryMen DM ON CHH.DeliveryManID = DM.DeliveryManID
            WHERE CHH.TransactionType = 'DEBIT'
              AND CHH.EntryDate BETWEEN @startDate AND @endDate
          `);
        
        const data = result.recordset[0];
        const totalHandover = data.TotalHandover || 0;
        const handoverCount = data.HandoverCount || 0;
        const handoverDetails = data.HandoverDetails || 'कोई डिटेल नहीं';
        
        let answer;
        if (language === 'hindi') {
          answer = `💰 इस हफ्ते का कैश हैंडओवर रिपोर्ट:\n\n` +
                  `• **कुल हैंडओवर:** ₹${formatNumber(totalHandover, 'hindi')}\n` +
                  `• **हैंडओवर काउंट:** ${handoverCount}\n`;
          
          if (handoverCount > 0) {
            answer += `• **डिटेल:** ${handoverDetails}`;
          }
        } else {
          answer = `💰 This Week's Cash Handover Report:\n\n` +
                  `• **Total Handover:** ₹${formatNumber(totalHandover, 'english')}\n` +
                  `• **Handover Count:** ${handoverCount}\n`;
          
          if (handoverCount > 0) {
            answer += `• **Details:** ${handoverDetails}`;
          }
        }
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
          data: { 
            totalHandover, 
            handoverCount, 
            handoverDetails,
            weekStart: startOfWeek.toISOString().split('T')[0],
            weekEnd: endOfWeek.toISOString().split('T')[0]
          }
        });

      } catch (error) {
        console.error("Cash Handover Error:", error.message);
        let errorMsg = language === 'hindi'
          ? `${MY_NAME} जी, कैश हैंडओवर डेटा खोजने में समस्या आई।`
          : `${MY_NAME} ji, error in fetching cash handover data.`;
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${errorMsg}\nError: ${error.message}${getSignature(language)}`
        });
      }
    }

    // 10.3 "Kis delivery boy ka balance mismatch hai?"
    if (q.includes("balance mismatch") || q.includes("मिसमैच") || q.includes("बैलेंस मिसमैच")) {
      try {
        const result = await pool.request().query(`
          WITH ExpectedBalance AS (
            SELECT 
              DM.DeliveryManID,
              DM.Name,
              (SELECT SUM(Amount) FROM CashHandoverHistory WHERE DeliveryManID = DM.DeliveryManID AND TransactionType = 'Credit') AS TotalCredit,
              (SELECT SUM(Amount) FROM CashHandoverHistory WHERE DeliveryManID = DM.DeliveryManID AND TransactionType = 'Debit') AS TotalDebit,
              COALESCE(DCB.CurrentBalance, 0) AS CurrentBalance
            FROM DeliveryMen DM
            LEFT JOIN DeliveryMenCashBalance DCB ON DM.DeliveryManID = DCB.DeliveryManID
          )
          SELECT 
            Name,
            TotalCredit,
            TotalDebit,
            CurrentBalance,
            (TotalCredit - TotalDebit) AS ExpectedBalance,
            ABS(CurrentBalance - (TotalCredit - TotalDebit)) AS MismatchAmount
          FROM ExpectedBalance
          WHERE ABS(CurrentBalance - (TotalCredit - TotalDebit)) > 10
          ORDER BY MismatchAmount DESC
        `);
        
        const mismatches = result.recordset;
        
        if (mismatches.length === 0) {
          let answer = language === 'hindi'
            ? `✅ सभी डिलीवरी बॉय के बैलेंस सही हैं। कोई मिसमैच नहीं मिला।`
            : `✅ All delivery boys' balances are correct. No mismatch found.`;
          
          return res.json({ 
            success: true, 
            answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`
          });
        }
        
        let answer;
        if (language === 'hindi') {
          answer = `⚠️  बैलेंस मिसमैच वाले डिलीवरी बॉय:\n\n`;
          mismatches.forEach((boy, index) => {
            answer += `${index + 1}. ${boy.Name}\n`;
            answer += `   • वर्तमान बैलेंस: ₹${formatNumber(boy.CurrentBalance, 'hindi')}\n`;
            answer += `   • एक्सपेक्टेड बैलेंस: ₹${formatNumber(boy.ExpectedBalance, 'hindi')}\n`;
            answer += `   • मिसमैच: ₹${formatNumber(boy.MismatchAmount, 'hindi')}\n`;
            answer += `   • कुल क्रेडिट: ₹${formatNumber(boy.TotalCredit || 0, 'hindi')}\n`;
            answer += `   • कुल डेबिट: ₹${formatNumber(boy.TotalDebit || 0, 'hindi')}\n\n`;
          });
        } else {
          answer = `⚠️  Delivery Boys with Balance Mismatch:\n\n`;
          mismatches.forEach((boy, index) => {
            answer += `${index + 1}. ${boy.Name}\n`;
            answer += `   • Current Balance: ₹${formatNumber(boy.CurrentBalance, 'english')}\n`;
            answer += `   • Expected Balance: ₹${formatNumber(boy.ExpectedBalance, 'english')}\n`;
            answer += `   • Mismatch: ₹${formatNumber(boy.MismatchAmount, 'english')}\n`;
            answer += `   • Total Credit: ₹${formatNumber(boy.TotalCredit || 0, 'english')}\n`;
            answer += `   • Total Debit: ₹${formatNumber(boy.TotalDebit || 0, 'english')}\n\n`;
          });
        }
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
          data: { mismatches }
        });

      } catch (error) {
        console.error("Balance Mismatch Error:", error.message);
        let errorMsg = language === 'hindi'
          ? `${MY_NAME} जी, बैलेंस मिसमैच चेक करने में समस्या आई।`
          : `${MY_NAME} ji, error in checking balance mismatch.`;
        
        return res.json({ 
          success: true, 
          answer: `${getPersonalizedGreeting(language)}\n\n${errorMsg}\nError: ${error.message}${getSignature(language)}`
        });
      }
    }

    // ==============================================
    // SECTION 11: ASSISTANT & DEVELOPER INFO (BRANDING)
    // ==============================================
    
    // 11.1 "Ye AI assistant kisne banaya hai?" (Answer: Sagar)
    // 11.2 "Tum kya-kya kaam kar sakte ho mere business ke liye?"
    // 11.3 "Sagar se contact kaise karein?"
    if (
      q.includes("kaise kaam") || 
      q.includes("how it works") || 
      q.includes("summary report") || 
      q.includes("सारांश") ||
      q.includes("software") || 
      q.includes("banaya") || 
      q.includes("developer") || 
      q.includes("डेवलपर") ||
      q.includes("contact") ||
      q.includes("संपर्क") ||
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
                `• क्षेत्रवार प्रदर्शन विश्लेषण\n` +
                `• उत्पाद बिक्री विश्लेषण\n` +
                `• बिल और इनवॉइस खोज\n` +
                `• कैश हैंडओवर ट्रैकिंग\n` +
                `• मासिक और साप्ताहिक रिपोर्ट\n\n` +
                `📊 **हफ्ते की सारांश रिपोर्ट:**\n` +
                `• कुल बिक्री\n` +
                `• नए ग्राहक\n` +
                `• टॉप प्रोडक्ट\n` +
                `• बकाया राशि\n` +
                `• डिलीवरी स्टेटस\n` +
                `• स्टॉक एलर्ट\n\n` +
                `📞 **${MY_NAME} से संपर्क:**\n` +
                `• कस्टम बिजनेस सॉल्यूशंस\n` +
                `• वेबसाइट और मोबाइल एप्स\n` +
                `• बिजनेस इंटेलिजेंस डैशबोर्ड\n` +
                `• डेटा एनालिटिक्स और रिपोर्टिंग\n\n` +
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
                `• Area-wise Performance Analysis\n` +
                `• Product Sales Analysis\n` +
                `• Bill & Invoice Search\n` +
                `• Cash Handover Tracking\n` +
                `• Monthly & Weekly Reports\n\n` +
                `📊 **Weekly Summary Report:**\n` +
                `• Total Sales\n` +
                `• New Customers\n` +
                `• Top Products\n` +
                `• Outstanding Amount\n` +
                `• Delivery Status\n` +
                `• Stock Alerts\n\n` +
                `📞 **Contact ${MY_NAME}:**\n` +
                `• Custom Business Solutions\n` +
                `• Websites & Mobile Apps\n` +
                `• Business Intelligence Dashboards\n` +
                `• Data Analytics & Reporting\n\n` +
                `_"Transforming your data into your decisions"_`;
      }
      
      return res.json({ 
        success: true, 
        answer: `${getPersonalizedGreeting(language)}\n\n${answer}${getSignature(language)}`,
        data: { 
          developer: MY_NAME,
          role: language === 'hindi' ? "बिजनेस इंटेलिजेंस डेवलपर" : "Business Intelligence Developer",
          contact: language === 'hindi' ? "कस्टम सॉल्यूशंस के लिए उपलब्ध" : "Available for custom solutions",
          capabilities: language === 'hindi' ? [
            "बिक्री विश्लेषण",
            "स्टॉक प्रबंधन", 
            "ग्राहक विश्लेषण",
            "डिलीवरी ट्रैकिंग",
            "भुगतान रिपोर्टिंग",
            "एरिया विश्लेषण",
            "उत्पाद विश्लेषण",
            "बिल खोज",
            "कैश ट्रैकिंग"
          ] : [
            "Sales Analysis",
            "Stock Management",
            "Customer Analysis",
            "Delivery Tracking",
            "Payment Reporting",
            "Area Analysis",
            "Product Analysis",
            "Bill Search",
            "Cash Tracking"
          ]
        }
      });
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
    
    // Check if it's a date query that wasn't understood
    const datePatterns = [
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/, // dd/mm/yy
      /\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i, // 4 Feb
      /\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i, // 4 February
    ];
    
    const hasDatePattern = datePatterns.some(pattern => pattern.test(q));
    
    if (hasDatePattern) {
      // If it looks like a date query but wasn't processed, give a specific message
      if (language === 'hindi') {
        fallbackResponse = `${MY_NAME} जी, कृपया तारीख स्पष्ट रूप से बताएं।\nउदाहरण:\n• "04/02/26 के ऑर्डर"\n• "4 फरवरी 2026 के ऑर्डर"\n• "फरवरी 2026 के ऑर्डर"`;
      } else {
        fallbackResponse = `${MY_NAME} ji, please specify the date clearly.\nExamples:\n• "Orders on 04/02/26"\n• "Orders on 4 February 2026"\n• "Orders in February 2026"`;
      }
    }
    
    return res.json({ 
      success: true,
      answer: `${getPersonalizedGreeting(language)}\n\n${fallbackResponse}${getSignature(language)}`,
      data: {
        assistant: language === 'hindi' ? `${MY_NAME} का AI असिस्टेंट` : `${MY_NAME}'s AI Assistant`,
        language: language,
        suggestions: language === 'hindi' ? [
          "आज के ऑर्डर कितने?",
          "04/02/26 के ऑर्डर कितने?",
          "फरवरी 2026 में कुल ऑर्डर",
          "कितना स्टॉक बचा है?",
          "बकाया राशि कितनी है?",
          "टॉप 5 ग्राहक कौन हैं?",
          "सबसे ज्यादा बिकने वाला प्रोडक्ट कौन सा है?",
          "डिलीवरी बॉय का परफॉर्मेंस कैसा है?",
          "इस हफ्ते की कुल बिक्री कितनी है?",
          "बिल नंबर 25-26/19 की डिटेल बताओ"
        ] : [
          "How many orders today?",
          "How many orders on 04/02/26?",
          "Total orders in February 2026",
          "How much stock is left?",
          "What's the outstanding amount?",
          "Who are the top 5 customers?",
          "Which is the best selling product?",
          "How is delivery boy performance?",
          "What's total sales this week?",
          "Show details of bill number 25-26/19"
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
      generatedAt: new Date().toISOString(),
      analyzedBy: language === 'hindi' ? `${MY_NAME} का AI असिस्टेंट` : `${MY_NAME}'s AI Assistant`
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
    
    let errorMessage;
    if (language === 'hindi') {
      errorMessage = `${MY_NAME} जी, साप्ताहिक रिपोर्ट जनरेट करने में विफल`;
    } else {
      errorMessage = `${MY_NAME} ji, failed to generate weekly summary`;
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
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
      message: `${MY_NAME} ji, failed to fetch quick stats`,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
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
          "पर्चेज ऑर्डर ट्रैकिंग",
          "कैश हैंडओवर ट्रैकिंग"
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
        website: "sagartechsolutions.com",
        email: "sagar@businesstech.in",
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
          "Purchase Order Tracking",
          "Cash Handover Tracking"
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
      pool.request().query(`SELECT COUNT(DISTINCT CustomerName) AS CustomersCount FROM OrdersTemp`),
      pool.request().query(`SELECT COUNT(*) AS DeliveriesCount FROM AssignedOrders`)
    ]);
    
    const healthStatus = {
      database: healthChecks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      orders: healthChecks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      stock: healthChecks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      customers: healthChecks[3].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      deliveries: healthChecks[4].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      analyzedBy: `${MY_NAME}'s AI Assistant`
    };
    
    const allHealthy = Object.values(healthStatus).filter(val => val === 'healthy').length === 5;
    
    res.json({
      success: true,
      message: `${MY_NAME} ji, system health check completed`,
      status: allHealthy ? 'healthy' : 'degraded',
      data: healthStatus
    });
    
  } catch (err) {
    console.error("System Health Error:", err);
    res.status(500).json({ 
      success: false, 
      message: `${MY_NAME} ji, system health check failed`,
      status: 'unhealthy',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};