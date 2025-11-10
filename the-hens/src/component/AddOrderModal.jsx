import React, { useState } from 'react';
import { FaTimes, FaPlus, FaCalendarAlt, FaPaperPlane } from 'react-icons/fa';
import styles from './AddOrderModal.module.css';
import { useDispatch, useSelector } from "react-redux";
import { searchCustomers  } from '../features/cutomerSlice';
import { fetchWeightByType, clearWeight, fetchProductTypes, fetchRateByProductType } from "../features/productTypeSlice";
import { useEffect } from "react";


const AddOrderModal = ({ isOpen, onClose, onAddOrder }) => {
  const [formData, setFormData] = useState({
    productName: '',
    customerName: '',
    address: '',
    area: '',
    contactNo: '',
    productType: '',
    weight: '',
    quantity: 1,
    rate: '',
    deliveryCharge: '',
    orderDate: ''
  });

  const [errors, setErrors] = useState({});
const customerSuggestions = useSelector((state) => state.customer.customerSuggestions);

const dispatch = useDispatch();
const productTypes = useSelector((state) => state.product.types || []);

console.log('fetch product',productTypes)

const weightOptions = useSelector((state) => state.product.weight || []);
console.log(weightOptions,"weight")

const productWeight = useSelector((state) => state.product.weight);
const productLoading = useSelector((state) => state.product.loading);
const productError = useSelector((state) => state.product.error);
 



const handleProductTypeChange = (e) => {
  const { value } = e.target;
  setFormData((prev) => ({
    ...prev,
    productType: value,
  }));

  try{
  if (value) {
    dispatch(fetchWeightByType(value));
    dispatch(fetchRateByProductType(value)) // ✅ fetch weight automatically
  } else {
    dispatch(clearWeight());
  }}
  catch(e) {
    console.log('getting error in productType',e)
  }
};

useEffect(() => {
  if (productWeight) {
    setFormData((prev) => ({
      ...prev,
      weight: productWeight,
    }));
  }
}, [productWeight]);

 useEffect(() => {
  dispatch(fetchProductTypes());
}, [dispatch]);


const baseRate = useSelector((state) => state.product.rate || 0);

console.log(baseRate,"rate")

useEffect(() => {
  if (baseRate) {
    setFormData((prev) => ({
      ...prev,
      rate: baseRate,
    }));
  }
}, [baseRate]);


 

const handleChange = (e) => {
  const { name, value } = e.target;

  setFormData(prev => {
    let updated = { ...prev, [name]: value };

    // 👇 Auto update rate if quantity changes and baseRate exists
    if (name === "quantity" && baseRate) {
      updated.rate = (Number(baseRate) * Number(value || 0)).toFixed(2);
    }

    return updated;
  });

  if (errors[name]) {
    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  }
};

  const handleCustomerNameChange = (e) => {
  const name = e.target.value;
  console.log('typing',name)
  if (name.length > 2) {
    dispatch(searchCustomers(name)); 
    // auto fetch from backend
    
  }
};

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.productName.trim()) {
      newErrors.productName = 'Product name is required';
    }
    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!formData.area.trim()) {
      newErrors.area = 'Area is required';
    }
    if (!formData.contactNo.trim()) {
      newErrors.contactNo = 'Contact number is required';
    }
    if (!formData.productType) {
      newErrors.productType = 'Product type is required';
    }
    if (!formData.weight) {
      newErrors.weight = 'Weight is required';
    }
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Valid quantity is required';
    }
    if (!formData.rate || formData.rate <= 0) {
      newErrors.rate = 'Valid rate is required';
    }
    if (!formData.deliveryCharge) {
      newErrors.deliveryCharge = 'Delivery charge is required';
    }
    if (!formData.orderDate) {
      newErrors.orderDate = 'Order date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onAddOrder(formData);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      productName: '',
      customerName: '',
      address: '',
      area: '',
      contactNo: '',
      productType: '',
      weight: '',
      quantity: '',
      rate: '',
      deliveryCharge: '',
      orderDate: ''
    });
    setErrors({});
    onClose();
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  if (!isOpen) return null;
  



  
console.log("customerSuggestions from Redux:", customerSuggestions);





  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <FaPlus className={styles.modalTitleIcon} />
            Add New Order
          </h2>
          <button className={styles.closeButton} onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              {/* Product Name */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Product Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  placeholder="Enter product name"
                  className={styles.inputField}
                />
                {errors.productName && <span className={styles.error}>{errors.productName}</span>}
              </div>

              {/* Customer Name */}
                      <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>
                        Customer Name <span className={styles.required}>*</span>
                      </label>

                      <input
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={(e) => {
                          handleChange(e);             // update local form state
                          handleCustomerNameChange(e); // auto fetch from backend
                        }}
                        placeholder="Enter customer name"
                        className={styles.inputField}
                      />

                      {/* ✅ Suggestions list just below input */}
                    {customerSuggestions && customerSuggestions.length > 0 && (
                      <>
                        <p>Matching Records -: {customerSuggestions.length}</p>
                      <ul className={styles.suggestionList}>
                        {customerSuggestions.map((cust) => (
                          <li
                            key={cust.CustomerId}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                customerName: cust.CustomerName,
                                contactNo: cust.Contact_No,
                                address: cust.Address,
                                area: cust.Area,
                                pincode: cust.Pincode || '',
                                alternatePhone: cust.Alternate_Phone || ''
                              });
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

              {/* Address */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Address <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter full address"
                  className={styles.inputField}
                />
                {errors.address && <span className={styles.error}>{errors.address}</span>}
              </div>

              {/* Area */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Area <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="Enter area/location"
                  className={styles.inputField}
                />
                {errors.area && <span className={styles.error}>{errors.area}</span>}
              </div>

              {/* Contact No */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Contact No <span className={styles.required}>*</span>
                </label>
                <input
                  type="tel"
                  name="contactNo"
                  value={formData.contactNo}
                  onChange={handleChange}
                  placeholder="Enter contact number"
                  className={styles.inputField}
                />
                {errors.contactNo && <span className={styles.error}>{errors.contactNo}</span>}
              </div>

              {/* Product Type */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Product Type <span className={styles.required}>*</span>
                </label>
                <select
                      name="productType"
                    value={formData.productType}
                    onChange={handleProductTypeChange}
                    className={styles.selectField}
                      >
                    <option value="">Select product type</option>
                    {productTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>

              {productLoading && <p>Loading weight...</p>}
              {productError && <p style={{ color: "red" }}>{productError}</p>}

                {errors.productType && <span className={styles.error}>{errors.productType}</span>}
              </div>

              {/* Weight */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Weight <span className={styles.required}>*</span>
                </label>
                <select
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className={styles.selectField}
                >
                  <option value="">Select weight</option>
                  {weightOptions.map(weight => (
                    <option key={weight} value={weight}>{weight}</option>
                  ))}
                </select>
                {errors.weight && <span className={styles.error}>{errors.weight}</span>}
              </div>

              {/* Quantity */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Quantity <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="Enter quantity"
                  min="1"
                  className={styles.inputField}
                />
                {errors.quantity && <span className={styles.error}>{errors.quantity}</span>}
              </div>

              {/* Rate */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Rate (rs) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  name="rate"
                  value={formData.rate}
                  onChange={handleChange}
                  placeholder="Enter rate per unit"
                  min="0"
                  step="0.01"
                  className={styles.inputField}
                />
                {errors.rate && <span className={styles.error}>{errors.rate}</span>}
              </div>

              {/* Delivery Charge */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Delivery Charge (rs) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  name="deliveryCharge"
                  value={formData.deliveryCharge}
                  onChange={handleChange}
                  placeholder="Enter delivery charge"
                  min="0"
                  step="0.01"
                  className={styles.inputField}
                   
                />
                {errors.deliveryCharge && <span className={styles.error}>{errors.deliveryCharge}</span>}
              </div>

              {/* Order Date */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Order Date <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  name="orderDate"
                  value={formData.orderDate}
                  onChange={handleChange}
                  max={getTodayDate()}
                  className={styles.inputField}
                />
                {errors.orderDate && <span className={styles.error}>{errors.orderDate}</span>}
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={handleClose}>
            <FaTimes />
            Cancel
          </button>
          <button className={styles.submitButton} onClick={handleSubmit}>
            <FaPaperPlane />
            Create Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddOrderModal;