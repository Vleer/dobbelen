import React, { useCallback, useEffect, useRef, useState } from 'react';

interface DraggableGameInfoProps {
  roundLabel: string;
  currentTurnLabel?: string;
  bidLabel: string;
  activePlayersLabel: string;
}

const DEFAULT_TOP_PERCENT = 42;

const DraggableGameInfo: React.FC<DraggableGameInfoProps> = ({
  roundLabel,
  currentTurnLabel,
  bidLabel,
  activePlayersLabel,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const clampToViewport = useCallback((left: number, top: number) => {
    const el = panelRef.current;
    const width = el?.offsetWidth ?? 200;
    const height = el?.offsetHeight ?? 100;
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);
    return {
      left: Math.min(Math.max(8, left), maxLeft),
      top: Math.min(Math.max(8, top), maxTop),
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button / touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const el = panelRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    // Lock to pixel coords immediately (drop % + translate centering)
    const origin = { left: rect.left, top: rect.top };
    setPosition(origin);
    dragOffsetRef.current = {
      x: e.clientX - origin.left,
      y: e.clientY - origin.top,
    };
    draggingRef.current = true;
    setDragging(true);

    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // ignore — window listeners below still handle the drag
    }
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      setPosition(
        clampToViewport(
          e.clientX - dragOffsetRef.current.x,
          e.clientY - dragOffsetRef.current.y
        )
      );
    };

    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [clampToViewport]);

  useEffect(() => {
    if (!position) return;
    const onResize = () =>
      setPosition((prev) => (prev ? clampToViewport(prev.left, prev.top) : prev));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [position, clampToViewport]);

  return (
    <div
      ref={panelRef}
      onPointerDown={onPointerDown}
      className={`fixed z-[1] rounded-2xl border shadow-xl backdrop-blur-sm px-6 py-4 text-center select-none touch-none ${
        dragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        backgroundColor: 'var(--game-surface)',
        borderColor: 'var(--game-border)',
        ...(position
          ? { left: position.left, top: position.top, transform: 'none' }
          : {
              left: '50%',
              top: `${DEFAULT_TOP_PERCENT}%`,
              transform: 'translate(-50%, -50%)',
            }),
      }}
      title="Drag to move"
    >
      <div
        className="pointer-events-none text-xs uppercase tracking-wide font-semibold mb-1"
        style={{ color: 'var(--game-accent-text)' }}
      >
        {roundLabel}
      </div>
      {currentTurnLabel && (
        <div
          className="pointer-events-none text-[10px] uppercase tracking-wider mb-2"
          style={{ color: 'var(--game-text-muted)' }}
        >
          {currentTurnLabel}
        </div>
      )}
      <div
        className="pointer-events-none text-base font-semibold"
        style={{ color: 'var(--game-text)' }}
      >
        {bidLabel}
      </div>
      <div
        className="pointer-events-none text-[10px] mt-2"
        style={{ color: 'var(--game-text-muted)' }}
      >
        {activePlayersLabel}
      </div>
    </div>
  );
};

export default DraggableGameInfo;
