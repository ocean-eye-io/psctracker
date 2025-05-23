// src/components/dashboard/datavalidation/dataQualityFieldMappings.js

export const DATA_QUALITY_FIELDS = {
    TABLE: {
      vessel_name: { dbField: 'vessel_name', label: 'Vessel Name', priority: 1, minWidth: '180px', width: '20%' },
      vessel_imo: { dbField: 'vessel_imo', label: 'IMO Number', priority: 2, minWidth: '120px', width: '10%' },
      vessel_type: { dbField: 'vessel_type', label: 'Vessel Type', priority: 3, minWidth: '140px', width: '12%' },
      completeness: { dbField: 'completeness', label: 'Data Completeness', priority: 4, minWidth: '120px', width: '10%' },
      correctness: { dbField: 'correctness', label: 'Data Accuracy', priority: 5, minWidth: '120px', width: '10%' },
      freshness: { dbField: 'freshness', label: 'Data Recency', priority: 6, minWidth: '120px', width: '10%' },
      overall_score: { dbField: 'overall_score', label: 'Overall Score', priority: 7, minWidth: '130px', width: '10%' },
      last_updated: { dbField: 'last_updated', label: 'Last Updated', priority: 8, minWidth: '180px', width: '12%' },
      issue_count: { dbField: 'issue_count', label: 'Issues', priority: 9, minWidth: '80px', width: '6%' }
    },
    EXPANDED: {
      // Define the grid layout for expanded content here.
      // 'repeat(auto-fit, minmax(250px, 1fr))' creates a responsive grid
      // that will fit as many 250px wide columns as possible.
      // You can also use a fixed number of columns, e.g., 'repeat(3, 1fr)' for 3 equal columns.
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      
      entries_analyzed: { dbField: 'entries_analyzed', label: 'Entries Analyzed', priority: 1, gridColumnSpan: 1 },
      issue_type: { dbField: 'issue_type', label: 'Issue Type', priority: 2, gridColumnSpan: 1 },
      // issue_description will now span 2 columns, not full width (unless the grid only has 2 columns)
      issue_description: { dbField: 'issue_description', label: 'Issue Description', priority: 3, gridColumnSpan: 1 }, 
      missing_fields_info: { dbField: 'missing_fields_info', label: 'Missing Fields', priority: 4, gridColumnSpan: 1 },
      incorrect_fields_info: { dbField: 'incorrect_fields_info', label: 'Incorrect Fields', priority: 5, gridColumnSpan: 1 },
      last_validated: { dbField: 'last_validated', label: 'Last Validated', priority: 6, gridColumnSpan: 1 },
      days_since_update: { dbField: 'days_since_update', label: 'Days Since Update', priority: 7, gridColumnSpan: 1 }
    }
  };