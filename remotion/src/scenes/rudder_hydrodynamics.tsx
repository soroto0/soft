import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RudderHydrodynamicsScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const tilt = interpolate(frame, [0, span * 0.4], [0, 15], {
    easing: Easing.out(Easing.quad),
    extrapolateRight: 'clamp',
  });

  const turb = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateRight: 'clamp',
  });

  const flow = interpolate(frame, [0, span], [0, 200]);

  const captionY = interpolate(frame, [0, span * 0.2], [40, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateRight: 'clamp',
  });

  const forceMag = interpolate(turb, [0, 1], [60, 10], {
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'L1', d: 'M -120,-100 Q -120,50 0,100 Q 120,50 120,-100', fill: '#5d6a73', name: 'BALLAST' },
    { id: 'L2', d: 'M -130,-100 Q -130,60 0,115 Q 130,60 130,-100', fill: '#8a949b', name: 'SPANTEN' },
    { id: 'L3', d: 'M -140,-100 Q -140,70 0,130 Q 140,70 140,-100', fill: '#c9d3d9', name: 'AUSSENHAUT' },
  ];

  const flowLines = [-80, -40, 0, 40, 80];
  const vortices = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 800 600"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="pressGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="50%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#e9f2f6" />
          </linearGradient>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e0b44c" />
          </marker>
          <marker id="dangerArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#d0523f" />
          </marker>
        </defs>

        {/* Flow Gradient Scale */}
        <rect x="550" y="100" width="150" height="10" fill="url(#pressGrad)" opacity={0.6} />
        <text x="550" y="90" fill="#e9f2f6" fontSize="10">980 hPa</text>
        <text x="700" y="90" fill="#e9f2f6" fontSize="10" textAnchor="end">1030 hPa</text>
        <text x="625" y="125" fill="#e9f2f6" fontSize="10" textAnchor="middle">DRUCKVERTEILUNG</text>

        {/* Background Flow Lines */}
        {flowLines.map((yOffset, i) => (
          <path
            key={`flow-${i}`}
            d={`M 100 ${300 + yOffset} L 700 ${300 + yOffset}`}
            stroke="#e0b44c"
            strokeWidth="1.5"
            strokeDasharray="20 15"
            strokeDashoffset={-flow}
            opacity={0.3}
          />
        ))}

        {/* Tilted Ship Group */}
        <g transform={`translate(400, 250) rotate(${tilt})`}>
          {/* Hull Layers */}
          {layers.reverse().map((layer, i) => (
            <g key={layer.id}>
              <path d={layer.d} fill={layer.fill} stroke="#e9f2f6" strokeWidth="1" />
              <line x1={130 - i * 10} y1={-20} x2={180} y2={-60 + i * 25} stroke="#e9f2f6" strokeWidth="0.5" opacity={0.7} />
              <text x="185" y={-57 + i * 25} fill="#e9f2f6" fontSize="10" opacity={0.8}>{layer.name}</text>
            </g>
          ))}

          {/* Rudder Blade */}
          <rect x="-10" y="130" width="20" height="120" fill="#8a949b" stroke="#e9f2f6" strokeWidth="2" />
          <text x="25" y="200" fill="#e9f2f6" fontSize="12" fontWeight="bold">RUDERBLATT</text>
          
          {/* Force Arrow */}
          <line 
            x1="0" y1="190" 
            x2={forceMag} y2="190" 
            stroke={turb > 0.7 ? "#d0523f" : "#e0b44c"} 
            strokeWidth="4" 
            markerEnd={turb > 0.7 ? "url(#dangerArrow)" : "url(#arrow)"} 
          />
          <text x={forceMag + 10} y="185" fill={turb > 0.7 ? "#d0523f" : "#e0b44c"} fontSize="10">
            {turb > 0.7 ? "STRÖMUNGSRISS" : "STEUERDRUCK"}
          </text>

          {/* Angle Indicator */}
          <path d="M 0 -150 L 0 -200" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 4" transform={`rotate(${-tilt})`} />
          <path d="M 0 -150 L 0 -200" stroke="#e0b44c" strokeWidth="2" />
          <text x="5" y="-210" fill="#e0b44c" fontSize="14" textAnchor="middle">{tilt.toFixed(1)}° NEIGUNG</text>
        </g>

        {/* Turbulence / Vortices */}
        {turb > 0.1 && vortices.map((v) => (
          <g key={v} opacity={turb} transform={`translate(${450 + v * 40}, ${380 + (v % 2) * 30})`}>
            <path
              d="M -10 0 Q 0 -15 10 0 Q 0 15 -10 0"
              fill="none"
              stroke="#d0523f"
              strokeWidth="2"
              strokeDasharray="5 3"
              transform={`rotate(${frame * 5 + v * 90}) scale(${turb})`}
            />
          </g>
        ))}

        {/* Waterline */}
        <line x1="100" y1="150" x2="700" y2="150" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="10 5" opacity={0.5} />
        <text x="110" y="140" fill="#e9f2f6" fontSize="10" opacity={0.5}>WASSERLINIE (RUHE)</text>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: 32,
            color: '#e9f2f6',
            letterSpacing: '2px',
            transform: `translateY(${captionY}px)`,
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};