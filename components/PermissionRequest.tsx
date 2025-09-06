
import React from 'react';

interface PermissionRequestProps {
  onRequest: () => void;
}

const PermissionRequest: React.FC<PermissionRequestProps> = ({ onRequest }) => {
  return (
    <div className="text-center p-8 bg-green-800 rounded-lg shadow-xl border border-green-600">
      <h1 className="text-3xl font-bold text-white mb-2">Tennis Power Ups</h1>
      <p className="text-green-300 mb-6">This game requires access to your device's motion sensors to play.</p>
      <button
        onClick={onRequest}
        className="px-8 py-3 bg-green-500 text-green-900 font-bold rounded-lg hover:bg-green-400 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all duration-200 transform hover:scale-105"
      >
        Start Game
      </button>
    </div>
  );
};

export default PermissionRequest;
