import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DynamicLoadTorsionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const torsionAngle = interpolate(
    frame,
    [0, span * 0.25, span * 0.5, span * 0.75, span],
    [0, 4.5, -3.8, 2.2, 0],
    {
      easing: Easing.bezier(0.36, 0.07, 0.19, 0.97),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const stressIntensity = interpolate(
    frame,
    [0, span * 0.3, span * 0.6, span * 0.9, span],
    [0.3, 1.0, 0.4, 0.95, 0.5],
    {
      easing: Easing.inOut(Easing.quad),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const motionLineOpacity = interpolate(
    frame,
    [0, span * 0.15, span * 0.85, span],
    [0, 0.75, 0.75, 0],
    {
      easing: Easing.linear,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const captionY = interpolate(
    frame,
    [0, span * 0.2],
    [30, 0],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const opacity = p.enter * p.exit;
  const titleText = p.title || "TORSIONSBELASTUNG";

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="75%" height="65%" viewBox="0 0 800 450">
        <defs>
          <marker
            id="arrow-danger"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#d0523f" />
          </marker>
          <marker
            id="arrow-amber"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#e0b44c" />
          </marker>
        </defs>

        {/* Reference Grid Lines */}
        <line x1="100" y1="240" x2="700" y2="240" stroke="#5d6a73" strokeWidth="0.5" strokeDasharray="5 5" opacity="0.25" />
        <line x1="400" y1="50" x2="400" y2="380" stroke="#5d6a73" strokeWidth="0.5" strokeDasharray="5 5" opacity="0.25" />

        {/* Static Motion Envelope Arcs */}
        <path
          d="M 190 200 A 50 50 0 0 1 205 265"
          fill="none"
          stroke="#d0523f"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity={motionLineOpacity * 0.6}
        />
        <path
          d="M 610 200 A 50 50 0 0 0 595 265"
          fill="none"
          stroke="#d0523f"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity={motionLineOpacity * 0.6}
        />

        {/* Rotating Bridge Deck Group */}
        <g transform={`rotate(${torsionAngle}, 400, 240)`}>
          {/* Main Box Girder (Hohlkasten) */}
          <polygon
            points="260,220 540,220 480,290 320,290"
            fill="#3a444a"
            stroke="#e9f2f6"
            strokeWidth="1.5"
          />

          {/* Internal Bracing / Stiffeners */}
          <line x1="320" y1="290" x2="540" y2="220" stroke="#5d6a73" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="480" y1="290" x2="260" y2="220" stroke="#5d6a73" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="400" y1="220" x2="400" y2="290" stroke="#5d6a73" strokeWidth="1" />

          {/* Steel Deck Plate */}
          <rect x="220" y="210" width="360" height="10" rx="2" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="1.5" />

          {/* Wear Course (Asphalt Layer) */}
          <rect x="230" y="204" width="340" height="6" rx="1" fill="#1a2024" stroke="#e9f2f6" strokeWidth="1" />

          {/* Left Anchor Bracket */}
          <rect x="210" y="208" width="14" height="14" rx="2" fill="#e0b44c" stroke="#e9f2f6" strokeWidth="1" />

          {/* Right Anchor Bracket */}
          <rect x="576" y="208" width="14" height="14" rx="2" fill="#e0b44c" stroke="#e9f2f6" strokeWidth="1" />

          {/* Cables extending upwards */}
          <line x1="217" y1="215" x2="120" y2="60" stroke="#e9f2f6" strokeWidth="2.5" />
          <line x1="583" y1="215" x2="680" y2="60" stroke="#e9f2f6" strokeWidth="2.5" />

          {/* Stress Highlight Glow at Left Connection Point */}
          <circle cx="217" cy="215" r={22 * stressIntensity} fill="#d0523f" opacity={0.35 * stressIntensity} />
          <circle cx="217" cy="215" r={10 * stressIntensity} fill="#e0b44c" opacity={0.75 * stressIntensity} />
          <circle cx="217" cy="215" r="3" fill="#e9f2f6" />

          {/* Force Vectors (Arrows) */}
          {/* Tension Force along Cable */}
          <line
            x1="217"
            y1="215"
            x2="168"
            y2="137"
            stroke="#e0b44c"
            strokeWidth="2"
            markerEnd="url(#arrow-amber)"
          />
          <text
            x="155"
            y="130"
            fill="#e0b44c"
            fontSize="10"
            fontFamily="'Segoe UI', Arial, sans-serif"
            textAnchor="end"
          >
            F_ZUG
          </text>

          {/* Torsion Shear Force (Downward/Rotational) */}
          <line
            x1="217"
            y1="215"
            x2="217"
            y2="275"
            stroke="#d0523f"
            strokeWidth="2"
            markerEnd="url(#arrow-danger)"
          />
          <text
            x="227"
            y="268"
            fill="#d0523f"
            fontSize="10"
            fontFamily="'Segoe UI', Arial, sans-serif"
            textAnchor="start"
          >
            F_TORSION
          </text>

          {/* Leader Lines and Labels */}
          {/* Layer 1: Fahrbahnbelag */}
          <path d="M 400 207 L 400 150 L 350 150" fill="none" stroke="#e9f2f6" strokeWidth="0.8" opacity="0.8" />
          <text
            x="340"
            y="154"
            fill="#e9f2f6"
            fontSize="10"
            fontFamily="'Segoe UI', Arial, sans-serif"
            textAnchor="end"
            opacity="0.9"
          >
            FAHRBAHNBELAG (80 mm)
          </text>

          {/* Layer 2: Stahl-Hohlkasten */}
          <path d="M 450 250 L 520 250 L 550 250" fill="none" stroke="#e9f2f6" strokeWidth="0.8" opacity="0.8" />
          <text
            x="560"
            y="254"
            fill="#e9f2f6"
            fontSize="10"
            fontFamily="'Segoe UI', Arial, sans-serif"
            textAnchor="start"
            opacity="0.9"
          >
            STAHL-HOHLKASTEN
          </text>

          {/* Layer 3: Diagonalstreben */}
          <path d="M 380 270 L 320 330 L 280 330" fill="none" stroke="#e9f2f6" strokeWidth="0.8" opacity="0.8" />
          <text
            x="270"
            y="334"
            fill="#e9f2f6"
            fontSize="10"
            fontFamily="'Segoe UI', Arial, sans-serif"
            textAnchor="end"
            opacity="0.9"
          >
            INTERNE DIAGONALSTREBEN
          </text>

          {/* Connection Point Stress Label */}
          <path d="M 217 215 L 150 290 L 100 290" fill="none" stroke="#d0523f" strokeWidth="0.8" opacity="0.8" />
          <text
            x="90"
            y="294"
            fill="#d0523f"
            fontSize="10"
            fontFamily="'Segoe UI', Arial, sans-serif"
            fontWeight="bold"
            textAnchor="end"
            opacity="0.95"
          >
            MAX. SPANNUNGSKONZENTRATION
          </text>
        </g>
      </svg>

      {/* On-screen Caption */}
      <div
        style={{
          marginTop: 10,
          transform: `translateY(${captionY}px)`,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: '0.18em',
          color: '#e9f2f6',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}
      >
        {titleText}
      </div>
    </AbsoluteFill>
  );
};