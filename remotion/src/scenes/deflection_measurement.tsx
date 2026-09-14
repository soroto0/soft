import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DeflectionMeasurementScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const intro = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bend = interpolate(frame, [span * 0.15, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labels = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const viewWidth = 800;
  const viewHeight = 450;
  const pillarX1 = 180;
  const pillarX2 = 620;
  const beamY = 200;
  const maxDeflection = 70;
  const currentDeflection = maxDeflection * bend;

  const gridLines = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        fill="none"
        style={{ overflow: 'visible' }}
      >
        {/* Grid / Reference Lines */}
        {gridLines.map((i) => (
          <line
            key={i}
            x1={pillarX1 - 40}
            y1={beamY + i * 25}
            x2={pillarX2 + 40}
            y2={beamY + i * 25}
            stroke="#e9f2f6"
            strokeWidth={0.5}
            strokeOpacity={0.2 * intro}
          />
        ))}

        {/* Pillars */}
        <g opacity={intro}>
          <rect x={pillarX1 - 20} y={beamY - 10} width={40} height={200} fill="#8a949b" stroke="#e9f2f6" strokeWidth={1} />
          <rect x={pillarX2 - 20} y={beamY - 10} width={40} height={200} fill="#8a949b" stroke="#e9f2f6" strokeWidth={1} />
          <text x={pillarX1} y={beamY + 220} fill="#e9f2f6" fontSize={14} textAnchor="middle" fontFamily="monospace">SÄULE 12</text>
          <text x={pillarX2} y={beamY + 220} fill="#e9f2f6" fontSize={14} textAnchor="middle" fontFamily="monospace">SÄULE 13</text>
        </g>

        {/* Null Line (Ideal State) */}
        <line
          x1={pillarX1}
          y1={beamY}
          x2={pillarX2}
          y2={beamY}
          stroke="#e9f2f6"
          strokeWidth={1.5}
          strokeDasharray="8 4"
          opacity={0.4 * intro}
        />

        {/* Deflected Beam (Stahlträger) */}
        <path
          d={`M ${pillarX1} ${beamY} Q ${(pillarX1 + pillarX2) / 2} ${beamY + currentDeflection} ${pillarX2} ${beamY}`}
          stroke="#e0b44c"
          strokeWidth={6}
          fill="none"
          opacity={intro}
        />
        <path
          d={`M ${pillarX1} ${beamY + 8} Q ${(pillarX1 + pillarX2) / 2} ${beamY + currentDeflection + 8} ${pillarX2} ${beamY + 8}`}
          stroke="#e0b44c"
          strokeWidth={2}
          fill="none"
          opacity={0.5 * intro}
        />

        {/* Measurement Dimensioning */}
        <g opacity={labels}>
          <line
            x1={(pillarX1 + pillarX2) / 2}
            y1={beamY}
            x2={(pillarX1 + pillarX2) / 2}
            y2={beamY + currentDeflection}
            stroke="#d0523f"
            strokeWidth={2}
          />
          <line x1={(pillarX1 + pillarX2) / 2 - 10} y1={beamY} x2={(pillarX1 + pillarX2) / 2 + 10} y2={beamY} stroke="#d0523f" strokeWidth={2} />
          <line x1={(pillarX1 + pillarX2) / 2 - 10} y1={beamY + currentDeflection} x2={(pillarX1 + pillarX2) / 2 + 10} y2={beamY + currentDeflection} stroke="#d0523f" strokeWidth={2} />
          
          <text
            x={(pillarX1 + pillarX2) / 2 + 20}
            y={beamY + currentDeflection / 2 + 5}
            fill="#d0523f"
            fontSize={22}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {bend > 0.9 ? "10.4 cm" : (bend * 10.4).toFixed(1) + " cm"}
          </text>
          
          <text
            x={(pillarX1 + pillarX2) / 2 + 20}
            y={beamY + currentDeflection / 2 + 25}
            fill="#d0523f"
            fontSize={12}
            fontFamily="monospace"
          >
            IST-ABWEICHUNG
          </text>
        </g>

        {/* Technical Callout */}
        <g opacity={labels}>
          <circle cx={pillarX1 + 100} cy={beamY + currentDeflection * 0.4} r={4} fill="#e9f2f6" />
          <line x1={pillarX1 + 100} y1={beamY + currentDeflection * 0.4} x2={pillarX1 + 60} y2={beamY - 60} stroke="#e9f2f6" strokeWidth={1} />
          <text x={pillarX1 + 60} y={beamY - 75} fill="#e9f2f6" fontSize={12} fontFamily="monospace">STAHLTRÄGER HEB-500</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            letterSpacing: '0.05em',
            opacity: labels,
            transform: `translateY(${(1 - labels) * 20}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};