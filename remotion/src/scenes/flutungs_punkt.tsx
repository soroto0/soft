import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FlutungsPunktScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const tilt = interpolate(frame, [span * 0.1, span * 0.5], [0, 40], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hatchOpen = interpolate(frame, [span * 0.25, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dimProgress = interpolate(frame, [span * 0.5, span * 0.72], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowPulse = interpolate(frame, [span * 0.68, span * 0.95], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textRise = interpolate(frame, [span * 0.15, span * 0.45], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ribs = [-90, -60, -30, 0, 30, 60, 90];
  const angleTicks = [
    { deg: 0, label: '0°' },
    { deg: 20, label: '20°' },
    { deg: 40, label: '40° KRITISCH', color: '#d0523f' },
    { deg: 60, label: '60°' },
    { deg: 70, label: '70° GESCHLOSSEN', color: '#5b7f9c' },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <svg width="78%" viewBox="0 0 740 440">
        <defs>
          <linearGradient id="hullGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c3c48" />
            <stop offset="60%" stopColor="#1a252d" />
            <stop offset="100%" stopColor="#12181d" />
          </linearGradient>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3d6888" stopOpacity={0.1} />
            <stop offset="50%" stopColor="#5b7f9c" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#3d6888" stopOpacity={0.1} />
          </linearGradient>
          <marker
            id="dimArrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#e0b44c" />
          </marker>
          <marker
            id="orangeArrow"
            viewBox="0 0 12 12"
            refX="9"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 1.5 L 12 6 L 0 10.5 z" fill="#ff7a29" />
          </marker>
        </defs>

        {/* --- Top Left: Angle Gauge (Flutungswinkel-Skala) --- */}
        <g transform="translate(110, 85)">
          <path
            d="M 0 0 L 80 0 A 80 80 0 0 1 27.36 75.18 Z"
            fill="#e9f2f6"
            fillOpacity={0.04}
            stroke="#e9f2f6"
            strokeWidth={0.7}
            strokeDasharray="2 2"
          />
          {/* 70 deg sector (closed hull) */}
          <path
            d="M 0 0 L 70 0 A 70 70 0 0 1 23.94 65.78 Z"
            fill="#5b7f9c"
            fillOpacity={0.18}
          />
          {/* 40 deg sector (open hatch critical) */}
          <path
            d="M 0 0 L 70 0 A 70 70 0 0 1 53.62 45.0 Z"
            fill="#d0523f"
            fillOpacity={0.25}
          />
          {angleTicks.map((t) => {
            const rad = (t.deg * Math.PI) / 180;
            const x1 = Math.cos(rad) * 66;
            const y1 = Math.sin(rad) * 66;
            const x2 = Math.cos(rad) * 80;
            const y2 = Math.sin(rad) * 80;
            const tx = Math.cos(rad) * 94;
            const ty = Math.sin(rad) * 94;
            return (
              <g key={t.deg}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={t.color || '#e9f2f6'}
                  strokeWidth={t.color ? 1.5 : 0.8}
                />
                <text
                  x={tx}
                  y={ty + 3}
                  fill={t.color || '#a9b7be'}
                  fontSize={8}
                  textAnchor="start"
                  fontFamily="'Segoe UI', Arial, sans-serif"
                >
                  {t.label}
                </text>
              </g>
            );
          })}
          {/* Dynamic Needle */}
          {(() => {
            const nRad = (tilt * Math.PI) / 180;
            const nx = Math.cos(nRad) * 78;
            const ny = Math.sin(nRad) * 78;
            return (
              <g>
                <line
                  x1={0}
                  y1={0}
                  x2={nx}
                  y2={ny}
                  stroke="#e0b44c"
                  strokeWidth={2.2}
                />
                <circle cx={0} cy={0} r={3.5} fill="#e0b44c" />
                <circle cx={nx} cy={ny} r={2.5} fill="#e0b44c" />
              </g>
            );
          })()}
          <text
            x={0}
            y={-12}
            fill="#e9f2f6"
            fontSize={10}
            fontWeight="bold"
            letterSpacing={0.5}
            fontFamily="'Segoe UI', Arial, sans-serif"
          >
            FLUTUNGSWINKEL: {tilt.toFixed(0)}°
          </text>
        </g>

        {/* --- Waterline (Static Reference) --- */}
        <g>
          <line
            x1={50}
            y1={240}
            x2={690}
            y2={240}
            stroke="#5b7f9c"
            strokeWidth={1.8}
            strokeDasharray="8 4"
          />
          <rect x={50} y={240} width={640} height={160} fill="url(#waterGrad)" />
          <text
            x={60}
            y={234}
            fill="#5b7f9c"
            fontSize={9}
            letterSpacing={1}
            fontFamily="'Segoe UI', Arial, sans-serif"
          >
            WASSERLINIE (RUHEZUSTAND)
          </text>
        </g>

        {/* --- Rotating Hull Cross Section --- */}
        <g transform={`translate(390, 240) rotate(${tilt})`}>
          {/* Neutral Vertical Axis of Ship */}
          <line
            x1={0}
            y1={-150}
            x2={0}
            y2={110}
            stroke="#e9f2f6"
            strokeWidth={0.7}
            strokeDasharray="4 4"
            opacity={0.5}
          />

          {/* Outer Hull Plating */}
          <path
            d="M -115 -75 C -125 15, -95 85, 0 95 C 95 85, 125 15, 115 -75 Z"
            fill="url(#hullGrad)"
            stroke="#e9f2f6"
            strokeWidth={1.6}
          />

          {/* Inner Keel Structure and Floors */}
          <path
            d="M -95 -70 C -105 10, -80 72, 0 80 C 80 72, 105 10, 95 -70 Z"
            fill="none"
            stroke="#8a949b"
            strokeWidth={0.8}
            strokeDasharray="3 2"
          />
          <line x1={-6} y1={80} x2={6} y2={80} stroke="#e9f2f6" strokeWidth={3} />
          <line x1={0} y1={80} x2={0} y2={95} stroke="#e0b44c" strokeWidth={2} />

          {/* Decks (Cross Beams) */}
          {/* Upper Deck */}
          <line x1={-112} y1={-70} x2={112} y2={-70} stroke="#e9f2f6" strokeWidth={2} />
          {/* Gun Deck */}
          <line x1={-110} y1={-25} x2={110} y2={-25} stroke="#e9f2f6" strokeWidth={1.5} />
          {/* Lower Deck / Orlop */}
          <line x1={-98} y1={20} x2={98} y2={20} stroke="#8a949b" strokeWidth={1.2} />
          {/* Bilge / Hold */}
          <line x1={-70} y1={55} x2={70} y2={55} stroke="#8a949b" strokeWidth={1} />

          {/* Internal Deck Pillars */}
          {ribs.map((rx) => (
            <line
              key={rx}
              x1={rx}
              y1={-70}
              x2={rx}
              y2={55}
              stroke="#5d6a73"
              strokeWidth={0.7}
              opacity={0.6}
            />
          ))}

          {/* Starboard Closed Port */}
          <rect x={-117} y={-38} width={5} height={18} fill="#2c3c48" stroke="#e9f2f6" strokeWidth={1} />

          {/* Port Side: Gunport (Seitenpforte) Opening */}
          {/* Cutout gap in hull */}
          <line x1={113} y1={-38} x2={110} y2={-20} stroke="#12181d" strokeWidth={4} />

          {/* Flap hinged at top */}
          <line
            x1={113}
            y1={-38}
            x2={113 + Math.sin(hatchOpen * 1.5) * 16}
            y2={-38 - Math.cos(hatchOpen * 1.5) * 16}
            stroke="#d0523f"
            strokeWidth={2.5}
          />
          <circle cx={113} cy={-38} r={2} fill="#e0b44c" />

          {/* Internal Label: Batteriedeck */}
          <text
            x={0}
            y={-30}
            fill="#a9b7be"
            fontSize={7.5}
            textAnchor="middle"
            letterSpacing={0.8}
            fontFamily="'Segoe UI', Arial, sans-serif"
          >
            BATTERIEDECK
          </text>
          <text
            x={0}
            y={14}
            fill="#5d6a73"
            fontSize={7}
            textAnchor="middle"
            letterSpacing={0.8}
            fontFamily="'Segoe UI', Arial, sans-serif"
          >
            UNTERDECK
          </text>
        </g>

        {/* --- Hatch Position in Global Frame at 40° Tilt --- */}
        {(() => {
          // Pivot is (390, 240), local hatch hinge is (113, -29)
          const rad = (tilt * Math.PI) / 180;
          const lx = 113;
          const ly = -29;
          const gx = 390 + lx * Math.cos(rad) - ly * Math.sin(rad);
          const gy = 240 + lx * Math.sin(rad) + ly * Math.cos(rad);
          const waterY = 240;
          const currentH = waterY - gy;

          return (
            <g opacity={dimProgress}>
              {/* Reference dot on the open sideport */}
              <circle cx={gx} cy={gy} r={3.5} fill="#ff7a29" stroke="#ffffff" strokeWidth={1} />

              {/* Horizontal line from hatch towards right */}
              <line
                x1={gx}
                y1={gy}
                x2={gx + 80}
                y2={gy}
                stroke="#e0b44c"
                strokeWidth={1}
                strokeDasharray="2 2"
              />

              {/* Water level reference marker on right */}
              <line
                x1={gx + 20}
                y1={waterY}
                x2={gx + 80}
                y2={waterY}
                stroke="#5b7f9c"
                strokeWidth={1}
                strokeDasharray="2 2"
              />

              {/* Vertical Dimension Line (Abstand zur Wasserlinie) */}
              <line
                x1={gx + 65}
                y1={gy}
                x2={gx + 65}
                y2={waterY}
                stroke="#e0b44c"
                strokeWidth={1.4}
                markerStart="url(#dimArrow)"
                markerEnd="url(#dimArrow)"
              />

              <text
                x={gx + 75}
                y={(gy + waterY) / 2 + 3}
                fill="#e0b44c"
                fontSize={9}
                fontFamily="'Segoe UI', Arial, sans-serif"
                fontWeight="bold"
              >
                Δh = {Math.max(0, currentH * 0.04).toFixed(2)} m
              </text>

              <text
                x={gx + 75}
                y={(gy + waterY) / 2 + 15}
                fill="#a9b7be"
                fontSize={7.5}
                fontFamily="'Segoe UI', Arial, sans-serif"
              >
                ABSTAND ZUR WASSERLINIE
              </text>

              {/* Orange Entry Ingress Arrow (Eintrittspfeil) */}
              <g opacity={arrowPulse}>
                <path
                  d={`M ${gx + 45} ${waterY + 15} C ${gx + 30} ${waterY + 5}, ${gx + 18} ${gy + 10}, ${gx + 4} ${gy + 2}`}
                  fill="none"
                  stroke="#ff7a29"
                  strokeWidth={2.8}
                  markerEnd="url(#orangeArrow)"
                />
                <circle cx={gx} cy={gy} r={10 + arrowPulse * 6} fill="none" stroke="#ff7a29" strokeWidth={1} opacity={1 - arrowPulse * 0.8} />
                <text
                  x={gx + 48}
                  y={waterY + 28}
                  fill="#ff7a29"
                  fontSize={8.5}
                  fontWeight="bold"
                  fontFamily="'Segoe UI', Arial, sans-serif"
                >
                  WASSEREINTRITT
                </text>
              </g>

              {/* Status Note on Port */}
              <text
                x={gx - 10}
                y={gy - 16}
                fill="#d0523f"
                fontSize={9}
                fontWeight="bold"
                textAnchor="end"
                fontFamily="'Segoe UI', Arial, sans-serif"
              >
                OFFENE SEITENPFORTE
              </text>
            </g>
          );
        })()}

        {/* --- Stability Comparison Cards (Bottom Right) --- */}
        <g transform="translate(500, 70)">
          {/* Card 1: Luke Geschlossen */}
          <rect
            x={0}
            y={0}
            width={180}
            height={44}
            fill="#1a252d"
            fillOpacity={0.8}
            stroke="#5b7f9c"
            strokeWidth={1}
            rx={2}
          />
          <circle cx={14} cy={22} r={5} fill="#5b7f9c" />
          <text
            x={28}
            y={18}
            fill="#e9f2f6"
            fontSize={9}
            fontWeight="bold"
            fontFamily="'Segoe UI', Arial, sans-serif"
          >
            GESCHLOSSEN: 70°
          </text>
          <text
            x={28}
            y={32}
            fill="#8a949b"
            fontSize={8}
            fontFamily="'Segoe UI', Arial, sans-serif"
          >
            Stabiler Flutungswinkel (Deckskante)
          </text>

          {/* Card 2: Luke Offen */}
          <rect
            x={0}
            y={52}
            width={180}
            height={44}
            fill="#1a252d"
            fillOpacity={0.8}
            stroke="#d0523f"
            strokeWidth={1.2}
            rx={2}
          />
          <circle cx={14} cy={74} r={5} fill="#d0523f" />
          <text
            x={28}
            y={70}
            fill="#d0523f"
            fontSize={9}
            fontWeight="bold"
            fontFamily="'Segoe UI', Arial, sans-serif"
          >
            OFFENE PFORTE: 40°
          </text>
          <text
            x={28}
            y={84}
            fill="#e9f2f6"
            fontSize={8}
            fontFamily="'Segoe UI', Arial, sans-serif"
          >
            Fataler früher Wassereinbruch
          </text>
        </g>
      </svg>

      {/* --- Screen Caption / Title --- */}
      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 42,
            transform: `translateY(${textRise}px)`,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: 0.8,
            color: '#e9f2f6',
            textTransform: 'uppercase',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};