
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameSettings, GameItem, WordLevel } from '../types';
import { UNIVERSES } from '../constants';

interface CatchBoardProps {
  settings: GameSettings;
  onComplete: () => void;
  isFinished: boolean;
}

interface FloatingItem extends GameItem {
  id_instance: string;
  x: number; // Porcentaje 0-100
  y: number; // Porcentaje 0-100
  vx: number;
  vy: number;
  scale: number;
  rotation: number;
  caught: boolean;
}

const CatchBoard: React.FC<CatchBoardProps> = ({ settings, onComplete, isFinished }) => {
  const universe = UNIVERSES[settings.universe];
  const [items, setItems] = useState<FloatingItem[]>([]);
  const [caughtCount, setCaughtCount] = useState(0);
  
  // Usamos Refs para las coordenadas del mouse para tener lectura instantánea en el loop
  const mousePosRef = useRef({ x: -2000, y: -2000 });
  const [visualMouse, setVisualMouse] = useState({ x: -200, y: -200 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const requestRef = useRef<number>(null);
  const itemsRef = useRef<FloatingItem[]>([]);

  const totalToCatch = settings.itemCount * 3;

  const getSpeedMultiplier = () => {
    switch (settings.wordLevel) {
      case WordLevel.COMPLETA: return 0.05; 
      case WordLevel.SEGMENTADA: return 0.15; 
      case WordLevel.LETRA_POR_LETRA: return 0.30; 
      default: return 0.15;
    }
  };

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
  }, []);

  const playPop = useCallback(() => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(settings.musicVolume * 0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }, [settings.musicVolume, initAudio]);

  const speak = useCallback((text: string) => {
    if (!settings.voiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.toLowerCase());
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }, [settings.voiceEnabled]);

  // Inicialización de items
  useEffect(() => {
    const universeItems = universe.items.slice(0, settings.itemCount);
    const speed = getSpeedMultiplier();
    
    const newItems: FloatingItem[] = Array.from({ length: totalToCatch }).map((_, i) => ({
      ...universeItems[i % universeItems.length],
      id_instance: Math.random().toString(),
      x: 15 + Math.random() * 70,
      y: 15 + Math.random() * 70,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      scale: 0.9 + Math.random() * 0.2,
      rotation: (Math.random() - 0.5) * 20,
      caught: false
    }));
    itemsRef.current = newItems;
    setItems(newItems);
    setCaughtCount(0);
  }, [universe, settings.itemCount, totalToCatch, settings.wordLevel]);

  // LOOP PRINCIPAL DE ANIMACIÓN Y COLISIÓN
  const update = useCallback(() => {
    if (isFinished || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const curX = mousePosRef.current.x - rect.left;
    const curY = mousePosRef.current.y - rect.top;

    let hasChanged = false;
    let newCaughtCount = 0;

    const nextItems = itemsRef.current.map(item => {
      if (item.caught) {
        newCaughtCount++;
        return item;
      }

      // 1. Mover objeto
      let nx = item.x + item.vx;
      let ny = item.y + item.vy;
      let nvx = item.vx;
      let nvy = item.vy;

      if (nx < 8 || nx > 92) nvx *= -1;
      if (ny < 12 || ny > 88) nvy *= -1;

      // 2. Detectar colisión con precisión de pixel real en este frame
      const itemXPx = (nx / 100) * rect.width;
      const itemYPx = (ny / 100) * rect.height;

      const dx = itemXPx - curX;
      const dy = itemYPx - curY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Radio de precisión quirúrgica (30px es ideal para iconos pequeños)
      if (dist < 30) {
        hasChanged = true;
        playPop();
        speak(item.name);
        return { ...item, x: nx, y: ny, vx: nvx, vy: nvy, caught: true };
      }

      return { ...item, x: nx, y: ny, vx: nvx, vy: nvy };
    });

    if (hasChanged || itemsRef.current.some(i => !i.caught)) {
      itemsRef.current = nextItems;
      setItems([...nextItems]);
      
      const count = nextItems.filter(i => i.caught).length;
      setCaughtCount(count);
      
      if (count >= totalToCatch && !isFinished) {
        setTimeout(onComplete, 500);
      }
    }

    requestRef.current = requestAnimationFrame(update);
  }, [isFinished, playPop, speak, totalToCatch, onComplete]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [update]);

  const handlePointerMove = (clientX: number, clientY: number) => {
    // Actualizamos el Ref para lectura inmediata del loop
    mousePosRef.current = { x: clientX, y: clientY };
    // Actualizamos el estado visual para el renderizado del puntero
    setVisualMouse({ x: clientX, y: clientY });
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 relative overflow-hidden select-none touch-none bg-white cursor-none"
      style={{ backgroundColor: universe.backgroundColor }}
      onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
      onTouchMove={(e) => handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)}
    >
      {/* Fondo decorativo */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none grayscale mix-blend-multiply" 
        style={{ backgroundImage: `url(${universe.illustration})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />

      {/* Objetos flotantes */}
      {items.map(item => (
        <div
          key={item.id_instance}
          className={`absolute pointer-events-none flex flex-col items-center justify-center transition-opacity duration-300 ${item.caught ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}
          style={{ 
            left: `${item.x}%`, 
            top: `${item.y}%`, 
            transform: `translate(-50%, -50%) scale(${item.scale}) rotate(${item.rotation}deg)`,
            // Importante: No usar transitions aquí para que la posición visual coincida con la lógica
          }}
        >
           <span className="text-5xl md:text-6xl filter drop-shadow-xl leading-none">
             {item.image}
           </span>
           {settings.showWords && (
              <div className="mt-1 bg-white/90 backdrop-blur-sm px-3 py-0.5 rounded-full text-[10px] font-black text-slate-700 shadow-sm border border-white/50 uppercase">
                {item.name}
              </div>
           )}
        </div>
      ))}

      {/* Barra de progreso */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-50 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md rounded-full p-2 shadow-2xl flex items-center gap-4 border border-white/40">
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
             <div 
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500" 
                style={{ width: `${(caughtCount / totalToCatch) * 100}%` }} 
             />
          </div>
          <div className="text-xl font-black text-amber-600 pr-2 tabular-nums">
            {caughtCount}/{totalToCatch}
          </div>
        </div>
      </div>

      {/* PUNTERO VISUAL DE ALTA PRECISIÓN */}
      <div 
        className="fixed pointer-events-none z-[200] flex items-center justify-center"
        style={{ 
          left: visualMouse.x, 
          top: visualMouse.y, 
          transform: 'translate(-50%, -50%)' 
        }}
      >
        {/* El punto central es el punto de impacto exacto */}
        <div className="w-8 h-8 bg-amber-400 rounded-full shadow-[0_0_20px_rgba(251,191,36,0.7)] border-2 border-white flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
        </div>
        <div className="absolute inset-0 w-12 h-12 border border-amber-400/30 rounded-full animate-ping" />
        <div className="absolute -inset-2 w-12 h-12 border-[1px] border-dashed border-white/40 rounded-full animate-[spin_10s_linear_infinite]" />
      </div>

      <div className="absolute inset-0 border-[16px] border-white/5 pointer-events-none" />
    </div>
  );
};

export default CatchBoard;
