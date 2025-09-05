import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Rackard } from '../types';

// --- Real World Dimensions (in meters) ---
const REAL_COURT_LENGTH_METERS = 23.77; // Baseline to baseline
const REAL_COURT_WIDTH_METERS = 8.23;  // Singles court width
const REAL_SERVICE_LINE_FROM_NET_METERS = 6.4;

interface SpawnedCard {
  id: string;
  position: { x: number; y: number };
}

export const CourtCollectView: React.FC<{onCollect: (baseCard: Omit<Rackard, 'id' | 'imageUrl'>) => void}> = ({ onCollect }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [startCoords, setStartCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [playerPosition, setPlayerPosition] = useState({x: 0, y: 0});
  const [spawnedCard, setSpawnedCard] = useState<SpawnedCard | null>(null);
  const [message, setMessage] = useState('Sincronize sua posição para começar.');
  const [courtSize, setCourtSize] = useState({ width: 0, height: 0 });

  const courtContainerRef = useRef<HTMLDivElement>(null);
  const watchId = useRef<number | null>(null);

  // --- Dynamic Scaling based on container size ---
  const { pixelsPerMeter, playerSize, cardSize, collectionRadius, serviceLineCenterPos } = useMemo(() => {
    if (courtSize.width === 0) {
      return { pixelsPerMeter: 0, playerSize: 0, cardSize: 0, collectionRadius: 0, serviceLineCenterPos: { x: 0, y: 0 } };
    }
    const ppm = courtSize.width / REAL_COURT_WIDTH_METERS;
    const pSize = ppm; // Player is 1 meter wide
    const serviceLineY = (courtSize.height / 2) + (REAL_SERVICE_LINE_FROM_NET_METERS * ppm);
    const slcp = {
      x: courtSize.width / 2 - pSize / 2,
      y: serviceLineY - pSize / 2,
    };
    return {
      pixelsPerMeter: ppm,
      playerSize: pSize,
      cardSize: pSize,
      collectionRadius: pSize * 1.5, // Collect within 1.5 meters
      serviceLineCenterPos: slcp
    };
  }, [courtSize]);

  // --- Resize Observer to make court responsive ---
  useEffect(() => {
    const courtElement = courtContainerRef.current;
    if (!courtElement) return;

    const resizeObserver = new ResizeObserver(() => {
      const containerWidth = courtElement.offsetWidth;
      if (containerWidth > 0) {
        const aspectRatio = REAL_COURT_LENGTH_METERS / REAL_COURT_WIDTH_METERS;
        setCourtSize({
          width: containerWidth,
          height: containerWidth * aspectRatio,
        });
      }
    });

    resizeObserver.observe(courtElement);
    return () => resizeObserver.disconnect();
  }, []);

  // --- Set initial player position when court is sized ---
  useEffect(() => {
    if (courtSize.width > 0 && !isTracking) {
      setPlayerPosition(serviceLineCenterPos);
    }
  }, [courtSize, isTracking, serviceLineCenterPos]);

  const cardHint = useMemo(() => {
    if (!spawnedCard) return "Nenhuma Rackard por perto... Continue se movendo!";
    if (spawnedCard.position.y < courtSize.height / 2 + 50) {
      return "Dica: A carta está perto da rede!";
    } else if (spawnedCard.position.y > courtSize.height * 0.85) {
      return "Dica: A carta está no fundo da sua quadra!";
    } else {
      return "Dica: A carta está no meio da sua quadra!";
    }
  }, [spawnedCard, courtSize.height]);

  const spawnNewCard = useCallback(() => {
    if (courtSize.width === 0) return;
    setSpawnedCard({
      id: `card-${Date.now()}`,
      position: {
        x: Math.random() * (courtSize.width - cardSize),
        y: Math.random() * (courtSize.height / 2) + (courtSize.height / 2),
      },
    });
  }, [courtSize, cardSize]);

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
    if (spawnedCard && courtSize.width > 0) {
      const dx = (playerPosition.x + playerSize / 2) - (spawnedCard.position.x + cardSize / 2);
      const dy = (playerPosition.y + playerSize / 2) - (spawnedCard.position.y + cardSize / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < collectionRadius) {
        setMessage('Rackard Coletada!');
        onCollect({ name: 'Nova Rackard', description: 'Coletada na quadra', power: Math.floor(Math.random() * 50) + 20 });
        setSpawnedCard(null);
        setTimeout(() => {
          if(isTracking) setMessage(cardHint);
        }, 2000);
      }
    }
  }, [playerPosition, spawnedCard, onCollect, isTracking, cardHint, playerSize, cardSize, collectionRadius, courtSize]);

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
        setPlayerPosition(serviceLineCenterPos); // Reset player position on sync
        setIsTracking(true);
        setMessage('Sincronizado! Você foi posicionado na linha de saque.');
      },
      (error) => {
        setMessage(`Erro: ${error.message}. Verifique as permissões de localização.`);
      }
    );
  };

  useEffect(() => {
    if (isTracking && startCoords && pixelsPerMeter > 0) {
      const handlePositionUpdate = (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;

        const lat1 = startCoords.lat * (Math.PI / 180);
        const lat2 = latitude * (Math.PI / 180);
        const lon1 = startCoords.lon * (Math.PI / 180);
        const lon2 = longitude * (Math.PI / 180);
        
        const R = 6371e3; // Earth radius in meters
        const dx_meters = (lon2 - lon1) * Math.cos((lat1 + lat2) / 2) * R;
        const dy_meters = (lat2 - lat1) * R;

        const newScreenX = serviceLineCenterPos.x + dx_meters * pixelsPerMeter;
        const newScreenY = serviceLineCenterPos.y - dy_meters * pixelsPerMeter;

        setPlayerPosition({
          x: Math.max(0, Math.min(courtSize.width - playerSize, newScreenX)),
          y: Math.max(0, Math.min(courtSize.height - playerSize, newScreenY)),
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
  }, [isTracking, startCoords, pixelsPerMeter, playerSize, courtSize, serviceLineCenterPos]);

  return (
    <div className="p-4 flex flex-col items-center animate-fade-in">
        <h2 className="text-3xl font-bold mb-2 text-center text-tennis-accent">Court Collect</h2>
        <p className="text-center text-tennis-light/70 mb-4 h-5">{isTracking ? cardHint : message}</p>
        
        {!isTracking && (
             <button onClick={handleSync} className="mb-4 bg-tennis-green hover:bg-tennis-green/80 text-tennis-dark font-bold py-2 px-6 rounded-lg transition-colors">
                Sincronizar Posição
            </button>
        )}

        <div 
            ref={courtContainerRef}
            className="relative bg-tennis-blue border-4 border-white overflow-hidden w-full" 
            style={{ height: courtSize.height > 0 ? courtSize.height : 'auto', minHeight: courtSize.height > 0 ? 'auto' : '300px' }}
        >
            {courtSize.width > 0 && (
                <>
                    {/* Net */}
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-white/50 transform -translate-y-1/2" />
                    
                    {isTracking && (
                        <div 
                            className="absolute bg-tennis-accent rounded-full"
                            style={{ 
                                width: playerSize, 
                                height: playerSize,
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
                                width: cardSize, 
                                height: cardSize, 
                                top: spawnedCard.position.y,
                                left: spawnedCard.position.x,
                            }}
                        />
                    )}
                </>
            )}
        </div>
    </div>
  );
};