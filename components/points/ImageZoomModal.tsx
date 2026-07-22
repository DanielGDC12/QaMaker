"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ImageZoomModal.module.css";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.4;

interface Props {
  url: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}

export function ImageZoomModal({ url, alt, open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [scale, setScale] = useState(MIN_SCALE);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setScale(MIN_SCALE);
      setPos({ x: 0, y: 0 });
    }
  }, [open]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onNativeClose = () => onClose();
    const onBackdropClick = (e: MouseEvent) => {
      if (e.target === dlg) onClose();
    };
    dlg.addEventListener("close", onNativeClose);
    dlg.addEventListener("click", onBackdropClick);
    return () => {
      dlg.removeEventListener("close", onNativeClose);
      dlg.removeEventListener("click", onBackdropClick);
    };
  }, [onClose]);

  function clampScale(next: number) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, +next.toFixed(2)));
  }

  function zoomBy(delta: number) {
    setScale((s) => {
      const next = clampScale(s + delta);
      if (next === MIN_SCALE) setPos({ x: 0, y: 0 });
      return next;
    });
  }

  function resetZoom() {
    setScale(MIN_SCALE);
    setPos({ x: 0, y: 0 });
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP);
  }

  function onPointerDown(e: React.PointerEvent<HTMLImageElement>) {
    if (scale <= MIN_SCALE) return;
    dragRef.current = { x: pos.x, y: pos.y, startX: e.clientX, startY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLImageElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    setPos({ x: drag.x + (e.clientX - drag.startX), y: drag.y + (e.clientY - drag.startY) });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onDoubleClick() {
    if (scale > MIN_SCALE) resetZoom();
    else setScale(2);
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.btn}
          onClick={() => zoomBy(-SCALE_STEP)}
          disabled={scale <= MIN_SCALE}
          aria-label="Diminuir zoom"
        >
          −
        </button>
        <span className={styles.zoomLevel}>{Math.round(scale * 100)}%</span>
        <button
          type="button"
          className={styles.btn}
          onClick={() => zoomBy(SCALE_STEP)}
          disabled={scale >= MAX_SCALE}
          aria-label="Aumentar zoom"
        >
          +
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={resetZoom}
          disabled={scale === MIN_SCALE}
        >
          Redefinir
        </button>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>

      <div className={styles.viewport} onWheel={onWheel}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className={styles.image}
          draggable={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onDoubleClick={onDoubleClick}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            cursor: scale > MIN_SCALE ? "grab" : "zoom-in",
          }}
        />
      </div>
    </dialog>
  );
}
