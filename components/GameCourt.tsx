import React from 'react';
import type { Position } from '../types';

interface GameCourtProps {
    playerPosition: Position;
    powerUpPosition: Position;
    courtDimensions: { width: number; height: number };
}

const GameCourt: React.FC<GameCourtProps> = ({ playerPosition, powerUpPosition, courtDimensions }) => {
    
    // The world moves in the opposite direction of the player's logical position
    // to keep the player visually centered.
    const worldTransform = {
        transform: `translate(
            ${courtDimensions.width / 2 - playerPosition.x}px, 
            ${courtDimensions.height / 2 - playerPosition.y}px
        )`,
    };
    
    const gridColor = 'rgba(74, 222, 128, 0.3)'; // a semi-transparent light green (green-400)

    return (
        // Changed background to darker green and borders to be thicker and brighter
        <div className="relative w-full h-full bg-green-800 overflow-hidden rounded-lg border-4 border-green-400 shadow-2xl">
            {/* World Container: This moves around */}
            <div
                className="absolute top-0 left-0 w-full h-full transition-transform duration-100 ease-linear"
                style={{
                    ...worldTransform,
                    backgroundImage: `
                        linear-gradient(${gridColor} 1px, transparent 1px),
                        linear-gradient(to right, ${gridColor} 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px',
                }}
            >
                {/* Power-up: Positioned within the moving world */}
                <div
                    className="absolute w-8 h-8 bg-yellow-400 rounded-md border-2 border-yellow-200 shadow-lg animate-pulse"
                    style={{
                        top: powerUpPosition.y,
                        left: powerUpPosition.x,
                        transform: 'translate(-50%, -50%)' // Center the powerup on its coordinates
                    }}
                />
            </div>

            {/* Center court circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-dashed border-green-600/70 rounded-full z-0"></div>

            {/* Player: Fixed in the center of the viewport, made more prominent */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="w-10 h-10 rounded-full bg-lime-300 border-2 border-lime-500 shadow-lg shadow-lime-300/50 flex items-center justify-center">
                   <div className="w-3 h-3 rounded-full bg-lime-600"></div>
                </div>
            </div>

        </div>
    );
};

export default GameCourt;
