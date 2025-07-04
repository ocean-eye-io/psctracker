// src/components/dashboard/reporting/ReportingFieldMappings.js

export const reportingFieldMappings = {
  TABLE: {
    vessel_name: {
      dbField: 'vessel_name',
      label: 'Vessel',
      priority: 1,
      width: '200px',
      minWidth: '160px',
      type: 'text'
    },
    // vessel_type: {
    //   dbField: 'vessel_type',
    //   label: 'Vessel Type',
    //   priority: 2,
    //   width: '130px',
    //   minWidth: '100px',
    //   type: 'text'
    // },
    // doc_type: {
    //   dbField: 'fleet_type',
    //   label: 'DOC',
    //   priority: 3,
    //   width: '80px',
    //   minWidth: '70px',
    //   type: 'text'
    // },
    event_type: {
      dbField: 'event_type',
      label: 'Event Type',
      priority: 4,
      width: '160px',
      minWidth: '160px',
      type: 'status'
    },
    arrival_port: {
      dbField: 'arrival_port',
      label: 'Arrival Port',
      priority: 5,
      width: '140px',
      minWidth: '120px',
      type: 'text'
    },
    arrival_country: {
      dbField: 'arrival_country',
      label: 'Arrival Country',
      priority: 6,
      width: '120px',
      minWidth: '100px',
      type: 'text'
    },
    eta: {
      dbField: 'eta',
      label: 'ETA (LT)',
      priority: 7,
      width: '170px',
      minWidth: '150px',
      type: 'datetime'
    },
    etb: {
      dbField: 'etb',
      label: 'ETB (LT)',
      priority: 8,
      width: '170px',
      minWidth: '150px',
      type: 'datetime'
    },
    etd: {
      dbField: 'etd',
      label: 'ETD (LT)',
      priority: 9,
      width: '170px',
      minWidth: '150px',
      type: 'datetime'
    },
    // daysToGo: {
    //   dbField: 'days_to_go',
    //   label: 'Days to Go',
    //   priority: 9,
    //   width: '100px',
    //   minWidth: '80px',
    //   type: 'number'
    // },
    checklistStatus: {
      dbField: 'checklistStatus',
      label: 'Pre-Arrival',
      priority: 10,
      width: '120px',
      minWidth: '100px',
      type: 'status'
    }
  },

  EXPANDED: {
    // imo_no: {
    //   dbField: 'imo_no',
    //   label: 'IMO No',
    //   priority: 1,
    //   type: 'text'
    // },
    // owner: {
    //   dbField: 'owner',
    //   label: 'Owner',
    //   priority: 2,
    //   type: 'text'
    // },
    // flag: {
    //   dbField: 'flag',
    //   label: 'Flag',
    //   priority: 3,
    //   type: 'text'
    // },
    // dwt: {
    //   dbField: 'dwt',
    //   label: 'DWT',
    //   priority: 4,
    //   type: 'number'
    // },
    // departure_port: {
    //   dbField: 'departure_port',
    //   label: 'Departure Port',
    //   priority: 5,
    //   type: 'text',
    //   combineWithCountry: true
    // },
    
    // office_doc: {
    //   dbField: 'office_doc',
    //   label: 'DOC Office',
    //   priority: 7,
    //   type: 'text'
    // },
    psc_last_inspection_date: {
      dbField: 'psc_last_inspection_date',
      label: 'PSC Last Inspection Date',
      priority: 8,
      type: 'date'
    },
    psc_last_inspection_port: {
      dbField: 'psc_last_inspection_port',
      label: 'PSC Last Inspection Port',
      priority: 9,
      type: 'text'
    },
    amsa_last_inspection_date: {
      dbField: 'amsa_last_inspection_date',
      label: 'AMSA Last Inspection Date',
      priority: 10,
      type: 'date'
    },
    amsa_last_inspection_port: {
      dbField: 'amsa_last_inspection_port',
      label: 'AMSA Last Inspection Port',
      priority: 11,
      type: 'text'
    },
    last_report_date: {
      dbField: 'report_date',
      label: 'Last Report',
      priority: 12,
      type: 'date'
    }
  }
};