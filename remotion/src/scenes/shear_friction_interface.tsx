import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ShearFrictionInterfaceScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const draw = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceScale = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chartGrow = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const centerX = width / 2;
  const centerY = height / 2;

  const ticks = [0, 1, 2, 3];

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="dangerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#a03a2a" />
          </linearGradient>
          <pattern id="concreteHatch" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="20" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.2" />
          </pattern>
        </defs>

        {/* Concrete Sections */}
        <g opacity={draw}>
          {/* Upper Section */}
          <rect x={centerX - 300} y={centerY - 160} width={600} height={160} fill="url(#concreteHatch)" stroke="#e9f2f6" strokeWidth="1" opacity="0.6" />
          <text x={centerX - 290} y={centerY - 140} fill="#e9f2f6" fontSize={14} fontWeight="300">BETONIERABSCHNITT II (NEU)</text>
          
          {/* Lower Section */}
          <rect x={centerX - 300} y={centerY} width={600} height={160} fill="url(#concreteHatch)" stroke="#e9f2f6" strokeWidth="1" opacity="0.4" />
          <text x={centerX - 290} y={centerY + 150} fill="#8a949b" fontSize={14} fontWeight="300">BETONIERABSCHNITT I (ALT)</text>

          {/* Cold Joint Interface */}
          <line x1={centerX - 320} y1={centerY} x2={centerX + 320} y2={centerY} stroke="#e9f2f6" strokeWidth={2} strokeDasharray="8 4" />
          <text x={centerX + 330} y={centerY + 5} fill="#e9f2f6" fontSize={12}>BETONFÜGE (KNOTEN 11)</text>
        </g>

        {/* Diagonal Force Vector */}
        <g opacity={forceScale}>
          <path d={`M ${centerX - 150} ${centerY - 250} L ${centerX} ${centerY}`} stroke="#e0b44c" strokeWidth={4} fill="none" markerEnd="url(#arrowhead)" />
          <text x={centerX - 160} y={centerY - 260} fill="#e0b44c" fontSize={16} textAnchor="end">DIAGONAL-LAST</text>
          <circle cx={centerX} cy={centerY} r={6} fill="#e0b44c" />
        </g>

        {/* Shear Forces (Outward) */}
        <g opacity={forceScale}>
          {/* Rightward Shear */}
          <line x1={centerX} y1={centerY - 10} x2={centerX + 200 * forceScale} y2={centerY - 10} stroke="#d0523f" strokeWidth={6} />
          <path d={`M ${centerX + 200 * forceScale} ${centerY - 20} L ${centerX + 220 * forceScale} ${centerY - 10} L ${centerX + 200 * forceScale} ${centerY}`} fill="#d0523f" />
          
          {/* Leftward Shear */}
          <line x1={centerX} y1={centerY + 10} x2={centerX - 200 * forceScale} y2={centerY + 10} stroke="#d0523f" strokeWidth={6} />
          <path d={`M ${centerX - 200 * forceScale} ${centerY + 20} L ${centerX - 220 * forceScale} ${centerY + 10} L ${centerX - 200 * forceScale} ${centerY}`} fill="#d0523f" />
          
          <text x={centerX + 100} y={centerY - 25} fill="#d0523f" fontSize={14} textAnchor="middle" fontWeight="bold">SCHERKRAFT (V_ed)</text>
        </g>

        {/* Friction Resistance (Opposing) */}
        <g opacity={forceScale * 0.7}>
          <line x1={centerX + 150} y1={centerY - 10} x2={centerX + 150 - 80 * forceScale} y2={centerY - 10} stroke="#e0b44c" strokeWidth={3} />
          <line x1={centerX - 150} y1={centerY + 10} x2={centerX - 150 + 80 * forceScale} y2={centerY + 10} stroke="#e0b44c" strokeWidth={3} />
          <text x={centerX} y={centerY + 40} fill="#e0b44c" fontSize={12} textAnchor="middle">THEORETISCHE REIBUNG (V_rd,ct)</text>
        </g>

        {/* Comparison Chart */}
        <g transform={`translate(${width - 250}, ${height - 280})`} opacity={chartGrow}>
          <text x={0} y={-20} fill="#e9f2f6" fontSize={14} fontWeight="bold">LASTVERGLEICH [kN]</text>
          <line x1={0} y1={0} x2={0} y2={150} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={0} y1={150} x2={180} y2={150} stroke="#e9f2f6" strokeWidth={1} />
          
          {ticks.map(t => (
            <g key={t} transform={`translate(0, ${150 - t * 40})`}>
              <line x1={-5} y1={0} x2={0} y2={0} stroke="#e9f2f6" strokeWidth={1} />
              <text x={-10} y={4} fill="#8a949b" fontSize={10} textAnchor="end">{t * 250}</text>
            </g>
          ))}

          {/* Friction Bar */}
          <rect x={30} y={150 - 80 * chartGrow} width={40} height={80 * chartGrow} fill="#e0b44c" opacity={0.8} />
          <text x={50} y={170} fill="#e0b44c" fontSize={10} textAnchor="middle">REIBUNG</text>
          <text x={50} y={145 - 80 * chartGrow} fill="#e0b44c" fontSize={12} textAnchor="middle">500</text>

          {/* Shear Bar */}
          <rect x={100} y={150 - 130 * chartGrow} width={40} height={130 * chartGrow} fill="url(#dangerGrad)" />
          <text x={120} y={170} fill="#d0523f" fontSize={10} textAnchor="middle">SCHERUNG</text>
          <text x={120} y={145 - 130 * chartGrow} fill="#d0523f" fontSize={12} textAnchor="middle" fontWeight="bold">820</text>
          
          {/* Failure Line */}
          <line x1={20} y1={150 - 80} x2={160} y2={150 - 80} stroke="#d0523f" strokeWidth={1} strokeDasharray="4 2" />
          <text x={165} y={150 - 76} fill="#d0523f" fontSize={9}>LIMIT</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: 42,
            fontWeight: 'bold',
            color: '#e9f2f6',
            letterSpacing: '0.1em',
            transform: `translateY(${titleSlide}px)`,
            opacity: interpolate(frame, [0, span * 0.15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};