import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TransitionPieceDetailScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.3, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scan = interpolate(frame, [span * 0.2, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const components = [
    { id: 'shell', label: 'STAHLMANTEL (S355)', y: 120, h: 100, w: 12, color: '#e9f2f6' },
    { id: 'ring', label: 'ÜBERGANGSSTÜCK', y: 220, h: 80, w: 240, color: 'url(#metalGrad)' },
    { id: 'concrete', label: 'BETONFUNDAMENT (C35/45)', y: 300, h: 180, w: 240, color: '#8a949b' },
  ];

  const bolts = [80, 140, 200, 260, 320];
  const hatchLines = Array.from({ length: 12 }).map((_, i) => i);

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 800 600"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c9d3d9" />
            <stop offset="0.5" stopColor="#e9f2f6" />
            <stop offset="1" stopColor="#8a949b" />
          </linearGradient>
          <clipPath id="clipRing">
            <rect x="280" y="220" width={240 * draw} height="80" />
          </clipPath>
        </defs>

        {/* Concrete Section */}
        <g opacity={draw}>
          <rect x="280" y="300" width="240" height="180" fill="#2a3238" stroke="#e9f2f6" strokeWidth="1" />
          {hatchLines.map((i) => (
            <line
              key={`hatch-${i}`}
              x1={280 + i * 20}
              y1={300}
              x2={280 + i * 20 + 20}
              y2={320}
              stroke="#e9f2f6"
              strokeWidth="0.5"
              opacity={0.3}
            />
          ))}
        </g>

        {/* Transition Ring */}
        <rect
          x="280"
          y="220"
          width="240"
          height="80"
          fill="url(#metalGrad)"
          stroke="#e9f2f6"
          strokeWidth="1.5"
          clipPath="url(#clipRing)"
        />

        {/* Steel Shell */}
        <rect
          x="394"
          y={220 - 100 * draw}
          width="12"
          height={100 * draw}
          fill="#e9f2f6"
          opacity={0.8}
        />

        {/* Anchor Bolts */}
        {bolts.map((b, i) => (
          <g key={`bolt-${i}`} opacity={labelAlpha}>
            <rect
              x={280 + b - 4}
              y={240}
              width="8"
              height={180 * draw}
              fill="#e0b44c"
              rx="2"
            />
            <circle cx={280 + b} cy={240} r="6" fill="#e0b44c" />
          </g>
        ))}

        {/* Labels and Leader Lines */}
        {components.map((c, i) => (
          <g key={c.id} opacity={labelAlpha}>
            <path
              d={`M ${280 + c.w / 2} ${c.y + c.h / 2} L ${150} ${c.y + c.h / 2}`}
              stroke="#e9f2f6"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <text
              x="140"
              y={c.y + c.h / 2 + 4}
              fill="#e9f2f6"
              fontSize="12"
              fontFamily="monospace"
              textAnchor="end"
            >
              {c.label}
            </text>
          </g>
        ))}

        {/* Dimension Line */}
        <g opacity={labelAlpha}>
          <line x1="280" y1="520" x2="520" y2="520" stroke="#e0b44c" strokeWidth="1" />
          <line x1="280" y1="515" x2="280" y2="525" stroke="#e0b44c" strokeWidth="1" />
          <line x1="520" y1="515" x2="520" y2="525" stroke="#e0b44c" strokeWidth="1" />
          <text x="400" y="540" fill="#e0b44c" fontSize="14" textAnchor="middle" fontFamily="monospace">
            Ø 6500 mm
          </text>
        </g>

        {/* Scanning Highlight */}
        <line
          x1={280 + 240 * scan}
          y1="100"
          x2={280 + 240 * scan}
          y2="500"
          stroke="#d0523f"
          strokeWidth="2"
          strokeDasharray="10 5"
          opacity={0.6}
        />
        <text
          x={280 + 240 * scan + 5}
          y="95"
          fill="#d0523f"
          fontSize="10"
          fontFamily="monospace"
          opacity={0.8}
        >
          SCANNING INTERFACE...
        </text>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            letterSpacing: '0.1em',
            opacity: labelAlpha,
            transform: `translateY(${(1 - labelAlpha) * 20}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};