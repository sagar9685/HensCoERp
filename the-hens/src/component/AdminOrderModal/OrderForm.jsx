import React, { useState, useEffect } from 'react';
import { FaTimes, FaPaperPlane, FaPlus, FaTrashAlt, FaEdit, FaShoppingCart } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../AddOrderModal.module.css';
import { 
  fetchWeightByType, 
  fetchProductTypes, 
  fetchRateByProductType 
} from "../../features/productTypeSlice";
import { addOrder, fetchOrderTakenBy } from '../../features/orderSlice';
import { toast } from 'react-toastify';
import CustomerSearch from './CustomerSearch';
import OrderFormModal from './OrderFormModal';
import OrderItemsSection from './OrderItemsSection';

  import { fetchStock } from '../../features/stockSlice';

// Define the initial state for a single item
const initialItemState = {
  productName: '',
  productType: '',
  weight: '',
  quantity: 1,
  rate: '',
};

const OrderForm = ({ onClose }) => {
  // Main form data for customer/order header
  const [formData, setFormData] = useState({
    customerName: '',
    address: '',
    area: '',
    contactNo: '',
    deliveryCharge: '',
    orderDate: '',
     orderTakenBy: '' ,
     
  });

  // State to handle multiple order items
  const [orderItems, setOrderItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(initialItemState);
  const [editingIndex, setEditingIndex] = useState(null);

  const dispatch = useDispatch();
  const productTypes = useSelector((state) => state.product.types || []);
  const [fetchedData, setFetchedData] = useState({});
  const [isSubmitting,setIsSubmitting] = useState(false);
  
 
    const takenByList = useSelector((state) => state.order.takenByList);
    console.log(takenByList,"taken order list name")

    useEffect(() => {
      dispatch(fetchOrderTakenBy());
    }, [dispatch]);
      

  // Fetch product types on component mount
  useEffect(() => {
    dispatch(fetchProductTypes());
    setFormData(prev => ({
        ...prev,
        orderDate: getTodayDate()
    }));
  }, [dispatch]);

  // --- Item Modal Functions ---
  const openItemModal = (item = initialItemState, index = null) => {
    setCurrentItem(item);
    setEditingIndex(index);
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    setCurrentItem(initialItemState);
    setEditingIndex(null);
    setIsItemModalOpen(false);
    setErrors({});
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({ ...prev, [name]: value }));
  };

  const handleProductTypeChange = async (e) => {
    const value = e.target.value;
    
    setCurrentItem(prev => ({ ...prev, productType: value }));

    if (value) {
      if (fetchedData[value]) {
        const { weight, rate } = fetchedData[value];
        // const quantity = Number(currentItem.quantity || 1);
        setCurrentItem(prev => ({ 
          ...prev, 
          weight: weight, 
       rate: (Number(rate))
        
        }));
        return;
      }

      try {
        const weightAction = await dispatch(fetchWeightByType(value)).unwrap();
        const rateAction = await dispatch(fetchRateByProductType(value)).unwrap();

        const fetchedWeight = Array.isArray(weightAction) ? weightAction[0] : weightAction;
        const fetchedRate = Number(rateAction || 0);
        
        setFetchedData(prev => ({
          ...prev,
          [value]: { weight: fetchedWeight, rate: fetchedRate }
        }));

        const quantity = Number(currentItem.quantity || 1);
        setCurrentItem(prev => ({ 
          ...prev, 
          weight: fetchedWeight, 
          rate: (fetchedRate * quantity).toFixed(2)
        }));

      } catch (e) {
        toast.error(`Error fetching data for ${value}`);
        console.error('Error fetching product data:', e);
      }
    } else {
      setCurrentItem(prev => ({ ...prev, weight: '', rate: '' }));
    }
  };

  // const saveItem = () => {
  //   // Validate item
  //   const itemErrors = {};
  //   if (!currentItem.productName.trim()) itemErrors.productName = 'Product name is required';
  //   if (!currentItem.productType) itemErrors.productType = 'Product type is required';
  //   if (!currentItem.quantity || Number(currentItem.quantity) <= 0) itemErrors.quantity = 'Valid quantity is required';
  //   if (!currentItem.rate || Number(currentItem.rate) <= 0) itemErrors.rate = 'Valid rate is required';

  //   if (Object.keys(itemErrors).length > 0) {
  //     setErrors(itemErrors);
  //     return;
  //   }

  //   if (editingIndex !== null) {
  //     // Update existing item
  //     setOrderItems(prev => prev.map((item, index) => 
  //       index === editingIndex ? currentItem : item
  //     ));
  //     toast.success('Item updated successfully!');
  //   } else {
  //     // Add new item
  //     setOrderItems(prev => [...prev, currentItem]);
  //     toast.success('Item added successfully!');
  //   }
    
  //   closeItemModal();
  // };

const saveItem = () => {
  const itemErrors = {};
  if (!currentItem.productName.trim()) itemErrors.productName = 'Product name is required';
  if (!currentItem.productType) itemErrors.productType = 'Product type is required';
  if (!currentItem.quantity || Number(currentItem.quantity) <= 0) itemErrors.quantity = 'Valid quantity is required';
  if (!currentItem.rate || Number(currentItem.rate) <= 0) itemErrors.rate = 'Valid rate is required';

  if (Object.keys(itemErrors).length > 0) {
    setErrors(itemErrors);
    return;
  }

  // ✅ Sum total stock for this product + weight
  const totalStock = stockList
    ?.filter(s => s.item_name === currentItem.productType && s.weight === currentItem.weight)
    .reduce((sum, s) => sum + Number(s.quantity), 0) || 0;

  // ✅ Subtract already added in this order
  const alreadyAddedQty = orderItems
    .filter(i => i.productType === currentItem.productType && i.weight === currentItem.weight)
    .reduce((sum, i) => sum + Number(i.quantity), 0);

  const availableQty = totalStock - alreadyAddedQty;

  // Check stock
  if (availableQty <= 0) {
    toast.error(`Item "${currentItem.productType}" is out of stock!`);
    return; // don’t auto-fill, just show error
  }

  // Add item with requested quantity (do not auto-fill)
  if (Number(currentItem.quantity) > availableQty) {
    toast.error(`Only ${availableQty} available for "${currentItem.productType}"!`);
    return;
  }

  // ✅ Add or update item in order
  if (editingIndex !== null) {
    setOrderItems(prev =>
      prev.map((item, index) =>
        index === editingIndex ? { ...currentItem } : item
      )
    );
    toast.success('Item updated successfully!');
  } else {
    setOrderItems(prev => [...prev, { ...currentItem }]);
    toast.success('Item added successfully!');
  }

  closeItemModal();
};



useEffect(() => {
  dispatch(fetchStock()); // fetch stock on mount
}, [dispatch]);

const stockList = useSelector(state => state.stock.items);
console.log(stockList, "stovk");



 
  


  const removeItem = (index) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
    toast.success('Item removed successfully!');
  };

  // --- Main Form Functions ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate main form data
    if (!formData.customerName.trim()) newErrors.customerName = 'Customer name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.area.trim()) newErrors.area = 'Area is required';
    if (!formData.contactNo.trim()) newErrors.contactNo = 'Contact number is required';
    if (!formData.deliveryCharge || Number(formData.deliveryCharge) < 0) newErrors.deliveryCharge = 'Valid delivery charge is required';
    if (!formData.orderDate) newErrors.orderDate = 'Order date is required';
    
    // Validate order items
    if (orderItems.length === 0) {
      newErrors.orderItems = 'At least one order item is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      const formattedItems = orderItems.map(item => ({
        ProductName: item.productName,
        ProductType: item.productType,
        Weight: Array.isArray(item.weight) ? item.weight[0] : item.weight,
        Quantity: Number(item.quantity),
        Rate: Number(item.rate),
      }));

      const orderData = {
        CustomerName: formData.customerName,
        Address: formData.address,
        Area: formData.area,
        ContactNo: formData.contactNo,
        DeliveryCharge: Number(formData.deliveryCharge),
        OrderDate: formData.orderDate,
          OrderTakenBy: formData.orderTakenBy, 
        Items: formattedItems
      };

      try {
         setIsSubmitting(true)
        await dispatch(addOrder(orderData)).unwrap();
        toast.success('Order added successfully! 🎉');
       
        handleClose();
      } catch (e) {
        toast.error("Failed to add Order 😞");
        console.error("Add order error", e);
       
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
      deliveryCharge: '',
      orderDate: getTodayDate()
    });
    setOrderItems([]);
    setErrors({});
    onClose();
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };
  
