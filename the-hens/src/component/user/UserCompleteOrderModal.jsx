import React, { useState, useEffect } from 'react';
import styles from './CompleteOrderModal.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPaymentModes } from '../../features/paymentModeSlice';

const UserCompleteOrderModal = ({ isOpen, onClose, order, onSubmit }) => {
  const dispatch = useDispatch();
  const paymentModes = useSelector((state) => state.paymentMode?.list || []);
    console.log(paymentModes,"pay")
  const totalAmount = order
    ? Number(order.Rate) + Number(order.DeliveryCharge)
    : 0;

  const [formData, setFormData] = useState({
    paymentMode: 'cash',
    cashAmount: '',
    upiAmount: '',
    cardAmount: '',
    remarks: '',
    deliveryDate: ''
  });

  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState(['cash']);
  const [remainingAmount, setRemainingAmount] = useState(totalAmount);

  useEffect(() => {
    dispatch(fetchPaymentModes());
  }, [dispatch]);

  useEffect(() => {
    if (order) {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        paymentMode: 'cash',
        cashAmount: totalAmount.toString(),
        upiAmount: '0',
        cardAmount: '0',
        remarks: '',
        deliveryDate: today
      });
      setRemainingAmount(0);
    }
  }, [order, totalAmount]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

 const handlePaymentMethodToggle = (method) => {
  setSelectedPaymentMethods((prev) => {
    if (prev.includes(method)) {
      // Remove method and reset its amount
      setFormData((prevData) => ({
        ...prevData,
        [`${method}Amount`]: '0',
      }));
      return prev.filter((m) => m !== method);
    } else {
      // Add method and initialize its amount to 0
      setFormData((prevData) => ({
        ...prevData,
        [`${method}Amount`]: '0',
      }));
      return [...prev, method];
    }
  });
};


const handlePaymentAmountChange = (method, value) => {
  setFormData(prev => ({
    ...prev,
    [`${method}Amount`]: value
  }));

  // calculate total dynamically based on selected payment methods
  const updatedAmounts = {
    ...formData,
    [`${method}Amount`]: value
  };

  const totalPaid = selectedPaymentMethods.reduce(
    (sum, m) => sum + Number(updatedAmounts[`${m}Amount`] || 0),
    0
  );

  setRemainingAmount(totalAmount - totalPaid);
};



 const distributeRemainingAmount = (method) => {
  if (remainingAmount > 0) {
    const currentAmount = Number(formData[`${method}Amount`] || 0);
    const newAmount = currentAmount + remainingAmount;

    setFormData(prev => ({
      ...prev,
      [`${method}Amount`]: newAmount.toString()
    }));

    setRemainingAmount(0);
  }
};


 const getTotalPaid = () => {
  return selectedPaymentMethods.reduce(
    (sum, method) => sum + Number(formData[`${method}Amount`] || 0),
    0
  );
};

  

  const handleSubmit = () => {
    const payload = {
      orderId: order.OrderID,
      assignedOrderId: order.AssignedOrderID,
      status: "Complete",
      deliveryDate: formData.deliveryDate,
      remarks: formData.remarks,
      paymentSettlement: {
        cashAmount: Number(formData.cashAmount || 0),
        upiAmount: Number(formData.upiAmount || 0),
        cardAmount: Number(formData.cardAmount || 0),
        totalPaid: getTotalPaid(),
        remainingAmount: remainingAmount
      }
    };

    onSubmit(payload);
  };

  if (!isOpen || !order) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <i className="mdi mdi-check-circle"></i>
            Complete Order #{order.OrderID}
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="mdi mdi-close"></i>
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>

          {/* Order Info */}
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

          {/* Completion Form */}
          <div className={styles.completeForm}>
            <h3 className={styles.sectionTitle}>Completion Details</h3>

            <div className={styles.formGrid}>

              {/* Delivery Date */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <i className="mdi mdi-calendar-check"></i>
                  Actual Delivery Date *
                </label>
                <input
                  type="date"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleInputChange}
                  className={styles.formInput}
                />
              </div>

              {/* Payment Methods Selection */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.formLabel}>
                  <i className="mdi mdi-credit-card-multiple"></i>
                  Select Payment Methods
                </label>
                
              <div className={styles.paymentMethodsGrid}>
  {paymentModes.map((pm) => {
    const modeKey = (pm.ModeName || "").toLowerCase(); // for state tracking
    return (
      <div key={pm.PaymentModeID} className={styles.paymentMethodCheckbox}>
        <input
          type="checkbox"
          id={`payment-${pm.PaymentModeID}`}
          checked={selectedPaymentMethods.includes(modeKey)}
          onChange={() => handlePaymentMethodToggle(modeKey)}
        />
        <label htmlFor={`payment-${pm.PaymentModeID}`}>
          {/* Optional: add icons dynamically based on mode */}
          {modeKey === "cash" && <i className="mdi mdi-cash"></i>}
          {modeKey === "upi" && <i className="mdi mdi-cellphone"></i>}
          {modeKey === "card" && <i className="mdi mdi-credit-card"></i>}
          {pm.ModeName}
        </label>
      </div>
    );
  })}
