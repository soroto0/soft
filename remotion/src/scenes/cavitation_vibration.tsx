import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CavitationVibrationScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const reveal = interpolate(frame, [0, span * 0.15], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const vibIntensity = interpolate(frame, [span * 0.1, span * 0.3, span * 0.8, span], [0, 1, 1, 0], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flowProgress = interpolate(frame, [0, span], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const damPoints = "200,400 350,120 550,120 700,400";
  const vibrationLines = [0, 1, 2, 3, 4];
  const flowArrows = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ 
      opacity, 
      width, 
      height, 
      justifyContent: 'center', 
      alignItems: 'center', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      <svg width="70%" viewBox="0 0 800 500" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="concreteGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a949b" />
            <stop offset="1" stopColor="#5d6a73" />
          </linearGradient>
          <clipPath id="damClip">
            <polygon points={damPoints} />
          </clipPath>
        </defs>

        {/* Foundation Layer */}
        <rect x="50" y="400" width="700" height="60" fill="#5d6a73" opacity={reveal * 0.6} />
        <text x="70" y="440" fill="#e9f2f6" fontSize="12" fontFamily="monospace">FOUNDATION_BEDROCK</text>

        {/* Water Area */}
        <path 
          d={`M 50 400 L 200 400 L 330 ${150 + Math.sin(frame * 0.1) * 5} L 50 150 Z`} 
          fill="#5b7f9c" 
          opacity={reveal * 0.4} 
        />
        
        {/* Dam Structure */}
        <polygon 
          points={damPoints} 
          fill="url(#concreteGrad)" 
          stroke="#e9f2f6" 
          strokeWidth="2" 
          opacity={reveal}
        />

        {/* Vibration Visualization (High Frequency Waves) */}
        <g clipPath="url(#damClip)">
          {vibrationLines.map((i) => {
            const yBase = 130 + i * 15;
            const freq = 0.8;
            const amp = 4 * vibIntensity;
            const points = Array.from({ length: 40 }).map((_, j) => {
              const x = 300 + j * 10;
              const y = yBase + Math.sin(frame * freq + j * 0.5) * amp;
              return `${x},${y}`;
            }).join(' ');

            return (
              <polyline
                key={i}
                points={points}
                fill="none"
                stroke="#e9f2f6"
                strokeWidth="1"
                opacity={0.7 * vibIntensity}
              />
            );
          })}
        </g>

        {/* Cavitation Zone Indicators */}
        <circle cx="380" cy="280" r={20 + Math.sin(frame * 0.5) * 5} fill="#d0523f" opacity={0.3 * vibIntensity} />
        <circle cx="420" cy="320" r={15 + Math.cos(frame * 0.4) * 4} fill="#d0523f" opacity={0.3 * vibIntensity} />
        
        {/* Flow Force Arrows */}
        {flowArrows.map((i) => {
          const xPos = 100 + (i * 150) + (flowProgress * 100) % 150;
          return (
            <g key={i} opacity={reveal * 0.8} transform={`translate(${xPos}, 370)`}>
              <line x1="0" y1="0" x2="40" y2="0" stroke="#e0b44c" strokeWidth="3" />
              <path d="M 35 -5 L 45 0 L 35 5" fill="#e0b44c" />
            </g>
          );
        })}

        {/* Labels and Leader Lines */}
        <g opacity={reveal}>
          <line x1="450" y1="120" x2="580" y2="60" stroke="#e9f2f6" strokeWidth="1" />
          <text x="585" y="60" fill="#e9f2f6" fontSize="14" fontWeight="bold">DAMMKRONE (CROWN)</text>
          
          <line x1="400" y1="300" x2="550" y2="350" stroke="#d0523f" strokeWidth="1" />
          <text x="555" y="355" fill="#d0523f" fontSize="14">KAVITATIONSZONE</text>
          
          <text x="450" y="200" fill="#e9f2f6" fontSize="12" textAnchor="middle" opacity={0.6}>BETONSTRUKTUR</text>
        </g>

        {/* Frequency Scale */}
        <g transform="translate(650, 150)" opacity={reveal}>
          <line x1="0" y1="0" x2="0" y2="100" stroke="#e9f2f6" strokeWidth="1" />
          {[0, 50, 100].map((tick) => (
            <g key={tick} transform={`translate(0, ${tick})`}>
              <line x1="0" y1="0" x2="5" y2="0" stroke="#e9f2f6" strokeWidth="1" />
              <text x="10" y="4" fill="#e9f2f6" fontSize="10">{200 - tick * 2} Hz</text>
            </g>
          ))}
          <text x="-10" y="50" fill="#e9f2f6" fontSize="10" transform="rotate(-90, -10, 50)" textAnchor="middle">FREQUENZ</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 40,
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontSize: 32,
          letterSpacing: '0.1em',
          color: '#e9f2f6',
          borderLeft: '4px solid #d0523f',
          paddingLeft: 20,
          opacity: reveal
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};