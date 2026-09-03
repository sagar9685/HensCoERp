import React from "react";
import styles from "./PaymentModal.module.css";
import { FaTimes, FaRupeeSign, FaCheck } from "react-icons/fa";
import { toast } from "react-toastify";

const PaymentModal = ({
  isOpen,
  onClose,
  selectedPayment,
  receivedAmount,
  setReceivedAmount,
  verificationRemarks,
  setVerificationRemarks,
  onVerifyPayment,
  paymentMode,
  setPaymentMode,
  paymentModesList,
  paymentReceivedDate,
  setPaymentReceivedDate,
  loading = false,
}) => {
  if (!isOpen) return null;

  // ============================================================
  // ORDER TOTAL
  // ============================================================

  const totalOrderAmount =
    Number(selectedPayment?.GrandItemTotal || 0) +
    Number(selectedPayment?.DeliveryCharge || 0);

  // ============================================================
  // CREDIT NOTE
  // ============================================================

  const creditNoteAmount = Math.max(
    Number(selectedPayment?.CreditNoteAmount || 0),
    0,
  );

  // Credit note total amount se jyada apply na ho
  const applicableCreditNote = Math.min(creditNoteAmount, totalOrderAmount);

  // Example:
  // Total = 500
  // Credit Note = 100
  // Net Payable = 400

  const netPayableAmount = Math.max(totalOrderAmount - applicableCreditNote, 0);

  const enteredAmount = Number(receivedAmount || 0);

  // ============================================================
  // SHORT / FULL PAYMENT
  // ============================================================

  const shortAmount = Math.max(netPayableAmount - enteredAmount, 0);

  const isShortPayment = enteredAmount > 0 && enteredAmount < netPayableAmount;

  const isFullPayment = enteredAmount > 0 && enteredAmount === netPayableAmount;

  const isOverPayment = enteredAmount > netPayableAmount;

  console.log("PAYMENT SUMMARY ===>", selectedPayment?.PaymentSummary);
  console.log("TOTAL ORDER ===>", totalOrderAmount);
  console.log("CREDIT NOTE ===>", applicableCreditNote);
  console.log("NET PAYABLE ===>", netPayableAmount);

  // ============================================================
  // GET ALREADY PAID ONLINE AMOUNT
  // ============================================================

  const getOnlineAmount = (summaryText) => {
    if (!summaryText || typeof summaryText !== "string") {
      return 0;
    }

    let onlineTotal = 0;

    const parts = summaryText.split("|");

    parts.forEach((item) => {
      const [modeNameRaw, amountTextRaw] = item.split(":").map((s) => s.trim());

      if (!modeNameRaw || !amountTextRaw) {
        return;
      }

      const modeName = modeNameRaw.toLowerCase();
      const amount = Number(amountTextRaw) || 0;

      if (
        modeName.includes("upi") ||
        modeName.includes("gpay") ||
        modeName.includes("paytm") ||
        modeName.includes("online") ||
        modeName.includes("bank transfer") ||
        modeName.includes("card")
      ) {
        onlineTotal += amount;
      }
    });

    return onlineTotal;
  };

  const onlinePaidAmount = getOnlineAmount(selectedPayment?.PaymentSummary);

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = () => {
    const selectedMode = String(paymentMode || "").trim();

    const amount = Number(receivedAmount || 0);

    if (!selectedMode) {
      return toast.error("Please select payment mode!");
    }

    if (!amount || amount <= 0) {
      return toast.error("Please enter a valid amount!");
    }

    if (amount > netPayableAmount) {
      return toast.error(`Maximum payable amount is ₹${netPayableAmount}`);
    }

    if (!paymentReceivedDate) {
      return toast.error("Please select payment received date!");
    }

    onVerifyPayment(paymentReceivedDate);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <FaRupeeSign className={styles.headerIcon} />

            <h3>Payment Verification</h3>
          </div>

          <button
            className={styles.closeButton}
            onClick={onClose}
            disabled={loading}
          >
            <FaTimes />
          </button>
        </div>

        {/* =====================================================
            PAYMENT DETAILS
        ====================================================== */}

        <div className={styles.paymentDetails}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Order ID:</span>

            <span className={styles.detailValue}>
              #{selectedPayment?.OrderID}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Customer:</span>

            <span className={styles.detailValue}>
              {selectedPayment?.CustomerName || "-"}
            </span>
          </div>

          {/* =================================================
              AMOUNT DETAILS
          ================================================== */}

          <div className={styles.amountSection}>
            {/* Total */}

            <div className={styles.originalAmount}>
              <span className={styles.amountLabel}>Total Amount:</span>

              <span className={styles.amountValue}>
                ₹{totalOrderAmount.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Credit Note */}

            {applicableCreditNote > 0 && (
              <div className={styles.originalAmount}>
                <span className={styles.amountLabel}>Credit Note:</span>

                <span className={styles.amountValue}>
                  - ₹{applicableCreditNote.toLocaleString("en-IN")}
                </span>
              </div>
            )}

            {/* Net Payable */}

            {applicableCreditNote > 0 && (
              <div className={styles.originalAmount}>
                <span className={styles.amountLabel}>Net Payable:</span>

                <span className={styles.amountValue}>
                  ₹{netPayableAmount.toLocaleString("en-IN")}
                </span>
              </div>
            )}

            {/* Already Online Paid */}

            {onlinePaidAmount > 0 && (
              <div className={styles.originalAmount}>
                <span className={styles.amountLabel}>Online Paid:</span>

                <span className={styles.amountValue}>
                  ₹{onlinePaidAmount.toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* =====================================================
            PAYMENT MODE
        ====================================================== */}

        <div className={styles.inputSection}>
          <label className={styles.inputLabel}>
            Payment Mode <span className={styles.required}>*</span>
          </label>

          <select
            value={paymentMode || ""}
            onChange={(e) => setPaymentMode(e.target.value)}
            className={styles.amountInput}
            disabled={loading}
          >
            <option value="">Select Payment Mode</option>

            {(paymentModesList?.length > 0
              ? paymentModesList
              : [
                  {
                    PaymentModeID: 2,
                    ModeName: "GPay",
                  },
                  {
                    PaymentModeID: 3,
                    ModeName: "Paytm",
                  },
                  {
                    PaymentModeID: 4,
                    ModeName: "FOC",
                  },
                  {
                    PaymentModeID: 5,
                    ModeName: "Bank Transfer",
                  },
                ]
            )
              .filter((mode) => mode.ModeName?.toLowerCase() !== "cash")
              .map((mode) => (
                <option
                  key={mode.PaymentModeID}
                  value={String(mode.PaymentModeID)}
                >
                  {mode.ModeName}
                </option>
              ))}
          </select>
        </div>

        {/* =====================================================
            RECEIVED AMOUNT
        ====================================================== */}

        <div className={styles.inputSection}>
          <label className={styles.inputLabel}>
            Received Amount <span className={styles.required}>*</span>
          </label>

          <div className={styles.inputContainer}>
            <FaRupeeSign className={styles.inputIcon} />

            <input
              type="number"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                  e.preventDefault();
                }
              }}
              placeholder={`Maximum ₹${netPayableAmount}`}
              className={styles.amountInput}
              min="0"
              max={netPayableAmount}
              step="0.01"
              autoFocus
              disabled={loading}
            />
          </div>

          {isOverPayment && (
            <p className={styles.warningText}>
              Received amount cannot exceed net payable amount ₹
              {netPayableAmount.toLocaleString("en-IN")}
            </p>
          )}
        </div>

        {/* =====================================================
            DATE
        ====================================================== */}

        <div className={styles.inputSection}>
          <label className={styles.inputLabel}>
            Payment Received Date <span className={styles.required}>*</span>
          </label>

          <input
            type="date"
            value={paymentReceivedDate}
            onChange={(e) => setPaymentReceivedDate(e.target.value)}
            className={styles.amountInput}
            disabled={loading}
          />
        </div>

        {/* =====================================================
            REMARKS
        ====================================================== */}

        <div className={styles.inputSection}>
          <label className={styles.inputLabel}>Verification Remarks</label>

          <textarea
            className={styles.remarksInput}
            placeholder="Enter verification remarks (optional)"
            value={verificationRemarks}
            onChange={(e) => setVerificationRemarks(e.target.value)}
            rows={3}
            disabled={loading}
          />
        </div>

        {/* =====================================================
            SHORT PAYMENT WARNING
        ====================================================== */}

        {isShortPayment && (
          <div className={styles.shortAmountWarning}>
            <div className={styles.warningIcon}>⚠️</div>

            <div className={styles.warningContent}>
              <p className={styles.warningTitle}>Short Payment</p>

              <p className={styles.warningAmount}>
                Due Amount: <span>₹{shortAmount.toLocaleString("en-IN")}</span>
              </p>

              <p className={styles.warningNote}>
                This will mark the payment as incomplete with due amount.
              </p>
            </div>
          </div>
        )}

        {/* =====================================================
            FULL PAYMENT SUCCESS
        ====================================================== */}

        {isFullPayment && (
          <div className={styles.fullPaymentSuccess}>
            <div className={styles.successIcon}>✓</div>

            <p className={styles.successText}>
              Full payment received
              {applicableCreditNote > 0
                ? ` after ₹${applicableCreditNote.toLocaleString(
                    "en-IN",
                  )} Credit Note adjustment`
                : ""}
            </p>
          </div>
        )}

        {/* =====================================================
            ACTION BUTTONS
        ====================================================== */}

        <div className={styles.modalActions}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={
              loading ||
              !paymentMode ||
              !receivedAmount ||
              enteredAmount <= 0 ||
              enteredAmount > netPayableAmount
            }
          >
            {loading ? (
              <div className={styles.loadingSpinner} />
            ) : (
              <FaCheck className={styles.submitIcon} />
            )}

            {loading ? "Processing..." : "Verify Payment"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
