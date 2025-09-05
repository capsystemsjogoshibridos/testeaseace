import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Rackard } from '../types';

// --- Constants ---
const REAL_COURT_HEIGHT_METERS = 11.88;
const REAL_COURT_WIDTH_METERS = 8.23;
const REAL_SERVICE_LINE_FROM_NET_METERS = 6.4;
const STEP_LENGTH_METERS = 0.75; // Average step length
const STEP_DETECTION_THRESHOLD = 12; // m/s^2 - needs tuning
const STEP_COOLDOWN_MS = 500; // Minimum time between steps

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

  const courtContainerRef = useRef<HTMLDivElement>(null);
  const lastStepTime = useRef(0);
  const currentHeading = useRef(0);

  // --- Dynamic Scaling ---
  const { pixelsPerMeter, playerSize, cardSize, collectionRadius, serviceLineCenterPos } = useMemo(() => {
    if (courtSize.width === 0) return { pixelsPerMeter: 0, playerSize: 0, cardSize: 0, collectionRadius: 0, serviceLineCenterPos: { x: 0, y: 0 } };
    const ppm = courtSize.width / REAL_COURT_WIDTH_METERS;
    const pSize = ppm; // Player is 1 meter wide
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

  // --- Card Spawning logic ---
  const spawnNewCard = useCallback(() => {
    if (courtSize.width === 0) return;
    setSpawnedCard({
      id: `card-${Date.now()}`,
      position: { x: Math.random() * (courtSize.width - cardSize), y: Math.random() * (courtSize.height - cardSize) },
    });
  }, [courtSize, cardSize]);

  useEffect(() => {
    if (isTracking) {
      const interval = setInterval(() => { if (!spawnedCard) spawnNewCard(); }, 30000); // Spawn every 30s if none
      if (!spawnedCard) spawnNewCard();
      return () => clearInterval(interval);
    }
  }, [isTracking, spawnNewCard, spawnedCard]);

  // --- Card Collection Logic ---
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
        } else {
          setMessage("Permissão para sensores de movimento negada.");
          return false;
        }
      } catch (error) {
        setMessage("Erro ao solicitar permissões de sensor.");
        return false;
      }
    } else {
      // For devices that don't require explicit permission (e.g., Android)
      console.log("Motion sensor permissions not required or already granted.");
      setPermissionsGranted(true);
      return true;
    }
  };

  const handleSync = async () => {
    const hasPermissions = permissionsGranted || await requestSensorPermissions();
    if (!hasPermissions) return;

    setMessage("Sincronizando posição inicial com GPS...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPlayerPosition(serviceLineCenterPos);
        setIsTracking(true);
        setMessage('Sincronizado! Ande para se mover.');
      },
      (error) => {
        setMessage(`Erro de GPS: ${error.message}.`);
      }
    );
  };

  // --- Motion & Orientation Tracking ---
  useEffect(() => {
    if (!isTracking || !permissionsGranted) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      // Compass direction (0=North, 90=East, 180=South, 270=West)
      // FIX: Cast event to `any` to access the non-standard `webkitCompassHeading` property on iOS, and check for undefined to handle 0 values.
      const orientationEvent = event as any;
      if (orientationEvent.webkitCompassHeading !== undefined) { // For iOS
        currentHeading.current = orientationEvent.webkitCompassHeading;
      } else {
        currentHeading.current = event.alpha ?? 0;
      }
    };
    
    const handleMotion = (event: DeviceMotionEvent) => {
        const { acceleration } = event;
        if (!acceleration || acceleration.x === null || acceleration.y === null || acceleration.z === null) return;

        const magnitude = Math.sqrt(acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2);
        const now = Date.now();

        if (now - lastStepTime.current > STEP_COOLDOWN_MS && magnitude > STEP_DETECTION_THRESHOLD) {
            lastStepTime.current = now;

            const angleRad = (currentHeading.current - 90) * (Math.PI / 180);
            const stepPixels = STEP_LENGTH_METERS * pixelsPerMeter;

            const dx = Math.cos(angleRad) * stepPixels;
            const dy = Math.sin(angleRad) * stepPixels;

            setPlayerPosition(prev => ({
                x: Math.max(0, Math.min(courtSize.width - playerSize, prev.x + dx)),
                y: Math.max(0, Math.min(courtSize.height - playerSize, prev.y - dy)), // Subtract dy to move up when angle is 0 (North)
            }));
        }
    };
    
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isTracking, permissionsGranted, pixelsPerMeter, playerSize, courtSize]);


  return (
    <div className="p-4 flex flex-col items-center animate-fade-in">
        <h2 className="text-3xl font-bold mb-2 text-center text-tennis-accent">Run Collect</h2>
        <p className="text-center text-tennis-light/70 mb-4 h-5">{message}</p>
        
        {!isTracking && (
             <button onClick={handleSync} className="mb-4 bg-tennis-green hover:bg-tennis-green/80 text-tennis-dark font-bold py-2 px-6 rounded-lg transition-colors">
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
                    {/* Net */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/50" />
                    
                    {isTracking && (
                        <div 
                            className="absolute bg-tennis-accent rounded-full"
                            style={{ 
                                width: playerSize, 
                                height: playerSize,
                                top: playerPosition.y,
                                left: playerPosition.x,
                                transition: 'top 0.1s linear, left 0.1s linear'
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
