import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Rackard } from '../types';

// --- Real World Dimensions (in meters) ---
const REAL_COURT_HEIGHT_METERS = 11.88; // Half court length (baseline to net)
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
  const [heading, setHeading] = useState(0);
  const [displacement, setDisplacement] = useState({x: 0, y: 0});
  const [courtOffset, setCourtOffset] = useState({x: 0, y: 0});

  const courtContainerRef = useRef<HTMLDivElement>(null);
  const watchId = useRef<number | null>(null);

  const { pixelsPerMeter, playerSize, cardSize, collectionRadius, serviceLineCenterPos } = useMemo(() => {
    if (courtSize.width === 0) return { pixelsPerMeter: 0, playerSize: 0, cardSize: 0, collectionRadius: 0, serviceLineCenterPos: { x: 0, y: 0 } };
    const ppm = courtSize.width / REAL_COURT_WIDTH_METERS;
    const pSize = ppm;
    const serviceLineY = REAL_SERVICE_LINE_FROM_NET_METERS * ppm;
    const slcp = { x: courtSize.width / 2, y: serviceLineY };
    return { pixelsPerMeter: ppm, playerSize: pSize, cardSize: pSize, collectionRadius: pSize * 1.5, serviceLineCenterPos: slcp };
  }, [courtSize]);
  
  const requestOrientationPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          return true;
        }
        setMessage("Permissão para sensor de orientação negada.");
        return false;
      } catch (error) {
        setMessage("Erro ao solicitar permissão de sensor.");
        return false;
      }
    }
    return true; // For browsers that don't require permission
  };

  const handleSync = async () => {
    const orientationOK = await requestOrientationPermission();
    if (!orientationOK) return;

    if (!navigator.geolocation) {
      setMessage("Geolocalização não é suportada.");
      return;
    }
    setMessage("Obtendo sua posição inicial...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setStartCoords({ lat: latitude, lon: longitude });
        setPlayerPosition(serviceLineCenterPos);
        setIsTracking(true);
        setMessage('Sincronizado! Mova-se no mundo real.');
      },
      (error) => {
        setMessage(`Erro: ${error.message}.`);
      }
    );
  };

  // GPS and Sensor Listeners
  useEffect(() => {
    if (isTracking && startCoords && pixelsPerMeter > 0) {
      // Orientation
      const handleOrientation = (event: DeviceOrientationEvent) => {
        const orientationEvent = event as any;
        let newHeading = 0;
        if (orientationEvent.webkitCompassHeading !== undefined) {
          newHeading = orientationEvent.webkitCompassHeading;
        } else if (event.alpha !== null) {
          newHeading = 360 - event.alpha;
        }
        setHeading(newHeading);
      };
      window.addEventListener('deviceorientation', handleOrientation);

      // Position
      const handlePositionUpdate = (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;
        const R = 6371e3; // Earth radius in meters
        const dLat = (latitude - startCoords.lat) * (Math.PI / 180);
        const dLon = (longitude - startCoords.lon) * (Math.PI / 180);
        const startLatRad = startCoords.lat * (Math.PI / 180);
        
        const dy_meters = dLat * R; // Forward/backward
        const dx_meters = dLon * R * Math.cos(startLatRad); // Left/right

        setDisplacement({ x: dx_meters, y: dy_meters });
        
        setPlayerPosition({
          x: serviceLineCenterPos.x + dx_meters * pixelsPerMeter,
          y: serviceLineCenterPos.y - dy_meters * pixelsPerMeter
        });
      };

      watchId.current = navigator.geolocation.watchPosition(handlePositionUpdate, () => {}, { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 });
      
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      };
    }
  }, [isTracking, startCoords, pixelsPerMeter, serviceLineCenterPos]);
  
  // Update court offset to center player
  useEffect(() => {
    if (!courtContainerRef.current) return;
    const viewWidth = courtContainerRef.current.offsetWidth;
    const viewHeight = courtContainerRef.current.offsetHeight;

    setCourtOffset({
      x: viewWidth / 2 - playerPosition.x,
      y: viewHeight / 2 - playerPosition.y,
    });
  }, [playerPosition, courtSize]);

  // --- Resize Observer ---
  useEffect(() => {
    const courtElement = courtContainerRef.current;
    if (!courtElement) return;
    const resizeObserver = new ResizeObserver(() => {
      const containerWidth = courtElement.offsetWidth;
      if (containerWidth > 0) {
        const aspectRatio = REAL_COURT_HEIGHT_METERS / REAL_COURT_WIDTH_METERS;
        setCourtSize({ width: containerWidth, height: containerWidth * aspectRatio });
      }
    });
    resizeObserver.observe(courtElement);
    return () => resizeObserver.disconnect();
  }, []);
  
  // --- Set initial position ---
  useEffect(() => {
    if (courtSize.width > 0 && !isTracking) {
      setPlayerPosition(serviceLineCenterPos);
    }
  }, [courtSize, isTracking, serviceLineCenterPos]);

  const spawnNewCard = useCallback(() => {
    if (courtSize.width === 0) return;
    setSpawnedCard({
      id: `card-${Date.now()}`,
      position: { x: Math.random() * (courtSize.width - cardSize), y: Math.random() * (courtSize.height - cardSize) },
    });
  }, [courtSize, cardSize]);

  useEffect(() => {
    if (isTracking) {
      const interval = setInterval(() => { if (!spawnedCard) spawnNewCard(); }, 30000);
      if (!spawnedCard) spawnNewCard();
      return () => clearInterval(interval);
    }
  }, [isTracking, spawnNewCard, spawnedCard]);
  
  useEffect(() => {
    if (spawnedCard && courtSize.width > 0) {
      const dx = playerPosition.x - (spawnedCard.position.x + cardSize / 2);
      const dy = playerPosition.y - (spawnedCard.position.y + cardSize / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < collectionRadius) {
        setMessage('Rackard Coletada!');
        onCollect({ name: 'Nova Rackard', description: 'Coletada na quadra', power: Math.floor(Math.random() * 50) + 20 });
        setSpawnedCard(null);
        setTimeout(() => { if(isTracking) setMessage('Continue se movendo!'); }, 2000);
      }
    }
  }, [playerPosition, spawnedCard, onCollect, isTracking, cardSize, collectionRadius, courtSize]);

  return (
    <div className="p-4 flex flex-col items-center animate-fade-in">
        <h2 className="text-3xl font-bold mb-2 text-center text-tennis-accent">Court Collect</h2>
        <div className="text-center text-tennis-light/70 mb-4 h-12 flex flex-col justify-center items-center">
          <p>{message}</p>
          {isTracking && (
            <div className="font-mono text-sm flex gap-4">
              <span>X: {displacement.x.toFixed(1)}m</span>
              <span>Y: {displacement.y.toFixed(1)}m</span>
              <span>DIR: {Math.round(heading)}°</span>
            </div>
          )}
        </div>
        
        {!isTracking && (
             <button onClick={handleSync} className="mb-4 bg-tennis-green hover:bg-tennis-green/80 text-tennis-dark font-bold py-3 px-8 rounded-lg transition-colors">
                Sincronizar Posição
            </button>
        )}

        <div 
            ref={courtContainerRef}
            className="relative bg-tennis-blue border-4 border-white overflow-hidden w-full max-w-4xl mx-auto" 
            style={{ height: courtSize.height > 0 ? courtSize.height : 'auto', minHeight: courtSize.height > 0 ? 'auto' : '300px' }}
        >
            {courtSize.width > 0 && (
                <>
                    {/* World container that moves */}
                    <div
                      className="absolute top-0 left-0 transition-transform duration-100 ease-linear"
                      style={{
                        width: courtSize.width,
                        height: courtSize.height,
                        transform: `translate(${courtOffset.x}px, ${courtOffset.y}px)`,
                      }}
                    >
                      <div className="absolute top-0 left-0 w-full h-full" style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: `${pixelsPerMeter}px ${pixelsPerMeter}px`,
                      }} />
                      <div className="absolute top-0 left-0 w-full h-1 bg-white/50" />
                      
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
                    </div>
                    
                    {/* Player representation (fixed in the center) */}
                    {isTracking && (
                        <div 
                            className="absolute bg-tennis-accent rounded-full flex items-center justify-center"
                            style={{ 
                                top: '50%',
                                left: '50%',
                                width: playerSize, 
                                height: playerSize,
                                transform: `translate(-50%, -50%)`,
                            }}
                        >
                          <div className="w-1 h-1/2 bg-tennis-dark origin-bottom" style={{ transform: `rotate(${heading}deg) translateY(-25%)` }} />
                        </div>
                    )}
                </>
            )}
        </div>
    </div>
  );
};