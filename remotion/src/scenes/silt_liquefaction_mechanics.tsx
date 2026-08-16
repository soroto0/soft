import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SiltLiquefactionMechanicsScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  // Animation phases
  const flowVelocity = interpolate(frame, [span * 0.1, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const breakage = interpolate(frame, [span * 0.35, span * 0.5], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const drift = interpolate(frame, [span * 0.45, span * 0.95], [0, 120], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlight = interpolate(frame, [span * 0.3, span * 0.45], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rows = [0, 1, 2, 3, 4, 5];
  const cols = [0, 1, 2, 3, 4, 5, 6, 7];
  const flowLines = [0, 1, 2, 3, 4];
  
  const isFailureRow = (r: number) => r === 2 || r === 3;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} viewBox="0 0 450 300" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5b7f9c" stopOpacity={0} />
            <stop offset="0.5" stopColor="#5b7f9c" stopOpacity={0.4} />
            <stop offset="1" stopColor="#5b7f9c" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Flow Lines Background */}
        {flowLines.map((i) => (
          <g key={`flow-${i}`} opacity={flowVelocity * 0.6}>
            <line
              x1={40}
              y1={60 + i * 45}
              x2={410}
              y2={60 + i * 45}
              stroke="url(#flowGrad)"
              strokeWidth={2}
              strokeDasharray="10 15"
              strokeDashoffset={frame * -2 * flowVelocity}
            />
            <path
              d="M 405,55 L 415,60 L 405,65"
              fill="none"
              stroke="#5b7f9c"
              strokeWidth={1.5}
              transform={`translate(${Math.sin(frame * 0.1 + i) * 5}, 0)`}
            />
          </g>
        ))}

        {/* Failure Zone Highlight */}
        <rect
          x={35}
          y={115}
          width={380}
          height={70}
          fill="none"
          stroke="#e0b44c"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          opacity={highlight}
        />
        <text x={420} y={155} fill="#e0b44c" fontSize={10} opacity={highlight}>
          KRITISCHE ZONE
        </text>

        {/* Cohesion Vectors (Bonds) */}
        {rows.map((r) =>
          cols.map((c) => {
            const x = 60 + c * 45 + (isFailureRow(r) ? drift : 0);
            const y = 60 + r * 35;
            const isBroken = isFailureRow(r) && breakage > 0.1;
            const bondOpacity = isFailureRow(r) ? 1 - breakage : 1;

            return (
              <g key={`bonds-${r}-${c}`}>
                {/* Horizontal Bond */}
                {c < cols.length - 1 && (
                  <line
                    x1={x + 6}
                    y1={y}
                    x2={x + 39 + (isFailureRow(r) ? 0 : 0)}
                    y2={y}
                    stroke="#8a949b"
                    strokeWidth={1}
                    opacity={isBroken ? 0 : bondOpacity * 0.5}
                  />
                )}
                {/* Vertical Bond */}
                {r < rows.length - 1 && (
                  <line
                    x1={x}
                    y1={y + 6}
                    x2={x}
                    y2={y + 29}
                    stroke="#8a949b"
                    strokeWidth={1}
                    opacity={isBroken ? 0 : bondOpacity * 0.5}
                  />
                )}
              </g>
            );
          })
        )}

        {/* Particles */}
        {rows.map((r) =>
          cols.map((c) => {
            const x = 60 + c * 45 + (isFailureRow(r) ? drift : 0);
            const y = 60 + r * 35;
            return (
              <circle
                key={`p-${r}-${c}`}
                cx={x}
                cy={y}
                r={5}
                fill={isFailureRow(r) && breakage > 0.5 ? "#d0523f" : "#e9f2f6"}
                stroke="#8a949b"
                strokeWidth={0.5}
              />
            );
          })
        )}

        {/* Velocity Scale */}
        <g transform="translate(60, 270)">
          <line x1={0} y1={0} x2={315} y2={0} stroke="#e9f2f6" strokeWidth={1} />
          {[0, 0.5, 1].map((t) => (
            <g key={t} transform={`translate(${t * 315}, 0)`}>
              <line x1={0} y1={0} x2={0} y2={5} stroke="#e9f2f6" strokeWidth={1} />
              <text y={18} fill="#e9f2f6" fontSize={9} textAnchor="middle">
                {t === 0 ? '0' : t === 0.5 ? 'v_crit' : 'v_max'}
              </text>
            </g>
          ))}
          <rect
            x={0}
            y={-4}
            width={flowVelocity * 315}
            height={4}
            fill={flowVelocity > 0.5 ? "#d0523f" : "#5b7f9c"}
            opacity={0.8}
          />
        </g>

        {/* Layer Labels */}
        <text x={20} y={75} fill="#8a949b" fontSize={10} writingMode="tb">STABIL</text>
        <text x={20} y={150} fill="#d0523f" fontSize={10} writingMode="tb">LÖSUNG</text>
        <text x={20} y={225} fill="#8a949b" fontSize={10} writingMode="tb">BASIS</text>

        {/* Force Arrows */}
        {isFailureRow(2) && (
          <path
            d="M 40,150 L 80,150"
            stroke="#d0523f"
            strokeWidth={2}
            markerEnd="url(#arrow)"
            opacity={flowVelocity}
          />
        )}
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#d0523f" />
          </marker>
        </defs>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            fontFamily: 'sans-serif',
            fontSize: 32,
            fontWeight: 300,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};