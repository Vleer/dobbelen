import React, { useCallback, useEffect, useRef, useState } from 'react';

interface DesktopPlayerDockProps {
  /** Current bid — overlays above without shifting the dock */
  bidDisplay?: React.ReactNode;
  /** Bid selector controls */
  children?: React.ReactNode;
  /** Local player card */
  playerSlot: React.ReactNode;
}

/**
 * Desktop-only: stacks bid selector + local player (current bid floats above),
 * and moves them together when the player or bid panel is dragged.
 */
const DesktopPlayerDock: React.FC<DesktopPlayerDockProps> = ({
  bidDisplay,
  children,
  playerSlot,
}) => {
  const dockRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const getVisualBounds = useCallback(() => {
    const el = dockRef.current;
    if (!el) {
      return { left: 0, top: 0, width: 420, height: 200 };
    }
    const rect = el.getBoundingClientRect();
    const overlay = el.querySelector('[data-bid-display-overlay]') as HTMLElement | null;
    const overlayRect = overlay?.getBoundingClientRect();
    const top = overlayRect ? Math.min(rect.top, overlayRect.top) : rect.top;
    const bottom = rect.bottom;
    const left = overlayRect ? Math.min(rect.left, overlayRect.left) : rect.left;
    const right = overlayRect ? Math.max(rect.right, overlayRect.right) : rect.right;
    return {
      left,
      top,
      width: Math.max(rect.width, right - left),
      height: Math.max(rect.height, bottom - top),
    };
  }, []);

  const clampToViewport = useCallback(
    (left: number, top: number) => {
      const bounds = getVisualBounds();
      // top is dock box top; overlay sits above it — keep overlay on-screen
      const overlayExtra = Math.max(0, (dockRef.current?.getBoundingClientRect().top ?? 0) - bounds.top);
      const width = dockRef.current?.offsetWidth ?? bounds.width;
      const height = (dockRef.current?.offsetHeight ?? bounds.height) + overlayExtra;
      const maxLeft = Math.max(8, window.innerWidth - width - 8);
      const maxTop = Math.max(8, window.innerHeight - height - 8);
      return {
        left: Math.min(Math.max(8, left), maxLeft),
        top: Math.min(Math.max(8 + overlayExtra, top), maxTop + overlayExtra),
      };
    },
    [getVisualBounds]
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

  return (
    <div
      ref={dockRef}
      className="fixed z-[1200] flex flex-col items-center px-2"
      style={
        position
          ? { left: position.left, top: position.top, transform: 'none' }
          : { left: '50%', bottom: '0.35rem', transform: 'translateX(-50%)' }
      }
    >
      <div className="relative flex flex-col items-center gap-1 w-full pointer-events-none">
        {bidDisplay ? (
          <div
            data-bid-display-overlay
            className={`absolute bottom-full left-1/2 mb-2 w-full -translate-x-1/2 flex justify-center ${dragHandleClass}`}
            onPointerDown={onDockPointerDown}
            title="Drag to move"
          >
            {bidDisplay}
          </div>
        ) : null}
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
