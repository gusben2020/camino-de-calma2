
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GameSettings, GameItem, Position, WordLevel, WordPart } from '../types';
import { UNIVERSES } from '../constants';
import DraggableItem from './DraggableItem';

interface GameBoardProps {
  settings: GameSettings;
  onComplete: () => void;
  isFinished: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({ settings, onComplete, isFinished }) => {
  const universe = UNIVERSES[settings.universe];
  const activeItems = useMemo(() => universe.items.slice(0, settings.itemCount), [universe, settings.itemCount]);
  
  const wordParts = useMemo(() => {
    if (!settings.wordsAsObjects) return [];
    const parts: WordPart[] = [];
    activeItems.forEach(item => {
      let segments: string[] = [];
      if (settings.wordLevel === WordLevel.COMPLETA) segments = [item.name];
      else if (settings.wordLevel === WordLevel.SEGMENTADA) segments = splitIntoSyllables(item.name);
      else segments = item.name.split('');

      segments.forEach((text, index) => {
        parts.push({
          id: `word-${item.id}-${index}`,
          parentId: item.id,
          text,
          index
        });
      });
    });
    return parts;
  }, [activeItems, settings.wordsAsObjects, settings.wordLevel]);

  const totalRequired = useMemo(() => 
    activeItems.length + (settings.wordsAsObjects ? wordParts.length : 0), 
  [activeItems, wordParts, settings.wordsAsObjects]);

  const [placedIds, setPlacedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPlacedIds(new Set());
    setActiveId(null);
  }, [settings.universe, settings.itemCount, settings.showWords, settings.wordsAsObjects, settings.wordLevel]);

