import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WaermeaustauschPrinzipScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, (p.dur || 5) * fps);
  const opacity = p.enter * p.exit;

  const cooling = interpolate(frame, [0, span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waveProgress = (frame % 45) / 45;
  const waveY = interpolate(waveProgress, [0, 1], [0, 40]);

  const waves = [0, 1, 2, 3, 4, 5];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={width * 0.8} height={height * 0.7} viewBox={`0 0 800 500`}>
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#5b7f9c" strokeWidth="1" opacity="0.4" />
          </pattern>
          <linearGradient id="airGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset={`${20 + cooling * 60}%`} stopColor="#d0523f" />
            <stop offset={`${40 + cooling * 60}%`} stopColor="#5b7f9c" />
            <stop offset="100%" stopColor="#5b7f9c" />
          </linearGradient>
        </defs>

        {/* Soil Background */}
        <rect x="50" y="50" width="700" height="400" fill="url(#hatch)" rx="4" />
        <text x="60" y="75" fill="#5b7f9c" fontSize="14" fontWeight="bold">ERDREICH (KÜHL)</text>

        {/* Pipe Wall */}
        <rect x="50" y={180} width="700" height="140" fill="#1a1a1a" stroke="#e9f2f6" strokeWidth="2" />
        
        {/* Air inside Pipe */}
        <rect x="50" y="190" width="700" height="120" fill="url(#airGrad)" />

        {/* Heat Waves (Moving out) */}
        {waves.map((i) => {
          const xPos = 120 + i * 110;
          const waveOpacity = interpolate(waveProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
          return (
            <g key={i} opacity={waveOpacity * (1 - cooling * 0.7)}>
              {/* Top waves */}
              <path d={`M ${xPos} 220 Q ${xPos + 15} ${210 - waveY} ${xPos + 30} 170`} 
                    fill="none" stroke="#d0523f" strokeWidth="3" strokeLinecap="round" />
              {/* Bottom waves */}
              <path d={`M ${xPos} 280 Q ${xPos + 15} ${290 + waveY} ${xPos + 30} 330`} 
                    fill="none" stroke="#d0523f" strokeWidth="3" strokeLinecap="round" />
            </g>
          );
        })}

        {/* Labels */}
        <g fontSize="12" fill="#e9f2f6">
          <text x="60" y="210">EINTRITT: 32°C</text>
          <text x="740" y="210" textAnchor="end">AUSTRITT: {Math.round(32 - cooling * 14)}°C</text>
          <line x1="50" y1="350" x2="750" y2="350" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 4" />
          <text x="400" y="370" textAnchor="middle" fill="#e0b44c">PASSIVE WÄRMEABGABE AN BODEN</text>
        </g>

        {/* Components labels */}
        <line x1="200" y1="180" x2="180" y2="140" stroke="#e9f2f6" strokeWidth="1" />
        <text x="140" y="130" fill="#e9f2f6" fontSize="10">KUNSTSTOFFROHR</text>
      </svg>

      {p.title && (
        <div style={{
          marginTop: 40,
          color: '#e9f2f6',
          fontSize: 32,
          fontFamily: 'sans-serif',
          letterSpacing: '0.05em',
          borderTop: '1px solid #e9f2f6',
          paddingTop: 10
        }}>
          {p.title.toUpperCase()}
        </div>
      )}
    </AbsoluteFill>
  );
};
