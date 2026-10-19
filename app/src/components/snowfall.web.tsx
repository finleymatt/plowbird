import { createElement, useEffect } from 'react';

// Gentle falling snow over a section (website only). Pure CSS, pointer-events off.
const FLAKES = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 3 + ((i * 7) % 5),
  dur: 9 + ((i * 13) % 9),
  delay: -((i * 17) % 18),
  drift: ((i % 5) - 2) * 18,
}));

let injected = false;
function injectCss() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pb-fall { from { transform: translate3d(0,-20px,0) } to { transform: translate3d(var(--drift),110vh,0) } }
    .pb-flake { position:absolute; top:-20px; border-radius:50%; background:#fff; opacity:.9; box-shadow:0 0 6px rgba(30,111,217,.25); animation: pb-fall linear infinite; }
    @media (prefers-reduced-motion: reduce) { .pb-flake { animation: none; display: none } }`;
  document.head.appendChild(style);
}

export function Snowfall() {
  useEffect(injectCss, []);
  return createElement(
    'div',
    { 'aria-hidden': true, style: { position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' } },
    FLAKES.map((f, i) =>
      createElement('span', {
        key: i,
        className: 'pb-flake',
        style: { left: `${f.left}%`, width: f.size, height: f.size, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`, '--drift': `${f.drift}px` },
      }),
    ),
  );
}
