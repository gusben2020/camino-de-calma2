
import React from 'react';
import { UniverseType } from '../types';
import { UNIVERSES } from '../constants';

interface UniverseMenuProps {
  onSelect: (type: UniverseType) => void;
  currentUniverse: UniverseType;
}

const UniverseMenu: React.FC<UniverseMenuProps> = ({ onSelect, currentUniverse }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 animate-in fade-in duration-1000">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-4">Camino de Calma</h1>
        <p className="text-slate-400 font-medium uppercase tracking-[0.2em] text-sm">Selecciona un mundo para comenzar</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-6xl">
        {Object.values(UNIVERSES).map((universe) => {
          // Icono especial para el universo aleatorio
          const icon = universe.type === UniverseType.ALEATORIO ? '🌈' : (universe.items[0]?.image || '✨');
          
          return (
            <button
              key={universe.type}
              onClick={() => onSelect(universe.type)}
              className="group relative flex flex-col items-center p-8 bg-white rounded-[2rem] border-4 border-transparent hover:border-blue-400 hover:shadow-2xl transition-all duration-300 active:scale-95 overflow-hidden shadow-sm"
              style={{ backgroundColor: universe.backgroundColor }}
            >
              <div className="text-7xl mb-6 transform group-hover:scale-125 transition-transform duration-500 drop-shadow-sm">
                {icon}
              </div>
              <span className="text-lg font-black text-slate-700 tracking-wide uppercase">
                {universe.title}
              </span>
              
              <div className="absolute inset-0 opacity-0 group-hover:opacity-5 pointer-events-none transition-opacity">
                <div className="absolute inset-0 bg-blue-500" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-16 flex items-center gap-2 text-slate-300">
        <span className="text-xs font-bold uppercase tracking-widest">Desarrollado con Calma</span>
        <span className="text-xl">🌿</span>
      </div>
    </div>
  );
};

export default UniverseMenu;
