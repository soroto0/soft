import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MaquinariaDelRegicidioScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const progress = interpolate(frame, [0, duration], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cascade = interpolate(frame, [0, duration * 0.6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const converge = interpolate(frame, [duration * 0.5, duration * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.exp),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const commissioners = Array.from({ length: 135 }).map((_, i) => ({
    x: 100 + (i % 15) * 20,
    y: 50 + Math.floor(i / 15) * 20,
  }));

  const regicides = Array.from({ length: 59 }).map((_, i) => ({
    x: 150 + (i % 8) * 30,
    y: 250 + Math.floor(i / 8) * 15,
  }));

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 400 600">
        <defs>
          <linearGradient id="exec" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        <text x="200" y="30" fill="#e9f2f6" fontSize="20" textAnchor="middle" letterSpacing="1">135 COMISIONADOS</text>
        {commissioners.map((c, i) => (
          <line key={`c-${i}`} x1={c.x} y1={c.y} x2={200} y2={200} stroke="#e9f2f6" strokeWidth={0.3} opacity={cascade * 0.5} />
        ))}

        <text x="200" y="420" fill="#e0b44c" fontSize="20" textAnchor="middle">59 REGICIDAS</text>
        {regicides.map((r, i) => (
          <line key={`r-${i}`} x1={r.x} y1={r.y} x2={200} y2={400} stroke="#e0b44c" strokeWidth={0.5} opacity={converge} />
        ))}

        <line x1="200" y1="200" x2="200" y2={200 + 200 * converge} stroke="url(#exec)" strokeWidth={6} strokeLinecap="square" />
        <text x="210" y={200 + 100 * converge} fill="#d0523f" fontSize="14" fontWeight="bold">SENTENCIA FORMAL</text>
        
        <path d={`M 200 ${400 + 50 * converge} L 200 ${550 + 50 * converge}`} stroke="#d0523f" strokeWidth={8} />
        <text x="200" y="580" fill="#d0523f" fontSize="18" textAnchor="middle" opacity={progress}>EJECUCIÓN LEGAL</text>
      </svg>

      {p.title ? (
        <div style={{ position: 'absolute', bottom: 50, color: '#e9f2f6', fontSize: 24, fontFamily: 'sans-serif' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};