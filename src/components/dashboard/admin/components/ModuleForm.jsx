// src/components/dashboards/admin/components/ModuleForm.jsx
import React, { useState, useEffect } from 'react';
import styles from '../admin.module.css'; // Correct path for CSS Module

const ModuleForm = ({ module, onSave, onClose }) => {
    const [moduleName, setModuleName] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (module) {
            setModuleName(module.module_name || '');
            setDescription(module.description || '');
        } else {
            setModuleName('');
            setDescription('');
        }
        setErrors({}); // Clear errors when module changes
    }, [module]);

    const validateForm = () => {
        const newErrors = {};
        if (!moduleName.trim()) {
            newErrors.moduleName = 'Module Name is required.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }

        const moduleData = {
            module_name: moduleName.trim(),
            description: description.trim(),
        };

        if (module && module.module_id) {
            moduleData.module_id = module.module_id;
        }

        onSave(moduleData);
    };

    return (
        <div className={styles.modalOverlay}> 
            <div className={styles.modalContentBox}> 
                <div className={styles.modalHeader}> 
                    <h4>{module ? 'Edit Module' : 'Add New Module'}</h4>
                    <button className={styles.closeButton} onClick={onClose}> 
                        &times;
                    </button>
                </div>
                <form onSubmit={handleSubmit} className={styles.formGrid}> 
                    <div className={styles.formGroup}> 
                        <label htmlFor="moduleName" className={styles.label}>Module Name:</label> 
                        <input
                            type="text"
                            id="moduleName"
                            value={moduleName}
                            onChange={(e) => setModuleName(e.target.value)}
                            className={errors.moduleName ? `${styles.input} ${styles.inputError}` : styles.input}
                            placeholder="Enter module name"
                            required
                        />
                        {errors.moduleName && <p className={styles.errorText}>{errors.moduleName}</p>} 
                    </div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}> {/* Use CSS Module classes */}
                        <label htmlFor="description" className={styles.label}>Description:</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows="4"
                            placeholder="Enter module description (optional)"
                            className={styles.input}
                        ></textarea>
                    </div>

                    <div className={styles.formActions}> 
                        <button type="button" className={styles.cancelButton} onClick={onClose}> 
                            Cancel
                        </button>
                        <button type="submit" className={styles.submitButton}> 
                            {module ? 'Update Module' : 'Add Module'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ModuleForm;