import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VibrationPropagationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));
  const opacity = p.enter * p.exit;

  const waveAmplitude = interpolate(frame, [0, span * 0.2], [0, 7], {
    easing: Easing.out(Easing.quad),
    extrapolateRight: 'clamp',
  });

  const waveShift = interpolate(frame, [0, fps], [0, Math.PI * 2], {
    extrapolateRight: 'extend',
  });

  const stressAlpha = interpolate(frame, [span * 0.3, span * 0.8], [0, 0.5], {
    easing: Easing.inOut(Easing.quad),
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [0, span * 0.15], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: 'clamp',
  });

  const cols = [220, 400, 580];
  const groundY = 360;
  const roofY = 140;
  const segments = 30;

  const getWavePath = (x: number) => {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const y = groundY - (i / segments) * (groundY - roofY);
      const dx = Math.sin(i * 0.6 - waveShift) * waveAmplitude;
      points.push(`${x + dx},${y}`);
    }
    return `M ${points.join(' L ')}`;
  };

  const roofSegments = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 450">
        <defs>
          <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={stressAlpha} />
            <stop offset="100%" stopColor="#e0b44c" stopOpacity={stressAlpha * 0.5} />
          </linearGradient>
        </defs>

        {/* Ground */}
        <line x1="100" y1={groundY} x2="700" y2={groundY} stroke="#e9f2f6" strokeWidth="2" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line 
            key={`g-${i}`} 
            x1={150 + i * 83} y1={groundY} 
            x2={130 + i * 83} y2={groundY + 15} 
            stroke="#e9f2f6" strokeWidth="1" opacity={0.4} 
          />
        ))}
        <text x="400" y={groundY + 40} fill="#e9f2f6" fontSize="12" textAnchor="middle" letterSpacing="2">
          BODENVIBRATION DURCH TRÜMMERLAST
        </text>

        {/* Stress Highlight on Roof */}
        <rect x="180" y={roofY - 20} width="440" height="60" fill="url(#stressGrad)" rx="4" />

        {/* Structural Wireframe */}
        {cols.map((x) => (
          <g key={`col-${x}`}>
            <line x1={x} y1={groundY} x2={x} y2={roofY} stroke="#e9f2f6" strokeWidth="1.5" opacity={0.3} />
            <path d={getWavePath(x)} fill="none" stroke="#e0b44c" strokeWidth="2" />
            <circle cx={x} cy={groundY} r="4" fill="#e9f2f6" />
          </g>
        ))}

        {/* Roof Truss */}
        <line x1="180" y1={roofY} x2="620" y2={roofY} stroke="#e9f2f6" strokeWidth="3" />
        <line x1="180" y1={roofY + 30} x2="620" y2={roofY + 30} stroke="#e9f2f6" strokeWidth="2" />
        {roofSegments.map((i) => (
          <line 
            key={`truss-${i}`}
            x1={180 + i * 55} y1={roofY} 
            x2={180 + (i + 1) * 55} y2={roofY + 30} 
            stroke="#e9f2f6" strokeWidth="1" opacity={0.6}
          />
        ))}

        {/* Labels */}
        <g opacity={stressAlpha * 2}>
          <text x="630" y={roofY + 15} fill="#e0b44c" fontSize="14" fontWeight="bold">ÜBERLASTET</text>
          <path d="M 625,145 L 650,145" stroke="#e0b44c" strokeWidth="1" />
        </g>

        <text x="210" y={roofY - 30} fill="#e9f2f6" fontSize="10" opacity={0.7}>VERBLIEBENE STRUKTUR</text>
        <text x="400" y={250} fill="#d0523f" fontSize="11" textAnchor="middle" opacity={stressAlpha}>
          KRITISCHE RESONANZÜBERTRAGUNG
        </text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          fontSize: 42,
          fontWeight: 700,
          color: '#e9f2f6',
          letterSpacing: '0.1em',
          transform: `translateY(${titleSlide}px)`,
          textShadow: '0 4px 10px rgba(0,0,0,0.3)'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};