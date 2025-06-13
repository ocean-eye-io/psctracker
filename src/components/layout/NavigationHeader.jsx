// src/components/layout/NavigationHeader.jsx
import React, { useState, useEffect } from 'react';
import { Home, BarChart2, FileText, LogOut, Users, Upload, Menu, X, FolderOpen } from 'lucide-react'; 
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../Logo';
import './NavigationStyles.css';

// Module name mapping from database to navigation (in correct sequence)
const MODULE_NAVIGATION_MAP = {
  'PSC TRACKER': {
    id: 'fleet',
    label: 'Dashboard', 
    icon: <Home size={20} />,
    path: '/fleet',
    order: 1
  },
  'DEFECTS REGISTER': {
    id: 'defects',
    label: 'Defects Register',
    icon: <BarChart2 size={20} />,
    path: '/defects',
    order: 2
  },
  'PSC REPORTING': {
    id: 'reporting',
    label: 'PSC Reports',
    icon: <FileText size={20} />,
    path: '/reporting',
    order: 3
  },
  'Files upload': {
    id: 'files',
    label: 'File Manager',
    icon: <Upload size={20} />,
    path: '/files',
    order: 4
  },
  'Upload Circulars': {
    id: 'circulars',
    label: 'Upload Circulars',
    icon: <FolderOpen size={20} />,
    path: '/circulars',
    order: 5
  },
  'ADMIN': {
    id: 'admin',
    label: 'Admin',
    icon: <Users size={20} />,
    path: '/admin',
    order: 6
  }
};

const ADMIN_API_URL = 'https://bavzk3zqphycvshhqklb72l4cu0cnisv.lambda-url.ap-south-1.on.aws';

const NavigationHeader = ({ activePage, onNavigate, userInfo, onModulesLoaded }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navItems, setNavItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { signOut, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch user's assigned modules
  useEffect(() => {
    if (currentUser?.userId) {
      fetchUserModules(currentUser.userId);
    }
  }, [currentUser]);

  const fetchUserModules = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${ADMIN_API_URL}/user/modules?user_id=${userId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user modules');
      }
      
      // Transform database modules to navigation items (already sorted by database query)
      const navigationItems = data
        .map(module => {
          const navConfig = MODULE_NAVIGATION_MAP[module.module_name];
          if (!navConfig) {
            console.warn(`No navigation configuration found for module: ${module.module_name}`);
            return null;
          }
          return {
            ...navConfig,
            moduleId: module.module_id,
            moduleName: module.module_name
          };
        })
        .filter(Boolean); // Remove null entries
      
      setNavItems(navigationItems);
      
      // Notify parent component about modules loaded
      if (onModulesLoaded) {
        onModulesLoaded(navigationItems);
      }
      
      if (navigationItems.length === 0) {
        setError('No modules assigned to your account. Please contact your administrator.');
      }
    } catch (error) {
      console.error('Error fetching user modules:', error);
      setError(`Failed to load navigation: ${error.message}`);
      setNavItems([]); // Show no navigation items on error
      
      // Notify parent component about no modules
      if (onModulesLoaded) {
        onModulesLoaded([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Determine active page based on current location if activePage prop is not provided
  const getCurrentPage = () => {
    if (activePage) return activePage;
    
    const currentPath = location.pathname;
    const currentItem = navItems.find(item => currentPath.startsWith(item.path));
    return currentItem?.id || '';
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleNavClick = (item, e) => {
    e.preventDefault();
    
    console.log('Navigation clicked:', item.id, item.path);

    // Close sidebar on mobile if it's open
    if (sidebarOpen) {
      setSidebarOpen(false);
    }

    // Always use React Router navigation
    try {
      navigate(item.path);
      console.log('Navigated to:', item.path);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to window.location if navigate fails
      window.location.href = item.path;
    }

    // Call onNavigate callback if provided (for parent component state management)
    if (onNavigate) {
      onNavigate(item.id);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback navigation
      window.location.href = '/login';
    }
  };

  // Get user's name from userInfo or currentUser
  const getUserName = () => {
    const user = userInfo || currentUser;
    if (user) {
      if (user.name) return user.name;
      if (user.given_name && user.family_name) {
        return `${user.given_name} ${user.family_name}`;
      }
      return user.email || user.username || 'User';
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

  const currentPageId = getCurrentPage();

  // Loading state
  if (loading) {
    return (
      <header className="navigation-header">
        <div className="brand-container">
          <Logo width="70" height="70" className="brand-icon" id="nav-logo" />
          <div className="brand-text">
            <h1>FleetWatch</h1>
            <div className="animated-wave"></div>
          </div>
        </div>
        <nav className="desktop-nav">
          <div className="nav-loading">Loading navigation...</div>
        </nav>
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
    );
  }

  // Error state
  if (error) {
    return (
      <header className="navigation-header">
        <div className="brand-container">
          <Logo width="70" height="70" className="brand-icon" id="nav-logo" />
          <div className="brand-text">
            <h1>FleetWatch</h1>
            <div className="animated-wave"></div>
          </div>
        </div>
        <nav className="desktop-nav">
          <div className="nav-error">
            <span>{error}</span>
            <button 
              onClick={() => fetchUserModules(currentUser?.userId)}
              className="retry-nav-button"
            >
              Retry
            </button>
          </div>
        </nav>
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
    );
  }

  return (
    <>
      {/* Mobile menu toggle */}
      <button className="mobile-menu-toggle" onClick={toggleSidebar}>
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Header */}
      <header className="navigation-header">
        <div className="brand-container">
          <Logo width="70" height="70" className="brand-icon" id="nav-logo" />
          <div className="brand-text">
            <h1>FleetWatch</h1>
            <div className="animated-wave"></div>
          </div>
        </div>

        {/* Desktop Navigation - centered */}
        <nav className="desktop-nav">
          {navItems.length === 0 ? (
            <div className="nav-empty">No navigation items available</div>
          ) : (
            navItems.map(item => (
              <button
                key={item.id}
                className={`nav-item ${currentPageId === item.id ? 'active' : ''}`}
                onClick={(e) => handleNavClick(item, e)}
                title={`${item.label} (${item.moduleName})`}
                type="button"
              >
                {item.icon}
                <span>{item.label}</span>
                {currentPageId === item.id && <div className="active-indicator"></div>}
              </button>
            ))
          )}
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
            type="button"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <aside className={`mobile-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Logo width="24" height="24" />
          <h2>FleetWatch</h2>
        </div>
        <nav className="sidebar-nav">
          {navItems.length === 0 ? (
            <div className="sidebar-nav-empty">No navigation items available</div>
          ) : (
            navItems.map(item => (
              <button
                key={item.id}
                className={`sidebar-nav-item ${currentPageId === item.id ? 'active' : ''}`}
                onClick={(e) => handleNavClick(item, e)}
                type="button"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))
          )}

          {/* Add logout to mobile sidebar */}
          <button
            className="sidebar-nav-item logout-item"
            onClick={handleSignOut}
            type="button"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
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