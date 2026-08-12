import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PoreWaterConsolidationScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const compress = interpolate(frame, [span * 0.1, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [span * 0.2, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleFade = interpolate(frame, [0, span * 0.2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const particles = [
    { cx: 100, cy: 100, rx: 45, ry: 30 },
    { cx: 200, cy: 85, rx: 50, ry: 35 },
    { cx: 300, cy: 105, rx: 42, ry: 32 },
    { cx: 120, cy: 170, rx: 48, ry: 38 },
    { cx: 220, cy: 185, rx: 55, ry: 40 },
    { cx: 310, cy: 175, rx: 46, ry: 34 },
    { cx: 90, cy: 260, rx: 52, ry: 36 },
    { cx: 190, cy: 270, rx: 44, ry: 33 },
    { cx: 290, cy: 255, rx: 50, ry: 39 },
  ];

  const loadArrows = [100, 200, 300];
  const flowYPositions = [100, 180, 260];
  const currentHeight = 320 - (compress * 70);

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        width={width * 0.75}
        height={height * 0.65}
        viewBox="0 0 400 400"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker id="arrow-load" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d0523f" />
          </marker>
          <marker id="arrow-flow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#5b7f9c" />
          </marker>
          <linearGradient id="clayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8a949b" />
            <stop offset="100%" stopColor="#5d6a73" />
          </linearGradient>
        </defs>

        {/* Soil Layer Container */}
        <rect 
          x="40" 
          y="60" 
          width="320" 
          height={currentHeight} 
          fill="none" 
          stroke="#e9f2f6" 
          strokeWidth="1" 
          strokeDasharray="4 2"
        />

        {/* Water in Pores (Background Fill) */}
        <rect
          x="45"
          y="65"
          width="310"
          height={currentHeight - 10}
          fill="#5b7f9c"
          opacity={0.3 * (1 - compress * 0.6)}
        />

        {/* Clay Particles */}
        {particles.map((p, i) => (
          <ellipse
            key={i}
            cx={p.cx}
            cy={p.cy - (compress * (p.cy * 0.15))}
            rx={p.rx}
            ry={p.ry * (1 - compress * 0.25)}
            fill="url(#clayGrad)"
            stroke="#e9f2f6"
            strokeWidth="0.5"
          />
        ))}

        {/* Vertical Load Arrows (Skyscraper Weight) */}
        {loadArrows.map((x) => (
          <g key={`load-${x}`}>
            <line
              x1={x} y1="5" x2={x} y2="50"
              stroke="#d0523f" strokeWidth="3"
              markerEnd="url(#arrow-load)"
            />
          </g>
        ))}
        <text x="200" y="25" fill="#d0523f" fontSize="12" textAnchor="middle" fontWeight="bold">CARGA ESTRUCTURAL (P)</text>

        {/* Horizontal Water Expulsion Arrows */}
        {flowYPositions.map((y, i) => {
          const adjustedY = y - (compress * (y * 0.15));
          return (
            <g key={`flow-${i}`}>
              {/* Right Expulsion */}
              <line
                x1="340" y1={adjustedY}
                x2={340 + (flow * 45)} y2={adjustedY}
                stroke="#5b7f9c" strokeWidth="2"
                markerEnd="url(#arrow-flow)"
                opacity={flow}
              />
              {/* Left Expulsion */}
              <line
                x1="60" y1={adjustedY}
                x2={60 - (flow * 45)} y2={adjustedY}
                stroke="#5b7f9c" strokeWidth="2"
                markerEnd="url(#arrow-flow)"
                opacity={flow}
              />
            </g>
          );
        })}

        {/* Labels and Annotations */}
        <text x="370" y="180" fill="#5b7f9c" fontSize="10" opacity={flow} fontWeight="bold">EXPULSIÓN</text>
        <text x="30" y="180" fill="#5b7f9c" fontSize="10" opacity={flow} fontWeight="bold" textAnchor="end">H₂O</text>
        
        <g opacity={titleFade}>
          <text x="200" y={currentHeight + 85} fill="#8a949b" fontSize="9" textAnchor="middle">MICROPÓROS DE ARCILLA SATURADA</text>
          <line x1="100" y1={currentHeight + 75} x2="300" y2={currentHeight + 75} stroke="#e9f2f6" strokeWidth="0.5" />
          <text x="200" y={currentHeight + 70} fill="#e9f2f6" fontSize="8" textAnchor="middle">Δh = -{(compress * 15).toFixed(1)}% ESPESOR</text>
        </g>

        {/* Scale Bar */}
        <line x1="40" y1="380" x2="140" y2="380" stroke="#e9f2f6" strokeWidth="1" />
        <line x1="40" y1="375" x2="40" y2="385" stroke="#e9f2f6" strokeWidth="1" />
        <line x1="140" y1="375" x2="140" y2="385" stroke="#e9f2f6" strokeWidth="1" />
        <text x="90" y="395" fill="#e9f2f6" fontSize="9" textAnchor="middle">50 μm</text>
      </svg>

      {p.title && (
        <div style={{
          marginTop: 40,
          color: '#e9f2f6',
          fontSize: 36,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 600,
          letterSpacing: '0.05em',
          opacity: titleFade,
          backgroundColor: 'rgba(0,0,0,0.2)',
          padding: '8px 24px',
          borderLeft: '4px solid #e0b44c'
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};