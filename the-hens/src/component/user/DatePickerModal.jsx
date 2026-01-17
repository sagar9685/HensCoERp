// DatePickerModal.js
import React, { useState } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import styles from './rejectstock.module.css';

const DatePickerModal = ({ isOpen, onClose, onConfirm, initialDate = null }) => {
  const [selectedDate, setSelectedDate] = useState(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState(
    new Date().toTimeString().slice(0, 5)
  );
  const [showCalendar, setShowCalendar] = useState(false);

  const handleConfirm = () => {
    const datetime = `${selectedDate}T${selectedTime}:00`;
    onConfirm(datetime);
    onClose();
  };

  const handleQuickSelect = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Select Date & Time</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.form} style={{ padding: '24px' }}>
          <div className={styles.inputGroup}>
            <label className="font-semibold text-sm flex items-center gap-2 mb-2">
              <Calendar size={16} />
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              style={{ fontSize: '16px', padding: '12px' }}
            />
            
            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickSelect(0)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(1)}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(-1)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(-7)}
                className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
              >
                Last Week
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className="font-semibold text-sm flex items-center gap-2 mb-2">
              <Clock size={16} />
              Select Time
            </label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              required
              style={{ fontSize: '16px', padding: '12px' }}
            />
            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedTime('09:00')}
                className="px-3 py-1 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
              >
                Morning (9 AM)
              </button>
              <button
                type="button"
                onClick={() => setSelectedTime('14:00')}
                className="px-3 py-1 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
              >
                Afternoon (2 PM)
              </button>
              <button
                type="button"
                onClick={() => setSelectedTime('18:00')}
                className="px-3 py-1 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
              >
                Evening (6 PM)
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const hours = now.getHours().toString().padStart(2, '0');
                  const minutes = now.getMinutes().toString().padStart(2, '0');
                  setSelectedTime(`${hours}:${minutes}`);
                }}
                className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
              >
                Current Time
              </button>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="button" onClick={handleConfirm} className={styles.submitBtn}>
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatePickerModal;