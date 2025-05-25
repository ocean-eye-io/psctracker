// common/EditableField/CustomDatePicker.jsx
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import styles from './CustomDatePicker.module.css'; // Import CSS module

const CustomDatePicker = ({ value, onChange, onCancel, type }) => {
  const [selectedDate, setSelectedDate] = useState(value || '');
  const datePickerRef = useRef(null);
  const dateInputRef = useRef(null);

  useEffect(() => {
    // Focus and open the date picker when mounted
    if (dateInputRef.current) {
      dateInputRef.current.focus();
      setTimeout(() => {
        try {
          dateInputRef.current.showPicker();
        } catch (e) {
          // Fallback for browsers that don't support showPicker
          console.log("Browser doesn't support showPicker");
        }
      }, 50);
    }
  }, []);

  // Handle clicks outside the date picker
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const handleConfirm = () => {
    onChange(selectedDate);
  };

  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className={styles.container} ref={datePickerRef}>
      <div className={styles.inputContainer}>
        {type === 'date' ? (
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate ? new Date(selectedDate).toISOString().split('T')[0] : ''}
            onChange={handleDateChange}
            className={styles.input}
          />
        ) : (
          <input
            ref={dateInputRef}
            type="datetime-local"
            value={formatDateTimeLocal(selectedDate)}
            onChange={handleDateChange}
            className={styles.input}
          />
        )}
      </div>
      <button className={styles.confirmBtn} onClick={handleConfirm}>
        <FontAwesomeIcon icon={faCheck} />
      </button>
    </div>
  );
};

CustomDatePicker.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  type: PropTypes.string,
};

export default CustomDatePicker;