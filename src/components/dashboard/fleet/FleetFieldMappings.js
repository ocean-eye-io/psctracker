export const fleetFieldMappings = {
  TABLE: {
    
    vessel_name: {
      dbField: 'vessel_name',
      label: 'Vessel',
      priority: 1,
      width: '160px'
    },
    imo: {
      dbField: 'imo_no',
      label: 'IMO No',
      priority: 2,
      width: '80px'
    },
    owner: {
      dbField: 'owner',
      label: 'Owner',
      priority: 3,
      width: '150px'
    },
    event_type: {
      dbField: 'event_type',
      label: 'Event Type',
      priority: 4,
      width: '140px'
    },
    departure_port: {
      dbField: 'departure_port',
      label: 'Departure Port',
      priority: 5,
      width: '150px'
    },
    
    arrival_port: {
      dbField: 'arrival_port',
      label: 'Arrival Port',
      priority: 7,
      width: '150px'
    },
    arrival_country: {
      dbField: 'arrival_country',
      label: 'Arrival Country',
      priority: 8,
      width: '150px'
    },
    eta: {
      dbField: 'eta',
      label: 'ETA',
      priority: 9,
      width: '150px',
      type: 'datetime'

    },
    etb: {
      dbField: 'etb',
      label: 'ETB',
      priority: 10,
      width: '120px',
      type: 'date'
    },
    checklist_received: {
      dbField: 'checklist_received',
      label: 'Pre-Arrival Checklist Status',
      priority: 11, 
      width: '150px'
    },
    sanz: {
      dbField: 'sanz',
      label: 'PIC',
      priority: 12,
      width: '120px'
    },
    comments: {
      dbField: 'comments',
      label: 'Comments',
      priority: 13,
      width: '120px'
    },
    psc_last_inspection_date: {
      dbField: 'psc_last_inspection_date',
      label: 'PSC Last Inspection Date',
      priority: 14,
      type: 'date',
      width: '120px'
    },
    psc_last_inspection_port: {
      dbField: 'psc_last_inspection_port',
      label: 'PSC Last Inspection Port',
      priority: 15,
      width: '120px'
    },
    amsa_last_inspection_date: {
      dbField: 'amsa_last_inspection_date',
      label: 'AMSA Last Inspection Date',
      priority: 16,
      type: 'date',
      width: '120px'
    },
    amsa_last_inspection_port: {
      dbField: 'amsa_last_inspection_port',
      label: 'AMSA Last Inspection Port',
      priority: 17,
      width: '120px'
    }
    
    
  },
  EXPANDED: {
    
    
    
    // departure_country: {
    //   dbField: 'departure_country',
    //   label: 'Departure Country',
    //   priority: 5
    // },
    // departure_date: {
    //   dbField: 'departure_date',
    //   label: 'Departure Date',
    //   priority: 6,
    //   width: '120px',
    //   type: 'date'
    // },
    etd: {
      dbField: 'etd',
      label: 'ETD',
      priority: 6,
      type: 'datetime'
    },
    atd: {
      dbField: 'atd',
      label: 'ATD',
      priority: 7,
      type: 'datetime'
    },
    
    
  }
};