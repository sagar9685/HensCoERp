import React from "react";
import styles from "./PaymentModal.module.css";
import { FaTimes, FaRupeeSign, FaCheck } from "react-icons/fa";

const PaymentModal = ({
  isOpen,
  onClose,
  selectedPayment,
  receivedAmount,
  setReceivedAmount,
  verificationRemarks,
  setVerificationRemarks,
  onVerifyPayment,
  loading = false,
}) => {
  if (!isOpen) return null;

  const shortAmount = selectedPayment?.Amount - receivedAmount;
  const isShortPayment = shortAmount > 0;
  console.log("SUMMARY ===>", selectedPayment?.PaymentSummary);

  const getOnlineAmount = (summaryText) => {
    if (!summaryText || typeof summaryText !== "string") return 0;

    let onlineTotal = 0;

    // Split into each mode
    const parts = summaryText.split("|");

    parts.forEach((item) => {
      const [modeName, amountText] = item.split(":").map((s) => s.trim());

      const amount = Number(amountText);

      if (
        modeName.toLowerCase().includes("upi") ||
        modeName.toLowerCase().includes("gpay") ||
        modeName.toLowerCase().includes("paytm") ||
        modeName.toLowerCase().includes("online") ||
        modeName.toLowerCase().includes("bank transfer") ||
        modeName.toLowerCase().includes("card")
      ) {
        onlineTotal += amount;
      }
    });

    return onlineTotal;
  };

  const handleSubmit = () => {
    if (!receivedAmount || receivedAmount <= 0) {
      return toast.error("Please enter a valid amount!");
    }
    onVerifyPayment();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <FaRupeeSign className={styles.headerIcon} />
            <h3>Payment Verification</h3>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Payment Details */}
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
              {selectedPayment?.CustomerName}
            </span>
          </div>
          <div className={styles.amountSection}>
            <div className={styles.originalAmount}>
              <span className={styles.amountLabel}>Total Amount:</span>
              <span className={styles.amountValue}>
                ₹{selectedPayment?.Amount}
              </span>
            </div>

            {/* Online Amount (Only if > 0) */}
            {getOnlineAmount(selectedPayment?.PaymentSummary) > 0 && (
              <div className={styles.originalAmount}>
                <span className={styles.amountLabel}>Online Paid:</span>
                <span className={styles.amountValue}>
                  ₹{getOnlineAmount(selectedPayment?.PaymentSummary)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Input Section */}
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
              placeholder="Enter received amount"
              className={styles.amountInput}
              min="0"
              max={selectedPayment?.Amount}
              autoFocus
            />
          </div>
          {receivedAmount > selectedPayment?.Amount && (
            <p className={styles.warningText}>
              Received amount cannot exceed total amount
            </p>
          )}
        </div>
        {/* Verification Remarks */}
        <div className={styles.inputSection}>
          <label className={styles.inputLabel}>Verification Remarks</label>

          <textarea
            className={styles.remarksInput}
            placeholder="Enter verification remarks (optional)"
            value={verificationRemarks}
            onChange={(e) => setVerificationRemarks(e.target.value)}
            rows={3}
          />
        </div>

        {/* Short Amount Warning */}
        {isShortPayment && receivedAmount > 0 && (
          <div className={styles.shortAmountWarning}>
            <div className={styles.warningIcon}>⚠️</div>
            <div className={styles.warningContent}>
              <p className={styles.warningTitle}>Short Payment</p>
              <p className={styles.warningAmount}>
                Due Amount: <span>₹{shortAmount}</span>
              </p>
              <p className={styles.warningNote}>
                This will mark the payment as incomplete with due amount.
              </p>
            </div>
          </div>
        )}

        {/* Full Payment Success */}
        {receivedAmount == selectedPayment?.Amount && receivedAmount > 0 && (
          <div className={styles.fullPaymentSuccess}>
            <div className={styles.successIcon}>✓</div>
            <p className={styles.successText}>Full payment received</p>
          </div>
        )}

        {/* Modal Actions */}
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
              !receivedAmount ||
              receivedAmount <= 0 ||
              receivedAmount > selectedPayment?.Amount
            }
          >
            {loading ? (
              <div className={styles.loadingSpinner}></div>
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
