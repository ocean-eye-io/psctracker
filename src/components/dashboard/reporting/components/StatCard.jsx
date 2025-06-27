// src/components/dashboard/reporting/components/StatCard.jsx
import React from 'react';
import '../../../dashboard/DashboardStyles.css';

const StatCard = ({ title, value, icon }) => {
  return (
    <div className="stat-card">
      <div className="flex justify-between items-center">
        <div>
          <p className="stat-card-title">{title}</p>
          <p className="stat-card-value">{value}</p>
        </div>
        <div className="stat-card-icon">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;