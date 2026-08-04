import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HoopStressFormulaDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const expansion = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stressIntensity = interpolate(frame, [span * 0.25, span * 0.65], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const formulaOpacity = interpolate(frame, [span * 0.45, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame, [span * 0.4, span * 0.7, span], [1, 1.04, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];

  const cX = 320;
  const cY = 280;
  const rIn = 110 * pulse;
  const rOut = 138;
  const rMid = (rIn + rOut) / 2;

  const displayTitle = p.title || 'Hoop Stress Calculation';

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      }}
    >
      <svg width="90%" height="82%" viewBox="0 0 1000 600" style={{ overflow: 'visible' }}>
        {/* Schematic Grid Lines */}
        <line x1={50} y1={cY} x2={950} y2={cY} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 8" opacity={0.12} />
        <line x1={cX} y1={50} x2={cX} y2={510} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="4 8" opacity={0.12} />

        {/* Vessel Shell Cross Section */}
        <circle cx={cX} cy={cY} r={rOut} fill="none" stroke="#e9f2f6" strokeWidth={2} opacity={0.4} />
        <circle
          cx={cX}
          cy={cY}
          r={rMid}
          fill="none"
          stroke="#d0523f"
          strokeWidth={rOut - rIn}
          opacity={0.1 + 0.35 * stressIntensity}
        />
        <circle cx={cX} cy={cY} r={rIn} fill="#07090c" stroke="#e9f2f6" strokeWidth={2} opacity={0.8} />

        {/* Dynamic Pressure Vectors (Radial Outward Arrows) */}
        {angles.map((a) => {
          const rad = (a * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const rStart = 20;
          const rEnd = rStart + (rIn - rStart - 6) * expansion;
          const x1 = cX + rStart * cos;
          const y1 = cY + rStart * sin;
          const x2 = cX + rEnd * cos;
          const y2 = cY + rEnd * sin;

          const tipLen = 10;
          const leftX = x2 - tipLen * Math.cos(rad - Math.PI / 6);
          const leftY = y2 - tipLen * Math.sin(rad - Math.PI / 6);
          const rightX = x2 - tipLen * Math.cos(rad + Math.PI / 6);
          const rightY = y2 - tipLen * Math.sin(rad + Math.PI / 6);

          return (
            <g key={a} opacity={Math.min(1, expansion * 1.5)}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e0b44c" strokeWidth={2.5} />
              <polygon points={`${x2},${y2} ${leftX},${leftY} ${rightX},${rightY}`} fill="#e0b44c" />
            </g>
          );
        })}

        {/* Pressure Callout */}
        <text
          x={cX}
          y={cY + 5}
          textAnchor="middle"
          fill="#e0b44c"
          fontSize={16}
          fontWeight="600"
          letterSpacing="1px"
          opacity={expansion}
        >
          INTERNAL PRESSURE (P)
        </text>

        {/* Inside Diameter Dimension Line */}
        <g opacity={expansion}>
          <line x1={cX - rIn} y1={cY + 165} x2={cX + rIn} y2={cY + 165} stroke="#e0b44c" strokeWidth={1.5} />
          <line x1={cX - rIn} y1={cY + 155} x2={cX - rIn} y2={cY + 175} stroke="#e0b44c" strokeWidth={1.5} />
          <line x1={cX + rIn} y1={cY + 155} x2={cX + rIn} y2={cY + 175} stroke="#e0b44c" strokeWidth={1.5} />
          <text x={cX} y={cY + 190} textAnchor="middle" fill="#e0b44c" fontSize={15} fontWeight="500">
            Inside Diameter (D)
          </text>
        </g>

        {/* Wall Thickness Dimension Line */}
        <g opacity={stressIntensity}>
          <line x1={cX + rIn} y1={cY - 165} x2={cX + rOut} y2={cY - 165} stroke="#e9f2f6" strokeWidth={1.5} />
          <line x1={cX + rIn} y1={cY - 175} x2={cX + rIn} y2={cY - 155} stroke="#e9f2f6" strokeWidth={1.5} />
          <line x1={cX + rOut} y1={cY - 175} x2={cX + rOut} y2={cY - 155} stroke="#e9f2f6" strokeWidth={1.5} />
          <text x={cX + rMid + 10} y={cY - 185} textAnchor="middle" fill="#e9f2f6" fontSize={14}>
            Thickness (t)
          </text>
        </g>

        {/* Tensile Hoop Stress Indicators inside Wall */}
        <g opacity={stressIntensity}>
          {/* Top Tangential Stress Arrows */}
          <line x1={cX - 35} y1={cY - rMid} x2={cX + 35} y2={cY - rMid} stroke="#d0523f" strokeWidth={3} strokeDasharray="6 4" />
          <path d={`M ${cX - 40} ${cY - rMid} L ${cX - 30} ${cY - rMid - 5} L ${cX - 30} ${cY - rMid + 5} Z`} fill="#d0523f" />
          <path d={`M ${cX + 40} ${cY - rMid} L ${cX + 30} ${cY - rMid - 5} L ${cX + 30} ${cY - rMid + 5} Z`} fill="#d0523f" />

          {/* Bottom Tangential Stress Arrows */}
          <line x1={cX - 35} y1={cY + rMid} x2={cX + 35} y2={cY + rMid} stroke="#d0523f" strokeWidth={3} strokeDasharray="6 4" />
          <path d={`M ${cX - 40} ${cY + rMid} L ${cX - 30} ${cY + rMid - 5} L ${cX - 30} ${cY + rMid + 5} Z`} fill="#d0523f" />
          <path d={`M ${cX + 40} ${cY + rMid} L ${cX + 30} ${cY + rMid - 5} L ${cX + 30} ${cY + rMid + 5} Z`} fill="#d0523f" />

          <text x={cX} y={cY - rMid - 16} textAnchor="middle" fill="#d0523f" fontSize={13} fontWeight="bold" letterSpacing="1px">
            HOOP TENSILE STRESS (σ)
          </text>
        </g>

        {/* Divider Line to Formula Panel */}
        <line x1={570} y1={100} x2={570} y2={460} stroke="#e9f2f6" strokeWidth={1} strokeDasharray="2 6" opacity={0.25} />

        {/* Formula Display Panel */}
        <g transform="translate(620, 140)" opacity={formulaOpacity}>
          <text x={0} y={0} fill="#e9f2f6" fontSize={13} fontWeight="700" letterSpacing="2px" opacity={0.6}>
            GOVERNING EQUATION
          </text>

          {/* Large Mathematical Expression */}
          <text x={0} y={85} fill="#d0523f" fontSize={42} fontWeight="700" fontFamily="serif">
            σ
          </text>
          <text x={40} y={85} fill="#e9f2f6" fontSize={32} fontWeight="300">
            =
          </text>

          {/* Fraction Numerator */}
          <text x={125} y={55} textAnchor="middle" fill="#e0b44c" fontSize={30} fontWeight="600">
            P · D
          </text>

          {/* Fraction Bar */}
          <line x1={75} y1={72} x2={175} y2={72} stroke="#e9f2f6" strokeWidth={2.5} opacity={0.8} />

          {/* Fraction Denominator */}
          <text x={125} y={110} textAnchor="middle" fill="#e9f2f6" fontSize={30} fontWeight="600">
            2 · t
          </text>

          {/* Parameter Definitions */}
          <g transform="translate(0, 175)" opacity={0.9}>
            <circle cx={6} cy={0} r={4} fill="#d0523f" />
            <text x={22} y={5} fill="#e9f2f6" fontSize={15}>
              <tspan fontWeight="bold" fill="#d0523f">σ</tspan> = Hoop Stress
            </text>

            <circle cx={6} cy={32} r={4} fill="#e0b44c" />
            <text x={22} y={37} fill="#e9f2f6" fontSize={15}>
              <tspan fontWeight="bold" fill="#e0b44c">P</tspan> = Internal Pressure
            </text>

            <circle cx={6} cy={64} r={4} fill="#e0b44c" />
            <text x={22} y={69} fill="#e9f2f6" fontSize={15}>
              <tspan fontWeight="bold" fill="#e0b44c">D</tspan> = Inside Diameter
            </text>

            <circle cx={6} cy={96} r={4} fill="#e9f2f6" />
            <text x={22} y={101} fill="#e9f2f6" fontSize={15}>
              <tspan fontWeight="bold" fill="#e9f2f6">t</tspan> = Wall Thickness
            </text>
          </g>
        </g>
      </svg>

      {/* Title Caption */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 28,
          fontWeight: 600,
          color: '#e9f2f6',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          opacity: Math.min(1, frame / (fps * 0.5)),
        }}
      >
        {displayTitle}
      </div>
    </AbsoluteFill>
  );
};