import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateOrderQuantity,
  fetchOrder,
  addItemToOrder,
} from "../../features/orderSlice";
import { cancelOrderBeforeAssign } from "../../features/assignedOrderSlice";
import OrderFormModal from "./OrderFormModal";
import {
  fetchProductTypes,
  fetchWeightByType,
  fetchRateByProductType,
} from "../../features/productTypeSlice";
import { toast } from "react-toastify";
import styles from "./EditOrderModal.module.css";

export default function EditOrderModal({ order, onClose }) {
  const dispatch = useDispatch();

  const itemIds = order.ItemIDs?.split(",") || [];
  const types = order.ProductTypes?.split(",") || [];
  const qtys = order.Quantities?.split(",") || [];
  const w = order.Weights?.split(",") || [];
  const rates = order.Rates?.split(",") || [];

  const productTypes = useSelector((state) => state.product.types || []);

  const [items, setItems] = useState(
    types.map((t, i) => ({
      itemId: itemIds[i],
      productType: t,
      weight: w[i],
      quantity: qtys[i],
      rate: rates[i],
    })),
  );

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

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
    updated[index][field] = value;
    setItems(updated);
  };

  const handleUpdate = async (item) => {
    if (!reason) {
      toast.error("Please enter a reason for edit");
      return;
    }

    try {
      await dispatch(
        updateOrderQuantity({
          orderId: order.OrderID,
          itemId: item.itemId,
          newQuantity: Number(item.quantity),
          newRate: Number(item.rate),
          changedBy: username,
          reason: reason, // ✅ send reason
        }),
      ).unwrap();

      toast.success("Quantity updated");
      dispatch(fetchOrder());
      onClose();
    } catch (err) {
      toast.error(err.message);
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
                <span className={styles.productBadge}>{item.productType}</span>
              </div>

              <div className={styles.inputGroup}>
                <label>Qty</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleChange(i, "quantity", e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Rate</label>
                <input
                  type="number"
                  value={item.rate}
                  onChange={(e) => handleChange(i, "rate", e.target.value)}
                />
              </div>

              <button
                className={styles.updateBtn}
                onClick={() => handleUpdate(item)}
              >
                Update
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
        closeItemModal={() => setIsItemModalOpen(false)}
        currentItem={currentItem}
        editingIndex={editingIndex}
        handleItemChange={(e) =>
          setCurrentItem({ ...currentItem, [e.target.name]: e.target.value })
        }
        handleProductTypeChange={(e) => {
          const value = e.target.value;
          setCurrentItem((prev) => ({ ...prev, productType: value }));
          if (!value) return;
          dispatch(fetchWeightByType(value))
            .unwrap()
            .then((weight) => {
              const fetchedWeight = Array.isArray(weight) ? weight[0] : weight;
              setCurrentItem((prev) => ({ ...prev, weight: fetchedWeight }));
            });
          dispatch(fetchRateByProductType(value))
            .unwrap()
            .then((rate) => setCurrentItem((prev) => ({ ...prev, rate })));
        }}
        productTypes={productTypes}
        errors={{}}
        saveItem={async () => {
          if (
            !currentItem.productName ||
            !currentItem.productType ||
            !currentItem.quantity ||
            !currentItem.rate
          ) {
            toast.error("Please fill all fields");
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
          } catch (err) {
            toast.error(err?.message || "Failed to add item");
          }
        }}
      />
    </div>
  );
}
