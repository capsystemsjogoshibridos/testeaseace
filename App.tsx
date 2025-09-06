
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Position } from './types';
import GameCourt from './components/GameCourt';
import Hud from './components/Hud';
import PermissionRequest from './components/PermissionRequest';

const COURT_ASPECT_RATIO = 8.23 / 11.89;
const PLAYER_RADIUS = 20; // Corresponds to w-10/2
const POWERUP_RADIUS = 16; // Corresponds to w-8/2
const SENSITIVITY = 2.5;

function App() {
  const [hasPermission, setHasPermission] = useState(false);
  const [score, setScore] = useState(0);
  const [sensorData, setSensorData] = useState({ angle: 0, displacement: 0 });

  const courtRef = useRef<HTMLDivElement>(null);
  const [courtDimensions, setCourtDimensions] = useState({ width: 0, height: 0 });
  
  const [playerPosition, setPlayerPosition] = useState<Position | null>(null);
  const [powerUpPosition, setPowerUpPosition] = useState<Position | null>(null);

  const initialOrientation = useRef<{ beta: number | null; gamma: number | null }>({ beta: null, gamma: null });

  const spawnPowerUp = useCallback((dimensions: { width: number, height: number }) => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      const newPowerUp: Position = {
        x: Math.random() * (dimensions.width - POWERUP_RADIUS * 2) + POWERUP_RADIUS,
        y: Math.random() * (dimensions.height - POWERUP_RADIUS * 2) + POWERUP_RADIUS,
      };
      setPowerUpPosition(newPowerUp);
    }
  }, []);

  useEffect(() => {
    if (courtRef.current) {
      const { clientWidth, clientHeight } = courtRef.current;
      setCourtDimensions({ width: clientWidth, height: clientHeight });
      const initialPlayerPos: Position = { x: clientWidth / 2, y: clientHeight / 2 };
      setPlayerPosition(initialPlayerPos);
      spawnPowerUp({ width: clientWidth, height: clientHeight });
    }
  }, [hasPermission, spawnPowerUp]);


  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (event.beta === null || event.gamma === null || event.alpha === null) return;
    if (!playerPosition || !courtDimensions.width) return;

    if (initialOrientation.current.beta === null || initialOrientation.current.gamma === null) {
      initialOrientation.current = { beta: event.beta, gamma: event.gamma };
    }

    const deltaBeta = event.beta - initialOrientation.current.beta;
    const deltaGamma = event.gamma - initialOrientation.current.gamma;
    
    let newX = playerPosition.x + deltaGamma * SENSITIVITY;
    let newY = playerPosition.y + deltaBeta * SENSITIVITY;
    
    // Clamp player position within court boundaries
    newX = Math.max(PLAYER_RADIUS, Math.min(newX, courtDimensions.width - PLAYER_RADIUS));
    newY = Math.max(PLAYER_RADIUS, Math.min(newY, courtDimensions.height - PLAYER_RADIUS));
    
    const newPlayerPos = { x: newX, y: newY };
    setPlayerPosition(newPlayerPos);

    // Update sensor data for HUD
    const displacement = Math.sqrt(
      Math.pow(newX - courtDimensions.width / 2, 2) + 
      Math.pow(newY - courtDimensions.height / 2, 2)
    );
    setSensorData({ angle: Math.round(event.alpha), displacement: Math.round(displacement) });

    // Collision detection
    if (powerUpPosition) {
      const distance = Math.sqrt(
        Math.pow(newPlayerPos.x - powerUpPosition.x, 2) +
        Math.pow(newPlayerPos.y - powerUpPosition.y, 2)
      );

      if (distance < PLAYER_RADIUS + POWERUP_RADIUS) {
        setScore(s => s + 1);
        spawnPowerUp(courtDimensions);
      }
    }
  }, [playerPosition, powerUpPosition, courtDimensions, spawnPowerUp]);

  useEffect(() => {
    if (hasPermission) {
      window.addEventListener('deviceorientation', handleOrientation);
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    }
  }, [hasPermission, handleOrientation]);

  const requestDeviceAccess = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setHasPermission(true);
        } else {
          alert('Sensor access denied. The game cannot start.');
        }
      } catch (error) {
        console.error('Error requesting sensor permission:', error);
        alert('Could not request sensor access. Your browser may not be supported.');
      }
    } else {
      // For browsers that don't require explicit permission
      setHasPermission(true);
    }
  };

  return (
    <main className="bg-green-900 text-green-300 font-mono w-screen h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      {!hasPermission ? (
        <PermissionRequest onRequest={requestDeviceAccess} />
      ) : (
        <>
          <Hud score={score} angle={sensorData.angle} displacement={sensorData.displacement} />
          <div className="w-full max-w-sm md:max-w-md lg:max-w-lg" style={{ aspectRatio: `${COURT_ASPECT_RATIO}` }} ref={courtRef}>
             {playerPosition && powerUpPosition && courtDimensions.width > 0 && (
                 <GameCourt 
                    playerPosition={playerPosition}
                    powerUpPosition={powerUpPosition}
                    courtDimensions={courtDimensions}
                 />
             )}
          </div>
          <p className="mt-4 text-center text-sm text-green-500">Tilt your device to move.</p>
        </>
      )}
    </main>
  );
}

export default App;