</div>

              </div>

              {/* Payment Amount Inputs */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.formLabel}>
                  <i className="mdi mdi-cash-usd"></i>
                  Payment Amounts
                </label>

               <div className={styles.paymentAmountsGrid}>
  {selectedPaymentMethods.map((method) => (
    <div key={method} className={styles.paymentInputGroup}>
      <label className={styles.amountLabel}>
        {method === 'cash' && <i className="mdi mdi-cash"></i>}
        {method === 'upi' && <i className="mdi mdi-cellphone"></i>}
        {method === 'card' && <i className="mdi mdi-credit-card"></i>}
        {method.charAt(0).toUpperCase() + method.slice(1)} Amount
      </label>
      <div className={styles.amountInputWrapper}>
        <input
          type="number"
          value={formData[`${method}Amount`] || '0'}
          onChange={(e) => handlePaymentAmountChange(method, e.target.value)}
          className={styles.amountInput}
          placeholder="0"
        />
        {remainingAmount > 0 && (
          <button
            type="button"
            className={styles.addRemainingButton}
            onClick={() => distributeRemainingAmount(method)}
            title={`Add remaining ₹${remainingAmount}`}
          >
            <i className="mdi mdi-plus-circle"></i>
          </button>
        )}
      </div>
    </div>
  ))}
</div>

              </div>

              {/* Payment Summary */}
           <div className={`${styles.formGroup} ${styles.fullWidth}`}>
  <div className={styles.paymentSummary}>
    <div className={styles.summaryItem}>
      <span>Total Amount:</span>
      <span className={styles.totalAmount}>₹{totalAmount}</span>
    </div>

    {/* Individual Payment Method Breakdown */}
    {selectedPaymentMethods.map((method) => {
      const amount = Number(formData[`${method}Amount`] || 0);
      if (amount <= 0) return null;
      
      return (
        <div key={method} className={styles.summaryItem}>
          <span>
            {method === 'cash' && <i className="mdi mdi-cash" style={{marginRight: '8px'}}></i>}
            {method === 'upi' && <i className="mdi mdi-cellphone" style={{marginRight: '8px'}}></i>}
            {method === 'card' && <i className="mdi mdi-credit-card" style={{marginRight: '8px'}}></i>}
            {method.charAt(0).toUpperCase() + method.slice(1)} Paid:
          </span>
          <span className={styles.methodAmount}>₹{amount}</span>
        </div>
      );
    })}

    {/* Total Paid */}
    <div className={styles.summaryItem}>
      <span>Total Paid:</span>
      <span className={styles.paidAmount}>₹{getTotalPaid()}</span>
    </div>

    {/* Remaining Amount */}
    <div className={styles.summaryItem}>
      <span>Remaining:</span>
      <span
        className={`${styles.remainingAmount} ${
          remainingAmount > 0 ? styles.remaining : styles.fullyPaid
        }`}
      >
        ₹{remainingAmount}
      </span>
    </div>

    {remainingAmount > 0 && (
      <div className={styles.remainingHint}>
        <i className="mdi mdi-information"></i>
        Select payment methods and distribute the remaining amount
      </div>
    )}

    {/* Payment Status */}
    <div className={styles.paymentStatus}>
      <div className={`${styles.statusIndicator} ${
        remainingAmount === 0 ? styles.fullyPaid : styles.partiallyPaid
      }`}>
        <i className={`mdi mdi-${
          remainingAmount === 0 ? 'check-circle' : 'alert-circle'
        }`}></i>
        {remainingAmount === 0 ? 'Fully Paid' : 'Partially Paid'}
      </div>
    </div>
  </div>
</div>
              {/* Remarks */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.formLabel}>
                  <i className="mdi mdi-note-text"></i>
                  Completion Remarks
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  className={styles.formTextarea}
                  rows="3"
                  placeholder="Add any remarks about order completion..."
                />
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            <i className="mdi mdi-close"></i>
            Cancel
          </button>

          <button
            className={styles.completeButton}
            onClick={handleSubmit}
            disabled={remainingAmount !== 0}
          >
            <i className="mdi mdi-check-circle"></i>
            {remainingAmount === 0 ? 'Mark as Complete' : `₹${remainingAmount} Remaining`}
          </button>
        </div>

      </div>
    </div>
  );
};

export default UserCompleteOrderModal;