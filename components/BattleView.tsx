import React, { useState } from 'react';
import type { Rackard } from '../types';
import { Card } from './Card';

interface BattleViewProps {
  deck: Rackard[];
  onDefeat: (cardId: string) => void;
  onVictory: (code: string) => void;
}

export const BattleView: React.FC<BattleViewProps> = ({ deck, onDefeat, onVictory }) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimCode, setClaimCode] = useState('');

  const selectedCard = deck.find(c => c.id === selectedCardId);

  const handleDefeat = () => {
    if (selectedCard) {
      if(window.confirm(`Tem certeza que quer apagar a carta "${selectedCard.name}"?`)) {
        onDefeat(selectedCard.id);
        setSelectedCardId(null);
      }
    }
  };

  const handleVictory = () => {
    if (selectedCard) {
      setIsClaiming(true);
    }
  };
  
  const handleClaim = () => {
      if(claimCode.trim()) {
        onVictory(claimCode);
        setClaimCode('');
        setIsClaiming(false);
        setSelectedCardId(null);
      }
  };

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <h2 className="text-3xl font-bold mb-2 text-center text-tennis-accent">Arena de Batalha</h2>
      <p className="text-center text-tennis-light/70 mb-6">Escolha uma Rackard do seu deck para a batalha.</p>

      {deck.length === 0 ? (
        <p className="text-center text-tennis-light/70 text-lg p-8">
          Você não tem cartas para batalhar. Colete algumas primeiro!
        </p>
      ) : (
        <div className="mx-auto p-4 bg-tennis-blue/50 rounded-lg">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {deck.map((card) => (
              <Card 
                key={card.id} 
                card={card} 
                onClick={() => setSelectedCardId(card.id)}
                isSelected={card.id === selectedCardId}
              />
            ))}
          </div>
        </div>
      )}

      {selectedCard && (
        <div className="mt-8 p-6 bg-tennis-dark border-2 border-tennis-accent/30 rounded-xl max-w-lg mx-auto text-center shadow-2xl">
          <h3 className="text-xl font-bold mb-4">Carta Selecionada: <span className="text-tennis-accent">{selectedCard.name}</span></h3>
          
          {isClaiming ? (
            <div className="flex flex-col items-center gap-4">
                <p>Insira o código da Rackard do seu oponente para reivindicá-la.</p>
                <input 
                    type="text"
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value)}
                    placeholder="Código da Rackard"
                    className="bg-tennis-blue border border-tennis-accent/50 rounded-md px-4 py-2 text-tennis-light w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-tennis-accent"
                />
                 <button 
                    onClick={handleClaim}
                    className="w-full max-w-xs bg-tennis-green hover:bg-tennis-green/80 text-white font-bold py-2.5 px-6 rounded-lg transition-colors"
                >
                    OK
                </button>
            </div>
          ) : (
            <div className="flex justify-center gap-4">
              <button 
                onClick={handleVictory}
                className="bg-tennis-green hover:bg-tennis-green/80 text-white font-bold py-2.5 px-8 rounded-lg transition-colors"
              >
                Vitória
              </button>
              <button 
                onClick={handleDefeat}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-8 rounded-lg transition-colors"
              >
                Derrota
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};