  const speak = (text: string) => {
    if (!settings.voiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.toLowerCase());
    utterance.lang = 'es-ES';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const handleDrop = useCallback((id: string, isCorrect: boolean) => {
    if (isCorrect) {
      setPlacedIds(prev => {
        const next = new Set(prev);
        next.add(id);
        
        const isWordPart = id.startsWith('word-');
        const parentId = isWordPart ? id.split('-')[1] : id;
        const item = activeItems.find(i => i.id === parentId);

        if (item) {
          if (!isWordPart) {
            speak(item.name);
          } else {
            const relevantParts = wordParts.filter(p => p.parentId === parentId).sort((a, b) => a.index - b.index);
            const allPartsPlaced = relevantParts.every(p => next.has(p.id));
            
            if (allPartsPlaced) {
              speak(item.name);
            } else if (settings.partialVoiceEnabled) {
              let accumulated = "";
              for (const p of relevantParts) {
                if (next.has(p.id)) accumulated += p.text;
                else break;
              }
              if (accumulated.length > 0) speak(accumulated);
            }
          }
        }

        if (next.size >= totalRequired) {
          setTimeout(onComplete, 1500);
        }
        return next;
      });
    }
    setActiveId(null);
  }, [activeItems, totalRequired, onComplete, settings.voiceEnabled, settings.partialVoiceEnabled, wordParts]);

  const handleDragStart = (id: string) => setActiveId(id);

  const getLayout = useMemo(() => {
    const cols = settings.itemCount <= 2 ? 1 : settings.itemCount <= 6 ? 2 : 3;
    const itemWidth = 100 / cols;
    const rows = Math.ceil(settings.itemCount / cols);
    const itemHeight = 100 / rows;
    
    return activeItems.map((_, i) => ({
      x: (i % cols) * itemWidth,
      y: Math.floor(i / cols) * itemHeight,
      width: itemWidth,
      height: itemHeight
    }));
  }, [activeItems, settings.itemCount]);

  return (
    <div ref={containerRef} className="flex flex-col md:flex-row h-full w-full select-none overflow-hidden touch-none">
      {/* Tablero Principal - 75% en desktop, flexible en mobile */}
      <div 
        className="flex-[3] relative overflow-hidden transition-colors duration-1000 min-h-[60%]" 
        style={{ backgroundColor: universe.backgroundColor }}
      >
        <div 
          className="absolute inset-0 opacity-10 bg-center bg-cover pointer-events-none grayscale mix-blend-multiply" 
          style={{ backgroundImage: `url(${universe.illustration})` }}
        />
        
        {activeItems.map((item, idx) => {
          const layout = getLayout[idx];
          const isImagePlaced = placedIds.has(item.id);
          const parts = wordParts.filter(p => p.parentId === item.id);
          
          let scale = 1;
          if (settings.itemCount > 8) scale = 0.55;
          else if (settings.itemCount > 4) scale = 0.75;
          else if (settings.wordsAsObjects && settings.wordLevel === WordLevel.LETRA_POR_LETRA) scale = 0.8;

          return (
            <div 
              key={`group-${item.id}`}
              className="absolute flex flex-col items-center justify-center transition-all duration-500"
              style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
                width: `${layout.width}%`,
                height: `${layout.height}%`,
                transform: `scale(${scale})`,
              }}
            >
              <div 
                id={`mold-${item.id}`}
                className={`relative ${settings.wordsAsObjects ? 'w-20 h-20 sm:w-28 sm:h-28' : 'w-24 h-24 sm:w-36 sm:h-36'} flex items-center justify-center`}
              >
                <span 
                  className={`text-6xl sm:text-8xl transition-all duration-500 pointer-events-none select-none filter contrast-200 brightness-0 ${
                    isImagePlaced ? 'opacity-0 scale-50' : 'opacity-20 grayscale'
                  } ${activeId === item.id ? 'opacity-40 scale-110' : ''}`}
                >
                  {item.image}
                </span>
                
                {isImagePlaced && (
                  <span className="absolute text-6xl sm:text-8xl animate-in zoom-in-75 duration-700 filter drop-shadow-[0_5px_5px_rgba(0,0,0,0.1)]">
                    {item.image}
                  </span>
                )}

                {!isImagePlaced && settings.showMolds && (
                   <div className={`absolute inset-0 rounded-full border-4 border-dashed transition-opacity duration-300 ${
                     activeId === item.id ? 'border-blue-400 opacity-100 animate-pulse' : 'border-black/5 opacity-10'
                   }`} />
                )}
              </div>

              <div className="mt-2 flex flex-wrap justify-center gap-1 sm:gap-2 max-w-[95%] px-2">
                {!settings.wordsAsObjects ? (
                  settings.showWords && (
                    <div className={`px-3 py-1 rounded-xl transition-all duration-700 ${
                      isImagePlaced ? 'bg-white shadow-sm text-slate-800 font-black border border-green-100' : 'bg-black/5 text-transparent'
                    }`}>
                      <span className="text-sm sm:text-xl uppercase tracking-widest">
                        {getFormattedWord(item.name, settings.wordLevel)}
                      </span>
                    </div>
                  )
                ) : (
                  parts.map((part) => {
                    const isPartPlaced = placedIds.has(part.id);
                    return (
                      <div
                        key={`mold-${part.id}`}
                        id={`mold-${part.id}`}
                        className={`min-w-[2.5rem] sm:min-w-[3.2rem] h-8 sm:h-10 px-2 rounded-xl border-2 border-dashed flex items-center justify-center transition-all duration-300 ${
                          activeId === part.id ? 'border-blue-400 bg-blue-50/50 scale-110' : 'border-black/5 bg-black/5'
                        } ${isPartPlaced ? 'border-green-300 bg-white/90 shadow-sm' : ''}`}
                      >
                        <span className={`text-sm sm:text-xl font-black transition-all duration-500 tracking-wider ${
                          isPartPlaced ? 'text-slate-800' : 'text-black/5'
                        }`}>
                          {part.text}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Caja de Inventario - Lateral en Desktop, Horizontal scroll en Mobile */}
      <div className="flex-1 bg-slate-50 border-t-2 md:border-t-0 md:border-l-2 border-slate-200 shadow-xl flex flex-col p-2 md:p-4 overflow-y-hidden overflow-x-auto md:overflow-y-auto md:overflow-x-hidden z-10 scrollbar-hide">
        <h4 className="hidden md:block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center mb-6 mt-2">Piezas</h4>
        
        <div className="flex flex-row md:flex-col gap-2 md:gap-3 w-max md:w-full min-h-[100px]">
          {activeItems.map((item) => {
            const isImagePlaced = placedIds.has(item.id);
            const itemParts = wordParts.filter(p => p.parentId === item.id && !placedIds.has(p.id));
            
            if (isImagePlaced && itemParts.length === 0) return null;

            return (
              <div key={`inv-row-${item.id}`} className="flex flex-col gap-2 p-2 md:p-3 rounded-2xl md:rounded-3xl bg-white border border-slate-100 shadow-sm transition-all shrink-0">
                <div className="flex items-center gap-2 md:gap-3">
                  {!isImagePlaced && (
                    <div className="w-12 h-12 md:w-14 md:h-14 flex-shrink-0 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100">
                      <DraggableItem
                        id={item.id}
                        content={item.image}
                        isText={false}
                        onDragStart={() => handleDragStart(item.id)}
                        onDrop={(isCorrect) => handleDrop(item.id, isCorrect)}
                        targetId={`mold-${item.id}`}
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1 flex-1 items-center justify-start max-w-[150px] md:max-w-none">
                    {settings.wordsAsObjects && itemParts.map(part => (
                      <div key={`inv-part-${part.id}`} className="h-8 md:h-10 flex items-center bg-slate-50 px-1 rounded-lg border border-slate-100">
                        <DraggableItem
                          id={part.id}
                          content={part.text}
                          isText={true}
                          onDragStart={() => handleDragStart(part.id)}
                          onDrop={(isCorrect) => handleDrop(part.id, isCorrect)}
                          targetId={`mold-${part.id}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {placedIds.size === totalRequired && (
          <div className="flex md:flex-col items-center justify-center flex-1 opacity-40 px-4">
            <span className="text-3xl md:text-5xl md:mb-3 animate-bounce">✨</span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 md:ml-0">Listo</p>
          </div>
        )}
      </div>
    </div>
  );
};

function splitIntoSyllables(word: string): string[] {
  if (word.length <= 3) return [word];
  const syllables: string[] = [];
  const vowels = 'AEIOUÁÉÍÓÚ';
  let current = '';
  for (let i = 0; i < word.length; i++) {
    current += word[i];
    if (vowels.includes(word[i])) {
      if (i + 1 < word.length && !vowels.includes(word[i+1])) {
         if (i + 2 < word.length && !vowels.includes(word[i+2])) {
         } else {
            syllables.push(current);
            current = '';
         }
      }
    }
  }
  if (current) syllables.push(current);
  return syllables.length > 1 ? syllables : [word.slice(0, Math.ceil(word.length/2)), word.slice(Math.ceil(word.length/2))];
}

function getFormattedWord(word: string, level: WordLevel): string {
  if (level === WordLevel.SEGMENTADA) return splitIntoSyllables(word).join(' - ');
  if (level === WordLevel.LETRA_POR_LETRA) return word.split('').join(' - ');
  return word;
}

export default GameBoard;
