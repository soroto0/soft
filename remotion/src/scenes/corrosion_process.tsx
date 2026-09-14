import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CorrosionProcessScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const penetration = interpolate(frame, [0, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const growth = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alert = interpolate(frame, [span * 0.7, span * 0.9], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    { x: 150, w: 300, fill: '#8a949b', name: 'BETONDECKUNG', label: '40 mm' },
    { x: 450, w: 60, fill: '#e9f2f6', name: 'BEWEHRUNGSSTAHL', label: 'Ø 28 mm' },
  ];

  const ions = [
    { y: 250, d: 0 }, { y: 300, d: 0.2 }, { y: 350, d: 0.1 },
    { y: 400, d: 0.3 }, { y: 450, d: 0.05 }, { y: 500, d: 0.15 },
    { y: 550, d: 0.25 }, { y: 280, d: 0.4 }, { y: 420, d: 0.35 },
  ];

  const ticks = [0, 0.4, 0.8, 1.2];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 1000 800"
        fill="none"
      >
        <defs>
          <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.2" />
          </pattern>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e0b44c" stopOpacity="0.6" />
            <stop offset="1" stopColor="#e0b44c" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Cross-section Layers */}
        {layers.map((layer) => (
          <g key={layer.name}>
            <rect
              x={layer.x}
              y={200}
              width={layer.w}
              height={400}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth="1"
              fillOpacity={layer.name === 'BEWEHRUNGSSTAHL' ? 1 : 0.3}
            />
            <rect x={layer.x} y={200} width={layer.w} height={400} fill="url(#hatch)" />
            <text x={layer.x + 5} y={190} fill="#e9f2f6" fontSize="12" fontWeight="bold">{layer.name}</text>
            <text x={layer.x + 5} y={615} fill="#8a949b" fontSize="10">{layer.label}</text>
          </g>
        ))}

        {/* Chloride Penetration Front */}
        <rect
          x={150}
          y={200}
          width={300 * penetration}
          height={400}
          fill="url(#grad)"
        />

        {/* Moving Ions */}
        {ions.map((ion, i) => {
          const ionX = interpolate(penetration, [ion.d, 1], [150, 450], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <circle
              key={i}
              cx={ionX}
              cy={ion.y}
              r="4"
              fill="#e0b44c"
              opacity={penetration > ion.d ? 1 : 0}
            />
          );
        })}

        {/* Corrosion Effect on Steel */}
        <rect
          x={450}
          y={200}
          width={8 * alert}
          height={400}
          fill="#d0523f"
          opacity={alert}
        />

        {/* Comparison Chart */}
        <g transform="translate(650, 250)">
          <line x1="0" y1="300" x2="250" y2="300" stroke="#e9f2f6" strokeWidth="2" />
          <line x1="0" y1="300" x2="0" y2="50" stroke="#e9f2f6" strokeWidth="2" />
          
          {ticks.map((tick) => (
            <g key={tick} transform={`translate(0, ${300 - tick * 200})`}>
              <line x1="-5" y1="0" x2="5" y2="0" stroke="#e9f2f6" strokeWidth="1" />
              <text x="-35" y="5" fill="#8a949b" fontSize="12">{tick.toFixed(1)}%</text>
            </g>
          ))}

          {/* Limit Bar */}
          <rect x="40" y={300 - 0.4 * 200} width="50" height={0.4 * 200} fill="#8a949b" opacity="0.5" />
          <text x="65" y={300 - 0.4 * 200 - 10} fill="#8a949b" fontSize="10" textAnchor="middle">LIMIT</text>

          {/* Actual Bar (3x Limit) */}
          <rect
            x="130"
            y={300 - (1.2 * growth) * 200}
            width="50"
            height={(1.2 * growth) * 200}
            fill={growth > 0.8 ? "#d0523f" : "#e0b44c"}
          />
          <text x="155" y={300 - (1.2 * growth) * 200 - 10} fill="#e9f2f6" fontSize="10" textAnchor="middle" fontWeight="bold">
            {growth > 0.1 ? 'IST-WERT' : ''}
          </text>
          
          {growth > 0.9 && (
            <text x="155" y={300 - 1.2 * 200 + 30} fill="#e9f2f6" fontSize="16" textAnchor="middle" fontWeight="bold">3x</text>
          )}

          <text x="125" y="340" fill="#e9f2f6" fontSize="14" fontWeight="bold">CHLORIDKONZENTRATION</text>
        </g>

        {/* Leader Lines */}
        <line x1="150" y1="200" x2="150" y2="100" stroke="#8a949b" strokeWidth="1" strokeDasharray="4 2" />
        <text x="150" y="90" fill="#8a949b" fontSize="12" textAnchor="middle">OBERFLÄCHE</text>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          color: '#e9f2f6',
          fontSize: 42,
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          letterSpacing: '0.1em',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};