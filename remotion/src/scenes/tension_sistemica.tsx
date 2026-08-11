import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TensionSistemicaScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const collapse = interpolate(frame, [0, span * 0.9], [1, 0.15], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const linkAlpha = interpolate(frame, [span * 0.2, span * 0.7], [0.7, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = 1 + Math.sin((frame / fps) * 5) * 0.04 * (1 - linkAlpha);

  const nodeColor = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textRise = interpolate(frame, [0, fps], [30, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const nodes = [
    { id: 'N1', x: 500, y: 500, label: 'HUB-01' },
    { id: 'N2', x: 320, y: 320, label: 'MKT-A' },
    { id: 'N3', x: 680, y: 320, label: 'MKT-B' },
    { id: 'N4', x: 320, y: 680, label: 'MKT-C' },
    { id: 'N5', x: 680, y: 680, label: 'MKT-D' },
    { id: 'N6', x: 500, y: 220, label: 'ENERGY' },
    { id: 'N7', x: 500, y: 780, label: 'LOGIST' },
    { id: 'N8', x: 220, y: 500, label: 'TECH' },
    { id: 'N9', x: 780, y: 500, label: 'FIN' },
  ];

  const links = [
    ['N1', 'N2'], ['N1', 'N3'], ['N1', 'N4'], ['N1', 'N5'],
    ['N2', 'N6'], ['N6', 'N3'], ['N3', 'N9'], ['N9', 'N5'],
    ['N5', 'N7'], ['N7', 'N4'], ['N4', 'N8'], ['N8', 'N2'],
    ['N6', 'N1'], ['N7', 'N1'], ['N8', 'N1'], ['N9', 'N1']
  ];

  const getPos = (initial: number) => 500 + (initial - 500) * collapse * pulse;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 1000 1000"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {links.map((link, i) => {
          const start = nodes.find((n) => n.id === link[0])!;
          const end = nodes.find((n) => n.id === link[1])!;
          return (
            <line
              key={`link-${i}`}
              x1={getPos(start.x)}
              y1={getPos(start.y)}
              x2={getPos(end.x)}
              y2={getPos(end.y)}
              stroke="#e9f2f6"
              strokeWidth={1.5}
              strokeOpacity={linkAlpha}
              strokeDasharray="10 5"
            />
          );
        })}

        {nodes.map((node) => {
          const cx = getPos(node.x);
          const cy = getPos(node.y);
          const r = 45 + 15 * (1 - collapse);
          const color = nodeColor > 0.5 ? '#d0523f' : '#e0b44c';

          return (
            <g key={node.id}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={color}
                fillOpacity={0.15}
                stroke={color}
                strokeWidth={1}
                filter="url(#glow)"
              />
              <circle
                cx={cx}
                cy={cy}
                r={4}
                fill="#e9f2f6"
              />
              <text
                x={cx}
                y={cy - r - 10}
                fill="#e9f2f6"
                fontSize={14}
                textAnchor="middle"
                fontFamily="monospace"
                opacity={linkAlpha * 1.5}
              >
                {node.label}
              </text>
              {nodeColor > 0.7 && (
                <path
                  d={`M ${cx - 10} ${cy - 10} L ${cx + 10} ${cy + 10} M ${cx + 10} ${cy - 10} L ${cx - 10} ${cy + 10}`}
                  stroke="#d0523f"
                  strokeWidth={3}
                  opacity={nodeColor}
                />
              )}
            </g>
          );
        })}

        <circle
          cx={500}
          cy={500}
          r={500 * (1 - collapse)}
          fill="none"
          stroke="#d0523f"
          strokeWidth={0.5}
          strokeDasharray="4 8"
          opacity={1 - linkAlpha}
        />
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            transform: `translateY(${textRise}px)`,
            color: '#e9f2f6',
            fontFamily: 'serif',
            fontSize: 42,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};