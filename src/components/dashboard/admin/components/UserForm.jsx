// src/components/dashboards/admin/components/UserForm.js
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config'; // Updated import path

const UserForm = ({ user, onSubmit, onClose }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState([]); // Array of role names
  const [vessels, setVessels] = useState([]); // Array of vessel IDs

  const [availableRoles, setAvailableRoles] = useState([]);
  const [availableVessels, setAvailableVessels] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(null);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      setOptionsError(null);
      try {
        const idToken = localStorage.getItem('idToken');
        const headers = { 'Authorization': `Bearer ${idToken}` };

        const [rolesRes, vesselsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/roles`, { headers }),
          fetch(`${API_BASE_URL}/admin/vessels`, { headers })
        ]);

        if (!rolesRes.ok) throw new Error('Failed to fetch roles');
        if (!vesselsRes.ok) throw new Error('Failed to fetch vessels');

        const rolesData = await rolesRes.json();
        const vesselsData = await vesselsRes.json();

        setAvailableRoles(rolesData);
        setAvailableVessels(vesselsData);

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
    if (user) {
      setUsername(user.rdsData.cognito_username || '');
      setEmail(user.rdsData.email || '');
      setRoles(user.rdsData.roles || []);
      setVessels(user.rdsData.assigned_vessels || []);
    } else {
      setUsername('');
      setEmail('');
      setPassword('');
      setRoles([]);
      setVessels([]);
    }
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ username, email, password, roles, vessels });
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
        <h3>{user ? 'Edit User' : 'Add New User'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={!!user}
              style={inputStyle}
            />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          {!user && (
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          )}
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Roles (Ctrl/Cmd + click to select multiple):</label>
            <select
              multiple
              value={roles}
              onChange={(e) =>
                setRoles(Array.from(e.target.selectedOptions, (option) => option.value))
              }
              style={selectStyle}
            >
              {availableRoles.map((role) => (
                <option key={role.role_id} value={role.role_name}>
                  {role.role_name}
                </option>
              ))}
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Vessels (Ctrl/Cmd + click to select multiple):</label>
            <select
              multiple
              value={vessels}
              onChange={(e) =>
                setVessels(Array.from(e.target.selectedOptions, (option) => option.value))
              }
              style={selectStyle}
            >
              {availableVessels.map((vessel) => (
                <option key={vessel.vessel_id} value={vessel.vessel_id}>
                  {vessel.vessel_name} ({vessel.imo_number})
                </option>
              ))}
            </select>
          </div>
          <div style={buttonContainerStyle}>
            <button type="submit" style={submitButtonStyle}>{user ? 'Update User' : 'Create User'}</button>
            <button type="button" onClick={onClose} style={cancelButtonStyle}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;