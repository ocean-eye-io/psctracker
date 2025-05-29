// src/components/dashboards/admin/components/VesselForm.js
import React, { useState, useEffect } from 'react';
import styles from '../admin.module.css';

const VesselForm = ({ vessel, onSubmit, onClose }) => {
  const [vesselName, setVesselName] = useState('');
  const [imoNumber, setImoNumber] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (vessel) {
      setVesselName(vessel.vessel_name || '');
      setImoNumber(vessel.imo_number || '');
    } else {
      setVesselName('');
      setImoNumber('');
    }
    setFormError('');
  }, [vessel]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!vesselName.trim()) {
      setFormError('Vessel Name is required.');
      return;
    }

    onSubmit({
      vessel_id: vessel ? vessel.vessel_id : undefined,
      vessel_name: vesselName.trim(),
      imo_number: imoNumber.trim() || null, // Send null if empty
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h4 className={styles.formHeader}>{vessel ? 'Edit Vessel' : 'Add New Vessel'}</h4>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="vesselName">Vessel Name:</label>
            <input
              type="text"
              id="vesselName"
              value={vesselName}
              onChange={(e) => setVesselName(e.target.value)}
              className={styles.formInput}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="imoNumber">IMO Number (Optional):</label>
            <input
              type="text"
              id="imoNumber"
              value={imoNumber}
              onChange={(e) => setImoNumber(e.target.value)}
              className={styles.formInput}
            />
          </div>

          {formError && <p className={styles.formError}>{formError}</p>}

          <div className={styles.formActions}>
            <button type="submit" className={`${styles.formButton} ${styles.saveButton}`}>
              {vessel ? 'Update Vessel' : 'Add Vessel'}
            </button>
            <button type="button" onClick={onClose} className={`${styles.formButton} ${styles.cancelButton}`}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VesselForm;