import React from 'react';
import { Loader2 } from 'lucide-react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ message = 'Loading...', size = 32, fullPage = false }) => {
  const content = (
    <div className="spinner-container">
      <Loader2 size={size} className="spinner-icon" />
      {message && <p className="spinner-text">{message}</p>}
    </div>
  );

  if (fullPage) {
    return <div className="spinner-full-page">{content}</div>;
  }

  return content;
};

export default LoadingSpinner;
