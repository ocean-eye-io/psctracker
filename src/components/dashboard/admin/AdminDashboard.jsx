// src/components/dashboards/admin/AdminDashboard.js
import React, { useState } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

import UsersTab from './tabs/UsersTab';
import RolesTab from './tabs/RolesTab';
import PermissionsTab from './tabs/PermissionsTab';
import VesselsTab from './tabs/VesselsTab';
import ModulesTab from './tabs/ModulesTab';
import UserVesselAssignmentsTab from './tabs/UserVesselAssignmentsTab'; // Import the new tab component

import styles from './admin.module.css';

const AdminDashboard = () => {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <div className={styles.adminDashboardContainer}>
      <h3 className={styles.adminDashboardHeader}>Admin Panel</h3>
      <Tabs selectedIndex={tabIndex} onSelect={index => setTabIndex(index)} className={styles.adminTabsContainer}>
        <TabList className={styles.tabNav}>
          <Tab className={styles.tabButton} selectedClassName={styles.active}>Users</Tab>
          <Tab className={styles.tabButton} selectedClassName={styles.active}>Roles</Tab>
          <Tab className={styles.tabButton} selectedClassName={styles.active}>Permissions</Tab>
          <Tab className={styles.tabButton} selectedClassName={styles.active}>Vessels</Tab>
          <Tab className={styles.tabButton} selectedClassName={styles.active}>Modules</Tab>
          <Tab className={styles.tabButton} selectedClassName={styles.active}>User-Vessel Assignments</Tab> {/* New Tab */}
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
        <TabPanel>
          <UserVesselAssignmentsTab /> {/* New Tab Panel */}
        </TabPanel>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;