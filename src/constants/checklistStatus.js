// Create this as a new file: src/constants/checklistStatus.js
export const CHECKLIST_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress', 
  SUBMITTED: 'Submitted',
  ACKNOWLEDGED: 'Acknowledged'
};

export const STATUS_HIERARCHY = {
  [CHECKLIST_STATUS.PENDING]: 1,
  [CHECKLIST_STATUS.IN_PROGRESS]: 2,
  [CHECKLIST_STATUS.SUBMITTED]: 3,
  [CHECKLIST_STATUS.ACKNOWLEDGED]: 4 // Terminal status - highest priority
};

export const isStatusUpdateAllowed = (currentStatus, newStatus) => {
  // Acknowledged is terminal - cannot be changed
  if (currentStatus === CHECKLIST_STATUS.ACKNOWLEDGED) {
    return false;
  }
  
  // All other updates are allowed
  return true;
};

export const getHigherStatus = (status1, status2) => {
  const priority1 = STATUS_HIERARCHY[status1] || 0;
  const priority2 = STATUS_HIERARCHY[status2] || 0;
  return priority1 >= priority2 ? status1 : status2;
};
