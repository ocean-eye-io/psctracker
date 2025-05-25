// src/components/layout/NavigationHeader.jsx
import React, { useState } from 'react';
// REMOVED: Ship icon from lucide-react as it's replaced by Logo component
import { Home, Anchor, BarChart2, Settings, Menu, X, FileText, LogOut, Users } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../Logo'; // IMPORTED: Your new Logo component
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

    // For internal navigation, use navigate
    if (id === 'admin') {
      navigate('/admin');
    } else if (onNavigate) {
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

  // Placeholder for checking if user is admin
  // IMPORTANT: Replace this with actual RBAC logic based on user's roles fetched from your backend
  const isAdminUser = () => {
    // For now, let's assume if the user's email contains 'admin', they are an admin.
    // In a real application, you would fetch user roles from your backend (e.g., from the /admin/users endpoint)
    // and check if they have an 'Admin' role or a specific permission.
    return userInfo && userInfo.email && userInfo.email.includes('admin');
  };

  const navItems = [
    { id: 'fleet', label: 'Dashboard', icon: <Home size={20} />, path: '/fleet' }, // Changed from Ship to Home for consistency with common dashboard icons
    { id: 'reports', label: 'Defects Register', icon: <BarChart2 size={20} />, path: '/reports' },
    // Conditionally add Admin link
    //{ id: 'admin', label: 'Admin', icon: <Users size={20} />, path: '/admin' }
  ];

  return (
    <>
      {/* Mobile menu toggle */}
      {/* <button className="mobile-menu-toggle" onClick={toggleSidebar}>
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button> */}

      {/* Header */}
      <header className="navigation-header">
        <div className="brand-container">
          {/* REPLACED: Ship icon with Logo component */}
          <Logo width="70" height="70" className="brand-icon" id="nav-logo" /> 
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
              className={`nav-item ${activePage === item.id || (item.id === 'reports' && activePage === 'defects') || (item.id === 'admin' && activePage === 'admin') ? 'active' : ''}`}
              onClick={(e) => handleNavClick(item.id, e)}
            >
              {item.icon}
              <span>{item.label}</span>
              {(activePage === item.id || (item.id === 'reports' && activePage === 'defects') || (item.id === 'admin' && activePage === 'admin')) && <div className="active-indicator"></div>}
            </a>
          ))}
        </nav>

        {/* User profile area with logout */}
        <div className="user-profile">
          <div className="user-avatar">{getUserInitials()}</div>
          <div className="user-info">
            <span className="user-name">{getUserName()}</span>
            {/* <span className="user-role">{getUserRole()}</span> */}
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
          {/* REPLACED: Ship icon with Logo component in sidebar */}
          <Logo width="24" height="24" /> 
          <h2>FleetWatch</h2>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <a
              key={item.id}
              href={item.path}
              className={`sidebar-nav-item ${activePage === item.id || (item.id === 'reports' && activePage === 'defects') || (item.id === 'admin' && activePage === 'admin') ? 'active' : ''}`}
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