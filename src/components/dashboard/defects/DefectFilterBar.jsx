import React, { useState, useEffect } from 'react';
import { Search, Download, Upload, Plus } from 'lucide-react';
import DropdownField from '../../common/Table/DropdownField';

const statusOptions = ['OPEN', 'IN PROGRESS', 'CLOSED'];
const criticalityOptions = ['High', 'Medium', 'Low'];

const FilterBox = ({ field, value, options, label, onUpdate }) => (
  <div className="flex-none w-32">
    <DropdownField
      className="filter-dropdown"
      vessel={{ id: 'filter', [field]: value }}
      value={value.length ? `${value.length} Selected` : label}
      options={[label, ...options]}
      field={field}
      onUpdate={u => {
        const v = u[field];
        onUpdate(v === label ? [] : v || []);
        return true;
      }}
    />
  </div>
);

const DefectFilterBar = ({
  onSearch,
  onFilterStatus,
  onFilterCriticality,
  onFilterSource,
  statusFilter = [],
  criticalityFilter = [],
  sourceFilter = [],
  sourceOptions = [],
  onExport,
  onImport,
  onAddDefect
}) => {
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => onSearch(searchValue), 300);
    return () => clearTimeout(timer);
  }, [searchValue, onSearch]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-[#0B1623]/80 border border-white/10 rounded-lg overflow-x-auto whitespace-nowrap">
      {/* Search */}
      <div className="flex-none w-64 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          type="text"
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          placeholder="Search defects..."
          className="w-full h-9 pl-10 pr-4 rounded-md bg-[#132337]/60 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-[#3BADE5]/40 focus:ring-1 focus:ring-[#3BADE5]/20"
        />
      </div>

      {/* Filters */}
      <FilterBox
        field="status"
        value={statusFilter}
        options={statusOptions}
        label="All Status"
        onUpdate={onFilterStatus}
      />
      <FilterBox
        field="criticality"
        value={criticalityFilter}
        options={criticalityOptions}
        label="All Criticality"
        onUpdate={onFilterCriticality}
      />
      {sourceOptions.length > 0 && (
        <FilterBox
          field="source"
          value={sourceFilter}
          options={sourceOptions}
          label="All Sources"
          onUpdate={onFilterSource}
        />
      )}

      {/* Actions */}
      <button
        onClick={onExport}
        className="flex-none flex items-center gap-1 px-3 h-9 rounded-md bg-sky-600 text-white hover:bg-sky-700 font-medium transition text-sm whitespace-nowrap"
      >
        <Download size={16} />
        Export Excel
      </button>
      <button
        onClick={onImport}
        className="flex-none flex items-center gap-1 px-3 h-9 rounded-md bg-sky-600 text-white hover:bg-sky-700 font-medium transition text-sm whitespace-nowrap"
      >
        <Upload size={16} />
        Import VIR Excel
      </button>
      <button
        onClick={onAddDefect}
        className="flex-none flex items-center gap-1 px-4 h-9 rounded-md bg-[#3BADE5] text-white font-semibold hover:bg-[#2496c7] transition text-sm whitespace-nowrap"
      >
        <Plus size={16} />
        Add Defect
      </button>
    </div>
  );
};

export default DefectFilterBar;