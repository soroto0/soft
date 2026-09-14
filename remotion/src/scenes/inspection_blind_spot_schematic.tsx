import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InspectionBlindSpotSchematicScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const push = interpolate(frame, [0, span], [1, 1.04], EO);
  const build = interpolate(frame, [0, span * 0.3], [0, 1], EO);
  const pan = interpolate(frame, [span * 0.3, span * 0.6], [0, 120], EO);
  const highlight = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], EO);
  const strike = interpolate(frame, [span * 0.6, span * 0.7], [0, 1], EO);
  const grid = interpolate(frame, [span * 0.1, span * 0.3], [0, 0.4], EO);

  const pipeSegments = [
    { x: 50, y: 150, w: 100, h: 20 },
    { x: 150, y: 150, w: 20, h: 80 },
    { x: 150, y: 230, w: 150, h: 20 },
  ];

  const dims = [
    { x: 70, y: 140, val: '450' },
    { x: 100, y: 140, val: '450' },
    { x: 130, y: 140, val: '450' },
    { x: 160, y: 180, val: '900' },
    { x: 160, y: 210, val: '900' },
    { x: 200, y: 220, val: '600' },
    { x: 240, y: 220, val: '600' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300">
        <g transform={`translate(200 150) scale(${push}) translate(-200 -150) translate(${-pan * 0.5} 0)`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={40} y1={100 + i * 40} x2={360} y2={100 + i * 40} 
                  stroke="#e9f2f6" strokeWidth={0.5} opacity={grid} />
          ))}
          {pipeSegments.map((pipe, i) => (
            <rect key={i} x={pipe.x} y={pipe.y} width={pipe.w * build} height={pipe.h} 
                  fill="#8a949b" stroke="#e9f2f6" strokeWidth={1} />
          ))}
          {dims.map((d, i) => (
            <g key={i} opacity={1 - highlight * 0.8}>
              <line x1={d.x} y1={d.y} x2={d.x} y2={d.y + 10} stroke="#e9f2f6" strokeWidth={1} />
              <text x={d.x} y={d.y - 5} fill="#e9f2f6" fontSize={8} textAnchor="middle">{d.val}mm</text>
            </g>
          ))}
          <path d="M 150 150 L 170 150 L 170 170" fill="none" stroke={highlight > 0.5 ? "#f0a92b" : "#e9f2f6"} 
                strokeWidth={4} />
          <g opacity={highlight}>
            <text x={175} y={145} fill="#f0a92b" fontSize={16} fontWeight="bold">0</text>
            <line x1={170} y1={140} x2={185} y2={150} stroke="#d0523f" strokeWidth={2} opacity={strike} />
            <text x={200} y={150} fill="#d0523f" fontSize={10}>Rohrkrümmer 821</text>
          </g>
        </g>
      </svg>
      {p.title ? (
        <div style={{ position: 'absolute', bottom: 60, padding: '12px 24px', 
                      backgroundColor: 'rgba(233, 242, 246, 0.15)', color: '#e9f2f6', 
                      fontFamily: 'sans-serif', fontSize: 28, letterSpacing: '0.06em', borderRadius: 4 }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};