// src/components/layout/NavigationHeader.jsx
import React, { useState } from 'react';
import { Ship, Home, Anchor, BarChart2, Settings, Menu, X, FileText } from 'lucide-react';
import './NavigationStyles.css';

const NavigationHeader = ({ activePage, onNavigate }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const handleNavClick = (id, e) => {
    e.preventDefault();
    
    // Special case for 'reports' (Defects Register)
    if (id === 'reports') {
      // Open defectslog.netlify.app in a new tab
      window.open('https://defectslog.netlify.app', '_blank');
      
      // Don't navigate away from current page
      return;
    }
    
    // Map 'reports' to 'defects' for the defects dashboard (keeping this part for other navigation functionality)
    const pageId = id === 'reports' ? 'defects' : id;
    
    if (onNavigate) {
      onNavigate(pageId);
    }
    
    // Close sidebar on mobile if it's open
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  };
  
  const navItems = [
    //{ id: 'dashboard', label: 'Dashboard', icon: <Home size={20} />, path: '/dashboard' },
    { id: 'fleet', label: 'Dashboard', icon: <Ship size={20} />, path: '/fleet' },
    { id: 'reports', label: 'Defects Register', icon: <BarChart2 size={20} />, path: '/reports' },
    { id: 'reporting', label: 'Vessel Reporting', icon: <FileText size={20} />, path: '/reporting' },
    //{ id: 'ports', label: 'Ports', icon: <Anchor size={20} />, path: '/ports' },
    //{ id: 'settings', label: 'Settings', icon: <Settings size={20} />, path: '/settings' }
  ];
  
  return (
    <>
      {/* Mobile menu toggle */}
      <button className="mobile-menu-toggle" onClick={toggleSidebar}>
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      {/* Header */}
      <header className="navigation-header">
        <div className="brand-container">
          <Ship size={28} className="brand-icon" />
          <div className="brand-text">
            <h1>FleetWatch</h1>
            <div className="animated-wave"></div>
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          {navItems.map(item => (
            <a 
              key={item.id}
              href={item.path}
              className={`nav-item ${activePage === item.id || (item.id === 'reports' && activePage === 'defects') ? 'active' : ''}`}
              onClick={(e) => handleNavClick(item.id, e)}
            >
              {item.icon}
              <span>{item.label}</span>
              {(activePage === item.id || (item.id === 'reports' && activePage === 'defects')) && <div className="active-indicator"></div>}
            </a>
          ))}
        </nav>
        
        {/* User profile area */}
        <div className="user-profile">
          <div className="user-avatar">JD</div>
          <div className="user-info">
            <span className="user-name">John Doe</span>
            <span className="user-role">Fleet Manager</span>
          </div>
        </div>
      </header>
      
      {/* Mobile Sidebar */}
      <aside className={`mobile-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Ship size={24} />
          <h2>FleetWatch</h2>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <a 
              key={item.id}
              href={item.path}
              className={`sidebar-nav-item ${activePage === item.id || (item.id === 'reports' && activePage === 'defects') ? 'active' : ''}`}
              onClick={(e) => handleNavClick(item.id, e)}
            >
              {item.icon}
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>
      
      {/* Backdrop for mobile */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={toggleSidebar}></div>}
    </>
  );
};

export default NavigationHeader;