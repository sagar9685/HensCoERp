import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateOrderQuantity,
  fetchOrder,
  addItemToOrder,
  removeOrderItem,
} from "../../features/orderSlice";
import { cancelOrderBeforeAssign } from "../../features/assignedOrderSlice";
import OrderFormModal from "./OrderFormModal";
import {
  fetchProductTypes,
  fetchWeightByType,
  fetchRateByProductType,
} from "../../features/productTypeSlice";
import { updateOrderRate } from "../../features/rateSlice";
import { toast } from "react-toastify";
import styles from "./EditOrderModal.module.css";

export default function EditOrderModal({ order, onClose }) {
  const dispatch = useDispatch();

  const itemIds = order.ItemIDs?.split(",").map((i) => i.trim()) || [];
  const types = order.ProductTypes?.split(",").map((i) => i.trim()) || [];
  const qtys = order.Quantities?.split(",").map((i) => i.trim()) || [];
  const w = order.Weights?.split(",").map((i) => i.trim()) || [];
  const rates = order.Rates?.split(",").map((i) => i.trim()) || [];

  const productTypes = useSelector((state) => state.product.types || []);

  console.log(types, qtys, rates, "on eid");

  const maxLength = Math.max(
    itemIds.length,
    types.length,
    qtys.length,
    w.length,
    rates.length,
  );

  const [items, setItems] = useState(
    Array.from({ length: maxLength }, (_, i) => ({
      itemId: itemIds[i] || "",
      productType: types[i] || "",
      weight: w[i] || "",
      quantity: Number(qtys[i]) || 0,
      rate: Number(rates[i]) || 0,
    })),
  );

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  const [productDetails, setProductDetails] = useState({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isAddingItems, setIsAddingItems] = useState(false);

  const [currentItem, setCurrentItem] = useState({
    productName: "",
    productType: "",
    weight: "",
    quantity: "",
    rate: "",
  });

  const [editingIndex, setEditingIndex] = useState(null);
  const [reason, setReason] = useState(""); // ✅ Reason state

  const authData = JSON.parse(localStorage.getItem("authData"));
  const username = authData?.name;

  const handleChange = (index, field, value) => {
    const updated = [...items];

    let numValue = Number(value);

    // ✅ Qty aur Rate negative nahi honge
    if (field === "quantity" || field === "rate") {
      if (value === "") {
        updated[index][field] = "";
      } else {
        updated[index][field] = Math.max(0, numValue);
      }
    } else {
      updated[index][field] = value;
    }

    setItems(updated);
  };

  const handleUpdate = async (item) => {
    if (!reason) {
      toast.error("Please enter a reason for edit");
      return;
    }

    try {
      // Quantity Update
      await dispatch(
        updateOrderQuantity({
          orderId: order.OrderID,
          itemId: item.itemId,
          newQuantity: Number(item.quantity),
          changedBy: username,
          reason,
        }),
      ).unwrap();

      // Rate Update
      await dispatch(
        updateOrderRate({
          orderId: order.OrderID,
          itemId: item.itemId,
          newRate: Number(item.rate),
          changedBy: username,
          reason,
        }),
      ).unwrap();

      toast.success("Order updated successfully");
      dispatch(fetchOrder());
      onClose();
    } catch (err) {
      toast.error(err.message || "Update failed");
    }
  };

  const handleRemoveItem = async (item) => {
    console.log("REMOVE CLICKED ITEM:", item);

    // ✅ At least 1 item rehna chahiye
    if (items.length <= 1) {
      toast.error("At least one item is required in order");
      return;
    }

    if (!reason) {
      toast.error("Please enter a reason for remove item");
      return;
    }

    if (!item.itemId) {
      toast.error("Item ID not found");
      return;
    }

    try {
      const res = await dispatch(
        removeOrderItem({
          orderId: order.OrderID,
          itemId: item.itemId,
          changedBy: username || "ADMIN",
          reason,
        }),
      ).unwrap();

      console.log("REMOVE SUCCESS:", res);

      toast.success("Item removed successfully");

      dispatch(fetchOrder());

      onClose();
    } catch (err) {
      console.log("REMOVE FAILED ERROR:", err);
      toast.error(err?.message || "Failed to remove item");
    }
  };

  const cancelOrder = async () => {
    if (!reason) {
      toast.error("Please enter a reason for cancellation");
      return;
    }

    try {
      if (order.AssignID) {
        await dispatch(
          cancelAssignedOrder({
            assignId: order.AssignID,
            reason: reason, // ✅ reason
            username: username,
          }),
        ).unwrap();
      } else {
        await dispatch(
          cancelOrderBeforeAssign({
            orderId: order.OrderID,
            reason: reason, // ✅ reason
            username: username,
          }),
        ).unwrap();
      }

      toast.success("Order cancelled");
      dispatch(fetchOrder());
      setReason("");
      onClose();
    } catch (err) {
      toast.error(err.message || "Cancel failed");
    }
  };

  useEffect(() => {
    dispatch(fetchProductTypes());
  }, [dispatch]);

  const fetchProductDetails = useCallback(
    async (productType) => {
      const [weightResult, rateResult] = await Promise.all([
        dispatch(fetchWeightByType(productType)).unwrap(),
        dispatch(fetchRateByProductType(productType)).unwrap(),
      ]);

      const weight = Array.isArray(weightResult)
        ? weightResult[0]
        : weightResult;

      const rate = Number(rateResult);

      if (
        rateResult === null ||
        rateResult === undefined ||
        rateResult === "" ||
        !Number.isFinite(rate) ||
        rate < 0
      ) {
        throw new Error(`Invalid rate for ${productType}`);
      }

      return {
        weight: weight ?? "",
        rate,
        status: "success",
      };
    },
    [dispatch],
  );

  // Fetch all product weights and rates when Add New Item opens
  useEffect(() => {
    if (
      !isItemModalOpen ||
      editingIndex !== null ||
      productTypes.length === 0
    ) {
      return;
    }

    let cancelled = false;

    const loadProductDetails = async () => {
      setIsLoadingProducts(true);

      const uniqueTypes = [
        ...new Set(
          productTypes.map((product) => product.ProductType).filter(Boolean),
        ),
      ];

      const results = await Promise.allSettled(
        uniqueTypes.map(async (type) => ({
          type,
          details: await fetchProductDetails(type),
        })),
      );

      if (cancelled) return;

      const detailsMap = {};

      results.forEach((result, index) => {
        const type = uniqueTypes[index];

        if (result.status === "fulfilled") {
          detailsMap[type] = result.value.details;
        } else {
          console.error(`Failed to load ${type}:`, result.reason);

          detailsMap[type] = {
            weight: "",
            rate: "",
            status: "error",
          };
        }
      });

      setProductDetails(detailsMap);
      setIsLoadingProducts(false);
    };

    loadProductDetails();

    return () => {
      cancelled = true;
    };
  }, [isItemModalOpen, editingIndex, productTypes, fetchProductDetails]);

  const handleBulkAddItems = async (newItems) => {
    if (isAddingItems) return;

    if (!reason.trim()) {
      toast.error("Please enter a reason for adding items");
      return;
    }

    if (!Array.isArray(newItems) || newItems.length === 0) {
      toast.error("Please select at least one product");
      return;
    }

    setIsAddingItems(true);

    let addedCount = 0;

    try {
      for (const item of newItems) {
        await dispatch(
          addItemToOrder({
            OrderID: order.OrderID,
            ProductName: item.productName,
            ProductType: item.productType,
            Weight: Array.isArray(item.weight) ? item.weight[0] : item.weight,
            Quantity: Number(item.quantity),
            Rate: Number(item.rate),
          }),
        ).unwrap();

        addedCount++;
      }

      toast.success(`${addedCount} item(s) added successfully`);

      await dispatch(fetchOrder());

      setIsItemModalOpen(false);
      onClose();
    } catch (error) {
      console.error("Bulk add item error:", error);

      toast.error(
        `${addedCount} item(s) added. Remaining items could not be added. Please check the order before retrying.`,
      );

      await dispatch(fetchOrder());
    } finally {
      setIsAddingItems(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Edit Order #{order.OrderID}</h2>
          <button className={styles.closeIcon} onClick={onClose}>
            &times;
          </button>
        </div>

        {/* ✅ Reason Input */}
        <div className={styles.reasonSection}>
          <label className={styles.label}>Reason for Edit/Cancel:</label>
          <input
            type="text"
            className={styles.reasonInput}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Customer requested change"
          />
        </div>

        <div className={styles.itemsList}>
          {items.map((item, i) => (
            <div key={i} className={styles.itemRow}>
              <div className={styles.itemInfo}>
                <div className={styles.productRow}>
                  <span>{item.productType}</span>
                  <span>{item.weight}</span>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Qty</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(e) => {
                    const value = e.target.value;

                    // ✅ only positive numbers
                    if (/^\d*$/.test(value)) {
                      handleChange(
                        i,
                        "quantity",
                        value === "" ? "" : Math.max(1, Number(value)),
                      );
                    }
                  }}
                  onKeyDown={(e) => {
                    // ✅ prevent minus, e, +, dot
                    if (["-", "+", "e", "E", "."].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Rate</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.rate}
                  onChange={(e) => {
                    const value = e.target.value;

                    // ✅ only positive numbers
                    if (/^\d*$/.test(value)) {
                      handleChange(
                        i,
                        "rate",
                        value === "" ? "" : Math.max(1, Number(value)),
                      );
                    }
                  }}
                  onKeyDown={(e) => {
                    // ✅ prevent minus, e, +, dot
                    if (["-", "+", "e", "E", "."].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </div>

              <button
                className={styles.updateBtn}
                onClick={() => handleUpdate(item)}
              >
                Update
              </button>

              <button
                className={styles.cancelBtn}
                onClick={() => handleRemoveItem(item)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* ✅ Add Item Button moved OUTSIDE the loop */}
        <button
          className={styles.addBtn}
          onClick={() => {
            setEditingIndex(null);
            setCurrentItem({
              productName: "",
              productType: "",
              weight: "",
              quantity: "",
              rate: "",
            });
            setIsItemModalOpen(true);
          }}
        >
          + Add New Item
        </button>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={cancelOrder}>
            Cancel Entire Order
          </button>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <OrderFormModal
        isItemModalOpen={isItemModalOpen}
        closeItemModal={() => {
          if (!isAddingItems) {
            setIsItemModalOpen(false);
          }
        }}
        currentItem={currentItem}
        editingIndex={editingIndex}
        handleItemChange={(e) => {
          const { name, value } = e.target;

          setCurrentItem((prev) => ({
            ...prev,
            [name]: value,
          }));
        }}
        handleProductTypeChange={async (e) => {
          const value = e.target.value;

          setCurrentItem((prev) => ({
            ...prev,
            productType: value,
            weight: "",
            rate: "",
          }));

          if (!value) return;

          try {
            const details = await fetchProductDetails(value);

            setCurrentItem((prev) => {
              if (prev.productType !== value) return prev;

              return {
                ...prev,
                weight: details.weight,
                rate: details.rate,
              };
            });
          } catch (error) {
            console.error("Product details error:", error);
            toast.error("Unable to fetch Weight and Rate");
          }
        }}
        productTypes={productTypes}
        productDetails={productDetails}
        isLoadingProducts={isLoadingProducts}
        errors={{}}
        onSaveItems={handleBulkAddItems}
        saveItem={async () => {
          if (!currentItem.productName || !currentItem.productType) {
            toast.error("Please select a product");
            return;
          }

          if (
            !Number.isInteger(Number(currentItem.quantity)) ||
            Number(currentItem.quantity) <= 0 ||
            currentItem.rate === "" ||
            !Number.isFinite(Number(currentItem.rate))
          ) {
            toast.error("Invalid quantity or rate");
            return;
          }

          try {
            await dispatch(
              addItemToOrder({
                OrderID: order.OrderID,
                ProductName: currentItem.productName,
                ProductType: currentItem.productType,
                Weight: currentItem.weight,
                Quantity: Number(currentItem.quantity),
                Rate: Number(currentItem.rate),
              }),
            ).unwrap();

            toast.success("Item added successfully");
            dispatch(fetchOrder());

            setIsItemModalOpen(false);
            onClose();
          } catch (error) {
            toast.error(error?.message || "Failed to add item");
          }
        }}
      />
    </div>
  );
}
