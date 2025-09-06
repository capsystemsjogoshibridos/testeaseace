
import React from 'react';

interface HudProps {
  score: number;
  angle: number;
  displacement: number;
}

const Hud: React.FC<HudProps> = ({ score, angle, displacement }) => {
  return (
    <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mb-4 p-3 bg-green-800/50 rounded-lg border border-green-600 backdrop-blur-sm">
      <div className="flex justify-between items-center text-lg">
        <div className="flex flex-col items-center">
          <span className="text-sm text-green-400">SCORE</span>
          <span className="font-bold text-2xl text-white">{score}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm text-green-400">ANGLE</span>
          <span className="font-bold text-2xl text-white">{angle}°</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm text-green-400">DISPLACEMENT</span>
          <span className="font-bold text-2xl text-white">{displacement}</span>
        </div>
      </div>
    </div>
  );
};

export default Hud;
