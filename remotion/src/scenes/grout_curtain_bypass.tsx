import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GroutCurtainBypassScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const curtainDraw = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flowProgress = interpolate(frame, [span * 0.2, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelFade = interpolate(frame, [span * 0.5, span * 0.7], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fissures = [
    "M 380 280 L 395 320 L 385 360",
    "M 410 480 L 425 520 L 415 560",
    "M 490 580 L 510 610 L 530 590",
    "M 580 450 L 600 420 L 620 440",
    "M 350 500 L 370 530 L 360 560",
  ];

  const pathD = "M 150 300 L 350 300 L 380 350 L 420 580 L 550 580 L 580 350 L 610 300 L 850 300";

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 1000 800" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="rockHatch" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="20" stroke="#8a949b" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* Geological Context */}
        <rect x="100" y="100" width="800" height="600" fill="url(#rockHatch)" rx="4" />
        <text x="120" y="130" fill="#8a949b" fontSize="14" fontWeight="bold">BEDROCK FORMATION (FRACTURED)</text>

        {/* Grout Curtain */}
        <g opacity={curtainDraw}>
          <rect x="485" y="100" width="30" height="400" fill="#8a949b" opacity="0.8" />
          <line x1="500" y1="100" x2="500" y2="500" stroke="#e9f2f6" strokeWidth="2" strokeDasharray="8 4" />
          <text x="520" y="120" fill="#e9f2f6" fontSize="12">INTENDED GROUT CURTAIN</text>
          <text x="520" y="140" fill="#8a949b" fontSize="10">DEPTH: 300 FT</text>
          
          {/* Dimension Line */}
          <line x1="470" y1="100" x2="470" y2="500" stroke="#8a949b" strokeWidth="1" />
          <line x1="465" y1="100" x2="475" y2="100" stroke="#8a949b" strokeWidth="1" />
          <line x1="465" y1="500" x2="475" y2="500" stroke="#8a949b" strokeWidth="1" />
        </g>

        {/* Fissures */}
        {fissures.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#8a949b"
            strokeWidth="1.5"
            opacity={labelFade * 0.6}
          />
        ))}

        {/* Seepage Path */}
        <path
          d={pathD}
          fill="none"
          stroke="#e0b44c"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1200"
          strokeDashoffset={1200 * (1 - flowProgress)}
        />

        {/* Labels */}
        <g opacity={labelFade}>
          <text x="150" y="280" fill="#e9f2f6" fontSize="14" textAnchor="start">RESERVOIR PRESSURE</text>
          <text x="850" y="280" fill="#e9f2f6" fontSize="14" textAnchor="end">DOWNSTREAM EXIT</text>
          
          <g transform="translate(450, 620)">
            <path d="M 0 -10 L 30 -40" stroke="#d0523f" strokeWidth="1" fill="none" />
            <text x="35" y="-45" fill="#d0523f" fontSize="16" fontWeight="bold">UNMAPPED PATHWAY</text>
            <text x="35" y="-25" fill="#d0523f" fontSize="12">BYPASSING BARRIER BASE</text>
          </g>
        </g>

        {/* Scale Reference */}
        <g transform="translate(100, 720)">
          <line x1="0" y1="0" x2="100" y2="0" stroke="#e9f2f6" strokeWidth="2" />
          <line x1="0" y1="-5" x2="0" y2="5" stroke="#e9f2f6" strokeWidth="2" />
          <line x1="100" y1="-5" x2="100" y2="5" stroke="#e9f2f6" strokeWidth="2" />
          <text x="50" y="20" fill="#e9f2f6" fontSize="10" textAnchor="middle">100 FT</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: 42,
          color: '#e9f2f6',
          letterSpacing: '0.1em',
          opacity: labelFade,
          transform: `translateY(${interpolate(labelFade, [0, 1], [20, 0])}px)`
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};