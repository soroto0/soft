import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const NestedCirclesDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const scale = interpolate(frame, [0, span], [0.2, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rotation = interpolate(frame, [0, span], [0, 45], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { r: 40, label: 'Aleph-0', color: '#e9f2f6' },
    { r: 80, label: 'Aleph-1', color: '#e0b44c' },
    { r: 130, label: 'Aleph-2', color: '#d0523f' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 400 400">
        <defs>
          <radialGradient id="grad">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#e9f2f6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(200, 200) rotate(${rotation}) scale(${scale})`}>
          {layers.map((layer, i) => (
            <g key={layer.label} opacity={reveal}>
              <circle
                cx={0}
                cy={0}
                r={layer.r}
                fill="none"
                stroke={layer.color}
                strokeWidth={2}
                strokeDasharray="4 4"
              />
              <line
                x1={0}
                y1={-layer.r}
                x2={0}
                y2={-layer.r - 20}
                stroke={layer.color}
                strokeWidth={1}
              />
              <text
                x={0}
                y={-layer.r - 25}
                fill={layer.color}
                fontSize={12}
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {layer.label} (Level {i})
              </text>
            </g>
          ))}
          <circle cx={0} cy={0} r={150} fill="url(#grad)" />
        </g>
      </svg>
      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          fontFamily: "'Segoe UI', sans-serif",
          fontSize: 32,
          color: '#e9f2f6',
          letterSpacing: '0.05em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};