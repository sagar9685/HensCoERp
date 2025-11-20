 
import { useDispatch, useSelector } from 'react-redux';
import { searchCustomers } from '../../features/cutomerSlice';
import styles from '../AddOrderModal.module.css';

const CustomerSearch = ({ formData, setFormData, errors }) => {
  const dispatch = useDispatch();
  const customerSuggestions = useSelector((state) => state.customer.customerSuggestions);

  const handleCustomerNameChange = (e) => {
    const name = e.target.value;
    
    // Update local form state
    setFormData(prev => ({
      ...prev,
      customerName: name
    }));

    // Auto fetch from backend
    if (name.length > 2) {
      dispatch(searchCustomers(name));
    }
  };

  return (
    <div className={styles.inputGroup}>
      <label className={styles.inputLabel}>
        Customer Name <span className={styles.required}>*</span>
      </label>

      <input
        type="text"
        name="customerName"
        value={formData.customerName}
        onChange={handleCustomerNameChange}
        placeholder="Enter customer name"
        className={styles.inputField}
      />

      {/* Suggestions list just below input */}
      {customerSuggestions && customerSuggestions.length > 0 && (
        <>
          <p>Matching Records -: {customerSuggestions.length}</p>
          <ul className={styles.suggestionList}>
            {customerSuggestions.map((cust) => (
              <li
                key={cust.CustomerId}
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    customerName: cust.CustomerName,
                    contactNo: cust.Contact_No,
                    address: cust.Address,
                    area: cust.Area,
                    pincode: cust.Pincode || '',
                    alternatePhone: cust.Alternate_Phone || ''
                  }));
                }}
              >
                <span className={styles.customerName}>Name-:{cust.CustomerName}</span>
                <span className={styles.customerDetails}>
                  Address-: {cust.Address},Areas-:{cust.Area}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {errors.customerName && (
        <span className={styles.error}>{errors.customerName}</span>
      )}
    </div>
  );
};

export default CustomerSearch;