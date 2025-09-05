import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Rackard } from '../types';

const COURT_WIDTH = 300; // pixels
const COURT_HEIGHT = 600; // pixels
const PLAYER_SIZE = 20;
const CARD_SIZE = 20;
const COLLECTION_RADIUS = 25; // Increased slightly for easier collection
const PIXELS_PER_METER = 25; // Scale: 25 pixels on screen = 1 meter in real life

const PLAYER_START_POS = { 
  x: COURT_WIDTH / 2 - PLAYER_SIZE / 2, 
  y: COURT_HEIGHT - PLAYER_SIZE - 10 
};

// Spawn cards only on the player's side of the court (bottom half)
const getRandomPosition = () => ({
  x: Math.random() * (COURT_WIDTH - CARD_SIZE),
  y: Math.random() * (COURT_HEIGHT / 2) + (COURT_HEIGHT / 2),
});

interface SpawnedCard {
  id: string;
  position: { x: number; y: number };
}

export const CourtCollectView: React.FC<{onCollect: (baseCard: Omit<Rackard, 'id' | 'imageUrl'>) => void}> = ({ onCollect }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [startCoords, setStartCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [playerPosition, setPlayerPosition] = useState(PLAYER_START_POS);
  const [spawnedCard, setSpawnedCard] = useState<SpawnedCard | null>(null);
  const [message, setMessage] = useState('Sincronize sua posição para começar.');
  const watchId = useRef<number | null>(null);
  
  const cardHint = useMemo(() => {
    if (!spawnedCard) return "Nenhuma Rackard por perto... Continue se movendo!";
    if (spawnedCard.position.y < COURT_HEIGHT / 2 + 50) { // Adjusted for player-side only
      return "Dica: A carta está perto da rede!";
    } else if (spawnedCard.position.y > COURT_HEIGHT * 0.85) {
      return "Dica: A carta está no fundo da sua quadra!";
    } else {
      return "Dica: A carta está no meio da sua quadra!";
    }
  }, [spawnedCard]);

  const spawnNewCard = useCallback(() => {
    setSpawnedCard({
      id: `card-${Date.now()}`,
      position: getRandomPosition(),
    });
  }, []);

  useEffect(() => {
    if (isTracking) {
      const interval = setInterval(() => {
        if (!spawnedCard) spawnNewCard();
      }, (Math.random() * 2 + 1) * 60 * 1000); // 1 to 3 minutes
      
      if (!spawnedCard) spawnNewCard();
      
      return () => clearInterval(interval);
    }
  }, [isTracking, spawnNewCard, spawnedCard]);

  useEffect(() => {
    if (spawnedCard) {
      const dx = (playerPosition.x + PLAYER_SIZE / 2) - (spawnedCard.position.x + CARD_SIZE / 2);
      const dy = (playerPosition.y + PLAYER_SIZE / 2) - (spawnedCard.position.y + CARD_SIZE / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < COLLECTION_RADIUS) {
        setMessage('Rackard Coletada!');
        onCollect({ name: 'Nova Rackard', description: 'Coletada na quadra', power: Math.floor(Math.random() * 50) + 20 });
        setSpawnedCard(null);
        setTimeout(() => {
          if(isTracking) setMessage(cardHint);
        }, 2000);
      }
    }
  }, [playerPosition, spawnedCard, onCollect, isTracking, cardHint]);

  const handleSync = () => {
    if (!navigator.geolocation) {
      setMessage("Geolocalização não é suportada pelo seu navegador.");
      return;
    }
    setMessage("Obtendo sua posição inicial...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setStartCoords({ lat: latitude, lon: longitude });
        setIsTracking(true);
        setMessage('Sincronizado! Ande pelo mundo real para se mover na quadra.');
      },
      (error) => {
        setMessage(`Erro: ${error.message}. Verifique as permissões de localização.`);
      }
    );
  };

  useEffect(() => {
    if (isTracking && startCoords) {
      const handlePositionUpdate = (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;

        const lat1 = startCoords.lat * (Math.PI / 180);
        const lat2 = latitude * (Math.PI / 180);
        const lon1 = startCoords.lon * (Math.PI / 180);
        const lon2 = longitude * (Math.PI / 180);
        
        const R = 6371e3; // Earth radius in meters
        const dx_meters = (lon2 - lon1) * Math.cos((lat1 + lat2) / 2) * R;
        const dy_meters = (lat2 - lat1) * R;

        const newScreenX = PLAYER_START_POS.x + dx_meters * PIXELS_PER_METER;
        const newScreenY = PLAYER_START_POS.y - dy_meters * PIXELS_PER_METER;

        setPlayerPosition({
          x: Math.max(0, Math.min(COURT_WIDTH - PLAYER_SIZE, newScreenX)),
          y: Math.max(0, Math.min(COURT_HEIGHT - PLAYER_SIZE, newScreenY)),
        });
      };

      const handleError = (error: GeolocationPositionError) => {
          setMessage("Perdemos sua localização. Tente sincronizar novamente.");
          setIsTracking(false);
      };

      watchId.current = navigator.geolocation.watchPosition(handlePositionUpdate, handleError, { enableHighAccuracy: true });
      return () => {
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      };
    }
  }, [isTracking, startCoords]);

  return (
    <div className="p-4 md:p-8 flex flex-col items-center animate-fade-in">
        <h2 className="text-3xl font-bold mb-2 text-center text-tennis-accent">Court Collect</h2>
        <p className="text-center text-tennis-light/70 mb-4 h-5">{isTracking ? cardHint : message}</p>
        
        {!isTracking && (
             <button onClick={handleSync} className="mb-4 bg-tennis-green hover:bg-tennis-green/80 text-tennis-dark font-bold py-2 px-6 rounded-lg transition-colors">
                Sincronizar Posição
            </button>
        )}

        <div className="relative bg-tennis-blue border-4 border-white overflow-hidden" style={{ width: COURT_WIDTH, height: COURT_HEIGHT }}>
            <div className="absolute top-1/2 left-0 w-full h-1 bg-white/50" />
            
            {isTracking && (
                <div 
                    className="absolute bg-tennis-accent rounded-full"
                    style={{ 
                        width: PLAYER_SIZE, 
                        height: PLAYER_SIZE,
                        top: playerPosition.y,
                        left: playerPosition.x,
                        transition: 'top 0.5s linear, left 0.5s linear'
                    }}
                />
            )}

            {spawnedCard && isTracking && (
                <div 
                    className="absolute bg-yellow-400 rounded-md animate-pulse"
                    style={{ 
                        width: CARD_SIZE, 
                        height: CARD_SIZE, 
                        top: spawnedCard.position.y,
                        left: spawnedCard.position.x,
                    }}
                />
            )}
        </div>
    </div>
  );
};