import React from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import styles from "./invoice.module.css";
import {
  FaDownload,
  FaTimes,
  FaFileInvoice,
  FaRupeeSign,
  FaFileAlt,
  FaUser,
  FaMapMarkerAlt,
  FaPhone,
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
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.top = "-9999px";
    container.style.left = "0";
    container.style.width = "1000px";
    document.body.appendChild(container);

    const clone = element.cloneNode(true);
    clone.style.width = "1000px";
    clone.style.margin = "0";
    clone.style.padding = "20px";
    clone.style.backgroundColor = "white";
    container.appendChild(clone);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: "#ffffff",
        windowWidth: 1000,
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 10, 10, imgWidth, imgHeight);
      pdf.save(`Invoice_${orderData?.InvoiceNo || "invoice"}.pdf`);
    } catch (err) {
      console.error("PDF Generation Error:", err);
    } finally {
      document.body.removeChild(container);
    }
  };

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

  const productItems = [];
  let subTotalVal = 0;
  let totalQty = 0;

  console.log("Raw orderData:", orderData);

  if (Array.isArray(orderData.products)) {
    orderData.products.forEach((item) => {
      if (Array.isArray(item)) {
        const productDesc = item[1] || "N/A";
        const weightDesc = item[2] || "-";

        // Logic fix: Keywords se check karein ki UPC kiska hai
        let upc = "N/A";
        if (productDesc.toLowerCase().includes("egg") && item[3] !== "NULL") {
          upc = item[3] || "N/A";
        }

        const price = parseFloat(item[4]) || 0;
        const q = 1;
        const r = price;
        const t = q * r;

        totalQty += q;
        subTotalVal += t;

        productItems.push({
          productName: productDesc,
          productType: productDesc,
          weight: weightDesc,
          qty: q,
          BasicCost: r.toFixed(2),
          totalAmt: t.toFixed(2),
          hsn: COMPANY_INFO.hsnCode,
          gstRate: 0,
          ProductUPC: upc,
          MRP: r.toFixed(2),
          Gst_No: orderData.Gst_No || "",
          PAN_No: orderData.PAN_No || "",
          Po_No: orderData.Po_No || "",
          Po_Date: orderData.Po_Date || "",
          DeliveryManName: orderData.DeliveryManName || "",
        });
      } else {
        const productDesc = item.productName || item.name || "N/A";
        let upc = "N/A";
        // Dynamic check for UPC mapping based on product description
        if (productDesc.toLowerCase().includes("egg")) {
          upc = item.ProductUPC || item.upc || "N/A";
        }

        const q = Number(item.qty || item.Quantity || 1);
        const r = Number(item.rate || item.Price || 0);
        const t = q * r;

        totalQty += q;
        subTotalVal += t;

        productItems.push({
          productName: productDesc,
          productType: item.productType || productDesc,
          weight: item.weight || "-",
          qty: q,
          BasicCost: r,
          totalAmt: t.toFixed(2),
          hsn: item.hsn || COMPANY_INFO.hsnCode,
          gstRate: 0,
          ProductUPC: upc,
          MRP: item.mrp || r || "0",
          Gst_No: item.Gst_No || orderData.Gst_No || "",
          PAN_No: item.PAN_No || orderData.PAN_No || "",
          Po_No: item.Po_No || orderData.Po_No || "",
          Po_Date: item.Po_Date || orderData.Po_Date || "",
          DeliveryManName:
            item.DeliveryManName || orderData.DeliveryManName || "",
        });
      }
    });
  } else {
    const parseAndCleanArray = (str) =>
      str ? str.split(",").map((item) => item.trim()) : [];

    const names = parseAndCleanArray(orderData.ProductNames);
    const types = parseAndCleanArray(orderData.ProductTypes);
    const qtys = parseAndCleanArray(orderData.Quantities).map(Number);
    const rates = parseAndCleanArray(orderData.Rates).map(Number);
    const weights = parseAndCleanArray(orderData.Weights);
    const upcs = parseAndCleanArray(orderData.ProductUPCs);
    const mrps = parseAndCleanArray(orderData.MRPs).map(Number);

    const productCount = Math.max(names.length, types.length, rates.length);
    let upcPointer = 0; // loop ke bahar declare karo
    for (let i = 0; i < productCount; i++) {
      let upc = "N/A";

      const productType = types[i] || names[i] || "N/A";
      const productName = names[i] || productType;

      const isBoxProduct = productType.toLowerCase().includes("box");

      if (isBoxProduct && upcPointer < upcs.length) {
        upc = upcs[upcPointer] || "N/A";
        upcPointer++; // next UPC only when box found
      } else {
        upc = "N/A";
      }

      // Fix: UPC only for EGG products, and match properly by index if present

      const qty = qtys[i] || 1;
      const rate = rates[i] || 0;
      const weight = weights[i] || "-";
      const mrp = i < mrps.length ? mrps[i] : rate;
      const total = qty * rate;

      totalQty += qty;
      subTotalVal += total;

      productItems.push({
        productName: productName,
        productType: productType,
        weight: weight,
        qty: qty,
        BasicCost: rate.toFixed(2),
        totalAmt: total.toFixed(2),
        hsn: COMPANY_INFO.hsnCode,
        gstRate: 0,
        ProductUPC: upc,
        MRP: mrp.toFixed(2),
        Gst_No: orderData.Gst_No || "",
        PAN_No: orderData.PAN_No || "",
        Po_No: orderData.Po_No || "",
        Po_Date: orderData.Po_Date || "",
        DeliveryManName: orderData.DeliveryManName || "",
      });
    }
  }

  const totalItemsCount = productItems.length;
  const deliveryChargeVal = orderData?.DeliveryCharge
    ? Number(orderData.DeliveryCharge)
    : 0;
  const totalAmountVal = subTotalVal + deliveryChargeVal;
  const amountInWords = numberToWords(Math.round(totalAmountVal));

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
                        <FaPhone /> +91 {COMPANY_INFO.phone}
                      </p>
                      <p>
                        <strong>GSTIN:</strong> {COMPANY_INFO.gstin}{" "}
                        <strong>PAN:</strong> {COMPANY_INFO.pan}
                      </p>
                    </div>
                  </div>
                </div>
                <div className={styles.invoiceMeta}>
                  <h1>Bill of Supply / Invoice</h1>
                  <div className={styles.invoiceDetails}>
                    <p>
                      <strong>Invoice No:</strong> {orderData.InvoiceNo}
                    </p>
                    <p>
                      <strong>Invoice Date:</strong>{" "}
                      {orderData.InvoiceDate
                        ? new Date(orderData.InvoiceDate).toLocaleDateString(
                            "en-GB",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

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
                      <strong>GSTIN:</strong> {orderData.Gst_No || "N/A"}
                      <br />
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
                    <p>
                      <strong>P.O. Number -:</strong> {orderData.Po_No || "N/A"}
                      <br />
                      <strong>P.O. Date -:</strong>{" "}
                      {orderData.Po_Date
                        ? new Date(orderData.Po_Date).toLocaleDateString(
                            "en-GB",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )
                        : "N/A"}
                    </p>
                    <p>
                      <strong>Payment Terms -: 7 Days</strong>
                    </p>
                  </div>
                </div>
                <div className={styles.detailBox}>
                  <h3>
                    <FaFileAlt /> FSSAI
                  </h3>
                  <div className={styles.orderInfo}>
                    <p>
                      <strong>FSSAI - Phoenix Poultry 11424170000122</strong>
                      <br />
                      <strong>
                        FSSAI - VND Ventures Pvt. LTD. 11421170000373
                      </strong>
                      <br />
                      <strong>FSSAI - The Hen's Co. 21420170000432</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.productsTable}>
                  <thead>
                    <tr>
                      <th className={styles.textCenter}>#</th>
                      <th>Product Description</th>
                      <th>Product Weight</th>
                      <th className={styles.textCenter}>HSN Code</th>
                      <th className={styles.textCenter}>Product UPC</th>
                      <th className={styles.textRight}>Basic Cost Price (₹)</th>
                      <th className={styles.textRight}>CGST %</th>
                      <th className={styles.textRight}>SGST %</th>
                      <th className={styles.textRight}>Landing Rate</th>
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
                        </td>
                        <td>
                          <span style={{ fontWeight: "bold" }}>
                            {item.weight}
                          </span>
                        </td>
                        <td className={styles.textCenter}>{item.hsn}</td>
                        <td className={styles.textCenter}>{item.ProductUPC}</td>
                        <td className={styles.textRight}>{item.BasicCost}</td>
                        <td className={styles.textRight}>{item.gstRate}</td>
                        <td className={styles.textRight}>{item.gstRate}</td>
                        <td className={styles.textRight}>{item.BasicCost}</td>
                        <td className={styles.textCenter}>{item.qty}</td>
                        <td className={styles.textRight}>{item.MRP}</td>
                        <td className={styles.textRight}>{item.totalAmt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.footerSection}>
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
                          e.target.parentElement.innerHTML = `<div class="${styles.noQrMessage}"><h4>Payment Details</h4><p>Scan QR Code Not Available</p><p>Please use bank transfer</p></div>`;
                        }}
                      />
                      <div className={styles.bankDetailsText}>
                        <p>
                          <strong>Bank:</strong>{" "}
                          <span>{COMPANY_INFO.bankDetails.bankName}</span>
                        </p>
                        <p>
                          <strong>A/C Name:</strong>{" "}
                          <span>{COMPANY_INFO.bankDetails.accountName}</span>
                        </p>
                        <p>
                          <strong>A/C Number:</strong>{" "}
                          <span>{COMPANY_INFO.bankDetails.accountNumber}</span>
                        </p>
                        <p>
                          <strong>IFSC:</strong>{" "}
                          <span>{COMPANY_INFO.bankDetails.ifscCode}</span>
                        </p>
                        <p>
                          <strong>Branch:</strong>{" "}
                          <span>{COMPANY_INFO.bankDetails.branch}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
                      <span>Packaging:</span>
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
