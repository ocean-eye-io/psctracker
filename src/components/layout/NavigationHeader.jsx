// src/components/layout/NavigationHeader.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Home, 
  BarChart2, 
  FileText, 
  LogOut, 
  Users, 
  Upload, 
  Menu, 
  X, 
  FolderOpen 
} from 'lucide-react';
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
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const { signOut, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 991);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch user's assigned modules
  useEffect(() => {
    if (currentUser?.userId) {
      fetchUserModules(currentUser.userId);
    }
  }, [currentUser]);

  // Close dropdowns and sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false);
    setShowUserDropdown(false);
  }, [location.pathname]);

  // Handle escape key and click outside
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setShowUserDropdown(false);
      }
    };

    const handleClickOutside = (e) => {
      if (!e.target.closest('.user-profile')) {
        setShowUserDropdown(false);
      }
    };

    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

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
  const getCurrentPage = useCallback(() => {
    if (activePage) return activePage;
    
    const currentPath = location.pathname;
    const currentItem = navItems.find(item => currentPath.startsWith(item.path));
    return currentItem?.id || '';
  }, [activePage, location.pathname, navItems]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleNavClick = useCallback((item, e) => {
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
  }, [sidebarOpen, navigate, onNavigate]);

  const handleSignOut = useCallback(async () => {
    setShowUserDropdown(false);
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback navigation
      window.location.href = '/login';
    }
  }, [signOut, navigate]);

  // Handle user dropdown toggle
  const toggleUserDropdown = useCallback((e) => {
    e.stopPropagation();
    setShowUserDropdown(prev => !prev);
  }, []);

  // Get user's name from userInfo or currentUser
  const getUserName = useCallback(() => {
    const user = userInfo || currentUser;
    if (user) {
      if (user.name) return user.name;
      if (user.given_name && user.family_name) {
        return `${user.given_name} ${user.family_name}`;
      }
      return user.email || user.username || 'User';
    }
    return 'User';
  }, [userInfo, currentUser]);

  // Get user's initials for avatar
  const getUserInitials = useCallback(() => {
    const name = getUserName();
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }, [getUserName]);

  // Get user role
  const getUserRole = useCallback(() => {
    const user = userInfo || currentUser;
    return user?.role || user?.userRole || 'User';
  }, [userInfo, currentUser]);

  const currentPageId = getCurrentPage();

  // Render navigation items
  const renderNavItems = useCallback((isSidebar = false) => {
    if (navItems.length === 0) {
      return isSidebar ? (
        <div className="sidebar-nav-empty">No navigation items available</div>
      ) : (
        <div className="nav-empty">No navigation items available</div>
      );
    }

    return navItems.map(item => {
      const isActive = currentPageId === item.id;
      
      if (isSidebar) {
        return (
          <button
            key={item.id}
            className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            onClick={(e) => handleNavClick(item, e)}
            type="button"
          >
            {React.cloneElement(item.icon, { size: 18 })}
            <span>{item.label}</span>
          </button>
        );
      }

      return (
        <button
          key={item.id}
          className={`nav-item ${isActive ? 'active' : ''}`}
          onClick={(e) => handleNavClick(item, e)}
          title={`${item.label} (${item.moduleName})`}
          type="button"
        >
          {React.cloneElement(item.icon, { size: 20 })}
          <span>{item.label}</span>
          {isActive && <div className="active-indicator"></div>}
        </button>
      );
    });
  }, [navItems, currentPageId, handleNavClick]);

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
          <div className="user-avatar-container">
            <div className="user-avatar">{getUserInitials()}</div>
          </div>
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
          <div className="user-avatar-container">
            <div className="user-avatar">{getUserInitials()}</div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* Mobile menu toggle */}
      {isMobile && (
        <button 
          className="mobile-menu-toggle" 
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}

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
        {!isMobile && (
          <nav className="desktop-nav" role="navigation" aria-label="Main navigation">
            {renderNavItems()}
          </nav>
        )}

        {/* User profile area with dropdown */}
        <div className="user-profile">
          {/* Avatar with dropdown */}
          <div 
            className="user-avatar-container"
            onClick={toggleUserDropdown}
          >
            <div className="user-avatar" title={getUserName()}>
              {getUserInitials()}
            </div>
            
            {/* User Dropdown - Only show on desktop when clicked */}
            {!isMobile && showUserDropdown && (
              <div className="user-dropdown">
                <div className="user-dropdown-content">
                  <div className="user-dropdown-name">{getUserName()}</div>
                </div>
                <hr className="user-dropdown-divider" />
                <button
                  className="user-dropdown-item logout-item"
                  onClick={handleSignOut}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {isMobile && (
        <>
          {sidebarOpen && (
            <div 
              className="sidebar-backdrop" 
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
          <aside 
            className={`mobile-sidebar ${sidebarOpen ? 'open' : ''}`}
            aria-hidden={!sidebarOpen}
          >
            <div className="sidebar-header">
              <Logo width="24" height="24" />
              <h2>FleetWatch</h2>
            </div>
            
            <nav className="sidebar-nav" role="navigation" aria-label="Mobile navigation">
              {renderNavItems(true)}
              
              {/* Add logout to mobile sidebar */}
              <button
                className="sidebar-nav-item logout-item"
                onClick={handleSignOut}
                type="button"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </nav>

            {/* User info in sidebar */}
            <div className="sidebar-user-info">
              <div className="user-avatar">{getUserInitials()}</div>
              <div className="user-info">
                <span className="user-name">{getUserName()}</span>
                <span className="user-role">{getUserRole()}</span>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
};

export default NavigationHeader;