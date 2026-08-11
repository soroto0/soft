import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LateralWindPressureScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const bow = interpolate(frame, [0, span], [0, 75], {
    easing: Easing.out(Easing.quad),
    extrapolateRight: 'clamp',
  });

  const stress = interpolate(frame, [span * 0.2, span], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: 'clamp',
  });

  const solidity = interpolate(frame, [0, span * 0.5], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const windPulse = interpolate(frame % 20, [0, 20], [0, 15]);

  const windVectors = [0, 1, 2, 3, 4, 5, 6, 7];
  const scaleTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <AbsoluteFill style={{ 
      opacity, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 800 500"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker
            id="arrow-grey"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#8a949b" />
          </marker>
          <marker
            id="arrow-amber"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Wind Vectors */}
        {windVectors.map((i) => (
          <line
            key={`wind-${i}`}
            x1={100 + i * 85}
            y1={50 + windPulse}
            x2={100 + i * 85}
            y2={180 + windPulse}
            stroke="#8a949b"
            strokeWidth={2}
            markerEnd="url(#arrow-grey)"
            opacity={0.6}
          />
        ))}

        {/* Frame Anchors */}
        <rect x={80} y={220} width={40} height={60} fill="#c9d3d9" stroke="#e9f2f6" strokeWidth={1} />
        <rect x={680} y={220} width={40} height={60} fill="#c9d3d9" stroke="#e9f2f6" strokeWidth={1} />
        <text x={100} y={300} fill="#8a949b" fontSize={10} textAnchor="middle">FRAME A</text>
        <text x={700} y={300} fill="#8a949b" fontSize={10} textAnchor="middle">FRAME B</text>

        {/* Mesh / Sail */}
        <path
          d={`M 120 250 Q 400 ${250 + bow} 680 250`}
          fill={solidity > 0.5 ? "#e9f2f6" : "none"}
          fillOpacity={solidity * 0.15}
          stroke="#e9f2f6"
          strokeWidth={3}
          strokeDasharray={solidity > 0.8 ? "0" : "8 4"}
        />
        <text x={400} y={230 + bow} fill="#e9f2f6" fontSize={12} textAnchor="middle" opacity={solidity}>
          {solidity > 0.8 ? "SOLID SAIL" : "POROUS MESH"}
        </text>

        {/* Weld Points */}
        <circle cx={120} cy={250} r={6} fill="#d0523f" opacity={stress} />
        <circle cx={680} cy={250} r={6} fill="#d0523f" opacity={stress} />
        <text x={120} y={235} fill="#d0523f" fontSize={9} textAnchor="end" opacity={stress}>1980s WELD</text>
        <text x={680} y={235} fill="#d0523f" fontSize={9} textAnchor="start" opacity={stress}>1980s WELD</text>

        {/* Stress Arrows */}
        <path
          d={`M 70 200 L 110 240`}
          stroke="#e0b44c"
          strokeWidth={3 * stress}
          markerEnd="url(#arrow-amber)"
          opacity={stress}
        />
        <path
          d={`M 70 300 L 110 260`}
          stroke="#e0b44c"
          strokeWidth={3 * stress}
          markerEnd="url(#arrow-amber)"
          opacity={stress}
        />
        <path
          d={`M 730 200 L 690 240`}
          stroke="#e0b44c"
          strokeWidth={3 * stress}
          markerEnd="url(#arrow-amber)"
          opacity={stress}
        />
        <path
          d={`M 730 300 L 690 260`}
          stroke="#e0b44c"
          strokeWidth={3 * stress}
          markerEnd="url(#arrow-amber)"
          opacity={stress}
        />

        {/* Load Scale */}
        <g transform="translate(200, 420)">
          <line x1={0} y1={0} x2={400} y2={0} stroke="#e9f2f6" strokeWidth={1} />
          {scaleTicks.map((t) => (
            <g key={t} transform={`translate(${t * 400}, 0)`}>
              <line x1={0} y1={0} x2={0} y2={8} stroke="#e9f2f6" strokeWidth={1} />
              <text y={20} fill="#e9f2f6" fontSize={10} textAnchor="middle">{t.toFixed(1)}</text>
            </g>
          ))}
          <rect x={0} y={-10} width={stress * 400} height={6} fill="#e0b44c" opacity={0.8} />
          <text x={200} y={-20} fill="#e0b44c" fontSize={12} textAnchor="middle">
            LATERAL PRESSURE: {Math.round(stress * 4200)} LBF
          </text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          fontFamily: 'monospace',
          fontSize: 32,
          color: '#e9f2f6',
          letterSpacing: '0.1em',
          borderTop: '1px solid #e9f2f6',
          paddingTop: 10
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};