 
import { FaTimes, FaPlus } from 'react-icons/fa';
import styles from '../AddOrderModal.module.css';
import OrderForm from './OrderForm';

const AddOrderModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <FaPlus className={styles.modalTitleIcon} />
            Add New Order
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          <OrderForm onClose={onClose} />
        </div>
      </div>
    </div>
  );
};

export default AddOrderModal;