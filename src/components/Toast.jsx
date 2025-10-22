// src/components/Toast.jsx
import React, { useEffect } from 'react';
import styles from './Toast.module.css';

const Toast = ({ message, isVisible, duration = 2000, onClose }) => {
  useEffect(() => {
    let timer;
    if (isVisible) {
      // Automatically close the toast after the duration
      timer = setTimeout(() => {
        onClose();
      }, duration);
    }
    // Cleanup the timer if the component unmounts or visibility changes
    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose]);

  if (!isVisible) {
    return null; // Don't render if not visible
  }

  return (
    <div className={styles.toast}>
      {message}
    </div>
  );
};

export default Toast;