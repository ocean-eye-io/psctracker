// common/EditableField/OverrideInfoPopover.jsx
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './OverrideInfoPopover.module.css'; // Import the CSS module
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Use FontAwesomeIcon
import { faTimes, faRedo } from '@fortawesome/free-solid-svg-icons'; // Import specific icons
import ReactDOM from 'react-dom';

const OverrideInfoPopover = ({
  show,
  currentValue,
  originalValue,
  type,
  formatDisplayValue,
  onResetToOriginal,
  onClose,
  targetRef
}) => {
  const popoverRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const calculatePosition = () => {
      if (targetRef.current && popoverRef.current) {
        const targetRect = targetRef.current.getBoundingClientRect();
        const popoverRect = popoverRef.current.getBoundingClientRect();

        // Position the popover below the target, centered horizontally
        let newTop = targetRect.bottom + 10; // 10px padding below
        let newLeft = targetRect.left + (targetRect.width / 2) - (popoverRect.width / 2);

        // Ensure popover doesn't go off-screen to the left
        if (newLeft < 0) {
          newLeft = 10; // 10px from left edge
        }

        // Ensure popover doesn't go off-screen to the right
        if (newLeft + popoverRect.width > window.innerWidth) {
          newLeft = window.innerWidth - popoverRect.width - 10; // 10px from right edge
        }

        // Ensure popover doesn't go off-screen to the bottom
        if (newTop + popoverRect.height > window.innerHeight) {
          newTop = targetRect.top - popoverRect.height - 10; // Position above if not enough space below
          if (newTop < 0) { // Fallback if not enough space above either
            newTop = targetRect.bottom + 10; // Default to below if no space
          }
        }

        setPosition({ top: newTop, left: newLeft });
      }
    };

    if (show) {
      // Recalculate position on show and on window resize
      calculatePosition();
      window.addEventListener('resize', calculatePosition);
    }

    return () => {
      window.removeEventListener('resize', calculatePosition);
    };
  }, [show, targetRef]);

  // Handle clicks outside the popover to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        targetRef.current &&
        !targetRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, onClose, targetRef]);

  if (!show) {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      ref={popoverRef}
      className={`${styles.overrideInfoPopover} ${show ? styles.animateFadeIn : ''}`}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
    >
      <div className={styles.popoverHeader}>
        <h4>Override Details</h4>
        <button onClick={onClose} className={styles.closePopoverBtn}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      <div className={styles.popoverContent}>
        <p><strong>Your Value:</strong> {formatDisplayValue(currentValue, type)}</p>
        <p><strong>System Value:</strong> {formatDisplayValue(originalValue, type)}</p>
        {originalValue !== currentValue && (
          <button onClick={onResetToOriginal} className={styles.resetOverrideBtn}>
            <FontAwesomeIcon icon={faRedo} /> Reset to System Value
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};

OverrideInfoPopover.propTypes = {
  show: PropTypes.bool.isRequired,
  currentValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  originalValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  type: PropTypes.string,
  formatDisplayValue: PropTypes.func.isRequired,
  onResetToOriginal: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  targetRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]).isRequired,
};

export default OverrideInfoPopover;