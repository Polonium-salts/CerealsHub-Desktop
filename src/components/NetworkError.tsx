import React from 'react';
import { useAuthStore } from '../stores/authStore';

const NetworkError: React.FC = () => {
  const { error, clearError } = useAuthStore();

  if (!error) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
      <p>{error}</p>
      <button onClick={clearError} className="absolute top-1 right-1 text-white font-bold">
        &times;
      </button>
    </div>
  );
};

export default NetworkError;