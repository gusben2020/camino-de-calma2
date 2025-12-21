
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GameSettings, GameItem, UniverseType } from '../types';
import { UNIVERSES } from '../constants';

interface DriveBoardProps {
  settings: GameSettings;
  onComplete: () => void;
  isFinished: boolean;
}

interface ActiveObject extends GameItem {
  id_instance: string;
  lane: number;
  x: number;
  type: 'OBJECT' | 'MUD';
  collected: boolean;
}

const ASPHALT_LANES = 5;
const PLAYER_X_PERCENT = 22; // Un poco más a la izquierda para ver mejor el brazo
const ROAD_HEIGHT_PERCENT = 58;
const HISTORY_SIZE = 50;

const DriveBoard: React.FC<DriveBoardProps> = ({ settings, onComplete, isFinished }) => {
  const universe = UNIVERSES[settings.universe];
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [playerVisualY, setPlayerVisualY] = useState(50);
  const [playerRotation, setPlayerRotation] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
  const [objects, setObjects] = useState<ActiveObject[]>([]);
  const [collectedItems, setCollectedItems] = useState<GameItem[]>([]);
  const [isMuddy, setIsMuddy] = useState(false);
  const [handTarget, setHandTarget] = useState<{lane: number, active: boolean, progress: number}>({lane: 0, active: false, progress: 0});
  
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);
  const objectsRef = useRef<ActiveObject[]>([]);
  const playerYRef = useRef(50); 
  const targetYRef = useRef(50); 
  const historyRef = useRef<{y: number}[]>(Array(HISTORY_SIZE).fill({y: 50}));
  const startTimeRef = useRef(Date.now());

  // Función matemática de la curva: ESTRICTA para sincronización
  const getRoadCenterAt = (xPercent: number, t: number) => {
    const freq = 0.015;
    const speed = 0.002;
    const amp = 18;
    // Curva compuesta para mayor organicidad
    return 55 + Math.sin((xPercent * freq) + (t * speed)) * amp + Math.cos((xPercent * 0.008) - (t * 0.0006)) * (amp/3);
  };

  const speak = (text: string) => {
    if (!settings.voiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.toLowerCase());
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!isFinished) {
      setCollectedItems([]);
      setObjects([]);
      objectsRef.current = [];
      startTimeRef.current = Date.now();
    }
  }, [isFinished]);

  const drawRoad = (ctx: CanvasRenderingContext2D, width: number, height: number, t: number) => {
    ctx.clearRect(0, 0, width, height);

    const roadHeight = (ROAD_HEIGHT_PERCENT / 100) * height;
    const laneHeight = roadHeight / ASPHALT_LANES;

    // 1. Dibujar Banquinas (Pasto / Arena)
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 10) {
      const xP = (x / width) * 100;
      const cy = (getRoadCenterAt(xP, t) / 100) * height;
      if (x === -20) ctx.moveTo(x, cy - roadHeight / 2 - 20);
      else ctx.lineTo(x, cy - roadHeight / 2 - 20);
    }
    for (let x = width + 20; x >= -20; x -= 10) {
      const xP = (x / width) * 100;
      const cy = (getRoadCenterAt(xP, t) / 100) * height;
      ctx.lineTo(x, cy + roadHeight / 2 + 20);
    }
    ctx.fillStyle = '#fef9c3'; // Banquina clara
    ctx.fill();

    // 2. Dibujar Asfalto principal
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 10) {
      const xP = (x / width) * 100;
      const cy = (getRoadCenterAt(xP, t) / 100) * height;
      if (x === -20) ctx.moveTo(x, cy - roadHeight / 2);
      else ctx.lineTo(x, cy - roadHeight / 2);
    }
    for (let x = width + 20; x >= -20; x -= 10) {
      const xP = (x / width) * 100;
      const cy = (getRoadCenterAt(xP, t) / 100) * height;
      ctx.lineTo(x, cy + roadHeight / 2);
    }
    ctx.fillStyle = '#334155'; // Gris asfalto
    ctx.fill();

    // 3. Dibujar líneas de carriles (ANIMADAS)
    ctx.setLineDash([40, 60]);
    ctx.lineDashOffset = -t * 0.4; // Movimiento de líneas hacia la izquierda
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 4;

    for (let i = 1; i < ASPHALT_LANES; i++) {
      ctx.beginPath();
      const laneOffset = (i / ASPHALT_LANES - 0.5) * roadHeight;
      for (let x = -20; x <= width + 20; x += 20) {
        const xP = (x / width) * 100;
        const cy = (getRoadCenterAt(xP, t) / 100) * height;
        if (x === -20) ctx.moveTo(x, cy + laneOffset);
        else ctx.lineTo(x, cy + laneOffset);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 4. Líneas de borde sólidas (Amarillas)
    ctx.strokeStyle = '#f59e0b22';
    ctx.lineWidth = 6;
    [ -0.5, 0.5 ].forEach(side => {
      ctx.beginPath();
      for (let x = -20; x <= width + 20; x += 20) {
        const xP = (x / width) * 100;
        const cy = (getRoadCenterAt(xP, t) / 100) * height;
        if (x === -20) ctx.moveTo(x, cy + (side * roadHeight));
        else ctx.lineTo(x, cy + (side * roadHeight));
      }
      ctx.stroke();
    });
  };

  const animate = useCallback((t: number) => {
    if (isFinished) return;
    const deltaTime = t - (lastTimeRef.current || t);
    lastTimeRef.current = t;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawRoad(ctx, canvas.width, canvas.height, t);
    }

    // --- Lógica del Tractor ---
    const roadAtPlayer = getRoadCenterAt(PLAYER_X_PERCENT, t);
    const roadH = ROAD_HEIGHT_PERCENT;
    const laneH = roadH / ASPHALT_LANES;
    
    // Restricción del tractor a los límites del asfalto
    const minY = roadAtPlayer - roadH / 2 + laneH / 2;
    const maxY = roadAtPlayer + roadH / 2 - laneH / 2;
    const clampedTarget = Math.max(minY, Math.min(maxY, targetYRef.current));
    
    playerYRef.current += (clampedTarget - playerYRef.current) * 0.12;
    setPlayerVisualY(playerYRef.current);

    // Rotación basada en el cambio de Y
    const lastY = historyRef.current[historyRef.current.length-1]?.y || 50;
    const dy = playerYRef.current - lastY;
    setPlayerRotation(prev => prev + (Math.max(-15, Math.min(15, dy * 25)) - prev) * 0.2);
    
    historyRef.current.push({ y: playerYRef.current });
    if (historyRef.current.length > HISTORY_SIZE) historyRef.current.shift();

    // --- Lógica de Objetos ---
    const gameSpeed = (isMuddy ? 0.003 : 0.0085) * deltaTime;
    let mudNearby = false;

    objectsRef.current = objectsRef.current.map(obj => {
      if (obj.collected) return obj;
      const newX = obj.x - gameSpeed;
      
      // Posición Y sincronizada perfectamente con la carretera
      const roadAtObj = getRoadCenterAt(newX, t);
      const laneOffset = (obj.lane / ASPHALT_LANES - 0.5 + 1/(ASPHALT_LANES*2)) * roadH;
      const objY = roadAtObj + laneOffset;

      // Colisión con tractor
      const dPlayer = Math.sqrt(Math.pow(newX - PLAYER_X_PERCENT, 2) + Math.pow(objY - playerYRef.current, 2));
      
      // Colisión con mano mecánica
      const handExtension = handTarget.progress * 35;
      const handX = PLAYER_X_PERCENT + 6 + handExtension;
      const roadAtHand = getRoadCenterAt(handX, t);
      const hLaneOffset = (handTarget.lane / ASPHALT_LANES - 0.5 + 1/(ASPHALT_LANES*2)) * roadH;
      const handY = roadAtHand + hLaneOffset;
      const dHand = handTarget.active ? Math.sqrt(Math.pow(newX - handX, 2) + Math.pow(objY - handY, 2)) : 999;

      if (dPlayer < 8 || dHand < 6) {
        if (obj.type === 'MUD') {
          mudNearby = true;
          return { ...obj, x: newX };
        } else {
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
    }).filter(o => o.x > -25 && !o.collected);

    setIsMuddy(mudNearby);

    // Spawn de objetos
    if (Math.random() < 0.007 && objectsRef.current.length < 5) {
      const items = universe.items.slice(0, settings.itemCount);
      objectsRef.current.push({
        ...items[Math.floor(Math.random() * items.length)],
        id_instance: Math.random().toString(),
        lane: Math.floor(Math.random() * ASPHALT_LANES),
        x: 130,
        type: Math.random() < 0.12 ? 'MUD' : 'OBJECT',
        collected: false
      });
    }
    setObjects([...objectsRef.current]);

    requestRef.current = requestAnimationFrame(animate);
  }, [isFinished, isMuddy, handTarget, settings.itemCount, universe]);

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
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relY = ((clientY - rect.top) / rect.height) * 100;
      const relX = ((clientX - rect.left) / rect.width) * 100;
      setCursorPos({ x: relX, y: relY });
      targetYRef.current = relY;
    }
  };

  const handleAction = () => {
    if (handTarget.active || isFinished) return;
    const roadAtC = getRoadCenterAt(cursorPos.x, lastTimeRef.current);
    const t = roadAtC - (ROAD_HEIGHT_PERCENT / 2);
    const lane = Math.floor(((cursorPos.y - t) / ROAD_HEIGHT_PERCENT) * ASPHALT_LANES);
    setHandTarget({ lane: Math.max(0, Math.min(ASPHALT_LANES - 1, lane)), active: true, progress: 0 });
    
    let s: number;
    const step = (ts: number) => {
      if (!s) s = ts;
      const p = (ts - s) / 550;
      if (p < 1) {
        setHandTarget(prev => ({ ...prev, progress: Math.sin(p * Math.PI) }));
        requestAnimationFrame(step);
      } else {
        setHandTarget({ lane: 0, active: false, progress: 0 });
      }
    };
    requestAnimationFrame(step);
  };

  const trailerYs = useMemo(() => {
    return [10, 20, 30].map(d => historyRef.current[Math.max(0, historyRef.current.length - 1 - d)]?.y || 50);
  }, [playerVisualY]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 relative overflow-hidden select-none touch-none cursor-none bg-emerald-600"
      onMouseMove={(e) => handleInteraction(e.clientX, e.clientY)}
      onTouchMove={(e) => handleInteraction(e.touches[0].clientX, e.touches[0].clientY)}
      onMouseDown={handleAction}
      onTouchStart={handleAction}
    >
      {/* 1. Fondo Escénico */}
      <div className="absolute top-0 w-full h-[22%] bg-sky-400">
        <div className="absolute bottom-0 w-full h-8 bg-sky-300 opacity-30" />
      </div>
      
      {/* 2. Carretera Animada (Canvas) */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* 3. Objetos Sincronizados */}
      {objects.map(obj => {
        const roadC = getRoadCenterAt(obj.x, lastTimeRef.current);
        const lOffset = (obj.lane / ASPHALT_LANES - 0.5 + 1/(ASPHALT_LANES*2)) * ROAD_HEIGHT_PERCENT;
        const y = roadC + lOffset;
        return (
          <div key={obj.id_instance} className="absolute z-20 pointer-events-none" style={{ left: `${obj.x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
            {obj.type === 'MUD' ? (
              <div className="w-40 h-20 bg-orange-950/20 rounded-full blur-2xl animate-pulse" />
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-[7rem] filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.3)]">{obj.image}</span>
                {settings.showWords && (
                  <div className="mt-2 bg-white/90 backdrop-blur-sm px-4 py-1 rounded-full text-[10px] font-black text-slate-700 shadow-md uppercase tracking-wider">
                    {obj.name}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* 4. Tractor y Acoplados */}
      <div className="absolute z-30 pointer-events-none" style={{ left: `${PLAYER_X_PERCENT}%`, top: `${playerVisualY}%`, transform: 'translate(-50%, -50%)' }}>
        <div className="relative flex items-center">
          <div className="flex flex-row-reverse gap-4 mr-10">
            {collectedItems.slice(-3).map((item, i) => (
              <div key={i} className="w-18 h-16 bg-amber-800 rounded-3xl flex items-center justify-center shadow-xl border-b-[6px] border-amber-950" 
                style={{ transform: `translateY(${(trailerYs[i] - playerVisualY) * 0.85}px) scale(${0.85 + i*0.05})` }}>
                <span className="text-4xl filter drop-shadow-sm">{item.image}</span>
              </div>
            ))}
          </div>
          <div style={{ transform: `rotate(${playerRotation}deg) scaleX(-1)` }}>
            <span className="text-[12rem] drop-shadow-2xl block">🚜</span>
          </div>
        </div>
      </div>

      {/* 5. Brazo Mecánico con Rotación 2D */}
      {handTarget.active && (
        <div className="absolute z-40 origin-left flex items-center" style={{ 
          left: `${PLAYER_X_PERCENT + 6}%`, 
          top: `${playerVisualY}%`, 
          width: `${handTarget.progress * 480}px`,
          // Cálculo trigonométrico para apuntar al carril correcto
          transform: `translateY(-50%) rotate(${
            Math.atan2(
              (getRoadCenterAt(PLAYER_X_PERCENT + 25, lastTimeRef.current) + (handTarget.lane / ASPHALT_LANES - 0.5 + 1/(ASPHALT_LANES*2)) * ROAD_HEIGHT_PERCENT) - playerVisualY, 
              100
            ) * (180/Math.PI)
          }deg)`
        }}>
          <div className="h-10 w-full bg-slate-800 rounded-full border-2 border-white/10 shadow-2xl relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-[7rem] filter drop-shadow-lg">🖐️</div>
          </div>
        </div>
      )}

      {/* 6. Puntero Dinámico */}
      <div className="fixed pointer-events-none z-[100]" style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%`, transform: 'translate(-50%, -50%)' }}>
        <div className="w-24 h-24 border-8 border-white/10 rounded-full animate-ping flex items-center justify-center">
          <div className="w-4 h-4 bg-white/40 rounded-full" />
        </div>
      </div>

      {/* 7. HUD Superior */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-3xl px-12 py-6 rounded-[4rem] shadow-2xl flex items-center gap-12 border-b-8 border-emerald-900/10">
        <div className="flex gap-4">
          {Array.from({ length: settings.itemCount * 3 }).map((_, i) => (
            <div key={i} className={`w-8 h-8 rounded-full transition-all duration-700 border-2 ${i < collectedItems.length ? 'bg-emerald-500 border-emerald-200 scale-125 shadow-lg' : 'bg-slate-100 border-slate-200'}`} />
          ))}
        </div>
        <div className="text-7xl animate-bounce">🧺</div>
      </div>

      {isMuddy && <div className="absolute inset-0 bg-orange-950/20 backdrop-blur-[3px] z-[60] animate-pulse" />}
    </div>
  );
};

export default DriveBoard;
