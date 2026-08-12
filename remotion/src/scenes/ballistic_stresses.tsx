import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BallisticStressesScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const arcProgress = interpolate(frame, [span * 0.1, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lineProgress = interpolate(frame, [span * 0.5, span * 0.75], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const correctionAlpha = interpolate(frame, [span * 0.7, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.ease),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleMove = interpolate(frame, [0, span * 0.2], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const distanceTicks = [0, 1, 2, 3, 4, 5];
  const altTicks = [0, 1, 2, 3];

  // Path: M 120 360 Q 400 40 680 360 (Length approx 660)
  const pathLength = 660;
  // Observation Line: (160, 220) to (680, 360) (Length approx 538)
  const obsLineLength = 538;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.85}
        height={height * 0.85}
        viewBox="0 0 800 450"
        style={{ overflow: 'visible' }}
      >
        {/* Grid and Axes */}
        <line x1="80" y1="360" x2="720" y2="360" stroke="#e9f2f6" strokeWidth={1.5} />
        {distanceTicks.map((t) => (
          <g key={`dist-${t}`}>
            <line x1={120 + t * 112} y1={360} x2={120 + t * 112} y2={368} stroke="#e9f2f6" strokeWidth={1} />
            <text x={120 + t * 112} y={385} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={0.6}>
              {t * 2}km
            </text>
          </g>
        ))}
        {altTicks.map((a) => (
          <g key={`alt-${a}`}>
            <line x1={80} y1={360 - a * 80} x2={72} y2={360 - a * 80} stroke="#e9f2f6" strokeWidth={1} />
            <text x={65} y={363 - a * 80} fill="#e9f2f6" fontSize={10} textAnchor="end" opacity={0.6}>
              {a * 1000}m
            </text>
          </g>
        ))}

        {/* Artillery Piece */}
        <rect x={105} y={345} width={30} height={15} fill="#8a949b" />
        <line x1={120} y1={350} x2={145} y2={330} stroke="#8a949b" strokeWidth={4} />
        <text x={120} y={330} fill="#e9f2f6" fontSize={11} textAnchor="middle">BATERÍA</text>

        {/* Observation Point */}
        <rect x={150} y={220} width={20} height={140} fill="#e9f2f6" fillOpacity={0.1} stroke="#e9f2f6" strokeWidth={0.5} />
        <rect x={145} y={210} width={30} height={15} fill="#e9f2f6" />
        <text x={160} y={200} fill="#e9f2f6" fontSize={11} textAnchor="middle">OBSERVACIÓN</text>

        {/* Shell Path (The Arc) */}
        <path
          d="M 120 360 Q 400 40 680 360"
          fill="none"
          stroke="#8a949b"
          strokeWidth={3}
          strokeDasharray={pathLength}
          strokeDashoffset={pathLength * (1 - arcProgress)}
        />

        {/* Impact Marker */}
        <circle cx={680} cy={360} r={4 * arcProgress} fill="#d0523f" />
        <text x={680} y={345} fill="#d0523f" fontSize={11} textAnchor="middle" opacity={arcProgress}>IMPACTO</text>

        {/* Observation Hairline (Correction Signal) */}
        <line
          x1={160}
          y1={217}
          x2={680}
          y2={360}
          stroke="#e0b44c"
          strokeWidth={0.8}
          strokeDasharray={obsLineLength}
          strokeDashoffset={obsLineLength * (1 - lineProgress)}
        />

        {/* Correction Indicators */}
        <g opacity={correctionAlpha}>
          <path d="M 120 360 Q 400 80 640 360" fill="none" stroke="#e0b44c" strokeWidth={1} strokeDasharray="4 4" />
          <path d="M 680 360 L 645 360" stroke="#e0b44c" strokeWidth={2} markerEnd="url(#arrow)" />
          <text x={660} y={375} fill="#e0b44c" fontSize={10} textAnchor="middle">CORRECCIÓN</text>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#e0b44c" />
            </marker>
          </defs>
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            fontWeight: 300,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            transform: `translateY(${titleMove}px)`,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};