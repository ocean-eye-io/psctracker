// src/components/layout/NavigationHeader.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Ship, 
  Menu, 
  X, 
  LogOut, 
  Home,
  Settings,
  BarChart3,
  AlertTriangle,
  Users,
  FileText,
  Calendar,
  MapPin
} from 'lucide-react';
import './NavigationStyles.css';

// Navigation configuration
const NAVIGATION_CONFIG = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: Home,
    tooltip: 'Main Dashboard'
  },
  {
    id: 'vessels',
    label: 'Vessels',
    path: '/vessels',
    icon: Ship,
    tooltip: 'Vessel Management'
  },
  {
    id: 'defects',
    label: 'Defects',
    path: '/defects',
    icon: AlertTriangle,
    tooltip: 'Equipment Defects'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: BarChart3,
    tooltip: 'Data Analytics'
  },
  {
    id: 'crew',
    label: 'Crew',
    path: '/crew',
    icon: Users,
    tooltip: 'Crew Management'
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: FileText,
    tooltip: 'Reports & Documents'
  },
  {
    id: 'schedule',
    label: 'Schedule',
    path: '/schedule',
    icon: Calendar,
    tooltip: 'Scheduling'
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    tooltip: 'System Settings'
  }
];

const NavigationHeader = ({ 
  user = { name: 'John Doe', role: 'Admin', initials: 'JD' },
  navigationItems = NAVIGATION_CONFIG, // Accept user-specific navigation items
  onLogout,
  currentModule = 'dashboard'
}) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 991);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Determine active navigation item
  const activeNavItem = useMemo(() => {
    const currentPath = location.pathname;
    return navigationItems.find(item => 
      currentPath.startsWith(item.path) || 
      (currentPath === '/' && item.id === 'dashboard')
    )?.id || 'dashboard';
  }, [location.pathname, navigationItems]);

  // Handle mobile menu toggle
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  // Handle logout
  const handleLogout = useCallback(() => {
    if (onLogout) {
      onLogout();
    } else {
      // Default logout behavior
      console.log('Logout clicked');
      // You might want to clear localStorage, redirect, etc.
    }
  }, [onLogout]);

  // Render navigation items
  const renderNavItems = useCallback((isSidebar = false) => {
    return navigationItems.map((item) => {
      const IconComponent = item.icon;
      const isActive = activeNavItem === item.id;
      
      if (isSidebar) {
        return (
          <Link
            key={item.id}
            to={item.path}
            className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            title={item.tooltip}
          >
            <IconComponent size={18} />
            <span>{item.label}</span>
          </Link>
        );
      }

      return (
        <Link
          key={item.id}
          to={item.path}
          className={`nav-item ${isActive ? 'active' : ''}`}
          title={item.tooltip}
        >
          <IconComponent />
          <span>{item.label}</span>
          {isActive && <div className="active-indicator" />}
        </Link>
      );
    });
  }, [activeNavItem, navigationItems]);

  return (
    <>
      <header className="navigation-header">
        {/* Mobile Menu Toggle */}
        {isMobile && (
          <button
            className="mobile-menu-toggle"
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        {/* Brand/Logo */}
        <div className="brand-container">
          <Ship className="brand-icon" />
          <div className="brand-text">
            <h1>FleetWatch</h1>
            <div className="animated-wave"></div>
          </div>
        </div>

        {/* Desktop Navigation */}
        {!isMobile && (
          <nav className="desktop-nav" role="navigation" aria-label="Main navigation">
            {renderNavItems()}
          </nav>
        )}

        {/* User Profile */}
        <div className="user-profile">
          <div className="user-avatar" title={`${user.name} - ${user.role}`}>
            {user.initials || user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
          </div>
          {!isMobile && (
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.role}</span>
            </div>
          )}
          <button
            className="logout-button"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {isMobile && (
        <>
          {isMobileMenuOpen && (
            <div 
              className="sidebar-backdrop" 
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
          )}
          <aside 
            className={`mobile-sidebar ${isMobileMenuOpen ? 'open' : ''}`}
            aria-hidden={!isMobileMenuOpen}
          >
            <div className="sidebar-header">
              <Ship className="brand-icon" size={24} />
              <h2>FleetWatch</h2>
            </div>
            
            <nav className="sidebar-nav" role="navigation" aria-label="Mobile navigation">
              {renderNavItems(true)}
              
              {/* Logout in sidebar */}
              <button
                className="sidebar-nav-item logout-item"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </nav>

            {/* User info in sidebar */}
            <div className="sidebar-user-info">
              <div className="user-avatar">
                {user.initials || user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </div>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-role">{user.role}</span>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
};

export default NavigationHeader;