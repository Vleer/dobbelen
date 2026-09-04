import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Dock position anchored from the bottom so height changes keep the hand fixed. */
export type DockDragPos = { left: number; bottom: number };

interface DesktopPlayerDockProps {
  /** Bid selector controls */
  children?: React.ReactNode;
  /** Local player card */
  playerSlot: React.ReactNode;
  /** Controlled drag position (survives remount / bid-selector mount changes) */
  dragPosition?: DockDragPos | null;
  onDragPositionChange?: (pos: DockDragPos) => void;
}

const MAX_VIEWPORT_FRACTION = 0.8;

/**
 * Desktop-only: stacks bid selector + local player, moves them together when dragged,
 * and scales the stack to stay within 80% of the viewport.
 * Always bottom-anchored so when the bid panel shrinks/grows, the hand stays put
 * and the bid UI collapses/expands toward it.
 */
const DesktopPlayerDock: React.FC<DesktopPlayerDockProps> = ({
  children,
  playerSlot,
  dragPosition = null,
  onDragPositionChange,
}) => {
  const dockRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, bottom: 0 });
  const draggingRef = useRef(false);
  const [internalPosition, setInternalPosition] = useState<DockDragPos | null>(null);
  const [dragging, setDragging] = useState(false);
  const [scale, setScale] = useState(1);

  const isControlled = typeof onDragPositionChange === 'function';
  const position = isControlled ? dragPosition : internalPosition;

  const setPosition = useCallback(
    (next: DockDragPos | ((prev: DockDragPos | null) => DockDragPos | null)) => {
      const resolved =
        typeof next === 'function'
          ? next(isControlled ? dragPosition ?? null : internalPosition)
          : next;
      if (!resolved) return;
      if (isControlled) {
        onDragPositionChange!(resolved);
      } else {
        setInternalPosition(resolved);
      }
    },
    [isControlled, dragPosition, internalPosition, onDragPositionChange]
  );

  const updateScale = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    if (width <= 0 || height <= 0) return;
    const maxW = window.innerWidth * MAX_VIEWPORT_FRACTION;
    const maxH = window.innerHeight * MAX_VIEWPORT_FRACTION;
    const next = Math.min(1, maxW / width, maxH / height);
    const clamped = Number.isFinite(next) && next > 0 ? next : 1;
    setScale((prev) => (Math.abs(prev - clamped) < 0.001 ? prev : clamped));
  }, []);

  useLayoutEffect(() => {
    updateScale();
  }, [updateScale, children, playerSlot]);

  useEffect(() => {
    const onResize = () => updateScale();
    window.addEventListener('resize', onResize);
    const el = contentRef.current;
    let ro: ResizeObserver | undefined;
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateScale());
      ro.observe(el);
    }
    return () => {
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [updateScale]);

  const clampToViewport = useCallback((left: number, bottom: number) => {
    const el = dockRef.current;
    const width = el?.getBoundingClientRect().width ?? 420;
    const height = el?.getBoundingClientRect().height ?? 200;
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxBottom = Math.max(8, window.innerHeight - height - 8);
    return {
      left: Math.min(Math.max(8, left), maxLeft),
      bottom: Math.min(Math.max(8, bottom), maxBottom),
    };
  }, []);

  const onDockPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (e.target instanceof Element && e.target.closest('button, a, input, [role="button"]')) {
      return;
    }
    const el = dockRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const origin = {
      left: rect.left,
      bottom: window.innerHeight - rect.bottom,
    };
    setPosition(origin);
    dragOffsetRef.current = {
      x: e.clientX - origin.left,
      bottom: window.innerHeight - e.clientY - origin.bottom,
    };
    draggingRef.current = true;
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // window listeners still handle the drag
    }
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      setPosition(
        clampToViewport(
          e.clientX - dragOffsetRef.current.x,
          window.innerHeight - e.clientY - dragOffsetRef.current.bottom
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
  }, [clampToViewport, setPosition]);

  useEffect(() => {
    if (!position) return;
    const onResize = () =>
      setPosition((prev) => (prev ? clampToViewport(prev.left, prev.bottom) : prev));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [position, clampToViewport, setPosition]);

  const dragHandleClass = `pointer-events-auto touch-none select-none ${
    dragging ? 'cursor-grabbing' : 'cursor-grab'
  }`;

  const dockTransform = position
    ? `scale(${scale})`
    : `translateX(-50%) scale(${scale})`;

  return (
    <div
      ref={dockRef}
      className="fixed z-[1200] flex flex-col items-center px-2"
      style={{
        ...(position
          ? { left: position.left, bottom: position.bottom }
          : { left: '50%', bottom: '0.35rem' }),
        transform: dockTransform,
        transformOrigin: 'bottom center',
        maxWidth: `${MAX_VIEWPORT_FRACTION * 100}vw`,
      }}
    >
      <div
        ref={contentRef}
        className="relative flex flex-col items-center gap-1 w-full pointer-events-none"
      >
        {children ? (
          <div
            className={`${dragHandleClass} w-full flex flex-col items-center gap-1`}
            onPointerDown={onDockPointerDown}
            title="Drag to move"
          >
            {children}
          </div>
        ) : null}
        <div
          className={dragHandleClass}
          onPointerDown={onDockPointerDown}
          title="Drag to move"
        >
          {playerSlot}
        </div>
      </div>
    </div>
  );
};

export default DesktopPlayerDock;
