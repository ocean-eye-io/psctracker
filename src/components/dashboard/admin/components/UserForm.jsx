// src/components/dashboards/admin/components/UserForm.js
import React, { useState, useEffect } from 'react';
import styles from '../admin.module.css'; // Import as 'styles'

const UserForm = ({ user, roles, modules, onSubmit, onClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRoleName, setSelectedRoleName] = useState('');
  const [assignedVessels, setAssignedVessels] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [isNewUser, setIsNewUser] = useState(true);

  useEffect(() => {
    if (user) {
      setIsNewUser(false);
      setUsername(user.cognitoUser.Username || '');
      setEmail(user.rdsData.email || user.cognitoUser.Attributes.find(attr => attr.Name === 'email')?.Value || '');
      setSelectedRoleName(user.rdsData.role_name || '');
      setAssignedVessels(user.rdsData.assigned_vessels || []);
      setSelectedModules(user.rdsData.assigned_modules || []);
      setPassword('');
    } else {
      setIsNewUser(true);
      setUsername('');
      setPassword('');
      setEmail('');
      setSelectedRoleName('');
      setAssignedVessels([]);
      setSelectedModules([]);
    }
  }, [user, roles, modules]);

  const handleModuleChange = (moduleId) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const userData = {
      email,
      role_name: selectedRoleName,
      vessels: assignedVessels,
      modules: selectedModules,
    };

    if (isNewUser) {
      userData.username = username;
      userData.password = password;
    }
    onSubmit(userData);
  };

  return (
    <div className={styles.modalOverlay}> 
      <div className={styles.modalContentBox}> 
        <h3 className={styles.modalHeader}>{user ? 'Edit User' : 'Add New User'}</h3> 
        <button className={styles.closeButton} onClick={onClose}> 
            &times;
        </button>
        <form onSubmit={handleSubmit} className={styles.formGrid}> 
          <div> {/* Wrapper div for all form fields */}
            <div className={styles.formGroup}> 
              <label htmlFor="username" className={styles.label}>Username:</label> 
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={!!user}
                className={styles.input} 
              />
            </div>
            {!user && (
              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>Password:</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>
            )}
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>Email:</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.input}
              />
            </div>

            {/* Role Assignment Section - now a dropdown */}
            <div className={styles.formGroup}>
              <label htmlFor="role" className={styles.label}>Assign Role:</label>
              <select
                id="role"
                value={selectedRoleName}
                onChange={(e) => setSelectedRoleName(e.target.value)}
                className={styles.select} 
              >
                <option value="">-- Select a Role --</option>
                {roles.length > 0 ? (
                  roles.map(role => (
                    <option key={role.role_id} value={role.role_name}>
                      {role.role_name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No roles available</option>
                )}
              </select>
            </div>

            {/* NEW: Module Assignment Checkboxes */}
            <div className={styles.moduleCheckboxGroup}> 
              <label className={styles.label}>Module Access:</label> 
              <div className={styles.moduleCheckboxesContainer}> 
                {modules && modules.length > 0 ? (
                  modules.map(module => (
                    <div key={module.module_id} className={styles.moduleCheckboxItem}> 
                      <input
                        type="checkbox"
                        id={`module-${module.module_id}`}
                        value={module.module_id}
                        checked={selectedModules.includes(module.module_id)}
                        onChange={() => handleModuleChange(module.module_id)}
                        className={styles.moduleCheckboxInput} 
                      />
                      <label htmlFor={`module-${module.module_id}`} className={styles.moduleCheckboxLabel}>{module.module_name}</label> 
                    </div>
                  ))
                ) : (
                  <p className={styles.formMessage}>No modules available.</p> 
                )}
              </div>
            </div>
          </div> {/* End of wrapper div for form fields */}

          <div className={styles.formActions}> 
            <button type="button" onClick={onClose} className={styles.cancelButton}>Cancel</button> 
            <button type="submit" className={styles.submitButton}>{user ? 'Update User' : 'Create User'}</button> 
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;