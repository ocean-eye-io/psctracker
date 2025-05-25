import React, { useState } from 'react';
import { Ship, BarChart2, LogOut, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom'; // Import useLocation
import { useAuth } from '../../context/AuthContext';
import './NavigationStyles.css';

// Remove onNavigate prop as it's no longer needed
const NavigationHeader = ({ activePage, userInfo }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  // const location = useLocation(); // No longer needed here, activePage is passed as prop

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const navItems = [
    { id: 'fleet', label: 'Dashboard', icon: <Ship size={20} />, path: '/fleet' },
    { id: 'defects', label: 'Defects Register', icon: <BarChart2 size={20} />, path: '/defects' },
  ];

  const handleNavClick = (id, e) => {
    e.preventDefault();
    // onNavigate is removed, as activePage is now derived from URL in AppLayout
    const navItem = navItems.find(item => item.id === id);
    if (navItem) navigate(navItem.path); // This correctly changes the URL
    if (sidebarOpen) setSidebarOpen(false);
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
              className={`nav-item ${activePage === item.id ? 'active' : ''}`} // Use activePage prop
              onClick={e => handleNavClick(item.id, e)}
            >
              {item.icon}
              <span>{item.label}</span>
              {activePage === item.id && <div className="active-indicator"></div>} {/* Use activePage prop */}
            </a>
          ))}
        </nav>

        {/* User profile area with logout */}
        <div className="user-profile">
          <div className="user-avatar">{getUserInitials()}</div>
          <div className="user-info">
            <span className="user-name">{getUserName()}</span>
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
              className={`sidebar-nav-item ${activePage === item.id ? 'active' : ''}`} // Use activePage prop
              onClick={e => handleNavClick(item.id, e)}
            >
              {item.icon}
              <span>{item.label}</span>
            </a>
          ))}
          {/* Add logout to mobile sidebar */}
          <a
            href="#"
            className="sidebar-nav-item logout-item"
            onClick={e => {
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
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={toggleSidebar}></div>}
    </>
  );
};

export default NavigationHeader;