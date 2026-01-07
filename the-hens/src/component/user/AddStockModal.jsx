import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addStock, closeStockModal } from "../../features/stockSlice";
import { fetchWeightByType } from "../../features/productTypeSlice";
import { fetchProductTypes } from "../../features/productTypeSlice";
import styles from "./AddStockModal.module.css";
import { toast } from "react-toastify";
import { X } from "lucide-react";

const AddStockModal = () => {
  const dispatch = useDispatch();

  const [item_name, setItem] = useState("");
  const [weightOptions, setWeightOptions] = useState([]);
  const [weight, setWeight] = useState("");
  const [quantity, setQty] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const productTypes = useSelector((state) => state.product?.types ?? []);
  //   const loading = useSelector((state) => state.product?.loading ?? false);

  useEffect(() => {
    dispatch(fetchProductTypes());
  }, []);

  // ⭐ When product is selected — fetch weights
  const handleProductSelect = async (value) => {
    setItem(value);
    setWeight("");
    if (!value) {
      setWeightOptions([]);
      return;
    }

    try {
      const response = await dispatch(fetchWeightByType(value)).unwrap();

      let options = [];
      if (Array.isArray(response)) {
        options = response;
      } else {
        let cleaned = response.replace(/\n/g, " ").replace(/\s+/g, " ");
        if (cleaned.includes(",")) options = cleaned.split(",");
        else if (cleaned.includes(";")) options = cleaned.split(";");
        else options = [cleaned];
      }

      setWeightOptions(options.map((x) => x.trim()).filter((x) => x));
    } catch (err) {
      console.log("Weight fetch error:", err);
      setWeightOptions([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = {
      item_name,
      weight,
      quantity,
    };

    try {
      await dispatch(addStock(formData)).unwrap();
      toast.success("🎉 Stock added successfully!");
      dispatch(closeStockModal());
    } catch (error) {
      toast.error(error?.message || "Failed to add stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    dispatch(closeStockModal());
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <span className={styles.icon}>📦</span>
            Add New Stock
          </h3>
          <button onClick={handleClose} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span className={styles.labelIcon}>🏷️</span>
              Product Type
            </label>
            <select
              value={item_name}
              onChange={(e) => handleProductSelect(e.target.value)}
              className={styles.input}
              required
              disabled={isSubmitting}
            >
              <option value="">Select a product type</option>
              {productTypes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span className={styles.labelIcon}>⚖️</span>
              Weight
            </label>
            <select
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={styles.input}
              required
              disabled={!item_name || isSubmitting}
            >
              <option value="">Select weight</option>
              {weightOptions.length > 0 ? (
                weightOptions.map((w, i) => (
                  <option key={i} value={w}>
                    {w}
                  </option>
                ))
              ) : (
                <option disabled>Select product type first</option>
              )}
            </select>
            {!item_name && (
              <div className={styles.hint}>
                Select a product type to see available weights
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span className={styles.labelIcon}>🔢</span>
              Quantity
            </label>
            <input
              type="number"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQty(e.target.value)}
              className={styles.input}
              required
              min="1"
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.btnRow}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.save}
              disabled={isSubmitting || !item_name || !weight || !quantity}
            >
              {isSubmitting ? (
                <>
                  <span className={styles.spinner}></span>
                  Adding...
                </>
              ) : (
                <>
                  <span className={styles.saveIcon}>✓</span>
                  Add Stock
                </>
              )}
            </button>
          </div>

          <div className={styles.formHint}>
            <div className={styles.hintItem}>
              <span className={styles.hintDot}>•</span>
              All fields are required
            </div>
            <div className={styles.hintItem}>
              <span className={styles.hintDot}>•</span>
              Quantity must be a positive number
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStockModal;
