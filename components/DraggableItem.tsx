
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DraggableItemProps {
  id: string;
  content: string;
  isText: boolean;
  onDragStart: () => void;
  onDrop: (isCorrect: boolean) => void;
  targetId: string;
  children?: React.ReactNode; 
}

const DraggableItem: React.FC<DraggableItemProps> = ({ 
  id,
  content,
  isText,
  onDragStart, 
  onDrop, 
  targetId,
  children
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isReturning, setIsReturning] = useState(false);
  const [draggedSize, setDraggedSize] = useState({ width: 0, height: 0 });
  
  const itemRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  
  const startOffset = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });

  const handleStart = (clientX: number, clientY: number) => {
    if (isReturning || !itemRef.current) return;
    
    const rect = itemRef.current.getBoundingClientRect();
    startOffset.current = {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
    initialPos.current = { x: rect.left, y: rect.top };
    setDraggedSize({ width: rect.width, height: rect.height });
    setMousePos({ x: clientX, y: clientY });
    setIsPressed(true);
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
      
      let droppedCorrectly = false;

      if (targetElement && draggedElement) {
        const targetRect = targetElement.getBoundingClientRect();
        const itemRect = draggedElement.getBoundingClientRect();

        // Calcular área de intersección
        const intersectionX = Math.max(0, Math.min(itemRect.right, targetRect.right) - Math.max(itemRect.left, targetRect.left));
        const intersectionY = Math.max(0, Math.min(itemRect.bottom, targetRect.bottom) - Math.max(itemRect.top, targetRect.top));
        const intersectionArea = intersectionX * intersectionY;
        const itemArea = itemRect.width * itemRect.height;

        // Tolerancia: Al menos el 50% de la pieza debe estar dentro del objetivo
        if (itemArea > 0 && (intersectionArea / itemArea) > 0.5) {
          droppedCorrectly = true;
        }
      }

      if (droppedCorrectly) {
        setIsDragging(false);
        setIsPressed(false);
        onDrop(true);
      } else {
        setIsReturning(true);
        setIsDragging(false);
        const returnX = initialPos.current.x + startOffset.current.x;
        const returnY = initialPos.current.y + startOffset.current.y;
        setMousePos({ x: returnX, y: returnY });
        
        setTimeout(() => {
          setIsReturning(false);
          setIsPressed(false);
          onDrop(false);
        }, 600);
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

  const draggedItemContent = (isDragging || isReturning) && createPortal(
    <div
      ref={dragRef}
      className={`fixed pointer-events-none z-[9999] flex items-center justify-center ${isDragging ? 'drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]' : ''}`}
      style={{
        left: mousePos.x - startOffset.current.x,
        top: mousePos.y - startOffset.current.y,
        width: isText ? 'auto' : `${draggedSize.width}px`,
        height: isText ? 'auto' : `${draggedSize.height}px`,
        transition: isReturning ? 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        transform: 'scale(1)', // MANTENER ESCALA 1:1
        backgroundColor: 'transparent',
      }}
    >
      {children ? children : (
        <span className={`
          filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.2)]
          ${isText ? 'text-2xl font-black text-slate-800 tracking-wider whitespace-nowrap px-4 py-2 bg-white/10 rounded-xl' : 'text-6xl'}
        `}>
          {content}
        </span>
      )}
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
          flex items-center justify-center bg-transparent cursor-grab active:cursor-grabbing hover:scale-100 transition-transform h-full w-full
          ${isDragging ? 'opacity-0' : 'opacity-100'}
        `}
      >
        {children ? children : (
            <span className={`
            unselectable pointer-events-none select-none
            filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)]
            ${isText ? 'text-2xl font-black text-slate-800 tracking-wider whitespace-nowrap' : 'text-5xl'}
            `}>
            {content}
            </span>
        )}
      </div>
      {draggedItemContent}
    </>
  );
};

export default DraggableItem;
