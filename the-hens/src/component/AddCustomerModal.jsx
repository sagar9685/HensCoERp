import React, { useEffect, useState } from 'react';
import { FaTimes, FaUserPlus, FaUser, FaPaperPlane, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import styles from './AddCustomerModal.module.css';
import { useDispatch, useSelector } from 'react-redux'
import { addCustomerData, fetchArea } from '../features/cutomerSlice';
import { toast } from "react-toastify";
 

const AddCustomerModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    address: '',
    area: '',
    contactNo: '',
    alternatePhone: '',
    pincode: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const areaTypes = useSelector((state)=>state.customer.areaData);
  console.log(areaTypes,"area")

  const dispatch = useDispatch();

  useEffect(()=> {
    dispatch(fetchArea());
  },[dispatch])


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
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
    } else if (!/^\d{10}$/.test(formData.contactNo.replace(/\D/g, ''))) {
      newErrors.contactNo = 'Contact number must be 10 digits';
    }
    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Pincode must be 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (validateForm()) {
    const formattedData = {
      CustomerName: formData.customerName,
      Contact_No: formData.contactNo,
      Alternate_Phone: formData.alternatePhone,
      Area: formData.area,
      Pincode: formData.pincode,
      Address: formData.address,
    };

     try {
      setIsSubmitting(true);
      await dispatch(addCustomerData(formattedData)).unwrap();
      toast.success("Customer added successfully! 🎉");
      handleClose();
    } catch (error) {
      toast.error("Failed to add customer 😞");
      console.error("Add customer error:", error);
    }finally {
      setIsSubmitting(false)
    }
  }
};


  const handleClose = () => {
    setFormData({
      customerName: '',
      address: '',
      area: '',
      contactNo: '',
      alternatePhone: '',
      pincode: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;


  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <FaUserPlus className={styles.modalTitleIcon} />
            Add New Customer
          </h2>
          <button className={styles.closeButton} onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              {/* Customer Name */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Customer Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="Enter customer name"
                  className={styles.inputField}
                />
                {errors.customerName && <span className={styles.error}>{errors.customerName}</span>}
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

              {/* Alternate Phone */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  name="alternatePhone"
                  value={formData.alternatePhone}
                  onChange={handleChange}
                  placeholder="Enter alternate phone"
                  className={styles.inputField}
                />
              </div>

              {/* Area */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Area <span className={styles.required}>*</span>
                </label>
                <select
                
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="Enter area/location"
                  className={styles.inputField}
                >
                  <option value=''> select area</option>
                  {Array.isArray(areaTypes) && areaTypes.length > 0 ? (
  areaTypes.map((item) => (
    <option key={item.areaId} value={item.areaName}>
      {item.areaName}
    </option>
  ))
) : (
  <option disabled>Loading areas...</option>
)}


                  </select>
                {errors.area && <span className={styles.error}>{errors.area}</span>}
              </div>

              {/* Pincode */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Pincode <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="Enter pincode"
                  maxLength="6"
                  className={styles.inputField}
                />
                {errors.pincode && <span className={styles.error}>{errors.pincode}</span>}
              </div>

              {/* Address */}
              <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                <label className={styles.inputLabel}>
                  Address <span className={styles.required}>*</span>
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter full address"
                  className={styles.textareaField}
                  rows="3"
                />
                {errors.address && <span className={styles.error}>{errors.address}</span>}
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
          <button className={styles.submitButton} onClick={handleSubmit} disabled={isSubmitting}
          >
            {
              isSubmitting ? (<>Processing...</>) : ( <>
                <FaUser />
            Add Customer
              </>
            )}
          
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCustomerModal;
