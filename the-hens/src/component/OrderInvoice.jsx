import React from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import styles from "./invoice.module.css";
import {
  FaDownload,
  FaTimes,
  FaFileInvoice,
  FaPrint,
  FaRupeeSign,
  FaFileAlt,
  FaUser,
  FaMapMarkerAlt,
  FaPhone,
  FaTruck,
  FaFileSignature,
} from "react-icons/fa";

// --- Utility: Number to Words ---
const numberToWords = (num) => {
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if ((num = num.toString()).length > 9) return "Overflow";
  const n = ("000000000" + num)
    .substr(-9)
    .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return;
  let str = "";
  str +=
    n[1] != 0
      ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + "Crore "
      : "";
  str +=
    n[2] != 0
      ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + "Lakh "
      : "";
  str +=
    n[3] != 0
      ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + "Thousand "
      : "";
  str +=
    n[4] != 0
      ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + "Hundred "
      : "";
  str +=
    n[5] != 0
      ? (str != "" ? "and " : "") +
        (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]])
      : "";
  return str.trim();
};

// --- Constants ---
const COMPANY_INFO = {
  name: "VND VENTURES PRIVATE LIMITED",
  brand: "The Hen's Co.",
  pan: "AAGCV7020A",
  gstin: "23AAGCV7020A1ZX",
  address: "201/15, Ratan Colony, Gorakhpur, Jabalpur, Madhya Pradesh 482001",

  phone: "7880008188",
  email: "info@thehensco.com",
  bankDetails: {
    accountName: "VND VENTURES PRIVATE LIMITED",
    accountNumber: "940520110000347",
    bankName: "Bank of India",
    ifscCode: "BKID0009405",
    branch: "Jabalpur",
  },
  hsnCode: "04072100",
};

