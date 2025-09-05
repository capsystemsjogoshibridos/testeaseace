import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Rackard } from '../types';

// --- Constants ---
const REAL_COURT_HEIGHT_METERS = 11.88;
const REAL_COURT_WIDTH_METERS = 8.23;
const REAL_SERVICE_LINE_FROM_NET_METERS = 6.4;
const WALKING_SPEED_MPS = 1.4; // Average walking speed in meters per second

interface SpawnedCard {
  id: string;
  position: { x: number; y: number };
}

export const RunCollectView: React.FC<{onCollect: (baseCard: Omit<Rackard, 'id' | 'imageUrl'>) => void}> = ({ onCollect }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [playerPosition, setPlayerPosition] = useState({x: 0, y: 0});
  const [spawnedCard, setSpawnedCard] = useState<SpawnedCard | null>(null);
  const [message, setMessage] = useState('Sincronize sua posição para começar.');
  const [courtSize, setCourtSize] = useState({ width: 0, height: 0 });
  const [heading, setHeading] = useState(0);
  const [isWalking, setIsWalking] = useState(false);

  const courtContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastFrameTime = useRef(performance.now());
  const currentHeading = useRef(0);
  const motionTimeout = useRef<number | null>(null);

  // --- Dynamic Scaling ---
  const { pixelsPerMeter, playerSize, cardSize, collectionRadius, serviceLineCenterPos } = useMemo(() => {
    if (courtSize.width === 0) return { pixelsPerMeter: 0, playerSize: 0, cardSize: 0, collectionRadius: 0, serviceLineCenterPos: { x: 0, y: 0 } };
    const ppm = courtSize.width / REAL_COURT_WIDTH_METERS;
    const pSize = ppm;
    const serviceLineY = REAL_SERVICE_LINE_FROM_NET_METERS * ppm;
    const slcp = { x: courtSize.width / 2 - pSize / 2, y: serviceLineY - pSize / 2 };
    return { pixelsPerMeter: ppm, playerSize: pSize, cardSize: pSize, collectionRadius: pSize * 1.5, serviceLineCenterPos: slcp };
  }, [courtSize]);

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

  // --- Card Spawning & Collection Logic ---
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
      const dx = (playerPosition.x + playerSize / 2) - (spawnedCard.position.x + cardSize / 2);
      const dy = (playerPosition.y + playerSize / 2) - (spawnedCard.position.y + cardSize / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < collectionRadius) {
        setMessage('Rackard Coletada!');
        onCollect({ name: 'Nova Rackard', description: 'Coletada na corrida', power: Math.floor(Math.random() * 50) + 20 });
        setSpawnedCard(null);
        setTimeout(() => { if(isTracking) setMessage('Continue correndo para achar mais!'); }, 2000);
      }
    }
  }, [playerPosition, spawnedCard, onCollect, isTracking, playerSize, cardSize, collectionRadius, courtSize]);

  // --- Permission & Sync ---
  const requestSensorPermissions = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const motionPermission = await (DeviceMotionEvent as any).requestPermission();
        const orientationPermission = await (DeviceOrientationEvent as any).requestPermission();
        if (motionPermission === 'granted' && orientationPermission === 'granted') {
          setPermissionsGranted(true);
          return true;
        }
        setMessage("Permissão para sensores de movimento negada.");
        return false;
      } catch (error) {
        setMessage("Erro ao solicitar permissões de sensor.");
        return false;
      }
    }
    setPermissionsGranted(true);
    return true;
  };

  const handleSync = async () => {
    const hasPermissions = permissionsGranted || await requestSensorPermissions();
    if (!hasPermissions) return;
    setMessage("Sincronizando posição inicial com GPS...");
    navigator.geolocation.getCurrentPosition(
      () => {
        setPlayerPosition(serviceLineCenterPos);
        setIsTracking(true);
        setMessage('Sincronizado! Ande para se mover.');
      },
      (error) => setMessage(`Erro de GPS: ${error.message}.`)
    );
  };

  // --- Motion, Orientation & Game Loop ---
  useEffect(() => {
    if (!isTracking || !permissionsGranted) {
      setIsWalking(false);
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const orientationEvent = event as any;
      let newHeading = 0;
      if (orientationEvent.webkitCompassHeading !== undefined) {
        newHeading = orientationEvent.webkitCompassHeading;
      } else if (event.alpha !== null) {
        newHeading = 360 - event.alpha;
      }
      currentHeading.current = newHeading;
      setHeading(newHeading);
    };

    const handleMotion = (event: DeviceMotionEvent) => {
        const { acceleration } = event;
        if (!acceleration || acceleration.x === null || acceleration.y === null || acceleration.z === null) return;
        const magnitude = Math.sqrt(acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2);
        
        const WALKING_DETECT_THRESHOLD = 10.5;
        const WALKING_STOP_THRESHOLD = 10.2;

        if (magnitude > WALKING_DETECT_THRESHOLD) {
            if (!isWalking) setIsWalking(true);
            if (motionTimeout.current) {
                clearTimeout(motionTimeout.current);
                motionTimeout.current = null;
            }
        } else if (magnitude < WALKING_STOP_THRESHOLD && isWalking) {
            if (!motionTimeout.current) {
                motionTimeout.current = window.setTimeout(() => {
                    setIsWalking(false);
                    motionTimeout.current = null;
                }, 300);
            }
        }
    };
    
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);

    const gameLoop = (currentTime: number) => {
        const deltaTime = (currentTime - lastFrameTime.current) / 1000;
        lastFrameTime.current = currentTime;

        if(isWalking) {
          setPlayerPosition(prev => {
              const distanceMoved = WALKING_SPEED_MPS * deltaTime;
              const distancePixels = distanceMoved * pixelsPerMeter;
              const angleRad = (currentHeading.current - 90) * (Math.PI / 180);
              const dx = Math.cos(angleRad) * distancePixels;
              const dy = Math.sin(angleRad) * distancePixels;
              return {
                  x: Math.max(0, Math.min(courtSize.width - playerSize, prev.x + dx)),
                  y: Math.max(0, Math.min(courtSize.height - playerSize, prev.y + dy)),
              };
          });
        }
        
        animationFrameId.current = requestAnimationFrame(gameLoop);
    };

    lastFrameTime.current = performance.now();
    animationFrameId.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
      if (motionTimeout.current) clearTimeout(motionTimeout.current);
    };
  }, [isTracking, permissionsGranted, isWalking, pixelsPerMeter, playerSize, courtSize]);

  return (
    <div className="p-4 flex flex-col items-center animate-fade-in">
        <h2 className="text-3xl font-bold mb-2 text-center text-tennis-accent">Run Collect</h2>
        <div className="text-center text-tennis-light/70 mb-4 h-10 flex flex-col justify-center items-center">
          <p>{message}</p>
          {isTracking && <p className="text-sm font-mono">Direção: {Math.round(heading)}° | {isWalking ? "Andando" : "Parado"}</p>}
        </div>
        
        {!isTracking && (
             <button onClick={handleSync} className="mb-4 bg-tennis-green hover:bg-tennis-green/80 text-tennis-dark font-bold py-3 px-8 rounded-lg transition-colors">
                Sincronizar e Iniciar
            </button>
        )}

        <div 
            ref={courtContainerRef}
            className="relative bg-tennis-blue border-4 border-white overflow-hidden w-full max-w-lg mx-auto" 
            style={{ height: courtSize.height > 0 ? courtSize.height : 'auto', minHeight: courtSize.height > 0 ? 'auto' : '300px' }}
        >
            {courtSize.width > 0 && (
                <>
                    <div className="absolute top-0 left-0 w-full h-full" style={{
                      backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                      backgroundSize: `${pixelsPerMeter}px ${pixelsPerMeter}px`,
                    }} />
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/50" />
                    {isTracking && (
                        <div 
                            className="absolute bg-tennis-accent rounded-full"
                            style={{ 
                                width: playerSize, 
                                height: playerSize,
                                top: playerPosition.y,
                                left: playerPosition.x,
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