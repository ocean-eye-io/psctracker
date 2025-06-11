// src/components/common/ui/dialog.jsx
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import styles from './dialog.module.css'; // Import the CSS module

// Main Dialog component (handles portal and overlay)
export const Dialog = ({ open, onOpenChange, children }) => {
  const [portalElement, setPortalElement] = useState(null);

  // Create the portal element only once on component mount
  useEffect(() => {
    const el = document.createElement('div');
    el.className = styles.dialogPortal; // Use CSS module class
    setPortalElement(el);

    return () => {
      // Clean up on unmount
      if (document.body.contains(el)) {
        document.body.removeChild(el);
      }
    };
  }, []);

  // Handle adding/removing the portal element based on the 'open' state
  useEffect(() => {
    if (!portalElement) return; // Skip if portal element isn't created yet

    console.log("Dialog portal effect. open:", open);

    if (open) {
      // Add the portal element to the body if it's not already there
      if (!document.body.contains(portalElement)) {
        console.log("Adding portal element to body");
        document.body.appendChild(portalElement);
      }
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    } else {
      // Remove the portal element from the body
      if (document.body.contains(portalElement)) {
        console.log("Removing portal element from body");
        document.body.removeChild(portalElement);
      }
      document.body.style.overflow = ''; // Restore scrolling
    }
  }, [open, portalElement]);

  // Don't render anything if not open or if portal element isn't ready
  if (!open || !portalElement) return null;

  return ReactDOM.createPortal(
    <div
      className={styles.dialogOverlay} // Use CSS module class
      onClick={(e) => {
        // Only close if clicking directly on the overlay, not on the content
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      {children}
    </div>,
    portalElement
  );
};

// Dialog Content (the actual modal box)
export const DialogContent = ({ className, children, onPointerDownOutside, onEscapeKeyDown, ...props }) => {
  const contentRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onEscapeKeyDown) {
        onEscapeKeyDown(event);
      }
    };

    const handleClickOutside = (event) => {
      if (contentRef.current && !contentRef.current.contains(event.target) && onPointerDownOutside) {
        onPointerDownOutside(event);
      }
    };

    // Always attach listeners - the Dialog component controls visibility
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onPointerDownOutside, onEscapeKeyDown]);

  return (
    <div
      ref={contentRef}
      className={`${styles.dialogContent} ${className || ''}`} // Use CSS module class
      {...props}
    >
      {children}
    </div>
  );
};

// Dialog Header
export const DialogHeader = ({ className, children, ...props }) => (
  <div className={`${styles.dialogHeader} ${className || ''}`} {...props}>
    {children}
  </div>
);

// Dialog Title
export const DialogTitle = ({ className, children, ...props }) => (
  <h3 className={`${styles.dialogTitle} ${className || ''}`} {...props}>
    {children}
  </h3>
);

// Dialog Description
export const DialogDescription = ({ className, children, ...props }) => (
  <p className={`${styles.dialogDescription} ${className || ''}`} {...props}>
    {children}
  </p>
);

// Dialog Body (scrollable content area)
export const DialogBody = ({ className, children, ...props }) => (
  <div
    className={`${styles.dialogBody} ${className || ''}`}
    {...props}
  >
    {children}
  </div>
);

// Dialog Footer
export const DialogFooter = ({ className, children, ...props }) => (
  <div className={`${styles.dialogFooter} ${className || ''}`} {...props}>
    {children}
  </div>
);

// Dialog Button
export const DialogButton = ({ className, variant, children, ...props }) => {
  const buttonClass = `${styles.dialogButton} ${variant ? styles[variant] : ''} ${className || ''}`;
  return (
    <button className={buttonClass} {...props}>
      {children}
    </button>
  );
};