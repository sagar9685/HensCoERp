import React from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import styles from "./Noteinvoice.module.css";
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
  if (!n) return "";
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
const NoteInvoice = ({ noteData, onClose }) => {
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
      pdf.save(
        `${orderData?.note_type || "Note"}_Note_${orderData?.note_no || "invoice"}.pdf`,
      );
    } catch (err) {
      console.error("PDF Generation Error:", err);
    } finally {
      document.body.removeChild(container);
    }
  };

  const orderData = noteData;

  if (!orderData) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h2>
              <FaFileInvoice style={{ color: "#fff" }} />
              Note Preview
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

  let totalQty = 0;
  let subTotalVal = 0;

  if (Array.isArray(orderData.products)) {
    orderData.products.forEach((item) => {
      totalQty += Number(item.note_qty || item.qty || 0);
      subTotalVal += Number(item.amount || item.qty * item.rate || 0);
    });
  }

  const totalFreight = Array.isArray(orderData.products)
    ? orderData.products.reduce((a, b) => a + Number(b.freight || 0), 0)
    : 0;

  const totalItemsCount = orderData.products?.length || 0;
  const deliveryChargeVal = orderData?.DeliveryCharge
    ? Number(orderData.DeliveryCharge)
    : 0;
  const totalAmountVal = subTotalVal + deliveryChargeVal + totalFreight;
  const amountInWords = numberToWords(Math.round(totalAmountVal));

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>
            <FaFileInvoice style={{ color: "#fff" }} />
            {orderData.note_type === "Credit"
              ? "Credit Note"
              : "Debit Note"}{" "}
            Preview - {orderData.note_no}
          </h2>
          <button className={styles.btnClose} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.invoiceWrapper}>
          <div className={styles.invoiceBody}>
            <div id="invoice-print-content" className={styles.invoiceContainer}>
              {/* Header */}
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
                      <p className={styles.companyTitle}>
                        <strong>{COMPANY_INFO.name}</strong>
                      </p>
                      <p className={styles.companySub}>
                        <FaMapMarkerAlt /> {COMPANY_INFO.address}
                      </p>
                      <p className={styles.companySub}>
                        <FaPhone /> +91 {COMPANY_INFO.phone}
                      </p>
                      <p className={styles.companySub}>
                        <strong>GSTIN:</strong> {COMPANY_INFO.gstin} |{" "}
                        <strong>PAN:</strong> {COMPANY_INFO.pan}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={styles.invoiceMeta}>
                  <h1>
                    {orderData.note_type === "Credit"
                      ? "CREDIT NOTE"
                      : "DEBIT NOTE"}
                  </h1>
                  <div className={styles.invoiceDetails}>
                    <p className={styles.invoiceRow}>
                      <strong>Note No</strong>
                      <span>{orderData.note_no}</span>
                    </p>
                    <p className={styles.invoiceRow}>
                      <strong>Note Date</strong>
                      <span>
                        {orderData.created_at
                          ? new Date(orderData.created_at).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "N/A"}
                      </span>
                    </p>
                    <p className={styles.invoiceRow}>
                      <strong>Invoice Date</strong>
                      <span>
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
                      </span>
                    </p>
                    <p className={styles.invoiceRow}>
                      <strong>Against Invoice</strong>
                      <span>{orderData.NoteInvoiceNo || "N/A"}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer & Order Box */}
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
                      <FaPhone /> {orderData.ContactNo || "N/A"}
                    </p>
                    <p className={styles.customerGst}>
                      <strong>GSTIN:</strong> {orderData.Gst_No || "N/A"} |{" "}
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
                      {orderData.DeliveryManName || "NA"}
                    </p>
                    <p>
                      <strong>P.O. Number:</strong> {orderData.Po_No || "N/A"}
                    </p>
                    <p>
                      <strong>P.O. Date:</strong>{" "}
                      {orderData.Po_Date
                        ? new Date(orderData.Po_Date).toLocaleDateString(
                            "en-GB",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className={styles.detailBox}>
                  <h3>
                    <FaFileAlt /> FSSAI Registration
                  </h3>
                  <div className={styles.orderInfo}>
                    <p>
                      <strong>Phoenix Poultry:</strong> 11424170000122
                    </p>
                    <p>
                      <strong>VND Ventures:</strong> 11421170000373
                    </p>
                    <p>
                      <strong>The Hen's Co.:</strong> 21420170000432
                    </p>
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <div className={styles.tableContainer}>
                <table className={styles.productsTable}>
                  <thead>
                    <tr>
                      <th className={styles.textCenter}>#</th>
                      <th>Product Description</th>
                      <th className={styles.textCenter}>HSN Code</th>
                      <th className={styles.textCenter}>Qty</th>
                      <th className={styles.textRight}>Rate (₹)</th>
                      <th className={styles.textRight}>Amount (₹)</th>
                      <th>Reason</th>
                    </tr>
                  </thead>

                  <tbody>
                    {Array.isArray(orderData.products) &&
                      orderData.products.map((item, index) => (
                        <tr key={index}>
                          <td className={styles.textCenter}>{index + 1}</td>
                          <td className={styles.fontMedium}>
                            {item.product_name || item.productName || "Product"}
                          </td>
                          <td className={styles.textCenter}>
                            {COMPANY_INFO.hsnCode}
                          </td>
                          <td className={styles.textCenter}>
                            {item.note_qty || item.qty || 0}
                          </td>
                          <td className={styles.textRight}>
                            ₹{Number(item.rate || 0).toFixed(2)}
                          </td>
                          <td className={styles.textRight}>
                            ₹
                            {Number(
                              item.amount || item.qty * item.rate || 0,
                            ).toFixed(2)}
                          </td>
                          <td>{item.reason || "-"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Calculations */}
              <div className={styles.totalsWrapper}>
                <div className={styles.wordsBlock}>
                  <div className={styles.amountInWords}>
                    <span>
                      <FaRupeeSign /> Amount in Words:
                    </span>
                    <p>
                      {amountInWords ? `${amountInWords} Rupees Only` : "N/A"}
                    </p>
                  </div>
                </div>

                <div className={styles.totalsBox}>
                  <div className={styles.totalRow}>
                    <span>Total Items:</span>
                    <span>{totalItemsCount}</span>
                  </div>
                  <div className={styles.totalRow}>
                    <span>Total Quantity:</span>
                    <span>{totalQty}</span>
                  </div>
                  <div className={styles.totalRow}>
                    <span>Sub Total:</span>
                    <span>₹{subTotalVal.toFixed(2)}</span>
                  </div>
                  {deliveryChargeVal > 0 && (
                    <div className={styles.totalRow}>
                      <span>Packaging:</span>
                      <span>₹{deliveryChargeVal.toFixed(2)}</span>
                    </div>
                  )}
                  {totalFreight > 0 && (
                    <div className={styles.totalRow}>
                      <span>Freight:</span>
                      <span>₹{totalFreight.toFixed(2)}</span>
                    </div>
                  )}
                  <div className={styles.grandTotalRow}>
                    <span>GRAND TOTAL:</span>
                    <span>₹{totalAmountVal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className={styles.signatureSection}>
                <div className={styles.companyStamp}>
                  <p>
                    For <strong>{COMPANY_INFO.brand}</strong>
                  </p>
                  <p>({COMPANY_INFO.name})</p>
                </div>
                <div className={styles.signatureContainer}>
                  <img
                    src="./img/Aakash_lawani_sign.png"
                    alt="Signature"
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
              </div>

              {/* Footer Note */}
              <div className={styles.footerNotes}>
                <p>
                  <strong>Declaration:</strong> This invoice reflects the true
                  price and accurate details of the goods described and is
                  computer generated.
                </p>
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

export default NoteInvoice;
