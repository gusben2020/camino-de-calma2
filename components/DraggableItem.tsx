
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DraggableItemProps {
  id: string;
  content: string;
  isText: boolean;
  onDragStart: () => void;
  onDrop: (isCorrect: boolean) => void;
  targetId: string;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ 
  id,
  content,
  isText,
  onDragStart, 
  onDrop, 
  targetId,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isReturning, setIsReturning] = useState(false);
  
  const itemRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  
  const startOffset = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });

  const handleStart = (clientX: number, clientY: number) => {
    if (isReturning) return;
    
    const rect = itemRef.current?.getBoundingClientRect();
    if (rect) {
      // Guardamos donde se hizo click dentro del objeto
      startOffset.current = {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
      initialPos.current = { x: rect.left, y: rect.top };
      setMousePos({ x: clientX, y: clientY });
      setIsPressed(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  useEffect(() => {
    if (!isPressed && !isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging) {
        const dx = clientX - mousePos.x;
        const dy = clientY - mousePos.y;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          setIsDragging(true);
          onDragStart();
        }
      }
      setMousePos({ x: clientX, y: clientY });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onEnd = () => {
      if (!isDragging) {
        setIsPressed(false);
        setIsDragging(false);
        return;
      }

      const targetElement = document.getElementById(targetId);
      const draggedElement = dragRef.current;
      const targetRect = targetElement?.getBoundingClientRect();
      const itemRect = draggedElement?.getBoundingClientRect();

      if (itemRect && targetRect) {
        const overlap = !(
          itemRect.right < targetRect.left || 
          itemRect.left > targetRect.right || 
          itemRect.bottom < targetRect.top || 
          itemRect.top > targetRect.bottom
        );

        if (overlap) {
          setIsDragging(false);
          setIsPressed(false);
          onDrop(true);
        } else {
          setIsReturning(true);
          setIsDragging(false);
          // Animamos de vuelta a la posición inicial guardada
          const returnX = initialPos.current.x + startOffset.current.x;
          const returnY = initialPos.current.y + startOffset.current.y;
          setMousePos({ x: returnX, y: returnY });
          
          setTimeout(() => {
            setIsReturning(false);
            setIsPressed(false);
            onDrop(false);
          }, 600);
        }
      } else {
        setIsDragging(false);
        setIsPressed(false);
        onDrop(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isPressed, isDragging, targetId, onDrop, onDragStart, mousePos]);

  // El elemento que se renderiza en el portal cuando se arrastra
  const draggedItemContent = (isDragging || isReturning) && createPortal(
    <div
      ref={dragRef}
      className="fixed pointer-events-none z-[9999] flex items-center justify-center"
      style={{
        left: mousePos.x - startOffset.current.x,
        top: mousePos.y - startOffset.current.y,
        width: isText ? 'auto' : '64px',
        height: isText ? 'auto' : '64px',
        transition: isReturning ? 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        transform: isDragging ? 'scale(1.2) rotate(-2deg)' : 'scale(1)',
      }}
    >
      <span className={`
        filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.2)]
        ${isText ? 'text-2xl font-black text-slate-800 tracking-wider whitespace-nowrap px-4 py-2 bg-white/10 rounded-xl' : 'text-6xl'}
      `}>
        {content}
      </span>
    </div>,
    document.body
  );

  return (
    <>
      <div
        ref={itemRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`
          flex items-center justify-center bg-transparent cursor-grab active:cursor-grabbing hover:scale-110 transition-transform
          ${isDragging ? 'opacity-0' : 'opacity-100'}
          ${isText ? 'px-2' : 'w-16 h-16'}
        `}
      >
        <span className={`
          unselectable pointer-events-none select-none
          filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)]
          ${isText ? 'text-2xl font-black text-slate-800 tracking-wider whitespace-nowrap' : 'text-5xl'}
        `}>
          {content}
        </span>
      </div>
      {draggedItemContent}
    </>
  );
};

export default DraggableItem;
