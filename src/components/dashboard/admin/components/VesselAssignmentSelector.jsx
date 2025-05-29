// src/components/dashboards/admin/components/VesselAssignmentSelector.jsx
import React, { useState, useEffect } from 'react';
import CustomDualListBox from './CustomDualListBox'; // Import the new component
import styles from '../admin.module.css'; // Import the CSS module

const VesselAssignmentSelector = ({ allVessels, initialAssignedVesselIds, onSave }) => {
  const [availableVessels, setAvailableVessels] = useState([]);
  const [assignedVessels, setAssignedVessels] = useState([]);
  const [availableSearchTerm, setAvailableSearchTerm] = useState('');
  const [assignedSearchTerm, setAssignedSearchTerm] = useState('');
  const [selectedAvailableIds, setSelectedAvailableIds] = useState([]);
  const [selectedAssignedIds, setSelectedAssignedIds] = useState([]);

  useEffect(() => {
    // Initialize lists based on allVessels and initialAssignedVesselIds
    const assigned = allVessels.filter(v => initialAssignedVesselIds.includes(v.vessel_id));
    const available = allVessels.filter(v => !initialAssignedVesselIds.includes(v.vessel_id));

    setAssignedVessels(assigned);
    setAvailableVessels(available);
    setSelectedAvailableIds([]);
    setSelectedAssignedIds([]);
  }, [allVessels, initialAssignedVesselIds]);

  const filterVessels = (vesselList, searchTerm) => {
    if (!searchTerm) return vesselList;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return vesselList.filter(vessel =>
      vessel.vessel_name.toLowerCase().includes(lowerCaseSearchTerm) ||
      (vessel.imo_number && vessel.imo_number.toLowerCase().includes(lowerCaseSearchTerm))
    );
  };

  const handleMoveToAssigned = () => {
    const vesselsToMove = availableVessels.filter(v => selectedAvailableIds.includes(v.vessel_id));
    const newAssigned = [...assignedVessels, ...vesselsToMove].sort((a, b) => a.vessel_name.localeCompare(b.vessel_name));
    const newAvailable = availableVessels.filter(v => !selectedAvailableIds.includes(v.vessel_id));

    setAssignedVessels(newAssigned);
    setAvailableVessels(newAvailable);
    setSelectedAvailableIds([]); // Clear selection after moving
  };

  const handleMoveToAvailable = () => {
    const vesselsToMove = assignedVessels.filter(v => selectedAssignedIds.includes(v.vessel_id));
    const newAvailable = [...availableVessels, ...vesselsToMove].sort((a, b) => a.vessel_name.localeCompare(b.vessel_name));
    const newAssigned = assignedVessels.filter(v => !selectedAssignedIds.includes(v.vessel_id));

    setAvailableVessels(newAvailable);
    setAssignedVessels(newAssigned);
    setSelectedAssignedIds([]); // Clear selection after moving
  };

  const handleSave = () => {
    const currentAssignedIds = assignedVessels.map(v => v.vessel_id);
    onSave(currentAssignedIds);
  };

  const filteredAvailableVessels = filterVessels(availableVessels, availableSearchTerm);
  const filteredAssignedVessels = filterVessels(assignedVessels, assignedSearchTerm);

  return (
    <div className={styles.vesselAssignmentContainer}>
      <div className={styles.dualListBox}>
        {/* Available Vessels Column */}
        <CustomDualListBox
          title="Available Vessels"
          items={filteredAvailableVessels}
          selectedItems={selectedAvailableIds}
          onItemSelect={setSelectedAvailableIds}
          searchTerm={availableSearchTerm}
          onSearchChange={setAvailableSearchTerm}
          idKey="vessel_id"
          displayKey="vessel_name"
          secondaryDisplayKey="imo_number"
        />

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button
            onClick={handleMoveToAssigned}
            disabled={selectedAvailableIds.length === 0}
            className={`${styles.actionButton} ${styles.moveButton}`}
          >
            &gt; Add &gt;
          </button>
          <button
            onClick={handleMoveToAvailable}
            disabled={selectedAssignedIds.length === 0}
            className={`${styles.actionButton} ${styles.moveButton}`}
          >
            &lt; Remove &lt;
          </button>
        </div>

        {/* Assigned Vessels Column */}
        <CustomDualListBox
          title="Assigned Vessels"
          items={filteredAssignedVessels}
          selectedItems={selectedAssignedIds}
          onItemSelect={setSelectedAssignedIds}
          searchTerm={assignedSearchTerm}
          onSearchChange={setAssignedSearchTerm}
          idKey="vessel_id"
          displayKey="vessel_name"
          secondaryDisplayKey="imo_number"
        />
      </div>

      <div className={styles.formActions} style={{ marginTop: '20px', justifyContent: 'center' }}>
        <button onClick={handleSave} className={`${styles.submitButton}`}> {/* Using submitButton for consistency */}
          Save Assignments
        </button>
      </div>
    </div>
  );
};

export default VesselAssignmentSelector;