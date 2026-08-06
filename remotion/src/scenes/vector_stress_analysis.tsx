import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VectorStressAnalysisScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const load = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const push = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const slide = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const ticks = [0, 1, 2, 3, 4];
  const colors = {
    text: '#e9f2f6',
    accent: '#e0b44c',
    danger: '#d0523f',
    joint: '#8a949b',
  };

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.6} viewBox="0 0 800 400" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={colors.text} strokeWidth="0.5" opacity="0.3" />
          </pattern>
          <marker id="arrowhead-amber" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={colors.accent} />
          </marker>
          <marker id="arrowhead-danger" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={colors.danger} />
          </marker>
        </defs>

        {/* Left Side: Vertical Compression */}
        <g transform="translate(100, 50)">
          <text x="100" y="-20" fill={colors.text} fontSize="14" textAnchor="middle" fontWeight="bold">VERTICAL COMPRESSION</text>
          
          {/* Base Block */}
          <rect x="20" y="200" width="160" height="60" fill={colors.joint} stroke={colors.text} strokeWidth="1" />
          <rect x="20" y="200" width="160" height="60" fill="url(#hatch)" />
          <path d="M 80 200 L 80 180 L 120 180 L 120 200" fill="none" stroke={colors.text} strokeWidth="1" />
          
          {/* Top Block */}
          <g transform={`translate(0, ${load * 5})`}>
            <rect x="40" y="100" width="120" height="80" fill={colors.joint} stroke={colors.text} strokeWidth="1" />
            <path d="M 80 180 L 80 200 L 120 200 L 120 180" fill={colors.joint} stroke={colors.text} strokeWidth="1" />
            <text x="100" y="145" fill={colors.text} fontSize="10" textAnchor="middle">STRUCTURAL MASS</text>
          </g>

          {/* Force Arrow */}
          <line x1="100" y1="10" x2="100" y2={10 + load * 80} stroke={colors.accent} strokeWidth="6" markerEnd="url(#arrowhead-amber)" />
          <text x="115" y={40} fill={colors.accent} fontSize="12" fontWeight="bold" opacity={load}>800 kN</text>

          {/* Resistance Indicator */}
          {ticks.map((t) => (
            <line key={t} x1="190" y1={200 + t * 15} x2="200" y2={200 + t * 15} stroke={colors.text} strokeWidth="1" />
          ))}
          <text x="210" y="235" fill={colors.accent} fontSize="10" transform="rotate(90, 210, 235)">HIGH RESISTANCE</text>
        </g>

        {/* Right Side: Lateral Force */}
        <g transform="translate(500, 50)">
          <text x="100" y="-20" fill={colors.text} fontSize="14" textAnchor="middle" fontWeight="bold">LATERAL SHEAR</text>

          {/* Base Block */}
          <rect x="20" y="200" width="160" height="60" fill={colors.joint} stroke={colors.text} strokeWidth="1" />
          <rect x="20" y="200" width="160" height="60" fill="url(#hatch)" />
          <path d="M 80 200 L 80 180 L 120 180 L 120 200" fill="none" stroke={colors.text} strokeWidth="1" />

          {/* Top Block (Sliding) */}
          <g transform={`translate(${slide * 120}, 0)`}>
            <rect x="40" y="100" width="120" height="80" fill={colors.joint} stroke={colors.text} strokeWidth="1" />
            <path d="M 80 180 L 80 200 L 120 200 L 120 180" fill={colors.joint} stroke={colors.text} strokeWidth="1" />
            <text x="100" y="145" fill={colors.text} fontSize="10" textAnchor="middle">STRUCTURAL MASS</text>
            
            {/* Failure Marks */}
            {slide > 0.2 && (
              <g stroke={colors.danger} strokeWidth="2">
                <line x1="80" y1="190" x2="70" y2="205" opacity={slide} />
                <line x1="120" y1="190" x2="130" y2="205" opacity={slide} />
              </g>
            )}
          </g>

          {/* Lateral Force Arrow */}
          <line x1="-40" y1="140" x2={-40 + push * 70} y2="140" stroke={colors.danger} strokeWidth="6" markerEnd="url(#arrowhead-danger)" />
          <text x="-30" y="130" fill={colors.danger} fontSize="12" fontWeight="bold" opacity={push}>50 kN</text>

          {/* Resistance Indicator */}
          {ticks.map((t) => (
            <line key={t} x1="190" y1={200 + t * 15} x2="200" y2={200 + t * 15} stroke={colors.text} strokeWidth="1" />
          ))}
          <text x="210" y="235" fill={colors.danger} fontSize="10" transform="rotate(90, 210, 235)">ZERO RESISTANCE</text>
        </g>

        {/* Comparison Scale */}
        <g transform="translate(100, 350)">
          <line x1="0" y1="0" x2="600" y2="0" stroke={colors.text} strokeWidth="1" strokeDasharray="4 4" />
          {ticks.map((t) => (
            <g key={t} transform={`translate(${t * 150}, 0)`}>
              <line x1="0" y1="-5" x2="0" y2="5" stroke={colors.text} strokeWidth="1" />
              <text x="0" y="20" fill={colors.text} fontSize="9" textAnchor="middle">{t * 250} kN FORCE</text>
            </g>
          ))}
        </g>
      </svg>

      {p.title && (
        <div style={{
          marginTop: 40,
          fontFamily: 'monospace',
          fontSize: 28,
          color: colors.text,
          letterSpacing: '2px',
          borderTop: `1px solid ${colors.text}`,
          paddingTop: 10,
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};