import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { addProduction } from "../../features/productionSlice";
import {
  fetchProductTypes,
  fetchWeightByType,
} from "../../features/productTypeSlice";

import styles from "./Dailyproduction.module.css";

export default function ProductionForm() {
  const dispatch = useDispatch();
  const productTypes = useSelector((state) => state.product?.types || []);

  const [category, setCategory] = useState("Chicken");

  const [formData, setFormData] = useState({
    productionDate: "",
    inputQuantity: "",
    noOfBirds: "",
    wastage: "",
  });

  const [items, setItems] = useState([]);

  const parseWeight = (weight) => {
    if (!weight) return { value: "", unit: "" };

    const parts = weight.toString().split(" ");

    return {
      value: parts[0],
      unit: parts[1] || "",
    };
  };

  useEffect(() => {
    dispatch(fetchProductTypes());
  }, [dispatch]);

  // Reset chicken fields when category changes
  useEffect(() => {
    if (category === "Egg") {
      setFormData((prev) => ({
        ...prev,
        inputQuantity: "",
        wastage: "",
        noOfBirds: "",
      }));
    }
  }, [category]);

  useEffect(() => {
    const loadItems = async () => {
      const filtered = productTypes.filter((p) => p.Category === category);

      const mappedItems = await Promise.all(
        filtered.map(async (item) => {
          try {
            const weight = await dispatch(
              fetchWeightByType(item.ProductType),
            ).unwrap();

            const { value, unit } = parseWeight(weight);

            return {
              productTypeId: item.ProductTypeId,
              productName: item.ProductType,
              quantity: "",
              weight: value,
              unit: unit,
            };
          } catch (err) {
            return {
              productTypeId: item.ProductTypeId,
              productName: item.ProductType,
              quantity: "",
              weight: "",
              unit: "",
            };
          }
        }),
      );

      setItems(mappedItems);
    };

    if (productTypes.length > 0) {
      loadItems();
    }
  }, [category, productTypes, dispatch]);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleFormChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  // total product quantity
  const totalProductQty = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  // calculate total weight
  const totalWeightGrams = items.reduce((sum, item) => {
    const qty = Number(item.quantity || 0);
    const weight = Number(item.weight || 0);
    const unit = (item.unit || "").toLowerCase();

    if (unit === "gram" || unit === "g") {
      return sum + qty * weight;
    }

    if (unit === "kg") {
      return sum + qty * weight * 1000;
    }

    return sum;
  }, 0);

  const outputKg = totalWeightGrams / 1000;

  const totalWeight =
    totalWeightGrams >= 1000
      ? outputKg.toFixed(2) + " kg"
      : totalWeightGrams + " gram";

  const remainingWeight =
    Number(formData.inputQuantity || 0) -
    (outputKg + Number(formData.wastage || 0));

  const handleSubmit = (e) => {
    e.preventDefault();

    if (category === "Chicken") {
      const inputKg = Number(formData.inputQuantity || 0);
      const wastage = Number(formData.wastage || 0);

      const finalOutput = outputKg + wastage;

      if (finalOutput.toFixed(2) !== inputKg.toFixed(2)) {
        alert("Input Quantity must equal Output Weight + Wastage");
        return;
      }
    }

    dispatch(
      addProduction({
        productionDate: formData.productionDate,
        category: category,

        inputQuantity: category === "Chicken" ? formData.inputQuantity : null,
        wastage: category === "Chicken" ? formData.wastage : null,
        noOfBirds: category === "Chicken" ? formData.noOfBirds : null,

        items,
      }),
    );

    alert("Production Saved Successfully");
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Daily Production Entry</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* DATE */}
        <div className={styles.field}>
          <label>Date</label>
          <input
            type="date"
            value={formData.productionDate}
            onChange={(e) => handleFormChange("productionDate", e.target.value)}
            required
          />
        </div>

        {/* CATEGORY */}
        <div className={styles.field}>
          <label>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Chicken">Chicken</option>
            <option value="Egg">Egg</option>
          </select>
        </div>

        {/* BIRDS */}
        {category === "Chicken" && (
          <div className={styles.field}>
            <label>No Of Birds</label>
            <input
              type="number"
              value={formData.noOfBirds}
              onChange={(e) => handleFormChange("noOfBirds", e.target.value)}
            />
          </div>
        )}

        {/* INPUT */}
        {category === "Chicken" && (
          <div className={styles.field}>
            <label>Input Quantity</label>

            <div className={styles.inputWithUnit}>
              <input
                type="number"
                value={formData.inputQuantity}
                onChange={(e) =>
                  handleFormChange("inputQuantity", e.target.value)
                }
              />
              <span>kg</span>
            </div>
          </div>
        )}

        {/* PRODUCT TABLE */}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Weight</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => (
              <tr key={item.productTypeId}>
                <td>{item.productName}</td>

                <td>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, "quantity", e.target.value)
                    }
                  />
                </td>

                <td>
                  <input type="text" value={item.weight} readOnly />
                  <span className={styles.unit}>{item.unit}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* WASTAGE */}
        {category === "Chicken" && (
          <div className={styles.field}>
            <label>Wastage (kg)</label>
            <input
              type="number"
              value={formData.wastage}
              onChange={(e) => handleFormChange("wastage", e.target.value)}
            />
          </div>
        )}

        {/* SUMMARY */}
        <div className={styles.summary}>
          {category === "Chicken" && (
            <>
              <p>
                <strong>Total Input Quantity:</strong>{" "}
                {formData.inputQuantity || 0} kg
              </p>

              <p>
                <strong>Total Output Weight:</strong> {totalWeight}
              </p>

              <p>
                <strong>Remaining Weight:</strong> {remainingWeight.toFixed(2)}{" "}
                kg
              </p>

              <p>
                <strong>Wastage:</strong> {formData.wastage || 0} kg
              </p>
            </>
          )}

          <p>
            <strong>Total Product Quantity:</strong> {totalProductQty}
          </p>
        </div>

        <button type="submit" className={styles.submitBtn}>
          Save Production
        </button>
      </form>
    </div>
  );
}