// --- Main Component ---
const InvoiceGenerator = ({ orderData, onClose }) => {
  const downloadPdf = async () => {
    const element = document.getElementById("invoice-print-content");
    const clone = element.cloneNode(true);

    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.top = "-9999px";
    container.style.width = "1200px"; // चौड़ाई बढ़ा दी ताकि कॉलम न दबें

    clone.style.width = "1150px";
    clone.style.fontSize = "12px"; // फॉन्ट साइज़ फिक्स करें

    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(clone, {
        scale: 1.5, // 2 से घटाकर 1.5 किया ताकि फाइल बहुत भारी न हो और फिट आए
        useCORS: true,
        windowWidth: 1200,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 10; // 5mm मार्जिन दोनों तरफ
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 5, 10, imgWidth, imgHeight);
      pdf.save(`Invoice_${orderData?.InvoiceNo || "invoice"}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      document.body.removeChild(container);
    }
  };
  // const handlePrint = () => {
  //     window.print();
  // };

  if (!orderData) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h2>
              <FaFileInvoice /> Invoice Preview
            </h2>
            <button className={styles.btnClose} onClick={onClose}>
              <FaTimes />
            </button>
          </div>
          <div className={styles.invoiceWrapper}>
            <p className={styles.noData}>No order data available</p>
          </div>
        </div>
      </div>
    );
  }

  // Parse product data
  const productItems = [];
  console.log(productItems, "productItems in admin invoice");
  let subTotalVal = 0;
  let totalQty = 0;

  if (orderData) {
    const names = orderData.ProductNames
      ? orderData.ProductNames.split(",")
      : [];
    const qtys = orderData.Quantities ? orderData.Quantities.split(",") : [];
    const rates = orderData.Rates ? orderData.Rates.split(",") : [];
    const types = orderData.ProductTypes
      ? orderData.ProductTypes.split(",")
      : [];

    const weight = orderData.Weights ? orderData.Weights.split(",") : [];

    const upcs = orderData.ProductUPCs ? orderData.ProductUPCs.split(",") : [];

    const mrps = orderData.MRPs ? orderData.MRPs.split(",") : [];

    const Gst_No = orderData.Gst_No ? orderData.Gst_No.split(",") : [];

    const PAN_No = orderData.PAN_No ? orderData.PAN_No.split(",") : [];

    const Po_No = orderData.Po_No ? orderData.Po_No.split(",") : [];

    const Po_Date = orderData.Po_Date ? orderData.Po_Date.split(",") : [];

    const dname = orderData.DeliveryManName
      ? orderData.DeliveryManName.split(",")
      : [];

    console.log(mrps, Gst_No, Po_No, Po_Date, "abhi new");

    names.forEach((name, i) => {
      const q = Number(qtys[i] || 0);
      totalQty += q;
      const r = Number(rates[i] || 0);
      const t = q * r;
      const w = weight[i] || " ";
      const g = Gst_No[i] || " ";
      const p = PAN_No[i] || " ";
      const po = Po_No[i] || "";
      const pd = Po_Date[i] || "";
      const dn = dname[i] || "";

      subTotalVal += t;
      productItems.push({
        productName: name,
        productType: types[i] || "N/A",
        weight: w,
        qty: q,
        Gst_No: g,
        DeliveryManName: dn,
        PAN_No: p,
        Po_No: po,
        Po_Date: pd,
        BasicCost: r,
        rate: r.toFixed(2),
        totalAmt: t.toFixed(2),
        hsn: COMPANY_INFO.hsnCode,
        gstRate: 0,
        ProductUPC: upcs[i]?.trim() || "N/A",
        MRP: mrps[i]?.trim() || "0",
      });
    });
  }
  const totalItemsCount = productItems.length;
  const deliveryChargeVal = orderData?.DeliveryCharge
    ? Number(orderData.DeliveryCharge)
    : 0;
  const totalAmountVal = subTotalVal + deliveryChargeVal;
  const amountInWords = numberToWords(Math.round(totalAmountVal));
  console.log(orderData, "orderData for invoice");

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>
            <FaFileInvoice style={{ color: "#fff" }} /> Invoice Preview -{" "}
            {orderData.InvoiceNo || orderData.OrderID}
          </h2>
          <button className={styles.btnClose} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.invoiceWrapper}>
          <div className={styles.invoiceBody}>
            <div id="invoice-print-content" className={styles.invoiceContainer}>
              {/* --- HEADER --- */}
              <div className={styles.header}>
                <div className={styles.companyInfo}>
                  <div className={styles.logoContainer}>
                    <img
                      src="./img/logo.png"
                      alt="Logo"
                      className={styles.logoImage}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIHJ4PSIxMiIgZmlsbD0iI0VGRjBGRiIvPjxwYXRoIGQ9Ik02MCAzMEw0NSA2MEg3NUw2MCAzMFoiIGZpbGw9IiM2NjdFRUEiLz48cGF0aCBkPSJNNjAgOTBMNDUgNjBINzVMNjAgOTBaIiBmaWxsPSIjNzY0QkEyIi8+PC9zdmc+";
                      }}
                    />
                  </div>
                  <div className={styles.brandInfo}>
                    <div className={styles.companyDetails}>
                      <p>
                        <strong>{COMPANY_INFO.name}</strong>
                      </p>
                      <p>
                        <FaMapMarkerAlt /> {COMPANY_INFO.address}
                      </p>
                      <p>
                        <FaPhone /> +91 {COMPANY_INFO.phone}{" "}
                      </p>
                      <p>
                        <strong>GSTIN:</strong> {COMPANY_INFO.gstin}{" "}
                        <strong>PAN:</strong> {COMPANY_INFO.pan}
                      </p>
                    </div>
                  </div>
                </div>
                {/* --- Meta Section Update --- */}
                <div className={styles.invoiceMeta}>
                  <h1>Bill of Supply / Invoice</h1>
                  <div className={styles.invoiceDetails}>
                    <p>
                      <strong>Invoice No:</strong> {orderData.InvoiceNo}
                    </p>
                    <p>
                      <strong>Invoice Date:</strong>{" "}
                      {/* Pehle check karega InvoiceDate, 
          agar wo nahi hai toh OrderDate, 
          agar dono nahi hai tabhi current date dikhayega 
      */}
                      {orderData.InvoiceDate
                        ? new Date(orderData.InvoiceDate).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* --- CUSTOMER & ORDER DETAILS --- */}
              <div className={styles.customerDetails}>
                <div className={styles.detailBox}>
                  <h3>
                    <FaUser /> Bill To
                  </h3>
                  <div className={styles.customerInfo}>
                    <p className={styles.customerName}>
                      {orderData.CustomerName || "Customer Name"}
                    </p>
                    <p className={styles.customerAddress}>
                      <FaMapMarkerAlt /> {orderData.Address || "Address"},{" "}
                      {orderData.Area || "Area"}
                    </p>
                    <p className={styles.customerContact}>
                      <FaPhone /> {orderData.ContactNo || "Contact Number"}
                    </p>
                    <p className={styles.customerGst}>
                      <strong>GSTIN:</strong> {orderData.Gst_No || "N/A"}{" "}
                      <br></br>
                      <strong>PAN:</strong> {orderData.PAN_No || "N/A"}
                    </p>
                  </div>
                </div>
                <div className={styles.detailBox}>
                  <h3>
                    <FaFileAlt /> Order Details
                  </h3>
                  <div className={styles.orderInfo}>
                    <p>
                      <strong>Order Date:</strong>{" "}
                      {new Date(
                        orderData.OrderDate || new Date(),
                      ).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p>
                      <strong>Delivery Boy:</strong>{" "}
                      {orderData.DeliveryManName || "Shubham"}
                    </p>
                    <p>
                      <strong>Order Taken By:</strong>{" "}
                      {orderData.OrderTakenBy || "N/A"}
                    </p>
                    {/* <p>
                      <strong>Delivery Date:</strong>{" "}
                      {new Date(
                        orderData.DeliveryDate || new Date(),
                      ).toLocaleDateString("en-GB")}
                    </p> */}
                    <p>
                      <strong> P.O. Number -: </strong>{" "}
                      {orderData.Po_No || "N/A"} <br></br>
                      <strong> P.O. Date -: </strong> {""}
                      {new Date(
                        orderData.Po_Date || new Date(),
                      ).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p>
                      <strong> Payment Terms -: 7 Days </strong>
                    </p>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <h3>
                    <FaFileAlt /> FSSAI
                  </h3>
                  <div className={styles.orderInfo}>
                    <p>
                      <strong> FSSAI - Phoenix Poultry 11424170000122 </strong>{" "}
                      <br></br>
                      <strong>
                        {" "}
                        FSSAI - VND Ventures Pvt. LTD. 11421170000373{" "}
                      </strong>{" "}
                      <br></br>
                      <strong>
                        {" "}
                        FSSAI - The Hens`s Co. 21420170000432{" "}
                      </strong>{" "}
                      <br></br>
                    </p>
                  </div>
                </div>
              </div>

              {/* --- PRODUCTS TABLE --- */}
              <div className={styles.tableContainer}>
                <table className={styles.productsTable}>
                  <thead>
                    <tr>
                      <th className={styles.textCenter}>#</th>
                      <th>Product Description</th>
                      <th>Product Weight</th>

                      <th className={styles.textCenter}>HSN Code</th>
                      <th className={styles.textCenter}>Product UPC</th>

                      <th className={styles.textRight}>
                        {" "}
                        Basic Cost Price (₹)
                      </th>
                      <th className={styles.textRight}> CGST %</th>
                      <th className={styles.textRight}> SGST %</th>
                      <th className={styles.textRight}> Landing Rate</th>
                      <th className={styles.textCenter}>Qty</th>

                      <th className={styles.textRight}>MRP (₹)</th>
                      <th className={styles.textRight}>Total Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productItems.map((item, i) => (
                      <tr key={i}>
                        <td className={styles.textCenter}>{i + 1}</td>
                        <td>
                          <span style={{ fontWeight: "bold" }}>
                            {item.productType}
                          </span>
                          <br />
                        </td>
                        <td>
                          <span style={{ fontWeight: "bold" }}>
                            {item.weight}
                          </span>
                          <br />
                        </td>

                        <td className={styles.textCenter}>{item.hsn}</td>
                        <td className={styles.textCenter}>{item.ProductUPC}</td>
                        <td className={styles.textCenter}>{item.BasicCost}</td>
                        <td className={styles.textCenter}>{item.gstRate}</td>
                        <td className={styles.textCenter}>{item.gstRate}</td>
                        <td className={styles.textCenter}>{item.BasicCost}</td>
                        <td className={styles.textCenter}>{item.qty}</td>

                        <td className={styles.textCenter}>{item.MRP}</td>
                        <td className={styles.textCenter}>{item.totalAmt}</td>
                      </tr>
                    ))}
                    {productItems.length === 0 && (
                      <tr>
                        <td colSpan="6" className={styles.textCenter}>
                          No products found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* --- ENHANCED FOOTER GRID --- */}
              <div className={styles.footerSection}>
                {/* Column 1: Amount in Words & Terms */}
                <div className={styles.footerColumn}>
                  <div className={styles.amountInWords}>
                    <span>
                      <FaRupeeSign /> Amount in words
                    </span>
                    <p>{amountInWords} Rupees Only</p>
                  </div>
                  <div className={styles.termsBox}>
                    <h4>
                      <FaFileAlt /> Terms & Conditions
                    </h4>
                    <div className={styles.qrTermContainer}>
                      <img
                        src="./img/qr.png"
                        alt="Terms QR"
                        className={styles.qrSmall}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <div className={styles.qrText}>
                        <p>
                          <strong>Scan for full</strong>
                        </p>
                        <p>Terms & Conditions Policy</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Payment Details & QR */}
                <div className={styles.footerColumn}>
                  <div className={styles.paymentInfo}>
                    <h4>PAYMENT DETAILS</h4>
                    <div className={styles.payQrBox}>
                      <img
                        src="./img/company_pay_qr.jpg"
                        alt="Payment QR Code"
                        className={styles.qrPaymentImg}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.parentElement.innerHTML = `
                                                        <div class="${styles.noQrMessage}">
                                                            <h4>Payment Details</h4>
                                                            <p>Scan QR Code Not Available</p>
                                                            <p>Please use bank transfer</p>
                                                        </div>
                                                    `;
                        }}
                      />
                      <div className={styles.bankDetailsText}>
                        <p>
                          <strong>Bank:</strong>
                          <span>{COMPANY_INFO.bankDetails.bankName}</span>
                        </p>
                        <p>
                          <strong>A/C Name:</strong>
                          <span>{COMPANY_INFO.bankDetails.accountName}</span>
                        </p>
                        <p>
                          <strong>A/C Number:</strong>
                          <span>{COMPANY_INFO.bankDetails.accountNumber}</span>
                        </p>
                        <p>
                          <strong>IFSC:</strong>
                          <span>{COMPANY_INFO.bankDetails.ifscCode}</span>
                        </p>
                        <p>
                          <strong>Branch:</strong>
                          <span>{COMPANY_INFO.bankDetails.branch}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Totals & Signature */}
                <div className={styles.footerColumn}>
                  <div className={styles.totalsBox}>
                    <div className={styles.totalRow}>
                      <span>Total Items:</span>
                      <span>{totalItemsCount}</span>
                    </div>
                    <div className={styles.totalRow}>
                      <span>Total Quantity:</span>
                      <span>{totalQty}</span>
                    </div>
                    <hr />
                    <div className={styles.totalRow}>
                      <span>Sub Total:</span>
                      <span>₹{subTotalVal.toFixed(2)}</span>
                    </div>
                    <div className={styles.totalRow}>
                      <span>Packaging :</span>
                      <span>₹{deliveryChargeVal.toFixed(2)}</span>
                    </div>

                    <div className={styles.grandTotalRow}>
                      <span>GRAND TOTAL:</span>
                      <span>₹{totalAmountVal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className={styles.signatureSection}>
                    <div className={styles.signatureContainer}>
                      <img
                        src="./img/Aakash_lawani_sign.png"
                        alt="Authorized Signature"
                        className={styles.signImg}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <div className={styles.signatureLine}></div>
                      <span className={styles.authText}>
                        <FaFileSignature /> Authorized Signatory
                      </span>
                    </div>
                    <div className={styles.companyStamp}>
                      <p>For {COMPANY_INFO.brand}</p>
                      <p>({COMPANY_INFO.name})</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- FOOTER NOTES --- */}
              <div className={styles.footerNotes}>
                <div className={styles.noteBox}>
                  <p>
                    <strong>Declaration:</strong> "This invoice reflects the
                    true price and accurate details of the goods and is
                    computer-generated."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          {/* <button className={`${styles.btn} ${styles.btnPrint}`} onClick={handlePrint}>
                        <FaPrint /> Print
                    </button> */}
          <button
            className={`${styles.btn} ${styles.btnDownload}`}
            onClick={downloadPdf}
          >
            <FaDownload /> Download PDF
          </button>
          <button
            className={`${styles.btn} ${styles.btnClose}`}
            onClick={onClose}
          >
            <FaTimes /> Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerator;
