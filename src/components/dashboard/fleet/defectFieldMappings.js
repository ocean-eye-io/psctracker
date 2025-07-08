// src/config/defectFieldMappings.js
// Field mappings for defects to match your database structure

export const DEFECT_FIELDS = {
    // Table columns for main defect display
    TABLE: {
      equipment: {
        dbField: 'Equipments',          // matches your DB column
        label: 'Equipment',
        priority: 1,
        width: '200px',
        minWidth: '150px',
        sortable: true
      },
      description: {
        dbField: 'Description',         // matches your DB column
        label: 'Description',
        priority: 2,
        width: '300px',
        minWidth: '200px',
        sortable: true
      },
      criticality: {
        dbField: 'Criticality',         // matches your DB column
        label: 'Priority',
        priority: 3,
        width: '100px',
        minWidth: '80px',
        sortable: true
      },
      status: {
        dbField: 'Status',              // maps to Status_Vessel in DB
        label: 'Status',
        priority: 4,
        width: '100px',
        minWidth: '80px',
        sortable: true
      },
      action_planned: {
        dbField: 'Action Planned',      // maps to Action_Planned in DB
        label: 'Planned Action',
        priority: 5,
        width: '250px',
        minWidth: '200px',
        sortable: false
      },
      date_reported: {
        dbField: 'Date Reported',       // maps to Date_Reported in DB
        label: 'Reported',
        priority: 6,
        width: '120px',
        minWidth: '100px',
        sortable: true
      }
    },
  
    // Expanded view fields (for detailed view)
    EXPANDED: {
      target_date: {
        dbField: 'target_date',
        label: 'Target Completion',
        priority: 1
      },
      date_completed: {
        dbField: 'Date Completed',      // maps to Date_Completed in DB
        label: 'Date Completed',
        priority: 2
      },
      comments: {
        dbField: 'Comments',            // matches your DB column
        label: 'Comments',
        priority: 3
      },
      raised_by: {
        dbField: 'raised_by',
        label: 'Reported By',
        priority: 4
      },
      closure_comments: {
        dbField: 'closure_comments',
        label: 'Closure Notes',
        priority: 5
      }
    },
  
    // Status mappings for display
    STATUS_MAPPINGS: {
      'OPEN': {
        label: 'Open',
        color: '#dc3545',
        bgColor: '#fff5f5',
        borderColor: '#fecaca'
      },
      'IN PROGRESS': {
        label: 'In Progress',
        color: '#f59e0b',
        bgColor: '#fffbeb',
        borderColor: '#fed7aa'
      },
      'CLOSED': {
        label: 'Closed',
        color: '#059669',
        bgColor: '#f0fdf4',
        borderColor: '#bbf7d0'
      }
    },
  
    // Criticality mappings for display
    CRITICALITY_MAPPINGS: {
      'High': {
        label: 'Critical',
        color: '#dc3545',
        bgColor: '#fff1f2',
        borderColor: '#fecaca'
      },
      'Medium': {
        label: 'Medium',
        color: '#f59e0b',
        bgColor: '#fffbeb',
        borderColor: '#fed7aa'
      },
      'Low': {
        label: 'Low',
        color: '#059669',
        bgColor: '#f0fdf4',
        borderColor: '#bbf7d0'
      }
    }
  };
  
  // Helper function to get status styling
  export const getStatusStyling = (status) => {
    const statusUpper = status?.toUpperCase();
    return DEFECT_FIELDS.STATUS_MAPPINGS[statusUpper] || {
      label: status || 'Unknown',
      color: '#6b7280',
      bgColor: '#f9fafb',
      borderColor: '#e5e7eb'
    };
  };
  
  // Helper function to get criticality styling
  export const getCriticalityStyling = (criticality) => {
    const criticalityCapitalized = criticality?.charAt(0).toUpperCase() + criticality?.slice(1).toLowerCase();
    return DEFECT_FIELDS.CRITICALITY_MAPPINGS[criticalityCapitalized] || {
      label: criticality || 'Unknown',
      color: '#6b7280',
      bgColor: '#f9fafb',
      borderColor: '#e5e7eb'
    };
  };
  
  // API field name to display name mapping
  export const API_TO_DISPLAY_MAPPING = {
    'Equipments': 'Equipment',
    'Description': 'Description',
    'Action Planned': 'Planned Action',
    'Criticality': 'Priority',
    'Status': 'Status',
    'Date Reported': 'Date Reported',
    'Date Completed': 'Date Completed',
    'Comments': 'Comments',
    'target_date': 'Target Date',
    'raised_by': 'Reported By',
    'closure_comments': 'Closure Comments'
  };
  
  export default DEFECT_FIELDS;