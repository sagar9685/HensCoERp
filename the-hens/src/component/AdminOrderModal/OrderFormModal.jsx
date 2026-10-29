import React, { useEffect, useMemo, useState } from "react";
import {
  FaTimes,
  FaEgg,
  FaDrumstickBite,
  FaCheckCircle,
  FaShoppingCart,
  FaSpinner,
} from "react-icons/fa";

import styles from "./OrderFormModal.module.css";

const getProductKey = (product) =>
  `${product.Category}::${product.ProductTypeId ?? product.ProductType}`;

const getCategory = (product) => String(product.Category || "").trim();

const OrderFormModal = ({
  isItemModalOpen,
  closeItemModal,
  currentItem = {},
  editingIndex = null,
  handleItemChange,
  handleProductTypeChange,
  productTypes = [],
  productDetails = {},
  isLoadingProducts = false,
  errors = {},
  saveItem,
  onSaveItems,
}) => {
  const [entries, setEntries] = useState({});
  const [editedRates, setEditedRates] = useState({});
  const [bulkError, setBulkError] = useState("");

  const isEditing = editingIndex !== null;

  // ============================================
  // CATEGORY-WISE GROUPING
  // ============================================

  const categories = useMemo(() => {
    const grouped = {
      Egg: [],
      Chicken: [],
    };

    productTypes.forEach((product) => {
      const rawCategory = getCategory(product);

      if (!rawCategory) return;

      const category =
        rawCategory.toLowerCase() === "egg"
          ? "Egg"
          : rawCategory.toLowerCase() === "chicken"
            ? "Chicken"
            : rawCategory;

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push(product);
    });

    return Object.entries(grouped).filter(
      ([, products]) => products.length > 0,
    );
  }, [productTypes]);

  // ============================================
  // RESET QUANTITIES ON OPEN
  // ============================================

  useEffect(() => {
    if (isItemModalOpen && !isEditing) {
      setEntries({});
      setEditedRates({});
      setBulkError("");
    }
  }, [isItemModalOpen, isEditing]);

  // ============================================
  // UPDATE QUANTITY
  // ============================================

  const updateQuantity = (product, value) => {
    if (value !== "") {
      const numberValue = Number(value);

      if (!Number.isInteger(numberValue) || numberValue < 0) {
        return;
      }
    }

    const key = getProductKey(product);

    setEntries((previous) => ({
      ...previous,
      [key]: value,
    }));

    setBulkError("");
  };

  const updateRate = (product, value) => {
    if (value !== "") {
      const numericRate = Number(value);

      if (!Number.isFinite(numericRate) || numericRate < 0) {
        return;
      }
    }

    const key = getProductKey(product);

    setEditedRates((previous) => ({
      ...previous,
      [key]: value,
    }));

    setBulkError("");
  };

  // ============================================
  // SELECTED PRODUCTS
  // ============================================

  const selectedProducts = useMemo(() => {
    return productTypes
      .map((product) => {
        const key = getProductKey(product);
        const quantity = Number(entries[key] || 0);

        if (!Number.isInteger(quantity) || quantity <= 0) {
          return null;
        }

        const details = productDetails[product.ProductType];

        const rawRate =
          editedRates[key] !== undefined ? editedRates[key] : details?.rate;

        const rate = Number(rawRate);

        const isValid =
          details?.status === "success" &&
          rawRate !== "" &&
          rawRate !== null &&
          rawRate !== undefined &&
          Number.isFinite(rate) &&
          rate >= 0;

        return {
          productName: getCategory(product),
          productType: product.ProductType,
          weight: details?.weight ?? "",
          quantity,
          rate: isValid ? rate : null,
          isValid,
        };
      })
      .filter(Boolean);
  }, [productTypes, productDetails, entries, editedRates]);

  const selectedCount = selectedProducts.length;

  const hasInvalidProducts = selectedProducts.some(
    (product) => !product.isValid,
  );

  const selectedItems = selectedProducts
    .filter((product) => product.isValid)
    .map(({ isValid, ...item }) => item);

  // ============================================
  // TOTAL AMOUNT
  // ============================================

  const totalAmount = selectedItems.reduce(
    (total, item) => total + item.quantity * item.rate,
    0,
  );

  // ============================================
  // BULK SAVE
  // ============================================

  const handleBulkSave = () => {
    if (selectedCount === 0) {
      setBulkError("Please enter quantity for at least one product.");
      return;
    }

    if (isLoadingProducts) {
      setBulkError("Product details are still loading.");
      return;
    }

    if (hasInvalidProducts) {
      setBulkError(
        "Weight/Rate details could not be loaded for some selected products. Please close and reopen the item modal to retry.",
      );
      return;
    }

    if (typeof onSaveItems !== "function") {
      setBulkError("Bulk save function is missing.");
      return;
    }

    onSaveItems(selectedItems);
  };

  // ============================================
  // EDIT TOTAL
  // ============================================

  const editTotal =
    Number(currentItem.quantity || 0) * Number(currentItem.rate || 0);

  if (!isItemModalOpen) return null;

  return (
    <div className={styles.overlay}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Edit Order Item" : "Add Order Items"}
      >
        {/* HEADER */}

        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>
              <FaShoppingCart />
            </div>

            <div>
              <h2 className={styles.modalTitle}>
                {isEditing ? "Edit Order Item" : "Add Order Items"}
              </h2>

              <p className={styles.modalSubtitle}>
                {isEditing
                  ? "Update selected product details"
                  : "Enter quantities for required products"}
              </p>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={closeItemModal}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* BODY */}

        <div className={styles.body}>
          {isEditing ? (
            // ============================================
            // EDIT ITEM MODE
            // ============================================

            <div className={styles.editForm}>
              <div className={styles.formGroup}>
                <label>Product Name *</label>

                <select
                  name="productName"
                  value={currentItem.productName || ""}
                  onChange={handleItemChange}
                  className={styles.selectInput}
                >
                  <option value="">Select Product</option>

                  {[
                    ...new Set(productTypes.map(getCategory).filter(Boolean)),
                  ].map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                {errors.productName && (
                  <span className={styles.error}>{errors.productName}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>Product Type *</label>

                <select
                  name="productType"
                  value={currentItem.productType || ""}
                  onChange={handleProductTypeChange}
                  className={styles.selectInput}
                >
                  <option value="">Select Product Type</option>

                  {productTypes
                    .filter(
                      (product) =>
                        getCategory(product).toLowerCase() ===
                        String(currentItem.productName || "")
                          .trim()
                          .toLowerCase(),
                    )
                    .map((product) => (
                      <option
                        key={getProductKey(product)}
                        value={product.ProductType}
                      >
                        {product.ProductType}
                      </option>
                    ))}
                </select>

                {errors.productType && (
                  <span className={styles.error}>{errors.productType}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>Weight (kg/pc)</label>

                <input
                  type="text"
                  value={currentItem.weight ?? ""}
                  readOnly
                  className={`${styles.textInput} ${styles.readOnlyInput}`}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Quantity *</label>

                <input
                  type="number"
                  name="quantity"
                  min="1"
                  step="1"
                  value={currentItem.quantity ?? ""}
                  onChange={handleItemChange}
                  className={styles.textInput}
                  placeholder="Enter Quantity"
                />

                {errors.quantity && (
                  <span className={styles.error}>{errors.quantity}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>Rate (₹)</label>

                <input
                  type="number"
                  name="rate"
                  min="0"
                  step="0.01"
                  value={currentItem.rate ?? ""}
                  onChange={handleItemChange}
                  onWheel={(event) => event.currentTarget.blur()}
                  className={styles.textInput}
                  placeholder="Enter Rate"
                />

                {errors.rate && (
                  <span className={styles.error}>{errors.rate}</span>
                )}
              </div>

              <div className={styles.editTotal}>
                <span>Total Amount</span>

                <strong>₹{editTotal.toFixed(2)}</strong>
              </div>
            </div>
          ) : (
            // ============================================
            // BULK ADD MODE
            // ============================================

            <>
              {isLoadingProducts && (
                <div className={styles.loadingBanner}>
                  <FaSpinner className={styles.spinner} />
                  Loading product Weight and Rate...
                </div>
              )}

              {categories.length === 0 ? (
                <div className={styles.emptyState}>No products available.</div>
              ) : (
                categories.map(([category, products]) => (
                  <div key={category} className={styles.categoryCard}>
                    {/* CATEGORY HEADER */}

                    <div className={styles.categoryHeader}>
                      <div className={styles.categoryTitle}>
                        <div className={styles.categoryIcon}>
                          {category.toLowerCase() === "egg" ? (
                            <FaEgg />
                          ) : (
                            <FaDrumstickBite />
                          )}
                        </div>

                        <div>
                          <h3>{category}</h3>
                          <p>Enter quantity for required items</p>
                        </div>
                      </div>

                      <span className={styles.productCount}>
                        {products.length} Products
                      </span>
                    </div>

                    {/* PRODUCTS TABLE */}

                    <div className={styles.tableScroll}>
                      <table className={styles.productTable}>
                        <thead>
                          <tr>
                            <th>Product Type</th>
                            <th>Weight</th>
                            <th>Quantity</th>
                            <th>Rate (₹)</th>
                            <th>Total (₹)</th>
                          </tr>
                        </thead>

                        <tbody>
                          {products.map((product) => {
                            const key = getProductKey(product);

                            const details = productDetails[product.ProductType];

                            const quantity = Number(entries[key] || 0);

                            const hasDetails = details?.status === "success";

                            const displayedRate =
                              editedRates[key] !== undefined
                                ? editedRates[key]
                                : hasDetails
                                  ? details.rate
                                  : "";

                            const rate = Number(displayedRate || 0);

                            const weight = hasDetails ? details.weight : "";

                            const total = quantity * rate;

                            const isSelected = quantity > 0;

                            return (
                              <tr
                                key={key}
                                className={isSelected ? styles.selectedRow : ""}
                              >
                                {/* PRODUCT TYPE */}

                                <td className={styles.productName}>
                                  <div className={styles.productNameContent}>
                                    {isSelected && (
                                      <FaCheckCircle
                                        className={styles.selectedIcon}
                                      />
                                    )}

                                    <span>{product.ProductType}</span>
                                  </div>
                                </td>

                                {/* AUTO WEIGHT */}

                                <td>
                                  <input
                                    type="text"
                                    value={hasDetails ? (weight ?? "") : ""}
                                    placeholder={
                                      details?.status === "error"
                                        ? "Error"
                                        : "Loading..."
                                    }
                                    readOnly
                                    className={`${styles.numberInput} ${styles.readOnlyInput}`}
                                  />
                                </td>

                                {/* QUANTITY */}

                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={entries[key] ?? ""}
                                    onChange={(event) =>
                                      updateQuantity(
                                        product,
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Qty"
                                    className={styles.numberInput}
                                  />
                                </td>

                                {/* EDITABLE RATE */}

                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={displayedRate}
                                    placeholder={
                                      details?.status === "error"
                                        ? "Error"
                                        : hasDetails
                                          ? "Enter Rate"
                                          : "Loading..."
                                    }
                                    disabled={!hasDetails}
                                    onChange={(event) =>
                                      updateRate(product, event.target.value)
                                    }
                                    onWheel={(event) =>
                                      event.currentTarget.blur()
                                    }
                                    className={styles.numberInput}
                                  />
                                </td>

                                {/* TOTAL */}

                                <td className={styles.amountCell}>
                                  ₹{total.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* FOOTER */}

        <div className={styles.footer}>
          {!isEditing && (
            <div className={styles.summary}>
              <div className={styles.summaryCount}>
                <FaCheckCircle />
                <span>{selectedCount} Items Selected</span>
              </div>

              <div className={styles.summaryTotal}>
                <span>Grand Total</span>
                <strong>₹{totalAmount.toFixed(2)}</strong>
              </div>
            </div>
          )}

          {bulkError && !isEditing && (
            <div className={styles.errorBanner}>{bulkError}</div>
          )}

          <div className={styles.footerActions}>
            <button
              type="button"
              onClick={closeItemModal}
              className={styles.cancelButton}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={isEditing ? saveItem : handleBulkSave}
              disabled={
                !isEditing &&
                (selectedCount === 0 || isLoadingProducts || hasInvalidProducts)
              }
              className={styles.saveButton}
            >
              {isEditing ? "Update Item" : `Add ${selectedCount} Items`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderFormModal;
