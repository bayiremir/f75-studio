import { useEffect, useRef, useState } from 'react';
import { KeyboardRenderer } from './renderer';

interface Props {
  getColors: () => Float32Array;
  onKey?: (id: string, kind: 'down' | 'drag') => void;
  reflection?: boolean;
  className?: string;
  cursor?: string;
}

/** Live, animated keyboard drawn every animation frame. */
export function KeyboardView({ getColors, onKey, reflection = true, className, cursor }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<KeyboardRenderer>();
  const hover = useRef<string | null>(null);
  const dragging = useRef(false);
  const getRef = useRef(getColors);
  getRef.current = getColors;
  const [, setTick] = useState(0);

  useEffect(() => {
    renderer.current = new KeyboardRenderer();
    let raf = 0;
    const loop = () => {
      const c = ref.current;
      if (c && renderer.current) renderer.current.draw(c, getRef.current(), { reflection, hover: hover.current });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onResize = () => setTick((t) => t + 1);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [reflection]);

  const keyAt = (e: React.PointerEvent) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return KeyboardRenderer.hit(e.clientX - r.left, e.clientY - r.top, r.width, r.height, reflection);
  };

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ cursor: hover.current ? cursor ?? 'pointer' : 'default' }}
      onPointerDown={(e) => {
        const id = keyAt(e);
        dragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        if (id) onKey?.(id, 'down');
      }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerLeave={() => { hover.current = null; }}
      onPointerMove={(e) => {
        const id = keyAt(e);
        if (id !== hover.current) {
          hover.current = id;
          (e.target as HTMLElement).style.cursor = id ? cursor ?? 'pointer' : 'default';
          if (id && dragging.current) onKey?.(id, 'drag');
        }
      }}
    />
  );
}
