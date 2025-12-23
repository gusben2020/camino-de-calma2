
import React, { useState, useMemo, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { GameSettings, WordLevel } from '../types';
import { UNIVERSES } from '../constants';
import DraggableItem from './DraggableItem';

interface PuzzleBoardProps {
  settings: GameSettings;
  onComplete: () => void;
  isFinished: boolean;
}

type EdgeShape = 'TAB' | 'SLOT' | 'FLAT';

interface PieceDefinition {
  id: string;
  row: number;
  col: number;
  top: EdgeShape;
  right: EdgeShape;
  bottom: EdgeShape;
  left: EdgeShape;
}

const PuzzleBoard: React.FC<PuzzleBoardProps> = ({ settings, onComplete, isFinished }) => {
  const universe = UNIVERSES[settings.universe];
  
  // CONFIGURACIÓN: El modo Puzzle ahora es de "Partida Única".
  // Se selecciona solo 1 item al azar para resolver.
  // Al terminar este único item, se llamará a onComplete() para mostrar el menú de victoria.
  const [itemsToSolve] = useState(() => {
    const shuffled = [...universe.items].sort(() => Math.random() - 0.5);
    return [shuffled[0]]; // Siempre 1 solo item
  });

  const currentIndex = 0; // Siempre es el primer y único item
  const [placedPieceIds, setPlacedPieceIds] = useState<Set<string>>(new Set());
  
  const [exactPieceSize, setExactPieceSize] = useState({ width: 0, height: 0 });
  const firstMoldRef = useRef<HTMLDivElement>(null);
  
  const levelCompletedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);
  
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playSound = useCallback((type: 'POP' | 'ERROR' | 'LEVEL_WIN') => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'POP') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'ERROR') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'LEVEL_WIN') {
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.2, now + 0.1 + (i*0.05));
            g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            o.connect(g);
            g.connect(ctx.destination);
            o.start(now + (i*0.05));
            o.stop(now + 1.5);
        });
    }

    osc.connect(gain);
    gain.connect(ctx.destination);

  }, [initAudio]);

  const gridSide = useMemo(() => {
    if (settings.wordLevel === WordLevel.COMPLETA) return 2;
    if (settings.wordLevel === WordLevel.SEGMENTADA) return 3;
    return 4;
  }, [settings.wordLevel]);
  
  const currentItem = itemsToSolve[0];

  const pieces = useMemo(() => {
    const hEdges: ('IN' | 'OUT')[][] = Array(gridSide + 1).fill(0).map(() => 
      Array(gridSide).fill(0).map(() => Math.random() > 0.5 ? 'OUT' : 'IN')
    );
    const vEdges: ('IN' | 'OUT')[][] = Array(gridSide).fill(0).map(() => 
      Array(gridSide + 1).fill(0).map(() => Math.random() > 0.5 ? 'OUT' : 'IN')
    );

    const p: PieceDefinition[] = [];
    for (let r = 0; r < gridSide; r++) {
      for (let c = 0; c < gridSide; c++) {
        p.push({
          id: `piece-${currentItem.id}-${r}-${c}`,
          row: r,
          col: c,
          top: r === 0 ? 'FLAT' : (hEdges[r][c] === 'OUT' ? 'SLOT' : 'TAB'),
          bottom: r === gridSide - 1 ? 'FLAT' : (hEdges[r + 1][c] === 'OUT' ? 'TAB' : 'SLOT'),
          left: c === 0 ? 'FLAT' : (vEdges[r][c] === 'OUT' ? 'SLOT' : 'TAB'),
          right: c === gridSide - 1 ? 'FLAT' : (vEdges[r][c + 1] === 'OUT' ? 'TAB' : 'SLOT'),
        });
      }
    }
    return p;
  }, [gridSide, currentItem.id]);

  const shuffledPieces = useMemo(() => {
    return [...pieces].sort(() => Math.random() - 0.5);
  }, [pieces]);

  const speak = useCallback((text: string) => {
    if (!settings.voiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.toLowerCase());
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, [settings.voiceEnabled]);

  const isLevelComplete = useMemo(() => {
     return pieces.length > 0 && pieces.every(p => placedPieceIds.has(p.id));
  }, [pieces, placedPieceIds]);

  // EFFECT PRINCIPAL: Manejo de victoria
  useEffect(() => {
    if (isFinished) return;

    if (isLevelComplete) {
      if (levelCompletedRef.current) return;
      levelCompletedRef.current = true;

      playSound('LEVEL_WIN');
      speak(currentItem.name);

      // Esperar la celebración y terminar el juego inmediatamente.
      // Ya no hay transición a un "siguiente" puzzle.
      setTimeout(() => {
        if (!isMountedRef.current) return;
        onComplete();
      }, 2500);
    }
  }, [isLevelComplete, isFinished, onComplete, playSound, speak, currentItem.name]);
  
  const handleDrop = useCallback((pieceId: string, isCorrect: boolean) => {
    initAudio(); 
    if (isCorrect && !placedPieceIds.has(pieceId)) {
      if (placedPieceIds.size + 1 < pieces.length) {
          playSound('POP');
      }
      setPlacedPieceIds(prev => new Set(prev).add(pieceId));
    } else if (!isCorrect) {
      playSound('ERROR');
    }
  }, [playSound, pieces.length, placedPieceIds, initAudio]);

  useLayoutEffect(() => {
    if (!firstMoldRef.current) return;
    const measure = () => {
      if (firstMoldRef.current) {
        const rect = firstMoldRef.current.getBoundingClientRect();
        setExactPieceSize(prev => {
            if (Math.abs(prev.width - rect.width) > 1 || Math.abs(prev.height - rect.height) > 1) {
                return { width: rect.width, height: rect.height };
            }
            return prev;
        });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(firstMoldRef.current);
    window.addEventListener('resize', measure);
    return () => {
        observer.disconnect();
        window.removeEventListener('resize', measure);
    };
  }, [gridSide]);

  const emojiSvgUrl = useMemo(() => {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="60" font-size="95" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif">${currentItem.image}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
  }, [currentItem.image]);

  const DEPTH = 15; 
  const VIEWBOX_SIZE = 100 + DEPTH * 2;
  
  const renderPieceVisual = (p: PieceDefinition, isMold: boolean) => {
    const isPlaced = placedPieceIds.has(p.id);
    const pathData = getPathData(p, DEPTH, VIEWBOX_SIZE);
    const imgX = DEPTH - (p.col * 100);
    const imgY = DEPTH - (p.row * 100);
    const imgSize = gridSide * 100;
    const clipId = `clip-${p.id}-${isMold ? 'mold' : 'piece'}`;

    return (
      <div 
        className="absolute transition-all duration-300 pointer-events-none"
        style={{ width: `${100 + DEPTH * 2}%`, height: `${100 + DEPTH * 2}%`, left: `${-DEPTH}%`, top: `${-DEPTH}%`, zIndex: isPlaced ? 50 : isMold ? 0 : 100, filter: !isMold ? 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))' : 'none' }}
      >
        <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} className="w-full h-full overflow-visible">
          <defs><clipPath id={clipId}><path d={pathData} /></clipPath></defs>
          <path d={pathData} fill={isMold ? (isPlaced ? 'white' : 'rgba(0,0,0,0.14)') : 'white'} stroke="none" />
          <image href={emojiSvgUrl} x={imgX} y={imgY} width={imgSize} height={imgSize} clipPath={`url(#${clipId})`} opacity={isMold ? (isPlaced ? 1 : 1) : 1} style={{ filter: isMold && !isPlaced ? 'grayscale(1) brightness(1.2)' : 'none', transition: 'opacity 0.5s' }} preserveAspectRatio="none" />
          {!isFinished && (<path d={pathData} fill="none" stroke={isMold ? (isPlaced ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.25)') : 'rgba(0,0,0,0.15)'} strokeWidth={isMold && !isPlaced ? "2" : "3"} strokeLinejoin="round" />)}
        </svg>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full select-none touch-none overflow-hidden bg-slate-50 relative" onMouseDown={initAudio} onTouchStart={initAudio}>
      <div className="flex-[3] relative flex items-center justify-center p-4" style={{ backgroundColor: universe.backgroundColor }}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-center bg-contain bg-no-repeat" style={{ backgroundImage: `url(${universe.illustration})` }} />
        <div className="relative">
          {isLevelComplete && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
               <div className="text-9xl animate-ping opacity-60">✨</div>
               <div className="absolute -top-10 left-0 right-0 text-center text-4xl animate-bounce">🎉</div>
            </div>
          )}
          <div className="bg-white rounded-[4rem] shadow-[0_100px_150px_-40px_rgba(0,0,0,0.2)] border-[16px] border-white flex items-center justify-center relative overflow-visible" style={{ width: 'min(82vh, 92vw)', height: 'min(82vh, 92vw)' }}>
            <div className="grid w-full h-full bg-slate-100/30 rounded-[3rem]" style={{ gridTemplateColumns: `repeat(${gridSide}, 1fr)`, gridTemplateRows: `repeat(${gridSide}, 1fr)` }}>
              {pieces.map((p, idx) => (
                <div key={p.id} ref={idx === 0 ? firstMoldRef : null} id={`mold-${p.id}`} className="relative" style={{ gridColumn: p.col + 1, gridRow: p.row + 1, zIndex: placedPieceIds.has(p.id) ? 10 : 1 }}>
                  {renderPieceVisual(p, true)}
                </div>
              ))}
            </div>
          </div>
          {settings.showWords && (
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-full text-center">
              <div className="inline-block bg-white px-16 py-4 rounded-full text-5xl font-black text-slate-800 shadow-2xl uppercase tracking-[0.4em] border-b-[8px] border-slate-200">{currentItem.name}</div>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 bg-white border-l-4 border-slate-100 p-8 flex flex-col items-center overflow-y-auto z-20 shadow-2xl min-w-[300px]">
        <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.6em] mb-12">Inventario</h4>
        <div className="flex flex-wrap md:flex-col gap-6 justify-center items-center w-full pb-40">
          {shuffledPieces.map(p => {
            if (placedPieceIds.has(p.id)) return null;
            return (
              <div key={`inv-${p.id}`} id={`inv-container-${p.id}`} className="relative transition-all cursor-grab active:cursor-grabbing hover:brightness-110" style={{ width: exactPieceSize.width > 0 ? exactPieceSize.width : undefined, height: exactPieceSize.height > 0 ? exactPieceSize.height : undefined }}>
                <DraggableItem id={p.id} content={''} isText={false} onDragStart={initAudio} onDrop={correct => handleDrop(p.id, correct)} targetId={`mold-${p.id}`}>
                  <div className="w-full h-full relative">{renderPieceVisual(p, false)}</div>
                </DraggableItem>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function getPathData(p: PieceDefinition, d: number, size: number): string {
  const bMin = d; const bMax = 100 + d;
  const c1 = d + 33; const c2 = d + 40; const cMid = d + 50; const c3 = d + 60; const c4 = d + 67;
  let path = `M ${bMin},${bMin} `;
  if (p.top === 'FLAT') path += `L ${bMax},${bMin} `; else { const s = p.top === 'TAB' ? -d : d; path += `L ${c1},${bMin} C ${c1},${bMin + s} ${c2},${bMin + s * 1.6} ${cMid},${bMin + s * 1.6} C ${c3},${bMin + s * 1.6} ${c4},${bMin + s} ${c4},${bMin} L ${bMax},${bMin} `; }
  if (p.right === 'FLAT') path += `L ${bMax},${bMax} `; else { const s = p.right === 'TAB' ? d : -d; path += `L ${bMax},${c1} C ${bMax + s},${c1} ${bMax + s * 1.6},${c2} ${bMax + s * 1.6},${cMid} C ${bMax + s * 1.6},${c3} ${bMax + s},${c4} ${bMax},${c4} L ${bMax},${bMax} `; }
  if (p.bottom === 'FLAT') path += `L ${bMin},${bMax} `; else { const s = p.bottom === 'TAB' ? d : -d; path += `L ${c4},${bMax} C ${c4},${bMax + s} ${c3},${bMax + s * 1.6} ${cMid},${bMax + s * 1.6} C ${c2},${bMax + s * 1.6} ${c1},${bMin + s} ${c1},${bMax} L ${bMin},${bMax} `; }
  if (p.left === 'FLAT') path += `Z`; else { const s = p.left === 'TAB' ? -d : d; path += `L ${bMin},${c4} C ${bMin + s},${c4} ${bMin + s * 1.6},${c3} ${bMin + s * 1.6},${cMid} C ${bMin + s * 1.6},${c2} ${bMin + s},${c1} ${bMin},${c1} Z`; }
  return path;
}

export default PuzzleBoard;
