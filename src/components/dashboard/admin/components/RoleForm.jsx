// src/components/dashboards/admin/components/RoleForm.js
import React, { useState, useEffect } from 'react';
import styles from '../admin.module.css'; 

const RoleForm = ({ role, onSubmit, onClose }) => {
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [canCreate, setCanCreate] = useState(false);
  const [canRead, setCanRead] = useState(false);
  const [canUpdate, setCanUpdate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    if (role) {
      setRoleName(role.role_name || '');
      setDescription(role.description || '');
      setCanCreate(role.can_create || false);
      setCanRead(role.can_read || false);
      setCanUpdate(role.can_update || false);
      setCanDelete(role.can_delete || false);
    } else {
      setRoleName('');
      setDescription('');
      setCanCreate(false);
      setCanRead(false);
      setCanUpdate(false);
      setCanDelete(false);
    }
  }, [role]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      role_name: roleName,
      description,
      can_create: canCreate,
      can_read: canRead,
      can_update: canUpdate,
      can_delete: canDelete,
    });
  };

  return (
    <div className={styles.modalOverlay}> 
      <div className={styles.modalContentBox}> 
        <h3 className={styles.modalHeader}>{role ? 'Edit Role' : 'Add New Role'}</h3> 
        <button className={styles.closeButton} onClick={onClose}> 
            &times;
        </button>
        <form onSubmit={handleSubmit} className={styles.formGrid}> 
          <div className={styles.formGroup}> 
            <label htmlFor="roleName" className={styles.label}>Role Name:</label> 
            <input
              type="text"
              id="roleName"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              required
              disabled={!!role}
              className={styles.input} 
            />
          </div>
          <div className={styles.formGroup}> 
            <label htmlFor="description" className={styles.label}>Description:</label> 
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.input} 
            />
          </div>
          <div className={styles.moduleCheckboxGroup}> 
            <label className={styles.label}>CRUD Permissions:</label> 
            <div className={styles.moduleCheckboxesContainer}> 
              <div className={styles.moduleCheckboxItem}> 
                <input
                  type="checkbox"
                  id="canCreate"
                  checked={canCreate}
                  onChange={(e) => setCanCreate(e.target.checked)}
                  className={styles.moduleCheckboxInput} 
                />
                <label htmlFor="canCreate" className={styles.moduleCheckboxLabel}>Create</label> 
              </div>
              <div className={styles.moduleCheckboxItem}>
                <input
                  type="checkbox"
                  id="canRead"
                  checked={canRead}
                  onChange={(e) => setCanRead(e.target.checked)}
                  className={styles.moduleCheckboxInput}
                />
                <label htmlFor="canRead" className={styles.moduleCheckboxLabel}>Read</label>
              </div>
              <div className={styles.moduleCheckboxItem}>
                <input
                  type="checkbox"
                  id="canUpdate"
                  checked={canUpdate}
                  onChange={(e) => setCanUpdate(e.target.checked)}
                  className={styles.moduleCheckboxInput}
                />
                <label htmlFor="canUpdate" className={styles.moduleCheckboxLabel}>Update</label>
              </div>
              <div className={styles.moduleCheckboxItem}>
                <input
                  type="checkbox"
                  id="canDelete"
                  checked={canDelete}
                  onChange={(e) => setCanDelete(e.target.checked)}
                  className={styles.moduleCheckboxInput}
                />
                <label htmlFor="canDelete" className={styles.moduleCheckboxLabel}>Delete</label>
              </div>
            </div>
          </div>
          <div className={styles.formActions}> 
            <button type="button" onClick={onClose} className={styles.cancelButton}>Cancel</button> 
            <button type="submit" className={styles.submitButton}>{role ? 'Update Role' : 'Create Role'}</button> 
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleForm;