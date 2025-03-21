// src/components/dashboard/fleet/MapModal.jsx
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
      
      // Add tile layer (you can choose different tile providers)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
      }).addTo(mapRef.current);
      
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
          
          // Add marker with popup
          const marker = L.marker([lat, lng], { icon })
            .addTo(mapRef.current)
            .bindPopup(createPopupContent(vessel));
          
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
    let color = '#3498DB'; // Default blue
    
    if (vessel.event_type) {
      const status = vessel.event_type.toLowerCase();
      if (status.includes('port') || status.includes('berth')) {
        color = '#2ECC71'; // Green for in port
      } else if (status.includes('anchor')) {
        color = '#F1C40F'; // Yellow for at anchor
      }
    }
    
    // Create custom icon
    return L.divIcon({
      className: 'vessel-marker',
      html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
  };
  
  // Function to create popup content
  const createPopupContent = (vessel) => {
    return `
      <div class="vessel-popup">
        <h3>${vessel.vessel_name || 'Unknown Vessel'}</h3>
        <p><strong>IMO:</strong> ${vessel.imo_no || '-'}</p>
        <p><strong>Status:</strong> ${vessel.event_type || '-'}</p>
        <p><strong>Port:</strong> ${vessel.arrival_port || '-'}</p>
        ${vessel.eta ? `<p><strong>ETA:</strong> ${new Date(vessel.eta).toLocaleString()}</p>` : ''}
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