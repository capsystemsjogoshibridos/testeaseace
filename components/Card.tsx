import React from 'react';
import type { Rackard } from '../types';

interface CardProps {
  card: Rackard;
  onClick?: () => void;
  size?: 'small' | 'large';
  isSelected?: boolean;
}

export const Card: React.FC<CardProps> = ({ card, onClick, size = 'small', isSelected = false }) => {
  const sizeClasses = {
    small: 'w-40 h-56',
    large: 'w-72 h-96'
  };

  const borderClasses = isSelected 
    ? 'border-4 border-tennis-accent ring-4 ring-tennis-accent/50' 
    : 'border-2 border-tennis-blue hover:border-tennis-accent';

  return (
    <div 
      className={`bg-tennis-blue rounded-xl shadow-lg p-3 flex flex-col justify-between cursor-pointer transition-all duration-300 transform hover:-translate-y-1 ${sizeClasses[size]} ${borderClasses}`}
      onClick={onClick}
    >
      <div className="flex-grow rounded-md overflow-hidden mb-2">
        <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
      </div>
      <h3 className={`font-bold text-center ${size === 'small' ? 'text-sm' : 'text-lg'}`}>{card.name}</h3>
      <div className="bg-tennis-accent text-tennis-dark text-center rounded-full font-black mt-2 text-sm py-0.5">
        POWER: {card.power}
      </div>
    </div>
  );
};

export const CardDetails: React.FC<{card: Rackard}> = ({ card }) => {
    return (
        <div className="flex flex-col items-center">
            <Card card={card} size="large" />
            <p className="mt-4 text-center text-tennis-light/80">{card.description}</p>
        </div>
    );
}