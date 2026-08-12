import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LateralSoilDisplacementScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const pressure = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [span * 0.2, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const heave = interpolate(frame, [span * 0.4, span], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressureArrows = [0, 1, 2, 3, 4];
  const flowVectors = [
    { x: 220, y: 330, scale: 1.0 },
    { x: 300, y: 340, scale: 1.1 },
    { x: 380, y: 350, scale: 1.2 },
    { x: 460, y: 345, scale: 1.3 },
    { x: 540, y: 330, scale: 1.4 },
    { x: 600, y: 310, scale: 1.5 },
  ];

  const soilColor = '#e0b44c';
  const softSoilColor = '#c9d3d9';
  const bedrockColor = '#5d6a73';
  const accentColor = '#d0523f';
  const textColor = '#e9f2f6';

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: width * 0.8, height: height * 0.8, position: 'relative' }}>
        <svg
          viewBox="0 0 800 500"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill={accentColor} />
            </marker>
            <marker
              id="arrowhead-white"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill={textColor} />
            </marker>
          </defs>

          {/* Bedrock Layer */}
          <rect x="50" y="420" width="700" height="60" fill={bedrockColor} opacity={0.4} />
          <line x1="50" y1="420" x2="750" y2="420" stroke={textColor} strokeWidth="1" strokeDasharray="4 2" />
          <text x="60" y="455" fill={textColor} fontSize="12" fontWeight="bold">FESTGESTEIN</text>

          {/* Soft Soil Layer */}
          <path
            d={`M 50 300 L 600 300 L 600 ${300 - heave * 40} Q 650 ${280 - heave * 50} 700 ${300 - heave * 20} L 700 420 L 50 420 Z`}
            fill={softSoilColor}
            stroke={textColor}
            strokeWidth="1.5"
          />
          <text x="60" y="380" fill="#2a3033" fontSize="14" fontWeight="bold">WEICHER UNTERGRUND</text>

          {/* Embankment (Erdwall) */}
          <path
            d="M 100 150 L 350 150 L 450 300 L 100 300 Z"
            fill={soilColor}
            stroke={textColor}
            strokeWidth="2"
          />
          <text x="120" y="230" fill="#2a3033" fontSize="16" fontWeight="bold">AUFSCHÜTTUNG (LAST)</text>

          {/* Pressure Arrows */}
          {pressureArrows.map((i) => (
            <g key={`press-${i}`} opacity={pressure}>
              <line
                x1={140 + i * 50}
                y1={80 + (1 - pressure) * 20}
                x2={140 + i * 50}
                y2={140}
                stroke={accentColor}
                strokeWidth="3"
                markerEnd="url(#arrowhead)"
              />
            </g>
          ))}

          {/* Flow Vectors */}
          {flowVectors.map((v, i) => (
            <g key={`flow-${i}`} transform={`translate(${flow * 30 * v.scale}, ${-heave * 15 * (i / 2)})`}>
              <line
                x1={v.x}
                y1={v.y}
                x2={v.x + 50 * v.scale}
                y2={v.y - (i > 3 ? heave * 20 : 0)}
                stroke={accentColor}
                strokeWidth="2.5"
                markerEnd="url(#arrowhead)"
                opacity={0.2 + flow * 0.8}
              />
            </g>
          ))}

          {/* Excavation Pit Label */}
          <g transform="translate(620, 180)">
            <line x1="0" y1="0" x2="0" y2="100" stroke={textColor} strokeWidth="2" strokeDasharray="5 5" />
            <text x="10" y="50" fill={textColor} fontSize="14" style={{ fontStyle: 'italic' }}>
              OFFENE BAUGRUBE
            </text>
            <text x="10" y="70" fill={textColor} fontSize="10">
              (FEHLENDER WIDERSTAND)
            </text>
          </g>

          {/* Scale/Ticks */}
          {[0, 1, 2, 3, 4].map((t) => (
            <g key={`tick-${t}`}>
              <line x1={50 + t * 175} y1={480} x2={50 + t * 175} y2={490} stroke={textColor} strokeWidth="1" />
              <text x={50 + t * 175} y={505} fill={textColor} fontSize="10" textAnchor="middle">{t * 10}m</text>
            </g>
          ))}
        </svg>

        {p.title ? (
          <div
            style={{
              position: 'absolute',
              bottom: '5%',
              width: '100%',
              textAlign: 'center',
              fontFamily: 'sans-serif',
              fontSize: 42,
              fontWeight: 800,
              color: textColor,
              letterSpacing: '0.1em',
              transform: `translateY(${titleRise}px)`,
              textShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            {p.title}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};