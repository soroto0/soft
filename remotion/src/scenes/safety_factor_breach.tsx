import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SafetyFactorBreachScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const load = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sag = interpolate(frame, [span * 0.2, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const info = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const panelW = width * 0.35;
  const panelH = height * 0.4;
  const centerY = height * 0.5;
  const leftX = width * 0.12;
  const rightX = width * 0.53;

  const meshRows = [0.2, 0.4, 0.6, 0.8];
  const meshCols = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>

        {/* Left Panel: Standard */}
        <g transform={`translate(${leftX}, ${centerY - panelH / 2})`}>
          <text x={panelW / 2} y={-40} fill="#e9f2f6" fontSize={24} textAnchor="middle" opacity={info}>
            DESIGN SPECIFICATION
          </text>
          {/* Frame */}
          <rect x={0} y={0} width={panelW} height={panelH} fill="none" stroke="#8a949b" strokeWidth={2} />
          <line x1={0} y1={0} x2={panelW} y2={0} stroke="#e9f2f6" strokeWidth={6} />
          
          {/* Mesh */}
          {meshRows.map((r) => (
            <path
              key={`r1-${r}`}
              d={`M 0 ${r * panelH} Q ${panelW / 2} ${r * panelH + 5 * sag} ${panelW} ${r * panelH}`}
              stroke="#8a949b"
              strokeWidth={1}
              fill="none"
            />
          ))}
          {meshCols.map((c) => (
            <line
              key={`c1-${c}`}
              x1={c * panelW}
              y1={0}
              x2={c * panelW}
              y2={panelH}
              stroke="#8a949b"
              strokeWidth={1}
            />
          ))}

          {/* Load: Human Icon */}
          <g opacity={load} transform={`translate(${panelW / 2}, -10)`}>
            <circle cx={0} cy={-60} r={12} fill="#8a949b" />
            <line x1={0} y1={-48} x2={0} y2={-20} stroke="#8a949b" strokeWidth={4} />
            <line x1={0} y1={-40} x2={-15} y2={-25} stroke="#8a949b" strokeWidth={3} />
            <line x1={0} y1={-40} x2={15} y2={-25} stroke="#8a949b" strokeWidth={3} />
            <text x={0} y={-85} fill="#e9f2f6" fontSize={20} textAnchor="middle" fontWeight="bold">80 kg</text>
            <line x1={0} y1={10} x2={0} y2={40} stroke="#d0523f" strokeWidth={2} markerEnd="url(#arrowhead)" />
          </g>
        </g>

        {/* Right Panel: Breach */}
        <g transform={`translate(${rightX}, ${centerY - panelH / 2})`}>
          <text x={panelW / 2} y={-40} fill="#d0523f" fontSize={24} textAnchor="middle" opacity={info}>
            ACTUAL LOADING
          </text>
          {/* Frame */}
          <rect x={0} y={0} width={panelW} height={panelH} fill="none" stroke="#8a949b" strokeWidth={2} />
          {/* Sagging Top Rail */}
          <path
            d={`M 0 0 Q ${panelW / 2} ${25 * sag} ${panelW} 0`}
            stroke="#e9f2f6"
            strokeWidth={6}
            fill="none"
          />
          
          {/* Sagging Mesh */}
          {meshRows.map((r) => (
            <path
              key={`r2-${r}`}
              d={`M 0 ${r * panelH} Q ${panelW / 2} ${r * panelH + 80 * sag} ${panelW} ${r * panelH}`}
              stroke="#e0b44c"
              strokeWidth={1.5}
              fill="none"
            />
          ))}
          {meshCols.map((c) => (
            <path
              key={`c2-${c}`}
              d={`M ${c * panelW} ${interpolate(c, [0, 0.5, 1], [0, 25 * sag, 0])} L ${c * panelW} ${panelH}`}
              stroke="#e0b44c"
              strokeWidth={1}
              fill="none"
            />
          ))}

          {/* Load: 500kg Block */}
          <g opacity={load} transform={`translate(${panelW / 2 - 40}, ${-70 + 15 * sag})`}>
            <rect x={0} y={0} width={80} height={60} fill="#e0b44c" stroke="#e9f2f6" strokeWidth={2} />
            <text x={40} y={35} fill="#1a1a1a" fontSize={18} textAnchor="middle" fontWeight="bold">500 kg</text>
            <text x={40} y={-15} fill="#d0523f" fontSize={20} textAnchor="middle" fontWeight="bold" opacity={info}>+525%</text>
            {/* Force Arrows */}
            {[15, 40, 65].map((ax) => (
              <line
                key={ax}
                x1={ax}
                y1={70}
                x2={ax}
                y2={110 + 20 * sag}
                stroke="#d0523f"
                strokeWidth={3}
                markerEnd="url(#arrowhead)"
              />
            ))}
          </g>
        </g>

        {/* Caption */}
        {p.title && (
          <text
            x={width / 2}
            y={height * 0.9}
            fill="#e9f2f6"
            fontSize={42}
            textAnchor="middle"
            style={{ fontFamily: 'monospace', letterSpacing: '4px' }}
            opacity={info}
          >
            {p.title.toUpperCase()}
          </text>
        )}
      </svg>
    </AbsoluteFill>
  );
};