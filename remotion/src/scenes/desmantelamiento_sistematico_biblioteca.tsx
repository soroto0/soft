import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DesmantelamientoSistematicoBibliotecaScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const fadeProgress = interpolate(frame, [0, span * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [0, span], [0, 20], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionY = interpolate(frame, [0, span], [height * 0.85, height * 0.82], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rows = 10;
  const cols = 16;
  const grid = Array.from({ length: rows * cols }).map((_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const centerX = cols / 2;
    const centerY = rows / 2;
    const dist = Math.sqrt(Math.pow(c - centerX, 2) + Math.pow(r - centerY, 2));
    return { r, c, dist };
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="fadeGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#e9f2f6" />
          </linearGradient>
        </defs>
        
        <g transform={`translate(${width * 0.1}, ${height * 0.1})`}>
          {grid.map((cell) => {
            const cellOpacity = interpolate(fadeProgress, [cell.dist / 10, 0.8 + cell.dist / 10], [1, 0], {
              easing: Easing.out(Easing.quad),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            
            return (
              <circle
                key={`${cell.r}-${cell.c}`}
                cx={(cell.c / cols) * (width * 0.8)}
                cy={(cell.r / rows) * (height * 0.6)}
                r={8 - shift / 4}
                fill="url(#fadeGradient)"
                opacity={cellOpacity}
              />
            );
          })}
          
          <line x1={0} y1={height * 0.65} x2={width * 0.8} y2={height * 0.65} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" />
          <text x={0} y={height * 0.7} fill="#e9f2f6" fontSize={16}>MARGEN</text>
          <text x={width * 0.8} y={height * 0.7} fill="#e9f2f6" fontSize={16} textAnchor="end">CENTRO</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          top: captionY,
          width: '100%',
          textAlign: 'center',
          fontFamily: 'serif',
          fontSize: 42,
          color: '#e9f2f6',
          letterSpacing: '0.05em'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};