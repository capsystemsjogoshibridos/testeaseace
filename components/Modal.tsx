
import React from 'react';
import { XIcon } from './icons/XIcon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-tennis-blue rounded-2xl shadow-2xl w-full max-w-md mx-auto p-6 relative animate-fade-in-up border-2 border-tennis-accent/30"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-tennis-light hover:text-tennis-accent transition-colors"
        >
          <XIcon />
        </button>
        {title && <h2 className="text-2xl font-bold mb-4 text-tennis-accent">{title}</h2>}
        {children}
      </div>
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
