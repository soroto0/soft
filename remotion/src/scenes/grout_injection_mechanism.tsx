import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GroutInjectionMechanismScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const injection = interpolate(frame, [span * 0.1, span * 0.8], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [0, span * 0.9], [0, 120], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alert = interpolate(frame, [span * 0.6, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 0, h: 120, label: 'SEDIMENTARY LAYER', fill: '#2a353d' },
    { y: 120, h: 160, label: 'FRACTURED LIMESTONE', fill: '#34414a' },
    { y: 280, h: 120, label: 'CRYSTALLINE BASALT', fill: '#1e262c' },
  ];

  const fissures = [
    { x1: 250, y1: 140, x2: 100, y2: 130, vital: false },
    { x1: 250, y1: 180, x2: 420, y2: 170, vital: false },
    { x1: 250, y1: 220, x2: 80, y2: 240, vital: false },
    { x1: 250, y1: 260, x2: 440, y2: 280, vital: true },
    { x1: 250, y1: 310, x2: 120, y2: 330, vital: false },
  ];

  const ticks = [0, 40, 80, 120, 160];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.85} height={height * 0.85} viewBox="0 0 500 400">
        <defs>
          <linearGradient id="groutGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8a949b" />
            <stop offset="50%" stopColor="#e9f2f6" />
            <stop offset="100%" stopColor="#8a949b" />
          </linearGradient>
          <linearGradient id="gaugeGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5b7f9c" />
            <stop offset="70%" stopColor="#e0b44c" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {/* Geological Layers */}
        {layers.map((layer, i) => (
          <g key={i}>
            <rect x={50} y={layer.y} width={400} height={layer.h} fill={layer.fill} stroke="#e9f2f6" strokeWidth={0.5} opacity={0.3} />
            <text x={60} y={layer.y + 20} fill="#e9f2f6" fontSize={8} fontFamily="monospace" opacity={0.5}>{layer.label}</text>
          </g>
        ))}

        {/* Drill Hole */}
        <rect x={242} y={40} width={16} height={320} fill="#000" stroke="#e9f2f6" strokeWidth={1.5} />
        <text x={250} y={30} fill="#e9f2f6" fontSize={10} textAnchor="middle" fontWeight="bold">BOHRLOCH</text>

        {/* Fissures and Injection */}
        {fissures.map((f, i) => {
          const dx = f.x2 - f.x1;
          const dy = f.y2 - f.y1;
          const currentX = f.x1 + dx * (f.vital ? 0 : injection);
          const currentY = f.y1 + dy * (f.vital ? 0 : injection);
          
          return (
            <g key={i}>
              {/* The Fissure Path */}
              <line 
                x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} 
                stroke={f.vital ? (alert > 0.5 ? '#e0b44c' : '#e9f2f6') : '#e9f2f6'} 
                strokeWidth={f.vital ? 2 : 1} 
                strokeDasharray={f.vital ? "none" : "4,2"}
                opacity={f.vital ? 1 : 0.6}
              />
              
              {/* The Grout Flow */}
              {!f.vital && (
                <line 
                  x1={f.x1} y1={f.y1} x2={currentX} y2={currentY} 
                  stroke="url(#groutGrad)" 
                  strokeWidth={4} 
                  strokeLinecap="round"
                />
              )}

              {/* Vital Fissure Alert Label */}
              {f.vital && (
                <g opacity={alert}>
                  <circle cx={f.x2} cy={f.y2} r={4} fill="#e0b44c" />
                  <text x={f.x2 + 10} y={f.y2 + 4} fill="#e0b44c" fontSize={9} fontWeight="bold">UNVERSCHLOSSEN</text>
                </g>
              )}
            </g>
          );
        })}

        {/* Pressure Gauge */}
        <g transform="translate(460, 100)">
          <rect x={0} y={0} width={12} height={200} fill="#1a2228" stroke="#e9f2f6" strokeWidth={1} />
          <rect x={1} y={200 - (pressure / 160) * 200} width={10} height={(pressure / 160) * 200} fill="url(#gaugeGrad)" />
          {ticks.map(t => (
            <g key={t} transform={`translate(0, ${200 - (t / 160) * 200})`}>
              <line x1={-5} y1={0} x2={0} y2={0} stroke="#e9f2f6" strokeWidth={1} />
              <text x={-28} y={4} fill="#e9f2f6" fontSize={8} textAnchor="start">{t} bar</text>
            </g>
          ))}
          <text x={6} y={215} fill="#e9f2f6" fontSize={9} textAnchor="middle">DRUCK</text>
        </g>

        {/* Injection Head */}
        <rect x={235} y={40} width={30} height={10} fill="#8a949b" stroke="#e9f2f6" />
        <path d="M 235 40 L 250 20 L 265 40 Z" fill="#8a949b" stroke="#e9f2f6" />
      </svg>

      {p.title && (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          color: '#e9f2f6',
          fontSize: 42,
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          letterSpacing: '2px',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};