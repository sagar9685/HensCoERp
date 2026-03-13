import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { updateOrderQuantity, fetchOrder } from "../../features/orderSlice";
import { cancelOrderBeforeAssign } from "../../features/assignedOrderSlice";
import axios from "axios";
import { toast } from "react-toastify";
import styles from "./EditOrderModal.module.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function EditOrderModal({ order, onClose }) {
  const dispatch = useDispatch();

  const itemIds = order.ItemIDs?.split(",") || [];
  const types = order.ProductTypes?.split(",") || [];
  const qtys = order.Quantities?.split(",") || [];
  const weights = order.Weights?.split(",") || [];
  const rates = order.Rates?.split(",") || [];

  const [items, setItems] = useState(
    types.map((t, i) => ({
      itemId: itemIds[i],
      productType: t,
      weight: weights[i],
      quantity: qtys[i],
      rate: rates[i],
    })),
  );

  const authData = JSON.parse(localStorage.getItem("authData"));
  const username = authData?.name;

  const handleQtyChange = (index, value) => {
    const updated = [...items];
    updated[index].quantity = value;
    setItems(updated);
  };

  const handleUpdate = async (item) => {
    console.log({
      orderId: order.OrderID,
      itemId: item.itemId,
      newQuantity: Number(item.quantity),
      changedBy: username,
    });
    try {
      await dispatch(
        updateOrderQuantity({
          orderId: order.OrderID,
          itemId: item.itemId,
          newQuantity: Number(item.quantity),
          changedBy: username,
          reason: "Admin Edit",
        }),
      ).unwrap();

      toast.success("Quantity updated");
      dispatch(fetchOrder());
    } catch (err) {
      toast.error(err.message);
    }
  };

  const cancelOrder = async () => {
    try {
      if (order.AssignID) {
        await dispatch(
          cancelAssignedOrder({
            assignId: order.AssignID,
            reason: "Cancelled by admin",
          }),
        ).unwrap();
      } else {
        await dispatch(
          cancelOrderBeforeAssign({
            orderId: order.OrderID,
            reason: "Cancelled by admin",
          }),
        ).unwrap();
      }

      toast.success("Order cancelled");
      dispatch(fetchOrder());
      onClose();
    } catch (err) {
      toast.error("Cancel failed");
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <h2 className={styles.title}>Edit Order #{order.OrderID}</h2>

        {items.map((item, i) => (
          <div key={i} className={styles.itemRow}>
            <b>{item.productType}</b>

            <input
              type="number"
              value={item.quantity}
              className={styles.qtyInput}
              onChange={(e) => handleQtyChange(i, e.target.value)}
            />

            <button
              className={styles.updateBtn}
              onClick={() => handleUpdate(item)}
            >
              Update
            </button>
          </div>
        ))}

        <button className={styles.cancelBtn} onClick={cancelOrder}>
          Cancel Order
        </button>

        <button className={styles.closeBtn} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
