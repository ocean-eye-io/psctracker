// src/components/dashboards/admin/tabs/ModulesTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import ModuleTable from '../components/ModuleTable.jsx';
import ModuleForm from '../components/ModuleForm.jsx';
import { API_BASE_URL } from '../config';
import { useAuth } from '../../../../context/AuthContext';

// Import the CSS Module
import styles from '../admin.module.css'; // Correct path for CSS Module

const ModulesTab = () => {
    const [modules, setModules] = useState([]);
    const [editingModule, setEditingModule] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { currentUser, loading: authLoading, getSession } = useAuth();

    const fetchModules = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!currentUser) {
                throw new Error('No authenticated user found. Please log in.');
            }

            const session = getSession();
            if (!session || !session.idToken) {
                throw new Error('Authentication session or ID token not found.');
            }
            const idToken = session.idToken;

            const response = await fetch(`${API_BASE_URL}/admin/modules`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
            });

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (jsonError) {
                    console.warn("Response was not JSON, could not parse error details.");
                }
                throw new Error(errorMessage);
            }
            const data = await response.json();
            setModules(data);
        } catch (e) {
            console.error("Failed to fetch modules:", e);
            setError("Failed to load modules: " + e.message);
        } finally {
            setLoading(false);
        }
    }, [currentUser, getSession]);

    useEffect(() => {
        if (!authLoading && currentUser) {
            fetchModules();
        } else if (!authLoading && !currentUser) {
            setError('Please log in to view and manage modules.');
            setLoading(false);
            setModules([]);
        }
    }, [currentUser, authLoading, fetchModules]);

    const handleAddModule = () => {
        setEditingModule(null);
        setIsFormOpen(true);
    };

    const handleEditModule = (module) => {
        setEditingModule(module);
        setIsFormOpen(true);
    };

    const handleDeleteModule = async (moduleId) => {
        if (!window.confirm('Are you sure you want to delete this module?')) {
            return;
        }
        try {
            const session = getSession();
            if (!session || !session.idToken) {
                throw new Error('Authentication session or ID token not found.');
            }
            const idToken = session.idToken;

            const response = await fetch(`${API_BASE_URL}/admin/modules/${moduleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                },
            });
            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (jsonError) {}
                throw new Error(errorMessage);
            }
            fetchModules(); // Refresh the list
        } catch (e) {
            console.error("Failed to delete module:", e);
            setError("Failed to delete module: " + e.message);
        }
    };

    const handleSaveModule = async (moduleData) => {
        try {
            const session = getSession();
            if (!session || !session.idToken) {
                throw new Error('Authentication session or ID token not found.');
            }
            const idToken = session.idToken;

            const method = moduleData.module_id ? 'PUT' : 'POST';
            const url = moduleData.module_id ? `${API_BASE_URL}/admin/modules/${moduleData.module_id}` : `${API_BASE_URL}/admin/modules`;

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(moduleData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            setIsFormOpen(false);
            fetchModules(); // Refresh the list
        } catch (e) {
            console.error("Failed to save module:", e);
            setError(`Failed to save module: ${e.message}.`);
        }
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingModule(null);
        setError(null);
    };

    if (authLoading || loading) {
        return <p className={styles.emptyTableMessage}>Loading modules...</p>; // Use CSS Module class
    }

    if (error) {
        return <p className={styles.emptyTableMessage} style={{ color: 'var(--negative-color)' }}>Error: {error}</p>; // Use CSS Module class
    }

    if (!currentUser) {
        return <p className={styles.emptyTableMessage}>Please log in to view and manage modules.</p>; // Use CSS Module class
    }

    return (
        <div className={styles.dataTableContainer}> 
            <div style={{ padding: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className={`${styles.defectActionBtn} ${styles.add}`} onClick={handleAddModule}> {/* Use CSS Module classes */}
                    <i className="fas fa-plus"></i> Add New Module
                </button>
            </div>

            <div className={styles.dataTableWrapper}> 
                <ModuleTable
                    modules={modules}
                    onEdit={handleEditModule}
                    onDelete={handleDeleteModule}
                />
            </div>

            {isFormOpen && (
                <ModuleForm
                    module={editingModule}
                    onSave={handleSaveModule}
                    onClose={handleCloseForm}
                />
            )}
        </div>
    );
};

export default ModulesTab;