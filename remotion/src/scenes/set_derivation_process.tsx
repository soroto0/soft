import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SetDerivationProcessScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const scan1 = interpolate(frame, [span * 0.1, span * 0.45], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scan2 = interpolate(frame, [span * 0.5, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleAnim = interpolate(frame, [0, span * 0.25], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleOpacity = interpolate(frame, [0, span * 0.25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const initialPoints = [
    { x: 40, orderRemoved: 1 },
    { x: 75, orderRemoved: 1 },
    { x: 130, orderRemoved: 0 },
    { x: 138, orderRemoved: 0 },
    { x: 145, orderRemoved: 0 },
    { x: 152, orderRemoved: 0 },
    { x: 160, orderRemoved: 2 },
    { x: 220, orderRemoved: 1 },
    { x: 270, orderRemoved: 1 },
    { x: 330, orderRemoved: 0 },
    { x: 338, orderRemoved: 0 },
    { x: 345, orderRemoved: 0 },
    { x: 352, orderRemoved: 0 },
    { x: 410, orderRemoved: 1 },
    { x: 450, orderRemoved: 1 },
  ];

  const axes = [
    { label: "P = P⁽⁰⁾", subtitle: "Conjunto inicial", y: 65 },
    { label: "P' = P⁽¹⁾", subtitle: "1ª derivación (Puntos aislados eliminados)", y: 145 },
    { label: "P'' = P⁽²⁾", subtitle: "2ª derivación (Núcleo de acumulación)", y: 225 },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="82%" height="65%" viewBox="0 0 540 280" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="scanGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={0} />
            <stop offset="50%" stopColor="#e0b44c" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#d0523f" stopOpacity={0} />
          </linearGradient>
        </defs>

        {axes.map((axis) => (
          <g key={axis.label}>
            <line x1="30" y1={axis.y} x2="510" y2={axis.y} stroke="#e9f2f6" strokeWidth={1} strokeOpacity={0.4} />
            <line x1="30" y1={axis.y - 4} x2="30" y2={axis.y + 4} stroke="#e9f2f6" strokeWidth={1} strokeOpacity={0.6} />
            <line x1="510" y1={axis.y - 4} x2="510" y2={axis.y + 4} stroke="#e9f2f6" strokeWidth={1} strokeOpacity={0.6} />

            <text x="25" y={axis.y - 12} fill="#e0b44c" fontSize="12" fontWeight="bold" textAnchor="start">
              {axis.label}
            </text>
            <text x="515" y={axis.y + 3} fill="#e9f2f6" fontSize="9" opacity={0.6} textAnchor="start">
              {axis.subtitle}
            </text>
          </g>
        ))}

        <g stroke="#e0b44c" strokeWidth={1} strokeDasharray="3 2" opacity={0.6}>
          <line x1="270" y1="78" x2="270" y2="128" />
          <polygon points="267,125 270,131 273,125" fill="#e0b44c" />
          <text x="280" y="106" fill="#e0b44c" fontSize="9">lim P</text>

          <line x1="270" y1="158" x2="270" y2="208" />
          <polygon points="267,205 270,211 273,205" fill="#e0b44c" />
          <text x="280" y="186" fill="#e0b44c" fontSize="9">lim P'</text>
        </g>

        {scan1 > 0 && scan1 < 1 && (
          <g>
            <line
              x1={30 + scan1 * 480}
              y1={45}
              x2={30 + scan1 * 480}
              y2={85}
              stroke="#e0b44c"
              strokeWidth={2}
            />
            <rect
              x={30 + scan1 * 480 - 20}
              y={50}
              width={40}
              height={30}
              fill="url(#scanGrad)"
            />
          </g>
        )}

        {scan2 > 0 && scan2 < 1 && (
          <g>
            <line
              x1={30 + scan2 * 480}
              y1={125}
              x2={30 + scan2 * 480}
              y2={165}
              stroke="#d0523f"
              strokeWidth={2}
            />
            <rect
              x={30 + scan2 * 480 - 20}
              y={130}
              width={40}
              height={30}
              fill="url(#scanGrad)"
            />
          </g>
        )}

        {initialPoints.map((pt, i) => {
          const ptNormalizedX = (pt.x - 30) / 480;
          const isPassedByScan1 = scan1 >= ptNormalizedX;
          const isIsolatedInPhase1 = pt.orderRemoved === 1;

          let color = '#e9f2f6';
          let dotOpacity = 1;

          if (isPassedByScan1 && isIsolatedInPhase1) {
            color = '#d0523f';
            dotOpacity = Math.max(0.2, 1 - (scan1 - ptNormalizedX) * 5);
          }

          return (
            <circle
              key={`p0-${i}`}
              cx={pt.x}
              cy={65}
              r={3}
              fill={color}
              opacity={dotOpacity}
            />
          );
        })}

        {initialPoints.map((pt, i) => {
          if (pt.orderRemoved === 1) return null;

          const ptNormalizedX = (pt.x - 30) / 480;
          const isPassedByScan2 = scan2 >= ptNormalizedX;
          const isIsolatedInPhase2 = pt.orderRemoved === 2;

          let color = '#e9f2f6';
          let dotOpacity = scan1;

          if (isPassedByScan2 && isIsolatedInPhase2) {
            color = '#d0523f';
            dotOpacity = Math.max(0.2, scan1 * (1 - (scan2 - ptNormalizedX) * 5));
          }

          return (
            <circle
              key={`p1-${i}`}
              cx={pt.x}
              cy={145}
              r={3.5}
              fill={color}
              opacity={Math.max(0, dotOpacity)}
            />
          );
        })}

        {initialPoints.map((pt, i) => {
          if (pt.orderRemoved > 0) return null;

          const dotOpacity = scan2;

          return (
            <g key={`p2-${i}`}>
              <circle
                cx={pt.x}
                cy={225}
                r={4}
                fill="#e0b44c"
                opacity={dotOpacity}
              />
              <circle
                cx={pt.x}
                cy={225}
                r={9}
                fill="none"
                stroke="#e0b44c"
                strokeWidth={0.8}
                strokeOpacity={dotOpacity * 0.5}
              />
            </g>
          );
        })}

        <circle cx="35" cy="265" r="3" fill="#d0523f" />
        <text x="43" y="268" fill="#e9f2f6" fontSize="9" opacity={0.7}>
          Puntos aislados (eliminación)
        </text>

        <circle cx="240" cy="265" r="3" fill="#e0b44c" />
        <text x="248" y="268" fill="#e9f2f6" fontSize="9" opacity={0.7}>
          Puntos de acumulación
        </text>
      </svg>

      <div
        style={{
          marginTop: 12,
          transform: `translateY(${titleAnim}px)`,
          opacity: titleOpacity,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 26,
          fontWeight: 500,
          color: '#e9f2f6',
          letterSpacing: '0.04em',
          borderBottom: '1px solid rgba(224, 180, 76, 0.4)',
          paddingBottom: 4,
        }}
      >
        {p.title || "Proceso de Derivación"}
      </div>
    </AbsoluteFill>
  );
};