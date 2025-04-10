import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapModal = ({ isOpen, onClose, vessels }) => {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [markersAdded, setMarkersAdded] = useState(0);
  const [weatherLayer, setWeatherLayer] = useState('none');
  const weatherLayersRef = useRef({});
  
  // This function will be called directly from the JSX onClick
  const selectWeatherLayer = (layerName) => {
    console.log("Selecting weather layer:", layerName);
    
    if (!mapRef.current) return;
    
    // Remove all current weather layers
    Object.keys(weatherLayersRef.current).forEach(key => {
      if (key !== 'none' && weatherLayersRef.current[key] && mapRef.current.hasLayer(weatherLayersRef.current[key])) {
        mapRef.current.removeLayer(weatherLayersRef.current[key]);
      }
    });
    
    // Add the selected layer
    if (layerName !== 'none' && weatherLayersRef.current[layerName]) {
      mapRef.current.addLayer(weatherLayersRef.current[layerName]);
    }
    
    // Update state
    setWeatherLayer(layerName);
  };
  
  useEffect(() => {
    if (isOpen && !mapRef.current && mapContainerRef.current) {
      // Initialize map
      mapRef.current = L.map(mapContainerRef.current).setView([20, 0], 2);
      
      // Base map layer with English labels
      const baseLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(mapRef.current);
      
      // Initialize weather layers object
      weatherLayersRef.current = {
        none: null,
        wind: null,
        waves: null,
        currents: null,
        storms: null
      };
      
      // Create maritime weather layers
      // Wind layer
      weatherLayersRef.current.wind = L.tileLayer('https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2', {
        maxZoom: 19,
        opacity: 0.7,
        attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
      });
      
      // Waves layer (using sea level pressure as proxy)
      weatherLayersRef.current.waves = L.tileLayer('https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2', {
        maxZoom: 19,
        opacity: 0.6,
        attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
      });
      
      // Currents layer (using precipitation as proxy since true currents are hard to find)
      weatherLayersRef.current.currents = L.tileLayer('https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2', {
        maxZoom: 19,
        opacity: 0.6,
        attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
      });
      
      // Add NOAA Storm Tracking
      weatherLayersRef.current.storms = L.layerGroup();
      
      // Fetch active storms from NOAA
      fetch('https://www.nhc.noaa.gov/cyclones/cyclones.json')
        .then(response => response.json())
        .then(data => {
          try {
            // Process storm data
            if (data && data.features) {
              data.features.forEach(storm => {
                if (storm.properties && storm.properties.lat && storm.properties.lon) {
                  const lat = parseFloat(storm.properties.lat);
                  const lon = parseFloat(storm.properties.lon);
                  const name = storm.properties.name || 'Unnamed Storm';
                  const category = storm.properties.maxwind ? `Category ${Math.floor(storm.properties.maxwind / 20)}` : 'Unknown';
                  
                  // Create storm icon
                  const stormIcon = L.divIcon({
                    className: 'storm-marker',
                    html: `
                      <div class="storm-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="red">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                          <circle cx="12" cy="12" r="5" fill="red"/>
                        </svg>
                      </div>
                    `,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                  });
                  
                  // Add storm marker with tooltip
                  const marker = L.marker([lat, lon], { icon: stormIcon })
                    .bindTooltip(`<div class="storm-tooltip">
                      <strong>${name}</strong><br>
                      ${category}<br>
                      Wind: ${storm.properties.maxwind || 'Unknown'} mph
                    </div>`, {
                      direction: 'top',
                      offset: [0, -12],
                      opacity: 0.9
                    });
                  
                  weatherLayersRef.current.storms.addLayer(marker);
                  
                  // Add storm track if available
                  if (storm.properties.track) {
                    const trackPoints = storm.properties.track.map(point => [point.lat, point.lon]);
                    const track = L.polyline(trackPoints, {
                      color: 'red',
                      weight: 2,
                      opacity: 0.7,
                      dashArray: '5, 5'
                    });
                    weatherLayersRef.current.storms.addLayer(track);
                  }
                }
              });
            }
          } catch (error) {
            console.error("Error processing storm data:", error);
          }
        })
        .catch(error => {
          console.error("Error fetching storm data:", error);
        });
      
      // Add legend to the map
      const legend = L.control({ position: 'bottomright' });
      
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
            ${weatherLayer === 'storms' ? `
            <div class="legend-divider"></div>
            <h4>Storm Tracking</h4>
            <div class="legend-item">
              <div class="legend-color storm-color"></div>
              <div class="legend-label">Active Storm</div>
            </div>
            <div class="legend-item">
              <div class="legend-line"></div>
              <div class="legend-label">Storm Track</div>
            </div>
            ` : ''}
          </div>
        `;
        return div;
      };
      
      legend.addTo(mapRef.current);
      
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
          
          // Add marker with tooltip
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
      
      // Add CSS for tooltips, legend and weather controls
      const style = document.createElement('style');
      style.textContent = `
        .vessel-tooltip, .storm-tooltip {
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
        
        .vessel-tooltip .leaflet-tooltip-tip,
        .storm-tooltip .leaflet-tooltip-tip {
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
          margin-bottom: 10px;
        }
        
        .weather-control-container {
          background-color: rgba(255, 255, 255, 0.9);
          border-radius: 4px;
          box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
          font-size: 12px;
          line-height: 1.4;
          color: #333;
          overflow: hidden;
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
        
        .legend-divider {
          height: 1px;
          background-color: #ddd;
          margin: 8px 0;
        }
        
        .storm-color {
          background-color: red;
        }
        
        .legend-line {
          width: 16px;
          height: 2px;
          background-color: red;
          margin-right: 8px;
          position: relative;
        }
        
        .legend-line:before, .legend-line:after {
          content: "";
          position: absolute;
          top: 0;
          width: 2px;
          height: 2px;
          background-color: transparent;
        }
        
        .legend-line:before {
          left: 2px;
          box-shadow: 0 0 0 1px red;
        }
        
        .legend-line:after {
          right: 2px;
          box-shadow: 0 0 0 1px red;
        }
        
        .legend-label {
          font-size: 12px;
        }
        
        .weather-button-group {
          display: flex;
          background-color: white;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
          margin: 10px;
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 1000;
        }
        
        .weather-button {
          background-color: #f5f5f5;
          border: none;
          border-right: 1px solid #ddd;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s ease;
          color: #333;  /* Dark text color for better visibility */
        }
        
        .weather-button:first-child {
          border-top-left-radius: 4px;
          border-bottom-left-radius: 4px;
        }
        
        .weather-button:last-child {
          border-right: none;
          border-top-right-radius: 4px;
          border-bottom-right-radius: 4px;
        }
        
        .weather-button:hover {
          background-color: #e9e9e9;
        }
        
        .weather-button.active {
          background-color: #2b6cb0;
          color: white;
          font-weight: 600;
        }
        
        .storm-icon {
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
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
  
  // Update legend when weather layer changes
  useEffect(() => {
    if (mapRef.current) {
      // Update legend content based on selected weather layer
      const legendContainer = document.querySelector('.legend-container');
      if (legendContainer) {
        legendContainer.innerHTML = `
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
          ${weatherLayer === 'storms' ? `
          <div class="legend-divider"></div>
          <h4>Storm Tracking</h4>
          <div class="legend-item">
            <div class="legend-color storm-color"></div>
            <div class="legend-label">Active Storm</div>
          </div>
          <div class="legend-item">
            <div class="legend-line"></div>
            <div class="legend-label">Storm Track</div>
          </div>
          ` : ''}
        `;
      }
    }
  }, [weatherLayer]);
  
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
        <div className="map-container" ref={mapContainerRef}>
          {/* Weather control buttons directly in the JSX */}
          <div className="weather-button-group">
            <button 
              className={`weather-button ${weatherLayer === 'none' ? 'active' : ''}`}
              data-layer="none"
              onClick={() => selectWeatherLayer('none')}
            >
              None
            </button>
            <button 
              className={`weather-button ${weatherLayer === 'wind' ? 'active' : ''}`}
              data-layer="wind"
              onClick={() => selectWeatherLayer('wind')}
            >
              Wind
            </button>
            <button 
              className={`weather-button ${weatherLayer === 'waves' ? 'active' : ''}`}
              data-layer="waves"
              onClick={() => selectWeatherLayer('waves')}
            >
              Waves
            </button>
            <button 
              className={`weather-button ${weatherLayer === 'currents' ? 'active' : ''}`}
              data-layer="currents"
              onClick={() => selectWeatherLayer('currents')}
            >
              Currents
            </button>
            <button 
              className={`weather-button ${weatherLayer === 'storms' ? 'active' : ''}`}
              data-layer="storms"
              onClick={() => selectWeatherLayer('storms')}
            >
              Storms
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapModal;