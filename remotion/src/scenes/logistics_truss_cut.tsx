import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LogisticsTrussCutScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const beamDraw = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cutAction = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const separation = interpolate(frame, [span * 0.55, span * 0.85], [0, 40], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelsAlpha = interpolate(frame, [span * 0.7, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const trussIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const beamY = 450;
  const beamHeight = 60;
  const beamWidth = 700;
  const centerX = 500;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 1000 1000"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="beamGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" stopOpacity={0.2} />
            <stop offset="0.5" stopColor="#e9f2f6" stopOpacity={0.05} />
            <stop offset="1" stopColor="#e9f2f6" stopOpacity={0.2} />
          </linearGradient>
        </defs>

        {/* Left Half */}
        <g transform={`translate(${-separation}, 0)`}>
          <rect
            x={centerX - beamWidth / 2}
            y={beamY}
            width={(beamWidth / 2) * beamDraw}
            height={beamHeight}
            stroke="#e9f2f6"
            strokeWidth={2}
            fill="url(#beamGrad)"
          />
          {trussIndices.slice(0, 5).map((i) => (
            <line
              key={`truss-l-${i}`}
              x1={centerX - beamWidth / 2 + i * 70}
              y1={beamY + beamHeight}
              x2={centerX - beamWidth / 2 + (i + 1) * 70}
              y2={beamY}
              stroke="#e9f2f6"
              strokeWidth={1.5}
              opacity={beamDraw}
            />
          ))}
          {/* Dimension 8.5m Left */}
          <g opacity={labelsAlpha}>
            <line x1={centerX - beamWidth / 2} y1={beamY + 120} x2={centerX} y2={beamY + 120} stroke="#e0b44c" strokeWidth={2} />
            <line x1={centerX - beamWidth / 2} y1={beamY + 110} x2={centerX - beamWidth / 2} y2={beamY + 130} stroke="#e0b44c" strokeWidth={2} />
            <line x1={centerX} y1={beamY + 110} x2={centerX} y2={beamY + 130} stroke="#e0b44c" strokeWidth={2} />
            <text x={centerX - beamWidth / 4} y={beamY + 155} fill="#e0b44c" fontSize={24} textAnchor="middle" fontFamily="monospace">8.5m</text>
          </g>
        </g>

        {/* Right Half */}
        <g transform={`translate(${separation}, 0)`}>
          <rect
            x={centerX}
            y={beamY}
            width={(beamWidth / 2) * beamDraw}
            height={beamHeight}
            stroke="#e9f2f6"
            strokeWidth={2}
            fill="url(#beamGrad)"
          />
          {trussIndices.slice(5).map((i) => (
            <line
              key={`truss-r-${i}`}
              x1={centerX + (i - 5) * 70}
              y1={beamY + beamHeight}
              x2={centerX + (i - 4) * 70}
              y2={beamY}
              stroke="#e9f2f6"
              strokeWidth={1.5}
              opacity={beamDraw}
            />
          ))}
          {/* Dimension 8.5m Right */}
          <g opacity={labelsAlpha}>
            <line x1={centerX} y1={beamY + 120} x2={centerX + beamWidth / 2} y2={beamY + 120} stroke="#e0b44c" strokeWidth={2} />
            <line x1={centerX} y1={beamY + 110} x2={centerX} y2={beamY + 130} stroke="#e0b44c" strokeWidth={2} />
            <line x1={centerX + beamWidth / 2} y1={beamY + 110} x2={centerX + beamWidth / 2} y2={beamY + 130} stroke="#e0b44c" strokeWidth={2} />
            <text x={centerX + beamWidth / 4} y={beamY + 155} fill="#e0b44c" fontSize={24} textAnchor="middle" fontFamily="monospace">8.5m</text>
          </g>
        </g>

        {/* Initial Dimension 17m */}
        <g opacity={1 - labelsAlpha}>
          <line x1={centerX - beamWidth / 2} y1={beamY - 60} x2={centerX + beamWidth / 2} y2={beamY - 60} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 4" />
          <text x={centerX} y={beamY - 80} fill="#e9f2f6" fontSize={20} textAnchor="middle" fontFamily="monospace" opacity={beamDraw}>TOTAL: 17.0m</text>
        </g>

        {/* Cut Line */}
        <line
          x1={centerX}
          y1={beamY - 40}
          x2={centerX}
          y2={beamY + beamHeight + 40}
          stroke="#d0523f"
          strokeWidth={3}
          strokeDasharray="10 5"
          strokeDashoffset={cutAction * 50}
          opacity={cutAction}
        />
        <circle cx={centerX} cy={beamY + (beamHeight + 80) * cutAction - 40} r={6} fill="#d0523f" opacity={cutAction} />
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            letterSpacing: '0.2em',
            fontWeight: 300,
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};