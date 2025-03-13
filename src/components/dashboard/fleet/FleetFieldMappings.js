export const fleetFieldMappings = {
  TABLE: {
    
    vessel_name: {
      dbField: 'vessel_name',
      label: 'Vessel',
      priority: 1,
      width: '180px'
    },
    imo: {
      dbField: 'imo_no',
      label: 'IMO No',
      priority: 2,
      width: '120px'
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
    departure_date: {
      dbField: 'departure_date',
      label: 'Departure Date',
      priority: 6,
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
      width: '170px'
    },
    etb: {
      dbField: 'etb',
      label: 'ETB',
      priority: 10,
      width: '150px'
    },
    checklist_received: {
      dbField: 'checklist_received',
      label: '5day Checklist Received',
      priority: 10, // Adjust the priority as needed
      width: '180px'
    },
    comments: {
      dbField: 'comments',
      label: 'Comments',
      priority: 11
    }
    
  },
  EXPANDED: {
    
    
    
    departure_country: {
      dbField: 'departure_country',
      label: 'Departure Country',
      priority: 5
    },
    etd: {
      dbField: 'etd',
      label: 'ETD',
      priority: 6
    },
    atd: {
      dbField: 'atd',
      label: 'ATD',
      priority: 7
    },
    
    psc_last_inspection_date: {
      dbField: 'psc_last_inspection_date',
      label: 'PSC Last Inspection Date',
      priority: 10
    },
    psc_last_inspection_port: {
      dbField: 'psc_last_inspection_port',
      label: 'PSC Last Inspection Port',
      priority: 11
    },
    amsa_last_inspection_date: {
      dbField: 'amsa_last_inspection_date',
      label: 'AMSA Last Inspection Date',
      priority: 12
    },
    amsa_last_inspection_port: {
      dbField: 'amsa_last_inspection_port',
      label: 'AMSA Last Inspection Port',
      priority: 13
    }
  }
};