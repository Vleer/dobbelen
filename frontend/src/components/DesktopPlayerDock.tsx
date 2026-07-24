import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

interface DesktopPlayerDockProps {
  /** Bid selector controls */
  children?: React.ReactNode;
  /** Local player card */
  playerSlot: React.ReactNode;
}

const MAX_VIEWPORT_FRACTION = 0.8;

/**
 * Desktop-only: stacks bid selector + local player, moves them together when dragged,
 * and scales the stack to stay within 80% of the viewport.
 */
const DesktopPlayerDock: React.FC<DesktopPlayerDockProps> = ({
  children,
  playerSlot,
}) => {
  const dockRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    // offsetWidth/Height ignore CSS transforms — natural layout size
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

  const clampToViewport = useCallback(
    (left: number, top: number) => {
      const el = dockRef.current;
      const width = el?.getBoundingClientRect().width ?? 420;
      const height = el?.getBoundingClientRect().height ?? 200;
      const maxLeft = Math.max(8, window.innerWidth - width - 8);
      const maxTop = Math.max(8, window.innerHeight - height - 8);
      return {
        left: Math.min(Math.max(8, left), maxLeft),
        top: Math.min(Math.max(8, top), maxTop),
      };
    },
    []
  );

  const onDockPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    // Don't start a dock drag from buttons / interactive controls
    if (e.target instanceof Element && e.target.closest('button, a, input, [role="button"]')) {
      return;
    }
    const el = dockRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const origin = { left: rect.left, top: rect.top };
    setPosition(origin);
    dragOffsetRef.current = {
      x: e.clientX - origin.left,
      y: e.clientY - origin.top,
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
          ? { left: position.left, top: position.top }
          : { left: '50%', bottom: '0.35rem' }),
        transform: dockTransform,
        transformOrigin: position ? 'top left' : 'bottom center',
        maxWidth: `${MAX_VIEWPORT_FRACTION * 100}vw`,
      }}
    >
      <div
        ref={contentRef}
        className="relative flex flex-col items-center gap-1 w-full pointer-events-none"
      >
        {children ? (
          <div
            className={`${dragHandleClass} w-full flex flex-col items-center`}
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
