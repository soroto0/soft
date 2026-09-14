import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ProbeSchweissnahtRissScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  const push = interpolate(frame, [0, span], [1, 1.04], EO);
  const baseLine = interpolate(frame, [0, span * 0.2], [0, 1], EO);
  const grid = interpolate(frame, [span * 0.1, span * 0.3], [0, 0.4], EO);
  const crackLen = interpolate(frame, [span * 0.3, span * 0.5], [0, 340], EO);
  const crackPath = interpolate(frame, [span * 0.3, span * 0.5], [100, 0], EO);
  const lead = interpolate(frame, [span * 0.4, span * 0.6], [0, 1], EO);
  const rise = interpolate(frame, [span * 0.5, span * 0.7], [20, 0], EO);

  const layers = [
    { name: 'Основной металл', fill: '#5d6a73', hatch: 'url(#h1)' },
    { name: 'ЗТВ', fill: '#8a949b', hatch: 'url(#h2)' },
    { name: 'Корень шва', fill: '#c9d3d9', hatch: 'url(#h3)' },
  ];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="80%" viewBox="0 0 500 300">
        <defs>
          <pattern id="h1" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="#e9f2f6" strokeWidth="1" /></pattern>
          <pattern id="h2" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#e9f2f6" strokeWidth="0.5" /></pattern>
          <pattern id="h3" width="6" height="6" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="6" y2="6" stroke="#e9f2f6" strokeWidth="0.5" /></pattern>
        </defs>
        <g transform={`translate(250 150) scale(${push}) translate(-250 -150)`}>
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={50} y1={100 + i * 40} x2={450} y2={100 + i * 40} stroke="#e9f2f6" strokeWidth={1} opacity={grid} />
          ))}
          {layers.map((l, i) => (
            <rect key={l.name} x={50 + i * 100} y={100} width={100} height={120} fill={l.fill} opacity={0.8} />
          ))}
          {layers.map((l, i) => (
            <rect key={l.name} x={50 + i * 100} y={100} width={100} height={120} fill={l.hatch} />
          ))}
          <line x1={50} y1={220} x2={450} y2={220} stroke="#e9f2f6" strokeWidth={3} transform={`scale(${baseLine} 1)`} />
          <path d="M 250 100 L 250 220" stroke="#d0523f" strokeWidth={4} strokeDasharray={120} strokeDashoffset={crackPath} />
          <path d="M 50 240 L 450 240" stroke="#e0b44c" strokeWidth={2} />
          <text x={250} y={265} fill="#e0b44c" fontSize={16} textAnchor="middle">{Math.round(crackLen)} mm</text>
          <path d="M 350 160 L 400 130" stroke="#e9f2f6" strokeWidth={1.5} strokeDasharray={57} strokeDashoffset={57 * (1 - lead)} />
          <rect x={400} y={115} width={80} height={20} fill="#e9f2f6" opacity={lead} />
          <text x={440} y={130} fill="#0d1117" fontSize={10} textAnchor="middle" opacity={lead}>Корень</text>
        </g>
      </svg>
      {p.title ? (
        <div style={{ marginTop: 40, transform: `translateY(${rise}px)`, fontFamily: 'sans-serif', fontSize: 32, color: '#e9f2f6', fontWeight: 'bold' }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
