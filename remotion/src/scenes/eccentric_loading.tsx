import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const EccentricLoadingScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const draw = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shift = interpolate(frame, [span * 0.3, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const torque = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const bolts = [140, 210, 280];
  const eccentricity = 45;
  const forceY = 150 + shift * eccentricity;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 420 300">
        <defs>
          <marker id="arrowhead-danger" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
          <marker id="arrowhead-amber" markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Gusset Plate */}
        <rect
          x="80"
          y="110"
          width="260"
          height="80"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth="2"
          strokeDasharray={draw === 1 ? "0" : "1000"}
          strokeDashoffset={1000 * (1 - draw)}
        />
        <text x="85" y="105" fill="#e9f2f6" fontSize="10" opacity={draw}>KNOTENBLECH S355</text>

        {/* Central Axis */}
        <line
          x1="60"
          y1="150"
          x2="360"
          y2="150"
          stroke="#e9f2f6"
          strokeWidth="1"
          strokeDasharray="8 4"
          opacity={draw * 0.5}
        />
        <text x="365" y="153" fill="#e9f2f6" fontSize="8" opacity={draw * 0.5}>SYSTEMACHSE</text>

        {/* Bolts */}
        {bolts.map((bx, i) => (
          <g key={bx}>
            <circle
              cx={bx}
              cy="150"
              r={12 * draw}
              fill="none"
              stroke="#e9f2f6"
              strokeWidth="1.5"
            />
            <circle
              cx={bx}
              cy="150"
              r={4 * draw}
              fill="#e9f2f6"
            />
            <text x={bx} y={180} fill="#e9f2f6" fontSize="8" textAnchor="middle" opacity={draw}>
              B{i + 1}
            </text>
            
            {/* Torque Moment Indicators around bolts */}
            <path
              d={`M ${bx - 18} 150 A 18 18 0 0 1 ${bx + 15} 140`}
              fill="none"
              stroke="#e0b44c"
              strokeWidth="2"
              markerEnd="url(#arrowhead-amber)"
              opacity={torque}
              transform={`rotate(${torque * 20}, ${bx}, 150)`}
            />
          </g>
        ))}

        {/* Force Arrow */}
        <g opacity={draw}>
          <line
            x1="40"
            y1={forceY}
            x2="100"
            y2={forceY}
            stroke="#d0523f"
            strokeWidth="3"
            markerEnd="url(#arrowhead-danger)"
          />
          <text x="35" y={forceY - 10} fill="#d0523f" fontSize="14" fontWeight="bold" textAnchor="end">
            F
          </text>
        </g>

        {/* Eccentricity Dimension */}
        {shift > 0.1 && (
          <g opacity={shift}>
            <line x1="110" y1="150" x2="110" y2={forceY} stroke="#e0b44c" strokeWidth="1" />
            <line x1="105" y1="150" x2="115" y2="150" stroke="#e0b44c" strokeWidth="1" />
            <line x1="105" y1={forceY} x2="115" y2={forceY} stroke="#e0b44c" strokeWidth="1" />
            <text x="118" y={150 + (shift * eccentricity) / 2 + 4} fill="#e0b44c" fontSize="12">
              e
            </text>
          </g>
        )}

        {/* Resulting Moment Label */}
        <g opacity={torque}>
          <text x="210" y="230" fill="#e0b44c" fontSize="14" textAnchor="middle">
            M = F · e
          </text>
          <text x="210" y="245" fill="#e0b44c" fontSize="10" textAnchor="middle">
            (BIEGUNG + SCHERUNG)
          </text>
        </g>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: 32,
            fontWeight: 600,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};