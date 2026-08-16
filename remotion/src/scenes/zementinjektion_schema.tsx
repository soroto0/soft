import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ZementinjektionSchemaScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 5) * fps));

  const flow = interpolate(frame, [span * 0.1, span * 0.6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelAlpha = interpolate(frame, [span * 0.7, span * 0.95], [0, 1], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pulse = interpolate(frame % 25, [0, 12, 25], [1, 1.25, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { y: 0, h: 120, fill: '#5d6a73', name: 'DECKGEBIRGE' },
    { y: 120, h: 160, fill: '#8a949b', name: 'INJEKTIONSHORIZONT' },
    { y: 280, h: 120, fill: '#c9d3d9', name: 'BASISGESTEIN' },
  ];

  const fissures = [
    { d: 'M 200 160 L 260 140 L 310 145', label: 'KLÜFTE' },
    { d: 'M 200 200 L 130 180 L 90 190', label: '' },
    { d: 'M 200 240 L 280 260 L 330 255', label: '' },
    { d: 'M 200 220 L 140 230 L 100 225', label: '' },
  ];

  const arrows = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.8}
        viewBox="0 0 400 400"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <mask id="holeMask">
            <rect x="0" y="0" width="400" height="400" fill="white" />
            <rect x="192" y="0" width="16" height="400" fill="black" />
          </mask>
        </defs>

        {/* Rock Layers */}
        <g mask="url(#holeMask)">
          {layers.map((layer) => (
            <rect
              key={layer.name}
              x="50"
              y={layer.y}
              width="300"
              height={layer.h}
              fill={layer.fill}
              fillOpacity={0.2}
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
          ))}
        </g>

        {/* Drill Hole */}
        <rect x="192" y="0" width="16" height="400" fill="#1a1a1a" opacity={0.4} />
        <line x1="192" y1="0" x2="192" y2="400" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 2" />
        <line x1="208" y1="0" x2="208" y2="400" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 2" />

        {/* Fissures and Cement Flow */}
        {fissures.map((f, i) => (
          <g key={i}>
            <path
              d={f.d}
              fill="none"
              stroke="#e9f2f6"
              strokeWidth="1.5"
              strokeOpacity={0.3}
            />
            <path
              d={f.d}
              fill="none"
              stroke="#e0b44c"
              strokeWidth="3"
              strokeDasharray="200"
              strokeDashoffset={200 - 200 * flow}
            />
          </g>
        ))}

        {/* Injection Pipe */}
        <rect x="196" y="0" width="8" height="210" fill="#e9f2f6" fillOpacity={0.8} />
        <rect x="196" y="210 * flow" width="8" height={210 - 210 * flow} fill="#e0b44c" />

        {/* Pressure Arrows */}
        <g transform="translate(200, 200)">
          {arrows.map((angle) => (
            <g key={angle} transform={`rotate(${angle})`} opacity={pressure}>
              <line
                x1="15"
                y1="0"
                x2={15 + 25 * pulse}
                y2="0"
                stroke="#d0523f"
                strokeWidth="2"
              />
              <polygon
                points={`${15 + 25 * pulse}, -4 ${23 + 25 * pulse}, 0 ${15 + 25 * pulse}, 4`}
                fill="#d0523f"
              />
            </g>
          ))}
        </g>

        {/* Labels */}
        <g opacity={labelAlpha}>
          <text x="215" y="50" fill="#e9f2f6" fontSize="10" fontFamily="monospace">BOHRLOCH Ø 120mm</text>
          <text x="215" y="205" fill="#e0b44c" fontSize="10" fontFamily="monospace">ZEMENT-INJEKTION</text>
          <text x="215" y="220" fill="#d0523f" fontSize="10" fontFamily="monospace">P: 2.5 MPa</text>
          
          <line x1="310" y1="145" x2="340" y2="145" stroke="#e9f2f6" strokeWidth="0.5" />
          <text x="345" y="148" fill="#e9f2f6" fontSize="9" fontFamily="monospace">FELS-KLÜFTE</text>
          
          {layers.map((l) => (
            <text key={l.name} x="55" y={l.y + 15} fill="#e9f2f6" fontSize="8" opacity={0.5} fontFamily="monospace">
              {l.name}
            </text>
          ))}
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            width: '100%',
            textAlign: 'center',
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            fontWeight: 300,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: labelAlpha,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};