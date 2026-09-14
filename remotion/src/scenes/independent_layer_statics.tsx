import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const IndependentLayerStaticsScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const plateSag = interpolate(frame, [0, span], [5, 20], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const girderSag = interpolate(frame, [0, span], [8, 95], {
    easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.3, span], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loadArrows = [0.2, 0.35, 0.5, 0.65, 0.8];
  const girderColor = stress > 0.5 ? '#e0b44c' : '#e9f2f6';

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 600 400"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Supports */}
        <path d="M 80,250 L 100,280 L 60,280 Z" fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <path d="M 500,250 L 520,280 L 480,280 Z" fill="none" stroke="#e9f2f6" strokeWidth="2" />
        <line x1="40" y1="280" x2="560" y2="280" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 4" />

        {/* Load Arrows */}
        {loadArrows.map((pos, i) => {
          const x = 100 + pos * 400;
          const yStart = 50;
          const yEnd = 120 + (plateSag * Math.sin(Math.PI * pos));
          return (
            <g key={i} opacity={0.6 + stress * 0.4}>
              <line
                x1={x}
                y1={yStart}
                x2={x}
                y2={yEnd - 10}
                stroke="#e0b44c"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            </g>
          );
        })}
        <text x="300" y="40" fill="#e0b44c" fontSize="14" textAnchor="middle" fontWeight="bold">
          VERKEHRSLASТ (kN/m)
        </text>

        {/* Roadway Plate (Fahrbahnplatte) */}
        <path
          d={`M 100,140 Q 300,${140 + plateSag * 2} 500,140`}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <text x="510" y="145" fill="#e9f2f6" fontSize="12">Fahrbahnplatte</text>

        {/* Girder (Binder) */}
        <path
          d={`M 100,160 Q 300,${160 + girderSag * 2} 500,160`}
          fill="none"
          stroke={girderColor}
          strokeWidth="14"
          strokeLinecap="round"
        />
        <text x="510" y="175 + girderSag" fill={girderColor} fontSize="12" fontWeight={stress > 0.8 ? 'bold' : 'normal'}>
          Binder {stress > 0.7 ? '(ÜBERLASTET)' : ''}
        </text>

        {/* Measurement Ticks for Deflection */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={100 + t * 400}
            y1="250"
            x2={100 + t * 400}
            y2="260"
            stroke="#e9f2f6"
            strokeWidth="1"
            opacity={0.4}
          />
        ))}

        {/* Stress Indicators */}
        {stress > 0.2 && (
          <g opacity={stress}>
            <circle cx="300" cy={160 + girderSag * 2} r={15 + stress * 10} fill="none" stroke="#d0523f" strokeWidth="2" strokeDasharray="4 2" />
            <text x="300" y={200 + girderSag * 2} fill="#d0523f" fontSize="14" textAnchor="middle">
              Max. Moment M_ed
            </text>
          </g>
        )}
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: 42,
            color: '#e9f2f6',
            fontWeight: 300,
            letterSpacing: '0.05em',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};