const getTotalAmount = () => {
  const itemsTotal = orderItems.reduce((total, item) => {
    return total + (Number(item.rate) * Number(item.quantity));
  }, 0);

  const delivery = Number(formData.deliveryCharge) || 0;

  return itemsTotal + delivery;  // Delivery sirf ek baar add
};



  return (
    <>
      <form onSubmit={handleSubmit}>
        
        {/* Customer and Order Header Details */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaShoppingCart />
            Customer Details
          </h3>
          <div className={styles.formGrid}>
            
            <CustomerSearch 
              formData={formData} 
              setFormData={setFormData} 
              errors={errors} 
            />

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Address <span className={styles.required}>*</span></label>
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

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Area <span className={styles.required}>*</span></label>
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

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Contact No <span className={styles.required}>*</span></label>
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
            
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Delivery Charge (rs) <span className={styles.required}>*</span></label>
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

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Order Date <span className={styles.required}>*</span></label>
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

            <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>
              Order Taken By <span className={styles.required}>*</span>
            </label>
                  <select
              name="orderTakenBy"
              value={formData.orderTakenBy}
              onChange={handleChange}
              className={styles.inputField}
            >
              <option value="">Select Name</option>

              {Array.isArray(takenByList) &&
                takenByList.map((d, idx) => (
                  <option key={idx} value={d.Name || d.name}>
                    {d.Name || d.name}
                  </option>
                ))}
            </select>


            {errors.orderTakenBy && <span className={styles.error}>{errors.orderTakenBy}</span>}
          </div>

            
          </div>
        </section>

        <hr />

        {/* Order Items Section */}
        <OrderItemsSection
          orderItems={orderItems}
          errors={errors}
          openItemModal={openItemModal}
          removeItem={removeItem}
          getTotalAmount={getTotalAmount}
        />

        <hr />

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <div className={styles.footerInfo}>
            <span className={styles.itemsCount}>
              {orderItems.length} item{orderItems.length !== 1 ? 's' : ''} added
            </span>
            <span className={styles.totalAmount}>
              Total: ₹{getTotalAmount().toFixed(2)}
            </span>
          </div>
          <div className={styles.footerActions}>
            <button className={styles.cancelButton} onClick={handleClose} type="button">
              <FaTimes />
              Cancel
            </button>
            <button className={styles.submitButton} type="submit" disabled={orderItems.length === 0 || isSubmitting}>
               {isSubmitting ? "Processing..." : (
                  <>
                    <FaPaperPlane /> Create Order
                  </>
                )}
             
            </button>
          </div>
        </div>
      </form>

      {/* Item Modal */}
      <OrderFormModal
        isItemModalOpen={isItemModalOpen}
        closeItemModal={closeItemModal}
        currentItem={currentItem}
        editingIndex={editingIndex}
        handleItemChange={handleItemChange}
        handleProductTypeChange={handleProductTypeChange}
        productTypes={productTypes}
        errors={errors}
        saveItem={saveItem}
      />
    </>
  );
};

export default OrderForm;