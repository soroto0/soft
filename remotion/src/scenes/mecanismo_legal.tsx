import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MecanismoLegalScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const morph = interpolate(frame, [span * 0.1, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const boxY = interpolate(frame, [0, span * 0.4], [-150, 120], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const colorEval = interpolate(frame, [span * 0.5, span * 0.8], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.6, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const r = interpolate(colorEval, [0, 1], [233, 208], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const g = interpolate(colorEval, [0, 1], [242, 82], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const b = interpolate(colorEval, [0, 1], [246, 63], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const activeColor = `rgb(${r}, ${g}, ${b})`;

  const points = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
    const angle = (i / 8) * Math.PI * 2;
    const startX = 100 + i * 75;
    const startY = 400;
    const endX = 400 + 180 * Math.cos(angle - Math.PI / 2);
    const endY = 350 + 180 * Math.sin(angle - Math.PI / 2);
    return {
      x: interpolate(morph, [0, 1], [startX, endX], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      y: interpolate(morph, [0, 1], [startY, endY], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    };
  });

  const pathD = `M ${points[0].x} ${points[0].y} ${points.map(pt => `L ${pt.x} ${pt.y}`).join(' ')} ${morph > 0.9 ? 'Z' : ''}`;

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width="100%" height="100%" viewBox="0 0 800 600" fill="none">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Article 19 Document Block */}
        <g transform={`translate(400, ${boxY})`}>
          <rect x="-80" y="-60" width="160" height="100" fill="#e9f2f6" opacity={0.15} stroke="#e9f2f6" strokeWidth="1" />
          <text y="-35" fill="#e0b44c" fontSize="12" textAnchor="middle" fontWeight="bold" style={{ letterSpacing: 2 }}>ARTÍCULO 19</text>
          <line x1="-60" y1="-15" x2="60" y2="-15" stroke="#e9f2f6" strokeWidth="0.5" opacity={0.5} />
          <line x1="-60" y1="-5" x2="40" y2="-5" stroke="#e9f2f6" strokeWidth="0.5" opacity={0.5} />
          <line x1="-60" y1="5" x2="50" y2="5" stroke="#e9f2f6" strokeWidth="0.5" opacity={0.5} />
          <text y="30" fill="#d0523f" fontSize="10" textAnchor="middle" opacity={morph}>ENTREGA INMEDIATA</text>
          <path d="M 0 40 L 0 80" stroke="#e0b44c" strokeWidth="1" strokeDasharray="4 2" />
          <path d="M -5 75 L 0 80 L 5 75" stroke="#e0b44c" strokeWidth="1" />
        </g>

        {/* The Morphing Trap Path */}
        <path
          d={pathD}
          stroke={activeColor}
          strokeWidth={interpolate(morph, [0, 1], [1, 2.5])}
          filter={colorEval > 0.5 ? "url(#glow)" : "none"}
        />

        {/* Perimeter Ticks */}
        {points.map((pt, i) => (
          <line
            key={i}
            x1={pt.x}
            y1={pt.y}
            x2={pt.x + (pt.x - 400) * 0.05 * morph}
            y2={pt.y + (pt.y - 350) * 0.05 * morph}
            stroke={activeColor}
            strokeWidth="1"
            opacity={morph * 0.6}
          />
        ))}

        {/* Labels */}
        <text x="400" y="355" fill="#e9f2f6" fontSize="14" textAnchor="middle" opacity={1 - colorEval}>
          {morph < 0.5 ? "ESPACIO DE ASILO" : "ZONA DE CAPTURA"}
        </text>
        
        <g opacity={labelAlpha}>
          <text x="400" y="380" fill="#d0523f" fontSize="18" textAnchor="middle" fontWeight="bold">
            SUCURSAL GESTAPO
          </text>
          <circle cx="400" cy="350" r={180} stroke="#d0523f" strokeWidth="0.5" strokeDasharray="10 5" opacity={0.3} />
        </g>

        {/* Scale/Reference lines */}
        <line x1="100" y1="500" x2="700" y2="500" stroke="#e9f2f6" strokeWidth="0.5" opacity={0.2} />
        {[100, 250, 400, 550, 700].map((x) => (
          <text key={x} x={x} y="520" fill="#e9f2f6" fontSize="8" textAnchor="middle" opacity={0.3}>
            {x}km
          </text>
        ))}
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: 60,
          width: '100%',
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: 28,
          color: '#e9f2f6',
          letterSpacing: '4px',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};