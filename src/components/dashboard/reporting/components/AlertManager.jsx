// Updated AlertManager.jsx with better formatting
import React from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

const AlertManager = ({ alerts = [], onDismiss, onAction }) => {
  return (
    <div style={{
      margin: '8px 0 20px',
    }}>
      {alerts.map(alert => (
        <div 
          key={alert.id}
          style={{
            position: 'relative',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            borderRadius: '8px',
            padding: '16px 16px 16px 20px',
            marginBottom: '12px',
            borderLeft: `4px solid ${
              alert.type === 'error' ? '#ef4444' : 
              alert.type === 'warning' ? '#f59e0b' : 
              alert.type === 'success' ? '#10b981' : '#3b82f6'
            }`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <button
            onClick={() => onDismiss(alert.id)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.6)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
          
          <div style={{
            display: 'flex',
            gap: '12px',
            paddingRight: '24px',
          }}>
            <div style={{
              flexShrink: 0,
              marginTop: '2px'
            }}>
              {alert.type === 'error' ? <AlertTriangle color="#ef4444" size={20} /> :
               alert.type === 'warning' ? <AlertTriangle color="#f59e0b" size={20} /> :
               alert.type === 'success' ? <CheckCircle color="#10b981" size={20} /> :
               <Info color="#3b82f6" size={20} />}
            </div>
            
            <div style={{ flex: 1 }}>
              <h4 style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: '600',
              }}>
                {alert.title}
              </h4>
              <p style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)',
              }}>
                {alert.message}
              </p>
              
              {alert.actions && alert.actions.length > 0 && (
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '12px',
                }}>
                  {alert.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => onAction(alert.id, action.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        backgroundColor: action.primary ? 'rgba(59, 130, 246, 0.8)' : 'rgba(51, 65, 85, 0.8)',
                        color: '#fff',
                        border: 'none',
                        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertManager;