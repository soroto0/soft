import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AsymmetricSiteLayoutScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  // 1. Excavation progress (0 to 1)
  const pitProgress = interpolate(frame, [span * 0.1, span * 0.55], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 2. Soil pile rising progress (0 to 1)
  const pileProgress = interpolate(frame, [span * 0.2, span * 0.75], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 3. Soil transfer flow animation (0 to 1)
  const arrowAnim = interpolate(frame, [span * 0.15, span * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 4. Text and labels fade in
  const textFade = interpolate(frame, [span * 0.4, span * 0.8], [0, 1], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Dynamic profile coordinates
  const y_pit = 250 + 75 * pitProgress; // 5m depth = 75px
  const y_pile = 250 - 150 * pileProgress; // 10m height = 150px
  const clipPathPoints = `50,450 50,250 120,250 150,${y_pit} 280,${y_pit} 310,250 490,250 600,${y_pile} 710,250 750,250 750,450`;

  const layerLabels = [
    { yLine: 210, yText: 210, label: 'LFP 1: Oberboden / Humus', color: '#5c6d7c' },
    { yLine: 280, yText: 280, label: 'LFP 2: Mittelsand & Kies', color: '#424f5a' },
    { yLine: 380, yText: 380, label: 'LFP 3: Toniger Schluff', color: '#2c353d' },
  ];

  const forceArrows = [560, 600, 640];
  const titleText = p.title || "Asymmetrische Baustellen-Topographie";

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
        width="80%"
        height="70%"
        viewBox="0 0 800 450"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Hatching Patterns */}
          <pattern
            id="hatch-diagonal"
            width="10"
            height="10"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="10"
              stroke="#e9f2f6"
              strokeWidth="1"
              opacity="0.15"
            />
          </pattern>

          <pattern
            id="dots"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="5" cy="5" r="1" fill="#e9f2f6" opacity="0.25" />
          </pattern>

          <pattern
            id="hatch-horizontal"
            width="10"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="10"
              y2="0"
              stroke="#e9f2f6"
              strokeWidth="1"
              opacity="0.15"
            />
          </pattern>

          {/* Dimension Arrow Markers */}
          <marker
            id="dim-arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 5 5 L 0 8.5 z" fill="#e0b44c" />
          </marker>

          <marker
            id="force-arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 2 L 5 5 L 0 8 z" fill="#d0523f" />
          </marker>

          {/* Dynamic Ground Clip Path */}
          <clipPath id="ground-clip">
            <polygon points={clipPathPoints} />
          </clipPath>
        </defs>

        {/* Outer Archival Frame */}
        <rect
          x={40}
          y={40}
          width={720}
          height={370}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={0.5}
          opacity={0.2}
        />
        <path
          d="M 35,50 L 50,50 L 50,35"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={0.3}
        />
        <path
          d="M 765,50 L 750,50 L 750,35"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={0.3}
        />
        <path
          d="M 35,400 L 50,400 L 50,415"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={0.3}
        />
        <path
          d="M 765,400 L 750,400 L 750,415"
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={1}
          opacity={0.3}
        />

        {/* Original Ground Level Reference Line */}
        <line
          x1={50}
          y1={250}
          x2={750}
          y2={250}
          stroke="#e9f2f6"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.3}
        />
        <text
          x={55}
          y={242}
          fill="#e9f2f6"
          fontSize={8}
          opacity={0.4}
          fontFamily="monospace"
        >
          REF ±0.0m
        </text>

        {/* Soil Profile Layers (Clipped) */}
        <g clipPath="url(#ground-clip)">
          {/* Layer 1: Topsoil / Pile */}
          <rect x={50} y={50} width={700} height={190} fill="#5c6d7c" />
          <rect
            x={50}
            y={50}
            width={700}
            height={190}
            fill="url(#hatch-diagonal)"
          />

          {/* Layer 2: Sand & Gravel */}
          <rect x={50} y={240} width={700} height={80} fill="#424f5a" />
          <rect x={50} y={240} width={700} height={80} fill="url(#dots)" />

          {/* Layer 3: Clay */}
          <rect x={50} y={320} width={700} height={130} fill="#2c353d" />
          <rect
            x={50}
            y={320}
            width={700}
            height={130}
            fill="url(#hatch-horizontal)"
          />
        </g>

        {/* Ground Outline (Dynamic Profile Line) */}
        <polyline
          points={clipPathPoints.split(' ').slice(1, -2).join(' ')}
          fill="none"
          stroke="#e9f2f6"
          strokeWidth={1.5}
        />

        {/* Site Labels */}
        <text
          x={120}
          y={80}
          fill="#e9f2f6"
          fontSize={10}
          opacity={0.5}
          letterSpacing={1}
          fontFamily="sans-serif"
        >
          NORD-FASSADE (TIEFGARAGE)
        </text>
        <text
          x={680}
          y={80}
          fill="#e9f2f6"
          fontSize={10}
          opacity={0.5}
          letterSpacing={1}
          textAnchor="end"
          fontFamily="sans-serif"
        >
          SÜD-SEITE (LAGERUNG)
        </text>

        {/* Excavation Dimension Line (Left) */}
        <g opacity={pitProgress}>
          <line
            x1={215}
            y1={250}
            x2={215}
            y2={y_pit}
            stroke="#e0b44c"
            strokeWidth={1.5}
            markerStart="url(#dim-arrow)"
            markerEnd="url(#dim-arrow)"
          />
          <text
            x={205}
            y={(250 + y_pit) / 2 + 4}
            fill="#e0b44c"
            fontSize={11}
            textAnchor="end"
            fontFamily="monospace"
            fontWeight="bold"
          >
            -{((y_pit - 250) / 15).toFixed(1)}m
          </text>
        </g>

        {/* Pile Dimension Line (Right) */}
        <g opacity={pileProgress}>
          <line
            x1={600}
            y1={250}
            x2={600}
            y2={y_pile}
            stroke="#e0b44c"
            strokeWidth={1.5}
            markerStart="url(#dim-arrow)"
            markerEnd="url(#dim-arrow)"
          />
          <text
            x={615}
            y={(250 + y_pile) / 2 + 4}
            fill="#e0b44c"
            fontSize={11}
            textAnchor="start"
            fontFamily="monospace"
            fontWeight="bold"
          >
            +{((250 - y_pile) / 15).toFixed(1)}m
          </text>
        </g>

        {/* Soil Transfer Arc Arrow */}
        <path
          d="M 215,230 Q 400,80 600,200"
          fill="none"
          stroke="#e0b44c"
          strokeWidth={2}
          strokeDasharray="6 4"
          strokeDashoffset={-arrowAnim * 120}
          opacity={arrowAnim * 0.8}
        />
        <text
          x={400}
          y={120}
          fill="#e0b44c"
          fontSize={9}
          textAnchor="middle"
          opacity={arrowAnim}
          fontFamily="sans-serif"
          letterSpacing={1.5}
        >
          AUSHUB-TRANSFER (MAI 2009)
        </text>

        {/* Layer Labels (Middle Zone) */}
        {layerLabels.map((layer, idx) => (
          <g key={idx} opacity={textFade}>
            <rect
              x={340}
              y={layer.yText - 6}
              width={8}
              height={8}
              fill={layer.color}
              stroke="#e9f2f6"
              strokeWidth={0.5}
            />
            <polyline
              points={`335,${layer.yLine} 315,${layer.yLine}`}
              fill="none"
              stroke="#e9f2f6"
              strokeWidth={0.8}
              opacity={0.5}
            />
            <text
              x={355}
              y={layer.yText + 2}
              fill="#e9f2f6"
              fontSize={9}
              textAnchor="start"
              fontFamily="sans-serif"
              letterSpacing={0.5}
            >
              {layer.label}
            </text>
          </g>
        ))}

        {/* Downward Force Arrows (Südseite Load) */}
        {forceArrows.map((xVal, idx) => {
          const arrowLength = 30 * pileProgress;
          return (
            <g key={idx} opacity={pileProgress}>
              <line
                x1={xVal}
                y1={250}
                x2={xVal}
                y2={250 + arrowLength}
                stroke="#d0523f"
                strokeWidth={2}
                markerEnd="url(#force-arrow)"
              />
            </g>
          );
        })}
        <text
          x={600}
          y={305}
          fill="#d0523f"
          fontSize={9}
          textAnchor="middle"
          opacity={pileProgress}
          fontFamily="sans-serif"
          fontWeight="bold"
          letterSpacing={0.5}
        >
          BODENAUFLAST (SÜD)
        </text>
      </svg>

      {/* Caption */}
      <div
        style={{
          marginTop: 20,
          fontFamily: "Courier New, monospace, sans-serif",
          fontSize: 18,
          color: '#e9f2f6',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          opacity: textFade,
        }}
      >
        {titleText}
      </div>
    </AbsoluteFill>
  );
};