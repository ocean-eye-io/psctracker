import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  MapPin,
  User,
  Clock,
  Ship,
  Settings,
  Shield,
  Target,
  Search,
  Eye,
  ChevronRight,
  ChevronDown,
  Save,
  Send,
  AlertCircle,
  FileText,
  Compass,
  Wrench,
  Droplets,
  Zap,
  Filter,
  RefreshCw,
  Camera,
  MoreHorizontal,
  Plus,
  Minus
} from 'lucide-react';

const ModernChecklistForm = ({
  vessel = {
    vessel_name: "GENCO BEAR",
    imo_no: "9469259"
  },
  template = {
    name: "Port State Control Inspection",
    processed_items: []
  },
  existingChecklist = null,
  onSave = () => {},
  onSubmit = () => {},
  onCancel = () => {},
  loading = false,
  currentUser = { name: "John Doe" },
  mode = 'edit'
}) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [expandedSections, setExpandedSections] = useState(new Set(['deck']));
  const [responses, setResponses] = useState({});
  const [completedItems, setCompletedItems] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPIC, setFilterPIC] = useState('all');
  const [showOnlyMandatory, setShowOnlyMandatory] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [viewMode, setViewMode] = useState('compact'); // compact, detailed

  // Category configuration for different item types
  const categoryConfig = {
    safety: { icon: <Shield size={12} />, color: "#E74C3C", bg: "badge-danger", light: "#fee2e2" },
    security: { icon: <Eye size={12} />, color: "#3498DB", bg: "badge-info", light: "#dbeafe" },
    fire_safety: { icon: <Zap size={12} />, color: "#F39C12", bg: "badge-warning", light: "#fef3c7" },
    navigation: { icon: <Compass size={12} />, color: "#3498DB", bg: "badge-info", light: "#dbeafe" },
    mechanical: { icon: <Wrench size={12} />, color: "#F1C40F", bg: "badge-warning", light: "#fef3c7" },
    hygiene: { icon: <Droplets size={12} />, color: "#2ECC71", bg: "badge-success", light: "#dcfce7" },
    default: { icon: <AlertCircle size={12} />, color: "#95A5A6", bg: "badge-default", light: "#f3f4f6" }
  };

  // Process items from your actual template data
  const items = useMemo(() => {
    // Try multiple possible paths for the sections data
    const sections = template?.template_data?.sections || 
                    template?.sections || 
                    template?.processed_items || 
                    [];

    if (!sections || sections.length === 0) {
      console.warn('Template has no sections in any expected location:', template);
      return [];
    }

    const allItems = [];
    
    // Handle both array of sections and processed_items format
    if (Array.isArray(sections) && sections[0]?.subsections) {
      // This is the sections format
      sections.forEach(section => {
        section.subsections?.forEach(subsection => {
          subsection.items?.forEach(item => {
            allItems.push({
              ...item,
              section_name: section.section_name || 'GENERAL',
              sub_section_name: subsection.subsection_name || 'General Items',
              category: determineCategoryFromItem(item),
              riskLevel: item.is_mandatory ? 'high' : 'medium',
              estimatedTime: estimateTimeFromItem(item),
              location: extractLocationFromItem(item),
              frequency: item.is_mandatory ? 'Daily' : 'Weekly'
            });
          });
        });
      });
    } else if (Array.isArray(sections)) {
      // This might be processed_items format
      sections.forEach(item => {
        allItems.push({
          ...item,
          category: determineCategoryFromItem(item),
          riskLevel: item.is_mandatory ? 'high' : 'medium',
          estimatedTime: estimateTimeFromItem(item),
          location: extractLocationFromItem(item),
          frequency: item.is_mandatory ? 'Daily' : 'Weekly'
        });
      });
    }

    console.log('Processed items:', allItems.length, allItems.slice(0, 3));
    return allItems;
  }, [template]);

  // Group items by sections using actual data
  const sections = useMemo(() => {
    const sectionGroups = {};

    items.forEach(item => {
      // Normalize section names to avoid duplicates (GALLEY vs Galley)
      const normalizedSectionName = item.section_name?.toUpperCase() || 'GENERAL';
      
      if (!sectionGroups[normalizedSectionName]) {
        sectionGroups[normalizedSectionName] = {
          section_name: normalizedSectionName,
          section_id: normalizedSectionName.toLowerCase().replace(/\s+/g, '_'),
          icon: getSectionIcon(normalizedSectionName),
          color: getSectionColor(normalizedSectionName),
          items: [],
          subsections: {}
        };
      }

      const subSectionName = item.sub_section_name || 'General Items';
      const subsectionKey = `${normalizedSectionName}_${subSectionName}`;
      
      if (!sectionGroups[normalizedSectionName].subsections[subsectionKey]) {
        sectionGroups[normalizedSectionName].subsections[subsectionKey] = {
          subsection_name: subSectionName,
          id: subSectionName.toLowerCase().replace(/\s+/g, '_'),
          items: []
        };
      }

      sectionGroups[normalizedSectionName].items.push(item);
      sectionGroups[normalizedSectionName].subsections[subsectionKey].items.push(item);
    });

    return Object.values(sectionGroups).map(section => ({
      ...section,
      subsections: Object.values(section.subsections)
    }));
  }, [items]);

  // Update timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper functions
  function determineCategoryFromItem(item) {
    const check = item.description?.toLowerCase() || '';
    const pic = item.pic?.toLowerCase() || '';

    if (check.includes('fire') || check.includes('alarm') || check.includes('smoke')) return 'fire_safety';
    if (check.includes('navigation') || check.includes('radar') || check.includes('gps') || pic.includes('master')) return 'navigation';
    if (check.includes('engine') || check.includes('mechanical') || pic.includes('engineer')) return 'mechanical';
    if (check.includes('food') || check.includes('galley') || check.includes('hygiene') || pic.includes('cook')) return 'hygiene';
    if (check.includes('safety') || check.includes('life') || check.includes('emergency')) return 'safety';
    if (check.includes('security') || check.includes('drill') || check.includes('dpa') || check.includes('cso')) return 'security';
    return 'default';
  }

  function estimateTimeFromItem(item) {
    const check = item.description?.toLowerCase() || '';
    if (check.includes('test') || check.includes('check')) return 10;
    if (check.includes('inspect') || check.includes('verify')) return 15;
    if (check.includes('drill') || check.includes('exercise')) return 30;
    return 5;
  }

  function extractLocationFromItem(item) {
    const guidance = item.guidance?.toLowerCase() || '';
    const sectionName = item.section_name?.toLowerCase() || '';
    
    if (guidance.includes('bridge') || sectionName.includes('bridge')) return 'Bridge';
    if (guidance.includes('engine room') || sectionName.includes('engine')) return 'Engine Room';
    if (guidance.includes('deck') || sectionName.includes('deck')) return 'Main Deck';
    if (guidance.includes('galley') || sectionName.includes('galley')) return 'Galley';
    if (guidance.includes('accommodation')) return 'Accommodation';
    return item.section_name || 'Various Locations';
  }

  function getSectionIcon(sectionName) {
    const section = sectionName.toLowerCase();
    if (section.includes('deck') || section.includes('bridge')) return <Ship size={16} />;
    if (section.includes('engine') || section.includes('mechanical')) return <Settings size={16} />;
    if (section.includes('galley') || section.includes('catering')) return <Target size={16} />;
    if (section.includes('safety') || section.includes('fire')) return <Shield size={16} />;
    if (section.includes('navigation')) return <Compass size={16} />;
    if (section.includes('accommodation')) return <User size={16} />;
    return <FileText size={16} />;
  }

  function getSectionColor(sectionName) {
    const section = sectionName.toLowerCase();
    if (section.includes('deck') || section.includes('bridge')) return '#3498DB';
    if (section.includes('engine') || section.includes('mechanical')) return '#F39C12';
    if (section.includes('galley') || section.includes('catering')) return '#2ECC71';
    if (section.includes('safety') || section.includes('fire')) return '#E74C3C';
    if (section.includes('navigation')) return '#9B59B6';
    if (section.includes('accommodation')) return '#F1C40F';
    return '#95A5A6';
  }

  // Get unique PICs for filtering
  const uniquePICs = useMemo(() => {
    return [...new Set(items.map(item => item.pic).filter(Boolean))];
  }, [items]);

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchTerm ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.section_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPIC = filterPIC === 'all' || item.pic === filterPIC;
      const matchesMandatory = !showOnlyMandatory || item.is_mandatory;

      return matchesSearch && matchesPIC && matchesMandatory;
    });
  }, [items, searchTerm, filterPIC, showOnlyMandatory]);

  // Calculate statistics
  const getStats = () => {
    const total = items.length;
    const completed = completedItems.size;
    const mandatory = items.filter(item => item.is_mandatory).length;
    const mandatoryCompleted = items.filter(item =>
      item.is_mandatory && completedItems.has(item.item_id)
    ).length;

    return {
      total,
      completed,
      mandatory,
      mandatoryCompleted,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      mandatoryPercentage: mandatory > 0 ? Math.round((mandatoryCompleted / mandatory) * 100) : 100
    };
  };

  // Handle response changes
  const handleResponse = (itemId, value, type = 'response') => {
    setResponses(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [type]: value,
        timestamp: new Date().toISOString()
      }
    }));

    if (type === 'response' && (value === 'Yes' || value === 'No' || value === 'N/A')) {
      setCompletedItems(prev => new Set([...prev, itemId]));
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Save and submit handlers
  const handleSave = async (isAutoSave = false) => {
    if (mode === 'view') return;
    setSaving(true);
    try {
      await onSave(responses, isAutoSave);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (mode === 'view') return;
    setSubmitting(true);
    try {
      await onSubmit(responses);
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="dashboard-container checklist-form-container">
        <div className="checklist-loading-container">
          <div className="checklist-loading-spinner"></div>
          <div className="checklist-loading-text">Loading Maritime Checklist...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Compact Header */}
      <header className="dashboard-header" style={{ 
        background: 'white', 
        borderBottom: '1px solid #e2e8f0', 
        padding: '8px 16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onCancel} className="control-btn" style={{ padding: '4px' }}>
            <ArrowLeft size={16} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ship size={20} style={{ color: '#3498DB' }} />
            <div>
              <h1 style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                {template?.name || 'Maritime Checklist'}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                <span>{vessel?.vessel_name}</span>
                <span>IMO: {vessel?.imo_no}</span>
                <span>{currentTime.toLocaleTimeString()}</span>
                <span className={`badge ${mode === 'view' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '10px' }}>
                  {mode === 'view' ? 'READ ONLY' : 'EDITING'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
            <span>{stats.percentage}%</span>
            <div style={{ width: '40px', height: '40px', position: 'relative' }}>
              <svg style={{ width: '40px', height: '40px', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#3498DB"
                  strokeWidth="2"
                  strokeDasharray={`${stats.percentage}, 100`}
                />
              </svg>
            </div>
          </div>

          {mode === 'edit' && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                style={{
                  padding: '6px 12px',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                {saving ? <RefreshCw size={12} className="spinning" /> : <Save size={12} />}
                Save
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '6px 12px',
                  background: '#10b981',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                {submitting ? <RefreshCw size={12} className="spinning" /> : <Send size={12} />}
                Submit
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Compact Filter Bar */}
      <div style={{ 
        background: 'white', 
        borderBottom: '1px solid #e2e8f0', 
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search checklist items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '4px 8px 4px 28px',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontSize: '12px',
              height: '24px'
            }}
          />
        </div>

        <select
          value={filterPIC}
          onChange={(e) => setFilterPIC(e.target.value)}
          style={{
            padding: '4px 8px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            fontSize: '12px',
            height: '24px'
          }}
        >
          <option value="all">All Personnel</option>
          {uniquePICs.map(pic => (
            <option key={pic} value={pic}>{pic}</option>
          ))}
        </select>

        <button
          onClick={() => setShowOnlyMandatory(!showOnlyMandatory)}
          style={{
            padding: '4px 8px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            fontSize: '12px',
            height: '24px',
            background: showOnlyMandatory ? '#ef4444' : 'white',
            color: showOnlyMandatory ? 'white' : '#64748b',
            cursor: 'pointer'
          }}
        >
          {showOnlyMandatory ? 'Mandatory Only' : 'Show All'}
        </button>

        <div style={{ display: 'flex', gap: '4px', fontSize: '11px', color: '#64748b' }}>
          <span>{stats.completed}/{stats.total} Complete</span>
          <span>•</span>
          <span>{stats.mandatoryCompleted}/{stats.mandatory} Mandatory</span>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div style={{ display: 'flex', height: 'calc(100vh - 120px)' }}>
        
        {/* Left Sidebar - Section Navigation */}
        <div style={{ 
          width: '280px', 
          background: 'white', 
          borderRight: '1px solid #e2e8f0',
          overflowY: 'auto',
          padding: '8px'
        }}>
          {sections.map((section, sectionIndex) => {
            const sectionItems = section.items || [];
            const completedCount = sectionItems.filter(item => completedItems.has(item.item_id)).length;
            const progress = sectionItems.length > 0 ? (completedCount / sectionItems.length) * 100 : 0;
            const isExpanded = expandedSections.has(section.section_id);

            return (
              <div key={`sidebar_${section.section_id}_${sectionIndex}`} style={{ marginBottom: '4px' }}>
                <div
                  onClick={() => toggleSection(section.section_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    background: isExpanded ? '#f1f5f9' : 'transparent',
                    border: isExpanded ? '1px solid #e2e8f0' : '1px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '4px', 
                      background: section.color + '20',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: section.color
                    }}>
                      {section.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1e293b' }}>{section.section_name}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>
                        {completedCount}/{sectionItems.length} items
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: section.color }}>
                      {Math.round(progress)}%
                    </div>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ 
                  height: '2px', 
                  background: '#f1f5f9', 
                  margin: '2px 8px 4px',
                  borderRadius: '1px',
                  overflow: 'hidden'
                }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      background: section.color,
                      width: `${progress}%`,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                {/* Subsections */}
                {isExpanded && section.subsections?.map((subsection, subIndex) => (
                  <div key={`sidebar_sub_${section.section_id}_${subIndex}`} style={{ marginLeft: '16px', marginBottom: '2px' }}>
                    <div style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      color: '#64748b',
                      background: '#f8fafc',
                      borderRadius: '4px',
                      border: '1px solid #f1f5f9'
                    }}>
                      {subsection.subsection_name} ({subsection.items?.length || 0})
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Right Content - Checklist Items */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '8px',
          background: '#f8fafc'
        }}>
          {sections.filter(section => expandedSections.has(section.section_id)).map((section) => (
            <div key={`section_${section.section_id}`} style={{ marginBottom: '16px' }}>
              {section.subsections?.map((subsection, subsectionIndex) => (
                <div key={`${section.section_id}_${subsection.id}_${subsectionIndex}`} style={{ marginBottom: '12px' }}>
                  <h3 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#1e293b',
                    padding: '6px 12px',
                    background: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {subsection.subsection_name}
                  </h3>
                  
                  {/* Grid Layout for Items */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: '6px'
                  }}>
                    {(subsection.items || []).map((item, itemIndex) => (
                      <CompactChecklistItem
                        key={`${item.item_id}_${itemIndex}`}
                        item={item}
                        responses={responses}
                        isCompleted={completedItems.has(item.item_id)}
                        onResponse={handleResponse}
                        categoryConfig={categoryConfig}
                        mode={mode}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Ultra Compact Checklist Item Component with formatted description
const CompactChecklistItem = ({ item, responses, isCompleted, onResponse, categoryConfig, mode }) => {
  const [showDetails, setShowDetails] = useState(false);
  const response = responses[item.item_id] || {};

  // Format description with proper numbering and line breaks
  const formatDescription = (description) => {
    if (!description) return 'No description available';
    
    // Replace common patterns like "na)", "nb)", "a)", "b)" etc. with proper formatting
    let formatted = description
      // Replace patterns like "na)", "nb)", "nc)" with "a)", "b)", "c)"
      .replace(/n([a-z])\)/g, '\n$1)')
      // Replace patterns like "ta)", "tb)" with "a)", "b)"
      .replace(/t([a-z])\)/g, '\n$1)')
      // Replace standalone patterns like "a)", "b)", "c)" with line breaks
      .replace(/([a-z])\)/g, '\n$1)')
      // Replace numbered patterns like "1)", "2)", "3)"
      .replace(/(\d+)\)/g, '\n$1)')
      // Clean up multiple line breaks
      .replace(/\n+/g, '\n')
      // Trim whitespace
      .trim();

    // Split into lines and format each
    const lines = formatted.split('\n').filter(line => line.trim());
    
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // Check if line starts with a letter followed by ) or number followed by )
      if (/^[a-z]\)/.test(trimmedLine) || /^\d+\)/.test(trimmedLine)) {
        return (
          <div key={index} style={{ 
            marginLeft: '12px', 
            marginTop: index > 0 ? '4px' : '0',
            fontSize: '12px',
            lineHeight: '1.4'
          }}>
            <strong style={{ color: '#3498DB' }}>{trimmedLine.match(/^[a-z0-9]\)/)[0]}</strong>
            <span style={{ marginLeft: '4px' }}>{trimmedLine.replace(/^[a-z0-9]\)\s*/, '')}</span>
          </div>
        );
      }
      
      return (
        <div key={index} style={{ 
          marginTop: index > 0 ? '4px' : '0',
          fontSize: '12px',
          lineHeight: '1.4',
          fontWeight: index === 0 ? '500' : '400'
        }}>
          {trimmedLine}
        </div>
      );
    });
  };

  return (
    <div style={{
      background: 'white',
      border: `1px solid ${isCompleted ? '#10b981' : '#e2e8f0'}`,
      borderRadius: '6px',
      padding: '8px',
      position: 'relative',
      transition: 'all 0.2s ease',
      boxShadow: isCompleted ? '0 2px 4px rgba(16, 185, 129, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      
      {/* Mandatory Corner */}
      {item.is_mandatory && (
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          width: '0',
          height: '0',
          borderLeft: '10px solid transparent',
          borderTop: '10px solid #ef4444'
        }} />
      )}

      {/* Main Content Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
        
        {/* Check Description - Now takes full width without category badge */}
        <div style={{ 
          flex: 1, 
          fontSize: '12px', 
          fontWeight: '500', 
          color: '#1e293b',
          lineHeight: '1.4'
        }}>
          {formatDescription(item.description)}
        </div>

        {/* PIC */}
        <div style={{ 
          fontSize: '10px', 
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          flexShrink: 0,
          marginTop: '2px'
        }}>
          <User size={10} />
          {item.pic}
        </div>

        {/* Completion Status */}
        {isCompleted && (
          <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
        )}
      </div>

      {/* Response Buttons Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'space-between' }}>
        
        {/* Yes/No/N/A Buttons */}
        <div style={{ display: 'flex', gap: '2px' }}>
          {['Yes', 'No', 'N/A'].map((option) => (
            <button
              key={option}
              onClick={() => onResponse(item.item_id, option, 'response')}
              disabled={mode === 'view'}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '500',
                border: '1px solid',
                cursor: mode === 'view' ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                background: response.response === option
                  ? option === 'Yes' ? '#10b981' : option === 'No' ? '#ef4444' : '#f59e0b'
                  : 'white',
                borderColor: response.response === option
                  ? option === 'Yes' ? '#10b981' : option === 'No' ? '#ef4444' : '#f59e0b'
                  : '#e2e8f0',
                color: response.response === option ? 'white' : '#64748b'
              }}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              padding: '2px 4px',
              background: 'transparent',
              border: '1px solid #e2e8f0',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '9px',
              color: '#64748b'
            }}
          >
            <MoreHorizontal size={10} />
          </button>
        </div>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div style={{
          marginTop: '8px',
          padding: '6px',
          background: '#f8fafc',
          borderRadius: '4px',
          border: '1px solid #f1f5f9'
        }}>
          
          {/* Guidance */}
          {item.guidance && (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '500', marginBottom: '2px' }}>
                Guidance:
              </div>
              <div style={{ fontSize: '10px', color: '#374151', lineHeight: '1.3' }}>
                {item.guidance}
              </div>
            </div>
          )}

          {/* Comments */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '500', marginBottom: '2px' }}>
              Comments:
            </div>
            <textarea
              value={response.remarks || ''}
              onChange={(e) => onResponse(item.item_id, e.target.value, 'remarks')}
              disabled={mode === 'view'}
              placeholder="Add comments..."
              style={{
                width: '100%',
                height: '40px',
                padding: '4px',
                border: '1px solid #e2e8f0',
                borderRadius: '3px',
                fontSize: '10px',
                resize: 'none',
                background: mode === 'view' ? '#f9fafb' : 'white'
              }}
            />
          </div>

          {/* Additional Actions */}
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
            <button
              style={{
                padding: '2px 6px',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '9px',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <Camera size={8} />
              Photo
            </button>
            
            <button
              style={{
                padding: '2px 6px',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '9px',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <FileText size={8} />
              Note
            </button>
          </div>

          {/* Response Timestamp */}
          {response.timestamp && (
            <div style={{
              fontSize: '8px',
              color: '#9ca3af',
              marginTop: '4px',
              textAlign: 'right'
            }}>
              Updated: {new Date(response.timestamp).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModernChecklistForm;