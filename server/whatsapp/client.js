// const { Client, LocalAuth } = require('whatsapp-web.js');
// const qrcode = require('qrcode-terminal');

// // 1. WhatsApp client ko initialize karna
// const client = new Client({
//     authStrategy: new LocalAuth(), // Isse baar baar QR scan nahi karna padega
//     puppeteer: { headless: true } // Browser piche chalega, dikhega nahi
// });

// // 2. QR Code dikhana (Terminal mein)
// client.on('qr', (qr) => {
//     qrcode.generate(qr, { small: true });
//     console.log('WhatsApp QR Code scan karein apne phone se!');
// });

// // 3. Jab connect ho jaye
// client.on('ready', () => {
//     console.log('WhatsApp connect ho gaya hai!');
// });

// client.initialize();

// module.exports = client;


// exports.assignOrder = async (req, res) => {
//   const { orderId, deliveryManId, otherDeliveryManName, deliveryDate, remark } = req.body;

//   if (!orderId || !deliveryDate) {
//     return res.status(400).json({ message: "Required fields missing" });
//   }

//   try {
//     const pool = await poolPromise;

//     // 1. Pehle Order aur Delivery Boy ki details fetch karo (WhatsApp bhejane ke liye)
//     // Hum Join query use karenge taaki number mil jaye
//     const infoQuery = await pool.request()
//       .input("DMID", sql.Int, deliveryManId)
//       .input("OID", sql.Int, orderId)
//       .query(`
//         SELECT 
//           dm.MobileNumber, dm.Name as BoyName,
//           o.CustomerName, o.Address, o.TotalAmount, o.Items
//         FROM DeliveryBoys dm, Orders o
//         WHERE dm.ID = @DMID AND o.ID = @OID
//       `);

//     const details = infoQuery.recordset[0];

//     // 2. Database mein Entry insert karo (Aapka purana code)
//     await pool.request()
//       .input("OrderID", sql.Int, orderId)
//       .input("DeliveryManID", sql.Int, deliveryManId || null)
//       .input("OtherDeliveryManName", sql.NVarChar, otherDeliveryManName || null)
//       .input("DeliveryDate", sql.Date, deliveryDate)
//       .input("Remark", sql.NVarChar, remark || null)
//       .query(`
//         INSERT INTO AssignedOrders 
//         (OrderID, DeliveryManID, OtherDeliveryManName, DeliveryDate, Remark)
//         VALUES 
//         (@OrderID, @DeliveryManID, @OtherDeliveryManName, @DeliveryDate, @Remark)
//       `);

//     // 3. WHATSAPP LOGIC START
//     // Agar delivery man ka number hai, toh msg bhejo
//     if (details && details.MobileNumber) {
//       const cleanNumber = details.MobileNumber.replace(/\D/g, ''); // Sirf digits rakho
//       const chatId = `91${cleanNumber}@c.us`; // India ke liye 91 lagana zaroori hai

//       const message = `
// 📦 *NEW ORDER ASSIGNED* 📦
// --------------------------
// 🆔 *Order:* #${orderId}
// 👤 *Customer:* ${details.CustomerName}
// 📍 *Address:* ${details.Address}
// 💰 *Amount:* ₹${details.TotalAmount}
// 📝 *Items:* ${details.Items}
// 📅 *Date:* ${deliveryDate}
// 💬 *Remark:* ${remark || 'N/A'}
// --------------------------
// _Software se auto-generated message._
//       `;

//       // Message bhej rahe hain (Ye process backend mein chalta rahega)
//       whatsapp.sendMessage(chatId, message).catch(err => console.log("WhatsApp Send Error:", err));
//     }

//     res.status(201).json({ message: "Order assigned successfully and WhatsApp sent!" });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };