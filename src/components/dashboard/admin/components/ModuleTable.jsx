// src/components/dashboards/admin/components/ModuleTable.jsx
import React from 'react';
import styles from '../admin.module.css'; // Correct path for CSS Module

const ModuleTable = ({ modules, onEdit, onDelete }) => {
    if (!modules || modules.length === 0) {
        return (
            <div className={styles.dataTableContainer}> 
                <p className={styles.emptyTableMessage}>No modules found. Add a new module to get started.</p> 
            </div>
        );
    }

    return (
        <div className={styles.dataTableContainer}> 
            <div className={styles.dataTableWrapper}> 
                <table className={styles.dataTable}>
                    <thead>
                        <tr>
                            <th><div className={styles.tableHeaderContent}>Module Name</div></th> 
                            <th><div className={styles.tableHeaderContent}>Description</div></th>
                            <th className={styles.actionsCell}><div className={styles.tableHeaderContent}>Actions</div></th> 
                        </tr>
                    </thead>
                    <tbody>
                        {modules.map((module) => (
                            <tr key={module.module_id} className={styles.dataRow}>
                                <td>
                                    <div className={styles.cellContent}>
                                        {module.module_name}
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.cellContent}>
                                        {module.description || 'N/A'}
                                    </div>
                                </td>
                                <td className={styles.actionsCell}>
                                    <button
                                        className={styles.actionButton}
                                        onClick={() => onEdit(module)}
                                        title="Edit Module"
                                    >
                                        <i className="fas fa-edit"></i> Edit
                                    </button>
                                    <button
                                        className={styles.actionButton}
                                        onClick={() => onDelete(module.module_id)}
                                        title="Delete Module"
                                    >
                                        <i className="fas fa-trash"></i> Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ModuleTable;