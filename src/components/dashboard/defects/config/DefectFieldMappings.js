// src/dashboard/defects/config/defectFieldMappings.js

export const DEFECT_FIELDS = {
  // Dialog Fields
  DIALOG: {
    vessel: {
      id: 'vessel',
      label: 'Vessel',
      dbField: 'vessel_id',
      type: 'select',
      required: true,
      section: 'basic',
      displayOrder: 1,
      width: 'full', // w-full
    },
    equipment: {
      id: 'equipment',
      label: 'Equipment',
      dbField: 'Equipments',
      type: 'select',
      required: true,
      section: 'basic',
      displayOrder: 2,
      width: 'full',
      options: [
        "Air System and Air Compressor",
        "Airconditioning & Refrigeration System",
        "Cargo and Ballast System",
        "Deck Crane and Grab",
        "BWTS",
        "Aux Engine",
        "Main Engine",
        "LO System",
        "FO System",
        "FW and SW System",
        "Load line Item",
        "SOLAS",
        "MARPOL",
        "Navigation and Radio Equipment",
        "Anchor and Mooring",
        "Steam System",
        "Steering Gear and Rudder",
        "Others"
      ]
    },
    silentMode: {
      id: 'silentMode',
      label: 'Silent Mode',
      dbField: 'external_visibility',
      type: 'checkbox',
      required: false,
      section: 'basic',
      displayOrder: 3,
      width: 'full',
      defaultValue: true,
    },
    description: {
      id: 'description',
      label: 'Description',
      dbField: 'Description',
      type: 'textarea',
      required: true,
      section: 'basic',
      displayOrder: 3,
      width: 'full',
      rows: 3
    },
    actionPlanned: {
      id: 'actionPlanned',
      label: 'Action Planned',
      dbField: 'Action Planned',
      type: 'textarea',
      required: true,
      section: 'basic',
      displayOrder: 4,
      width: 'full',
      rows: 3
    },
    comments: {
      id: 'comments',
      label: 'Follow-Up',
      dbField: 'Comments',
      type: 'textarea',
      required: false,
      section: 'basic',
      displayOrder: 5,
      width: 'full',
      rows: 3
    },
    status: {
      id: 'status',
      label: 'Status',
      dbField: 'Status',
      type: 'select',
      required: true,
      section: 'details',
      displayOrder: 6,
      width: 'full',
      options: ["OPEN", "IN PROGRESS", "CLOSED"]
    },
    criticality: {
      id: 'criticality',
      label: 'Criticality',
      dbField: 'Criticality',
      type: 'select',
      required: true,
      section: 'details',
      displayOrder: 7,
      width: 'full',
      options: ["High", "Medium", "Low"]
    },
    raisedBy: {
      id: 'raisedBy',
      label: 'Defect Source',
      dbField: 'raised_by',
      type: 'select',
      required: true,
      section: 'details',
      displayOrder: 8,
      width: 'full',
      options: [
        "Vessel",
        "Office",
        "Internal Audit",
        "VIR",
        "Owners",
        "PSC",
        "CLASS",
        "FLAG",
        "Guarantee Claim",
        "Dry Dock",
        "Others"
      ]
    },
    dateReported: {
      id: 'dateReported',
      label: 'Date Reported',
      dbField: 'Date Reported',
      type: 'date',
      required: true,
      section: 'dates',
      displayOrder: 9,
      width: 'half'
    },
    dateCompleted: {
      id: 'dateCompleted',
      label: 'Date Completed',
      dbField: 'Date Completed',
      type: 'date',
      required: false,
      section: 'dates',
      displayOrder: 11,
      width: 'half',
      conditionalRequired: (values) => values.status === 'CLOSED'
    },
    targetDate: {
      id: 'targetDate',
      label: 'Target Date',
      dbField: 'target_date', 
      type: 'date',
      required: true,
      section: 'dates',
      displayOrder: 10,
      width: 'half'
    },
    closureComments: {
      id: 'closureComments',
      label: 'Closure Comments',
      dbField: 'closure_comments',
      type: 'textarea',
      required: false,
      section: 'closure',
      displayOrder: 12,
      width: 'full',
      rows: 3,
      conditionalDisplay: (values) => values?.status === 'CLOSED' || values?.['Status (Vessel)'] === 'CLOSED',
      conditionalRequired: (values) => values?.status === 'CLOSED' || values?.['Status (Vessel)'] === 'CLOSED'
    },
    initialFiles: {
      id: 'initialFiles',
      label: 'Initial Documentation',
      dbField: 'initial_files',
      type: 'file',
      required: false,
      section: 'files',
      displayOrder: 13,
      width: 'full',
      accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png',
      maxSize: 2 * 1024 * 1024, // 2MB
      multiple: true
    },
    completionFiles: {
      id: 'completionFiles',
      label: 'Closure Documentation',
      dbField: 'completion_files',
      type: 'file',
      required: false,
      section: 'files',
      displayOrder: 14,
      width: 'full',
      accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png',
      maxSize: 2 * 1024 * 1024, // 2MB
      multiple: true,
      conditionalDisplay: (values) => values.status === 'CLOSED'
    }
  },

  // Table Fields
  TABLE: {
    expandToggle: {
      id: 'expandToggle',
      label: '',
      width: '40px',
      minWidth: '40px',
      priority: 1,
      isAction: true
    },
    // index: {
    //   id: 'index',
    //   label: '#',
    //   dbField: 'id',
    //   width: '60px',
    //   minWidth: '60px',
    //   priority: 1
    // },
    vessel: {
      id: 'vessel',
      label: 'Vessel',
      dbField: 'vessel_name',
      width: '150px',
      minWidth: '150px',
      priority: 1
    },
    status: {
      id: 'status',
      label: 'Status',
      dbField: 'Status',
      width: '120px',
      minWidth: '120px',
      priority: 1
    },
    criticality: {
      id: 'criticality',
      label: 'Criticality',
      dbField: 'Criticality',
      width: '120px',
      minWidth: '120px',
      priority: 1
    },
    equipment: {
      id: 'equipment',
      label: 'Equipment',
      dbField: 'Equipments',
      width: '150px',
      minWidth: '150px',
      priority: 2
    },
    description: {
      id: 'description',
      label: 'Description',
      dbField: 'Description',
      width: '200px',
      minWidth: '200px',
      priority: 2
    },
    actionPlanned: {
      id: 'actionPlanned',
      label: 'Action Planned',
      dbField: 'Action Planned',
      width: '200px',
      minWidth: '200px',
      priority: 2
    },
    dateReported: {
      id: 'dateReported',
      label: 'Reported',
      dbField: 'Date Reported',
      width: '120px',
      minWidth: '120px',
      priority: 3,
      type: 'date'
    },
    targetDate: {
      id: 'targetDate',
      label: 'Target Date',
      dbField: 'target_date',
      width: '120px',
      minWidth: '120px',
      priority: 4,
      type: 'date',
      section: 'dates'
    },
    actions: {
      id: 'actions',
      label: 'Actions',
      width: '80px',
      minWidth: '80px',
      priority: 99,
      isAction: true,
      fixedRight: true
    }
  },

  // Expanded View Fields (Additional fields shown in expanded row)
  EXPANDED: {
    description: {
      id: 'description',
      label: 'Description',
      dbField: 'Description',
      priority: 1,
      section: 'details'
    },
    actionPlanned: {
      id: 'actionPlanned',
      label: 'Action Planned',
      dbField: 'Action Planned',
      priority: 2,
      section: 'details'
    },
    comments: {
      id: 'comments',
      label: 'Follow-Up',
      dbField: 'Comments',
      priority: 3,
      section: 'details'
    },
    dateCompleted: {
      id: 'dateCompleted',
      label: 'Completed',
      dbField: 'Date Completed',
      priority: 4,
      type: 'date'
    },
    initialFiles: {
      id: 'initialFiles',
      label: 'Initial Documentation',
      dbField: 'initial_files',
      priority: 5,
      section: 'files'
    },
    closureComments: {
      id: 'closureComments',
      label: 'Closure Comments',
      dbField: 'closure_comments',
      priority: 6,
      section: 'closure',
      conditionalDisplay: (values) => values.status === 'CLOSED'
    },
    completionFiles: {
      id: 'completionFiles',
      label: 'Closure Documentation',
      dbField: 'completion_files',
      priority: 7,
      section: 'files',
      conditionalDisplay: (values) => values.status === 'CLOSED'
    },
    raisedBy: {
      id: 'raisedBy',
      label: 'Defect Source',
      dbField: 'raised_by',
      priority: 8,
      section: 'metadata'
    },
    silentMode: {
      id: 'silentMode',
      type: 'checkbox',
      label: 'Silent Mode (Hide from external users)',
      dbField: 'external_visibility',
      priority: 9,
      defaultValue: true
    }
  }
};

