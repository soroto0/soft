import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const QuerschnittBetonplatteScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const lineDraw = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const steelDraw = interpolate(frame, [span * 0.25, span * 0.65], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelsDraw = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [span * 0.1, span * 0.5], [15, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const svgWidth = width * 0.85;
  const svgHeight = height * 0.75;

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
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox="0 0 1100 600"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <pattern id="concreteHatch" width="24" height="24" patternUnits="userSpaceOnUse">
            <line x1="0" y1="24" x2="24" y2="0" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.15" />
            <circle cx="6" cy="6" r="1" fill="#e9f2f6" opacity="0.3" />
            <circle cx="18" cy="14" r="1.5" fill="#e9f2f6" opacity="0.2" />
          </pattern>
          <pattern id="insulationHatch" width="12" height="12" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="12" y2="12" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.2" />
            <line x1="12" y1="0" x2="0" y2="12" stroke="#e9f2f6" strokeWidth="0.5" opacity="0.1" />
          </pattern>
          <pattern id="screedHatch" width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="8" x2="8" y2="0" stroke="#e9f2f6" strokeWidth="0.8" opacity="0.25" />
          </pattern>
          <clipPath id="slabClip">
            <rect x="200" y="120" width={450 * lineDraw} height="260" />
          </clipPath>
        </defs>

        {/* 1. Layers (Clipped for reveal animation) */}
        <g clipPath="url(#slabClip)">
          {/* Layer 1: Estrich (Top, 40mm) -> y: 120 to 150 */}
          <rect x="200" y="120" width="450" height="30" fill="url(#screedHatch)" stroke="#e9f2f6" strokeWidth="1" opacity="0.8" />

          {/* Layer 2: Concrete (Middle, 200mm) -> y: 150 to 330 */}
          <rect x="200" y="150" width="450" height="180" fill="url(#concreteHatch)" stroke="#e9f2f6" strokeWidth="1" />

          {/* Layer 3: Insulation (Bottom, 60mm) -> y: 330 to 380 */}
          <rect x="200" y="330" width="450" height="50" fill="url(#insulationHatch)" stroke="#e9f2f6" strokeWidth="1" opacity="0.7" />
        </g>

        {/* 2. Reinforcement Steel (Bewehrung) */}
        {steelDraw > 0 && (
          <g opacity={steelDraw}>
            {/* Longitudinal bars (horizontal lines) */}
            <line
              x1="210"
              y1="180"
              x2={210 + 430 * steelDraw}
              y2="180"
              stroke="#e0b44c"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="210"
              y1="300"
              x2={210 + 430 * steelDraw}
              y2="300"
              stroke="#e0b44c"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Transverse bars (circles) */}
            {[230, 290, 350, 410, 470, 530, 590, 630].map((cx, idx) => {
              const circleOpacity = interpolate(steelDraw, [idx * 0.06, idx * 0.06 + 0.3], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return (
                <g key={cx} opacity={circleOpacity}>
                  <circle cx={cx} cy="180" r="6" fill="#e0b44c" stroke="#e9f2f6" strokeWidth="1" />
                  <circle cx={cx} cy="300" r="6" fill="#e0b44c" stroke="#e9f2f6" strokeWidth="1" />
                </g>
              );
            })}
          </g>
        )}

        {/* 3. Dimension Lines (Maßketten) */}
        {lineDraw > 0 && (
          <g opacity={lineDraw}>
            {/* Vertical Dimension Line (Left side) */}
            <line x1="140" y1="120" x2="140" y2={120 + 260 * lineDraw} stroke="#e9f2f6" strokeWidth="1.5" />
            {/* Ticks */}
            <line x1="130" y1="120" x2="150" y2="120" stroke="#e9f2f6" strokeWidth="1.5" />
            <line x1="130" y1="150" x2="150" y2="150" stroke="#e9f2f6" strokeWidth="1.5" />
            <line x1="130" y1="330" x2="150" y2="330" stroke="#e9f2f6" strokeWidth="1.5" />
            <line x1="130" y1="380" x2="150" y2="380" stroke="#e9f2f6" strokeWidth="1.5" />

            {/* Dimension Texts */}
            <g opacity={labelsDraw}>
              <text x="110" y="140" fill="#e9f2f6" fontSize="12" textAnchor="end" fontFamily="monospace">40 mm</text>
              <text x="110" y="245" fill="#e9f2f6" fontSize="12" textAnchor="end" fontFamily="monospace">200 mm</text>
              <text x="110" y="360" fill="#e9f2f6" fontSize="12" textAnchor="end" fontFamily="monospace">60 mm</text>
              
              {/* Total height */}
              <text x="70" y="255" fill="#e0b44c" fontSize="14" fontWeight="bold" textAnchor="end" fontFamily="monospace">GESAMT: 300 mm</text>
              <line x1="85" y1="120" x2="85" y2="380" stroke="#e0b44c" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="80" y1="120" x2="90" y2="120" stroke="#e0b44c" strokeWidth="1" />
              <line x1="80" y1="380" x2="90" y2="380" stroke="#e0b44c" strokeWidth="1" />
            </g>

            {/* Horizontal Dimension Line (Bottom side, showing reinforcement spacing) */}
            <line x1="230" y1="430" x2={230 + 60 * lineDraw} stroke="#e9f2f6" strokeWidth="1.5" />
            <line x1="230" y1="425" x2="230" y2="435" stroke="#e9f2f6" strokeWidth="1.5" />
            <line x1="290" y1="425" x2="290" y2="435" stroke="#e9f2f6" strokeWidth="1.5" />
            <g opacity={labelsDraw}>
              <text x="260" y="455" fill="#e9f2f6" fontSize="11" textAnchor="middle" fontFamily="monospace">s = 150 mm</text>
            </g>
          </g>
        )}

        {/* 4. Technical Labels & Leader Lines */}
        {labelsDraw > 0 && (
          <g opacity={labelsDraw}>
            {/* Label 1: Estrich */}
            <path d="M 400,135 L 700,100 L 730,100" fill="none" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="400" cy="135" r="3" fill="#e9f2f6" />
            <text x="740" y="104" fill="#e9f2f6" fontSize="13" fontFamily="sans-serif" textAnchor="start">
              Zementestrich (C25) <tspan fill="#e0b44c">40 mm</tspan>
            </text>

            {/* Label 2: Upper Reinforcement */}
            <path d="M 470,180 L 700,170 L 730,170" fill="none" stroke="#e0b44c" strokeWidth="1" />
            <circle cx="470" cy="180" r="3" fill="#e0b44c" />
            <text x="740" y="174" fill="#e0b44c" fontSize="13" fontFamily="sans-serif" textAnchor="start" fontWeight="bold">
              Bewehrungsstahl Ø 12 mm
            </text>

            {/* Label 3: Concrete Body */}
            <path d="M 420,240 L 700,240 L 730,240" fill="none" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="420" cy="240" r="3" fill="#e9f2f6" />
            <text x="740" y="244" fill="#e9f2f6" fontSize="13" fontFamily="sans-serif" textAnchor="start">
              Stahlbeton C30/37 <tspan fill="#e0b44c">200 mm</tspan>
            </text>

            {/* Label 4: Lower Reinforcement */}
            <path d="M 530,300 L 700,310 L 730,310" fill="none" stroke="#e0b44c" strokeWidth="1" />
            <circle cx="530" cy="300" r="3" fill="#e0b44c" />
            <text x="740" y="314" fill="#e0b44c" fontSize="13" fontFamily="sans-serif" textAnchor="start" fontWeight="bold">
              Tragbewehrung (unten)
            </text>

            {/* Label 5: Insulation */}
            <path d="M 350,355 L 700,380 L 730,380" fill="none" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="350" cy="355" r="3" fill="#e9f2f6" />
            <text x="740" y="384" fill="#e9f2f6" fontSize="13" fontFamily="sans-serif" textAnchor="start">
              Trittschalldämmung <tspan fill="#e0b44c">60 mm</tspan>
            </text>

            {/* Technical Stamp / Certification Note */}
            <rect x="740" y="430" width="280" height="75" fill="#e9f2f6" fillOpacity="0.05" stroke="#e0b44c" strokeWidth="1" rx="4" />
            <text x="755" y="452" fill="#e0b44c" fontSize="11" fontFamily="sans-serif" fontWeight="bold">STATISCHE FREIGABE</text>
            <text x="755" y="472" fill="#e9f2f6" fontSize="10" fontFamily="sans-serif" opacity="0.9">Zertifiziert: ABSOLUT SICHER</text>
            <text x="755" y="488" fill="#e9f2f6" fontSize="9" fontFamily="sans-serif" opacity="0.5">Prüfbericht-Nr. ST-2026-08</text>
          </g>
        )}
      </svg>

      {/* Caption */}
      {p.title ? (
        <div
          style={{
            marginTop: 10,
            transform: `translateY(${titleSlide}px)`,
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 24,
            letterSpacing: '3px',
            fontWeight: 'bold',
            color: '#e9f2f6',
            borderLeft: '4px solid #e0b44c',
            paddingLeft: '12px',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};