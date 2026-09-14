import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const TunnelGeometryPlanScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const drawProgress = interpolate(frame, [0, span * 0.45], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hatchProgress = interpolate(frame, [span * 0.35, span * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelProgress = interpolate(frame, [span * 0.55, span * 0.95], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [0, span], [0.97, 1.03], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const gridX = [100, 200, 300, 400, 500, 600, 700];
  const gridY = [100, 150, 200, 250, 300, 350, 400];

  const ticksX = [150, 250, 350, 450, 550, 650];
  const ticksY = [120, 180, 240, 300, 360];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          width: '80%',
          height: '70%',
          transform: `scale(${scale})`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 500"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <pattern
              id="hatch-pattern"
              width="12"
              height="12"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="12"
                stroke="#d0523f"
                strokeWidth="2"
              />
            </pattern>
            <clipPath id="reveal-clip">
              <rect x="0" y="0" width={800 * drawProgress} height="500" />
            </clipPath>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#d0523f" />
            </marker>
          </defs>

          {/* Technical Grid Background */}
          <g opacity={0.15}>
            {gridX.map((x) => (
              <line
                key={`grid-x-${x}`}
                x1={x}
                y1={50}
                x2={x}
                y2={450}
                stroke="#e9f2f6"
                strokeWidth={0.5}
                strokeDasharray="2 4"
              />
            ))}
            {gridY.map((y) => (
              <line
                key={`grid-y-${y}`}
                x1={80}
                y1={y}
                x2={720}
                y2={y}
                stroke="#e9f2f6"
                strokeWidth={0.5}
                strokeDasharray="2 4"
              />
            ))}
          </g>

          {/* Coordinate Ticks */}
          <g opacity={0.3}>
            {ticksX.map((x) => (
              <g key={`tick-x-${x}`}>
                <line x1={x} y1={48} x2={x} y2={54} stroke="#e9f2f6" strokeWidth={1} />
                <text x={x} y={42} fill="#e9f2f6" fontSize={8} fontFamily="monospace" textAnchor="middle">
                  {x}m
                </text>
              </g>
            ))}
            {ticksY.map((y) => (
              <g key={`tick-y-${y}`}>
                <line x1={78} y1={y} x2={84} y2={y} stroke="#e9f2f6" strokeWidth={1} />
                <text x={70} y={y + 3} fill="#e9f2f6" fontSize={8} fontFamily="monospace" textAnchor="end">
                  {y}m
                </text>
              </g>
            ))}
          </g>

          {/* Main Tunnel Geometry Group (with Clip Path for drawing effect) */}
          <g clipPath="url(#reveal-clip)">
            {/* Outer Walls (Thick light border) */}
            <g stroke="#e9f2f6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.85}>
              <path d="M 120,240 L 680,240" strokeWidth={54} />
              <path d="M 180,380 L 460,240" strokeWidth={44} />
              <path d="M 320,100 L 460,240" strokeWidth={34} />
            </g>

            {/* Inner Cavity (Dark fill to hollow out the tunnels) */}
            <g stroke="#111827" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M 120,240 L 680,240" strokeWidth={50} />
              <path d="M 180,380 L 460,240" strokeWidth={40} />
              <path d="M 320,100 L 460,240" strokeWidth={30} />
            </g>

            {/* Centerlines */}
            <g stroke="#e0b44c" strokeWidth={1} strokeDasharray="5 4" fill="none" opacity={0.6}>
              <path d="M 120,240 L 680,240" />
              <path d="M 180,380 L 460,240" />
              <path d="M 320,100 L 460,240" />
            </g>
          </g>

          {/* Critical Span Highlight & Hatching */}
          <g opacity={hatchProgress}>
            {/* Danger Hatching Area */}
            <circle
              cx={440}
              cy={240}
              r={48}
              fill="url(#hatch-pattern)"
              opacity={0.6}
            />
            {/* Danger Area Outline */}
            <circle
              cx={440}
              cy={240}
              r={48}
              fill="none"
              stroke="#d0523f"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />

            {/* Dimension Line (14m Span) */}
            <line
              x1={406}
              y1={206}
              x2={474}
              y2={274}
              stroke="#d0523f"
              strokeWidth={1.5}
              markerStart="url(#arrow)"
              markerEnd="url(#arrow)"
            />
            <rect x={412} y={228} width={56} height={15} fill="#111827" rx={2} stroke="#d0523f" strokeWidth={0.5} />
            <text
              x={440}
              y={239}
              fill="#d0523f"
              fontSize={9}
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              14.0 m
            </text>
          </g>

          {/* Labels & Leader Lines */}
          <g opacity={labelProgress}>
            {/* Main Tube Label */}
            <path d="M 200,175 L 200,215" stroke="#e9f2f6" strokeWidth={0.8} fill="none" />
            <circle cx={200} cy={215} r={2} fill="#e9f2f6" />
            <text x={200} y={165} fill="#e9f2f6" fontSize={11} fontFamily="monospace" textAnchor="middle">
              HAUPTRÖHRE (DN 9.5m)
            </text>

            {/* Access Ramp Label */}
            <path d="M 200,415 L 240,350" stroke="#e9f2f6" strokeWidth={0.8} fill="none" />
            <circle cx={240} cy={350} r={2} fill="#e9f2f6" />
            <text x={200} y={430} fill="#e9f2f6" fontSize={11} fontFamily="monospace" textAnchor="middle">
              AUFFAHRTSRAMPE
            </text>

            {/* Ventilation Passage Label */}
            <path d="M 550,95 L 400,170" stroke="#e9f2f6" strokeWidth={0.8} fill="none" />
            <circle cx={400} cy={170} r={2} fill="#e9f2f6" />
            <text x={550} y={85} fill="#e9f2f6" fontSize={11} fontFamily="monospace" textAnchor="start">
              QUERSCHLAG (BELÜFTUNG)
            </text>

            {/* Critical Span Callout */}
            <path d="M 620,310 L 480,260" stroke="#d0523f" strokeWidth={0.8} fill="none" />
            <circle cx={480} cy={260} r={2} fill="#d0523f" />
            <text x={625} y={314} fill="#d0523f" fontSize={11} fontFamily="monospace" fontWeight="bold" textAnchor="start">
              KRITISCHE SPANNWEITE
            </text>
            <text x={625} y={328} fill="#e9f2f6" fontSize={9} fontFamily="monospace" textAnchor="start">
              EINSTURZGEFÄHRDETER BEREICH
            </text>

            {/* Technical Title Block inside SVG */}
            <g transform="translate(120, 70)">
              <rect x={0} y={0} width={180} height={40} fill="rgba(17, 24, 39, 0.85)" stroke="#e9f2f6" strokeWidth={0.8} />
              <text x={10} y={16} fill="#e9f2f6" fontSize={8} fontFamily="monospace" fontWeight="bold">
                PROJEKT: SÜDTUNNEL KM 14+200
              </text>
              <text x={10} y={28} fill="#e0b44c" fontSize={8} fontFamily="monospace">
                GEOMETRIE: DREIFACH-KREUZUNG
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* On-screen Caption */}
      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: '8%',
            fontFamily: "monospace, 'Courier New', sans-serif",
            fontSize: 22,
            letterSpacing: 2,
            color: '#e9f2f6',
            opacity: labelProgress,
            borderLeft: '4px solid #d0523f',
            paddingLeft: 12,
            backgroundColor: 'rgba(17, 24, 39, 0.6)',
            paddingTop: 6,
            paddingBottom: 6,
            paddingRight: 16,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};