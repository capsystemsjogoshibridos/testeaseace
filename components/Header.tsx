import React from 'react';
import type { View } from '../types';

interface HeaderProps {
  setCurrentView: (view: View) => void;
  currentView: View;
}

export const Header: React.FC<HeaderProps> = ({ setCurrentView, currentView }) => {
  const navItems: { view: View; label: string }[] = [
    { view: 'deck', label: 'Meu Tennisdeck' },
    { view: 'collect', label: 'Court Collect' },
    { view: 'run-collect', label: 'Run Collect' },
    { view: 'radar', label: 'Radar' },
    { view: 'battle', label: 'Batalha' },
  ];

  const NavButton: React.FC<{ view: View; label: string }> = ({ view, label }) => {
    const isActive = currentView === view;
    return (
      <button 
        onClick={() => setCurrentView(view)}
        className={`px-5 py-2.5 text-base font-semibold rounded-md transition-all duration-300 ${
          isActive
            ? 'bg-tennis-accent text-tennis-dark shadow-lg'
            : 'bg-tennis-blue text-tennis-light hover:bg-tennis-accent/80 hover:text-tennis-dark'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <header className="bg-tennis-blue/50 backdrop-blur-sm p-4 sticky top-0 z-40 shrink-0">
      <div className="container mx-auto flex justify-between items-center">
        <h1 
            className="text-3xl font-black text-tennis-accent cursor-pointer"
            onClick={() => setCurrentView('home')}
        >
            Ás&Ace V.5.6
        </h1>
        <nav className="flex items-center space-x-2 md:space-x-4">
          {navItems.map(item => (
            <NavButton key={item.view} view={item.view} label={item.label} />
          ))}
        </nav>
      </div>
    </header>
  );
};