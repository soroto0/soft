import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TrussModificationDiagramScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const draw = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cutProgress = interpolate(frame, [span * 0.25, span * 0.45], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const split = interpolate(frame, [span * 0.55, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dimAlpha = interpolate(frame, [span * 0.6, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const trussWidth = 600;
  const trussHeight = 60;
  const segments = [0, 1, 2, 3, 4, 5, 6, 7];
  const splitGap = split * 40;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.6}
        viewBox="0 0 800 400"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Left Half */}
        <g transform={`translate(${400 - trussWidth / 2 - splitGap / 2}, 200)`} opacity={draw}>
          <rect x={0} y={0} width={trussWidth / 2} height={trussHeight} fill="none" stroke="#e9f2f6" strokeWidth={2} />
          {segments.slice(0, 4).map((s) => (
            <g key={`l-seg-${s}`}>
              <line x1={s * 75} y1={0} x2={(s + 1) * 75} y2={trussHeight} stroke="#e9f2f6" strokeWidth={1} opacity={0.6} />
              <line x1={(s + 1) * 75} y1={0} x2={s * 75} y2={trussHeight} stroke="#e9f2f6" strokeWidth={1} opacity={0.6} />
              <circle cx={s * 75} cy={0} r={2} fill="#e9f2f6" />
              <circle cx={s * 75} cy={trussHeight} r={2} fill="#e9f2f6" />
            </g>
          ))}
          <circle cx={trussWidth / 2} cy={0} r={2} fill="#e9f2f6" />
          <circle cx={trussWidth / 2} cy={trussHeight} r={2} fill="#e9f2f6" />
          
          {/* Left Dimension */}
          <g opacity={dimAlpha}>
            <line x1={0} y1={trussHeight + 40} x2={trussWidth / 2} y2={trussHeight + 40} stroke="#e0b44c" strokeWidth={1.5} />
            <line x1={0} y1={trussHeight + 35} x2={0} y2={trussHeight + 45} stroke="#e0b44c" strokeWidth={1.5} />
            <line x1={trussWidth / 2} y1={trussHeight + 35} x2={trussWidth / 2} y2={trussHeight + 45} stroke="#e0b44c" strokeWidth={1.5} />
            <text x={trussWidth / 4} y={trussHeight + 65} fill="#e0b44c" fontSize={14} textAnchor="middle" fontFamily="monospace">9.00m</text>
          </g>
        </g>

        {/* Right Half */}
        <g transform={`translate(${400 + splitGap / 2}, 200)`} opacity={draw}>
          <rect x={0} y={0} width={trussWidth / 2} height={trussHeight} fill="none" stroke="#e9f2f6" strokeWidth={2} />
          {segments.slice(4).map((s, i) => (
            <g key={`r-seg-${s}`}>
              <line x1={i * 75} y1={0} x2={(i + 1) * 75} y2={trussHeight} stroke="#e9f2f6" strokeWidth={1} opacity={0.6} />
              <line x1={(i + 1) * 75} y1={0} x2={i * 75} y2={trussHeight} stroke="#e9f2f6" strokeWidth={1} opacity={0.6} />
              <circle cx={(i + 1) * 75} cy={0} r={2} fill="#e9f2f6" />
              <circle cx={(i + 1) * 75} cy={trussHeight} r={2} fill="#e9f2f6" />
            </g>
          ))}
          <circle cx={0} cy={0} r={2} fill="#e9f2f6" />
          <circle cx={0} cy={trussHeight} r={2} fill="#e9f2f6" />

          {/* Right Dimension */}
          <g opacity={dimAlpha}>
            <line x1={0} y1={trussHeight + 40} x2={trussWidth / 2} y2={trussHeight + 40} stroke="#e0b44c" strokeWidth={1.5} />
            <line x1={0} y1={trussHeight + 35} x2={0} y2={trussHeight + 45} stroke="#e0b44c" strokeWidth={1.5} />
            <line x1={trussWidth / 2} y1={trussHeight + 35} x2={trussWidth / 2} y2={trussHeight + 45} stroke="#e0b44c" strokeWidth={1.5} />
            <text x={trussWidth / 4} y={trussHeight + 65} fill="#e0b44c" fontSize={14} textAnchor="middle" fontFamily="monospace">9.00m</text>
          </g>
        </g>

        {/* Initial Dimension (18m) */}
        <g transform="translate(400, 200)" opacity={draw * (1 - dimAlpha)}>
          <line x1={-trussWidth / 2} y1={-40} x2={trussWidth / 2} y2={-40} stroke="#e9f2f6" strokeWidth={1.5} />
          <line x1={-trussWidth / 2} y1={-45} x2={-trussWidth / 2} y2={-35} stroke="#e9f2f6" strokeWidth={1.5} />
          <line x1={trussWidth / 2} y1={-45} x2={trussWidth / 2} y2={-35} stroke="#e9f2f6" strokeWidth={1.5} />
          <text x={0} y={-55} fill="#e9f2f6" fontSize={16} textAnchor="middle" fontFamily="monospace">18.00m</text>
        </g>

        {/* Cut Line Animation */}
        <g transform="translate(400, 190)">
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={(trussHeight + 20) * cutProgress}
            stroke="#d0523f"
            strokeWidth={3}
            strokeDasharray="4 2"
            opacity={cutProgress > 0 ? 1 - split : 0}
          />
          {cutProgress > 0 && split < 1 && (
            <text x={10} y={20} fill="#d0523f" fontSize={10} opacity={1 - split}>TRENNUNG</text>
          )}
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.15,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            fontWeight: 300,
            letterSpacing: '0.1em',
            opacity: draw,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};