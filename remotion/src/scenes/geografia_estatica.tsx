import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const GeografiaEstaticaScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const riverDraw = interpolate(frame, [0, Math.round(span * 0.55)], [900, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [Math.round(span * 0.2), span], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pyreVal = interpolate(frame, [Math.round(span * 0.3), Math.round(span * 0.85)], [0, 500], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textOffset = interpolate(frame, [0, Math.round(span * 0.4)], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gridX = [160, 320, 480, 640];
  const gridY = [120, 240, 360];
  const pyreTicks = [0, 100, 200, 300, 400, 500];
  const rings = [0, 1, 2, 3];

  const currentPyres = Math.round(pyreVal);

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg
        width="80%"
        height="80%"
        viewBox="0 0 800 500"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="pyreBarGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#d0523f" />
          </linearGradient>
        </defs>

        {/* Map Grid - Lines */}
        {gridX.map((gx) => (
          <line
            key={`gx-${gx}`}
            x1={gx}
            y1={60}
            x2={gx}
            y2={420}
            stroke="#4a5a70"
            strokeWidth={0.5}
            strokeDasharray="2 4"
            opacity={0.35}
          />
        ))}
        {gridY.map((gy) => (
          <line
            key={`gy-${gy}`}
            x1={100}
            y1={gy}
            x2={700}
            y2={gy}
            stroke="#4a5a70"
            strokeWidth={0.5}
            strokeDasharray="2 4"
            opacity={0.35}
          />
        ))}

        {/* Region Labels */}
        <text x={140} y={100} fill="#8fa0b5" fontSize={10} letterSpacing="2" opacity={0.6}>
          PANNONIA SUPERIOR
        </text>
        <text x={140} y={116} fill="#6e7f95" fontSize={8} letterSpacing="1" opacity={0.5}>
          HIEMS 171 d.C.
        </text>

        {/* Danube River Label along path */}
        <text x={230} y={205} fill="#c8c2b7" fontSize={9} letterSpacing="2" opacity={0.7} transform="rotate(12, 230, 205)">
          DANUVIVS FLVVIUS
        </text>

        {/* Danube River Path (Stone color: #c8c2b7) */}
        <path
          d="M 100 220 C 220 180, 280 270, 400 250 C 520 230, 600 290, 700 230"
          fill="none"
          stroke="#c8c2b7"
          strokeWidth={1.2}
          strokeDasharray="900"
          strokeDashoffset={riverDraw}
          strokeLinecap="round"
        />

        {/* Dusty Green Concentric Circles emitting from Carnuntum (400, 250) */}
        {rings.map((r) => {
          const radius = (((pulse * 120 + r * 30) % 120) + 12);
          const ringOpacity = Math.max(0, 1 - radius / 125) * 0.75;
          return (
            <circle
              key={`ring-${r}`}
              cx={400}
              cy={250}
              r={radius}
              fill="none"
              stroke="#7a9277"
              strokeWidth={1.2}
              strokeDasharray="4 3"
              opacity={ringOpacity}
            />
          );
        })}

        {/* Point at Carnuntum */}
        <circle cx={400} cy={250} r={6} fill="#e0b44c" />
        <circle cx={400} cy={250} r={2.5} fill="#d0523f" />

        {/* Leader line from Carnuntum to statistics panel */}
        <line x1={400} y1={244} x2={400} y2={180} stroke="#e0b44c" strokeWidth={0.8} strokeDasharray="2 2" />
        <line x1={400} y1={180} x2={470} y2={180} stroke="#e0b44c" strokeWidth={0.8} />

        {/* Callout Info Box */}
        <g transform="translate(475, 150)">
          <rect x={0} y={0} width={180} height={55} fill="#1a2332" opacity={0.85} stroke="#3a4a60" strokeWidth={0.8} rx={2} />
          <text x={12} y={18} fill="#e9f2f6" fontSize={11} fontWeight="600" letterSpacing="1">
            CARNVNTVM
          </text>
          <text x={12} y={32} fill="#8fa0b5" fontSize={8}>
            PIRAE ROVI / PYRES COUNT
          </text>
          <text x={12} y={47} fill="#e0b44c" fontSize={13} fontWeight="bold">
            {currentPyres} <tspan fontSize={9} fill="#8fa0b5">PIRAS</tspan>
          </text>
        </g>

        {/* Pyre Quantity Scale / Axis at Bottom */}
        <g transform="translate(180, 380)">
          <text x={0} y={-10} fill="#8fa0b5" fontSize={8} letterSpacing="1">
            PYRE COUNT INDICATOR (PIRAE)
          </text>
          {/* Base scale line */}
          <line x1={0} y1={0} x2={440} y2={0} stroke="#4a5a70" strokeWidth={1} />
          {/* Active bar */}
          <rect x={0} y={-3} width={(currentPyres / 500) * 440} height={6} fill="url(#pyreBarGrad)" rx={1} />
          {/* Ticks & Numbers */}
          {pyreTicks.map((pt) => {
            const tx = (pt / 500) * 440;
            return (
              <g key={`ptick-${pt}`} transform={`translate(${tx}, 0)`}>
                <line x1={0} y1={0} x2={0} y2={6} stroke="#e9f2f6" strokeWidth={0.8} />
                <text x={0} y={18} fill="#e9f2f6" fontSize={8} textAnchor="middle">
                  {pt}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Caption at bottom */}
      <div
        style={{
          marginTop: 20,
          transform: `translateY(${textOffset}px)`,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 28,
          letterSpacing: 2,
          color: '#e9f2f6',
          textAlign: 'center',
        }}
      >
        {p.title || 'Carnuntum, 171 d.C.'}
      </div>
    </AbsoluteFill>
  );
};