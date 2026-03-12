import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { dispatchToHeadoffice } from "../../features/stockSlice";
import {
  fetchProductTypes,
  fetchWeightByType,
} from "../../features/productTypeSlice";
import {
  Trash2,
  Plus,
  Truck,
  Package,
  CheckCircle,
  XCircle,
} from "lucide-react";
import styles from "./DispatchStock.module.css";
import ProductionHeader from "./ProductionHeader";

export default function DispatchStock() {
  const dispatch = useDispatch();
  const { types } = useSelector((state) => state.product);
  const { loading } = useSelector((state) => state.stock);

  const [mainInfo, setMainInfo] = useState({
    vehicle_no: "",
    driver_name: "",
    chalan_no: "",
  });

  const [itemsToDispatch, setItemsToDispatch] = useState([
    { item_name: "", quantity: "", category: "", weight: "" },
  ]);

  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    dispatch(fetchProductTypes());
  }, [dispatch]);

  const handleMainChange = (e) => {
    setMainInfo({ ...mainInfo, [e.target.name]: e.target.value });
    // Clear error for this field
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleItemChange = async (index, field, value) => {
    const updatedItems = [...itemsToDispatch];

    if (field === "item_name") {
      const selected = types.find((i) => i.ProductType === value);

      updatedItems[index].item_name = value;
      updatedItems[index].category = selected?.Category || "";

      // weight fetch from API
      if (value) {
        try {
          const result = await dispatch(fetchWeightByType(value));
          if (fetchWeightByType.fulfilled.match(result)) {
            updatedItems[index].weight = result.payload;
          }
        } catch (error) {
          console.error("Error fetching weight:", error);
        }
      }
    } else {
      updatedItems[index][field] = value;
    }

    setItemsToDispatch(updatedItems);
  };

  const addItemRow = () => {
    setItemsToDispatch([
      ...itemsToDispatch,
      { item_name: "", quantity: "", category: "", weight: "" },
    ]);

    // Scroll to new row with animation
    setTimeout(() => {
      const element = document.querySelector(`.${styles.itemRow}:last-child`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 100);
  };

  const confirmDelete = (index) => {
    setDeleteConfirm(index);
    // Auto-hide confirmation after 3 seconds
    setTimeout(() => {
      setDeleteConfirm(null);
    }, 3000);
  };

  const removeItemRow = (index) => {
    if (itemsToDispatch.length > 1) {
      // Add animation class before removal
      const row = document.querySelector(
        `.${styles.itemRow}[data-index="${index}"]`,
      );
      if (row) {
        row.classList.add(styles.deleting);

        // Wait for animation to complete before removing
        setTimeout(() => {
          setItemsToDispatch(itemsToDispatch.filter((_, i) => i !== index));
          setDeleteConfirm(null);

          // Show undo message
          const undoMsg = document.createElement("div");
          undoMsg.className = styles.undoMessage;
          undoMsg.innerHTML =
            'Item removed <button onclick="undoDelete()">Undo</button>';
          document
            .querySelector(`.${styles.dispatchCard}`)
            .appendChild(undoMsg);

          setTimeout(() => {
            undoMsg.remove();
          }, 3000);
        }, 300);
      } else {
        setItemsToDispatch(itemsToDispatch.filter((_, i) => i !== index));
        setDeleteConfirm(null);
      }
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!mainInfo.vehicle_no.trim()) {
      newErrors.vehicle_no = "Vehicle number is required";
    }
    if (!mainInfo.driver_name.trim()) {
      newErrors.driver_name = "Driver name is required";
    }
    if (!mainInfo.chalan_no.trim()) {
      newErrors.chalan_no = "Chalan number is required";
    }

    itemsToDispatch.forEach((item, index) => {
      if (!item.item_name) {
        newErrors[`item_${index}`] = "Please select an item";
      }
      if (!item.quantity || item.quantity <= 0) {
        newErrors[`quantity_${index}`] = "Valid quantity is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Show error message
      const errorBtn = document.querySelector(`.${styles.submitBtn}`);
      errorBtn.innerHTML = "❌ Please fix errors";
      errorBtn.style.background = "linear-gradient(135deg, #f43f5e, #e11d48)";

      setTimeout(() => {
        errorBtn.innerHTML = loading
          ? "Processing..."
          : "Confirm & Send Dispatch";
        errorBtn.style.background = "linear-gradient(135deg, #667eea, #764ba2)";
      }, 2000);
      return;
    }

    const payload = {
      ...mainInfo,
      items: itemsToDispatch.filter(
        (item) => item.item_name && item.quantity > 0,
      ),
    };

    const resultAction = await dispatch(dispatchToHeadoffice(payload));

    if (dispatchToHeadoffice.fulfilled.match(resultAction)) {
      // Show success message
      setSuccessMessage("Dispatch successful! 🎉");

      // Animate success
      const btn = document.querySelector(`.${styles.submitBtn}`);
      btn.innerHTML = "✓ Dispatched Successfully!";
      btn.style.background = "linear-gradient(135deg, #00b09b, #96c93d)";

      setTimeout(() => {
        btn.innerHTML = "Confirm & Send Dispatch";
        btn.style.background = "linear-gradient(135deg, #667eea, #764ba2)";
      }, 3000);

      // Reset form
      setMainInfo({ vehicle_no: "", driver_name: "", chalan_no: "" });
      setItemsToDispatch([
        { item_name: "", quantity: "", category: "", weight: "" },
      ]);
      setErrors({});

      // Hide success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  // Calculate total items and quantity
  const totalItems = itemsToDispatch.filter(
    (item) => item.item_name && item.quantity,
  ).length;
  const totalQuantity = itemsToDispatch.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0,
  );

  return (
    <>
      <ProductionHeader />
      <div className={styles.dispatchWrapper}>
        <div className={styles.dispatchCard}>
          <div className={styles.header}>
            <div className={styles.headerIconWrapper}>
              <Truck className={styles.headerIcon} />
            </div>
            <div>
              <h2>Dispatch Stock to Headoffice</h2>
              <p className={styles.subHeader}>
                Fill in the details to send stock to headquarters
              </p>
            </div>
          </div>

          {successMessage && (
            <div className={styles.successMessage}>
              <CheckCircle size={20} />
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Transport Info Section */}
            <div className={styles.sectionTitle}>
              <Package size={20} />
              <span>Transport Information</span>
            </div>

            <div className={styles.mainGrid}>
              <div className={styles.fieldGroup}>
                <label>
                  Vehicle Number <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="vehicle_no"
                  value={mainInfo.vehicle_no}
                  onChange={handleMainChange}
                  placeholder="e.g., MH 12 AB 1234"
                  className={errors.vehicle_no ? styles.errorInput : ""}
                />
                {errors.vehicle_no && (
                  <span className={styles.errorText}>{errors.vehicle_no}</span>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <label>
                  Driver Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="driver_name"
                  value={mainInfo.driver_name}
                  onChange={handleMainChange}
                  placeholder="Enter driver's full name"
                  className={errors.driver_name ? styles.errorInput : ""}
                />
                {errors.driver_name && (
                  <span className={styles.errorText}>{errors.driver_name}</span>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <label>
                  Chalan Number <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="chalan_no"
                  value={mainInfo.chalan_no}
                  onChange={handleMainChange}
                  placeholder="Enter chalan number"
                  className={errors.chalan_no ? styles.errorInput : ""}
                />
                {errors.chalan_no && (
                  <span className={styles.errorText}>{errors.chalan_no}</span>
                )}
              </div>
            </div>

            <div className={styles.divider} />

            {/* Items Section */}
            <div className={styles.sectionTitle}>
              <Package size={20} />
              <span>Items to Dispatch ({itemsToDispatch.length})</span>
            </div>

            {/* Items Header */}
            <div className={styles.itemsHeader}>
              <span>Product</span>
              <span>Quantity</span>
              <span>Weight/Unit</span>
              <span>Action</span>
            </div>

            {itemsToDispatch.map((item, index) => (
              <div key={index} className={styles.itemRow} data-index={index}>
                <div className={styles.itemField}>
                  <select
                    value={item.item_name}
                    onChange={(e) =>
                      handleItemChange(index, "item_name", e.target.value)
                    }
                    className={errors[`item_${index}`] ? styles.errorInput : ""}
                  >
                    <option value="">-- Select Product --</option>
                    {types.map((t) => (
                      <option key={t.ProductTypeId} value={t.ProductType}>
                        {t.ProductType} {t.Category === "Egg" ? "🥚" : "🐔"}
                      </option>
                    ))}
                  </select>
                  {errors[`item_${index}`] && (
                    <span className={styles.errorText}>
                      {errors[`item_${index}`]}
                    </span>
                  )}
                </div>

                <div className={styles.itemField}>
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                      }
                      className={
                        errors[`quantity_${index}`] ? styles.errorInput : ""
                      }
                    />
                  </div>
                  {errors[`quantity_${index}`] && (
                    <span className={styles.errorText}>
                      {errors[`quantity_${index}`]}
                    </span>
                  )}
                </div>

                <div className={styles.itemField}>
                  <div className={styles.weightDisplay}>
                    {item.weight ? (
                      <>
                        <span className={styles.weightValue}>
                          {item.weight}
                        </span>
                      </>
                    ) : (
                      <span className={styles.weightPlaceholder}>
                        Select item
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.itemField}>
                  {itemsToDispatch.length > 1 && (
                    <div className={styles.actionButtons}>
                      {deleteConfirm === index ? (
                        <div className={styles.confirmDelete}>
                          <span>Delete?</span>
                          <button
                            type="button"
                            className={styles.confirmYes}
                            onClick={() => removeItemRow(index)}
                            title="Confirm delete"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            className={styles.confirmNo}
                            onClick={cancelDelete}
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => confirmDelete(index)}
                          title="Remove item"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              className={styles.addBtn}
              onClick={addItemRow}
            >
              <Plus size={18} /> Add Another Item
            </button>

            {/* Summary Cards */}
            <div className={styles.summaryCards}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryIcon}>📦</div>
                <div className={styles.summaryContent}>
                  <span className={styles.summaryLabel}>Total Items</span>
                  <span className={styles.summaryValue}>{totalItems}</span>
                </div>
              </div>

              <div className={styles.summaryCard}>
                <div className={styles.summaryIcon}>⚖️</div>
                <div className={styles.summaryContent}>
                  <span className={styles.summaryLabel}>Total Quantity</span>
                  <span className={styles.summaryValue}>
                    {totalQuantity.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className={styles.summaryCard}>
                <div className={styles.summaryIcon}>🚚</div>
                <div className={styles.summaryContent}>
                  <span className={styles.summaryLabel}>Vehicle</span>
                  <span className={styles.summaryValue}>
                    {mainInfo.vehicle_no || "Not set"}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Processing...
                </>
              ) : (
                <>
                  <Truck size={18} />
                  Confirm & Send Dispatch
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
