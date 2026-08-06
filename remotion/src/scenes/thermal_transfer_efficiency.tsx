import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ThermalTransferEfficiencyScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const drawProgress = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scaleAlpha = interpolate(frame, [span * 0.2, span * 0.5], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const efficiency = interpolate(frame, [span * 0.35, span * 0.75], [100, 76], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const heatFlowOffset = interpolate(frame, [0, span], [0, 120], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textRise = interpolate(frame, [span * 0.1, span * 0.4], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowRows = [95, 135, 175, 215, 255];
  const tempTicks = [
    { y: 85, label: '350°C (Source)' },
    { y: 160, label: '260°C (Wall)' },
    { y: 235, label: '180°C (Water)' },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: '82%',
          height: '80%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <svg viewBox="0 0 780 340" style={{ width: '100%', height: '82%', overflow: 'visible' }}>
          <defs>
            <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4a5560" />
              <stop offset="50%" stopColor="#7a8691" />
              <stop offset="100%" stopColor="#4a5560" />
            </linearGradient>

            <linearGradient id="scaleGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8c764d" />
              <stop offset="50%" stopColor="#b8a06e" />
              <stop offset="100%" stopColor="#6e5b38" />
            </linearGradient>

            <linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1e3848" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#0e1d28" stopOpacity={0.4} />
            </linearGradient>

            <linearGradient id="heatArrowGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#d0523f" />
              <stop offset="60%" stopColor="#e0b44c" />
              <stop offset="100%" stopColor="#5b7f9c" />
            </linearGradient>

            <pattern id="scaleHatch" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2" stroke="#4a3a1f" strokeWidth="1.2" />
            </pattern>
          </defs>

          {/* Background Cross-Section Container */}
          <g opacity={drawProgress}>
            {/* Heat Source Zone */}
            <rect x="20" y="50" width="80" height="250" fill="#2b1816" opacity={0.6} rx="4" />
            <text x="60" y="40" fill="#d0523f" fontSize="10" textAnchor="middle" fontWeight="bold">
              HEAT SOURCE
            </text>

            {/* Steel Pipe Wall */}
            <rect x="100" y="50" width="80" height="250" fill="url(#metalGrad)" stroke="#e9f2f6" strokeWidth="0.5" />
            <text x="140" y="40" fill="#e9f2f6" fontSize="10" textAnchor="middle">
              STEEL WALL (6 mm)
            </text>

            {/* Scale Layer */}
            <rect
              x="180"
              y="50"
              width={18 * scaleAlpha}
              height="250"
              fill="url(#scaleGrad)"
              stroke="#e0b44c"
              strokeWidth={0.5 * scaleAlpha}
            />
            <rect
              x="180"
              y="50"
              width={18 * scaleAlpha}
              height="250"
              fill="url(#scaleHatch)"
              opacity={0.6 * scaleAlpha}
            />
            {scaleAlpha > 0.3 && (
              <text x="189" y="318" fill="#e0b44c" fontSize="9" textAnchor="middle" opacity={scaleAlpha}>
                SCALE 1/16"
              </text>
            )}

            {/* Water Side */}
            <rect
              x={180 + 18 * scaleAlpha}
              y="50"
              width={220 - 18 * scaleAlpha}
              height="250"
              fill="url(#waterGrad)"
              stroke="#5b7f9c"
              strokeWidth="0.5"
            />
            <text x={290 + 9 * scaleAlpha} y="40" fill="#5b7f9c" fontSize="10" textAnchor="middle">
              WATER FLUID
            </text>
          </g>

          {/* Heat Flow Arrows & Deflections */}
          <g opacity={drawProgress}>
            {arrowRows.map((yPos, idx) => {
              const isDeflected = scaleAlpha > 0.1 && (idx === 0 || idx === 4);
              const endX = isDeflected ? 180 + scaleAlpha * 5 : 360;
              const pathD = isDeflected
                ? `M 40 ${yPos} L 175 ${yPos} Q 185 ${idx === 0 ? yPos - 25 : yPos + 25} 170 ${
                    idx === 0 ? yPos - 40 : yPos + 40
                  }`
                : `M 40 ${yPos} L ${endX} ${yPos}`;

              return (
                <g key={yPos}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke="url(#heatArrowGrad)"
                    strokeWidth={isDeflected ? 2.5 : 3.5 - (1 - efficiency / 100) * 1.5}
                    strokeDasharray="8 4"
                    strokeDashoffset={-heatFlowOffset}
                    opacity={0.85}
                  />
                  {!isDeflected && (
                    <polygon
                      points={`${endX},${yPos - 4} ${endX + 8},${yPos} ${endX},${yPos + 4}`}
                      fill="#5b7f9c"
                    />
                  )}
                  {isDeflected && (
                    <circle
                      cx={180}
                      cy={idx === 0 ? yPos - 15 : yPos + 15}
                      r="2.5"
                      fill="#d0523f"
                      opacity={scaleAlpha}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* Temperature Axis / Grid Ticks */}
          <g opacity={drawProgress * 0.7}>
            {tempTicks.map((tick) => (
              <g key={tick.y}>
                <line x1="395" y1={tick.y} x2="415" y2={tick.y} stroke="#e9f2f6" strokeWidth="0.8" />
                <line
                  x1="20"
                  y1={tick.y}
                  x2="395"
                  y2={tick.y}
                  stroke="#e9f2f6"
                  strokeWidth="0.4"
                  strokeDasharray="2 4"
                />
              </g>
            ))}
          </g>

          {/* Temperature Drop Polyline Graph */}
          <g opacity={drawProgress}>
            <polyline
              points={`20,85 100,85 180,160 ${180 + 18 * scaleAlpha},${160 + (100 - efficiency) * 3.125} 390,${
                160 + (100 - efficiency) * 3.125
              }`}
              fill="none"
              stroke="#d0523f"
              strokeWidth="2.5"
            />
            {/* Value nodes on graph */}
            <circle cx="100" cy="85" r="3.5" fill="#d0523f" />
            <circle cx="180" cy="160" r="3.5" fill="#e0b44c" />
            <circle
              cx={180 + 18 * scaleAlpha}
              cy={160 + (100 - efficiency) * 3.125}
              r="3.5"
              fill="#5b7f9c"
            />
          </g>

          {/* Comparison Panel (Right side) */}
          <g transform="translate(460, 50)" opacity={drawProgress}>
            <rect x="0" y="0" width="290" height="250" fill="#121a21" stroke="#2c3a47" strokeWidth="1" rx="6" />
            <text x="145" y="28" fill="#e9f2f6" fontSize="11" textAnchor="middle" letterSpacing="1">
              HEAT TRANSFER EFFICIENCY
            </text>

            {/* Clean Bar */}
            <g transform="translate(40, 50)">
              <rect x="0" y="0" width="45" height="140" fill="#2a3844" rx="3" />
              <rect x="0" y="0" width="45" height="140" fill="#e0b44c" opacity="0.85" rx="3" />
              <text x="22.5" y="160" fill="#e9f2f6" fontSize="9" textAnchor="middle">
                CLEAN
              </text>
              <text x="22.5" y="-8" fill="#e0b44c" fontSize="12" fontWeight="bold" textAnchor="middle">
                100%
              </text>
            </g>

            {/* Scale Bar */}
            <g transform="translate(125, 50)">
              <rect x="0" y="0" width="45" height="140" fill="#2a3844" rx="3" />
              <rect
                x="0"
                y={140 * (1 - efficiency / 100)}
                width="45"
                height={140 * (efficiency / 100)}
                fill="#d0523f"
                opacity="0.9"
                rx="3"
              />
              <text x="22.5" y="160" fill="#e9f2f6" fontSize="9" textAnchor="middle">
                +1/16" SCALE
              </text>
              <text x="22.5" y="-8" fill="#d0523f" fontSize="12" fontWeight="bold" textAnchor="middle">
                {efficiency.toFixed(0)}%
              </text>
            </g>

            {/* Energy Loss Callout Badge */}
            <g transform="translate(200, 95)" opacity={scaleAlpha}>
              <rect x="0" y="0" width="75" height="42" fill="#3d1916" stroke="#d0523f" strokeWidth="1" rx="4" />
              <text x="37.5" y="18" fill="#d0523f" fontSize="12" fontWeight="bold" textAnchor="middle">
                -24%
              </text>
              <text x="37.5" y="32" fill="#e9f2f6" fontSize="8" textAnchor="middle">
                LOSS
              </text>
            </g>

            {/* Horizontal Guide line across bars */}
            <line
              x1="30"
              y1={50 + 140 * (1 - efficiency / 100)}
              x2="180"
              y2={50 + 140 * (1 - efficiency / 100)}
              stroke="#d0523f"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity={scaleAlpha}
            />
          </g>
        </svg>

        {/* Dynamic Title / On-Screen Caption */}
        {p.title ? (
          <div
            style={{
              transform: `translateY(${textRise}px)`,
              opacity: drawProgress,
              color: '#e9f2f6',
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textAlign: 'center',
              textTransform: 'uppercase',
              borderTop: '1px solid rgba(233, 242, 246, 0.2)',
              paddingTop: 10,
              width: '100%',
            }}
          >
            {p.title}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};