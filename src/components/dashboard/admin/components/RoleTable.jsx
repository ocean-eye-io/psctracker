// src/components/dashboards/admin/components/RoleTable.js
import React from 'react';

const RoleTable = ({ roles, onEdit, onDelete }) => {
  if (!roles || roles.length === 0) {
    return <p>No roles found.</p>;
  }

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  };

  const thTdStyle = {
    border: '1px solid #ddd',
    padding: '8px',
    textAlign: 'left',
  };

  const thStyle = {
    ...thTdStyle,
    backgroundColor: '#f2f2f2',
  };

  const buttonStyle = {
    padding: '5px 10px',
    marginRight: '5px',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
  };

  const editButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#28a745',
    color: 'white',
  };

  const deleteButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#dc3545',
    color: 'white',
  };

  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>Role Name</th>
          <th style={thStyle}>Description</th>
          <th style={thStyle}>Permissions</th>
          <th style={thStyle}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {roles.map(role => (
          <tr key={role.role_id}>
            <td style={thTdStyle}>{role.role_name}</td>
            <td style={thTdStyle}>{role.description || 'N/A'}</td>
            <td style={thTdStyle}>{role.assigned_permissions ? role.assigned_permissions.join(', ') : 'N/A'}</td>
            <td style={thTdStyle}>
              <button style={editButtonStyle} onClick={() => onEdit(role)}>Edit</button>
              <button style={deleteButtonStyle} onClick={() => onDelete(role.role_id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default RoleTable;