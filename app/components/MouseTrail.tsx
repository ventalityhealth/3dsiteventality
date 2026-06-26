"use client";

import { useEffect, useRef } from "react";

/**
 * MouseTrail — a lightweight DOM cursor trail.
 *
 * Placeholder stub kept intentionally minimal. A single glowing dot eases
 * toward the pointer using requestAnimationFrame. Disabled for pointer-coarse
 * devices and when the user prefers reduced motion. No SVG / vector graphics.
 */
export default function MouseTrail() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) return;

    const dot = dotRef.current;
    if (!dot) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { x: target.x, y: target.y };
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
    };

    const tick = () => {
      pos.x += (target.x - pos.x) * 0.18;
      pos.y += (target.y - pos.y) * 0.18;
      dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={dotRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-50 h-6 w-6 rounded-full mix-blend-screen"
      style={{
        background:
          "radial-gradient(circle, rgba(255,212,160,0.55) 0%, rgba(255,212,160,0) 70%)",
        willChange: "transform",
      }}
    />
  );
}
