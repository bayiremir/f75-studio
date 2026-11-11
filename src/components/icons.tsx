const PATHS: Record<string, string> = {
  sparkles: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14zM5 15l.7 1.6L7.3 17.3l-1.6.7L5 19.6l-.7-1.6L2.7 17.3l1.6-.7L5 15z',
  chip: 'M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2zM9 9h6v6H9z',
  brush: 'M18.4 2.6a2 2 0 012.9 2.9L12 14.8 9.2 12l9.2-9.4zM8 13.5l2.5 2.5c0 2.5-2 4.5-4.5 4.5H3c1.2-1 1.5-2.2 1.5-3.5A3.5 3.5 0 018 13.5z',
  keyboard: 'M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  play: 'M7 4.5v15l12-7.5-12-7.5z',
  pause: 'M7 4h3.5v16H7zM13.5 4H17v16h-3.5z',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z',
  'star-fill': 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z',
  broadcast: 'M12 13a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM8.5 15.5a5 5 0 010-7M15.5 8.5a5 5 0 010 7M5.6 18.4a9 9 0 010-12.8M18.4 5.6a9 9 0 010 12.8',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  min: 'M5 12h14',
  max: 'M6 6h12v12H6z',
  close: 'M6 6l12 12M18 6L6 18',
  reset: 'M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.8L3 8M3 3v5h5',
  save: 'M5 3h11l5 5v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM7 3v5h8V3M7 21v-7h10v7',
  camera: 'M4 7h3l2-3h6l2 3h3a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1zM12 17a4 4 0 100-8 4 4 0 000 8z',
  wifi: 'M2 8.8a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 19.5h.01',
  usb: 'M12 2v14M9 5l3-3 3 3M8 10v2l4 3M16 8v3l-4 3M12 16a2.5 2.5 0 110 5 2.5 2.5 0 010-5z',
  battery: 'M3 8h15a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V9a1 1 0 011-1zM22 11v2',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  info: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01',
  fill: 'M19 11l-8-8-8.5 8.5a2 2 0 000 2.8l5.2 5.2a2 2 0 002.8 0L19 11zM5 11h14M21 16s-2 2.3-2 3.5a2 2 0 004 0c0-1.2-2-3.5-2-3.5z',
  eraser: 'M20 20H8.5l-5-5a2 2 0 010-2.8L13.2 2.5a2 2 0 012.8 0L21 7.5a2 2 0 010 2.8L11 20M6 11l7 7',
  dropper: 'M2 22l1-4 9.5-9.5 3 3L6 21l-4 1zM14.5 6.5l3-3a2.1 2.1 0 013 3l-3 3M13 5l6 6',
  gradient: 'M3 5h18v14H3zM7 5v14M11 5v14M15 5v14',
  power: 'M12 2v10M18.4 6.6a9 9 0 11-12.8 0',
  heart: 'M12 21s-7.5-4.6-9.5-9.3C1 8 3.3 4.5 7 4.5c2 0 3.6 1 5 3 1.4-2 3-3 5-3 3.7 0 6 3.5 4.5 7.2C19.5 16.4 12 21 12 21z',
  shuffle: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
};

export function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const fill = name === 'star-fill' || name === 'play' || name === 'pause' || name === 'bolt' || name === 'heart';
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={fill ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff2bd6" />
          <stop offset="0.5" stopColor="#7a5cff" />
          <stop offset="1" stopColor="#00e5ff" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#lg)" />
      <rect x="6" y="11" width="20" height="11" rx="2.5" fill="#0a0b10" opacity="0.9" />
      {[8.5, 12.5, 16.5, 20.5].map((x) => <rect key={x} x={x} y="13.2" width="2.6" height="2.4" rx="0.6" fill="#fff" opacity="0.9" />)}
      <rect x="10" y="17.6" width="12" height="2.2" rx="0.8" fill="#fff" opacity="0.9" />
    </svg>
  );
}
