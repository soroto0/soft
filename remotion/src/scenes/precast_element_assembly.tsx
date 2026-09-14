import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PrecastElementAssemblyScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const slabY = interpolate(frame, [0, span * 0.4], [120, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const girderY = interpolate(frame, [span * 0.2, span * 0.6], [160, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const concreteY = interpolate(frame, [span * 0.4, span * 0.8], [200, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const labelAlpha = interpolate(frame, [span * 0.7, span * 0.95], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(frame, [0, span * 0.3], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const ballIndices = [0, 1, 2, 3];
  const girderIndices = [0, 1, 2];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="70%" viewBox="0 0 800 600" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="concretePattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#e9f2f6" opacity="0.3" />
            <path d="M 10 0 L 20 10 M 0 10 L 10 20" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.2" />
          </pattern>
        </defs>

        {/* Ortbeton (Upper Layer) */}
        <g transform={`translate(0, ${concreteY - 100})`}>
          <rect x="150" y="180" width="500" height="140" fill="url(#concretePattern)" stroke="#e9f2f6" strokeWidth="1" opacity={0.6} />
          <line x1="650" y1="250" x2="720" y2="200" stroke="#e9f2f6" strokeWidth="1" opacity={labelAlpha} />
          <text x="725" y="200" fill="#e9f2f6" fontSize="14" dominantBaseline="middle" opacity={labelAlpha}>Ortbeton (Aufbeton)</text>
        </g>

        {/* Gitterträger & Kugeln (Middle Layer) */}
        <g transform={`translate(0, ${girderY})`}>
          {girderIndices.map((i) => (
            <path
              key={`girder-${i}`}
              d={`M ${200 + i * 180} 380 L ${245 + i * 180} 300 L ${290 + i * 180} 380`}
              fill="none"
              stroke="#e9f2f6"
              strokeWidth="3"
            />
          ))}
          {ballIndices.map((i) => (
            <circle
              key={`ball-${i}`}
              cx={245 + i * 100}
              cy="350"
              r="25"
              fill="#e0b44c"
              stroke="#e9f2f6"
              strokeWidth="1"
            />
          ))}
          <line x1="245" y1="350" x2="100" y2="300" stroke="#e9f2f6" strokeWidth="1" opacity={labelAlpha} />
          <text x="95" y="300" fill="#e9f2f6" fontSize="14" textAnchor="end" dominantBaseline="middle" opacity={labelAlpha}>Gitterträger & Hohlkörper</text>
        </g>

        {/* Fertigteilplatte (Bottom Layer) */}
        <g transform={`translate(0, ${slabY})`}>
          <rect x="150" y="380" width="500" height="40" fill="#8a949b" stroke="#e9f2f6" strokeWidth="1.5" />
          <line x1="150" y1="400" x2="80" y2="450" stroke="#e9f2f6" strokeWidth="1" opacity={labelAlpha} />
          <text x="75" y="450" fill="#e9f2f6" fontSize="14" textAnchor="end" dominantBaseline="middle" opacity={labelAlpha}>Fertigteilplatte (5-7 cm)</text>
          
          {/* Dimension indicator */}
          <g opacity={labelAlpha}>
            <line x1="660" y1="380" x2="680" y2="380" stroke="#e0b44c" strokeWidth="1" />
            <line x1="660" y1="420" x2="680" y2="420" stroke="#e0b44c" strokeWidth="1" />
            <line x1="670" y1="380" x2="670" y2="420" stroke="#e0b44c" strokeWidth="1" />
            <text x="685" y="405" fill="#e0b44c" fontSize="12" dominantBaseline="middle">~6 cm</text>
          </g>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          transform: `translateY(${titleY}px)`,
          fontFamily: 'sans-serif',
          fontSize: 32,
          color: '#e9f2f6',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          borderBottom: '2px solid #e0b44c',
          paddingBottom: 8
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};