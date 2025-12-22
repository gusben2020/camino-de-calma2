
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GameSettings, GameItem, UniverseType, WordLevel } from '../types';
import { UNIVERSES } from '../constants';

interface DriveBoardProps {
  settings: GameSettings;
  onComplete: () => void;
  isFinished: boolean;
  isPaused: boolean;
  onPauseToggle: () => void;
}

interface ActiveObject extends GameItem {
  id_instance: string;
  lane: number;
  x: number;
  type: 'OBJECT' | 'MUD';
  collected: boolean;
}

const ASPHALT_LANES = 5;
const PLAYER_X_PERCENT = 25; 
const ROAD_HEIGHT_PERCENT = 48; 
const HISTORY_SIZE = 100;

const DriveBoard: React.FC<DriveBoardProps> = ({ settings, onComplete, isFinished, isPaused, onPauseToggle }) => {
  const universe = UNIVERSES[settings.universe];
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [playerVisualY, setPlayerVisualY] = useState(50);
  const [playerRotation, setPlayerRotation] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
  const [objects, setObjects] = useState<ActiveObject[]>([]);
  const [collectedItems, setCollectedItems] = useState<GameItem[]>([]);
  
  const [handsExtended, setHandsExtended] = useState(false);
  const [handsProgress, setHandsProgress] = useState(0);

  const speedFactorRef = useRef(1.0);
  const mudPenaltyActiveRef = useRef(false);
  const shoulderPenaltyActiveRef = useRef(false);
  const [visualSpeedFactor, setVisualSpeedFactor] = useState(1.0);

  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);
  const roadOffsetRef = useRef<number>(0);
  const lastSpawnOffsetRef = useRef<number>(0);
  const objectsRef = useRef<ActiveObject[]>([]);
  const playerYRef = useRef(50); 
  const targetYRef = useRef(50); 
  const historyRef = useRef<{y: number}[]>(Array(HISTORY_SIZE).fill({y: 50}));

  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playEffect = useCallback((type: 'CATCH' | 'PENALTY') => {
    if (!audioCtxRef.current) initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const vol = Math.max(0.2, settings.musicVolume * 1.5);

    if (type === 'CATCH') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  }, [settings.musicVolume, initAudio]);

  const speak = useCallback((text: string) => {
    if (!settings.voiceEnabled) return;
    setTimeout(() => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.toLowerCase());
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }, 150);
  }, [settings.voiceEnabled]);

  const getRoadCenterAt = (xPercent: number, totalOffset: number) => {
    const freq = 0.012;
    const amp = 12;
    return 50 + Math.sin((xPercent * freq) + (totalOffset * 0.0002)) * amp;
  };

  const drawRoad = (ctx: CanvasRenderingContext2D, width: number, height: number, offset: number) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#16a34a'; 
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#15803d';
    for (let i = 0; i < 60; i++) {
      const dotX = ( (i * 1567.8 - offset) % (width + 200) ) - 100;
      const dotY = ( (i * 987.4) % height );
      if (dotX > -100 && dotX < width + 100) {
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const roadHeight = (ROAD_HEIGHT_PERCENT / 100) * height;
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 20) {
      const xP = (x / width) * 100;
      const cy = (getRoadCenterAt(xP, offset) / 100) * height;
      if (x === -20) ctx.moveTo(x, cy - roadHeight / 2 - 25);
      else ctx.lineTo(x, cy - roadHeight / 2 - 25);
    }
    for (let x = width + 20; x >= -20; x -= 20) {
      const xP = (x / width) * 100;
      const cy = (getRoadCenterAt(xP, offset) / 100) * height;
      ctx.lineTo(x, cy + roadHeight / 2 + 25);
    }
    ctx.fillStyle = '#92400e'; 
    ctx.fill();
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 15) {
      const xP = (x / width) * 100;
      const cy = (getRoadCenterAt(xP, offset) / 100) * height;
      if (x === -20) ctx.moveTo(x, cy - roadHeight / 2);
      else ctx.lineTo(x, cy - roadHeight / 2);
    }
    for (let x = width + 20; x >= -20; x -= 15) {
      const xP = (x / width) * 100;
      const cy = (getRoadCenterAt(xP, offset) / 100) * height;
      ctx.lineTo(x, cy + roadHeight / 2);
    }
    ctx.fillStyle = '#1e293b'; 
    ctx.fill();
    ctx.setLineDash([50, 80]);
    ctx.lineDashOffset = offset; 
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 5;
    for (let i = 1; i < ASPHALT_LANES; i++) {
      ctx.beginPath();
      const laneOffset = (i / ASPHALT_LANES - 0.5) * roadHeight;
      for (let x = -20; x <= width + 20; x += 30) {
        const xP = (x / width) * 100;
        const cy = (getRoadCenterAt(xP, offset) / 100) * height;
        if (x === -20) ctx.moveTo(x, cy + laneOffset);
        else ctx.lineTo(x, cy + laneOffset);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  };

  const animate = useCallback((t: number) => {
    if (isFinished || isPaused) {
      lastTimeRef.current = t;
      requestRef.current = requestAnimationFrame(animate);
      return;
    }
    const deltaTime = Math.min(32, t - (lastTimeRef.current || t));
    lastTimeRef.current = t;
    
    const screenWidth = containerRef.current?.clientWidth || 1000;
    const roadAtPlayer = getRoadCenterAt(PLAYER_X_PERCENT, roadOffsetRef.current);
    const roadH = ROAD_HEIGHT_PERCENT;
    const isInUIZone = targetYRef.current < 20;
    const roadTop = roadAtPlayer - roadH / 2;
    const roadBottom = roadAtPlayer + roadH / 2;
    const minY = isInUIZone ? (roadTop + 2) : (roadTop - 14); 
    const maxY = roadBottom + 14;
    const clampedTarget = Math.max(minY, Math.min(maxY, targetYRef.current));
    playerYRef.current += (clampedTarget - playerYRef.current) * 0.08;
    setPlayerVisualY(playerYRef.current);
    
    const isOnShoulder = Math.abs(playerYRef.current - roadAtPlayer) > (roadH / 2) && !isInUIZone;
    if (isOnShoulder && !shoulderPenaltyActiveRef.current) {
        shoulderPenaltyActiveRef.current = true;
        speedFactorRef.current = 0.33;
        playEffect('PENALTY');
    } else if (!isOnShoulder && shoulderPenaltyActiveRef.current) {
        shoulderPenaltyActiveRef.current = false;
    }

    if (!mudPenaltyActiveRef.current && !shoulderPenaltyActiveRef.current && speedFactorRef.current < 1.0) {
      speedFactorRef.current += 0.005; 
      if (speedFactorRef.current > 1.0) speedFactorRef.current = 1.0;
    }
    setVisualSpeedFactor(speedFactorRef.current);

    const difficultySpeedMultiplier = settings.wordLevel === WordLevel.COMPLETA ? 0.45 : settings.wordLevel === WordLevel.SEGMENTADA ? 0.75 : 1.1;
    const baseSpeed = 0.0005 * speedFactorRef.current * difficultySpeedMultiplier; 
    const gameSpeed = baseSpeed * deltaTime;
    const pixelMovement = gameSpeed * screenWidth;
    
    roadOffsetRef.current += pixelMovement;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawRoad(ctx, canvas.width, canvas.height, roadOffsetRef.current);
    }
    
    const lastY = historyRef.current[historyRef.current.length-1]?.y || 50;
    const dy = playerYRef.current - lastY;
    setPlayerRotation(prev => prev + (Math.max(-4, Math.min(4, dy * 10)) - prev) * 0.08);
    historyRef.current.push({ y: playerYRef.current });
    if (historyRef.current.length > HISTORY_SIZE) historyRef.current.shift();
    
    objectsRef.current = objectsRef.current.map(obj => {
      if (obj.collected) return obj;
      const newX = obj.x - (gameSpeed * 100);
      const roadAtObj = getRoadCenterAt(newX, roadOffsetRef.current);
      const laneOffset = (obj.lane / ASPHALT_LANES - 0.5 + 1/(ASPHALT_LANES*2)) * roadH;
      const objY = roadAtObj + laneOffset;
      const captureXCenter = PLAYER_X_PERCENT + 8;
      const rangeY = handsExtended ? 14 : 6;
      const inXRange = Math.abs(newX - captureXCenter) < 8; 
      const inYRange = Math.abs(objY - playerYRef.current) < rangeY;
      
      if (inXRange && inYRange) {
        if (obj.type === 'MUD') {
          if (!mudPenaltyActiveRef.current) {
            mudPenaltyActiveRef.current = true;
            speedFactorRef.current = 0.33;
            playEffect('PENALTY');
            setTimeout(() => { mudPenaltyActiveRef.current = false; }, 5000);
          }
          return { ...obj, x: newX };
        } else {
          playEffect('CATCH');
          speak(obj.name);
          setCollectedItems(prev => {
            const next = [...prev, obj];
            if (next.length >= settings.itemCount * 3) setTimeout(onComplete, 800);
            return next;
          });
          return { ...obj, collected: true, x: newX };
        }
      }
      return { ...obj, x: newX };
    }).filter(o => o.x > -30 && !o.collected);

    const distSinceLastSpawn = roadOffsetRef.current - lastSpawnOffsetRef.current;
    
    const difficultyConfigs = {
      [WordLevel.COMPLETA]: [1.3, 2.2], 
      [WordLevel.SEGMENTADA]: [0.8, 1.5], 
      [WordLevel.LETRA_POR_LETRA]: [0.4, 0.9] 
    };
    
    const [minScreens, maxScreens] = difficultyConfigs[settings.wordLevel] || difficultyConfigs[WordLevel.COMPLETA];
    const minPxl = minScreens * screenWidth;
    const maxPxl = maxScreens * screenWidth;

    if (distSinceLastSpawn > minPxl) {
      const forceSpawn = distSinceLastSpawn > maxPxl;
      const randomChance = Math.random() < 0.05; 
      const maxInScreen = 4; 

      if ((forceSpawn || randomChance) && objectsRef.current.length < maxInScreen) {
        const items = universe.items.slice(0, settings.itemCount);
        objectsRef.current.push({
          ...items[Math.floor(Math.random() * items.length)],
          id_instance: Math.random().toString(),
          lane: Math.floor(Math.random() * ASPHALT_LANES),
          x: 130,
          type: Math.random() < 0.1 ? 'MUD' : 'OBJECT',
          collected: false
        });
        lastSpawnOffsetRef.current = roadOffsetRef.current;
      }
    }

    setObjects([...objectsRef.current]);
    requestRef.current = requestAnimationFrame(animate);
  }, [isFinished, isPaused, handsExtended, settings.itemCount, settings.wordLevel, universe, onComplete, speak, playEffect]);

  useEffect(() => {
    const resizer = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    resizer();
    window.addEventListener('resize', resizer);
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', resizer);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  const handleInteraction = (clientX: number, clientY: number) => {
    initAudio(); 
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relY = ((clientY - rect.top) / rect.height) * 100;
      const relX = ((clientX - rect.left) / rect.width) * 100;
      setCursorPos({ x: relX, y: relY });
      targetYRef.current = relY;
    }
  };

  const handleAction = () => {
    initAudio();
    if (handsExtended || isFinished || isPaused) return;
    setHandsExtended(true);
    let s: number;
    const step = (ts: number) => {
      if (!s) s = ts;
      const p = (ts - s) / 600;
      if (p < 1) {
        setHandsProgress(Math.sin(p * Math.PI));
        requestAnimationFrame(step);
      } else {
        setHandsExtended(false);
        setHandsProgress(0);
      }
    };
    requestAnimationFrame(step);
  };

  const trailersToRender = useMemo(() => {
    const lastItems = collectedItems.slice(-4);
    return [...lastItems].reverse();
  }, [collectedItems]);

  const laneHeightUnits = ROAD_HEIGHT_PERCENT / ASPHALT_LANES;

  const trailerOffsets = useMemo(() => {
    const delays = [8, 18, 30, 44]; 
    return trailersToRender.map((_, i) => {
        const delay = delays[i];
        const historicalY = historyRef.current[Math.max(0, historyRef.current.length - 1 - delay)]?.y || playerVisualY;
        const diff = historicalY - playerVisualY;
        const maxLaneDeviation = (i + 1) * 0.5;
        const maxDiffUnits = maxLaneDeviation * laneHeightUnits;
        const swerveEffect = diff * 1.5; 
        return Math.max(-maxDiffUnits, Math.min(maxDiffUnits, swerveEffect));
    });
  }, [trailersToRender, playerVisualY, laneHeightUnits]);

  const laneHeightPixels = useMemo(() => {
      if (!containerRef.current) return 60;
      const totalH = containerRef.current.clientHeight;
      return (ROAD_HEIGHT_PERCENT / ASPHALT_LANES / 100) * totalH;
  }, []);

  return (
    <div 
      ref={containerRef}
      className="flex-1 relative overflow-hidden select-none touch-none cursor-none bg-green-800"
      onMouseMove={(e) => handleInteraction(e.clientX, e.clientY)}
      onTouchMove={(e) => handleInteraction(e.touches[0].clientX, e.touches[0].clientY)}
      onMouseDown={handleAction}
      onTouchStart={handleAction}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {isPaused && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white/90 px-12 py-6 rounded-3xl shadow-2xl border-4 border-blue-400 animate-pulse cursor-pointer" onClick={onPauseToggle}>
            <h2 className="text-5xl font-black text-blue-600 uppercase tracking-tighter">PAUSA</h2>
            <p className="text-slate-400 font-bold text-center mt-2 uppercase tracking-widest text-xs">Click o Espacio para seguir</p>
          </div>
        </div>
      )}

      {objects.map(obj => {
        const roadC = getRoadCenterAt(obj.x, roadOffsetRef.current);
        const lOffset = (obj.lane / ASPHALT_LANES - 0.5 + 1/(ASPHALT_LANES*2)) * ROAD_HEIGHT_PERCENT;
        const y = roadC + lOffset;
        return (
          <div key={obj.id_instance} className="absolute z-20 pointer-events-none" style={{ left: `${obj.x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
            {obj.type === 'MUD' ? (
              <div className="relative">
                <div className="w-32 h-20 bg-amber-700/50 rounded-[60%_40%_70%_30%] blur-md border-2 border-amber-800/40" />
                <div className="absolute inset-4 bg-amber-600/30 rounded-full blur-sm" />
              </div>
            ) : (
              <div className="flex flex-row items-center">
                <span className="text-[4.5rem] filter drop-shadow-[0_10px_12px_rgba(0,0,0,0.35)]">{obj.image}</span>
                {settings.showWords && (
                  <div className="ml-4 bg-white/95 px-8 py-3 rounded-full text-2xl font-black text-slate-800 shadow-2xl uppercase border-4 border-white/50 whitespace-nowrap">
                    {obj.name}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="absolute z-30 pointer-events-none" style={{ left: `${PLAYER_X_PERCENT}%`, top: `${playerVisualY}%`, transform: 'translate(-50%, -50%)' }}>
        <div className="flex items-center">
          <div className="flex flex-row-reverse gap-4 mr-6">
            {trailersToRender.map((item, i) => {
              const pixelOffset = (trailerOffsets[i] / 100) * (containerRef.current?.clientHeight || 800);
              return (
                <div key={i} className="w-18 h-18 bg-amber-800 rounded-2xl flex items-center justify-center border-b-[8px] border-amber-950 shadow-xl" 
                  style={{ transform: `translateY(${pixelOffset}px)` }}>
                  <span className="text-5xl">{item.image}</span>
                </div>
              );
            })}
          </div>
          
          <div className="relative w-28 h-20 bg-red-600 rounded-2xl shadow-2xl flex items-center justify-center border-2 border-red-700" style={{ transform: `rotate(${playerRotation}deg)` }}>
             {handsExtended && (
               <>
                 <div className="absolute left-1/2 bottom-full origin-bottom flex flex-col items-center" style={{ transform: `translateX(-50%) translateY(${-handsProgress * laneHeightPixels * 0.95}px)` }}>
                   <div className="text-[5.5rem] filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.3)]">🖐️</div>
                 </div>
                 <div className="absolute left-1/2 top-full origin-top flex flex-col-reverse items-center" style={{ transform: `translateX(-50%) translateY(${handsProgress * laneHeightPixels * 0.95}px)` }}>
                   <div className="text-[5.5rem] filter drop-shadow-[0_-15px_15px_rgba(0,0,0,0.3)] rotate-180">🖐️</div>
                 </div>
               </>
             )}

             <div className="absolute -top-5 left-2 w-12 h-8 bg-slate-900 rounded-lg shadow-md" />
             <div className="absolute -bottom-5 left-2 w-12 h-8 bg-slate-900 rounded-lg shadow-md" />
             <div className="absolute -top-4 right-2 w-10 h-6 bg-slate-900 rounded-lg shadow-md" />
             <div className="absolute -bottom-4 right-2 w-10 h-6 bg-slate-900 rounded-lg shadow-md" />
             <div className="w-14 h-12 bg-sky-100/40 rounded-xl border-2 border-white/30 flex items-center justify-center backdrop-blur-sm">
                <span className="text-3xl opacity-30">🚜</span>
             </div>
             <div className="absolute right-1 top-2 w-3 h-4 bg-yellow-300 rounded-l-full shadow-[8px_0_15px_rgba(253,224,71,0.6)]" />
             <div className="absolute right-1 bottom-2 w-3 h-4 bg-yellow-300 rounded-l-full shadow-[8px_0_15px_rgba(253,224,71,0.6)]" />
          </div>
        </div>
      </div>

      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <div className="bg-white/95 backdrop-blur-md px-10 py-4 rounded-full shadow-2xl flex items-center gap-8 border border-white/20">
          <div className="flex gap-3">
            {Array.from({ length: settings.itemCount * 3 }).map((_, i) => (
              <div key={i} className={`w-4 h-4 rounded-full transition-all duration-500 ${i < collectedItems.length ? 'bg-emerald-500 scale-125 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-200'}`} />
            ))}
          </div>
          <div className="text-4xl">🧺</div>
        </div>
        {(visualSpeedFactor < 0.95 || shoulderPenaltyActiveRef.current) && (
          <div className="bg-amber-100 px-4 py-1 rounded-full text-[10px] font-black text-amber-700 uppercase tracking-widest animate-bounce border border-amber-200 shadow-sm">
            {shoulderPenaltyActiveRef.current ? '¡Banquina!' : 'Frenado'} - {Math.round(visualSpeedFactor * 100)}%
          </div>
        )}
      </div>

      <div className="fixed pointer-events-none z-[200] transition-transform duration-75" style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%`, transform: 'translate(-50%, -50%)' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]">
           <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {(mudPenaltyActiveRef.current || shoulderPenaltyActiveRef.current) && <div className="absolute inset-0 bg-amber-950/15 backdrop-blur-[1px] z-[60] transition-all duration-300" />}
    </div>
  );
};

export default DriveBoard;
