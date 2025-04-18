// src/components/common/Table/VesselFlag.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Flag, CheckCircle } from 'lucide-react';
import ReactDOM from 'react-dom';
import './VesselFlag.css';

const FlagSelector = ({ isVisible, triggerRect, selectedFlag, onFlagSelect, onClose }) => {
  const selectorRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);
  
  if (!isVisible || !triggerRect) return null;
  
  // Calculate position
  const style = {
    position: 'fixed',
    top: triggerRect.bottom + 10,
    left: triggerRect.left,
    zIndex: 99999,
    width: '150px',
  };
  
  const flagOptions = [
    { value: 'none', label: 'None', color: '#A0A0A0' },
    { value: 'green', label: 'Green', color: '#2EE086' },
    { value: 'yellow', label: 'Yellow', color: '#FFD426' },
    { value: 'red', label: 'Red', color: '#FF5252' }
  ];
  
  return ReactDOM.createPortal(
    <div 
      ref={selectorRef}
      className="flag-selector-container"
      style={style}
    >
      <div className="flag-selector">
        {flagOptions.map((flag) => (
          <button
            key={flag.value}
            className={`flag-option ${selectedFlag === flag.value ? 'selected' : ''}`}
            onClick={() => onFlagSelect(flag.value)}
          >
            <div className="flag-option-content">
              <Flag 
                size={16} 
                className="flag-icon" 
                style={{ 
                  color: flag.color,
                  filter: flag.value !== 'none' ? `drop-shadow(0 0 3px ${flag.color}40)` : 'none'
                }} 
              />
              <span>{flag.label}</span>
            </div>
            {selectedFlag === flag.value && (
              <CheckCircle size={14} className="check-icon" />
            )}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
};

const VesselFlag = ({ vesselId, userId, flag, onFlagChange }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState(null);
  const flagRef = useRef(null);
  
  const handleFlagClick = (e) => {
    e.stopPropagation();
    if (flagRef.current) {
      setTriggerRect(flagRef.current.getBoundingClientRect());
      setIsMenuOpen(true);
    }
  };
  
  const handleFlagSelect = (flagValue) => {
    onFlagChange(vesselId, userId, flagValue);
    setIsMenuOpen(false);
  };
  
  const handleClose = () => {
    setIsMenuOpen(false);
  };
  
  const getFlagColor = () => {
    switch (flag) {
      case 'green':
        return '#2EE086';
      case 'yellow':
        return '#FFD426';
      case 'red':
        return '#FF5252';
      default:
        return '#A0A0A0';
    }
  };
  
  return (
    <div className="vessel-flag-container">
      <button 
        ref={flagRef}
        className={`vessel-flag-button ${flag !== 'none' ? flag : ''}`}
        onClick={handleFlagClick}
        aria-label="Set vessel flag"
      >
        <Flag 
          size={14} 
          style={{ 
            color: getFlagColor(),
            filter: flag !== 'none' ? `drop-shadow(0 0 3px ${getFlagColor()}40)` : 'none'
          }} 
        />
      </button>
      
      <FlagSelector
        isVisible={isMenuOpen}
        triggerRect={triggerRect}
        selectedFlag={flag || 'none'}
        onFlagSelect={handleFlagSelect}
        onClose={handleClose}
      />
    </div>
  );
};

export default VesselFlag;