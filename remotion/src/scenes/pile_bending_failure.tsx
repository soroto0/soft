import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PileBendingFailureScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const bendAmount = interpolate(frame, [0, span * 0.75], [0, 32], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [0, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const failure = interpolate(frame, [span * 0.45, span * 0.95], [0, 1], {
    easing: Easing.out(Easing.ease),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pointsCount = 20;
  const points = Array.from({ length: pointsCount }, (_, i) => {
    const pct = i / (pointsCount - 1);
    const y = 40 + pct * 280;
    const deflection = Math.sin(pct * Math.PI) * bendAmount;
    const centerX = 300 + deflection;
    return { y, centerX, pct };
  });

  const leftWallPath = `
    M ${points[0].centerX - 24} ${points[0].y}
    ${points.map(pt => `L ${pt.centerX - 24} ${pt.y}`).join(' ')}
    L ${points[pointsCount - 1].centerX - 14} ${points[pointsCount - 1].y}
    ${[...points].reverse().map(pt => `L ${pt.centerX - 14} ${pt.y}`).join(' ')}
    Z
  `;

  const rightWallPath = `
    M ${points[0].centerX + 14} ${points[0].y}
    ${points.map(pt => `L ${pt.centerX + 14} ${pt.y}`).join(' ')}
    L ${points[pointsCount - 1].centerX + 24} ${points[pointsCount - 1].y}
    ${[...points].reverse().map(pt => `L ${pt.centerX + 24} ${pt.y}`).join(' ')}
    Z
  `;

  const hollowCorePath = `
    M ${points[0].centerX - 14} ${points[0].y}
    ${points.map(pt => `L ${pt.centerX - 14} ${pt.y}`).join(' ')}
    L ${points[pointsCount - 1].centerX + 14} ${points[pointsCount - 1].y}
    ${[...points].reverse().map(pt => `L ${pt.centerX + 14} ${pt.y}`).join(' ')}
    Z
  `;

  const steelLeftPath = points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.centerX - 19} ${pt.y}`).join(' ');
  const steelRightPath = points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.centerX + 19} ${pt.y}`).join(' ');

  const arrowY = [80, 120, 160, 200, 240, 280];

  const centerX_100 = 300 + Math.sin(((100 - 40) / 280) * Math.PI) * bendAmount;
  const centerX_140 = 300 + Math.sin(((140 - 40) / 280) * Math.PI) * bendAmount;
  const centerX_220 = 300 + Math.sin(((220 - 40) / 280) * Math.PI) * bendAmount;
  const centerX_180 = 300 + Math.sin(((180 - 40) / 280) * Math.PI) * bendAmount;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 600 380" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="concretePattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 0 10 L 10 0 M 0 0 L 10 10" stroke="#5b7f9c" strokeWidth={0.4} opacity={0.15} />
          </pattern>
        </defs>

        <line x1={50} y1={130} x2={550} y2={130} stroke="#5b7f9c" strokeWidth={1} strokeDasharray="4 4" opacity={0.4} />
        <line x1={50} y1={250} x2={550} y2={250} stroke="#5b7f9c" strokeWidth={1} strokeDasharray="4 4" opacity={0.4} />
        
        <text x={60} y={120} fill="#5b7f9c" fontSize={9} letterSpacing={1}>OBERBODEN (AUFFÜLLUNG)</text>
        <text x={60} y={240} fill="#5b7f9c" fontSize={9} letterSpacing={1}>WEICHER SCHLUFF (GLEITHANG)</text>
        <text x={60} y={340} fill="#5b7f9c" fontSize={9} letterSpacing={1}>TRAGFÄHIGER SANDSTEIN</text>

        <path d={hollowCorePath} fill="#11161a" stroke="#5b7f9c" strokeWidth={0.5} />
        <path d={leftWallPath} fill="url(#concretePattern)" stroke="#e9f2f6" strokeWidth={1} />
        <path d={rightWallPath} fill="url(#concretePattern)" stroke="#e9f2f6" strokeWidth={1} />

        <path d={steelLeftPath} fill="none" stroke="#e0b44c" strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
        <path d={steelRightPath} fill="none" stroke="#e0b44c" strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />

        {arrowY.map((yVal) => {
          const pct = (yVal - 40) / 280;
          const deflection = Math.sin(pct * Math.PI) * bendAmount;
          const targetX = 300 + deflection - 24;
          const startX = Math.max(50, targetX - 110 * Math.sin(pct * Math.PI) * pressure - 10);
          const endX = targetX - 4;

          return (
            <g key={yVal}>
              <line x1={startX} y1={yVal} x2={endX} y2={yVal} stroke="#e0b44c" strokeWidth={1.8} opacity={pressure} />
              <polygon points={`${endX},${yVal} ${endX - 7},${yVal - 3.5} ${endX - 7},${yVal + 3.5}`} fill="#e0b44c" opacity={pressure} />
            </g>
          );
        })}

        <path
          d={`M ${centerX_180 - 24} 180 L ${centerX_180 - 19} 177 L ${centerX_180 - 21} 182 L ${centerX_180 - 14} 180`}
          fill="none"
          stroke="#d0523f"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={failure}
        />
        <path
          d={`M ${centerX_180 - 24} 180 L ${centerX_180 - 20} 183 L ${centerX_180 - 17} 179 L ${centerX_180 - 14} 181`}
          fill="none"
          stroke="#d0523f"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={failure * 0.8}
        />

        <g opacity={0.85}>
          <line x1={centerX_100 + 20} y1={100} x2={430} y2={100} stroke="#e9f2f6" strokeWidth={0.6} />
          <circle cx={centerX_100 + 20} cy={100} r={2} fill="#e9f2f6" />
          <text x={435} y={103} fill="#e9f2f6" fontSize={9} fontFamily="monospace">SPANNBETONMANTEL</text>

          <line x1={centerX_140} y1={140} x2={450} y2={140} stroke="#e9f2f6" strokeWidth={0.6} />
          <circle cx={centerX_140} cy={140} r={2} fill="#e9f2f6" />
          <text x={455} y={143} fill="#e9f2f6" fontSize={9} fontFamily="monospace">HOHLKERN (Ø 280mm)</text>

          <line x1={centerX_220 + 19} y1={220} x2={420} y2={220} stroke="#e9f2f6" strokeWidth={0.6} />
          <circle cx={centerX_220 + 19} cy={220} r={2} fill="#e9f2f6" />
          <text x={425} y={223} fill="#e9f2f6" fontSize={9} fontFamily="monospace">SPANNSTÄHLE</text>
        </g>

        <g opacity={failure}>
          <line x1={centerX_180 - 20} y1={180} x2={130} y2={180} stroke="#d0523f" strokeWidth={0.8} />
          <circle cx={centerX_180 - 20} cy={180} r={2} fill="#d0523f" />
          <text x={120} y={183} fill="#d0523f" fontSize={10} fontFamily="monospace" textAnchor="end" fontWeight="bold">MAX. BIEGESPANNUNG (RISS)</text>
        </g>

        <g opacity={pressure}>
          <text x={100} y={65} fill="#e0b44c" fontSize={9} fontFamily="monospace" letterSpacing={0.5}>LATERALER ERDDRUCK (Asymmetrisch)</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          marginTop: 20,
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          fontSize: 22,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: '#e9f2f6',
          borderBottom: '1px solid rgba(233, 242, 246, 0.2)',
          paddingBottom: '6px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};