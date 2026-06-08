import React, { useState, useEffect, useCallback } from 'react';

interface DraggableWrapperProps {
  children: React.ReactNode;
  storageKey: string;
  defaultPosition?: { x: number; y: number };
  className?: string;
  style?: React.CSSProperties;
}

const DraggableWrapper: React.FC<DraggableWrapperProps> = ({
  children,
  storageKey,
  defaultPosition = { x: 0, y: 0 },
  className = '',
  style = {}
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : defaultPosition;
  });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Save position to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(position));
  }, [position, storageKey]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from the drag handle
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={className}
      style={{
        ...style,
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
        zIndex: 1000
      }}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
};

export default DraggableWrapper;
