
import React from 'react';
import { GameType } from '../types';

interface HomeMenuProps {
  onSelectGame: (type: GameType) => void;
}

const HomeMenu: React.FC<HomeMenuProps> = ({ onSelectGame }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 animate-in fade-in zoom-in duration-700">
      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-7xl font-black text-slate-800 tracking-tight mb-4 drop-shadow-sm">
          Camino de Calma
        </h1>
        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-sm">
          ¿A qué queremos jugar hoy?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl px-4">
        {/* Juego de Arrastrar */}
        <button
          onClick={() => onSelectGame(GameType.DRAG)}
          className="group relative bg-white p-8 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-b-8 border-blue-200 active:border-b-0 active:translate-y-1"
        >
          <div className="text-7xl mb-6 transform group-hover:scale-110 transition-transform duration-500">
            🧩
          </div>
          <h2 className="text-xl font-black text-slate-700 uppercase mb-2">Arrastrar</h2>
          <p className="text-slate-400 font-medium text-sm">Asocia figuras y palabras</p>
        </button>

        {/* Juego de Atrapa */}
        <button
          onClick={() => onSelectGame(GameType.CATCH)}
          className="group relative bg-white p-8 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-b-8 border-amber-200 active:border-b-0 active:translate-y-1"
        >
          <div className="text-7xl mb-6 transform group-hover:scale-110 transition-transform duration-500">
            🍎
          </div>
          <h2 className="text-xl font-black text-slate-700 uppercase mb-2">Atrapar</h2>
          <p className="text-slate-400 font-medium text-sm">Pasa el mouse para atrapar</p>
        </button>

        {/* Juego de Puzzle */}
        <button
          onClick={() => onSelectGame(GameType.PUZZLE)}
          className="group relative bg-white p-8 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-b-8 border-violet-200 active:border-b-0 active:translate-y-1"
        >
          <div className="text-7xl mb-6 transform group-hover:scale-110 transition-transform duration-500">
            🖼️
          </div>
          <h2 className="text-xl font-black text-slate-700 uppercase mb-2">Puzzle</h2>
          <p className="text-slate-400 font-medium text-sm">Arma las piezas 2x2, 3x3...</p>
        </button>

        {/* Juego de Conducir */}
        <button
          onClick={() => onSelectGame(GameType.DRIVE)}
          className="group relative bg-white p-8 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-b-8 border-emerald-200 active:border-b-0 active:translate-y-1"
        >
          <div className="text-7xl mb-6 transform group-hover:scale-110 transition-transform duration-500">
            🚜
          </div>
          <h2 className="text-xl font-black text-slate-700 uppercase mb-2">Conducir</h2>
          <p className="text-slate-400 font-medium text-sm">Atrapa los elementos</p>
        </button>
      </div>

      <div className="mt-20 text-slate-300 flex items-center gap-3">
        <div className="h-[1px] w-12 bg-slate-200"></div>
        <span className="text-xs font-black uppercase tracking-[0.4em]">Espacio Terapéutico</span>
        <div className="h-[1px] w-12 bg-slate-200"></div>
      </div>
    </div>
  );
};

export default HomeMenu;
