// src/components/dashboards/admin/AdminDashboard.js
import React, { useState } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
// No longer need 'react-tabs/style/react-tabs.css' if you're styling manually or via CSS Modules

import UsersTab from './tabs/UsersTab';
import RolesTab from './tabs/RolesTab';
import PermissionsTab from './tabs/PermissionsTab';
import VesselsTab from './tabs/VesselsTab';
import ModulesTab from './tabs/ModulesTab';

// Import the CSS Module
import styles from './admin.module.css'; // Import as 'styles'

const AdminDashboard = () => {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <div className={styles.adminDashboardContainer}> {/* Use CSS Module class */}
      <h3 className={styles.adminDashboardHeader}>Admin Panel</h3> {/* Use CSS Module class */}
      <Tabs selectedIndex={tabIndex} onSelect={index => setTabIndex(index)} className={styles.adminTabsContainer}> {/* Use CSS Module class */}
        <TabList className={styles.tabNav}> {/* Use CSS Module class */}
          <Tab className={styles.tabButton} selectedClassName={styles.active}>Users</Tab> {/* Use CSS Module classes */}
          <Tab className={styles.tabButton} selectedClassName={styles.active}>Roles</Tab>
          <Tab className={styles.tabButton} selectedClassName={styles.active}>Permissions</Tab>
          <Tab className={styles.tabButton} selectedClassName={styles.active}>Vessels</Tab>
          <Tab className={styles.tabButton} selectedClassName={styles.active}>Modules</Tab>
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
        <TabPanel>
          <ModulesTab />
        </TabPanel>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;