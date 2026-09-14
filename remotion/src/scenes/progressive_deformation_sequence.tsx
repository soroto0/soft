import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ProgressiveDeformationSequenceScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const deformation = interpolate(frame, [0, span], [0, 60], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateRight: 'clamp',
  });

  const cycles = Math.floor(interpolate(frame, [0, span], [0, 18500], {
    extrapolateRight: 'clamp',
  }));

  const trainPos = interpolate(frame % Math.floor(fps * 1.5), [0, Math.floor(fps * 1.5)], [-100, 900], {
    extrapolateRight: 'clamp',
  });

  const graphProgress = interpolate(frame, [0, span], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const segments = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const yTicks = [0, 20, 40, 60];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 500">
        <defs>
          <linearGradient id="goldFacade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e0b44c" stopOpacity={0.6} />
            <stop offset="0.5" stopColor="#f9e4a0" stopOpacity={1} />
            <stop offset="1" stopColor="#e0b44c" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9f2f6" />
            <stop offset="0.5" stopColor="#e0b44c" />
            <stop offset="1" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {/* Y-Axis for Deformation */}
        <g transform="translate(80, 50)">
          <line x1="0" y1="0" x2="0" y2="200" stroke="#e9f2f6" strokeWidth="1" />
          {yTicks.map((tick) => (
            <g key={tick} transform={`translate(0, ${tick * 2.5})`}>
              <line x1="-5" y1="0" x2="0" y2="0" stroke="#e9f2f6" strokeWidth="1" />
              <text x="-10" y="4" fill="#e9f2f6" fontSize="10" textAnchor="end">{tick}mm</text>
            </g>
          ))}
          <text x="-45" y="100" fill="#e9f2f6" fontSize="12" transform="rotate(-90, -45, 100)" textAnchor="middle">VERFORMUNG</text>
        </g>

        {/* Bridge Structure */}
        <g transform="translate(100, 100)">
          {/* Reference Line (Original State) */}
          <line x1="0" y1="0" x2="600" y2="0" stroke="#8a949b" strokeWidth="1" strokeDasharray="4 4" opacity={0.4} />
          
          {/* Skeleton Truss */}
          {segments.map((s, i) => {
            const x = s * 60;
            const sag = Math.sin((i / 10) * Math.PI) * deformation;
            const nextSag = Math.sin(((i + 1) / 10) * Math.PI) * deformation;
            return (
              <g key={s}>
                {/* Vertical Struts */}
                <line x1={x} y1={sag} x2={x} y2={sag + 40} stroke="#8a949b" strokeWidth="1.5" />
                {/* Diagonal Struts */}
                {i < 10 && (
                  <line x1={x} y1={sag + 40} x2={x + 60} y2={nextSag} stroke="#8a949b" strokeWidth="1" opacity={0.6} />
                )}
                {/* Lower Chord */}
                {i < 10 && (
                  <line x1={x} y1={sag + 40} x2={x + 60} y2={nextSag + 40} stroke="#8a949b" strokeWidth="2" />
                )}
              </g>
            );
          })}

          {/* Golden Line Facade */}
          <path
            d={`M 0 0 Q 300 ${deformation * 2} 600 0`}
            fill="none"
            stroke="url(#goldFacade)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <text x="300" y="-20" fill="#e0b44c" fontSize="14" textAnchor="middle" fontWeight="bold">GOLDENE LINIE (FASSADE)</text>
          <text x="300" y="80" fill="#8a949b" fontSize="10" textAnchor="middle">STRUKTURELLES SKELETT (STAHL)</text>

          {/* Passing Train Indicator */}
          <rect x={trainPos} y="-15" width="40" height="10" fill="#d0523f" opacity={0.8} />
          <text x={trainPos + 20} y="-20" fill="#d0523f" fontSize="8" textAnchor="middle">LAST</text>
        </g>

        {/* Cumulative Graph */}
        <g transform="translate(100, 350)">
          <rect x="0" y="0" width="600" height="100" fill="#e9f2f6" opacity={0.05} />
          <line x1="0" y1="100" x2="600" y2="100" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="0" y1="0" x2="0" y2="100" stroke="#e9f2f6" strokeWidth="1" />
          
          {/* Graph Polyline */}
          <path
            d={`M ${Array.from({ length: 50 }).map((_, i) => {
              const x = i * 12 * graphProgress;
              const y = 100 - (Math.pow(i / 50, 1.5) * 80 * graphProgress);
              return `${x},${y}`;
            }).join(' ')}`}
            fill="none"
            stroke="#d0523f"
            strokeWidth="2"
          />
          
          <text x="600" y="115" fill="#e9f2f6" fontSize="10" textAnchor="end">ZYKLEN: {cycles.toLocaleString()}</text>
          <text x="5" y="-10" fill="#e9f2f6" fontSize="10">KUMULATIVE VERFORMUNG (Δ mm)</text>
          
          {/* Stress Scale */}
          <g transform="translate(620, 0)">
            <rect x="0" y="0" width="15" height="100" fill="url(#stressGradient)" />
            <text x="20" y="10" fill="#e9f2f6" fontSize="8">450 MPa</text>
            <text x="20" y="100" fill="#e9f2f6" fontSize="8">0 MPa</text>
            <text x="0" y="-10" fill="#e9f2f6" fontSize="9" fontWeight="bold">SPANNUNG</text>
          </g>
        </g>

        {/* Current Value Callout */}
        <g transform={`translate(700, ${100 + deformation})`}>
          <line x1="-100" y1="0" x2="-10" y2="0" stroke="#d0523f" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="0" cy="0" r="4" fill="#d0523f" />
          <text x="10" y="5" fill="#d0523f" fontSize="18" fontWeight="bold">
            {(deformation / 4).toFixed(2)} mm
          </text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: 28,
          color: '#e9f2f6',
          letterSpacing: '2px',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};