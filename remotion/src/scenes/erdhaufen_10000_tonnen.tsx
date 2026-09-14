import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const Erdhaufen10000TonnenScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const groundProgress = interpolate(frame, [0, span * 0.15], [0, 1], EO);
  const workerProgress = interpolate(frame, [span * 0.1, span * 0.3], [0, 1], EO);
  const blockProgress = interpolate(frame, [span * 0.15, span * 0.4], [0, 1], EO);
  const sagProgress = interpolate(frame, [span * 0.35, span * 0.6], [0, 1], EO);
  const weightProgress = interpolate(frame, [span * 0.2, span * 0.55], [0, 10000], EO);
  const forceProgress = interpolate(frame, [span * 0.45, span * 0.6], [0, 1], EO);

  // Drift
  const drift = interpolate(frame, [0, span], [1.0, 1.03], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Staggered line progress for the 3 layers
  const lineProgress1 = interpolate(frame, [span * 0.25, span * 0.45], [0, 1], EO);
  const lineProgress2 = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], EO);
  const lineProgress3 = interpolate(frame, [span * 0.35, span * 0.55], [0, 1], EO);

  // Coordinates for the earth block (sagging and bulging)
  const y0 = 380;
  const y1 = 280 + 15 * sagProgress;
  const y2 = 180 + 25 * sagProgress;
  const y3 = 80 + 35 * sagProgress;

  const xTop = 260 - 10 * sagProgress;
  const xMid2 = 260 - 30 * sagProgress;
  const xMid1 = 260 - 55 * sagProgress; // Maximum lateral bulge
  const xBot = 260 - 25 * sagProgress;
  const xRight = 660;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="85%" height="85%" viewBox="0 0 800 450" style={{ overflow: 'visible' }}>
        <g transform={`translate(400 225) scale(${drift}) translate(-400 -225)`}>
          
          {/* Background Grid Lines */}
          <line x1="50" y1="140" x2="750" y2="140" stroke="#e9f2f6" strokeWidth={1} strokeOpacity={0.1 * groundProgress} />
          <line x1="50" y1="240" x2="750" y2="240" stroke="#e9f2f6" strokeWidth={1} strokeOpacity={0.1 * groundProgress} />
          <line x1="50" y1="340" x2="750" y2="340" stroke="#e9f2f6" strokeWidth={1} strokeOpacity={0.1 * groundProgress} />

          {/* Ground Line */}
          <line 
            x1="50" 
            y1="380" 
            x2="750" 
            y2="380" 
            stroke="#e9f2f6" 
            strokeWidth={2} 
            strokeDasharray="700"
            strokeDashoffset={700 * (1 - groundProgress)}
          />

          {/* Worker Silhouette & Dimension */}
          <g opacity={workerProgress} transform={`translate(0, ${(1 - workerProgress) * 10})`}>
            {/* Worker Silhouette (1.8m scale) */}
            <circle cx="160" cy="325" r="5.5" fill="#e9f2f6" />
            <path 
              d="M 157 331 C 155 331, 154 336, 154 342 L 151 359 L 155 359 L 157 346 L 157 380 L 161 380 L 161 346 L 163 359 L 167 359 L 164 342 C 164 336, 163 331, 161 331 Z" 
              fill="#e9f2f6" 
            />
            {/* Worker Dimension Line */}
            <line 
              x1="125" 
              y1="320" 
              x2="125" 
              y2="380" 
              stroke="#e9f2f6" 
              strokeWidth={1} 
              strokeDasharray="60"
              strokeDashoffset={60 * (1 - workerProgress)}
            />
            <line x1="120" y1="320" x2="130" y2="320" stroke="#e9f2f6" strokeWidth={1} />
            <line x1="120" y1="380" x2="130" y2="380" stroke="#e9f2f6" strokeWidth={1} />
            <text x="115" y="355" fill="#e9f2f6" fontSize="11" textAnchor="end" fontFamily="monospace">1,8 m</text>
            <text x="160" y="395" fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity={0.7}>Bauarbeiter</text>
          </g>

          {/* Earth Block (Cross-Section with 3 Layers) */}
          <g clipPath="url(#block-clip)">
            <defs>
              <clipPath id="block-clip">
                <rect x="100" y={380 - 320 * blockProgress} width="600" height="320" />
              </clipPath>
            </defs>

            {/* Layer 1: Top (Kies / Sand) */}
            <path 
              d={`M ${xTop} ${y3} L ${xRight} ${y3} L ${xRight} ${y2} L ${xMid2} ${y2} Z`} 
              fill="#4a5560" 
              stroke="#e9f2f6" 
              strokeWidth={0.5} 
              strokeOpacity={0.5}
            />
            {/* Layer 2: Middle (Schluff / Lehm) */}
            <path 
              d={`M ${xMid2} ${y2} L ${xRight} ${y2} L ${xRight} ${y1} L ${xMid1} ${y1} Z`} 
              fill="#343d46" 
              stroke="#e9f2f6" 
              strokeWidth={0.5} 
              strokeOpacity={0.5}
            />
            {/* Layer 3: Bottom (Ton / Scherzone) */}
            <path 
              d={`M ${xMid1} ${y1} L ${xRight} ${y1} L ${xRight} ${y0} L ${xBot} ${y0} Z`} 
              fill="#222831" 
              stroke="#e9f2f6" 
              strokeWidth={0.5} 
              strokeOpacity={0.5}
            />
          </g>

          {/* Earth Block Dimension Line (10m) */}
          <g opacity={blockProgress}>
            <line 
              x1="690" 
              y1="80" 
              x2="690" 
              y2="380" 
              stroke="#e9f2f6" 
              strokeWidth={1} 
              strokeDasharray="300"
              strokeDashoffset={300 * (1 - blockProgress)}
            />
            <line x1="685" y1="80" x2="695" y2="80" stroke="#e9f2f6" strokeWidth={1} />
            <line x1="685" y1="380" x2="695" y2="380" stroke="#e9f2f6" strokeWidth={1} />
            <text x="705" y="235" fill="#e9f2f6" fontSize="12" textAnchor="start" fontFamily="monospace" fontWeight="bold">10,0 m</text>
          </g>

          {/* Layer Labels & Leader Lines (Staggered) */}
          {/* Layer 1 Callout */}
          <g opacity={lineProgress1}>
            <path 
              d={`M ${(xTop + xRight) / 2} ${(y3 + y2) / 2} L 520 130 L 580 130`} 
              fill="none" 
              stroke="#e9f2f6" 
              strokeWidth={1} 
              strokeDasharray="150"
              strokeDashoffset={150 * (1 - lineProgress1)}
            />
            <rect x="585" y="118" width="90" height="18" rx="3" fill="#16202b" opacity={0.8} />
            <text x="590" y="131" fill="#e9f2f6" fontSize="9" fontFamily="sans-serif">Aushub (Sand)</text>
          </g>

          {/* Layer 2 Callout */}
          <g opacity={lineProgress2}>
            <path 
              d={`M ${(xMid2 + xRight) / 2} ${(y2 + y1) / 2} L 500 230 L 580 230`} 
              fill="none" 
              stroke="#e9f2f6" 
              strokeWidth={1} 
              strokeDasharray="150"
              strokeDashoffset={150 * (1 - lineProgress2)}
            />
            <rect x="585" y="218" width="90" height="18" rx="3" fill="#16202b" opacity={0.8} />
            <text x="590" y="231" fill="#e9f2f6" fontSize="9" fontFamily="sans-serif">Mittelschicht</text>
          </g>

          {/* Layer 3 Callout */}
          <g opacity={lineProgress3}>
            <path 
              d={`M ${(xMid1 + xRight) / 2} ${(y1 + y0) / 2} L 480 330 L 580 330`} 
              fill="none" 
              stroke="#e9f2f6" 
              strokeWidth={1} 
              strokeDasharray="150"
              strokeDashoffset={150 * (1 - lineProgress3)}
            />
            <rect x="585" y="318" width="90" height="18" rx="3" fill="#16202b" opacity={0.8} />
            <text x="590" y="331" fill="#e9f2f6" fontSize="9" fontFamily="sans-serif">Gleitfuge (Ton)</text>
          </g>

          {/* Force Arrows (Accent Elements - Arrive Last) */}
          {/* Vertical Gravity Load */}
          <g opacity={forceProgress} transform={`translate(420, 140) scale(${forceProgress}) translate(-420, -140)`}>
            <line x1="420" y1="110" x2="420" y2="170" stroke="#e0b44c" strokeWidth={3} />
            <polygon points="415,165 420,175 425,165" fill="#e0b44c" />
            <rect x="370" y="85" width="100" height="16" rx="2" fill="#16202b" stroke="#e0b44c" strokeWidth={0.5} />
            <text x="420" y="97" fill="#e0b44c" fontSize="9" textAnchor="middle" fontWeight="bold" letterSpacing="0.05em">VERTICALLAST</text>
          </g>

          {/* Lateral Push Force */}
          <g opacity={forceProgress} transform={`translate(${xMid1 + 15}, 290) scale(${forceProgress}) translate(-${xMid1 + 15}, -290)`}>
            <line x1={xMid1 + 45} y1="290" x2={xMid1 - 15} y2="290" stroke="#d0523f" strokeWidth={3} />
            <polygon points={`${xMid1 - 10},285 ${xMid1 - 22},290 ${xMid1 - 10},295`} fill="#d0523f" />
            <rect x={xMid1 + 10} y="302" width="90" height="16" rx="2" fill="#16202b" stroke="#d0523f" strokeWidth={0.5} />
            <text x={xMid1 + 55} y="313" fill="#d0523f" fontSize="9" textAnchor="middle" fontWeight="bold" letterSpacing="0.05em">SEITENDRUCK</text>
          </g>

          {/* Live Weight Counter Plate */}
          <g opacity={blockProgress} transform="translate(300, 35)">
            <rect x="0" y="0" width="200" height="45" rx="6" fill="#16202b" stroke="#e9f2f6" strokeWidth={1.5} />
            <text x="100" y="28" fill="#e0b44c" fontSize="20" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {Math.round(weightProgress).toLocaleString('de-DE')} t
            </text>
            <text x="100" y="40" fill="#e9f2f6" fontSize="8" textAnchor="middle" opacity={0.6} letterSpacing="0.1em">MASSE (EST.)</text>
          </g>

        </g>
      </svg>

      {/* On-screen Caption */}
      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '8%',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 28,
          fontWeight: 600,
          color: '#e9f2f6',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          backgroundColor: 'rgba(22, 32, 43, 0.85)',
          padding: '8px 24px',
          borderRadius: '4px',
          border: '1px solid rgba(233, 242, 246, 0.2)',
          transform: `translateY(${interpolate(frame, [0, span * 0.2], [20, 0], EO)}px)`,
          opacity: interpolate(frame, [0, span * 0.2], [0, 1], EO)
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};