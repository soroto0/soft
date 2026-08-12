import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WealthRedistributionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const drift = interpolate(frame, [span * 0.2, span * 0.8], [0, 160], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelOpacity = interpolate(frame, [span * 0.4, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const beneficiaries = [
    { name: 'HELENE', angle: 60, dx: 0.5, dy: 0.866, path: 'M 0 0 L 120 0 A 120 120 0 0 1 -60 103.92 Z' },
    { name: 'HERMINE', angle: 180, dx: -1, dy: 0, path: 'M 0 0 L -60 103.92 A 120 120 0 0 1 -60 -103.92 Z' },
    { name: 'PAUL', angle: 300, dx: 0.5, dy: -0.866, path: 'M 0 0 L -60 -103.92 A 120 120 0 0 1 120 0 Z' },
  ];

  const gridLines = [-2, -1, 0, 1, 2];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 800 600"
        style={{ overflow: 'visible' }}
      >
        <g transform="translate(400, 300)">
          {/* Background Grid */}
          {gridLines.map((l) => (
            <React.Fragment key={`grid-${l}`}>
              <line x1={-350} y1={l * 100} x2={350} y2={l * 100} stroke="#e9f2f6" strokeWidth={0.5} opacity={0.2} />
              <line x1={l * 150} y1={-250} x2={l * 150} y2={250} stroke="#e9f2f6" strokeWidth={0.5} opacity={0.2} />
            </React.Fragment>
          ))}

          {/* Original Boundary */}
          <circle cx={0} cy={0} r={120} fill="none" stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" opacity={0.4} />
          
          {/* Center Crosshair */}
          <line x1={-10} y1={0} x2={10} y2={0} stroke="#e0b44c" strokeWidth={1} />
          <line x1={0} y1={-10} x2={0} y2={10} stroke="#e0b44c" strokeWidth={1} />

          {/* Fragmenting Wealth */}
          {beneficiaries.map((b) => {
            const tx = b.dx * drift;
            const ty = b.dy * drift;
            return (
              <g key={b.name} transform={`translate(${tx}, ${ty})`}>
                <path
                  d={b.path}
                  fill="#7a8c7a"
                  stroke="#e9f2f6"
                  strokeWidth={1.5}
                />
                
                {/* Movement Vector Arrow */}
                <line 
                  x1={0} y1={0} 
                  x2={b.dx * 40} y2={b.dy * 40} 
                  stroke="#e0b44c" 
                  strokeWidth={2} 
                  opacity={labelOpacity}
                />

                {/* Beneficiary Label */}
                <g transform={`translate(${b.dx * 160}, ${b.dy * 160})`} opacity={labelOpacity}>
                  <text
                    fill="#e9f2f6"
                    fontSize={14}
                    fontFamily="monospace"
                    textAnchor="middle"
                    style={{ letterSpacing: 2 }}
                  >
                    {b.name}
                  </text>
                  <text
                    y={18}
                    fill="#e0b44c"
                    fontSize={10}
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    33.3% SHARE
                  </text>
                  <line x1={-30} y1={25} x2={30} y2={25} stroke="#e9f2f6" strokeWidth={0.5} />
                </g>
              </g>
            );
          })}

          {/* Archival Annotations */}
          <text x={-380} y={-260} fill="#e9f2f6" fontSize={10} fontFamily="monospace" opacity={0.6}>
            REF_ID: PATRIMONIO_1894_SEC
          </text>
          <text x={380} y={280} fill="#e9f2f6" fontSize={10} fontFamily="monospace" textAnchor="end" opacity={0.6}>
            STATUS: DISTRIBUTED
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 40,
            transform: `translateY(${titleY}px)`,
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 42,
            color: '#e9f2f6',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            borderBottom: '1px solid #e0b44c',
            paddingBottom: 8,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};