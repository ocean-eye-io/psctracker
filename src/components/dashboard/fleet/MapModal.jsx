import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapModal = ({ isOpen, onClose, vessels }) => {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [markersAdded, setMarkersAdded] = useState(0);
  
  // Debug log
  useEffect(() => {
    if (isOpen) {
      console.log("MapModal opened with", vessels.length, "vessels");
      // Log first vessel to check its structure
      if (vessels.length > 0) {
        console.log("First vessel sample:", vessels[0]);
      }
    }
  }, [isOpen, vessels]);
  
  useEffect(() => {
    if (isOpen && !mapRef.current && mapContainerRef.current) {
      // Initialize map
      mapRef.current = L.map(mapContainerRef.current).setView([20, 0], 2);
      
      // Add tile layer with English labels
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(mapRef.current);
      
      // Add legend to the map
      const legend = L.control({ position: 'topright' });
      
      legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = `
          <div class="legend-container">
            <h4>Vessel Status</h4>
            <div class="legend-item">
              <div class="legend-color" style="background-color: #3498DB;"></div>
              <div class="legend-label">At Sea</div>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background-color: #2ECC71;"></div>
              <div class="legend-label">In Port/Berth</div>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background-color: #F1C40F;"></div>
              <div class="legend-label">At Anchor</div>
            </div>
          </div>
        `;
        return div;
      };
      
      legend.addTo(mapRef.current);
      
      // Debugging code
      console.log("Map initialized");
      
      // Create vessel markers
      const markers = [];
      let validVesselsCount = 0;
      
      vessels.forEach((vessel, index) => {
        // Check for different possible coordinate field names
        let lat = null;
        let lng = null;
        
        // Try different field name combinations
        if (vessel.latitude !== undefined && vessel.longitude !== undefined) {
          lat = parseFloat(vessel.latitude);
          lng = parseFloat(vessel.longitude);
        } else if (vessel.lat !== undefined && vessel.lon !== undefined) {
          lat = parseFloat(vessel.lat);
          lng = parseFloat(vessel.lon);
        } else if (vessel.lat !== undefined && vessel.lng !== undefined) {
          lat = parseFloat(vessel.lat);
          lng = parseFloat(vessel.lng);
        } else if (vessel.position_lat !== undefined && vessel.position_lon !== undefined) {
          lat = parseFloat(vessel.position_lat);
          lng = parseFloat(vessel.position_lon);
        } else if (vessel.position && vessel.position.latitude !== undefined && vessel.position.longitude !== undefined) {
          lat = parseFloat(vessel.position.latitude);
          lng = parseFloat(vessel.position.longitude);
        }
        
        // Debugging log for coordinates
        if (index < 5) {
          console.log(`Vessel ${index} coordinates:`, { 
            name: vessel.vessel_name, 
            lat, 
            lng, 
            raw_lat: vessel.latitude || vessel.lat || (vessel.position && vessel.position.latitude),
            raw_lng: vessel.longitude || vessel.lon || vessel.lng || (vessel.position && vessel.position.longitude)
          });
        }
        
        // Check if vessel has valid coordinates
        if (lat !== null && lng !== null && 
            !isNaN(lat) && !isNaN(lng)) {
          
          // Skip invalid coordinates
          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.log(`Vessel ${vessel.vessel_name || index} has invalid coordinates: ${lat}, ${lng}`);
            return;
          }
          
          validVesselsCount++;
          
          // Create custom icon based on vessel status
          const icon = createVesselIcon(vessel);
          
          // Add marker with popup and tooltip
          const marker = L.marker([lat, lng], { icon })
            .addTo(mapRef.current);
          
          // Add detailed tooltip that shows on hover
          marker.bindTooltip(createDetailedTooltipContent(vessel), {
            direction: 'top',
            offset: [0, -10],
            className: 'vessel-tooltip',
            opacity: 0.95,
            permanent: false
          });
          
          markers.push(marker);
        }
      });
      
      setMarkersAdded(validVesselsCount);
      console.log(`Added ${validVesselsCount} vessel markers to map out of ${vessels.length} vessels`);
      
      // If we have markers, fit bounds to show all vessels
      if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
      }
      
      // Add CSS for tooltips and legend
      const style = document.createElement('style');
      style.textContent = `
        .vessel-tooltip {
          background-color: rgba(0, 0, 0, 0.85) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 4px !important;
          padding: 8px 10px !important;
          font-size: 12px !important;
          color: white !important;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3) !important;
          max-width: 250px !important;
          min-width: 180px !important;
        }
        
        .vessel-tooltip .leaflet-tooltip-tip {
          display: none !important;
        }
        
        .tooltip-title {
          font-weight: bold;
          font-size: 13px;
          margin-bottom: 5px;
          color: #4DC3FF;
        }
        
        .tooltip-row {
          display: flex;
          margin: 3px 0;
        }
        
        .tooltip-label {
          font-weight: 500;
          margin-right: 5px;
          color: #aaa;
        }
        
        .tooltip-value {
          color: white;
        }
        
        .legend-container {
          background-color: rgba(255, 255, 255, 0.9);
          border-radius: 4px;
          padding: 8px 10px;
          box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
          font-size: 12px;
          line-height: 1.4;
          color: #333;
        }
        
        .legend-container h4 {
          margin: 0 0 5px 0;
          font-size: 13px;
          font-weight: 600;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          margin: 4px 0;
        }
        
        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          margin-right: 8px;
          border: 1px solid rgba(0, 0, 0, 0.2);
        }
        
        .legend-label {
          font-size: 12px;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Cleanup on close
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, vessels]);
  
  // Function to create vessel icon based on status
  const createVesselIcon = (vessel) => {
    // Determine color based on status or type
    let color = '#3498DB'; // Default blue for at sea
    
    if (vessel.event_type) {
      const status = vessel.event_type.toLowerCase();
      if (status.includes('port') || status.includes('berth')) {
        color = '#2ECC71'; // Green for in port
      } else if (status.includes('anchor')) {
        color = '#F1C40F'; // Yellow for at anchor
      }
    }
    
    // Create ship-shaped icon
    return L.divIcon({
      className: 'vessel-marker',
      html: `
        <div class="ship-icon" style="color: ${color};">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="white" stroke-width="0.5">
            <path d="M20,21c-1.39,0-2.78-0.47-4-1.32c-2.44,1.71-5.56,1.71-8,0C6.78,20.53,5.39,21,4,21H2v2h2c1.38,0,2.74-0.35,4-0.99 c2.52,1.29,5.48,1.29,8,0c1.26,0.65,2.62,0.99,4,0.99h2v-2H20z M3.95,19H4c1.6,0,3.02-0.88,4-2c0.98,1.12,2.4,2,4,2s3.02-0.88,4-2 c0.98,1.12,2.4,2,4,2h0.05l1.89-6.68c0.08-0.26,0.06-0.54-0.06-0.78s-0.34-0.42-0.6-0.5L20,10.62V6c0-1.1-0.9-2-2-2h-3V1H9v3H6 C4.9,4,4,4.9,4,6v4.62l-1.29,0.42c-0.26,0.08-0.48,0.26-0.6,0.5s-0.15,0.52-0.06,0.78L3.95,19z M6,6h12v3.97L12,8L6,9.97V6z"/>
          </svg>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };
  
  // Function to create detailed tooltip content (shown on hover)
  const createDetailedTooltipContent = (vessel) => {
    // Format date if available
    const formattedEta = vessel.eta 
      ? new Date(vessel.eta).toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '-';
    
    return `
      <div>
        <div class="tooltip-title">${vessel.vessel_name || 'Unknown Vessel'}</div>
        <div class="tooltip-row">
          <div class="tooltip-label">IMO:</div>
          <div class="tooltip-value">${vessel.imo_no || '-'}</div>
        </div>
        <div class="tooltip-row">
          <div class="tooltip-label">Status:</div>
          <div class="tooltip-value">${vessel.event_type || '-'}</div>
        </div>
        <div class="tooltip-row">
          <div class="tooltip-label">Port:</div>
          <div class="tooltip-value">${vessel.arrival_port || '-'}</div>
        </div>
        <div class="tooltip-row">
          <div class="tooltip-label">ETA:</div>
          <div class="tooltip-value">${formattedEta}</div>
        </div>
      </div>
    `;
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="map-modal-backdrop">
      <div className="map-modal">
        <div className="map-modal-header">
          <h3>Vessel Map {markersAdded > 0 ? `(${markersAdded} vessels)` : ''}</h3>
          <button className="close-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {markersAdded === 0 && (
          <div className="no-vessels-warning">
            <p>No vessels with valid coordinates found. Check console for details.</p>
          </div>
        )}
        <div className="map-container" ref={mapContainerRef}></div>
      </div>
    </div>
  );
};

export default MapModal;