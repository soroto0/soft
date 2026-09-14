import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AxialVsShearStressScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const opacity = p.enter * p.exit;

  const axialLoad = interpolate(frame, [span * 0.1, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shearLoad = interpolate(frame, [span * 0.45, span * 0.75], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const breakState = interpolate(frame, [span * 0.75, span * 0.78], [0, 1], {
    easing: Easing.out(Easing.exp),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ticks = [0, 25, 50, 75, 100];
  const rodX1 = 300;
  const rodX2 = 700;
  const rodY = 400;
  const rodW = 40;
  const rodH = 300;

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={width * 0.8} height={height * 0.7} viewBox="0 0 1000 700">
        <defs>
          <linearGradient id="rodGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c9d3d9" />
            <stop offset="50%" stopColor="#e9f2f6" />
            <stop offset="100%" stopColor="#c9d3d9" />
          </linearGradient>
          <linearGradient id="barGradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5b7f9c" />
            <stop offset="100%" stopColor="#e0b44c" />
          </linearGradient>
        </defs>

        {/* Comparison Chart Background */}
        <line x1="100" y1="600" x2="900" y2="600" stroke="#e9f2f6" strokeWidth="2" opacity="0.3" />
        {ticks.map((t) => (
          <g key={t} opacity="0.4">
            <line x1="80" y1={600 - t * 4} x2="100" y2={600 - t * 4} stroke="#e9f2f6" strokeWidth="1" />
            <text x="70" y={605 - t * 4} fill="#e9f2f6" fontSize="12" textAnchor="end">{t}%</text>
          </g>
        ))}
        <text x="50" y="350" fill="#e9f2f6" fontSize="14" transform="rotate(-90, 50, 350)" textAnchor="middle">TRAGLAST (CAPACITY)</text>

        {/* Left: Axial Stress */}
        <g transform={`translate(${rodX1}, ${rodY})`}>
          <rect x={-rodW / 2} y="0" width={rodW} height={rodH} fill="url(#rodGradient)" stroke="#e9f2f6" strokeWidth="1" />
          <path
            d={`M 0 ${-100 * axialLoad} L 0 -10 M -15 -25 L 0 -10 L 15 -25`}
            fill="none"
            stroke="#e0b44c"
            strokeWidth="4"
            opacity={axialLoad}
          />
          <text x="0" y={rodH + 40} fill="#e9f2f6" fontSize="18" textAnchor="middle">AXIALE LAST</text>
          <rect x="-60" y={200} width="20" height={-axialLoad * 180} fill="url(#barGradient)" />
          <text x="-50" y={220} fill="#e9f2f6" fontSize="12" textAnchor="middle">100%</text>
        </g>

        {/* Right: Shear Stress */}
        <g transform={`translate(${rodX2}, ${rodY})`}>
          {/* Top Half */}
          <rect 
            x={-rodW / 2 + (breakState * 40)} 
            y="0" 
            width={rodW} 
            height={rodH / 2} 
            fill="url(#rodGradient)" 
            stroke="#e9f2f6" 
            strokeWidth="1"
            style={{ transform: `rotate(${breakState * 15}deg)`, transformOrigin: 'center center' }}
          />
          {/* Bottom Half */}
          <rect 
            x={-rodW / 2} 
            y={rodH / 2} 
            width={rodW} 
            height={rodH / 2} 
            fill="url(#rodGradient)" 
            stroke="#e9f2f6" 
            strokeWidth="1" 
          />
          
          {/* Shear Force Arrow */}
          <path
            d={`M ${-120 * shearLoad} ${rodH / 2} L -20 ${rodH / 2} M -35 ${rodH / 2 - 15} L -20 ${rodH / 2} L -35 ${rodH / 2 + 15}`}
            fill="none"
            stroke="#e0b44c"
            strokeWidth="4"
            opacity={shearLoad * (1 - breakState)}
          />

          {/* Break Point Indicator */}
          {breakState > 0 && (
            <g opacity={breakState}>
              <circle cx="0" cy={rodH / 2} r={15 * breakState} fill="#d0523f" />
              <path d="M -20 140 L 20 160 M -20 160 L 20 140" stroke="#e9f2f6" strokeWidth="3" />
            </g>
          )}

          <text x="0" y={rodH + 40} fill="#e9f2f6" fontSize="18" textAnchor="middle">SCHERKRAFT</text>
          <rect x="40" y={200} width="20" height={-Math.min(shearLoad, 0.2) * 180} fill={breakState > 0 ? "#d0523f" : "#e0b44c"} />
          <text x="50" y={220} fill="#e9f2f6" fontSize="12" textAnchor="middle">18%</text>
          {breakState > 0 && (
            <text x="70" y={200 - 0.2 * 180} fill="#d0523f" fontSize="14" fontWeight="bold">BRUCH</text>
          )}
        </g>

        {/* Comparison Labels */}
        <text x="500" y="50" fill="#e9f2f6" fontSize="24" textAnchor="middle" opacity={axialLoad}>Materialwiderstand vs. Versagen</text>
      </svg>

      {p.title && (
        <div style={{
          marginTop: 20,
          fontSize: 42,
          color: '#e9f2f6',
          fontFamily: 'sans-serif',
          fontWeight: 300,
          letterSpacing: '0.05em',
          transform: `translateY(${titleRise}px)`,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        }}>
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};