// src/components/dashboards/admin/components/PermissionTable.js
import React from 'react';

const PermissionTable = ({ permissions, onEdit, onDelete }) => {
  if (!permissions || permissions.length === 0) {
    return <p>No permissions found.</p>;
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
          <th style={thStyle}>Permission Name</th>
          <th style={thStyle}>Description</th>
          <th style={thStyle}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {permissions.map(permission => (
          <tr key={permission.permission_id}>
            <td style={thTdStyle}>{permission.permission_name}</td>
            <td style={thTdStyle}>{permission.description || 'N/A'}</td>
            <td style={thTdStyle}>
              <button style={editButtonStyle} onClick={() => onEdit(permission)}>Edit</button>
              <button style={deleteButtonStyle} onClick={() => onDelete(permission.permission_id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default PermissionTable;