import React, { useState, useEffect } from 'react';
import styles from './CompleteOrderModal.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPaymentModes } from '../../features/paymentModeSlice';
import { completeOrder, resetOrderState } from "../../features/orderCompletionSlice";

const makeAmountKey = (modeName) => `${modeName.replace(/\s+/g, '')}Amount`; // e.g. "Bank Transfer" -> "BankTransferAmount"

const UserCompleteOrderModal = ({ isOpen, onClose, order }) => {
  const dispatch = useDispatch();
  const { loading, success } = useSelector(state => state.orderCompletion);
  const paymentModes = useSelector((state) => state.paymentMode?.list || []);
  console.log("ORDER RECEIVED IN MODAL ===>", order);

  const totalAmount = order
    ? Number(order.GrandItemTotal || 0) + Number(order.DeliveryCharge || 0)
    : 0;

  const [formData, setFormData] = useState({
    remarks: '',
    deliveryDate: ''
    // amount keys will be injected when paymentModes arrive
  });

  // selectedPaymentMethods stores exact ModeName values from DB (e.g. "Cash", "GPay", "Bank Transfer")
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState([]);
  const [remainingAmount, setRemainingAmount] = useState(totalAmount);

  useEffect(() => {
    dispatch(fetchPaymentModes());
  }, [dispatch]);

  // initialize amount keys when paymentModes fetched
  useEffect(() => {
    if (paymentModes.length > 0) {
      const initialAmounts = {};
      paymentModes.forEach(pm => {
        const amountKey = makeAmountKey(pm.ModeName);
        initialAmounts[amountKey] = "0";
      });

      // default select "Cash" if exists, else first mode
      const defaultSelected = paymentModes.find(pm => pm.ModeName.toLowerCase() === 'cash')?.ModeName
        || paymentModes[0]?.ModeName;

      setFormData(prev => ({ ...prev, ...initialAmounts }));
      setSelectedPaymentMethods(defaultSelected ? [defaultSelected] : []);
    }
  }, [paymentModes]);

  useEffect(() => {
    if (success) {
      alert("Order Completed Successfully!");
      onClose();
      dispatch(resetOrderState());
    }
  }, [success, onClose, dispatch]);

  useEffect(() => {
    if (order) {
      const today = new Date().toISOString().split('T')[0];

      // if payment mode keys exist in formData, set Cash (or default) to total
      const newForm = { remarks: '', deliveryDate: today, ...formData };

      // Put total amount into CashAmount if Cash exists, else first available amount key
      const cashPM = paymentModes.find(pm => pm.ModeName.toLowerCase() === 'cash');
      if (cashPM) {
        newForm[makeAmountKey(cashPM.ModeName)] = totalAmount.toString();
        setSelectedPaymentMethods([cashPM.ModeName]);
      } else if (paymentModes[0]) {
        newForm[makeAmountKey(paymentModes[0].ModeName)] = totalAmount.toString();
        setSelectedPaymentMethods([paymentModes[0].ModeName]);
      }

      setFormData(prev => ({ ...prev, ...newForm }));
      setRemainingAmount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, totalAmount, paymentModes.length]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentMethodToggle = (modeName) => {
    setSelectedPaymentMethods(prev => {
      let updated;
      if (prev.includes(modeName)) {
        updated = prev.filter(m => m !== modeName);
      } else {
        updated = [...prev, modeName];
      }

      // recalc remaining using amount keys
      const totalPaid = updated.reduce((sum, m) => {
        const key = makeAmountKey(m);
        return sum + Number(formData[key] || 0);
      }, 0);

      setRemainingAmount(totalAmount - totalPaid);
      return updated;
    });
  };

  const handlePaymentAmountChange = (modeName, value) => {
    const amountKey = makeAmountKey(modeName);
    setFormData(prev => ({ ...prev, [amountKey]: value }));

    // recalc remaining using currently selected payment methods
    const totalPaid = selectedPaymentMethods.reduce((sum, m) => {
      const key = makeAmountKey(m);
      // if the changed mode is this m, use the new value; else use existing formData
      const amt = (m === modeName) ? Number(value || 0) : Number(formData[key] || 0);
      return sum + amt;
    }, 0);

    setRemainingAmount(totalAmount - totalPaid);
  };

  const distributeRemainingAmount = (modeName) => {
    if (remainingAmount > 0) {
      const amountKey = makeAmountKey(modeName);
      const currentAmount = Number(formData[amountKey] || 0);
      const newAmount = currentAmount + remainingAmount;

      setFormData(prev => ({ ...prev, [amountKey]: newAmount.toString() }));
      setRemainingAmount(0);
    }
  };

  const getTotalPaid = () => {
    return selectedPaymentMethods.reduce((sum, m) => {
      const key = makeAmountKey(m);
      return sum + Number(formData[key] || 0);
    }, 0);
  };

  const handleSubmit = () => {
    // Build paymentSettlement using exact ModeName keys (as in DB)
    const paymentSettlement = {};
    selectedPaymentMethods.forEach(modeName => {
      const amountKey = makeAmountKey(modeName);
      paymentSettlement[modeName] = Number(formData[amountKey] || 0);
    });

    // ensure all selected payment modes appear (even zero) if you prefer:
    // paymentModes.forEach(pm => { paymentSettlement[pm.ModeName] = Number(formData[makeAmountKey(pm.ModeName)] || 0) });

    const payload = {
      orderId: order.OrderID,
      assignedOrderId: order.AssignID,
      status: "Complete",
        paymentReceivedDate: formData.deliveryDate,
      remarks: formData.remarks,
      paymentSettlement
    };

    console.log("FINAL PAYLOAD ====>", payload);
    dispatch(completeOrder(payload));
  };

  if (!isOpen || !order) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <i className="mdi mdi-check-circle"></i>
            Complete Order #{order.OrderID}
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="mdi mdi-close"></i>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.orderInfoSection}>
            <h3 className={styles.sectionTitle}>Order Details</h3>
            <div className={styles.orderInfoGrid}>
              <div className={styles.infoItem}>
                <label>Product Name:</label>
                <span>{order.ProductName}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Customer:</label>
                <span>{order.CustomerName}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Contact:</label>
                <span>{order.ContactNo}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Area:</label>
                <span>{order.Area}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Total Amount:</label>
                <span className={styles.totalAmount}>₹{totalAmount}</span>
              </div>
            </div>
          </div>

          <div className={styles.completeForm}>
            <h3 className={styles.sectionTitle}>Completion Details</h3>
            <div className={styles.formGrid}>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <i className="mdi mdi-calendar-check"></i>
                  Payment Received Date *
                </label>
                <input
                  type="date"
                  name="deliveryDate"
                  value={formData.deliveryDate || ''}
                  onChange={handleInputChange}
                  className={styles.formInput}
                />
              </div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.formLabel}>
                  <i className="mdi mdi-credit-card-multiple"></i>
                  Select Payment Methods
                </label>

                <div className={styles.paymentMethodsGrid}>
                  {paymentModes.map(pm => {
                    const modeName = pm.ModeName; // exact DB name
                    return (
                      <div key={pm.PaymentModeID} className={styles.paymentMethodCheckbox}>
                        <input
                          type="checkbox"
                          id={`payment-${pm.PaymentModeID}`}
                          checked={selectedPaymentMethods.includes(modeName)}
                          onChange={() => handlePaymentMethodToggle(modeName)}
                        />
                        <label htmlFor={`payment-${pm.PaymentModeID}`}>
                          {modeName === "Cash" && <i className="mdi mdi-cash"></i>}
                          {(modeName === "GPay" || modeName.toLowerCase() === "gpay") && <i className="mdi mdi-cellphone"></i>}
                          {modeName === "Paytm" && <i className="mdi mdi-cellphone"></i>}
                          {modeName === "FOC" && <i className="mdi mdi-tag"></i>}
                          {modeName === "Bank Transfer" && <i className="mdi mdi-bank"></i>}
                          {pm.ModeName}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.formLabel}>
                  <i className="mdi mdi-cash-usd"></i>
                  Payment Amounts
                </label>

                <div className={styles.paymentAmountsGrid}>
                  {selectedPaymentMethods.map(modeName => {
                    const amountKey = makeAmountKey(modeName);
                    return (
                      <div key={modeName} className={styles.paymentInputGroup}>
                        <label className={styles.amountLabel}>
                          {modeName} Amount
                        </label>
                        <div className={styles.amountInputWrapper}>
                          <input
                            type="number"
                            value={formData[amountKey] || '0'}
                            onChange={(e) => handlePaymentAmountChange(modeName, e.target.value)}
                            className={styles.amountInput}
                            placeholder="0"
                          />
                          {remainingAmount > 0 && (
                            <button
                              type="button"
                              className={styles.addRemainingButton}
                              onClick={() => distributeRemainingAmount(modeName)}
                              title={`Add remaining ₹${remainingAmount}`}
                            >
                              <i className="mdi mdi-plus-circle"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
             <div className={`${styles.formGroup} ${styles.fullWidth}`}>
  <div className={styles.paymentSummary}>
    <div className={styles.summaryItem}>
      <span>Total Amount:</span>
      <span className={styles.totalAmount}>₹{totalAmount}</span>
    </div>

    {selectedPaymentMethods.map(modeName => {
      const amount = Number(formData[makeAmountKey(modeName)] || 0);
      if (amount <= 0) return null;
      return (
        <div key={modeName} className={styles.summaryItem}>
          <span>{modeName} Paid:</span>
          <span className={styles.methodAmount}>₹{amount}</span>
        </div>
      );
    })}

    <div className={styles.summaryItem}>
      <span>Total Paid:</span>
      <span className={styles.paidAmount}>₹{getTotalPaid()}</span>
    </div>

    <div className={styles.summaryItem}>
      <span>Remaining:</span>
      <span className={`${styles.remainingAmount} ${remainingAmount > 0 ? styles.remaining : styles.fullyPaid}`}>
        ₹{remainingAmount}
      </span>
    </div>

    {remainingAmount > 0 && (
      <div className={styles.remainingHint}>
        <i className="mdi mdi-information"></i>
        Select payment methods and distribute the remaining amount
      </div>
    )}

    <div className={styles.paymentStatus}>
      <div className={`${styles.statusIndicator} ${remainingAmount === 0 ? styles.fullyPaid : styles.partiallyPaid}`}>
        <i className={`mdi mdi-${remainingAmount === 0 ? 'check-circle' : 'alert-circle'}`}></i>
        {remainingAmount === 0 ? 'Fully Paid' : 'Partially Paid'}
      </div>
    </div>
  </div>
</div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.formLabel}>
                  <i className="mdi mdi-note-text"></i>
                  Completion Remarks
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks || ''}
                  onChange={handleInputChange}
                  className={styles.formTextarea}
                  rows="3"
                  placeholder="Add any remarks about order completion..."
                />
              </div>

            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            <i className="mdi mdi-close"></i>
            Cancel
          </button>

          <button
            className={styles.completeButton}
            onClick={handleSubmit}
            disabled={remainingAmount !== 0 || loading}
          >
            {loading ? "Processing..." : "Mark as Complete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserCompleteOrderModal;
