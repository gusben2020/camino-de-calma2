
import React from 'react';
import { GameSettings, UniverseType, WordLevel } from '../types';
import { UNIVERSES } from '../constants';

interface ConfigurationProps {
  settings: GameSettings;
  onUpdate: (settings: Partial<GameSettings>) => void;
  onClose: () => void;
}

const Configuration: React.FC<ConfigurationProps> = ({ settings, onUpdate, onClose }) => {
  return (
    <div className="h-full flex flex-col p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-slate-700">Panel de Control</h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-8">
        {/* Universo */}
        <section>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Universo Visual</label>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(UNIVERSES).map(u => (
              <button
                key={u.type}
                onClick={() => onUpdate({ universe: u.type })}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  settings.universe === u.type 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-slate-100 hover:border-slate-200 text-slate-600'
                }`}
              >
                {u.title}
              </button>
            ))}
          </div>
        </section>

        {/* Cantidad de Objetos */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cantidad de Objetos</label>
            <span className="text-blue-600 font-bold">{settings.itemCount}</span>
          </div>
          <input
            type="range"
            min="1"
            max="12"
            value={settings.itemCount}
            onChange={(e) => onUpdate({ itemCount: parseInt(e.target.value) })}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </section>

        {/* Nivel de Palabra */}
        <section>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Nivel de Lectura</label>
          <div className="flex flex-col gap-2">
            {[
              { level: WordLevel.COMPLETA, label: 'Palabra Completa (VACA)' },
              { level: WordLevel.SEGMENTADA, label: 'Sílaba / Segmento (VA - CA)' },
              { level: WordLevel.LETRA_POR_LETRA, label: 'Letra por Letra (V-A-C-A)' }
            ].map(l => (
              <button
                key={l.level}
                onClick={() => onUpdate({ wordLevel: l.level })}
                className={`p-3 rounded-xl border-2 text-left text-sm transition-all ${
                  settings.wordLevel === l.level 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-slate-100 hover:border-slate-200 text-slate-600'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </section>

        {/* Toggles */}
        <section className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Mostrar Palabras</span>
            <Toggle 
              checked={settings.showWords} 
              onChange={(val) => onUpdate({ showWords: val })} 
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Palabras Arrastrables</span>
            <Toggle 
              checked={settings.wordsAsObjects} 
              onChange={(val) => onUpdate({ wordsAsObjects: val })} 
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Voz Narradora</span>
            <Toggle 
              checked={settings.voiceEnabled} 
              onChange={(val) => onUpdate({ voiceEnabled: val })} 
            />
          </div>
          {settings.wordsAsObjects && settings.voiceEnabled && (
            <div className="flex items-center justify-between pl-4">
              <span className="text-xs font-medium text-slate-500">Pronunciación Parcial</span>
              <Toggle 
                checked={settings.partialVoiceEnabled} 
                onChange={(val) => onUpdate({ partialVoiceEnabled: val })} 
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Música de Fondo</span>
            <Toggle 
              checked={settings.musicEnabled} 
              onChange={(val) => onUpdate({ musicEnabled: val })} 
            />
          </div>
          {settings.musicEnabled && (
             <div className="pl-4">
               <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.musicVolume}
                onChange={(e) => onUpdate({ musicVolume: parseFloat(e.target.value) })}
                className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-400"
              />
             </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Ver Moldes</span>
            <Toggle 
              checked={settings.showMolds} 
              onChange={(val) => onUpdate({ showMolds: val })} 
            />
          </div>
        </section>
      </div>

      <div className="mt-auto pt-8">
        <button
          onClick={onClose}
          className="w-full py-4 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-900 transition-all active:scale-95"
        >
          VOLVER AL JUEGO
        </button>
        <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest">Camino de Calma v1.0</p>
      </div>
    </div>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: (val: boolean) => void }> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 rounded-full transition-all relative ${checked ? 'bg-blue-500' : 'bg-slate-200'}`}
  >
    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${checked ? 'left-7' : 'left-1'}`} />
  </button>
);

export default Configuration;
