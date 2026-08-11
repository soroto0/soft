import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CurrencyHierarchyScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const drawProgress = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subdivisionProgress = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rotation = interpolate(frame, [0, span], [0, 15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelOpacity = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sueldos = Array.from({ length: 20 });
  const dinerosPerSueldo = Array.from({ length: 12 });

  const centerX = 500;
  const centerY = 500;
  const rLibra = 220;
  const rSueldo = 150;
  const rDinero = 80;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 1000 1000"
        style={{ overflow: 'visible' }}
      >
        <g transform={`rotate(${rotation}, ${centerX}, ${centerY})`}>
          {/* Libra - Outer Ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={rLibra}
            fill="none"
            stroke="#e0b44c"
            strokeWidth={6}
            strokeDasharray={`${2 * Math.PI * rLibra}`}
            strokeDashoffset={2 * Math.PI * rLibra * (1 - drawProgress)}
          />
          
          {/* Sueldo - Middle Ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={rSueldo}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={3}
            opacity={subdivisionProgress}
          />

          {/* Dinero - Inner Ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={rDinero}
            fill="none"
            stroke="#d0523f"
            strokeWidth={1.5}
            opacity={subdivisionProgress * 0.8}
          />

          {/* Sueldo Subdivisions (20) */}
          {sueldos.map((_, i) => {
            const angle = (i * 360) / 20;
            const x1 = centerX + Math.cos((angle * Math.PI) / 180) * rSueldo;
            const y1 = centerY + Math.sin((angle * Math.PI) / 180) * rSueldo;
            const x2 = centerX + Math.cos((angle * Math.PI) / 180) * rLibra;
            const y2 = centerY + Math.sin((angle * Math.PI) / 180) * rLibra;

            return (
              <g key={`sueldo-${i}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x1 + (x2 - x1) * subdivisionProgress}
                  y2={y1 + (y2 - y1) * subdivisionProgress}
                  stroke="#e9f2f6"
                  strokeWidth={2}
                />
                
                {/* Dinero Subdivisions (12 per Sueldo) */}
                {dinerosPerSueldo.map((__, j) => {
                  const subAngle = angle + (j * (360 / 20)) / 12;
                  const dx1 = centerX + Math.cos((subAngle * Math.PI) / 180) * rDinero;
                  const dy1 = centerY + Math.sin((subAngle * Math.PI) / 180) * rDinero;
                  const dx2 = centerX + Math.cos((subAngle * Math.PI) / 180) * rSueldo;
                  const dy2 = centerY + Math.sin((subAngle * Math.PI) / 180) * rSueldo;
                  
                  return (
                    <line
                      key={`dinero-${i}-${j}`}
                      x1={dx1}
                      y1={dy1}
                      x2={dx1 + (dx2 - dx1) * subdivisionProgress}
                      y2={dy1 + (dy2 - dy1) * subdivisionProgress}
                      stroke="#d0523f"
                      strokeWidth={0.5}
                      opacity={subdivisionProgress * 0.4}
                    />
                  );
                })}
              </g>
            );
          })}
        </g>

        {/* Labels */}
        <g opacity={labelOpacity} style={{ fontFamily: 'monospace', fontSize: 18 }}>
          <text x={centerX} y={centerY - rLibra - 20} fill="#e0b44c" textAnchor="middle">1 LIBRA</text>
          <text x={centerX} y={centerY - rSueldo - 10} fill="#e9f2f6" textAnchor="middle">20 SUELDOS</text>
          <text x={centerX} y={centerY - rDinero + 25} fill="#d0523f" textAnchor="middle" fontSize={14}>240 DINEROS</text>
          
          {/* Schematic Legend */}
          <line x1={750} y1={800} x2={800} y2={800} stroke="#e0b44c" strokeWidth={4} />
          <text x={810} y={805} fill="#e9f2f6" fontSize={14}>= 20 Sueldos</text>
          <line x1={750} y1={830} x2={800} y2={830} stroke="#e9f2f6" strokeWidth={2} />
          <text x={810} y={835} fill="#e9f2f6" fontSize={14}>= 12 Dineros</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.1,
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'serif',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: labelOpacity,
            borderTop: '1px solid #e9f2f6',
            paddingTop: 10,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};