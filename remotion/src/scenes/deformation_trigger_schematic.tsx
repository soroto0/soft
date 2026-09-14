import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DeformationTriggerSchematicScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const bend = interpolate(frame, [span * 0.1, span * 0.8], [0, 1], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const snap = interpolate(frame, [span * 0.6, span * 0.65], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textAlpha = interpolate(frame, [0, span * 0.1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const beamY = 220;
  const maxDeflection = 80;
  const currentDeflection = bend * maxDeflection;
  const beamPath = `M 150 ${beamY} Q 400 ${beamY + currentDeflection} 650 ${beamY}`;

  const ticks = [0, 20, 40, 60, 80];
  const forces = [250, 400, 550];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 450"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>

        {/* Scale / Ticks */}
        <line x1="100" y1={beamY} x2="100" y2={beamY + 100} stroke="#e9f2f6" strokeWidth="1" opacity={0.4} />
        {ticks.map((t) => (
          <g key={t} opacity={textAlpha}>
            <line x1="95" y1={beamY + t} x2="105" y2={beamY + t} stroke="#e9f2f6" strokeWidth="1" />
            <text x="85" y={beamY + t + 3} fill="#e9f2f6" fontSize="10" textAnchor="end" fontFamily="monospace">
              {t}mm
            </text>
          </g>
        ))}
        <text x="70" y={beamY - 15} fill="#e9f2f6" fontSize="12" opacity={textAlpha}>DEFLECTION</text>

        {/* Main Beam */}
        <path
          d={beamPath}
          stroke="#8a949b"
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
        />
        <text x="150" y={beamY - 20} fill="#8a949b" fontSize="12" opacity={textAlpha}>STRUCTURAL BEAM (STEEL)</text>

        {/* Force Arrows */}
        {forces.map((f, i) => {
          const arrowBend = interpolate(f, [150, 400, 650], [0, 1, 0]);
          const yStart = 140;
          const yEnd = beamY + (currentDeflection * arrowBend) - 15;
          return (
            <g key={i} opacity={textAlpha * (1 - snap * 0.5)}>
              <line
                x1={f}
                y1={yStart}
                x2={f}
                y2={yEnd}
                stroke="#d0523f"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              {i === 1 && (
                <text x={f + 10} y={yStart + 20} fill="#d0523f" fontSize="12" fontWeight="bold">
                  LOAD
                </text>
              )}
            </g>
          );
        })}

        {/* Sensor Bracket */}
        <g transform={`translate(400, ${beamY + currentDeflection - 6})`}>
          <rect x="-15" y="0" width="30" height="12" fill="#e0b44c" rx="2" />
          <text x="20" y="8" fill="#e0b44c" fontSize="10" opacity={textAlpha}>SENSOR UNIT B-12</text>
        </g>

        {/* Snapping Cable */}
        <g opacity={textAlpha}>
          {snap < 1 ? (
            <line
              x1="400"
              y1="80"
              x2="400"
              y2={beamY + currentDeflection}
              stroke="#e0b44c"
              strokeWidth="2"
              strokeDasharray={snap > 0 ? "0" : "4 2"}
              opacity={1 - snap}
            />
          ) : null}
          
          {/* Snapped parts */}
          <line
            x1="400"
            y1="80"
            x2={400 + 15 * snap}
            y2={150 - 30 * snap}
            stroke="#e0b44c"
            strokeWidth="2"
            opacity={snap}
          />
          <line
            x1="400"
            y1={beamY + currentDeflection}
            x2={400 - 10 * snap}
            y2={beamY + currentDeflection - 30 * snap}
            stroke="#e0b44c"
            strokeWidth="2"
            opacity={snap}
          />
          <text x="410" y="120" fill="#e0b44c" fontSize="11" opacity={snap}>
            CABLE RUPTURE
          </text>
        </g>

        {/* Status Indicators */}
        <g transform="translate(550, 80)" opacity={textAlpha}>
          <rect x="0" y="0" width="120" height="40" stroke="#e9f2f6" strokeWidth="0.5" />
          <circle cx="15" cy="20" r="4" fill={snap > 0 ? "#d0523f" : "#8a949b"} />
          <text x="30" y="24" fill="#e9f2f6" fontSize="12">
            {snap > 0 ? "CRITICAL FAILURE" : "NOMINAL"}
          </text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: height * 0.1,
          fontFamily: 'monospace',
          fontSize: 40,
          color: '#e9f2f6',
          letterSpacing: '4px',
          opacity: textAlpha,
          transform: `translateY(${interpolate(textAlpha, [0, 1], [20, 0])}px)`
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};