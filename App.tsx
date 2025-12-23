
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameSettings, UniverseType, WordLevel, GameType } from './types';
import { DEFAULT_SETTINGS } from './constants';
import Configuration from './components/Configuration';
import GameBoard from './components/GameBoard';
import DriveBoard from './components/DriveBoard';
import CatchBoard from './components/CatchBoard';
import PuzzleBoard from './components/PuzzleBoard';
import UniverseMenu from './components/UniverseMenu';
import HomeMenu from './components/HomeMenu';

type View = 'HOME' | 'UNIVERSE_SELECT' | 'GAME';

const App: React.FC = () => {
  const [view, setView] = useState<View>('HOME');
  const [gameType, setGameType] = useState<GameType>(GameType.DRAG);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [isPaused, setIsPaused] = useState(false); 
  const [configLockTime, setConfigLockTime] = useState(0);
  const [gameKey, setGameKey] = useState(0); // Clave para forzar reinicio completo
  
  const lockTimerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const victoryAudioCtxRef = useRef<AudioContext | null>(null);

  const gameMusic = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"; 

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && view === 'GAME' && !isConfigOpen && !isGameFinished) {
        e.preventDefault();
        setIsPaused(prev => !prev);
        if (victoryAudioCtxRef.current?.state === 'suspended') {
          victoryAudioCtxRef.current.resume();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, isConfigOpen, isGameFinished]);

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
      if (settings.musicEnabled && view === 'GAME' && !isPaused && !isGameFinished) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [settings.musicVolume, settings.musicEnabled, view, isPaused, isGameFinished]);

  const speakReinforcement = useCallback(() => {
    if (!settings.voiceEnabled) return;
    window.speechSynthesis.cancel();
    // Mensaje actualizado según solicitud
    const msg = `Excelente ${settings.userName}, lo has hecho muy bien`;
    const utterance = new SpeechSynthesisUtterance(msg.toLowerCase());
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.2;
    window.speechSynthesis.speak(utterance);
  }, [settings.voiceEnabled, settings.userName]);

  const playVictoryFanfare = useCallback(() => {
    if (!victoryAudioCtxRef.current) {
      victoryAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = victoryAudioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const vol = Math.max(0.4, settings.musicVolume * 1.5);
    const notes = [523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(vol / 4, ctx.currentTime + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.8);
    });
  }, [settings.musicVolume]);

  const handleSelectGame = (type: GameType) => {
    setGameType(type);
    setView('UNIVERSE_SELECT');
    setIsPaused(false);
  };

  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    setIsGameFinished(false);
    // Si se actualizan cosas críticas como cantidad de objetos, forzamos reinicio
    if (newSettings.itemCount !== undefined || newSettings.universe !== undefined || newSettings.wordLevel !== undefined) {
      setGameKey(k => k + 1);
    }
  };

  const handleSelectUniverse = (universe: UniverseType) => {
    handleUpdateSettings({ universe });
    setView('GAME');
    setIsPaused(false);
    setGameKey(k => k + 1); // Nueva sesión al cambiar de universo
  };

  const handleBack = () => {
    if (view === 'GAME') setView('UNIVERSE_SELECT');
    else if (view === 'UNIVERSE_SELECT') setView('HOME');
    setIsGameFinished(false);
    setIsPaused(false);
  };

  const handleGameComplete = useCallback(() => {
    setIsGameFinished(true);
    playVictoryFanfare();
    setTimeout(speakReinforcement, 400);
  }, [playVictoryFanfare, speakReinforcement]);

  const handleRestart = () => {
    setIsGameFinished(false);
    setIsPaused(false);
    setGameKey(k => k + 1); // ELIMINA EL JUEGO VIEJO Y CREA UNO NUEVO
  };

  const handleLockStart = () => {
    const start = Date.now();
    lockTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(100, (elapsed / 1000) * 100);
      setConfigLockTime(progress);
      if (progress >= 100) {
        clearInterval(lockTimerRef.current!);
        setIsConfigOpen(true);
        setConfigLockTime(0);
        setIsPaused(true);
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 relative" onMouseDown={() => victoryAudioCtxRef.current?.resume()}>
      <audio ref={audioRef} loop src={gameMusic} />

      {view === 'HOME' && <HomeMenu onSelectGame={handleSelectGame} />}

      {view === 'UNIVERSE_SELECT' && (
        <div className="w-full h-full relative">
           <button onClick={handleBack} className="absolute top-8 left-8 p-4 bg-white rounded-full shadow-lg z-10 hover:bg-slate-50 transition-all active:scale-90">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <UniverseMenu onSelect={handleSelectUniverse} currentUniverse={settings.universe} gameType={gameType} />
        </div>
      )}

      {view === 'GAME' && (
        <div className={`flex flex-1 relative transition-all duration-500 ${isConfigOpen ? 'opacity-30 blur-sm' : 'opacity-100'}`}>
          {/* El uso de la propiedad key={gameKey} es lo que garantiza que el juego se limpie al 100% */}
          {gameType === GameType.DRAG ? (
            <GameBoard key={gameKey} settings={settings} onComplete={handleGameComplete} isFinished={isGameFinished} />
          ) : gameType === GameType.DRIVE ? (
            <DriveBoard key={gameKey} settings={settings} onComplete={handleGameComplete} isFinished={isGameFinished} isPaused={isPaused} onPauseToggle={() => setIsPaused(p => !p)} />
          ) : gameType === GameType.CATCH ? (
            <CatchBoard key={gameKey} settings={settings} onComplete={handleGameComplete} isFinished={isGameFinished} />
          ) : (
            <PuzzleBoard key={gameKey} settings={settings} onComplete={handleGameComplete} isFinished={isGameFinished} />
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
          <div className="w-full md:w-[400px] h-full bg-white shadow-2xl">
            <Configuration 
              settings={settings} 
              onUpdate={handleUpdateSettings} 
              onClose={() => { setIsConfigOpen(false); setIsPaused(false); }} 
              gameType={gameType}
            />
          </div>
        </div>
      )}

      {isGameFinished && view === 'GAME' && !isConfigOpen && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-white/40 backdrop-blur-xl animate-in fade-in zoom-in duration-500">
          <div className="text-center p-14 bg-white rounded-[5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-[12px] border-emerald-50 max-w-[90%] relative">
             <div className="absolute -top-16 left-1/2 -translate-x-1/2 text-[10rem] animate-bounce">🎊</div>
             <h2 className="text-8xl mb-8 filter drop-shadow-lg">🌟</h2>
             <h3 className="text-6xl font-black text-emerald-600 mb-6 tracking-tight uppercase">¡EXCELENTE!</h3>
             {/* Mensaje visual actualizado */}
             <p className="text-2xl text-slate-400 mb-12 font-bold uppercase tracking-widest">Excelente {settings.userName}, lo has hecho muy bien</p>
             <div className="flex flex-col md:flex-row gap-8 justify-center">
               <button onClick={handleRestart} className="px-16 py-6 bg-emerald-500 hover:bg-emerald-600 text-white text-2xl font-black rounded-full shadow-2xl transition-all active:scale-90 uppercase tracking-tighter">VOLVER A JUGAR</button>
               <button onClick={handleBack} className="px-16 py-6 bg-slate-100 hover:bg-slate-200 text-slate-500 text-2xl font-black rounded-full transition-all active:scale-90 uppercase tracking-tighter">MENU</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
