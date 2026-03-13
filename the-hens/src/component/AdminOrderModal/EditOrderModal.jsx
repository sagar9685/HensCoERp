import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  updateOrderQuantity,
  fetchOrder,
  addItemToOrder,
} from "../../features/orderSlice";
import { cancelOrderBeforeAssign } from "../../features/assignedOrderSlice";
import OrderFormModal from "./OrderFormModal";
import { useSelector } from "react-redux";
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
  const Weights = useSelector((state) => state.product.w || []);

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

  const handleProductTypeChange = async (e) => {
    const value = e.target.value;

    setCurrentItem((prev) => ({
      ...prev,
      productType: value,
    }));

    if (!value) return;

    try {
      const weight = await dispatch(fetchWeightByType(value)).unwrap();
      const rate = await dispatch(fetchRateByProductType(value)).unwrap();

      const fetchedWeight = Array.isArray(weight) ? weight[0] : weight;

      setCurrentItem((prev) => ({
        ...prev,
        productType: value,
        weight: fetchedWeight,
        rate: rate,
      }));
    } catch (err) {
      toast.error("Failed to fetch weight or rate", err);
    }
  };

  const [currentItem, setCurrentItem] = useState({
    productName: "",
    productType: "",
    weight: "",
    quantity: "",
    rate: "",
  });

  const [editingIndex, setEditingIndex] = useState(null);

  const authData = JSON.parse(localStorage.getItem("authData"));
  const username = authData?.name;

  const handleChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  //   const handleUpdate = async (item) => {
  //     console.log({
  //       orderId: order.OrderID,
  //       itemId: item.itemId,
  //       newQuantity: Number(item.quantity),
  //       changedBy: username,
  //     });
  //     try {
  //       await dispatch(
  //         updateOrderQuantity({
  //           orderId: order.OrderID,
  //           itemId: item.itemId,
  //           newQuantity: Number(item.quantity),
  //           changedBy: username,
  //           reason: "Admin Edit",
  //         }),
  //       ).unwrap();

  //       toast.success("Quantity updated");
  //       dispatch(fetchOrder());
  //     } catch (err) {
  //       toast.error(err.message);
  //     }
  //   };

  const handleUpdate = async (item) => {
    try {
      await dispatch(
        updateOrderQuantity({
          orderId: order.OrderID,
          itemId: item.itemId,
          newQuantity: Number(item.quantity),
          newRate: Number(item.rate), // optional
          changedBy: username,
          reason: "Admin Edit",
        }),
      ).unwrap();

      toast.success("Order updated");

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

  useEffect(() => {
    dispatch(fetchProductTypes());
  }, [dispatch]);

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
              onChange={(e) => handleChange(i, "quantity", e.target.value)}
            />

            <input
              type="number"
              value={item.rate}
              onChange={(e) => handleChange(i, "rate", e.target.value)}
            />

            <button
              className={styles.updateBtn}
              onClick={() => handleUpdate(item)}
            >
              Update
            </button>

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
              Add Item
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
      <OrderFormModal
        isItemModalOpen={isItemModalOpen}
        closeItemModal={() => setIsItemModalOpen(false)}
        currentItem={currentItem}
        editingIndex={editingIndex}
        handleItemChange={(e) =>
          setCurrentItem({ ...currentItem, [e.target.name]: e.target.value })
        }
        handleProductTypeChange={handleProductTypeChange}
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
          } catch (err) {
            toast.error(err?.message || "Failed to add item");
          }
        }}
      />
    </div>
  );
}
