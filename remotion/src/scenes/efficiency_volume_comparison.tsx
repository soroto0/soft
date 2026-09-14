import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const EfficiencyVolumeComparisonScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const grow = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const float = interpolate(frame, [0, span], [0, 20], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const airScale = interpolate(frame, [0, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const waterSize = 60;
  const airSize = 320;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 1000 500">
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" />
            <stop offset="0.5" stopColor="#3a5a75" />
            <stop offset="1" stopColor="#2a4a65" />
          </linearGradient>
        </defs>

        <g transform={`translate(250, ${250 - float})`}>
          <rect x={-waterSize / 2} y={-waterSize / 2} width={waterSize * grow} height={waterSize * grow} 
                fill="url(#waterGrad)" stroke="#e9f2f6" strokeWidth={3} />
          <text x={0} y={-waterSize / 2 - 20} fill="#e9f2f6" textAnchor="middle" fontSize={24} fontWeight="bold">1L Wasser</text>
        </g>

        <g transform={`translate(650, 250)`}>
          <rect x={-airSize / 2} y={-airSize / 2} width={airSize * airScale} height={airSize * airScale} 
                fill="#e9f2f6" fillOpacity={0.05} stroke="#e0b44c" strokeWidth={4} strokeDasharray="12 12" />
          <text x={0} y={-airSize / 2 - 20} fill="#e0b44c" textAnchor="middle" fontSize={24} fontWeight="bold">3.000L Luft</text>
        </g>

        <line x1={250} y1={450} x2={650} y2={450} stroke="#e9f2f6" strokeWidth={2} />
        <text x={450} y={485} fill="#e9f2f6" textAnchor="middle" fontSize={20}>Volumen-Vergleich für gleiche Kühlleistung</text>
      </svg>

      {p.title ? (
        <div style={{ 
          position: 'absolute', 
          top: '5%', 
          color: '#e9f2f6', 
          fontSize: 42, 
          fontFamily: 'sans-serif',
          textAlign: 'center',
          width: '100%'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};