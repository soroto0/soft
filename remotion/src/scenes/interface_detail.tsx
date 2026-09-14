import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const InterfaceDetailScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const reveal = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dimension = interpolate(frame, [span * 0.3, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const istSlide = interpolate(frame, [span * 0.5, span * 0.9], [0, 30], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stones = [
    { x: 30, y: 35 }, { x: 85, y: 20 }, { x: 140, y: 45 },
    { x: 210, y: 25 }, { x: 50, y: 80 }, { x: 110, y: 65 },
    { x: 175, y: 85 }, { x: 230, y: 70 }
  ];

  const teethPoints = "M 450 225 " + [0, 1, 2, 3, 4, 5].map(i => 
    `L ${450 + i * 41.6 + 20.8} 205 L ${450 + (i + 1) * 41.6} 225`
  ).join(' ');

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 450">
        {/* IST-ZUSTAND (Left Side) */}
        <g opacity={reveal}>
          <text x={225} y={80} fill="#e9f2f6" fontSize={18} textAnchor="middle" fontWeight="bold">IST: GLATT</text>
          
          {/* Top Block IST */}
          <g style={{ transform: `translateX(${istSlide}px)` }}>
            <rect x={100} y={125} width={250} height={100} fill="#5d6a73" stroke="#e9f2f6" strokeWidth={2} />
            {stones.map((s, i) => (
              <path key={`ist-t-${i}`} d={`M ${100 + s.x} ${125 + s.y} l 6 -4 l 4 6 z`} fill="#8a949b" />
            ))}
            <path d="M 360 175 L 400 175 L 390 165 M 400 175 L 390 185" fill="none" stroke="#d0523f" strokeWidth={3} />
            <text x={380} y={155} fill="#d0523f" fontSize={14} textAnchor="middle">V_Ed</text>
          </g>

          {/* Bottom Block IST */}
          <rect x={100} y={225} width={250} height={100} fill="#5d6a73" stroke="#e9f2f6" strokeWidth={2} />
          {stones.map((s, i) => (
            <path key={`ist-b-${i}`} d={`M ${100 + s.x} ${225 + s.y} l 6 -4 l 4 6 z`} fill="#8a949b" />
          ))}
          <path d="M 90 275 L 50 275 L 60 265 M 50 275 L 60 285" fill="none" stroke="#e9f2f6" strokeWidth={2} opacity={0.6} />
          
          <line x1={100} y1={225} x2={350} y2={225} stroke="#d0523f" strokeWidth={3} strokeDasharray="8 4" />
          <text x={225} y={350} fill="#d0523f" fontSize={12} textAnchor="middle">KEINE VERZAHNUNG (REIBUNGSVERLUST)</text>
        </g>

        {/* SOLL-VORGABE (Right Side) */}
        <g opacity={reveal}>
          <text x={575} y={80} fill="#e0b44c" fontSize={18} textAnchor="middle" fontWeight="bold">SOLL: AUFGERAUT</text>
          
          {/* Bottom Block SOLL */}
          <path d={`M 450 225 L 450 325 L 700 325 L 700 225 ${teethPoints} Z`} fill="#5d6a73" stroke="#e9f2f6" strokeWidth={2} />
          {stones.map((s, i) => (
            <path key={`soll-b-${i}`} d={`M ${450 + s.x} ${225 + s.y} l 6 -4 l 4 6 z`} fill="#8a949b" />
          ))}

          {/* Top Block SOLL */}
          <path d={`M 450 225 L 450 125 L 700 125 L 700 225 ${teethPoints} Z`} fill="#5d6a73" stroke="#e9f2f6" strokeWidth={2} />
          {stones.map((s, i) => (
            <path key={`soll-t-${i}`} d={`M ${450 + s.x} ${125 + s.y} l 6 -4 l 4 6 z`} fill="#8a949b" />
          ))}

          {/* Dimension Callout */}
          <g opacity={dimension}>
            <line x1={720} y1={225} x2={720} y2={205} stroke="#e0b44c" strokeWidth={2} />
            <line x1={715} y1={225} x2={725} y2={225} stroke="#e0b44c" strokeWidth={2} />
            <line x1={715} y1={205} x2={725} y2={205} stroke="#e0b44c" strokeWidth={2} />
            <text x={730} y={218} fill="#e0b44c" fontSize={14} alignmentBaseline="middle">h_t ≥ 6 mm</text>
            
            <path d="M 700 175 L 740 175 L 730 165 M 740 175 L 730 185" fill="none" stroke="#e0b44c" strokeWidth={3} />
            <text x={720} y={155} fill="#e0b44c" fontSize={14} textAnchor="middle">V_Rdi</text>
          </g>
          
          <text x={575} y={350} fill="#e0b44c" fontSize={12} textAnchor="middle">MASSIVE AUFRAUUNG GEM. DIN EN 1992-1-1</text>
        </g>

        {/* Divider */}
        <line x1={400} y1={100} x2={400} y2={360} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="10 10" opacity={0.3} />
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          fontSize: 32,
          fontWeight: 'bold',
          color: '#e9f2f6',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          opacity: reveal
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};