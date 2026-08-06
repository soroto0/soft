import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const JointCrossSectionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const drawProgress = interpolate(frame, [0, span * 0.35], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const highlightShortcut = interpolate(frame, [span * 0.3, span * 0.65], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const costPopup = interpolate(frame, [span * 0.5, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(
    frame,
    [span * 0.6, span * 0.8, span * 1.0],
    [0.85, 1, 0.85],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const opacity = p.enter * p.exit;

  const layers = [
    { label: 'PRECAST UPPER WALL', x: 310, y: 50, w: 100, h: 150, fill: '#313e48' },
    { label: 'PRECAST LOWER WALL', x: 310, y: 285, w: 100, h: 210, fill: '#313e48' },
    { label: 'FLOOR SLAB', x: 415, y: 200, w: 380, h: 85, fill: '#3d4d5a' },
  ];

  const callouts = [
    { x1: 435, y1: 320, x2: 230, y2: 340, label: 'NARROW OVERLAP: 45 mm', detail: 'REQ. MIN 150 mm', color: '#d0523f' },
    { x1: 440, y1: 242, x2: 230, y2: 170, label: 'STEEL TIE BAR', detail: 'OMITTED IN FIELD', color: '#e0b44c' },
    { x1: 580, y1: 242, x2: 720, y2: 140, label: 'UNSUPPORTED EDGE', detail: 'CRITICAL SHEAR ZONE', color: '#e9f2f6' },
  ];

  const gridLines = [100, 200, 300, 400];

  const costItems = [
    { label: 'Specified Joint Tie Bar:', cost: '£11.20 / unit', color: '#e9f2f6' },
    { label: 'Shortcut Joint Assembly:', cost: '£2.40 / unit', color: '#e9f2f6' },
    { label: 'NET SAVING:', cost: '< £10.00 / UNIT', color: '#e0b44c' },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      <svg width="86%" viewBox="0 0 960 540" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="hatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#d0523f" strokeWidth="2" strokeOpacity={0.6} />
          </pattern>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#d0523f" />
          </marker>
        </defs>

        {/* Background CAD Grid */}
        {gridLines.map((y) => (
          <line
            key={y}
            x1="80"
            y1={y}
            x2="880"
            y2={y}
            stroke="#e9f2f6"
            strokeWidth="0.5"
            strokeOpacity={0.12}
            strokeDasharray="4 4"
          />
        ))}

        {/* Concrete Layer Blocks */}
        {layers.map((layer) => (
          <g key={layer.label} opacity={drawProgress}>
            <rect
              x={layer.x}
              y={layer.y}
              width={layer.w}
              height={layer.h}
              fill={layer.fill}
              stroke="#e9f2f6"
              strokeWidth="1.2"
              strokeDasharray="400"
              strokeDashoffset={400 * (1 - drawProgress)}
            />
            {/* Crosshatch inner lines */}
            <line x1={layer.x} y1={layer.y} x2={layer.x + layer.w} y2={layer.y + layer.h} stroke="#e9f2f6" strokeWidth="0.5" strokeOpacity={0.2} />
          </g>
        ))}

        {/* Concrete Lower Shelf Extension */}
        <rect
          x={410}
          y={285}
          width={45}
          height={85}
          fill="#313e48"
          stroke="#e9f2f6"
          strokeWidth="1.2"
          opacity={drawProgress}
        />

        {/* Shortcut Highlight: Required vs Actual Overlap */}
        {/* Required overlap ghost */}
        <rect
          x={410}
          y={285}
          width={150}
          height={85}
          fill="none"
          stroke="#e0b44c"
          strokeWidth="1.5"
          strokeDasharray="5 3"
          opacity={highlightShortcut * 0.7}
        />
        <text
          x={560}
          y={310}
          fill="#e0b44c"
          fontSize="11"
          letterSpacing="0.05em"
          opacity={highlightShortcut}
        >
          REQUIRED 150mm BEARING
        </text>

        {/* Actual dangerously small overlap area */}
        <rect
          x={410}
          y={285}
          width={45}
          height={85}
          fill="url(#hatch)"
          stroke="#d0523f"
          strokeWidth="2"
          opacity={highlightShortcut}
        />

        {/* Omitted Steel Tie Bar representation */}
        <g opacity={highlightShortcut}>
          <line
            x1={350}
            y1={242}
            x2={520}
            y2={242}
            stroke="#d0523f"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <circle cx={435} cy={242} r={14} fill="none" stroke="#d0523f" strokeWidth="2" transform={`scale(${pulse})`} transform-origin="435 242" />
          <path d="M 428 235 L 442 249 M 442 235 L 428 249" stroke="#d0523f" strokeWidth="2" />
        </g>

        {/* Shear Force Vector */}
        <g opacity={highlightShortcut}>
          <line
            x1={540}
            y1={130}
            x2={540}
            y2={190}
            stroke="#d0523f"
            strokeWidth="3"
            markerEnd="url(#arrow)"
          />
          <text x={550} y={160} fill="#d0523f" fontSize="12" fontWeight="bold">
            SHEAR LOAD
          </text>
        </g>

        {/* Dimension Lines */}
        <g opacity={drawProgress}>
          {/* 45mm dimension */}
          <line x1={410} y1={380} x2={455} y2={380} stroke="#e9f2f6" strokeWidth="1" />
          <line x1={410} y1={375} x2={410} y2={385} stroke="#e9f2f6" strokeWidth="1" />
          <line x1={455} y1={375} x2={455} y2={385} stroke="#e9f2f6" strokeWidth="1" />
          <text x={432} y={395} fill="#d0523f" fontSize="11" textAnchor="middle" fontWeight="bold">
            45mm
          </text>
        </g>

        {/* Callouts with Leader Lines */}
        {callouts.map((c, i) => {
          const lineProgress = interpolate(highlightShortcut, [i * 0.2, 0.4 + i * 0.2], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <g key={c.label} opacity={lineProgress}>
              <polyline
                points={`${c.x1},${c.y1} ${(c.x1 + c.x2) / 2},${c.y2} ${c.x2},${c.y2}`}
                fill="none"
                stroke={c.color}
                strokeWidth="1.2"
              />
              <circle cx={c.x1} cy={c.y1} r="3" fill={c.color} />
              <text
                x={c.x2 + (c.x2 < c.x1 ? -8 : 8)}
                y={c.y2 - 6}
                fill={c.color}
                fontSize="12"
                fontWeight="bold"
                textAnchor={c.x2 < c.x1 ? 'end' : 'start'}
              >
                {c.label}
              </text>
              <text
                x={c.x2 + (c.x2 < c.x1 ? -8 : 8)}
                y={c.y2 + 10}
                fill="#e9f2f6"
                fontSize="10"
                opacity={0.8}
                textAnchor={c.x2 < c.x1 ? 'end' : 'start'}
              >
                {c.detail}
              </text>
            </g>
          );
        })}

        {/* Financial Shortcut Info Panel */}
        <g transform={`translate(80, 390) scale(${costPopup})`} opacity={costPopup}>
          <rect
            x="0"
            y="0"
            width="300"
            height="110"
            fill="#1d262d"
            fillOpacity="0.9"
            stroke="#e0b44c"
            strokeWidth="1.2"
            rx="4"
          />
          <text x="16" y="24" fill="#e0b44c" fontSize="12" fontWeight="bold" letterSpacing="0.06em">
            JOINT DESIGN COST ANALYSIS
          </text>
          <line x1="16" y1="32" x2="284" y2="32" stroke="#e0b44c" strokeWidth="0.5" strokeOpacity={0.4} />

          {costItems.map((item, idx) => (
            <g key={item.label} transform={`translate(16, ${52 + idx * 20})`}>
              <text x="0" y="0" fill={item.color} fontSize="11" opacity={0.9}>
                {item.label}
              </text>
              <text x="268" y="0" fill={item.color} fontSize="11" fontWeight="bold" textAnchor="end">
                {item.cost}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {/* Caption / Title */}
      {p.title ? (
        <div
          style={{
            marginTop: 12,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#e9f2f6',
            textTransform: 'uppercase',
            textAlign: 'center',
            opacity: drawProgress,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};