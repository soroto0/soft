import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TorsionskraftGelenkScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  // 1. Intro animation: drawing the technical schematic
  const intro = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 2. Normal forces animation: lifting and rotation vectors appear
  const forces = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 3. Torsion force animation: unexpected critical torsion vector appears
  const torsion = interpolate(frame, [span * 0.45, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 4. Twist angle: physical deformation of the central shaft lines
  const twistAngle = interpolate(frame, [span * 0.45, span * 0.9], [0, 24], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const shaftLines = [0, 1, 2, 3, 4];
  const gridLines = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const ticks = [0, 1, 2, 3, 4];

  return (
    <AbsoluteFill
      style={{
        opacity,
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      {/* Technical Diagram Container */}
      <div style={{ width: '80%', height: '70%', opacity: intro }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 900 500"
          style={{ overflow: 'visible' }}
        >
          {/* Background Grid */}
          {gridLines.map((i) => (
            <line
              key={`v-${i}`}
              x1={i * 90}
              y1={20}
              x2={i * 90}
              y2={480}
              stroke="#e9f2f6"
              strokeWidth={0.5}
              opacity={0.05}
            />
          ))}
          {gridLines.slice(0, 5).map((i) => (
            <line
              key={`h-${i}`}
              x1={50}
              y1={i * 80 + 40}
              x2={850}
              y2={i * 80 + 40}
              stroke="#e9f2f6"
              strokeWidth={0.5}
              opacity={0.05}
            />
          ))}

          {/* LEFT SHAFT (Input / Lifting Axis) */}
          <line
            x1={80}
            y1={250}
            x2={200}
            y2={250}
            stroke="#e9f2f6"
            strokeWidth={2}
            strokeDasharray="4 4"
            opacity={0.5}
          />
          <rect
            x={100}
            y={240}
            width={100}
            height={20}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1.5}
          />

          {/* LEFT YOKE */}
          <path
            d="M 200 250 L 220 250 L 220 190 L 240 190 M 220 250 L 220 310 L 240 310"
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={2}
          />

          {/* GIMBAL 1 (Left Cross Joint) */}
          <circle
            cx={240}
            cy={250}
            r={60}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.4}
          />
          <line
            x1={240}
            y1={180}
            x2={240}
            y2={320}
            stroke="#e9f2f6"
            strokeWidth={1.5}
          />
          <line
            x1={210}
            y1={250}
            x2={270}
            y2={250}
            stroke="#e9f2f6"
            strokeWidth={1.5}
          />

          {/* CENTRAL COUPLING SHAFT (Subject to Torsion) */}
          <g transform={`rotate(${twistAngle * 0.1}, 340, 250)`}>
            {/* Outer Cylinder */}
            <rect
              x={240}
              y={230}
              width={200}
              height={40}
              fill="none"
              stroke="#e9f2f6"
              strokeWidth={2}
            />
            {/* Internal twisting lines representing material stress */}
            {shaftLines.map((i) => {
              const yOffset = 234 + i * 8;
              const controlY = yOffset + (i - 2) * twistAngle * 0.7;
              return (
                <path
                  key={i}
                  d={`M 240 ${yOffset} Q 340 ${controlY} 440 ${yOffset}`}
                  fill="none"
                  stroke={torsion > 0.1 ? '#d0523f' : '#e9f2f6'}
                  strokeWidth={1.5}
                  opacity={torsion > 0.1 ? 0.8 : 0.3}
                />
              );
            })}
          </g>

          {/* GIMBAL 2 (Right Cross Joint) */}
          <circle
            cx={440}
            cy={250}
            r={60}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.4}
          />
          <line
            x1={440}
            y1={180}
            x2={440}
            y2={320}
            stroke="#e9f2f6"
            strokeWidth={1.5}
          />
          <line
            x1={410}
            y1={250}
            x2={470}
            y2={250}
            stroke="#e9f2f6"
            strokeWidth={1.5}
          />

          {/* RIGHT YOKE */}
          <path
            d="M 480 250 L 460 250 L 460 190 L 440 190 M 460 250 L 460 310 L 440 310"
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={2}
          />

          {/* RIGHT SHAFT (Output / Rotation Axis) */}
          <rect
            x={480}
            y={240}
            width={100}
            height={20}
            fill="none"
            stroke="#e9f2f6"
            strokeWidth={1.5}
          />
          <line
            x1={480}
            y1={250}
            x2={600}
            y2={250}
            stroke="#e9f2f6"
            strokeWidth={2}
            strokeDasharray="4 4"
            opacity={0.5}
          />

          {/* Dimension Line */}
          <line
            x1={240}
            y1={360}
            x2={440}
            y2={360}
            stroke="#e9f2f6"
            strokeWidth={1}
            opacity={0.5}
          />
          <line x1={240} y1={355} x2={240} y2={365} stroke="#e9f2f6" strokeWidth={1} opacity={0.5} />
          <line x1={440} y1={355} x2={440} y2={365} stroke="#e9f2f6" strokeWidth={1} opacity={0.5} />
          <text
            x={340}
            y={380}
            fill="#e9f2f6"
            fontSize={10}
            textAnchor="middle"
            opacity={0.6}
          >
            KOPPELGLIED L = 380mm
          </text>

          {/* FORCE VECTORS */}

          {/* 1. Lifting Force (Hebekraft - Orthogonal Y) */}
          <g opacity={forces}>
            <line
              x1={150}
              y1={240}
              x2={150}
              y2={120}
              stroke="#e9f2f6"
              strokeWidth={3}
            />
            <polygon points="145,125 150,110 155,125" fill="#e9f2f6" />
            <text x={160} y={135} fill="#e9f2f6" fontSize={12} fontWeight="bold">
              F_y (HEBEN)
            </text>
          </g>

          {/* 2. Rotational Force (Drehkraft - Orthogonal X) */}
          <g opacity={forces}>
            <path
              d="M 110 250 A 40 40 0 0 1 150 210"
              fill="none"
              stroke="#e0b44c"
              strokeWidth={3}
            />
            <polygon points="145,215 155,210 148,202" fill="#e0b44c" />
            <text x={100} y={195} fill="#e0b44c" fontSize={12} fontWeight="bold">
              M_x (ROTATION)
            </text>
          </g>

          {/* 3. Unexpected Torsion Vector (Torsionskraft - Signal Orange) */}
          <g opacity={torsion}>
            {/* Spiral wrapping around the central shaft */}
            <path
              d="M 310 250 C 310 180, 370 180, 370 250 C 370 320, 310 320, 310 265"
              fill="none"
              stroke="#d0523f"
              strokeWidth={4}
              strokeDasharray="8 4"
            />
            <polygon points="305,275 310,260 318,272" fill="#d0523f" />
            <text
              x={340}
              y={150}
              fill="#d0523f"
              fontSize={14}
              fontWeight="bold"
              textAnchor="middle"
            >
              M_t (UNERWARTETE TORSION)
            </text>
            <text
              x={340}
              y={335}
              fill="#d0523f"
              fontSize={11}
              textAnchor="middle"
              opacity={0.9}
            >
              !!! SCHERSPANNUNG ÜBERSCHRITTEN !!!
            </text>
          </g>

          {/* COMPARISON GRAPH (Soll vs. Ist Torsionskraft) */}
          <g transform="translate(640, 100)" opacity={forces}>
            {/* Panel Background */}
            <rect
              x={0}
              y={0}
              width={220}
              height={280}
              fill="#12181d"
              stroke="#e9f2f6"
              strokeWidth={1}
              opacity={0.8}
            />
            <text
              x={110}
              y={30}
              fill="#e9f2f6"
              fontSize={12}
              fontWeight="bold"
              textAnchor="middle"
            >
              TORSIONSBELASTUNG
            </text>

            {/* Y-Axis */}
            <line x1={40} y1={60} x2={40} y2={220} stroke="#e9f2f6" strokeWidth={1} />
            {ticks.map((t) => {
              const yPos = 220 - t * 35;
              return (
                <g key={t}>
                  <line x1={35} y1={yPos} x2={40} y2={yPos} stroke="#e9f2f6" strokeWidth={1} />
                  <text x={28} y={yPos + 4} fill="#e9f2f6" fontSize={9} textAnchor="end">
                    {t * 25}
                  </text>
                </g>
              );
            })}
            <text x={20} y={50} fill="#e9f2f6" fontSize={8}>
              (kNm)
            </text>

            {/* Bar 1: SOLL (Calculated) */}
            <rect
              x={65}
              y={220 - 35 * forces}
              width={35}
              height={35 * forces}
              fill="#e9f2f6"
              opacity={0.6}
            />
            <text
              x={82.5}
              y={240}
              fill="#e9f2f6"
              fontSize={10}
              textAnchor="middle"
            >
              SOLL
            </text>
            <text
              x={82.5}
              y={210 - 35 * forces}
              fill="#e9f2f6"
              fontSize={10}
              textAnchor="middle"
              opacity={forces}
            >
              25
            </text>

            {/* Bar 2: IST (Actual - Overload!) */}
            <rect
              x={135}
              y={220 - 119 * torsion}
              width={35}
              height={119 * torsion}
              fill="#d0523f"
            />
            <text
              x={152.5}
              y={240}
              fill="#d0523f"
              fontSize={10}
              fontWeight="bold"
              textAnchor="middle"
            >
              IST
            </text>
            <text
              x={152.5}
              y={210 - 119 * torsion}
              fill="#d0523f"
              fontSize={11}
              fontWeight="bold"
              textAnchor="middle"
              opacity={torsion}
            >
              85
            </text>

            {/* Error Indicator */}
            {torsion > 0.5 && (
              <text
                x={110}
                y={265}
                fill="#d0523f"
                fontSize={11}
                fontWeight="bold"
                textAnchor="middle"
              >
                +340% ABWEICHUNG
              </text>
            )}
          </g>
        </svg>
      </div>

      {/* Caption / Title */}
      {p.title ? (
        <div
          style={{
            marginTop: 20,
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: 2,
            textAlign: 'center',
            textTransform: 'uppercase',
            borderTop: '1px solid rgba(233, 242, 246, 0.3)',
            paddingTop: 15,
            width: '80%',
          }}
        >
          {p.title}
        </div>
      ) : (
        <div
          style={{
            marginTop: 20,
            fontSize: 28,
            color: '#e9f2f6',
            letterSpacing: 2,
            textAlign: 'center',
            textTransform: 'uppercase',
            borderTop: '1px solid rgba(233, 242, 246, 0.3)',
            paddingTop: 15,
            width: '80%',
          }}
        >
          TORSIONSBELASTUNG IM DOPPELKARDAN
        </div>
      )}
    </AbsoluteFill>
  );
};