// src/components/dashboards/admin/components/VesselTable.js
import React from 'react';
import styles from '../admin.module.css';

const VesselTable = ({ vessels, onEdit, onDelete }) => {
  if (!vessels || vessels.length === 0) {
    return <p className={styles.emptyTableMessage}>No vessels found.</p>;
  }

  return (
    <table className={styles.dataTable}>
      <thead>
        <tr>
          <th><div className={styles.tableHeaderContent}>Vessel Name</div></th>
          <th><div className={styles.tableHeaderContent}>IMO Number</div></th>
          <th className={styles.actionsCell}><div className={styles.tableHeaderContent}>Actions</div></th>
        </tr>
      </thead>
      <tbody>
        {vessels.map(vessel => (
          <tr key={vessel.vessel_id} className={styles.dataRow}>
            <td><div className={styles.cellContent}>{vessel.vessel_name}</div></td>
            <td><div className={styles.cellContent}>{vessel.imo_number || 'N/A'}</div></td>
            <td className={styles.actionsCell}>
              <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                <button className={styles.actionButton} onClick={() => onEdit(vessel)}>Edit</button>
                <button className={styles.actionButton} style={{ backgroundColor: 'rgba(255, 82, 82, 0.15)', borderColor: 'rgba(255, 82, 82, 0.3)', color: 'var(--negative-color)' }} onClick={() => onDelete(vessel.vessel_id)}>Delete</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default VesselTable;