export const FIELD_SECTIONS = {
  basic: {
    id: 'basic',
    label: 'Basic Information',
    order: 1
  },
  details: {
    id: 'details',
    label: 'Details',
    order: 2
  },
  dates: {
    id: 'dates',
    label: 'Dates',
    order: 3
  },
  closure: {
    id: 'closure',
    label: 'Closure Details',
    order: 4,
    conditionalDisplay: (values) => values.status === 'CLOSED'
  },
  files: {
    id: 'files',
    label: 'Documentation',
    order: 5
  }
};

// DB to API field mapping to ensure consistent naming across the application
export const DB_TO_API_FIELD_MAP = {
  'id': 'id',
  'vessel_id': 'vessel_id',
  'vessel_name': 'vessel_name',
  'Status': 'Status',
  'criticality': 'Criticality',
  'equipment': 'Equipments',
  'description': 'Description',
  'action_planned': 'Action Planned',
  'date_reported': 'Date Reported',
  'target_date': 'target_date',
  'comments': 'Comments',
  'date_completed': 'Date Completed',
  'closure_comments': 'closure_comments',
  'defect_source': 'raised_by',
  'external_visibility': 'external_visibility',
  'created_by': 'created_by',
  'updated_by': 'updated_by',
  'closed_by': 'closed_by',
  'created_at': 'created_at',
  'updated_at': 'updated_at',
  'attachments_count': 'attachments'
};

// API to DB field mapping (reverse of DB_TO_API_FIELD_MAP)
export const API_TO_DB_FIELD_MAP = Object.entries(DB_TO_API_FIELD_MAP).reduce((acc, [dbField, apiField]) => {
  acc[apiField] = dbField;
  return acc;
}, {});

// Helper function to map DB field names to API field names
export const mapDbToApiFields = (data) => {
  const result = {};
  Object.entries(data).forEach(([key, value]) => {
    const apiField = DB_TO_API_FIELD_MAP[key] || key;
    result[apiField] = value;
  });
  return result;
};

// Helper function to map API field names to DB field names
export const mapApiToDbFields = (data) => {
  const result = {};
  Object.entries(data).forEach(([key, value]) => {
    const dbField = API_TO_DB_FIELD_MAP[key] || key;
    result[dbField] = value;
  });
  return result;
};