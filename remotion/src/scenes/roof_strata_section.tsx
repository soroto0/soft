import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RoofStrataSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const reveal = interpolate(frame, [0, span * 0.35], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const force = interpolate(frame, [span * 0.3, span * 0.65], [0, 1], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.5, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'humus', h: 90, fill: '#3d4449', label: 'HUMUS (NASS)', thickness: '350mm' },
    { id: 'drain', h: 15, fill: '#5d6a73', label: 'DRAINAGESCHICHT', thickness: '40mm' },
    { id: 'concrete', h: 55, fill: '#c9d3d9', label: 'STAHLBETONPLATTE', thickness: '220mm' },
  ];

  let currentY = 60;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 500 350" style={{ overflow: 'visible' }}>
        {/* Dimension Line */}
        <g opacity={reveal}>
          <line x1={60} y1={60} x2={60} y2={220} stroke="#e9f2f6" strokeWidth={1.5} />
          <line x1={55} y1={60} x2={65} y2={60} stroke="#e9f2f6" strokeWidth={1.5} />
          <line x1={55} y1={220} x2={65} y2={220} stroke="#e9f2f6" strokeWidth={1.5} />
          <text x={50} y={145} fill="#e9f2f6" fontSize={12} textAnchor="end" transform="rotate(-90, 50, 145)">
            GESAMT: 610mm
          </text>
        </g>

        {/* Strata Layers */}
        {layers.map((layer, i) => {
          const yPos = currentY;
          currentY += layer.h;
          return (
            <g key={layer.id}>
              <rect
                x={80}
                y={yPos + (1 - reveal) * 50}
                width={340}
                height={layer.h * reveal}
                fill={layer.fill}
                stroke="#e9f2f6"
                strokeWidth={0.5}
                opacity={reveal}
              />
              {/* Leader lines and labels */}
              <g opacity={labelAlpha}>
                <line
                  x1={420}
                  y1={yPos + layer.h / 2}
                  x2={440}
                  y2={yPos + layer.h / 2}
                  stroke="#e9f2f6"
                  strokeWidth={1}
                />
                <text x={445} y={yPos + layer.h / 2 + 4} fill="#e9f2f6" fontSize={10} fontWeight="bold">
                  {layer.label}
                </text>
                <text x={445} y={yPos + layer.h / 2 + 16} fill="#8a949b" fontSize={9}>
                  {layer.thickness}
                </text>
              </g>
            </g>
          );
        })}

        {/* Force Arrow (500t) */}
        <g opacity={force} style={{ transform: `translateY(${force * 10}px)` }}>
          <path
            d="M 250,10 L 250,130 M 235,115 L 250,135 L 265,115"
            fill="none"
            stroke="#e0b44c"
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x={210} y={40} width={80} height={30} fill="#e0b44c" rx={4} />
          <text
            x={250}
            y={61}
            fill="#1a1a1a"
            fontSize={18}
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            500t
          </text>
          <text x={250} y={85} fill="#e0b44c" fontSize={12} textAnchor="middle" fontWeight="bold">
            DRUCKLAST
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            letterSpacing: '0.1em',
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
            opacity: labelAlpha,
          }}
        >
          {p.title}
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            letterSpacing: '0.1em',
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
            opacity: labelAlpha,
          }}
        >
          QUERSCHNITT DACHAUFBAU
        </div>
      )}
    </AbsoluteFill>
  );
};