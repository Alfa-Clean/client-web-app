import { useEffect, useRef } from "preact/hooks";

export interface ZoomableImageProps {
  src: string;
  alt?: string;
  /** Максимальный масштаб (по умолчанию 4) */
  maxZoom?: number;
  /** Масштаб по двойному тапу (по умолчанию 2.5) */
  doubleTapZoom?: number;
  /** Сообщает наружу, увеличена ли картинка (для отключения свайпов и т.п.) */
  onZoomChange?: (zoomed: boolean) => void;
  /** Доп. классы контейнера (например `flex-1` внутри flex-колонки) */
  class?: string;
  /** Доп. классы <img> */
  imgClass?: string;
}

/**
 * Картинка с pinch-to-zoom, двойным тапом (зум к точке касания) и панорамированием.
 * Работает на pointer-событиях — тач и мышь. Не зависит от Tailwind:
 * базовая раскладка задаётся inline-стилями, классы опциональны.
 */
export function ZoomableImage({
  src,
  alt = "",
  maxZoom = 4,
  doubleTapZoom = 2.5,
  onZoomChange,
  class: className = "",
  imgClass = "",
}: ZoomableImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const state = useRef({ scale: 1, tx: 0, ty: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const base = useRef({ scale: 1, tx: 0, ty: 0, dist: 0, mx: 0, my: 0 });
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const moved = useRef(false);

  const rel = (e: PointerEvent) => {
    const r = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const center = () => {
    const r = containerRef.current!.getBoundingClientRect();
    return { x: r.width / 2, y: r.height / 2 };
  };

  const apply = (animate = false) => {
    const img = imgRef.current;
    if (!img) return;
    img.style.transition = animate ? "transform 0.2s ease-out" : "none";
    const { scale, tx, ty } = state.current;
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    onZoomChange?.(scale > 1.01);
  };

  const snapshot = () => {
    const pts = [...pointers.current.values()];
    const s = state.current;
    let dist = 0;
    let mx = 0;
    let my = 0;
    if (pts.length >= 2) {
      dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      mx = (pts[0].x + pts[1].x) / 2;
      my = (pts[0].y + pts[1].y) / 2;
    } else if (pts.length === 1) {
      mx = pts[0].x;
      my = pts[0].y;
    }
    base.current = { scale: s.scale, tx: s.tx, ty: s.ty, dist, mx, my };
  };

  // Сброс зума при смене картинки
  useEffect(() => {
    state.current = { scale: 1, tx: 0, ty: 0 };
    apply();
  }, [src]);

  const onDown = (e: PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, rel(e));
    moved.current = false;
    snapshot();
  };

  const onMove = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, rel(e));
    const pts = [...pointers.current.values()];
    const b = base.current;
    const C = center();

    if (pts.length >= 2) {
      moved.current = true;
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mx = (pts[0].x + pts[1].x) / 2;
      const my = (pts[0].y + pts[1].y) / 2;
      const scale = Math.max(1, Math.min(maxZoom, (b.scale * dist) / b.dist));
      // фокус (точка между пальцами) в координатах картинки от центра
      const fx = (b.mx - C.x - b.tx) / b.scale;
      const fy = (b.my - C.y - b.ty) / b.scale;
      state.current = {
        scale,
        tx: mx - C.x - scale * fx,
        ty: my - C.y - scale * fy,
      };
      apply();
    } else if (pts.length === 1 && state.current.scale > 1.01) {
      const dx = pts[0].x - b.mx;
      const dy = pts[0].y - b.my;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true;
      state.current = { scale: b.scale, tx: b.tx + dx, ty: b.ty + dy };
      apply();
    }
  };

  const onUp = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = rel(e);
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);

    // Двойной тап — только если это был чистый тап без движения
    if (!moved.current && wasSingle && pointers.current.size === 0) {
      const now = Date.now();
      const lt = lastTap.current;
      if (lt && now - lt.t < 300 && Math.hypot(p.x - lt.x, p.y - lt.y) < 30) {
        const C = center();
        if (state.current.scale > 1.01) {
          state.current = { scale: 1, tx: 0, ty: 0 };
        } else {
          const s = doubleTapZoom;
          state.current = {
            scale: s,
            tx: (p.x - C.x) * (1 - s),
            ty: (p.y - C.y) * (1 - s),
          };
        }
        apply(true);
        lastTap.current = null;
      } else {
        lastTap.current = { t: now, x: p.x, y: p.y };
      }
    }

    // Плавно вернуть в исходное, если вышли из зума
    if (pointers.current.size === 0 && state.current.scale <= 1.01) {
      state.current = { scale: 1, tx: 0, ty: 0 };
      apply(true);
    }
    snapshot();
  };

  return (
    <div
      ref={containerRef}
      class={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          touchAction: "none",
          transformOrigin: "center center",
        }}
        class={imgClass}
      />
    </div>
  );
}
