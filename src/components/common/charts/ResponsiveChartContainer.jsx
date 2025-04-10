import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import './styles/chartStyles.css';

const ResponsiveChartContainer = ({ 
  title, 
  children, 
  onRefresh, 
  loading = false,
  className = '',
  height = null // Optional custom height override
}) => {
  const [chartWidth, setChartWidth] = useState(0);
  const [chartHeight, setChartHeight] = useState(0);
  const chartCardRef = useRef(null);
  const chartWrapperRef = useRef(null);

  // SVG definitions for gradients and effects
  const svgDefs = (
    <div className="defs-container">
      <svg>
        <defs>
          {/* Bar chart gradient */}
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4DC3FF" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#3BADE5" stopOpacity={0.6}/>
          </linearGradient>
          
          {/* Bar chart hover gradient */}
          <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4DC3FF" stopOpacity={1}/>
            <stop offset="100%" stopColor="#3BADE5" stopOpacity={0.8}/>
          </linearGradient>
          
          {/* Area chart gradient */}
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4DC3FF" stopOpacity={0.8}/>
            <stop offset="90%" stopColor="#3BADE5" stopOpacity={0.1}/>
            <stop offset="100%" stopColor="#3BADE5" stopOpacity={0}/>
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="glow" height="130%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 18 -7
            " result="glow" />
            <feComposite in="SourceGraphic" in2="glow" operator="over" />
          </filter>
        </defs>
      </svg>
    </div>
  );

  // Handle refresh
  const handleRefresh = (e) => {
    if (e) e.stopPropagation();
    if (onRefresh && typeof onRefresh === 'function') {
      onRefresh();
    }
  };

  // Update chart dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (chartWrapperRef.current) {
        setChartWidth(chartWrapperRef.current.clientWidth);
        setChartHeight(chartWrapperRef.current.clientHeight);
      }
    };

    // Initial update
    updateDimensions();

    // Add resize listener
    window.addEventListener('resize', updateDimensions);

    // Observer for size changes
    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateDimensions);
      if (chartWrapperRef.current) {
        resizeObserver.observe(chartWrapperRef.current);
      }
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (resizeObserver && chartWrapperRef.current) {
        resizeObserver.unobserve(chartWrapperRef.current);
      }
    };
  }, []);

  // Calculate custom style if height prop is provided
  const customStyle = height ? { height } : { height: 'var(--chart-height)' };

  return (
    <div 
      className={`chart-card ${className}`}
      ref={chartCardRef}
      style={customStyle}
    >
      <div className="chart-header">
        <div className="chart-title">
          {title}
          <div className="chart-title-highlight"></div>
        </div>
        <div className="chart-actions">
          {onRefresh && (
            <button
              className="chart-action-btn"
              onClick={handleRefresh}
              aria-label="Refresh chart"
              title="Refresh data"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>
      
      <div 
        className="chart-wrapper" 
        ref={chartWrapperRef}
        style={{ width: '100%', height: 'calc(100% - 38px)' }}
      >
        {/* Render children if they exist */}
        {children && React.Children.map(children, child => {
          // Skip null or undefined children
          if (!child) return null;
          
          // Clone the child element with new props
          return React.cloneElement(child, {
            width: "100%",
            height: "100%",
            aspect: null,
            className: "chart-transition"
          });
        })}
        
        {/* Loading state overlay */}
        {loading && (
          <div className="chart-loading">
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>
      
      {/* SVG Definitions */}
      {svgDefs}
    </div>
  );
};

export default ResponsiveChartContainer;