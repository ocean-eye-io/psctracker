// src/components/dashboards/admin/components/VesselTable.js
import React from 'react';

const VesselTable = ({ vessels, onEdit, onDelete }) => {
  if (!vessels || vessels.length === 0) {
    return <p>No vessels found.</p>;
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
          <th style={thStyle}>Vessel Name</th>
          <th style={thStyle}>IMO Number</th>
          <th style={thStyle}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {vessels.map(vessel => (
          <tr key={vessel.vessel_id}>
            <td style={thTdStyle}>{vessel.vessel_name}</td>
            <td style={thTdStyle}>{vessel.imo_number || 'N/A'}</td>
            <td style={thTdStyle}>
              <button style={editButtonStyle} onClick={() => onEdit(vessel)}>Edit</button>
              <button style={deleteButtonStyle} onClick={() => onDelete(vessel.vessel_id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default VesselTable;