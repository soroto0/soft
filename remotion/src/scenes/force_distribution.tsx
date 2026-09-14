import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ForceDistributionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const loadProgress = interpolate(frame, [0, span * 0.35], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceFlow = interpolate(frame, [0, span], [0, 120], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tensionStress = interpolate(frame, [span * 0.2, span * 0.8], [0.1, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelOpacity = interpolate(frame, [span * 0.4, span * 0.75], [0, 1], {
    easing: Easing.out(Easing.ease),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const compressionPaths = [
    "M 425 120 Q 287 160 150 280",
    "M 425 120 Q 562 160 700 280",
    "M 425 120 Q 320 180 150 280",
    "M 425 120 Q 530 180 700 280",
    "M 425 120 L 425 280"
  ];

  const cables = [
    "M 150 230 Q 425 270 700 230",
    "M 150 245 Q 425 280 700 245",
    "M 150 260 Q 425 290 700 260"
  ];

  const arrowX = [385, 425, 465];
  const scaleTicks = [
    { y: 120, val: "1500 MPa" },
    { y: 200, val: "750 MPa" },
    { y: 280, val: "0 MPa" }
  ];

  const leftArrowX2 = 140 - 25 * tensionStress;
  const rightArrowX2 = 710 + 25 * tensionStress;

  const displayTitle = p.title || "Interne Lastverteilung";

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width, height, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        <svg width="85%" height="70%" viewBox="0 0 900 400">
          <defs>
            <pattern id="hatch" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="12" stroke="rgba(233, 242, 246, 0.12)" strokeWidth={1} />
            </pattern>
            <linearGradient id="stressGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#8a949b" />
              <stop offset="0.5" stopColor="#e0b44c" />
              <stop offset="1" stopColor="#d0523f" />
            </linearGradient>
          </defs>

          {/* Concrete Slab - Top Layer (Druckzone) */}
          <rect x={150} y={120} width={550} height={80} fill="rgba(233, 242, 246, 0.04)" stroke="rgba(233, 242, 246, 0.25)" strokeWidth={1} />
          <rect x={150} y={120} width={550} height={80} fill="url(#hatch)" />

          {/* Concrete Slab - Bottom Layer (Zugzone) */}
          <rect x={150} y={200} width={550} height={80} fill="rgba(138, 148, 155, 0.06)" stroke="rgba(233, 242, 246, 0.25)" strokeWidth={1} />
          <rect x={150} y={200} width={550} height={80} fill="url(#hatch)" />

          {/* Neutral Axis */}
          <line x1={150} y1={200} x2={700} y2={200} stroke="#8a949b" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.7} />

          {/* Compression Force Lines (Zug-Druck-Verlauf) */}
          {compressionPaths.map((path, idx) => (
            <path
              key={`comp-${idx}`}
              d={path}
              fill="none"
              stroke="#8a949b"
              strokeWidth={1.5}
              strokeDasharray="6 6"
              strokeDashoffset={forceFlow}
              opacity={0.4 * loadProgress}
            />
          ))}

          {/* Prestressing Steel Cables (Spannstähle) */}
          {cables.map((path, idx) => (
            <g key={`cable-${idx}`}>
              {/* Outer Glow */}
              <path
                d={path}
                fill="none"
                stroke="#e0b44c"
                strokeWidth={3 + 4 * tensionStress}
                opacity={0.15 + 0.35 * tensionStress}
              />
              {/* Core Cable */}
              <path
                d={path}
                fill="none"
                stroke="#d0523f"
                strokeWidth={1.5}
                strokeDasharray="12 6"
                strokeDashoffset={-forceFlow * 1.5}
                opacity={0.3 + 0.7 * tensionStress}
              />
            </g>
          ))}

          {/* Anchor Plates */}
          <rect x={140} y={220} width={10} height={50} fill="#8a949b" rx={1} />
          <rect x={700} y={220} width={10} height={50} fill="#8a949b" rx={1} />

          {/* Prestressing Tension Arrows */}
          <g opacity={tensionStress}>
            <line x1={140} y1={245} x2={leftArrowX2} y2={245} stroke="#e0b44c" strokeWidth={2} />
            <polygon points={`${leftArrowX2},245 ${leftArrowX2 + 5},241 ${leftArrowX2 + 5},249`} fill="#e0b44c" />

            <line x1={710} y1={245} x2={rightArrowX2} y2={245} stroke="#e0b44c" strokeWidth={2} />
            <polygon points={`${rightArrowX2},245 ${rightArrowX2 - 5},241 ${rightArrowX2 - 5},249`} fill="#e0b44c" />
          </g>

          {/* External Load Arrows */}
          {arrowX.map((xVal, idx) => {
            const arrowY2 = 60 + 50 * loadProgress;
            return (
              <g key={`arrow-${idx}`} opacity={loadProgress}>
                <line
                  x1={xVal}
                  y1={60}
                  x2={xVal}
                  y2={arrowY2}
                  stroke="#d0523f"
                  strokeWidth={2}
                />
                <polygon
                  points={`${xVal - 4},${arrowY2 - 6} ${xVal + 4},${arrowY2 - 6} ${xVal},${arrowY2}`}
                  fill="#d0523f"
                />
              </g>
            );
          })}
          <text x={425} y={45} fill="#d0523f" fontSize={11} textAnchor="middle" opacity={loadProgress} letterSpacing="1">EXTERNE LAST (F)</text>

          {/* Leader Lines & Labels */}
          {/* 1. Beton-Druckzone */}
          <circle cx={300} cy={150} r={3} fill="#e9f2f6" opacity={labelOpacity} />
          <polyline points="300,150 240,90 140,90" fill="none" stroke="#8a949b" strokeWidth={1} opacity={labelOpacity} />
          <text x={135} y={85} fill="#e9f2f6" fontSize={10} textAnchor="end" opacity={labelOpacity} letterSpacing="1">BETON-DRUCKZONE</text>

          {/* 2. Neutrale Faser */}
          <circle cx={550} cy={200} r={3} fill="#e9f2f6" opacity={labelOpacity} />
          <polyline points="550,200 600,160 700,160" fill="none" stroke="#8a949b" strokeWidth={1} opacity={labelOpacity} />
          <text x={705} y={155} fill="#e9f2f6" fontSize={10} textAnchor="start" opacity={labelOpacity} letterSpacing="1">NEUTRALE FASER</text>

          {/* 3. Interne Spannstähle */}
          <circle cx={425} cy={280} r={3} fill="#e0b44c" opacity={labelOpacity} />
          <polyline points="425,280 360,340 240,340" fill="none" stroke="#8a949b" strokeWidth={1} opacity={labelOpacity} />
          <text x={235} y={335} fill="#e0b44c" fontSize={10} textAnchor="end" opacity={labelOpacity} letterSpacing="1">INTERNE SPANNSTÄHLE (ZUG)</text>

          {/* 4. Endverankerung */}
          <circle cx={145} cy={245} r={3} fill="#8a949b" opacity={labelOpacity} />
          <polyline points="145,245 90,190 40,190" fill="none" stroke="#8a949b" strokeWidth={1} opacity={labelOpacity} />
          <text x={35} y={185} fill="#8a949b" fontSize={10} textAnchor="end" opacity={labelOpacity} letterSpacing="1">ENDVERANKERUNG</text>

          {/* Stress Scale (Gradient Indicator) */}
          <g opacity={labelOpacity}>
            <text x={760} y={105} fill="#e9f2f6" fontSize={9} letterSpacing="0.5">STAHLSPANNUNG</text>
            <rect x={760} y={120} width="12" height="160" fill="url(#stressGrad)" stroke="rgba(233, 242, 246, 0.2)" strokeWidth={1} />
            {scaleTicks.map((tick, idx) => (
              <g key={`tick-${idx}`}>
                <line x1={772} y1={tick.y} x2={778} y2={tick.y} stroke="#e9f2f6" strokeWidth={1} />
                <text x={784} y={tick.y + 3} fill="#e9f2f6" fontSize={9}>{tick.val}</text>
              </g>
            ))}
          </g>
        </svg>

        <div style={{
          position: 'absolute',
          bottom: height * 0.08,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 28,
          color: '#e9f2f6',
          opacity: labelOpacity,
          letterSpacing: '1px'
        }}>
          {displayTitle}
        </div>
      </div>
    </AbsoluteFill>
  );
};