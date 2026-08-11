import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const MechanicalCrossSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  // Animation: The units wheel rotates 1.25 times (passing 9 once)
  const unitRotation = interpolate(frame, [0, span], [0, 450], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // The sautoir (ratchet) lifts as it approaches 360 degrees (the 9->0 transition)
  const sautoirLift = interpolate(unitRotation % 360, [300, 359, 360], [0, -25, 0], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // The tens wheel moves only when the sautoir drops at 360 degrees
  const tensRotation = interpolate(unitRotation, [0, 355, 365, 715, 725], [0, 0, 36, 36, 72], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [0, 40], [20, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const materials = [
    { name: 'EJE DE ACERO', color: '#8a949b', radius: 15 },
    { name: 'NÚCLEO DE BRONCE', color: '#e0b44c', radius: 60 },
    { name: 'LLANTA NUMERADA', color: '#c49a3d', radius: 85 },
  ];

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 800 450"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="bronzeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="50%" stopColor="#f2d08a" />
            <stop offset="100%" stopColor="#c49a3d" />
          </linearGradient>
          <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* Units Wheel (Right) */}
        <g transform="translate(500, 250)">
          <g transform={`rotate(${unitRotation})`}>
            {materials.reverse().map((m) => (
              <circle
                key={m.name}
                r={m.radius}
                fill={m.name === 'NÚCLEO DE BRONCE' ? 'url(#bronzeGrad)' : m.color}
                stroke="#e9f2f6"
                strokeWidth="1"
              />
            ))}
            <circle r={60} fill="url(#hatch)" />
            {numbers.map((n) => (
              <text
                key={n}
                x={0}
                y={-70}
                transform={`rotate(${n * 36})`}
                fill="#e9f2f6"
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
              >
                {n}
              </text>
            ))}
            {/* Pin that lifts the sautoir */}
            <circle cx={0} cy={-50} r={4} fill="#d0523f" transform="rotate(340)" />
          </g>
        </g>

        {/* Tens Wheel (Left) */}
        <g transform="translate(250, 250)">
          <g transform={`rotate(${tensRotation})`}>
            {materials.map((m) => (
              <circle
                key={m.name}
                r={m.radius}
                fill={m.name === 'NÚCLEO DE BRONCE' ? 'url(#bronzeGrad)' : m.color}
                stroke="#e9f2f6"
                strokeWidth="1"
              />
            ))}
            <circle r={60} fill="url(#hatch)" />
            {numbers.map((n) => (
              <text
                key={n}
                x={0}
                y={-70}
                transform={`rotate(${n * 36})`}
                fill="#e9f2f6"
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
              >
                {n}
              </text>
            ))}
          </g>
        </g>

        {/* Sautoir Mechanism (Ratchet) */}
        <g transform={`translate(375, 180) rotate(${sautoirLift})`}>
          <path
            d="M -120,0 L 120,0 L 125,40 L 115,40 L 110,10 L -110,10 Z"
            fill="#8a949b"
            stroke="#e9f2f6"
            strokeWidth="1"
          />
          <circle cx={0} cy={0} r={6} fill="#5d6a73" />
          {/* Gravity Weight */}
          <rect x={-10} y={-15} width={20} height={15} fill="#5d6a73" />
          
          {/* Gravity Force Arrow */}
          <g transform="translate(0, -40)">
            <line x1="0" y1="0" x2="0" y2="20" stroke="#d0523f" strokeWidth="2" />
            <path d="M -4,15 L 0,22 L 4,15" fill="none" stroke="#d0523f" strokeWidth="2" />
            <text x={8} y={15} fill="#d0523f" fontSize="10">GRAVEDAD (G)</text>
          </g>
        </g>

        {/* Labels and Leader Lines */}
        <g opacity={0.8}>
          {/* To Units Wheel */}
          <line x1={580} y1={250} x2={650} y2={200} stroke="#e9f2f6" strokeWidth="0.5" />
          <text x={655} y={200} fill="#e9f2f6" fontSize="10" alignmentBaseline="middle">RUEDA DE UNIDADES</text>

          {/* To Tens Wheel */}
          <line x1={170} y1={250} x2={100} y2={200} stroke="#e9f2f6" strokeWidth="0.5" />
          <text x={95} y={200} fill="#e9f2f6" fontSize="10" textAnchor="end" alignmentBaseline="middle">RUEDA DE DECENAS</text>

          {/* To Sautoir */}
          <line x1={375} y1={180} x2={375} y2={100} stroke="#e9f2f6" strokeWidth="0.5" />
          <text x={375} y={90} fill="#e9f2f6" fontSize="10" textAnchor="middle">TRINQUETE (SAUTOIR)</text>

          {/* Material Cross-section labels */}
          <line x1={500} y1={250} x2={550} y2={380} stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 2" />
          <text x={555} y={385} fill="#8a949b" fontSize="9">EJE DE ACERO (AISI 1020)</text>
          
          <line x1={530} y1={280} x2={550} y2={400} stroke="#e9f2f6" strokeWidth="0.5" strokeDasharray="2 2" />
          <text x={555} y={405} fill="#e0b44c" fontSize="9">NÚCLEO DE BRONCE FUNDIDO</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'serif',
            fontSize: 42,
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            transform: `translateY(${titleSlide}px)`,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};