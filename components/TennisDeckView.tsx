
import React from 'react';
import type { Rackard } from '../types';
import { Card } from './Card';

interface TennisDeckViewProps {
  deck: Rackard[];
  onSelectCard: (card: Rackard) => void;
}

export const TennisDeckView: React.FC<TennisDeckViewProps> = ({ deck, onSelectCard }) => {
  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <h2 className="text-3xl font-bold mb-6 text-center text-tennis-accent">Meu Tennisdeck</h2>
      {deck.length === 0 ? (
        <p className="text-center text-tennis-light/70 text-lg p-8">
          Seu deck está vazio. Vá para 'Court Collect' para encontrar novas Rackards!
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {deck.map((card) => (
            <Card key={card.id} card={card} onClick={() => onSelectCard(card)} />
          ))}
        </div>
      )}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};