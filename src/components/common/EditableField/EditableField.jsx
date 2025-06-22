/* common/EditableField/EditableField.jsx */
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faCheck, faTimes, faSpinner, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import ReactDOM from 'react-dom';

import styles from './EditableField.module.css';
import OverrideInfoPopover from './OverrideInfoPopover';
import CustomDatePicker from './CustomDatePicker';
import { TextTooltip } from '../../common/Table/Tooltip';

const EditableField = ({ value, onSave, type = 'text', placeholder = 'N/A', isSaving, hasOverride = false, originalValue, onResetToOriginal, isInvalidDate = false, validationMessage = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [showPopover, setShowPopover] = useState(false);
  const [showCustomDatePicker, setShowCustomCustomDatePicker] = useState(false);
  const inputRef = useRef(null);
  const infoIconRef = useRef(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current && type !== 'date' && type !== 'datetime-local') {
      inputRef.current.focus();
    }
  }, [isEditing, type]);

  const handleEditClick = (e) => {
    e.stopPropagation();

    if (type === 'date' || type === 'datetime-local') {
      setShowCustomCustomDatePicker(true);
    } else {
      setIsEditing(true);
    }

    setShowPopover(false);
  };

  const handleChange = (e) => {
    setCurrentValue(e.target.value);
  };

  const handleDateConfirm = (newDate) => {
    if (newDate !== currentValue) {
      onSave(newDate); // Call onSave immediately for date picker
    }
    setShowCustomCustomDatePicker(false);
    setIsEditing(false); // Exit editing mode after date selection
  };

  const handleDateCancel = () => {
    setShowCustomCustomDatePicker(false);
    setIsEditing(false); // Exit editing mode on cancel
  };

  const handleSave = async () => {
    if (currentValue !== value) {
      await onSave(currentValue);
    }
    setIsEditing(false);
    setShowPopover(false);
  };

  const handleCancel = () => {
    setCurrentValue(value);
    setIsEditing(false);
    setShowPopover(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Helper function to format datetime-local without timezone conversion
  const formatDatetimeLocal = (val) => {
    if (!val) return placeholder;
    
    // If it's already in the correct format (YYYY-MM-DDTHH:mm), use it as-is
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
      // Extract the datetime part and format for display
      const [datePart, timePart] = val.split('T');
      const [year, month, day] = datePart.split('-');
      const [hour, minute] = timePart.split(':');
      
      // Create a display format without timezone conversion
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = months[parseInt(month) - 1];
      
      return `${monthName} ${parseInt(day)}, ${year}, ${hour}:${minute}`;
    }
    
    // For other formats, try to parse but handle timezone carefully
    try {
      const date = new Date(val);
      if (isNaN(date.getTime())) return String(val);
      
      // Convert to local datetime string without timezone shift
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = months[parseInt(month) - 1];
      
      return `${monthName} ${parseInt(day)}, ${year}, ${hour}:${minute}`;
    } catch (error) {
      return String(val);
    }
  };

  const formatDisplayValue = (val, fieldType) => {
    if (!val) return placeholder;

    // Handle datetime-local separately to prevent timezone conversion
    if (fieldType === 'datetime-local') {
      return formatDatetimeLocal(val);
    }

    try {
      const date = new Date(val);
      if (isNaN(date.getTime())) return String(val);

      if (fieldType === 'date') {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
    } catch (error) {
      return String(val);
    }
    return String(val);
  };

  const handleInfoIconClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPopover(prev => !prev);
  };

  const handleResetClick = (e) => {
    e.stopPropagation();
    if (onResetToOriginal) {
      onResetToOriginal();
    }
    setShowPopover(false);
  };

  const displayValueContent = (
    <span className={`${styles.value} ${isInvalidDate ? styles.invalidValue : ''}`}>
      {formatDisplayValue(currentValue, type)}
    </span>
  );

  return (
    <div className={`${styles.container} ${hasOverride ? styles.hasOverride : ''} ${isInvalidDate ? styles.isInvalidDate : ''}`}>
      {isEditing ? (
        <div className={styles.inputGroup}>
          <input
            ref={inputRef}
            type={type}
            value={currentValue}
            onChange={handleChange}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={styles.input}
          />
          <div className={styles.actions}>
            {isSaving ? (
              <FontAwesomeIcon icon={faSpinner} spin className={styles.spinner} />
            ) : (
              <>
                <button onClick={handleSave} className={styles.saveBtn}>
                  <FontAwesomeIcon icon={faCheck} />
                </button>
                <button onClick={handleCancel} className={styles.cancelBtn}>
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </>
            )}
          </div>
        </div>
      ) : showCustomDatePicker ? (
        <CustomDatePicker
          value={currentValue}
          onChange={handleDateConfirm}
          onCancel={handleDateCancel}
          type={type}
        />
      ) : (
        <div className={styles.displayGroup} onClick={handleEditClick}>
          {isInvalidDate ? (
            <TextTooltip text={validationMessage}>
              {displayValueContent}
            </TextTooltip>
          ) : (
            displayValueContent
          )}

          {hasOverride && ( // Removed !isInvalidDate condition to always show info icon if override exists
            <div className={styles.overrideInfoContainer}>
              <FontAwesomeIcon
                icon={faInfoCircle}
                className={styles.overrideInfoIcon}
                ref={infoIconRef}
                onClick={handleInfoIconClick}
              />
              {showPopover && (
                <OverrideInfoPopover
                  show={showPopover}
                  currentValue={currentValue}
                  originalValue={originalValue}
                  type={type}
                  formatDisplayValue={formatDisplayValue}
                  onResetToOriginal={handleResetClick}
                  onClose={() => setShowPopover(false)}
                  targetRef={infoIconRef}
                />
              )}
            </div>
          )}
          <FontAwesomeIcon
            icon={faPencilAlt}
            className={styles.icon}
          />
        </div>
      )}
    </div>
  );
};

EditableField.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSave: PropTypes.func.isRequired,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  isSaving: PropTypes.bool,
  hasOverride: PropTypes.bool,
  originalValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onResetToOriginal: PropTypes.func,
  isInvalidDate: PropTypes.bool,
  validationMessage: PropTypes.string,
};

export default EditableField;