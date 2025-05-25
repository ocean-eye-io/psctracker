// src/components/Logo.jsx
import React from 'react';

const Logo = ({ width = "32", height = "32", className = "", id = "logo" }) => {
  // Create unique IDs for filters and gradients to avoid conflicts when using multiple instances
  const uniqueId = `${id}-${Math.random().toString(36).substring(2, 9)}`;
  
  return (
    <svg 
      version="1.1" 
      xmlns="http://www.w3.org/2000/svg" 
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 500 500"
      style={{ enableBackground: "new 0 0 500 500" }}
      width={width}
      height={height}
      className={className}
      aria-label="FleetWatch Logo"
    >
      {/* Definitions for glowing effects */}
      <defs>
        {/* Enhanced glow filter with less blur */}
        <filter id={`${uniqueId}-glow`}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Stronger glow for key elements */}
        <filter id={`${uniqueId}-strongGlow`}>
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Outer glow only */}
        <filter id={`${uniqueId}-outerGlow`}>
          <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
          </feMerge>
        </filter>
        
        {/* Gradient for ship with holographic effect */}
        <linearGradient id={`${uniqueId}-shipGradient`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#00d4ff", stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: "#7b2ff7", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#0099cc", stopOpacity: 1 }} />
        </linearGradient>
        
        {/* Purple gradient for AI elements */}
        <linearGradient id={`${uniqueId}-aiGradient`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#b366ff", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#7b2ff7", stopOpacity: 1 }} />
        </linearGradient>
        
        {/* Holographic shimmer effect */}
        <linearGradient id={`${uniqueId}-holographic`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: "#00d4ff", stopOpacity: 0.8 }} />
          <stop offset="25%" style={{ stopColor: "#b366ff", stopOpacity: 0.8 }} />
          <stop offset="50%" style={{ stopColor: "#00ffaa", stopOpacity: 0.8 }} />
          <stop offset="75%" style={{ stopColor: "#b366ff", stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: "#00d4ff", stopOpacity: 0.8 }} />
          <animateTransform 
            attributeName="gradientTransform" 
            type="translate" 
            from="0 0" 
            to="1 0" 
            dur="3s" 
            repeatCount="indefinite"
          />
        </linearGradient>
        
        {/* Gradient for radar */}
        <radialGradient id={`${uniqueId}-radarGradient`}>
          <stop offset="0%" style={{ stopColor: "#00d4ff", stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: "#00d4ff", stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      
      {/* Multiple radar circles with outward pulse and fade animation */}
      {/* Glow layer */}
      <circle 
        cx="250" 
        cy="250" 
        r="100" 
        fill="none" 
        stroke="#00d4ff" 
        strokeWidth="3" 
        opacity="0.6" 
        filter={`url(#${uniqueId}-outerGlow)`}
      >
        <animate attributeName="r" values="100;180;200" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6;0.2;0" dur="3s" repeatCount="indefinite"/>
      </circle>
      {/* Sharp layer */}
      <circle 
        cx="250" 
        cy="250" 
        r="100" 
        fill="none" 
        stroke="#00d4ff" 
        strokeWidth="1.5" 
        opacity="1"
      >
        <animate attributeName="r" values="100;180;200" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0.4;0" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="stroke-width" values="1.5;1;0.5" dur="3s" repeatCount="indefinite"/>
      </circle>
      
      {/* Second pulse */}
      <circle 
        cx="250" 
        cy="250" 
        r="100" 
        fill="none" 
        stroke="#00d4ff" 
        strokeWidth="3" 
        opacity="0.6" 
        filter={`url(#${uniqueId}-outerGlow)`}
      >
        <animate attributeName="r" values="100;180;200" dur="3s" begin="1s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6;0.2;0" dur="3s" begin="1s" repeatCount="indefinite"/>
      </circle>
      <circle 
        cx="250" 
        cy="250" 
        r="100" 
        fill="none" 
        stroke="#00d4ff" 
        strokeWidth="1.5" 
        opacity="1"
      >
        <animate attributeName="r" values="100;180;200" dur="3s" begin="1s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0.4;0" dur="3s" begin="1s" repeatCount="indefinite"/>
        <animate attributeName="stroke-width" values="1.5;1;0.5" dur="3s" begin="1s" repeatCount="indefinite"/>
      </circle>
      
      {/* Third pulse */}
      <circle 
        cx="250" 
        cy="250" 
        r="100" 
        fill="none" 
        stroke="#00d4ff" 
        strokeWidth="3" 
        opacity="0.6" 
        filter={`url(#${uniqueId}-outerGlow)`}
      >
        <animate attributeName="r" values="100;180;200" dur="3s" begin="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6;0.2;0" dur="3s" begin="2s" repeatCount="indefinite"/>
      </circle>
      <circle 
        cx="250" 
        cy="250" 
        r="100" 
        fill="none" 
        stroke="#00d4ff" 
        strokeWidth="1.5" 
        opacity="1"
      >
        <animate attributeName="r" values="100;180;200" dur="3s" begin="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0.4;0" dur="3s" begin="2s" repeatCount="indefinite"/>
        <animate attributeName="stroke-width" values="1.5;1;0.5" dur="3s" begin="2s" repeatCount="indefinite"/>
      </circle>
      
      {/* Simplified ship with sharp edges and subtle glow */}
      <g transform="translate(125, 150) scale(0.5)">
        {/* Glow layer */}
        <path 
          d="M395.579,264.864V130.878h-63.987V86.044h-41.926V0h-89.332v86.044h-41.926v44.835H94.42v133.986L52.54,289.68L114.37,490 L245,432.18L375.63,490l61.83-200.32L395.579,264.864z" 
          fill={`url(#${uniqueId}-shipGradient)`} 
          filter={`url(#${uniqueId}-outerGlow)`} 
          opacity="0.5"
        />
        {/* Sharp layer */}
        <path 
          d="M395.579,264.864V130.878h-63.987V86.044h-41.926V0h-89.332v86.044h-41.926v44.835H94.42v133.986L52.54,289.68L114.37,490 L245,432.18L375.63,490l61.83-200.32L395.579,264.864z M220.594,20.261h48.811v65.783h-48.811V20.261z M178.668,106.304h21.666 h89.332h21.666v24.574H178.668V106.304z M114.681,151.139h260.638v101.72L245,175.64l-130.319,77.219V151.139z M362.98,462.25 L245,410.03l-117.98,52.22l-50.4-163.28L245,199.19l168.38,99.78L362.98,462.25z" 
          fill={`url(#${uniqueId}-shipGradient)`}
        />
      </g>
      
      {/* Simple scanning line with enhanced glow */}
      <line 
        x1="250" 
        y1="250" 
        x2="250" 
        y2="70" 
        stroke={`url(#${uniqueId}-radarGradient)`} 
        strokeWidth="4" 
        opacity="0.9" 
        filter={`url(#${uniqueId}-strongGlow)`}
      >
        <animateTransform 
          attributeName="transform" 
          type="rotate" 
          from="0 250 250" 
          to="360 250 250" 
          dur="3s" 
          repeatCount="indefinite"
        />
      </line>
      
      {/* Three simple data points with enhanced glow - now with purple AI accent */}
      <circle 
        cx="250" 
        cy="100" 
        r="6" 
        fill={`url(#${uniqueId}-aiGradient)`} 
        filter={`url(#${uniqueId}-strongGlow)`}
      >
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle 
        cx="150" 
        cy="350" 
        r="6" 
        fill="#00ff88" 
        filter={`url(#${uniqueId}-strongGlow)`}
      >
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" begin="0.7s" repeatCount="indefinite"/>
        <animate attributeName="r" values="6;8;6" dur="2s" begin="0.7s" repeatCount="indefinite"/>
      </circle>
      <circle 
        cx="350" 
        cy="350" 
        r="6" 
        fill="#00ff88" 
        filter={`url(#${uniqueId}-strongGlow)`}
      >
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" begin="1.4s" repeatCount="indefinite"/>
        <animate attributeName="r" values="6;8;6" dur="2s" begin="1.4s" repeatCount="indefinite"/>
      </circle>
      
      {/* Simple signal waves at top */}
      <g transform="translate(250, 80)">
        <path 
          d="M-10 0 Q0 -5 10 0" 
          fill="none" 
          stroke="#00d4ff" 
          strokeWidth="2" 
          strokeLinecap="round" 
          opacity="0.8" 
          filter={`url(#${uniqueId}-glow)`}
        >
          <animate attributeName="opacity" values="0;0.8;0" dur="2s" repeatCount="indefinite"/>
        </path>
        <path 
          d="M-15 -5 Q0 -10 15 -5" 
          fill="none" 
          stroke="#00d4ff" 
          strokeWidth="2" 
          strokeLinecap="round" 
          opacity="0.6" 
          filter={`url(#${uniqueId}-glow)`}
        >
          <animate attributeName="opacity" values="0;0.6;0" dur="2s" begin="0.5s" repeatCount="indefinite"/>
        </path>
      </g>
      
      {/* Hexagonal tech frame (subtle) with holographic effect */}
      <path 
        d="M250,60 L370,150 L370,350 L250,440 L130,350 L130,150 Z" 
        fill="none" 
        stroke={`url(#${uniqueId}-holographic)`} 
        strokeWidth="1.5" 
        opacity="0.3" 
        strokeDasharray="20,10" 
        filter={`url(#${uniqueId}-glow)`}
      >
        <animate attributeName="stroke-dashoffset" values="0;30" dur="4s" repeatCount="indefinite"/>
      </path>
      
      {/* Data flow lines (subtle) */}
      <path d="M250,250 L250,100" stroke="#00ff88" strokeWidth="1" opacity="0">
        <animate attributeName="opacity" values="0;0.6;0" dur="2s" repeatCount="indefinite"/>
      </path>
      <path d="M250,250 L150,350" stroke="#00ff88" strokeWidth="1" opacity="0">
        <animate attributeName="opacity" values="0;0.6;0" dur="2s" begin="0.7s" repeatCount="indefinite"/>
      </path>
      <path d="M250,250 L350,350" stroke="#00ff88" strokeWidth="1" opacity="0">
        <animate attributeName="opacity" values="0;0.6;0" dur="2s" begin="1.4s" repeatCount="indefinite"/>
      </path>
    </svg>
  );
};

export default Logo;