// src/components/dashboards/admin/AdminDashboard.js
import React, { useState } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css'; // Basic styling for react-tabs

import UsersTab from './tabs/UsersTab';
import RolesTab from './tabs/RolesTab';
import PermissionsTab from './tabs/PermissionsTab';
import VesselsTab from './tabs/VesselsTab';

const AdminDashboard = () => {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <div className="admin-dashboard-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Admin Panel</h3>
      <Tabs selectedIndex={tabIndex} onSelect={index => setTabIndex(index)}>
        <TabList>
          <Tab>Users</Tab>
          <Tab>Roles</Tab>
          <Tab>Permissions</Tab>
          <Tab>Vessels</Tab>
        </TabList>

        <TabPanel>
          <UsersTab />
        </TabPanel>
        <TabPanel>
          <RolesTab />
        </TabPanel>
        <TabPanel>
          <PermissionsTab />
        </TabPanel>
        <TabPanel>
          <VesselsTab />
        </TabPanel>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;