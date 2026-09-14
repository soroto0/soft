import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BallisticTrajectoryMapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  // 1. Foundation / Map Grid
  const base = interpolate(frame, [0, span * 0.15], [0, 1], EO);
  
  // 2. Refinery Structures
  const refinery = interpolate(frame, [span * 0.08, span * 0.25], [0, 1], EO);
  
  // 3. Dimension Line & Distance Counter
  const dimensionLine = interpolate(frame, [span * 0.15, span * 0.35], [0, 1], EO);
  const distanceVal = interpolate(frame, [span * 0.15, span * 0.45], [0, 640], EO);
  
  // 4. Trajectory Arc
  const trajectory = interpolate(frame, [span * 0.22, span * 0.50], [0, 1], EO);
  
  // 5. Traveling Fragment Dot
  const travel = interpolate(frame, [span * 0.22, span * 0.55], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 6. Impact & Scale Truck
  const impact = spring({
    frame: frame - Math.round(span * 0.48),
    fps,
    config: { damping: 12, stiffness: 150, mass: 0.7 },
  });

  // 7. Camera Drift
  const drift = interpolate(frame, [0, span], [1.00, 1.03], EO);

  // Trajectory Bezier Points
  // P0: Reactor (250, 300)
  // P1: Apex Control Point (450, 80)
  // P2: Landing Point (650, 220)
  const p0x = 250;
  const p0y = 300;
  const p1x = 450;
  const p1y = 80;
  const p2x = 650;
  const p2y = 220;

  // Calculate traveling dot coordinates along quadratic bezier
  const travelX = (1 - travel) * (1 - travel) * p0x + 2 * (1 - travel) * travel * p1x + travel * travel * p2x;
  const travelY = (1 - travel) * (1 - travel) * p0y + 2 * (1 - travel) * travel * p1y + travel * travel * p2y;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 800 500" style={{ overflow: 'visible' }}>
        <g transform={`translate(400 250) scale(${drift}) translate(-400 -250)`}>
          
          {/* Map Grid Lines */}
          {[100, 200, 300, 400, 500, 600, 700].map((x, i) => (
            <line
              key={`v-${x}`}
              x1={x}
              y1={50}
              x2={x}
              y2={450}
              stroke="#5d6a73"
              strokeWidth={0.5}
              opacity={base * (0.15 + (i % 3) * 0.05)}
              strokeDasharray="4 4"
            />
          ))}
          {[100, 200, 300, 400].map((y, i) => (
            <line
              key={`h-${y}`}
              x1={100}
              y1={y}
              x2={700}
              y2={y}
              stroke="#5d6a73"
              strokeWidth={0.5}
              opacity={base * (0.15 + (i % 3) * 0.05)}
              strokeDasharray="4 4"
            />
          ))}

          {/* Slate-Grey River (Ufer) */}
          <path
            d="M 430 50 L 490 50 L 440 450 L 380 450 Z"
            fill="#5d6a73"
            opacity={base * 0.22}
          />
          <text x={415} y={120} fill="#5d6a73" fontSize={10} letterSpacing="0.1em" opacity={base * 0.6} transform="rotate(-75 415 120)">
            FLUSSLAUF
          </text>

          {/* Refinery Structures (Grey Grid / Blocks) */}
          <g opacity={refinery}>
            {/* Reactor Core Base */}
            <rect x={220} y={270} width={60} height={60} fill="none" stroke="#e9f2f6" strokeWidth={1.5} />
            <circle cx={250} cy={300} r={18} fill="#5d6a73" opacity={0.4} />
            <circle cx={250} cy={300} r={6} fill="#d0523f" />
            <text x={250} y={345} fill="#e9f2f6" fontSize={10} textAnchor="middle" letterSpacing="0.05em">
              REAKTORBLOCK
            </text>

            {/* Surrounding Plant Structures */}
            <rect x={160} y={250} width={40} height={30} fill="#5d6a73" opacity={0.3} stroke="#e9f2f6" strokeWidth={0.5} />
            <rect x={180} y={310} width={30} height={40} fill="#5d6a73" opacity={0.3} stroke="#e9f2f6" strokeWidth={0.5} />
            <circle cx={290} cy={260} r={12} fill="#5d6a73" opacity={0.3} stroke="#e9f2f6" strokeWidth={0.5} />
            <circle cx={320} cy={280} r={10} fill="#5d6a73" opacity={0.3} stroke="#e9f2f6" strokeWidth={0.5} />
          </g>

          {/* Dimension Line (640 Meters) */}
          <g opacity={dimensionLine}>
            <line x1={250} y1={380} x2={650} y2={380} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="400" strokeDashoffset={400 * (1 - dimensionLine)} />
            {/* Left Tick */}
            <line x1={250} y1={375} x2={250} y2={385} stroke="#e9f2f6" strokeWidth={1} />
            {/* Right Tick */}
            <line x1={650} y1={375} x2={650} y2={385} stroke="#e9f2f6" strokeWidth={1} />
            
            {/* Dimension Label Plate */}
            <rect x={410} y={368} width={80} height={18} fill="#1c252c" rx={3} stroke="#e9f2f6" strokeWidth={0.5} />
            <text x={450} y={381} fill="#e9f2f6" fontSize={11} textAnchor="middle" fontWeight="bold">
              {Math.round(distanceVal)} m
            </text>
          </g>

          {/* Ballistic Trajectory Arc */}
          <path
            d={`M ${p0x} ${p0y} Q ${p1x} ${p1y} ${p2x} ${p2y}`}
            fill="none"
            stroke="#e0b44c"
            strokeWidth={2}
            strokeDasharray="500"
            strokeDashoffset={500 * (1 - trajectory)}
          />

          {/* Traveling Fragment (Glowing Zeuge) */}
          {travel > 0 && travel < 1 && (
            <g transform={`translate(${travelX} ${travelY})`}>
              <circle cx={0} cy={0} r={8} fill="#e0b44c" opacity={0.4} />
              <circle cx={0} cy={0} r={4} fill="#d0523f" />
            </g>
          )}

          {/* Landing Point & Scale Truck (Arrives via Spring) */}
          <g transform={`translate(${p2x} ${p2y}) scale(${impact})`} opacity={impact}>
            {/* Impact Glow */}
            <circle cx={0} cy={0} r={16} fill="#d0523f" opacity={0.3} />
            <circle cx={0} cy={0} r={6} fill="#e0b44c" />
            
            {/* Callout Anchor */}
            <line x1={0} y1={0} x2={30} y2={-40} stroke="#e0b44c" strokeWidth={1.2} />
            <circle cx={30} cy={-40} r={3} fill="#e0b44c" />
            
            {/* Callout Label Plate */}
            <g transform="translate(35 -52)">
              <rect x={0} y={0} width={110} height={22} fill="#1c252c" rx={3} stroke="#e0b44c" strokeWidth={1} />
              <text x={8} y={15} fill="#e9f2f6" fontSize={9} fontWeight="bold" letterSpacing="0.05em">
                FRAGMENT V-1
              </text>
            </g>

            {/* Scale Truck Silhouette */}
            <g transform="translate(-15 20) scale(0.9)">
              {/* Truck Body */}
              <path d="M 0 8 L 0 2 L 18 2 L 22 5 L 28 5 L 28 10 L 0 10 Z" fill="#5d6a73" />
              <circle cx={6} cy={11} r={2} fill="#e9f2f6" />
              <circle cx={22} cy={11} r={2} fill="#e9f2f6" />
              <text x={34} y={9} fill="#5d6a73" fontSize={8} letterSpacing="0.02em">
                LKW (Maßstab)
              </text>
            </g>
          </g>

          {/* North Arrow / Compass Rose */}
          <g transform="translate(130 120)" opacity={base * 0.5}>
            <line x1={0} y1={-15} x2={0} y2={15} stroke="#e9f2f6" strokeWidth={1} />
            <line x1={-15} y1={0} x2={15} y2={0} stroke="#e9f2f6" strokeWidth={1} />
            <polygon points="0,-15 -4,-3 4,-3" fill="#e9f2f6" />
            <text x={0} y={-20} fill="#e9f2f6" fontSize={9} textAnchor="middle" fontWeight="bold">N</text>
          </g>

        </g>
      </svg>

      {/* On-screen Caption */}
      <div style={{
        position: 'absolute',
        bottom: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}>
        <div style={{
          backgroundColor: '#1c252c',
          border: '1px solid #5d6a73',
          padding: '8px 16px',
          borderRadius: 4,
          color: '#e9f2f6',
          fontSize: 20,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}>
          {p.title || "Flugbahn Fragment V-1"}
        </div>
      </div>
    </AbsoluteFill>
  );
};