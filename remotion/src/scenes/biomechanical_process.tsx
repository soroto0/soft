import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BiomechanicalProcessScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = (p.dur || 6) * fps;
  const opacity = p.enter * p.exit;

  const rotation = interpolate(frame, [duration * 0.2, duration * 0.5], [0, 90], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const offOpacity = interpolate(frame, [duration * 0.5, duration * 0.7], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const float = interpolate(frame, [0, duration], [0, 10], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sharkPoints = "M 0,0 L 100,10 L 100,30 L 200,20 L 220,30 L 200,40 L 100,30 L 100,50 L 0,60 Z";
  const markers = [
    { x: 90, y: 15, label: 'OFF' },
    { x: 90, y: 45, label: 'OFF' },
    { x: 20, y: 30, label: 'OFF' }
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 300" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="sharkGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#c9d3d9" />
            <stop offset="1" stopColor="#8a949b" />
          </linearGradient>
        </defs>
        <g transform={`translate(200, 150) rotate(${rotation}) translate(-110, -30)`}>
          <path d={sharkPoints} fill="url(#sharkGrad)" stroke="#e9f2f6" strokeWidth={2} />
          {markers.map((item, i) => (
            <g key={i} opacity={offOpacity} transform={`translate(${item.x}, ${item.y})`}>
              <circle r={10} fill="#d0523f" stroke="#e9f2f6" strokeWidth={1} />
              <text fontSize={7} fill="#e9f2f6" textAnchor="middle" dy={3} fontWeight="bold">
                {item.label}
              </text>
            </g>
          ))}
        </g>

        <line x1={50} y1={250} x2={350} y2={250} stroke="#e0b44c" strokeWidth={2} strokeDasharray="6 6" />
        <text x={200} y={275} fill="#e0b44c" fontSize={14} textAnchor="middle" style={{ letterSpacing: 2 }}>
          MEERESBODEN
        </text>
        <line x1={200} y1={150} x2={200} y2={250} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="2 4" />
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          fontFamily: 'sans-serif',
          fontSize: 42,
          color: '#e9f2f6',
          textTransform: 'uppercase',
          transform: `translateY(${float}px)`
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};