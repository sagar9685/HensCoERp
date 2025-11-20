import React, { useState, useEffect } from 'react';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../AddOrderModal.module.css';
import { fetchWeightByType, clearWeight, fetchProductTypes, fetchRateByProductType } from "../../features/productTypeSlice";
import { addOrder } from '../../features/orderSlice';
import { toast } from 'react-toastify';
import CustomerSearch from './CustomerSearch';

const OrderForm = ({ onClose }) => {
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

  const dispatch = useDispatch();
  const productTypes = useSelector((state) => state.product.types || []);
  const weightOptions = useSelector((state) => state.product.weight || []);
  const productWeight = useSelector((state) => state.product.weight);
  const productLoading = useSelector((state) => state.product.loading);
  const productError = useSelector((state) => state.product.error);
  const baseRate = useSelector((state) => state.product.rate || 0);

  // Fetch product types on component mount
  useEffect(() => {
    dispatch(fetchProductTypes());
  }, [dispatch]);

  // Update weight when productWeight changes
  useEffect(() => {
    if (productWeight) {
      setFormData(prev => ({
        ...prev,
        weight: productWeight,
      }));
    }
  }, [productWeight]);

  // Update rate when baseRate changes
  useEffect(() => {
    if (baseRate) {
      setFormData(prev => ({
        ...prev,
        rate: baseRate,
      }));
    }
  }, [baseRate]);

  const handleProductTypeChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      productType: value,
    }));

    try {
      if (value) {
        dispatch(fetchWeightByType(value));
        dispatch(fetchRateByProductType(value));
      } else {
        dispatch(clearWeight());
      }
    } catch (e) {
      console.log('getting error in productType', e);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => {
      let updated = { ...prev, [name]: value };

      // Auto update rate if quantity changes and baseRate exists
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      const formattedData = {
        ProductName: formData.productName,
        CustomerName: formData.customerName,
        Address: formData.address,
        Area: formData.area,
        ContactNo: formData.contactNo,
        ProductType: formData.productType,
        Weight: Array.isArray(formData.weight) ? formData.weight[0] : formData.weight,
        Quantity: Number(formData.quantity),
        Rate: Number(formData.rate),
        DeliveryCharge: Number(formData.deliveryCharge),
        OrderDate: formData.orderDate
      };

      try {
        await dispatch(addOrder(formattedData)).unwrap();
        toast.success('Order added successfully! 🎉');
        handleClose();
      } catch (e) {
        toast.error("Failed to add Order 😞");
        console.log("Add order error", e);
      }
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

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.formGrid}>
        {/* Product Name */}
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>
            Product Name <span className={styles.required}>*</span>
          </label>
          <select
            name="productName"
            value={formData.productName}
            onChange={handleChange}
            className={styles.inputField}
          >
            <option value="">Select product</option>
            <option value="Chicken">Chicken</option>
            <option value="Egg">Egg</option>
          </select>
          {errors.productName && (
            <span className={styles.error}>{errors.productName}</span>
          )}
        </div>

        {/* Customer Search Component */}
        <CustomerSearch 
          formData={formData} 
          setFormData={setFormData} 
          errors={errors} 
        />

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

      {/* Modal Footer */}
      <div className={styles.modalFooter}>
        <button className={styles.cancelButton} onClick={handleClose} type="button">
          <FaTimes />
          Cancel
        </button>
        <button className={styles.submitButton} type="submit">
          <FaPaperPlane />
          Create Order
        </button>
      </div>
    </form>
  );
};

export default OrderForm;