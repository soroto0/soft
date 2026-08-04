import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BoltedBlastPanelFailureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const blueprintProgress = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const boltsLock = interpolate(frame, [span * 0.25, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shockwave = interpolate(frame, [span * 0.45, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleAlpha = interpolate(frame, [span * 0.1, span * 0.35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  // Calculate wave positions based on shockwave progress
  const outwardRadius = Math.min(340, shockwave * 600);
  const isReflected = shockwave > 0.55;
  const reflectProgress = isReflected ? (shockwave - 0.55) / 0.45 : 0;
  const reflectRadius = reflectProgress * 280;

  const boltPositions = [140, 210, 280, 350];

  return (
    <AbsoluteFill
      style={{
        background: '#07090c',
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        width,
        height,
      }}
    >
      <div style={{ width: '80%', height: '75%', position: 'relative' }}>
        <svg width="100%" height="100%" viewBox="0 0 800 500">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#16202c" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width="800" height="500" fill="url(#grid)" opacity={blueprintProgress} />

          {/* Room Outer Structure */}
          <rect
            x="100"
            y="80"
            width="580"
            height="330"
            fill="none"
            stroke="#e9f2f6"
            strokeWidth="2"
            strokeDasharray="1820"
            strokeDashoffset={1820 * (1 - blueprintProgress)}
            opacity={0.4}
          />

          {/* Blast Panel Seam Wall Area */}
          <line
            x1="680"
            y1="120"
            x2="680"
            y2="370"
            stroke="#e0b44c"
            strokeWidth="4"
            strokeDasharray="8 6"
            opacity={blueprintProgress}
          />

          {/* Incorrectly Installed Panel Segment */}
          <rect
            x="674"
            y="130"
            width="12"
            height="230"
            fill="none"
            stroke="#e0b44c"
            strokeWidth="2"
            opacity={blueprintProgress}
          />

          {/* Red Bolt Overlays Locking the Seam */}
          {boltPositions.map((yPos, idx) => (
            <g
              key={idx}
              transform={`translate(680, ${yPos}) scale(${0.4 + boltsLock * 0.6})`}
              opacity={boltsLock}
            >
              <circle cx="0" cy="0" r="14" fill="#07090c" stroke="#d0523f" strokeWidth="3" />
              <line x1="-8" y1="-8" x2="8" y2="8" stroke="#d0523f" strokeWidth="3" />
              <line x1="-8" y1="8" x2="8" y2="-8" stroke="#d0523f" strokeWidth="3" />
            </g>
          ))}

          {/* Incident Shockwave (Venting Blocked) */}
          {!isReflected && outwardRadius > 0 && (
            <path
              d={`M 250 ${240 - outwardRadius * 0.6} A ${outwardRadius} ${outwardRadius} 0 0 1 250 ${240 + outwardRadius * 0.6}`}
              fill="none"
              stroke="#e0b44c"
              strokeWidth="4"
              opacity={1 - outwardRadius / 360}
            />
          )}

          {/* Reflected Shockwave Bouncing Back Inside */}
          {isReflected && (
            <g opacity={1 - reflectProgress * 0.8}>
              <path
                d={`M ${670 - reflectRadius * 0.8} ${240 - (280 - reflectRadius) * 0.5} A ${280 - reflectRadius} ${280 - reflectRadius} 0 0 0 ${670 - reflectRadius * 0.8} ${240 + (280 - reflectRadius) * 0.5}`}
                fill="none"
                stroke="#d0523f"
                strokeWidth="6"
                strokeDasharray="10 5"
              />
              {/* Internal Rebound Arrows */}
              <line
                x1={660 - reflectRadius * 0.8}
                y1="240"
                x2={560 - reflectRadius * 0.8}
                y2="240"
                stroke="#d0523f"
                strokeWidth="3"
              />
              <polygon
                points={`${550 - reflectRadius * 0.8},240 ${565 - reflectRadius * 0.8},233 ${565 - reflectRadius * 0.8},247`}
                fill="#d0523f"
              />
            </g>
          )}

          {/* Annotations */}
          <text x="120" y="115" fill="#e9f2f6" fontSize="14" fontFamily="monospace" opacity={blueprintProgress * 0.7}>
            INTERIOR CHAMBER
          </text>
          <text
            x="670"
            y="105"
            fill="#d0523f"
            fontSize="13"
            fontFamily="sans-serif"
            fontWeight="bold"
            textAnchor="end"
            opacity={boltsLock}
          >
            LOCKED SEAMS (FAULT)
          </text>
        </svg>

        {/* Caption */}
        {p.title ? (
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: 28,
              fontWeight: 'bold',
              letterSpacing: '0.08em',
              color: '#e9f2f6',
              textTransform: 'uppercase',
              opacity: titleAlpha,
            }}
          >
            {p.title}
          </div>
        ) : (
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: 28,
              fontWeight: 'bold',
              letterSpacing: '0.08em',
              color: '#e9f2f6',
              textTransform: 'uppercase',
              opacity: titleAlpha,
            }}
          >
            Restricted Blast Venting
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};