// src/components/dashboards/admin/components/RoleForm.js
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config'; // Updated import path

const RoleForm = ({ role, onSubmit, onClose }) => {
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState([]); // Array of permission names

  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(null);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      setOptionsError(null);
      try {
        const idToken = localStorage.getItem('idToken');
        const headers = { 'Authorization': `Bearer ${idToken}` };

        const response = await fetch(`${API_BASE_URL}/admin/permissions`, { headers });

        if (!response.ok) throw new Error('Failed to fetch permissions');

        const data = await response.json();
        setAvailablePermissions(data);

      } catch (err) {
        console.error("Error fetching form options:", err);
        setOptionsError(err.message);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (role) {
      setRoleName(role.role_name || '');
      setDescription(role.description || '');
      setPermissions(role.assigned_permissions || []);
    } else {
      setRoleName('');
      setDescription('');
      setPermissions([]);
    }
  }, [role]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ role_name: roleName, description, permissions });
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
    width: '500px',
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

  const selectStyle = {
    width: '100%',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    minHeight: '100px', // For multiple select
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

  if (loadingOptions) return <div style={modalStyle}><p style={{color: 'white'}}>Loading form options...</p></div>;
  if (optionsError) return <div style={modalStyle}><p style={{color: 'red'}}>Error loading options: {optionsError}</p></div>;

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <h3>{role ? 'Edit Role' : 'Add New Role'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Role Name:</label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              required
              disabled={!!role} // Disable role name edit for existing roles
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
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Permissions (Ctrl/Cmd + click to select multiple):</label>
            <select
              multiple
              value={permissions}
              onChange={(e) =>
                setPermissions(Array.from(e.target.selectedOptions, (option) => option.value))
              }
              style={selectStyle}
            >
              {availablePermissions.map((perm) => (
                <option key={perm.permission_id} value={perm.permission_name}>
                  {perm.permission_name}
                </option>
              ))}
            </select>
          </div>
          <div style={buttonContainerStyle}>
            <button type="submit" style={submitButtonStyle}>{role ? 'Update Role' : 'Create Role'}</button>
            <button type="button" onClick={onClose} style={cancelButtonStyle}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleForm;