// src/components/dashboards/admin/components/UserTable.js
import React from 'react';

const UserTable = ({ users, onEdit, onDelete }) => {
  if (!users || users.length === 0) {
    return <p>No users found.</p>;
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
          <th style={thStyle}>Username</th>
          <th style={thStyle}>Email</th>
          <th style={thStyle}>Roles</th>
          <th style={thStyle}>Vessels</th>
          <th style={thStyle}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map(user => (
          <tr key={user.rdsData.user_id}>
            <td style={thTdStyle}>{user.rdsData.cognito_username}</td>
            <td style={thTdStyle}>{user.rdsData.email}</td>
            <td style={thTdStyle}>{user.rdsData.roles ? user.rdsData.roles.join(', ') : 'N/A'}</td>
            <td style={thTdStyle}>{user.rdsData.assigned_vessels ? user.rdsData.assigned_vessels.join(', ') : 'N/A'}</td>
            <td style={thTdStyle}>
              <button style={editButtonStyle} onClick={() => onEdit(user)}>Edit</button>
              <button style={deleteButtonStyle} onClick={() => onDelete(user.rdsData.user_id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default UserTable;