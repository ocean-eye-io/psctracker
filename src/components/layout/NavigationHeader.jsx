// src/components/layout/NavigationHeader.jsx
import React, { useState } from 'react';
import { Ship, Home, Anchor, BarChart2, Settings, Menu, X, FileText, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './NavigationStyles.css';

const NavigationHeader = ({ activePage, onNavigate, userInfo }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  
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
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };
  
  // Get user's name from Cognito attributes or use a default
  const getUserName = () => {
    if (userInfo) {
      if (userInfo.name) return userInfo.name;
      if (userInfo.given_name && userInfo.family_name) {
        return `${userInfo.given_name} ${userInfo.family_name}`;
      }
      return userInfo.email || userInfo.username || 'User';
    }
    return 'User';
  };
  
  // Get user's initials for avatar
  const getUserInitials = () => {
    const name = getUserName();
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Get user's role (default for now, will be expanded with RBAC later)
  const getUserRole = () => {
    return 'Fleet Manager';
  };
  
  const navItems = [
    //{ id: 'dashboard', label: 'Dashboard', icon: <Home size={20} />, path: '/dashboard' },
    { id: 'fleet', label: 'Dashboard', icon: <Ship size={20} />, path: '/fleet' },
    { id: 'reports', label: 'Defects Register', icon: <BarChart2 size={20} />, path: '/reports' },
    //{ id: 'reporting', label: 'Vessel Reporting', icon: <FileText size={20} />, path: '/reporting' },
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
        
        {/* Desktop Navigation - centered */}
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
        
        {/* User profile area with logout */}
        <div className="user-profile">
          <div className="user-avatar">{getUserInitials()}</div>
          <div className="user-info">
            <span className="user-name">{getUserName()}</span>
            <span className="user-role">{getUserRole()}</span>
          </div>
          <button 
            className="logout-button" 
            onClick={handleSignOut}
            aria-label="Sign out"
          >
            <LogOut size={20} />
          </button>
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
          
          {/* Add logout to mobile sidebar */}
          <a 
            href="#"
            className="sidebar-nav-item logout-item"
            onClick={(e) => {
              e.preventDefault();
              handleSignOut();
            }}
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </a>
        </nav>
        
        {/* User info in sidebar */}
        <div className="sidebar-user-info">
          <div className="user-avatar">{getUserInitials()}</div>
          <div>
            <div className="user-name">{getUserName()}</div>
            {/* <div className="user-role">{getUserRole()}</div> */}
          </div>
        </div>
      </aside>
      
      {/* Backdrop for mobile */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={toggleSidebar}></div>}
    </>
  );
};

export default NavigationHeader;