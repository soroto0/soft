import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ProbePfahlHohlraumScene: React.FC<SceneProps> = (p) => {
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
  const pile = interpolate(frame, [span * 0.1, span * 0.3], [0, 1], EO);
  const grid = interpolate(frame, [span * 0.15, span * 0.35], [0, 0.4], EO);
  const voidVal = interpolate(frame, [span * 0.3, span * 0.5], [0, 2.4], EO);
  const crack = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], EO);

  const layers = [
    { name: 'Грунт 1', y: 0, h: 40, color: '#2c3e50' },
    { name: 'Грунт 2', y: 40, h: 50, color: '#34495e' },
    { name: 'Грунт 3', y: 90, h: 60, color: '#455a64' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 400 400">
        <g transform={`translate(200 200) scale(${push}) translate(-200 -200)`}>
          {layers.map((l, i) => (
            <rect key={l.name} x={100} y={50 + l.y} width={200} height={l.h} 
                  fill={l.color} opacity={interpolate(frame, [span * (0.1 + i * 0.05), span * (0.3 + i * 0.05)], [0, 1], EO)} />
          ))}
          
          <rect x={185} y={50} width={30} height={150 * pile} fill="#bdc3c7" />
          
          <line x1={150} y1={200} x2={250} y2={200} stroke="#e9f2f6" strokeWidth={2} strokeDasharray="4 2" opacity={grid} />
          <line x1={150} y1={224} x2={250} y2={224} stroke="#e9f2f6" strokeWidth={2} strokeDasharray="4 2" opacity={grid} />
          
          <path d="M 260 200 v 24" stroke="#e0b44c" strokeWidth={2} fill="none" />
          <path d="M 255 200 l 5 -5 l 5 5" stroke="#e0b44c" strokeWidth={2} fill="none" />
          <path d="M 255 224 l 5 5 l 5 -5" stroke="#e0b44c" strokeWidth={2} fill="none" />
          
          <text x={270} y={216} fill="#e0b44c" fontSize={16} fontWeight="bold">
            {voidVal.toFixed(1)} m
          </text>

          <path d="M 215 200 l 10 10 l -5 5 l 15 10" stroke="#d0523f" strokeWidth={2} 
                fill="none" strokeDasharray={50} strokeDashoffset={50 * (1 - crack)} />

          {layers.map((l, i) => (
            <text key={l.name} x={80} y={75 + l.y} fill="#e9f2f6" fontSize={10} textAnchor="end" opacity={grid}>
              {l.name}
            </text>
          ))}
        </g>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', backgroundColor: 'rgba(0,0,0,0.6)', padding: '10px 20px', borderRadius: 8 }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
