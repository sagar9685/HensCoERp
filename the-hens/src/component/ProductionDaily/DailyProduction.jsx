import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addProduction } from "../../features/productionSlice";
import {
  fetchProductTypes,
  fetchWeightByType,
} from "../../features/productTypeSlice";
import styles from "./Dailyproduction.module.css";
import ProductionHeader from "./ProductionHeader";

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

  const totalProductQty = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

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

    // Show success message with animation
    const btn = document.querySelector(`.${styles.submitBtn}`);
    btn.innerHTML = "✓ Saved Successfully!";
    btn.style.background = "linear-gradient(135deg, #00b09b, #96c93d)";

    setTimeout(() => {
      btn.innerHTML = "Save Production";
      btn.style.background = "linear-gradient(135deg, #667eea, #764ba2)";
    }, 2000);

    // Reset form
    setFormData({
      productionDate: "",
      inputQuantity: "",
      noOfBirds: "",
      wastage: "",
    });
    setItems(items.map((item) => ({ ...item, quantity: "" })));
  };

  return (
    <>
      <ProductionHeader />
      <div className={styles.container}>
        <div className={styles.headerWrapper}>
          <h2 className={styles.title}>
            <span className={styles.titleIcon}>📋</span>
            Daily Production Entry
          </h2>
          <div className={styles.dateBadge}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            {/* DATE */}
            <div className={styles.fieldGroup}>
              <div className={styles.fieldIcon}>📅</div>
              <div className={styles.field}>
                <label>Production Date</label>
                <input
                  type="date"
                  value={formData.productionDate}
                  onChange={(e) =>
                    handleFormChange("productionDate", e.target.value)
                  }
                  required
                  className={styles.dateInput}
                />
              </div>
            </div>

            {/* CATEGORY */}
            <div className={styles.fieldGroup}>
              <div className={styles.fieldIcon}>
                {category === "Chicken" ? "🐔" : "🥚"}
              </div>
              <div className={styles.field}>
                <label>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="Chicken">🐔 Chicken</option>
                  <option value="Egg">🥚 Egg</option>
                </select>
              </div>
            </div>

            {/* BIRDS */}
            {category === "Chicken" && (
              <div className={styles.fieldGroup}>
                <div className={styles.fieldIcon}>🐦</div>
                <div className={styles.field}>
                  <label>Number of Birds</label>
                  <input
                    type="number"
                    value={formData.noOfBirds}
                    onChange={(e) =>
                      handleFormChange("noOfBirds", e.target.value)
                    }
                    placeholder="Enter count"
                    className={styles.numberInput}
                  />
                </div>
              </div>
            )}

            {/* INPUT QUANTITY */}
            {category === "Chicken" && (
              <div className={styles.fieldGroup}>
                <div className={styles.fieldIcon}>⚖️</div>
                <div className={styles.field}>
                  <label>Input Quantity</label>
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      value={formData.inputQuantity}
                      onChange={(e) =>
                        handleFormChange("inputQuantity", e.target.value)
                      }
                      placeholder="0.00"
                      className={styles.numberInput}
                    />
                    <span className={styles.unitLabel}>kg</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PRODUCT TABLE */}
          <div className={styles.tableWrapper}>
            <div className={styles.tableHeader}>
              <h3>Production Items</h3>
              <span className={styles.itemCount}>{items.length} items</span>
            </div>
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
                  <tr key={item.productTypeId} className={styles.tableRow}>
                    <td className={styles.productCell}>
                      <span className={styles.productIcon}>
                        {category === "Chicken" ? "🍗" : "🥚"}
                      </span>
                      {item.productName}
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, "quantity", e.target.value)
                        }
                        placeholder="0"
                        className={styles.quantityInput}
                      />
                    </td>
                    <td className={styles.weightCell}>
                      <span className={styles.weightValue}>
                        {item.weight || "0"}
                      </span>
                      <span className={styles.weightUnit}>{item.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* WASTAGE */}
          {category === "Chicken" && (
            <div className={styles.wastageSection}>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldIcon}>🗑️</div>
                <div className={styles.field}>
                  <label>Wastage</label>
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      value={formData.wastage}
                      onChange={(e) =>
                        handleFormChange("wastage", e.target.value)
                      }
                      placeholder="0.00"
                      className={styles.numberInput}
                    />
                    <span className={styles.unitLabel}>kg</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUMMARY CARDS */}
          <div className={styles.summaryCards}>
            {category === "Chicken" && (
              <>
                <div
                  className={styles.summaryCard}
                  style={{
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                  }}
                >
                  <div className={styles.cardIcon}>📦</div>
                  <div className={styles.cardContent}>
                    <span className={styles.cardLabel}>Input Quantity</span>
                    <span className={styles.cardValue}>
                      {formData.inputQuantity || 0} kg
                    </span>
                  </div>
                </div>

                <div
                  className={styles.summaryCard}
                  style={{
                    background: "linear-gradient(135deg, #f093fb, #f5576c)",
                  }}
                >
                  <div className={styles.cardIcon}>⚖️</div>
                  <div className={styles.cardContent}>
                    <span className={styles.cardLabel}>Output Weight</span>
                    <span className={styles.cardValue}>{totalWeight}</span>
                  </div>
                </div>

                <div
                  className={styles.summaryCard}
                  style={{
                    background: "linear-gradient(135deg, #4facfe, #00f2fe)",
                  }}
                >
                  <div className={styles.cardIcon}>📊</div>
                  <div className={styles.cardContent}>
                    <span className={styles.cardLabel}>Remaining</span>
                    <span className={styles.cardValue}>
                      {remainingWeight.toFixed(2)} kg
                    </span>
                  </div>
                </div>

                <div
                  className={styles.summaryCard}
                  style={{
                    background: "linear-gradient(135deg, #43e97b, #38f9d7)",
                  }}
                >
                  <div className={styles.cardIcon}>🗑️</div>
                  <div className={styles.cardContent}>
                    <span className={styles.cardLabel}>Wastage</span>
                    <span className={styles.cardValue}>
                      {formData.wastage || 0} kg
                    </span>
                  </div>
                </div>
              </>
            )}

            <div
              className={styles.summaryCard}
              style={{
                background: "linear-gradient(135deg, #fa709a, #fee140)",
              }}
            >
              <div className={styles.cardIcon}>📈</div>
              <div className={styles.cardContent}>
                <span className={styles.cardLabel}>Total Products</span>
                <span className={styles.cardValue}>
                  {totalProductQty} units
                </span>
              </div>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn}>
            <span className={styles.btnIcon}>💾</span>
            Save Production
          </button>
        </form>
      </div>
    </>
  );
}
