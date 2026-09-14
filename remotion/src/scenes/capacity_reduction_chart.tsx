import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CapacityReductionChartScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const grow = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loss = interpolate(frame, [span * 0.35, span * 0.75], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chartH = 220;
  const chartW = 280;
  const yTicks = [0, 25, 50, 75, 100];
  const currentCapacity = 100 - (58 * loss);
  const currentDepth = 150 - (70 * loss);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 700 450" style={{ overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
          <marker id="dimline" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <circle cx="3" cy="3" r="2" fill="#e9f2f6" />
          </marker>
        </defs>

        {/* Y-Axis and Grid */}
        <g>
          {yTicks.map((t) => (
            <g key={t}>
              <line 
                x1={60} y1={320 - (t * chartH / 100)} 
                x2={60 + chartW} y2={320 - (t * chartH / 100)} 
                stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.3} 
              />
              <text x={50} y={320 - (t * chartH / 100) + 4} fill="#e9f2f6" fontSize={12} textAnchor="end" opacity={0.6}>{t}%</text>
            </g>
          ))}
          <line x1={60} y1={320} x2={60} y2={320 - chartH} stroke="#e9f2f6" strokeWidth={1.5} />
          <line x1={60} y1={320} x2={60 + chartW} y2={320} stroke="#e9f2f6" strokeWidth={1.5} />
        </g>

        {/* Comparison Bars */}
        <g>
          {/* Reference Bar (Soll) */}
          <rect 
            x={100} y={320 - (100 * chartH / 100 * grow)} 
            width={50} height={100 * chartH / 100 * grow} 
            fill="#e0b44c" opacity={0.7} 
          />
          <text x={125} y={345} fill="#e9f2f6" fontSize={14} textAnchor="middle" opacity={grow}>SOLL</text>
          <text x={125} y={362} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={grow * 0.7}>150 mm</text>
          <text x={125} y={320 - (100 * chartH / 100 * grow) - 10} fill="#e0b44c" fontSize={14} textAnchor="middle" opacity={grow}>100%</text>

          {/* Actual Bar (Ist) */}
          <rect 
            x={200} y={320 - (currentCapacity * chartH / 100 * grow)} 
            width={50} height={currentCapacity * chartH / 100 * grow} 
            fill={loss > 0.6 ? "#d0523f" : "#e0b44c"} opacity={0.7} 
          />
          <text x={225} y={345} fill="#e9f2f6" fontSize={14} textAnchor="middle" opacity={grow}>IST</text>
          <text x={225} y={362} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={grow * 0.7}>{Math.round(currentDepth)} mm</text>
          <text 
            x={225} y={320 - (currentCapacity * chartH / 100 * grow) - 10} 
            fill={loss > 0.6 ? "#d0523f" : "#e9f2f6"} 
            fontSize={18} fontWeight="bold" textAnchor="middle" opacity={grow}
          >
            {Math.round(currentCapacity)}%
          </text>
        </g>

        {/* Schematic Drawing: Console Cross-Section */}
        <g transform="translate(420, 100)">
          {/* Layer 1: Concrete Wall */}
          <rect x={0} y={0} width={80} height={220} fill="#5d6a73" opacity={0.4} />
          <text x={40} y={240} fill="#e9f2f6" fontSize={10} textAnchor="middle" opacity={0.5}>BETONWAND</text>
          
          {/* Layer 2: Reinforcement */}
          <line x1={20} y1={10} x2={20} y2={210} stroke="#c9d3d9" strokeWidth={2} strokeDasharray="2 2" />
          <line x1={10} y1={40} x2={30} y2={40} stroke="#c9d3d9" strokeWidth={1} />
          <line x1={10} y1={180} x2={30} y2={180} stroke="#c9d3d9" strokeWidth={1} />
          
          {/* Layer 3: Console Bracket */}
          <path 
            d={`M ${80 - (currentDepth * 0.4)} 60 L 180 60 L 180 110 L 80 160 L ${80 - (currentDepth * 0.4)} 160 Z`} 
            fill="#8a949b" stroke="#e9f2f6" strokeWidth={1.5} 
          />
          
          {/* Dimension: Einbindetiefe */}
          <g opacity={grow}>
            <line x1={80 - (currentDepth * 0.4)} y1={50} x2={80} y2={50} stroke="#e9f2f6" strokeWidth={1} markerStart="url(#dimline)" markerEnd="url(#dimline)" />
            <text x={80 - (currentDepth * 0.2)} y={40} fill="#e9f2f6" fontSize={10} textAnchor="middle">t</text>
          </g>

          {/* Force Arrow */}
          <g opacity={reveal}>
            <line x1={160} y1={20} x2={160} y2={52} stroke="#d0523f" strokeWidth={3} markerEnd="url(#arrowhead)" />
            <text x={165} y={35} fill="#d0523f" fontSize={12} fontWeight="bold">F</text>
          </g>

          {/* Labels for Schematic */}
          <line x1={180} y1={85} x2={210} y2={85} stroke="#e9f2f6" strokeWidth={0.5} opacity={reveal} />
          <text x={215} y={88} fill="#e9f2f6" fontSize={10} opacity={reveal}>STAHLKONSOLE</text>
        </g>
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: '12%',
          width: '100%',
          textAlign: 'center',
          color: '#e9f2f6',
          fontSize: 38,
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontWeight: 300,
          letterSpacing: '0.05em',
          opacity: reveal,
          transform: `translateY(${(1 - reveal) * 15}px)`
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};