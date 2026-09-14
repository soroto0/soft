import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StructuralBucklingDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const buckle = interpolate(frame, [span * 0.25, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glow = interpolate(frame, [span * 0.15, span * 0.5], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const load = interpolate(frame, [0, span * 0.35], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const vectors = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const pillars = [
    { x: 140, label: 'Pfeiler 12' },
    { x: 660, label: 'Pfeiler 13' },
  ];

  const topY = 180;
  const bottomY = 240;
  const midX = 400;
  const buckleDepth = 85 * buckle;
  const topBuckleDepth = 25 * buckle;

  const getDisplacement = (x: number, max: number) => {
    const dist = Math.abs(x - midX);
    if (dist > 250) return 0;
    return max * (1 - Math.pow(dist / 250, 2));
  };

  const topPath = `M 150 ${topY} Q ${midX} ${topY + topBuckleDepth * 1.5} 650 ${topY}`;
  const bottomPath = `M 150 ${bottomY} Q ${midX} ${bottomY + buckleDepth * 1.5} 650 ${bottomY}`;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 800 450" style={{ overflow: 'visible' }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Pillars */}
        {pillars.map((pill) => (
          <g key={pill.x}>
            <rect x={pill.x - 25} y={240} width={50} height={140} fill="#5d6a73" opacity={0.3} />
            <rect x={pill.x - 28} y={235} width={56} height={8} fill="#e9f2f6" />
            <text x={pill.x} y={400} fill="#e9f2f6" fontSize={14} textAnchor="middle" fontFamily="monospace" opacity={0.8}>
              {pill.label}
            </text>
          </g>
        ))}

        {/* Structural Web (Truss) */}
        {vectors.slice(0, -1).map((v, i) => {
          const x1 = 150 + i * 71.4;
          const x2 = 150 + (i + 1) * 71.4;
          const ty1 = topY + getDisplacement(x1, topBuckleDepth);
          const ty2 = topY + getDisplacement(x2, topBuckleDepth);
          const by1 = bottomY + getDisplacement(x1, buckleDepth);
          const by2 = bottomY + getDisplacement(x2, buckleDepth);
          return (
            <g key={i} opacity={0.4}>
              <line x1={x1} y1={ty1} x2={x1} y2={by1} stroke="#e9f2f6" strokeWidth={1} />
              <line x1={x1} y1={ty1} x2={x2} y2={by2} stroke="#e9f2f6" strokeWidth={1} />
              <line x1={x2} y1={ty2} x2={x1} y2={by1} stroke="#e9f2f6" strokeWidth={1} />
            </g>
          );
        })}

        {/* Main Girder Flanges */}
        <path d={topPath} fill="none" stroke="#e9f2f6" strokeWidth={3} />
        <path d={bottomPath} fill="none" stroke="#e9f2f6" strokeWidth={5} />
        
        {/* Buckling Stress Highlight */}
        <path 
          d={bottomPath} 
          fill="none" 
          stroke="#e0b44c" 
          strokeWidth={6} 
          opacity={glow * 0.8} 
          filter="url(#glow)"
        />
        <path 
          d={bottomPath} 
          fill="none" 
          stroke="#d0523f" 
          strokeWidth={2} 
          opacity={buckle * 0.9} 
        />

        {/* Force Vectors (Load) */}
        {vectors.map((v) => {
          const x = 150 + v * 62.5;
          const yBase = topY - 15;
          const length = 45 * load;
          return (
            <g key={`v-${v}`} opacity={load * 0.9}>
              <line x1={x} y1={yBase - length} x2={x} y2={yBase} stroke="#d0523f" strokeWidth={2} />
              <path d={`M ${x-4} ${yBase-6} L ${x+4} ${yBase-6} L ${x} ${yBase} Z`} fill="#d0523f" />
              {v === 4 && (
                <text x={x + 8} y={yBase - 35} fill="#d0523f" fontSize={11} fontFamily="monospace" fontWeight="bold">
                  LOAD VECTOR [FE-10]
                </text>
              )}
            </g>
          );
        })}

        {/* Technical Annotations */}
        <g opacity={0.6}>
          <text x={140} y={topY - 5} fill="#e9f2f6" fontSize={9} textAnchor="end">UPPER FLANGE</text>
          <text x={140} y={bottomY + 15} fill="#e9f2f6" fontSize={9} textAnchor="end">LOWER FLANGE</text>
          <circle cx={midX} cy={bottomY + buckleDepth * 1.5} r={4} fill="#d0523f" opacity={buckle} />
          <text x={midX} y={bottomY + buckleDepth * 1.5 + 25} fill="#d0523f" fontSize={10} textAnchor="middle" opacity={buckle}>
            PLASTIC DEFORMATION POINT
          </text>
        </g>

        {/* Scale Axis */}
        <line x1={150} y1={420} x2={650} y2={420} stroke="#e9f2f6" strokeWidth={1} opacity={0.3} />
        {[0, 5, 10, 15, 20, 25].map((m) => (
          <g key={m}>
            <line x1={150 + m * 20} y1={415} x2={150 + m * 20} y2={425} stroke="#e9f2f6" strokeWidth={1} opacity={0.3} />
            {m % 10 === 0 && (
              <text x={150 + m * 20} y={440} fill="#e9f2f6" fontSize={9} textAnchor="middle" opacity={0.5}>
                {m}m
              </text>
            )}
          </g>
        ))}
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: '8%',
          left: '15%',
          color: '#e9f2f6',
          fontFamily: 'monospace',
          fontSize: 24,
          borderLeft: '3px solid #e0b44c',
          paddingLeft: 20,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};