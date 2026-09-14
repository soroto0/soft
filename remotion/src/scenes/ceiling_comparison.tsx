import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const CeilingComparisonScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const draw = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const compare = interpolate(frame, [span * 0.25, span * 0.55], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const alert = interpolate(frame, [span * 0.5, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textRise = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const concreteColor = '#5d6a73';
  const steelColor = '#e0b44c';
  const textColor = '#e9f2f6';
  const dangerColor = '#d0523f';

  const leftX = 200;
  const rightX = 600;
  const groundY = 320;
  const slabY = 140;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.7} viewBox="0 0 800 400">
        {/* Left Side: Balkendecke */}
        <g opacity={draw}>
          <text x={leftX} y={60} fill={textColor} fontSize={18} textAnchor="middle" fontWeight="bold">BALKENDECKE</text>
          <rect x={leftX - 150} y={slabY} width={300} height={25} fill={concreteColor} stroke={textColor} strokeWidth={1} />
          <rect x={leftX - 30} y={slabY + 25} width={60} height={50} fill={concreteColor} stroke={textColor} strokeWidth={1} />
          <rect x={leftX - 20} y={slabY + 75} width={40} height={groundY - (slabY + 75)} fill={concreteColor} opacity={0.6} />
          
          {/* Reinforcement */}
          <line x1={leftX - 140} y1={slabY + 12} x2={leftX + 140} y2={slabY + 12} stroke={steelColor} strokeWidth={1.5} strokeDasharray="5 3" opacity={compare} />
          <path d={`M ${leftX - 20} ${slabY + 30} L ${leftX - 20} ${slabY + 70} M ${leftX + 20} ${slabY + 30} L ${leftX + 20} ${slabY + 70}`} stroke={steelColor} strokeWidth={1.5} opacity={compare} />
          
          {/* Labels */}
          <g opacity={compare}>
            <text x={leftX + 40} y={slabY + 55} fill={textColor} fontSize={12}>UNTERZUG</text>
            <path d={`M ${leftX + 35} ${slabY + 50} L ${leftX + 10} ${slabY + 50}`} stroke={textColor} strokeWidth={0.5} fill="none" />
            <text x={leftX} y={slabY - 10} fill={textColor} fontSize={10} textAnchor="middle">h = 25cm + 50cm</text>
          </g>

          {/* Load Arrows */}
          <path d={`M ${leftX - 100} 100 L ${leftX - 100} 130 M ${leftX + 100} 100 L ${leftX + 100} 130`} stroke={textColor} strokeWidth={2} markerEnd="url(#arrow)" opacity={draw} />
        </g>

        {/* Right Side: Flachdecke */}
        <g opacity={draw}>
          <text x={rightX} y={60} fill={textColor} fontSize={18} textAnchor="middle" fontWeight="bold">FLACHDECKE</text>
          <rect x={rightX - 150} y={slabY + 10} width={300} height={18} fill={concreteColor} stroke={textColor} strokeWidth={1} />
          <rect x={rightX - 20} y={slabY + 28} width={40} height={groundY - (slabY + 28)} fill={concreteColor} opacity={0.6} />
          
          {/* Reinforcement - Denser at head */}
          <line x1={rightX - 140} y1={slabY + 19} x2={rightX + 140} y2={slabY + 19} stroke={steelColor} strokeWidth={1.5} strokeDasharray="2 2" opacity={compare} />
          <path d={`M ${rightX - 40} ${slabY + 15} L ${rightX + 40} ${slabY + 15}`} stroke={steelColor} strokeWidth={2} opacity={compare} />
          
          {/* Labels */}
          <g opacity={compare}>
            <text x={rightX} y={slabY - 10} fill={textColor} fontSize={10} textAnchor="middle">h = 18cm</text>
            <text x={rightX + 30} y={slabY + 60} fill={textColor} fontSize={12}>OHNE UNTERZUG</text>
          </g>

          {/* Danger Zone / Punching Shear */}
          <g opacity={alert}>
            <circle cx={rightX} cy={slabY + 28} r={15} fill="none" stroke={dangerColor} strokeWidth={2} strokeDasharray="4 2" />
            <path d={`M ${rightX - 30} ${slabY + 5} L ${rightX - 10} ${slabY + 25} M ${rightX + 30} ${slabY + 5} L ${rightX + 10} ${slabY + 25}`} stroke={dangerColor} strokeWidth={2} />
            <text x={rightX} y={slabY + 80} fill={dangerColor} fontSize={11} textAnchor="middle" fontWeight="bold">DURCHSTANZGEFAHR</text>
          </g>

          {/* Load Arrows */}
          <path d={`M ${rightX - 100} 100 L ${rightX - 100} 140 M ${rightX + 100} 100 L ${rightX + 100} 140`} stroke={textColor} strokeWidth={2} markerEnd="url(#arrow)" opacity={draw} />
        </g>

        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={textColor} />
          </marker>
        </defs>

        {/* Comparison Line */}
        <line x1={400} y1={80} x2={400} y2={350} stroke={textColor} strokeWidth={0.5} strokeDasharray="10 5" opacity={compare * 0.5} />
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: '10%',
          transform: `translateY(${textRise}px)`,
          fontFamily: 'sans-serif',
          fontSize: 32,
          fontWeight: 'bold',
          color: textColor,
          letterSpacing: '2px',
          textTransform: 'uppercase'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};