import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PorePressureMapScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const pressure = interpolate(frame, [0, span], [0.5, 1.4], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateRight: 'clamp',
  });

  const failure = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const wobble = Math.sin(frame * 0.25) * 4 * failure;

  const gridRows = [0, 1, 2, 3, 4, 5];
  const gridCols = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 800 500"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <filter id="wobbleFilter">
            <feGaussianBlur in="SourceGraphic" stdDeviation={failure * 2} />
          </filter>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
          <marker id="arrowhead-danger" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
        </defs>

        {/* Dam Shell Outline */}
        <path
          d="M 50 450 L 300 100 L 500 100 L 750 450 Z"
          stroke="#e9f2f6"
          strokeWidth="2"
          strokeDasharray="8 4"
          opacity={0.3}
        />

        {/* Core Structure */}
        <path
          d={`M 280 450 L 380 100 L 420 100 L 520 450 Z`}
          fill="#e9f2f6"
          fillOpacity={0.05}
          stroke="#e9f2f6"
          strokeWidth="1.5"
        />

        {/* Failure Zone (Wackelpudding) */}
        <path
          d={`M ${350 + wobble} 350 Q 400 ${250 + wobble} 450 350 T 350 350`}
          fill="#d0523f"
          fillOpacity={failure * 0.4}
          stroke="#d0523f"
          strokeWidth={2}
          opacity={failure}
          filter="url(#wobbleFilter)"
        />

        {/* Grid and Pressure Vectors */}
        {gridRows.map((r) => {
          const y = 450 - r * 60;
          const rowWidth = 240 - r * 35;
          const xStart = 400 - rowWidth / 2;
          
          return (
            <g key={`row-${r}`}>
              <line 
                x1={xStart} y1={y} x2={xStart + rowWidth} y2={y} 
                stroke="#e9f2f6" strokeWidth="0.5" opacity={0.4} 
              />
              {gridCols.map((c) => {
                const x = xStart + (c * rowWidth) / 4;
                const angle = Math.atan2(y - 250, x - 400);
                const vecLen = 15 * pressure;
                const dx = Math.cos(angle) * vecLen;
                const dy = Math.sin(angle) * vecLen;
                
                return (
                  <g key={`cell-${r}-${c}`}>
                    <circle cx={x} cy={y} r="1.5" fill="#e9f2f6" opacity={0.6} />
                    <line
                      x1={x}
                      y1={y}
                      x2={x + dx}
                      y2={y + dy}
                      stroke={failure > 0.5 && r > 1 && r < 4 ? "#d0523f" : "#e0b44c"}
                      strokeWidth="2"
                      markerEnd={failure > 0.5 && r > 1 && r < 4 ? "url(#arrowhead-danger)" : "url(#arrowhead)"}
                      opacity={pressure * 0.8}
                    />
                    {/* Density increase: extra arrows appearing */}
                    {failure > 0.3 && (
                      <line
                        x1={x}
                        y1={y}
                        x2={x - dx * 0.5}
                        y2={y - dy * 0.5}
                        stroke="#d0523f"
                        strokeWidth="1"
                        opacity={failure * 0.5}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Labels */}
        <text x="150" y="470" fill="#e9f2f6" fontSize="12" opacity="0.6">WASSERSEITE</text>
        <text x="650" y="470" fill="#e9f2f6" fontSize="12" opacity="0.6" textAnchor="end">LUFTSEITE</text>
        <text x="400" y="90" fill="#e9f2f6" fontSize="14" textAnchor="middle" fontWeight="bold">DAMMKERN</text>
        
        {/* Pressure Scale */}
        <g transform="translate(650, 150)">
          <text x="0" y="-10" fill="#e9f2f6" fontSize="10">DRUCK (kPa)</text>
          {[0, 1, 2, 3].map((t) => (
            <g key={t} transform={`translate(0, ${t * 20})`}>
              <rect width="15" height="15" fill={t > 1 ? "#d0523f" : "#e0b44c"} opacity={0.3 + t * 0.2} />
              <text x="20" y="12" fill="#e9f2f6" fontSize="10">{t * 250}</text>
            </g>
          ))}
        </g>
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
            fontWeight: 700,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};