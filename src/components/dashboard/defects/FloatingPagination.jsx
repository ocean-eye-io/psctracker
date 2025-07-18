// FloatingPagination.jsx - Light Theme Version
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const FloatingPagination = ({ 
  currentPage, 
  totalPages, 
  totalItems,
  itemsPerPage,
  onPageChange,
  className = '',
  position = 'bottom-right'
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPositionStyle = () => {
    switch (position) {
      case 'bottom-left': 
        return { position: 'fixed', bottom: '20px', left: '20px', zIndex: 9999 };
      case 'bottom-center': 
        return { 
          position: 'fixed', 
          bottom: '20px', 
          left: '50%', 
          transform: 'translateX(-50%)',
          zIndex: 9999 
        };
      default: 
        return { position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 };
    }
  };

  const containerStyle = {
    ...getPositionStyle(),
    background: 'rgba(255, 255, 255, 0.95)', // Light background
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(0, 123, 255, 0.2)', // Light blue border
    borderRadius: '20px',
    padding: '3px 6px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    boxShadow: `
      0 4px 20px rgba(0, 0, 0, 0.15),
      0 0 15px rgba(0, 123, 255, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.5)
    `, // Light shadows
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: isVisible ? 1 : 0,
    transform: `${position === 'bottom-center' ? 'translateX(-50%)' : ''} translateY(${isVisible ? '0' : '20px'})`,
    pointerEvents: isVisible ? 'auto' : 'none',
  };

  const buttonBaseStyle = {
    background: 'rgba(0, 123, 255, 0.08)', // Light blue background
    border: 'none',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: '#007bff', // Standard blue
  };

  const smallButtonStyle = {
    ...buttonBaseStyle,
    width: '24px',
    height: '24px',
  };

  const mainButtonStyle = {
    ...buttonBaseStyle,
    width: '28px',
    height: '28px',
  };

  const disabledButtonStyle = {
    ...buttonBaseStyle,
    opacity: 0.3,
    cursor: 'not-allowed',
    color: 'rgba(51, 51, 51, 0.3)', // Muted dark text for disabled
  };

  const pageInfoStyle = {
    color: '#333333', // Dark text
    fontSize: '11px',
    fontWeight: '600',
    padding: '0 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    lineHeight: '1.1',
    minWidth: '50px',
  };

  const handleButtonClick = (newPage) => {
    onPageChange(newPage);
  };

  const handleButtonHover = (e, isDisabled) => {
    if (!isDisabled) {
      e.currentTarget.style.background = 'rgba(0, 123, 255, 0.15)'; // Darker light blue on hover
      e.currentTarget.style.transform = 'scale(1.1)';
    }
  };

  const handleButtonLeave = (e, isDisabled) => {
    if (!isDisabled) {
      e.currentTarget.style.background = 'rgba(0, 123, 255, 0.08)'; // Back to light blue
      e.currentTarget.style.transform = 'scale(1)';
    }
  };

  return (
    <div 
      style={containerStyle}
      className={className}
      onMouseEnter={() => setIsVisible(true)}
    >
      {/* First page */}
      <button
        onClick={() => handleButtonClick(1)}
        disabled={currentPage === 1}
        title="First page"
        style={currentPage === 1 ? { ...disabledButtonStyle, ...smallButtonStyle } : smallButtonStyle}
        onMouseEnter={(e) => handleButtonHover(e, currentPage === 1)}
        onMouseLeave={(e) => handleButtonLeave(e, currentPage === 1)}
      >
        <ChevronsLeft size={12} />
      </button>

      {/* Previous page */}
      <button
        onClick={() => handleButtonClick(currentPage - 1)}
        disabled={currentPage === 1}
        title="Previous page"
        style={currentPage === 1 ? { ...disabledButtonStyle, ...mainButtonStyle } : mainButtonStyle}
        onMouseEnter={(e) => handleButtonHover(e, currentPage === 1)}
        onMouseLeave={(e) => handleButtonLeave(e, currentPage === 1)}
      >
        <ChevronLeft size={14} />
      </button>

      {/* Page info */}
      <div style={pageInfoStyle}>
        <div style={{ 
          fontSize: '12px', 
          background: 'linear-gradient(135deg, #333333, #555555)', // Dark gradient for light theme
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {currentPage}/{totalPages}
        </div>
        <div style={{ 
          color: 'rgba(51, 51, 51, 0.6)', // Muted dark text
          fontSize: '9px',
        }}>
          {startItem}-{endItem}
        </div>
      </div>

      {/* Next page */}
      <button
        onClick={() => handleButtonClick(currentPage + 1)}
        disabled={currentPage === totalPages}
        title="Next page"
        style={currentPage === totalPages ? { ...disabledButtonStyle, ...mainButtonStyle } : mainButtonStyle}
        onMouseEnter={(e) => handleButtonHover(e, currentPage === totalPages)}
        onMouseLeave={(e) => handleButtonLeave(e, currentPage === totalPages)}
      >
        <ChevronRight size={14} />
      </button>

      {/* Last page */}
      <button
        onClick={() => handleButtonClick(totalPages)}
        disabled={currentPage === totalPages}
        title="Last page"
        style={currentPage === totalPages ? { ...disabledButtonStyle, ...smallButtonStyle } : smallButtonStyle}
        onMouseEnter={(e) => handleButtonHover(e, currentPage === totalPages)}
        onMouseLeave={(e) => handleButtonLeave(e, currentPage === totalPages)}
      >
        <ChevronsRight size={12} />
      </button>
    </div>
  );
};

export default FloatingPagination;