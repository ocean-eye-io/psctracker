// src/components/dashboards/admin/components/VesselForm.js
import React, { useState, useEffect } from 'react';

const VesselForm = ({ vessel, onSubmit, onClose }) => {
  const [vesselName, setVesselName] = useState('');
  const [imoNumber, setImoNumber] = useState('');

  useEffect(() => {
    if (vessel) {
      setVesselName(vessel.vessel_name || '');
      setImoNumber(vessel.imo_number || '');
    } else {
      setVesselName('');
      setImoNumber('');
    }
  }, [vessel]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ vessel_name: vesselName, imo_number: imoNumber });
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
        <h3>{vessel ? 'Edit Vessel' : 'Add New Vessel'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Vessel Name:</label>
            <input
              type="text"
              value={vesselName}
              onChange={(e) => setVesselName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>IMO Number:</label>
            <input
              type="text"
              value={imoNumber}
              onChange={(e) => setImoNumber(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={buttonContainerStyle}>
            <button type="submit" style={submitButtonStyle}>{vessel ? 'Update Vessel' : 'Create Vessel'}</button>
            <button type="button" onClick={onClose} style={cancelButtonStyle}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VesselForm;