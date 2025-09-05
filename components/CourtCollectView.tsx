import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Rackard } from '../types';

const COURT_WIDTH = 300; // pixels
const COURT_HEIGHT = 600; // pixels
const PLAYER_SIZE = 20;
const CARD_SIZE = 20;
const COLLECTION_RADIUS = 20;

const getRandomPosition = () => ({
  x: Math.random() * (COURT_WIDTH - CARD_SIZE),
  y: Math.random() * (COURT_HEIGHT - CARD_SIZE),
});

interface SpawnedCard {
  id: string;
  position: { x: number; y: number };
}

export const CourtCollectView: React.FC<{onCollect: (baseCard: Omit<Rackard, 'id' | 'imageUrl'>) => void}> = ({ onCollect }) => {
  const [isSynced, setIsSynced] = useState(false);
  const [playerPosition, setPlayerPosition] = useState({ x: COURT_WIDTH / 2 - PLAYER_SIZE / 2, y: COURT_HEIGHT - PLAYER_SIZE - 10 });
  const [spawnedCard, setSpawnedCard] = useState<SpawnedCard | null>(null);
  const [message, setMessage] = useState('Sincronize sua posição para começar.');
  
  const cardHint = useMemo(() => {
    if (!spawnedCard) return "Nenhuma Rackard por perto...";
    if (spawnedCard.position.y < COURT_HEIGHT / 2) {
      return "Hey, a carta está perto da rede!";
    } else if (spawnedCard.position.y > COURT_HEIGHT * 0.75) {
      return "A carta está no fundo da quadra!";
    } else {
      return "A carta está no meio da quadra!";
    }
  }, [spawnedCard]);

  const spawnNewCard = useCallback(() => {
    const newCard: SpawnedCard = {
      id: `card-${Date.now()}`,
      position: getRandomPosition(),
    };
    setSpawnedCard(newCard);
  }, []);

  useEffect(() => {
    if (isSynced) {
      const interval = setInterval(() => {
        if (!spawnedCard) {
            spawnNewCard();
        }
      }, (Math.random() * 3 + 2) * 60 * 1000); // 2 to 5 minutes
      
      // Spawn one immediately on sync
      if(!spawnedCard) spawnNewCard();
      
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSynced, spawnNewCard]);


  useEffect(() => {
    if (spawnedCard) {
      const dx = playerPosition.x - spawnedCard.position.x;
      const dy = playerPosition.y - spawnedCard.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < COLLECTION_RADIUS) {
        setMessage('Rackard Coletada!');
        onCollect({ name: 'Nova Rackard', description: 'Coletada na quadra', power: Math.floor(Math.random() * 50) + 20 });
        setSpawnedCard(null);
        setTimeout(() => {
          if(isSynced) setMessage(cardHint);
        }, 2000);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerPosition, spawnedCard, onCollect]);

  const handleSync = () => {
    setIsSynced(true);
    setMessage('Sincronizado! Mova-se pela quadra para encontrar Rackards.');
  };

  const movePlayer = (dx: number, dy: number) => {
    if(!isSynced) return;
    setPlayerPosition(prev => ({
        x: Math.max(0, Math.min(COURT_WIDTH - PLAYER_SIZE, prev.x + dx)),
        y: Math.max(0, Math.min(COURT_HEIGHT - PLAYER_SIZE, prev.y + dy)),
    }));
  };

  return (
    <div className="p-4 md:p-8 flex flex-col items-center animate-fade-in">
        <h2 className="text-3xl font-bold mb-2 text-center text-tennis-accent">Court Collect</h2>
        <p className="text-center text-tennis-light/70 mb-4">{isSynced ? cardHint : message}</p>
        
        {!isSynced && (
             <button onClick={handleSync} className="mb-4 bg-tennis-green hover:bg-tennis-green/80 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                Sincronizar
            </button>
        )}

        <div className="relative bg-tennis-blue border-4 border-white" style={{ width: COURT_WIDTH, height: COURT_HEIGHT }}>
            {/* Net */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-white/50" />
            
            {isSynced && (
                <div 
                    className="absolute bg-tennis-accent rounded-full transition-transform duration-200"
                    style={{ 
                        width: PLAYER_SIZE, 
                        height: PLAYER_SIZE,
                        transform: `translate(${playerPosition.x}px, ${playerPosition.y}px)`
                    }}
                />
            )}

            {spawnedCard && isSynced && (
                <div 
                    className="absolute bg-yellow-400 rounded-md animate-pulse"
                    style={{ 
                        width: CARD_SIZE, 
                        height: CARD_SIZE, 
                        transform: `translate(${spawnedCard.position.x}px, ${spawnedCard.position.y}px)`
                    }}
                />
            )}
        </div>
        
        {isSynced && (
            <div className="mt-4 text-center">
                <p className="font-semibold mb-2">Controles (Simulação GPS)</p>
                <div className="grid grid-cols-3 gap-2 w-48 mx-auto">
                    <div/>
                    <button onClick={() => movePlayer(0, -20)} className="bg-tennis-blue p-2 rounded">Cima</button>
                    <div/>
                    <button onClick={() => movePlayer(-20, 0)} className="bg-tennis-blue p-2 rounded">Esquerda</button>
                    <div/>
                    <button onClick={() => movePlayer(20, 0)} className="bg-tennis-blue p-2 rounded">Direita</button>
                    <div/>
                    <button onClick={() => movePlayer(0, 20)} className="bg-tennis-blue p-2 rounded">Baixo</button>
                    <div/>
                </div>
            </div>
        )}
    </div>
  );
};