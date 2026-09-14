import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GirderSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [0, span], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const components = [
    { id: 'top-chord', x: 120, y: 60, w: 160, h: 40, fill: '#e0b44c', label: 'FICHTE-GURT (OBEN)' },
    { id: 'bottom-chord', x: 120, y: 300, w: 160, h: 40, fill: '#e0b44c', label: 'FICHTE-GURT (UNTEN)' },
    { id: 'left-web', x: 120, y: 100, w: 20, h: 200, fill: '#8a949b', label: 'SPERRHOLZ-STEG' },
    { id: 'right-web', x: 260, y: 100, w: 20, h: 200, fill: '#8a949b', label: 'SPERRHOLZ-STEG' },
  ];

  const dimensions = [
    { x1: 140, y1: 100, x2: 260, y2: 100, label: 'b = 120 mm', type: 'h' },
    { x1: 140, y1: 100, x2: 140, y2: 300, label: 'h = 200 mm', type: 'v' },
  ];

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
        width="45%"
        viewBox="0 0 400 450"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e9f2f6" />
          </marker>
        </defs>

        {/* Cavity Label */}
        <text
          x={200}
          y={205}
          fill="#e9f2f6"
          fontSize={14}
          textAnchor="middle"
          opacity={reveal}
          style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
        >
          HOHLRAUM
        </text>

        {/* Main Components */}
        {components.map((c) => (
          <g key={c.id}>
            <rect
              x={c.x}
              y={c.y}
              width={c.w}
              height={c.h}
              fill={c.fill}
              fillOpacity={reveal * 0.4}
              stroke="#e9f2f6"
              strokeWidth={1.5}
              strokeDasharray={800}
              strokeDashoffset={800 * (1 - draw)}
            />
            <text
              x={c.x + (c.id.includes('web') ? -15 : c.w + 15)}
              y={c.y + c.h / 2 + 5}
              fill="#e9f2f6"
              fontSize={10}
              textAnchor={c.id.includes('web') ? 'end' : 'start'}
              opacity={reveal}
              style={{ fontFamily: 'sans-serif', letterSpacing: '1px' }}
            >
              {c.label}
            </text>
          </g>
        ))}

        {/* Dimension Lines */}
        {dimensions.map((d, i) => (
          <g key={i} opacity={reveal}>
            <line
              x1={d.x1}
              y1={d.y1 + (d.type === 'h' ? 20 : 0)}
              x2={d.x2}
              y2={d.y2 + (d.type === 'h' ? 20 : 0)}
              stroke="#d0523f"
              strokeWidth={1}
              markerStart="url(#arrow)"
              markerEnd="url(#arrow)"
            />
            <text
              x={d.type === 'h' ? (d.x1 + d.x2) / 2 : d.x1 + 10}
              y={d.type === 'h' ? d.y1 + 40 : (d.y1 + d.y2) / 2}
              fill="#d0523f"
              fontSize={11}
              textAnchor={d.type === 'h' ? 'middle' : 'start'}
              style={{ fontFamily: 'monospace' }}
            >
              {d.label}
            </text>
          </g>
        ))}

        {/* Leader Lines */}
        <path
          d="M 280 80 L 310 80"
          stroke="#e9f2f6"
          strokeWidth={0.5}
          fill="none"
          opacity={reveal}
        />
        <path
          d="M 120 200 L 90 200"
          stroke="#e9f2f6"
          strokeWidth={0.5}
          fill="none"
          opacity={reveal}
        />
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            color: '#e9f2f6',
            fontSize: 28,
            fontFamily: 'sans-serif',
            fontWeight: 600,
            letterSpacing: '4px',
            textTransform: 'uppercase',
            opacity: reveal,
            transform: `translateY(${shift}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};