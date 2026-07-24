import React, { useCallback, useEffect, useRef, useState } from 'react';

interface DraggableGameInfoProps {
  roundLabel: string;
  currentTurnLabel?: string;
  bidLabel: string;
  activePlayersLabel: string;
}

const DEFAULT_TOP_PERCENT = 58;

const DraggableGameInfo: React.FC<DraggableGameInfoProps> = ({
  roundLabel,
  currentTurnLabel,
  bidLabel,
  activePlayersLabel,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const clampToViewport = useCallback((left: number, top: number) => {
    const el = panelRef.current;
    const width = el?.offsetWidth ?? 0;
    const height = el?.offsetHeight ?? 0;
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);
    return {
      left: Math.min(Math.max(8, left), maxLeft),
      top: Math.min(Math.max(8, top), maxTop),
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = panelRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const next = position ?? { left: rect.left, top: rect.top };
    setPosition(next);
    dragOffset.current = { x: e.clientX - next.left, y: e.clientY - next.top };
    draggingRef.current = true;
    setDragging(true);
    el.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !dragOffset.current) return;
    setPosition(
      clampToViewport(e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y)
    );
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    dragOffset.current = null;
    draggingRef.current = false;
    setDragging(false);
    if (panelRef.current?.hasPointerCapture(e.pointerId)) {
      panelRef.current.releasePointerCapture(e.pointerId);
    }
  };

  useEffect(() => {
    if (!position) return;
    const onResize = () => setPosition((prev) => (prev ? clampToViewport(prev.left, prev.top) : prev));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [position, clampToViewport]);

  return (
    <div
      ref={panelRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`fixed z-30 rounded-2xl border border-[#365844] bg-[#0f2a1b]/90 px-6 py-4 text-center shadow-xl backdrop-blur-sm select-none touch-none ${
        dragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={
        position
          ? { left: position.left, top: position.top }
          : { left: '50%', top: `${DEFAULT_TOP_PERCENT}%`, transform: 'translateX(-50%)' }
      }
      title="Drag to move"
    >
      <div className="text-xs uppercase tracking-wide font-semibold text-[#d9b45a] mb-1">
        {roundLabel}
      </div>
      {currentTurnLabel && (
        <div className="text-[10px] uppercase tracking-wider text-[#b9cbbf] mb-2">
          {currentTurnLabel}
        </div>
      )}
      <div className="text-base text-[#f7f3e8] font-semibold">{bidLabel}</div>
      <div className="text-[10px] text-[#b9cbbf] mt-2">{activePlayersLabel}</div>
    </div>
  );
};

export default DraggableGameInfo;
