import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const RebarAnchorageErrorScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const draw = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const soll = interpolate(frame, [span * 0.2, span * 0.45], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ist = interpolate(frame, [span * 0.5, span * 0.75], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionY = interpolate(frame, [span * 0.1, span * 0.3], [40, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const wallX = 500;
  const consoleWidth = 400;
  const rebarY = 450;
  const sollDepth = 150; // 15cm
  const istDepth = 50;   // 5cm

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width} height={height} viewBox="0 0 1920 1080" fill="none">
        <defs>
          <pattern id="concreteHatch" patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="20" stroke="#e9f2f6" strokeWidth="1" opacity="0.15" />
          </pattern>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e9f2f6" />
          </marker>
        </defs>

        {/* Wall Section */}
        <rect x={wallX - 200} y={200} width={200} height={600} fill="url(#concreteHatch)" stroke="#e9f2f6" strokeWidth="2" opacity={draw} />
        <text x={wallX - 100} y={180} fill="#e9f2f6" fontSize={20} textAnchor="middle" opacity={draw}>STAHLBETONWAND</text>

        {/* Console Section */}
        <path
          d={`M ${wallX} 300 L ${wallX + consoleWidth} 300 L ${wallX + consoleWidth} 450 L ${wallX} 650 Z`}
          fill="url(#concreteHatch)"
          stroke="#e9f2f6"
          strokeWidth={2}
          strokeDasharray={draw < 1 ? "1000" : "0"}
          strokeDashoffset={1000 * (1 - draw)}
          opacity={draw}
        />
        <text x={wallX + 200} y={280} fill="#e9f2f6" fontSize={20} textAnchor="middle" opacity={draw}>TRAGENDE KONSOLE</text>

        {/* Target Rebar (Soll) */}
        <g opacity={soll}>
          <line x1={wallX - 150} y1={rebarY - 30} x2={wallX + sollDepth} y2={rebarY - 30} stroke="#8a949b" strokeWidth={8} strokeDasharray="10 5" />
          <text x={wallX + sollDepth + 20} y={rebarY - 25} fill="#8a949b" fontSize={24} fontWeight="bold">SOLL: 15 cm</text>
          <line x1={wallX} y1={rebarY - 60} x2={wallX + sollDepth} y2={rebarY - 60} stroke="#e9f2f6" strokeWidth={2} markerEnd="url(#arrowhead)" />
          <line x1={wallX} y1={rebarY - 60} x2={wallX} y2={rebarY - 10} stroke="#e9f2f6" strokeWidth={1} />
          <line x1={wallX + sollDepth} y1={rebarY - 60} x2={wallX + sollDepth} y2={rebarY - 10} stroke="#e9f2f6" strokeWidth={1} />
        </g>

        {/* Actual Rebar (Ist) */}
        <g opacity={ist}>
          <line x1={wallX - 150} y1={rebarY + 30} x2={wallX + istDepth} y2={rebarY + 30} stroke="#d0523f" strokeWidth={12} />
          <text x={wallX + istDepth + 20} y={rebarY + 35} fill="#d0523f" fontSize={24} fontWeight="bold">IST: 5 cm</text>
          <line x1={wallX} y1={rebarY + 80} x2={wallX + istDepth} y2={rebarY + 80} stroke="#d0523f" strokeWidth={2} markerEnd="url(#arrowhead)" />
          <line x1={wallX} y1={rebarY + 10} x2={wallX} y2={rebarY + 90} stroke="#d0523f" strokeWidth={1} />
          <line x1={wallX + istDepth} y1={rebarY + 10} x2={wallX + istDepth} y2={rebarY + 90} stroke="#d0523f" strokeWidth={1} />
          
          {/* Error Indicator */}
          <circle cx={wallX + istDepth} cy={rebarY + 30} r={15 * (1 + 0.2 * Math.sin(frame * 0.2))} fill="#d0523f" opacity={0.6} />
        </g>

        {/* Material Labels */}
        <g opacity={draw * 0.8}>
          <line x1={wallX - 50} y1={700} x2={wallX - 100} y2={750} stroke="#e9f2f6" strokeWidth={1} />
          <text x={wallX - 100} y={775} fill="#e9f2f6" fontSize={18} textAnchor="middle">BETON C30/37</text>
          
          <line x1={wallX + 50} y1={rebarY + 30} x2={wallX + 50} y2={850} stroke="#e9f2f6" strokeWidth={1} />
          <text x={wallX + 50} y={875} fill="#e9f2f6" fontSize={18} textAnchor="middle">BEWEHRUNG B500B</text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            fontSize: 48,
            fontWeight: 300,
            color: '#e9f2f6',
            letterSpacing: '0.05em',
            transform: `translateY(${captionY}px)`,
            opacity: interpolate(frame, [span * 0.1, span * 0.2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};