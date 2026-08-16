import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SensorBypassDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const drawProgress = interpolate(frame, [0, span * 0.3], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const sensorOpacity = interpolate(frame, [span * 0.25, span * 0.45], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flowProgress = interpolate(frame, [span * 0.4, span * 0.9], [0, 1], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const captionSlide = interpolate(frame, [0, span * 0.2], [20, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const layers = [
    { id: 'foundation', d: 'M 0,520 L 1000,520 L 1000,600 L 0,600 Z', fill: '#3d4a53', label: 'FELS-FUNDAMENT' },
    { id: 'shell', d: 'M 200,520 L 400,180 L 650,180 L 850,520 Z', fill: '#5d6a73', label: 'STÜTZKÖRPER' },
    { id: 'core', d: 'M 460,520 L 500,180 L 550,180 L 590,520 Z', fill: '#8a949b', label: 'KERNZONE (TON)' },
  ];

  const sensors = [
    { x: 500, y: 280, label: 'P1' },
    { x: 540, y: 400, label: 'P2' },
  ];

  const flowPath = "M 50,480 Q 300,580 525,580 T 950,480";
  const flowArrows = [0.2, 0.4, 0.6, 0.8];
  const depthTicks = [100, 200, 300, 400, 500];

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        width={width * 0.8}
        height={height * 0.7}
        viewBox="0 0 1000 650"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b7f9c" stopOpacity="0.6" />
            <stop offset="1" stopColor="#5b7f9c" stopOpacity="0.1" />
          </linearGradient>
          <mask id="drawMask">
            <rect x="0" y="0" width={1000 * drawProgress} height="650" fill="white" />
          </mask>
        </defs>

        {/* Geological Layers */}
        <g mask="url(#drawMask)">
          {layers.map((layer) => (
            <g key={layer.id}>
              <path d={layer.d} fill={layer.fill} stroke="#e9f2f6" strokeWidth="1" />
              <text
                x={layer.id === 'shell' ? 300 : layer.id === 'core' ? 525 : 50}
                y={layer.id === 'foundation' ? 550 : 220}
                fill="#e9f2f6"
                fontSize="12"
                fontWeight="300"
                opacity={0.7}
              >
                {layer.label}
              </text>
            </g>
          ))}
        </g>

        {/* Water Reservoir */}
        <path
          d={`M 0,520 L 0,250 L 360,250 L 200,520 Z`}
          fill="url(#waterGrad)"
          opacity={drawProgress}
        />
        <text x="50" y="240" fill="#e9f2f6" fontSize="14" opacity={drawProgress}>RESERVOIR</text>

        {/* Depth Axis */}
        <line x1="960" y1="180" x2="960" y2="520" stroke="#e9f2f6" strokeWidth="1" opacity={0.5} />
        {depthTicks.map((tick) => (
          <g key={tick} opacity={0.5}>
            <line x1="960" y1={tick + 80} x2="970" y2={tick + 80} stroke="#e9f2f6" strokeWidth="1" />
            <text x="975" y={tick + 84} fill="#e9f2f6" fontSize="10">{tick}m</text>
          </g>
        ))}

        {/* Piezometers */}
        {sensors.map((s, i) => (
          <g key={i} opacity={sensorOpacity}>
            <line x1={s.x} y1={180} x2={s.x} y2={s.y} stroke="#e9f2f6" strokeWidth="1.5" strokeDasharray="4 2" />
            <circle cx={s.x} cy={s.y} r="6" fill="#e9f2f6" />
            <text x={s.x + 10} y={s.y + 5} fill="#e9f2f6" fontSize="12">{s.label}</text>
            <text x={s.x - 40} y={s.y - 10} fill="#e9f2f6" fontSize="10" opacity={0.6}>NORMALDRUCK</text>
          </g>
        ))}

        {/* Bypass Flow Path */}
        <path
          d={flowPath}
          fill="none"
          stroke="#e0b44c"
          strokeWidth="6"
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - flowProgress)}
          strokeLinecap="round"
          opacity={0.9}
        />
        
        {/* Flow Arrows */}
        {flowArrows.map((t, i) => {
          const arrowOpacity = interpolate(flowProgress, [t - 0.1, t], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <g key={i} opacity={arrowOpacity} transform={`translate(${100 + t * 800}, ${530 + Math.sin(t * Math.PI) * 50})`}>
              <path d="M -10,-6 L 5,0 L -10,6 Z" fill="#e0b44c" transform="rotate(10)" />
            </g>
          );
        })}

        <text 
          x="500" 
          y="620" 
          fill="#e0b44c" 
          fontSize="16" 
          textAnchor="middle" 
          fontWeight="bold" 
          opacity={flowProgress}
        >
          UNTERSTRÖMUNG DURCH KLÜFTIGEN FELS (BYPASS)
        </text>
      </svg>

      {p.title && (
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            color: '#e9f2f6',
            fontSize: 42,
            fontFamily: 'sans-serif',
            letterSpacing: '0.1em',
            transform: `translateY(${captionSlide}px)`,
            opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: 'clamp' }),
            borderLeft: '4px solid #e0b44c',
            paddingLeft: '20px',
            textTransform: 'uppercase'
          }}
        >
          {p.title}
        </div>
      )}
    </AbsoluteFill>
  );
};