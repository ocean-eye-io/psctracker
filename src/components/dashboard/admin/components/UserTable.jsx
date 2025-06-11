// src/components/dashboards/admin/components/UserTable.js
import React from 'react';
import styles from '../admin.module.css'; // Import as 'styles'

const UserTable = ({ users, onEdit, onDelete, onSync, allModules }) => {
  if (!users || users.length === 0) {
    return <p className={styles.emptyTableMessage}>No users found.</p>; // Use CSS Module class
  }

  const getUserEmail = (cognitoUser) => {
    return cognitoUser.Attributes.find(attr => attr.Name === 'email')?.Value || 'N/A';
  };

  const getUserStatus = (cognitoUser) => {
    return cognitoUser.UserStatus || 'N/A';
  };

  const renderRole = (roleName) => {
    if (!roleName) {
      return <span className={`${styles.badge} ${styles.badgeInfo}`}>No Role</span>; // Use CSS Module classes
    }
    return <span className={`${styles.badge} ${styles.badgeInfo}`}>{roleName}</span>; // Use CSS Module classes
  };

  const getModuleNames = (moduleIds) => {
    if (!moduleIds || moduleIds.length === 0) return 'None';
    return moduleIds.map(id => {
      const module = allModules.find(m => m.module_id === id);
      return module ? module.module_name : 'Unknown Module';
    }).join(', ');
  };

  return (
    <table className={styles.dataTable}> 
      <thead>
        <tr>
          <th><div className={styles.tableHeaderContent}>Username</div></th> 
          <th><div className={styles.tableHeaderContent}>Email</div></th>
          <th><div className={styles.tableHeaderContent}>Status</div></th>
          <th><div className={styles.tableHeaderContent}>Role</div></th>
          <th><div className={styles.tableHeaderContent}>Vessels</div></th>
          <th><div className={styles.tableHeaderContent}>Modules</div></th>
          <th className={styles.actionsCell}><div className={styles.tableHeaderContent}>Actions</div></th> 
        </tr>
      </thead>
      <tbody>
        {users.map(user => {
          const cognitoUser = user.cognitoUser;
          const rdsData = user.rdsData;
          const isSynced = rdsData && rdsData.user_id;

          return (
            <tr key={cognitoUser.Username} className={styles.dataRow}> 
              <td><div className={styles.cellContent}>{cognitoUser.Username}</div></td> 
              <td><div className={styles.cellContent}>{getUserEmail(cognitoUser)}</div></td>
              <td>
                <div className={styles.cellContent}>
                  <span className={`${styles.statusIndicator} ${getUserStatus(cognitoUser) === 'CONFIRMED' ? styles.statusGreen : styles.statusYellow}`}> {/* Use CSS Module classes */}
                    <span className={`${styles.statusDot} ${getUserStatus(cognitoUser) === 'CONFIRMED' ? styles.statusGreen : styles.statusYellow}`}></span> {/* Use CSS Module classes */}
                    {getUserStatus(cognitoUser)}
                  </span>
                </div>
              </td>
              <td><div className={styles.cellContent}>{renderRole(rdsData.role_name)}</div></td>
              <td><div className={styles.cellContent}>{rdsData.assigned_vessels && rdsData.assigned_vessels.length > 0 ? rdsData.assigned_vessels.join(', ') : 'N/A'}</div></td>
              <td><div className={styles.cellContent}>{getModuleNames(rdsData.assigned_modules)}</div></td>
              <td className={styles.actionsCell}> 
                <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                  {isSynced ? (
                    <>
                      <button className={styles.actionButton} onClick={() => onEdit(user)}>Edit</button> 
                      <button className={styles.actionButton} style={{ backgroundColor: 'rgba(255, 82, 82, 0.15)', borderColor: 'rgba(255, 82, 82, 0.3)', color: 'var(--negative-color)' }} onClick={() => onDelete(user)}>Delete</button>
                    </>
                  ) : (
                    <button className={styles.actionButton} style={{ backgroundColor: 'rgba(77, 195, 255, 0.15)', borderColor: 'rgba(77, 195, 255, 0.3)', color: 'var(--blue-accent)' }} onClick={() => onSync(cognitoUser)}>Sync to RDS</button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default UserTable;