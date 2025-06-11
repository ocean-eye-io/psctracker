// src/components/dashboards/admin/components/RoleTable.js
import React from 'react';
import styles from '../admin.module.css'; // Correct path for CSS Module

const RoleTable = ({ roles, onEdit, onDelete }) => {
  if (!roles || roles.length === 0) {
    return <p className={styles.emptyTableMessage}>No roles found.</p>; 
  }

  // Helper to render a checkmark or cross for boolean values
  const renderBoolean = (value) => {
    return value ? '✅' : '❌';
  };

  return (
    <table className={styles.dataTable}> 
      <thead>
        <tr>
          <th><div className={styles.tableHeaderContent}>Role Name</div></th> 
          <th><div className={styles.tableHeaderContent}>Description</div></th>
          <th><div className={styles.tableHeaderContent}>Create</div></th>
          <th><div className={styles.tableHeaderContent}>Read</div></th>
          <th><div className={styles.tableHeaderContent}>Update</div></th>
          <th><div className={styles.tableHeaderContent}>Delete</div></th>
          <th className={styles.actionsCell}><div className={styles.tableHeaderContent}>Actions</div></th> 
        </tr>
      </thead>
      <tbody>
        {roles.map((role) => (
          <tr key={role.role_id} className={styles.dataRow}> 
            <td><div className={styles.cellContent}>{role.role_name}</div></td> 
            <td><div className={styles.cellContent}>{role.description || 'N/A'}</div></td>
            <td><div className={styles.cellContent}>{renderBoolean(role.can_create)}</div></td>
            <td><div className={styles.cellContent}>{renderBoolean(role.can_read)}</div></td>
            <td><div className={styles.cellContent}>{renderBoolean(role.can_update)}</div></td>
            <td><div className={styles.cellContent}>{renderBoolean(role.can_delete)}</div></td>
            <td className={styles.actionsCell}> 
              <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                <button className={styles.actionButton} onClick={() => onEdit(role)}>Edit</button> 
                <button className={styles.actionButton} style={{ backgroundColor: 'rgba(255, 82, 82, 0.15)', borderColor: 'rgba(255, 82, 82, 0.3)', color: 'var(--negative-color)' }} onClick={() => onDelete(role.role_id)}>Delete</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default RoleTable;