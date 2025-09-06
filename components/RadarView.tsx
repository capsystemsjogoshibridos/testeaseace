import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Rackard } from '../types';

// --- Real World Dimensions (in meters) ---
const REAL_COURT_HEIGHT_METERS = 11.88; // Half court length (baseline to net)
const REAL_COURT_WIDTH_METERS = 8.23;  // Singles court width
const REAL_SERVICE_LINE_FROM_NET_METERS = 6.4;
const STAR_COLORS = ['#FFD700', '#FF6347', '#ADFF2F', '#87CEEB', '#DA70D6', '#FFA500'];

interface SpawnedCard {
  id: string;
  position: { x: number; y: number };
  color: string;
}

export const RadarView: React.FC<{onCollect: (baseCard: Omit<Rackard, 'id' | 'imageUrl'>) => void}> = ({ onCollect }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [startCoords, setStartCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [playerPosition, setPlayerPosition] = useState({x: 0, y: 0});
  const [spawnedCards, setSpawnedCards] = useState<SpawnedCard[]>([]);
  const [message, setMessage] = useState('Sincronize sua posição para começar.');
  const [courtSize, setCourtSize] = useState({ width: 0, height: 0 });
  const [heading, setHeading] = useState(0);
  const [displacement, setDisplacement] = useState({x: 0, y: 0});
  const [courtOffset, setCourtOffset] = useState({x: 0, y: 0});

  const courtContainerRef = useRef<HTMLDivElement>(null);
  const watchId = useRef<number | null>(null);
  const trailCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastTrailPosition = useRef<{x: number, y: number} | null>(null);

  const { pixelsPerMeter, playerSize, cardSize, collectionRadius, serviceLineCenterPos } = useMemo(() => {
    if (courtSize.width === 0) return { pixelsPerMeter: 0, playerSize: 0, cardSize: 0, collectionRadius: 0, serviceLineCenterPos: { x: 0, y: 0 } };
    const ppm = courtSize.width / REAL_COURT_WIDTH_METERS;
    const pSize = ppm * 1.2;
    const serviceLineY = REAL_SERVICE_LINE_FROM_NET_METERS * ppm;
    const slcp = { x: courtSize.width / 2, y: serviceLineY };
    return { pixelsPerMeter: ppm, playerSize: pSize, cardSize: pSize, collectionRadius: pSize, serviceLineCenterPos: slcp };
  }, [courtSize]);
  
  const requestOrientationPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') return true;
        setMessage("Permissão para sensor de orientação negada.");
        return false;
      } catch (error) {
        setMessage("Erro ao solicitar permissão de sensor.");
        return false;
      }
    }
    return true;
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
        setSpawnedCards([]);
        lastTrailPosition.current = null;
        if (trailCanvasRef.current) {
          const ctx = trailCanvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, trailCanvasRef.current.width, trailCanvasRef.current.height);
        }
        setMessage('Sincronizado! Mova-se no mundo real.');
      },
      (error) => setMessage(`Erro: ${error.message}.`)
    );
  };

  useEffect(() => {
    if (isTracking && startCoords && pixelsPerMeter > 0) {
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

      const handlePositionUpdate = (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;
        const R = 6371e3;
        const dLat = (latitude - startCoords.lat) * (Math.PI / 180);
        const dLon = (longitude - startCoords.lon) * (Math.PI / 180);
        const startLatRad = startCoords.lat * (Math.PI / 180);
        
        const dy_meters = dLat * R;
        const dx_meters = dLon * R * Math.cos(startLatRad);

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
  
  useEffect(() => {
    if (!courtContainerRef.current) return;
    const viewWidth = courtContainerRef.current.offsetWidth;
    const viewHeight = courtContainerRef.current.offsetHeight;

    setCourtOffset({
      x: viewWidth / 2 - playerPosition.x,
      y: viewHeight / 2 - playerPosition.y,
    });
  }, [playerPosition, courtSize]);

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
  
  useEffect(() => {
    if (courtSize.width > 0 && !isTracking) {
      setPlayerPosition(serviceLineCenterPos);
    }
  }, [courtSize, isTracking, serviceLineCenterPos]);

  const spawnNewCard = useCallback(() => {
    if (courtSize.width === 0) return;
    const newCard: SpawnedCard = {
      id: `card-${Date.now()}`,
      position: { x: Math.random() * (courtSize.width - cardSize), y: Math.random() * (courtSize.height - cardSize) },
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    };
    setSpawnedCards(prev => [...prev, newCard]);
  }, [courtSize, cardSize]);

  useEffect(() => {
    if (isTracking) {
      const interval = setInterval(spawnNewCard, 30000);
      spawnNewCard();
      return () => clearInterval(interval);
    }
  }, [isTracking, spawnNewCard]);
  
  useEffect(() => {
    if (spawnedCards.length > 0 && courtSize.width > 0) {
      let collectedCardId: string | null = null;
      for(const card of spawnedCards) {
        const dx = (playerPosition.x) - (card.position.x + cardSize / 2);
        const dy = (playerPosition.y) - (card.position.y + cardSize / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < collectionRadius) {
          collectedCardId = card.id;
          break;
        }
      }

      if (collectedCardId) {
        setMessage('Rackard Coletada!');
        onCollect({ name: 'Nova Rackard', description: 'Coletada no radar', power: Math.floor(Math.random() * 50) + 20 });
        setSpawnedCards(prev => prev.filter(c => c.id !== collectedCardId));
        setTimeout(() => { if(isTracking) setMessage('Continue se movendo!'); }, 2000);
      }
    }
  }, [playerPosition, spawnedCards, onCollect, isTracking, cardSize, collectionRadius, courtSize]);

  useEffect(() => {
    if (isTracking && trailCanvasRef.current && courtSize.width > 0) {
        const canvas = trailCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            if(canvas.width !== courtSize.width || canvas.height !== courtSize.height) {
                canvas.width = courtSize.width;
                canvas.height = courtSize.height;
                lastTrailPosition.current = null;
            }
            if (lastTrailPosition.current) {
                ctx.beginPath();
                ctx.moveTo(lastTrailPosition.current.x, lastTrailPosition.current.y);
                ctx.lineTo(playerPosition.x, playerPosition.y);
                ctx.strokeStyle = '#a3e635'; // tennis-green
                ctx.lineWidth = playerSize * 0.15;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            lastTrailPosition.current = { x: playerPosition.x, y: playerPosition.y };
        }
    }
  }, [playerPosition, isTracking, courtSize, playerSize]);

  return (
    <div className="p-4 flex flex-col items-center animate-fade-in">
        <h2 className="text-3xl font-bold mb-2 text-center text-tennis-accent">Radar</h2>
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
                    <div className="absolute top-0 left-0 w-full h-full" style={{
                      backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                      backgroundSize: `${pixelsPerMeter}px ${pixelsPerMeter}px`,
                    }} />
                    <div
                      className="absolute top-0 left-0 transition-transform duration-100 ease-linear"
                      style={{
                        width: courtSize.width,
                        height: courtSize.height,
                        transform: `translate(${courtOffset.x}px, ${courtOffset.y}px)`,
                      }}
                    >
                      <canvas
                        ref={trailCanvasRef}
                        className="absolute top-0 left-0"
                        width={courtSize.width}
                        height={courtSize.height}
                      />
                      <div className="absolute top-0 left-0 w-full h-1 bg-white/50" />
                      
                      {spawnedCards.map((card) => (
                          <div 
                              key={card.id}
                              className="absolute"
                              style={{ 
                                  width: cardSize, 
                                  height: cardSize, 
                                  top: card.position.y,
                                  left: card.position.x,
                                  backgroundColor: card.color,
                                  clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                              }}
                          />
                      ))}
                    </div>
                    
                    {isTracking && (
                        <div 
                            className="absolute bg-tennis-accent rounded-full flex items-center justify-center animate-radar-ping"
                            style={{ 
                                top: '50%',
                                left: '50%',
                                width: playerSize, 
                                height: playerSize,
                                transform: `translate(-50%, -50%)`,
                            }}
                        >
                          <div 
                            className="absolute"
                            style={{
                                top: '50%', left: '50%',
                                transform: `translate(-50%, -100%) rotate(${heading}deg)`,
                                transformOrigin: '50% 100%',
                                width: 0, height: 0,
                                borderLeft: `${playerSize * 0.2}px solid transparent`,
                                borderRight: `${playerSize * 0.2}px solid transparent`,
                                borderBottom: `${playerSize * 0.4}px solid #062a27`, // tennis-dark
                            }}
                          />
                        </div>
                    )}
                </>
            )}
        </div>
        <style>{`
          @keyframes radar-ping-effect {
            0% {
              box-shadow: 0 0 0 0px rgba(163, 230, 53, 0.5), 0 0 0 0px rgba(163, 230, 53, 0.5);
            }
            100% {
              box-shadow: 0 0 0 10px rgba(163, 230, 53, 0), 0 0 0 20px rgba(163, 230, 53, 0);
            }
          }
          .animate-radar-ping {
            animation: radar-ping-effect 1.5s infinite linear;
          }
        `}</style>
    </div>
  );
};