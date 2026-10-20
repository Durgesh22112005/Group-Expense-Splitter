import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';
import './Alert.css';

const Alert = ({ type = 'info', title, message, onClose, className = '' }) => {
  if (!message && !title) return null;

  const icons = {
    success: <CheckCircle2 className="alert-icon success" size={20} />,
    error: <XCircle className="alert-icon error" size={20} />,
    warning: <AlertCircle className="alert-icon warning" size={20} />,
    info: <Info className="alert-icon info" size={20} />,
  };

  return (
    <div className={`alert-box alert-${type} ${className}`} role="alert">
      <div className="alert-icon-wrapper">{icons[type] || icons.info}</div>
      <div className="alert-content">
        {title && <h5 className="alert-title">{title}</h5>}
        <p className="alert-message">{message}</p>
      </div>
      {onClose && (
        <button type="button" className="alert-close-btn" onClick={onClose} aria-label="Dismiss alert">
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default Alert;
