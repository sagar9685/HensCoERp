import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generatePurchasePDF = (purchase) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // ---------------- COLORS ----------------
  const primaryColor = [31, 41, 55];     // Dark slate
  const accentColor = [41, 128, 185];    // Blue
  const lightGrey = [245, 247, 250];
  const goldAccent = [255, 193, 7];

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // ---------------- PO DATE (FIXED) ----------------
  const poDateValue =
    purchase.po_date || purchase.order_date || purchase.created_at;

  const poDate = poDateValue
    ? new Date(poDateValue).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  // ---------------- HEADER ----------------
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 90, "F");

  doc.setFillColor(...goldAccent);
  doc.rect(0, 86, pageWidth, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("VND VENTURES PVT. LTD.", 40, 55);

  // PURCHASE ORDER badge
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.roundedRect(pageWidth - 235, 25, 195, 40, 6, 6, "S");
  doc.setFontSize(20);
  doc.text("PURCHASE ORDER", pageWidth - 225, 52);

  // ---------------- INFO CARD ----------------
  let y = 120;

  doc.setFillColor(...lightGrey);
  doc.roundedRect(30, y - 20, pageWidth - 60, 65, 8, 8, "F");

  doc.setDrawColor(220);
  doc.roundedRect(30, y - 20, pageWidth - 60, 65, 8, 8, "S");

  // ORDER TO
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ORDER TO:", 45, y);

  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.text("Phoenix Poultry Gosalpur", 45, y + 22);

  // PO DETAILS
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text("PO NUMBER:", pageWidth - 250, y);
  doc.text("DATE:", pageWidth - 250, y + 22);

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(purchase.po_number || "N/A", pageWidth - 150, y);
  doc.text(poDate, pageWidth - 150, y + 22);

  // ---------------- TABLE TITLE ----------------
  y = 215;

  doc.setFillColor(...primaryColor);
  doc.rect(30, y - 12, pageWidth - 60, 26, "F");

  doc.setFontSize(12);
  doc.setTextColor(255);
  doc.text("ORDER ITEMS DETAILS", 40, y + 6);

  doc.setFillColor(...goldAccent);
  doc.rect(30, y + 14, pageWidth - 60, 2, "F");

  // ---------------- TABLE ----------------
  const rows = purchase.items.map((item, index) => [
    index + 1,
    item.item_name,
    item.weight || "-",
    item.qty,
  ]);

  autoTable(doc, {
    startY: y + 25,
    head: [["S.No", "Description of Goods", "Weight", "Quantity"]],
    body: rows,
    theme: "grid",
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    styles: {
      fontSize: 10,
      cellPadding: 9,
      lineColor: [230, 230, 230],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 50 },
      2: { halign: "center", cellWidth: 90 },
      3: { halign: "center", cellWidth: 80 },
    },
    margin: { left: 30, right: 30 },
  });

  // ---------------- TOTAL BOX ----------------
  const finalY = doc.lastAutoTable.finalY + 25;

  doc.setDrawColor(...accentColor);
  doc.roundedRect(pageWidth - 245, finalY, 215, 40, 6, 6, "S");

  doc.setFillColor(240, 249, 255);
  doc.roundedRect(pageWidth - 244, finalY + 1, 213, 38, 6, 6, "F");

  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text("TOTAL QUANTITY:", pageWidth - 230, finalY + 25);

  doc.setFillColor(...accentColor);
  doc.roundedRect(pageWidth - 110, finalY + 8, 60, 24, 12, 12, "F");

  doc.setTextColor(255);
  doc.setFontSize(13);
  doc.text(
    String(purchase.total_qty),
    pageWidth - 80,
    finalY + 25,
    { align: "center" }
  );

  // ---------------- FOOTER ----------------
  doc.setDrawColor(220);
  doc.line(40, pageHeight - 50, pageWidth - 40, pageHeight - 50);

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    "This is a computer generated document.",
    pageWidth / 2,
    pageHeight - 30,
    { align: "center" }
  );

  // ---------------- SAVE ----------------
  doc.save(`PurchaseOrder_${purchase.po_number}.pdf`);
};
