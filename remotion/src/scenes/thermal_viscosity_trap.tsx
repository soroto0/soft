import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ThermalViscosityTrapScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const flow = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const freeze = interpolate(frame, [span * 0.3, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const temp = interpolate(frame, [0, span * 0.9], [68, 42], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const vapor = interpolate(frame, [span * 0.45, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  
  const molecules = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const tempTicks = [45, 50, 55, 60, 65];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.7} viewBox="0 0 600 400">
        <defs>
          <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#e9f2f6" stopOpacity={0.3} />
          </linearGradient>
        </defs>

        {/* Temperature Scale */}
        <g transform="translate(520, 50)">
          <line x1="0" y1="0" x2="0" y2="300" stroke="#e9f2f6" strokeWidth="1" />
          {tempTicks.map((t) => {
            const y = interpolate(t, [40, 70], [300, 0]);
            return (
              <g key={t} transform={`translate(0, ${y})`}>
                <line x1="0" y1="0" x2="8" y2="0" stroke="#e9f2f6" strokeWidth="1" />
                <text x="12" y="4" fill={t === 55 ? "#d0523f" : "#e9f2f6"} fontSize="10" fontFamily="monospace">
                  {t}°F
                </text>
              </g>
            );
          })}
          {/* Temperature Indicator */}
          <g transform={`translate(0, ${interpolate(temp, [40, 70], [300, 0])})`}>
            <path d="M -15 0 L -5 -5 L -5 5 Z" fill={temp < 55 ? "#d0523f" : "#e0b44c"} />
            <text x="-20" y="4" fill={temp < 55 ? "#d0523f" : "#e0b44c"} fontSize="12" textAnchor="end" fontWeight="bold">
              {temp.toFixed(1)}°
            </text>
          </g>
        </g>

        {/* Glass Cross-Section */}
        <rect x="80" y="50" width="60" height="300" fill="url(#glassGrad)" stroke="#e9f2f6" strokeWidth="1" />
        <text x="110" y="40" fill="#e9f2f6" fontSize="10" textAnchor="middle" letterSpacing="1">SUBSTRATE: GLASS</text>
        
        {/* Solution Layer */}
        <rect 
          x="140" 
          y="50" 
          width={interpolate(flow, [0, 1], [0, 280])} 
          height="300" 
          fill="#e0b44c" 
          fillOpacity={interpolate(freeze, [0, 1], [0.2, 0.6])}
          stroke="#e0b44c"
          strokeWidth={interpolate(flow, [0, 1], [0, 1])}
        />
        
        {/* Molecules */}
        {molecules.map((m) => {
          const row = Math.floor(m / 3);
          const col = m % 3;
          const baseX = 180 + col * 60;
          const baseY = 100 + row * 60;
          
          // Jitter decreases as freeze increases
          const jitter = (1 - freeze) * 5;
          const offsetX = Math.sin(frame * 0.2 + m) * jitter;
          const offsetY = Math.cos(frame * 0.2 + m) * jitter;
          
          // Cluster towards the glass (left) as freeze increases
          const clusterX = interpolate(freeze, [0, 1], [baseX, 160 + col * 20]);
          
          return (
            <circle 
              key={m}
              cx={clusterX + offsetX}
              cy={baseY + offsetY}
              r={interpolate(freeze, [0, 1], [4, 6])}
              fill="#e9f2f6"
              opacity={flow}
            />
          );
        })}

        {/* Trapped Vapor Bubbles */}
        {molecules.map((m) => {
          const yPos = 80 + m * 22;
          const xPos = 145 + (m % 2) * 5;
          return (
            <circle 
              key={`v-${m}`}
              cx={xPos}
              cy={yPos}
              r="3"
              fill="#5b7f9c"
              opacity={vapor}
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Labels */}
        <g opacity={flow}>
          <line x1="140" y1="360" x2="420" y2="360" stroke="#e0b44c" strokeWidth="1" strokeDasharray="4 2" />
          <text x="280" y="375" fill="#e0b44c" fontSize="10" textAnchor="middle">SOLUTION INTERFACE</text>
        </g>

        <g opacity={vapor}>
          <path d="M 145 200 L 100 220" stroke="#5b7f9c" strokeWidth="1" fill="none" />
          <text x="95" y="235" fill="#5b7f9c" fontSize="9" textAnchor="middle">TRAPPED VAPOR</text>
        </g>

        {/* Critical Threshold Marker */}
        <line x1="80" y1="50" x2="520" y2="50" stroke="#d0523f" strokeWidth="0.5" strokeDasharray="2 2" opacity={0.4} />
        <text x="480" y="45" fill="#d0523f" fontSize="8" textAnchor="end">CRITICAL VISCOSITY LIMIT</text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          color: '#e9f2f6',
          fontFamily: 'monospace',
          fontSize: 28,
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};