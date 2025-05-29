// src/components/dashboards/admin/components/CustomDualListBox.jsx
import React, { useState, useEffect } from 'react';
import styles from '../admin.module.css'; // Import the CSS module

const CustomDualListBox = ({
  title,
  items,
  selectedItems,
  onItemSelect,
  searchTerm,
  onSearchChange,
  idKey = 'id', // Default key for unique identification
  displayKey = 'name', // Default key for display name
  secondaryDisplayKey = null, // Optional secondary key for display (e.g., IMO number)
}) => {
  const [internalSelected, setInternalSelected] = useState(selectedItems);

  useEffect(() => {
    setInternalSelected(selectedItems);
  }, [selectedItems]);

  const handleToggleAll = (e) => {
    if (e.target.checked) {
      onItemSelect(items.map(item => item[idKey]));
    } else {
      onItemSelect([]);
    }
  };

  const handleItemClick = (itemId) => {
    const newSelected = internalSelected.includes(itemId)
      ? internalSelected.filter(id => id !== itemId)
      : [...internalSelected, itemId];
    onItemSelect(newSelected);
  };

  const isAllSelected = items.length > 0 && internalSelected.length === items.length;
  const isIndeterminate = internalSelected.length > 0 && internalSelected.length < items.length;

  return (
    <div className={styles.listColumn}>
      <h5 className={styles.listHeader}>{title} ({items.length})</h5>
      <input
        type="text"
        placeholder={`Search ${title.toLowerCase()}...`}
        className={styles.formInput}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className={styles.selectAllContainer}>
        <input
          type="checkbox"
          id={`select-all-${title}`}
          className={styles.moduleCheckboxInput}
          checked={isAllSelected}
          onChange={handleToggleAll}
          ref={input => {
            if (input) input.indeterminate = isIndeterminate;
          }}
        />
        <label htmlFor={`select-all-${title}`} className={styles.moduleCheckboxLabel}>
          Select All
        </label>
      </div>
      <div className={styles.customVesselList}>
        {items.length > 0 ? (
          items.map(item => (
            <div
              key={item[idKey]}
              className={`${styles.customVesselListItem} ${internalSelected.includes(item[idKey]) ? styles.selected : ''}`}
              onClick={() => handleItemClick(item[idKey])}
            >
              <input
                type="checkbox"
                checked={internalSelected.includes(item[idKey])}
                onChange={() => {}} // Handled by div click
                className={styles.moduleCheckboxInput}
              />
              <span className={styles.moduleCheckboxLabel}>
                {item[displayKey]} {secondaryDisplayKey && item[secondaryDisplayKey] ? `(${item[secondaryDisplayKey]})` : ''}
              </span>
            </div>
          ))
        ) : (
          <div className={styles.noResults}>No {title.toLowerCase()} found</div>
        )}
      </div>
    </div>
  );
};

export default CustomDualListBox;