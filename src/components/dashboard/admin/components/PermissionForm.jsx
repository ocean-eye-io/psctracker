// src/components/dashboards/admin/components/PermissionForm.js
import React, { useState, useEffect } from 'react';

const PermissionForm = ({ permission, onSubmit, onClose }) => {
  const [permissionName, setPermissionName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (permission) {
      setPermissionName(permission.permission_name || '');
      setDescription(permission.description || '');
    } else {
      setPermissionName('');
      setDescription('');
    }
  }, [permission]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ permission_name: permissionName, description });
  };

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };

  const contentStyle = {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    width: '400px',
    maxHeight: '90vh',
    overflowY: 'auto',
  };

  const inputGroupStyle = {
    marginBottom: '15px',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
  };

  const inputStyle = {
    width: 'calc(100% - 20px)',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  };

  const buttonContainerStyle = {
    marginTop: '20px',
    textAlign: 'right',
  };

  const buttonStyle = {
    padding: '10px 15px',
    marginLeft: '10px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  };

  const submitButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#007bff',
    color: 'white',
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#6c757d',
    color: 'white',
  };

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <h3>{permission ? 'Edit Permission' : 'Add New Permission'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Permission Name:</label>
            <input
              type="text"
              value={permissionName}
              onChange={(e) => setPermissionName(e.target.value)}
              required
              disabled={!!permission} // Disable permission name edit for existing permissions
              style={inputStyle}
            />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Description:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{...inputStyle, minHeight: '80px'}}
            />
          </div>
          <div style={buttonContainerStyle}>
            <button type="submit" style={submitButtonStyle}>{permission ? 'Update Permission' : 'Create Permission'}</button>
            <button type="button" onClick={onClose} style={cancelButtonStyle}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PermissionForm;