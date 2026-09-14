import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const QuerschnittDammaufbauScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fillReveal = interpolate(frame, [span * 0.3, span * 0.6], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labels = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Dam Geometry
  const groundY = 400;
  const crestY = 120;
  const centerX = 400;
  
  // Outer Shell (Rock)
  const outerBaseWidth = 600;
  const outerCrestWidth = 40;
  const outerPath = `M ${centerX - outerBaseWidth / 2} ${groundY} L ${centerX - outerCrestWidth / 2} ${crestY} L ${centerX + outerCrestWidth / 2} ${crestY} L ${centerX + outerBaseWidth / 2} ${groundY} Z`;

  // Inner Shell (Sand/Gravel)
  const innerBaseWidth = 300;
  const innerCrestWidth = 30;
  const innerPath = `M ${centerX - innerBaseWidth / 2} ${groundY} L ${centerX - innerCrestWidth / 2} ${crestY} L ${centerX + innerCrestWidth / 2} ${crestY} L ${centerX + innerBaseWidth / 2} ${groundY} Z`;

  // Core (Silt)
  const coreBaseWidth = 100;
  const coreCrestWidth = 20;
  const corePath = `M ${centerX - coreBaseWidth / 2} ${groundY} L ${centerX - coreCrestWidth / 2} ${crestY} L ${centerX + coreCrestWidth / 2} ${crestY} L ${centerX + coreBaseWidth / 2} ${groundY} Z`;

  const materialLabels = [
    { x: 400, y: 200, tx: 400, ty: 60, text: 'KERN (SCHLUFF)' },
    { x: 280, y: 280, tx: 180, ty: 80, text: 'SAND & KIES' },
    { x: 150, y: 350, tx: 80, ty: 120, text: 'STÜTZSCHALE (GESTEIN)' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 800 500" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="hatch-core" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(90)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#e0b44c" strokeWidth="1" />
          </pattern>
          <pattern id="hatch-sand" patternUnits="userSpaceOnUse" width="6" height="6">
            <circle cx="1" cy="1" r="0.8" fill="#e9f2f6" opacity="0.6" />
            <circle cx="4" cy="4" r="0.5" fill="#e9f2f6" opacity="0.4" />
          </pattern>
          <pattern id="hatch-rock" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.5" />
            <path d="M 3 3 L 5 5 L 3 7" fill="none" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* Ground Line */}
        <line 
          x1={50} y1={groundY} x2={750} y2={groundY} 
          stroke="#e9f2f6" strokeWidth={1} 
          strokeDasharray="1000" strokeDashoffset={1000 * (1 - draw)} 
        />

        {/* Outer Shell */}
        <path d={outerPath} fill="url(#hatch-rock)" stroke="#e9f2f6" strokeWidth={1.5} opacity={fillReveal * 0.8} />
        
        {/* Inner Shell */}
        <path d={innerPath} fill="url(#hatch-sand)" stroke="#e9f2f6" strokeWidth={1} opacity={fillReveal} />

        {/* Core */}
        <path d={corePath} fill="url(#hatch-core)" stroke="#e0b44c" strokeWidth={2} opacity={fillReveal} />

        {/* Outlines (drawn) */}
        <path d={outerPath} fill="none" stroke="#e9f2f6" strokeWidth={1} strokeDasharray="2000" strokeDashoffset={2000 * (1 - draw)} />

        {/* Dimension Line */}
        <g opacity={labels}>
          <line x1={720} y1={groundY} x2={720} y2={crestY} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={710} y1={groundY} x2={730} y2={groundY} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={710} y1={crestY} x2={730} y2={crestY} stroke="#e9f2f6" strokeWidth={1} />
          <text x={735} y={(groundY + crestY) / 2} fill="#e9f2f6" fontSize={18} fontWeight="bold" dominantBaseline="middle">93 m</text>
        </g>

        {/* Leader Lines and Labels */}
        {materialLabels.map((m, i) => (
          <g key={i} opacity={labels}>
            <circle cx={m.x} cy={m.y} r="3" fill="#e9f2f6" />
            <path d={`M ${m.x} ${m.y} L ${m.tx} ${m.ty} L ${m.tx > 400 ? m.tx + 20 : m.tx - 20} ${m.ty}`} fill="none" stroke="#e9f2f6" strokeWidth={1} />
            <text 
              x={m.tx} y={m.ty - 10} 
              fill={i === 0 ? "#e0b44c" : "#e9f2f6"} 
              fontSize={14} 
              textAnchor={m.tx > 400 ? "start" : m.tx < 400 ? "end" : "middle"}
              fontFamily="monospace"
            >
              {m.text}
            </text>
          </g>
        ))}
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          color: '#e9f2f6',
          fontSize: 42,
          fontFamily: 'Helvetica, Arial, sans-serif',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          opacity: labels,
          transform: `translateY(${titleRise}px)`
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};