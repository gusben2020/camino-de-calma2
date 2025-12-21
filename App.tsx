
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameSettings, UniverseType, WordLevel, GameType } from './types';
import { DEFAULT_SETTINGS } from './constants';
import Configuration from './components/Configuration';
import GameBoard from './components/GameBoard';
import DriveBoard from './components/DriveBoard';
import UniverseMenu from './components/UniverseMenu';
import HomeMenu from './components/HomeMenu';

type View = 'HOME' | 'UNIVERSE_SELECT' | 'GAME';

const App: React.FC = () => {
  const [view, setView] = useState<View>('HOME');
  const [gameType, setGameType] = useState<GameType>(GameType.DRAG);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [configLockTime, setConfigLockTime] = useState(0);
  const lockTimerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const gameMusic = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3"; 

  useEffect(() => {
    const saved = localStorage.getItem('camino_calma_settings');
    if (saved) {
      try {
        setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {
        console.error("Error al cargar settings", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('camino_calma_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = settings.musicVolume;
      if (settings.musicEnabled && view === 'GAME') {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [settings.musicVolume, settings.musicEnabled, view]);

  const handleSelectGame = (type: GameType) => {
    setGameType(type);
    setView('UNIVERSE_SELECT');
  };

  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    setIsGameFinished(false);
  };

  const handleSelectUniverse = (type: UniverseType) => {
    setSettings(prev => ({ ...prev, universe: type }));
    setView('GAME');
    setIsGameFinished(false);
  };

  const handleBack = () => {
    if (view === 'GAME') setView('UNIVERSE_SELECT');
    else if (view === 'UNIVERSE_SELECT') setView('HOME');
    setIsGameFinished(false);
  };

  const handleGameComplete = useCallback(() => {
    setIsGameFinished(true);
    const winAudio = new Audio("https://actions.google.com/sounds/v1/foley/festive_celebration.ogg");
    winAudio.volume = Math.min(1, settings.musicVolume + 0.2);
    winAudio.play().catch(() => {});
  }, [settings.musicVolume]);

  const handleLockStart = () => {
    const start = Date.now();
    lockTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(100, (elapsed / 2000) * 100);
      setConfigLockTime(progress);
      if (progress >= 100) {
        clearInterval(lockTimerRef.current!);
        setIsConfigOpen(true);
        setConfigLockTime(0);
      }
    }, 50);
  };

  const handleLockEnd = () => {
    if (lockTimerRef.current) {
      clearInterval(lockTimerRef.current);
      setConfigLockTime(0);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 relative">
      <audio ref={audioRef} loop src={gameMusic} />

      {view === 'HOME' && <HomeMenu onSelectGame={handleSelectGame} />}

      {view === 'UNIVERSE_SELECT' && (
        <div className="w-full h-full relative">
           <button onClick={handleBack} className="absolute top-8 left-8 p-4 bg-white rounded-full shadow-lg z-10 hover:bg-slate-50 transition-all active:scale-90">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <UniverseMenu onSelect={handleSelectUniverse} currentUniverse={settings.universe} />
        </div>
      )}

      {view === 'GAME' && (
        <div className={`flex flex-1 relative transition-all duration-500 ${isConfigOpen ? 'opacity-30 blur-sm' : 'opacity-100'}`}>
          {gameType === GameType.DRAG ? (
            <GameBoard settings={settings} onComplete={handleGameComplete} isFinished={isGameFinished} />
          ) : (
            <DriveBoard settings={settings} onComplete={handleGameComplete} isFinished={isGameFinished} />
          )}
          
          <div className="absolute top-4 left-4 z-50 flex gap-3">
            <button onClick={handleBack} className="p-3 bg-white/90 hover:bg-white rounded-full shadow-lg border border-slate-200 transition-all active:scale-95 text-slate-500">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>
            </button>
            {!isConfigOpen && (
              <button onMouseDown={handleLockStart} onMouseUp={handleLockEnd} onMouseLeave={handleLockEnd} onTouchStart={handleLockStart} onTouchEnd={handleLockEnd}
                className="group relative flex items-center gap-2 p-3 bg-white/90 hover:bg-white rounded-full shadow-lg border border-slate-200 transition-all active:scale-95">
                <div className="w-8 h-8 rounded-full border-2 border-blue-200 flex items-center justify-center relative overflow-hidden">
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                  {configLockTime > 0 && <div className="absolute bottom-0 left-0 w-full bg-blue-500/20 transition-all duration-75" style={{ height: `${configLockTime}%` }} />}
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {isConfigOpen && (
        <div className="absolute inset-0 z-[100] flex justify-end bg-black/10 backdrop-blur-sm">
          <div className="w-full md:w-[400px] h-full bg-white shadow-2xl"><Configuration settings={settings} onUpdate={handleUpdateSettings} onClose={() => setIsConfigOpen(false)} /></div>
        </div>
      )}

      {isGameFinished && view === 'GAME' && !isConfigOpen && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-white/40 backdrop-blur-xl animate-in zoom-in duration-500">
          <div className="text-center p-14 bg-white rounded-[5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-[12px] border-emerald-50 max-w-[90%] relative">
             <div className="absolute -top-16 left-1/2 -translate-x-1/2 text-[10rem] animate-bounce">🎊</div>
             <h2 className="text-8xl mb-8 filter drop-shadow-lg">🌟</h2>
             <h3 className="text-6xl font-black text-emerald-600 mb-6 tracking-tight uppercase">¡EXCELENTE!</h3>
             <p className="text-2xl text-slate-400 mb-12 font-bold uppercase tracking-widest">Lo lograste muy bien</p>
             <div className="flex flex-col md:flex-row gap-8 justify-center">
               <button onClick={() => setIsGameFinished(false)} className="px-16 py-6 bg-emerald-500 hover:bg-emerald-600 text-white text-2xl font-black rounded-full shadow-2xl transition-all active:scale-90 uppercase tracking-tighter">VOLVER A JUGAR</button>
               <button onClick={handleBack} className="px-16 py-6 bg-slate-100 hover:bg-slate-200 text-slate-500 text-2xl font-black rounded-full transition-all active:scale-90 uppercase tracking-tighter">MENU</button>
             </div>
             <div className="mt-12 flex justify-center gap-6 opacity-30">
               <span className="text-5xl">🚜</span>
               <span className="text-5xl">🐷</span>
               <span className="text-5xl">🦆</span>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
