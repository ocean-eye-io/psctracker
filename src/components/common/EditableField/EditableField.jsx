/* common/EditableField/EditableField.jsx */
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faCheck, faTimes, faSpinner, faInfoCircle } from '@fortawesome/free-solid-svg-icons'; // Removed faExclamationCircle
import ReactDOM from 'react-dom';

import styles from './EditableField.module.css'; // Import CSS module for EditableField
import OverrideInfoPopover from './OverrideInfoPopover'; // Import the extracted popover
import CustomDatePicker from './CustomDatePicker'; // Import the extracted date picker
import { TextTooltip } from '../../common/Table/Tooltip'; // Import TextTooltip

const EditableField = ({ value, onSave, type = 'text', placeholder = 'N/A', isSaving, hasOverride = false, originalValue, onResetToOriginal, isInvalidDate = false, validationMessage = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [showPopover, setShowPopover] = useState(false);
  const [showCustomDatePicker, setShowCustomCustomDatePicker] = useState(false);
  const inputRef = useRef(null);
  const infoIconRef = useRef(null); // Ref for the info icon

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current && type !== 'date' && type !== 'datetime-local') {
      inputRef.current.focus();
    }
  }, [isEditing, type]);

  const handleEditClick = (e) => {
    e.stopPropagation(); // Stop propagation to prevent parent click handlers from interfering

    if (type === 'date' || type === 'datetime-local') {
      setShowCustomCustomDatePicker(true);
    } else {
      setIsEditing(true);
    }

    setShowPopover(false); // Ensure popover closes if editing starts
  };

  const handleChange = (e) => {
    setCurrentValue(e.target.value);
  };

  const handleDateConfirm = (newDate) => {
    if (newDate !== currentValue) {
      setCurrentValue(newDate);
      onSave(newDate);
    }
    setShowCustomCustomDatePicker(false);
  };

  const handleDateCancel = () => {
    setShowCustomDatePicker(false);
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

  const formatDisplayValue = (val, fieldType) => {
    if (!val) return placeholder;

    try {
      const date = new Date(val);
      if (isNaN(date.getTime())) return String(val);

      if (fieldType === 'date') {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      } else if (fieldType === 'datetime-local') {
        // Format as "Month Day, Year, HH:MM"
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
    } catch (error) {
      return String(val);
    }
    return String(val);
  };

  const handleInfoIconClick = (e) => {
    e.preventDefault(); // Prevent default behavior (e.g., if it's inside a link)
    e.stopPropagation(); // Stop event from bubbling up to parent elements (like editable-field-display)
    setShowPopover(prev => !prev); // Toggle the state
  };

  const handleResetClick = (e) => {
    e.stopPropagation(); // Prevent popover from closing immediately due to outside click handler
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

          {hasOverride && !isInvalidDate && ( // Only show override info if not invalid date
            <div className={styles.overrideInfoContainer}>
              <FontAwesomeIcon
                icon={faInfoCircle}
                className={styles.overrideInfoIcon}
                ref={infoIconRef} // Ensure ref is attached
                onClick={handleInfoIconClick} // Ensure click handler is here
              />
              {/* Render OverrideInfoPopover conditionally based on showPopover state */}
              {showPopover && (
                <OverrideInfoPopover
                  show={showPopover} // Pass the show state
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
  isInvalidDate: PropTypes.bool, // New prop
  validationMessage: PropTypes.string, // New prop
};

export default EditableField;