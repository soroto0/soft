import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const WeldShearStressConcentrationScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const drawIn = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shockLoad = interpolate(frame, [span * 0.3, span * 0.52], [1.0, 2.0], {
    easing: Easing.bezier(0.15, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stressExpansion = interpolate(frame, [span * 0.32, span * 0.85], [0.35, 1.0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelRise = interpolate(frame, [span * 0.25, span * 0.65], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const forceLength = 34 * shockLoad;
  const forceColor = shockLoad > 1.4 ? '#d0523f' : '#e0b44c';
  const peakStressMPa = Math.round(180 * shockLoad);

  const stressBands = [
    { offset: 0.1, color: '#d0523f', op: 0.85 * stressExpansion },
    { offset: 0.28, color: '#ff6f3c', op: 0.7 * stressExpansion },
    { offset: 0.52, color: '#e0b44c', op: 0.55 * stressExpansion },
    { offset: 0.78, color: '#5b7f9c', op: 0.35 * stressExpansion },
    { offset: 1.0, color: '#2b3a42', op: 0.15 * stressExpansion },
  ];

  const weldPoints = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const axisTicks = [0, 100, 200, 300, 400];
  const arrowPositions = [360, 400, 440];

  const stressCurvePoints = weldPoints
    .map((idx) => {
      const x = 160 + idx * 48;
      const distFromCenter = Math.abs(x - 400) / 240;
      const intensity = Math.exp(-Math.pow(distFromCenter * (2.4 - 0.9 * stressExpansion), 2));
      const y = 300 - intensity * 110 * (shockLoad / 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="74%" viewBox="0 0 800 460">
        <defs>
          <linearGradient id="stressField" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5b7f9c" stopOpacity="0.2" />
            <stop offset="30%" stopColor="#e0b44c" stopOpacity={0.6 * stressExpansion} />
            <stop offset="50%" stopColor="#d0523f" stopOpacity={0.9 * stressExpansion} />
            <stop offset="70%" stopColor="#e0b44c" stopOpacity={0.6 * stressExpansion} />
            <stop offset="100%" stopColor="#5b7f9c" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="beamGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#43525b" />
            <stop offset="100%" stopColor="#253138" />
          </linearGradient>
          <marker id="forceHead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill={forceColor} />
          </marker>
        </defs>

        {/* Box Beam Profile (Upper section & Flanges) */}
        <g opacity={drawIn}>
          {/* Top Flange */}
          <rect x={140} y={150} width={520} height={24} fill="url(#beamGradient)" stroke="#8da0ab" strokeWidth={1} />
          {/* Box Webs */}
          <rect x={200} y={174} width={18} height={100} fill="#2f3d45" stroke="#8da0ab" strokeWidth={0.8} />
          <rect x={582} y={174} width={18} height={100} fill="#2f3d45" stroke="#8da0ab" strokeWidth={0.8} />
          {/* Bottom Flange */}
          <rect x={140} y={274} width={520} height={20} fill="url(#beamGradient)" stroke="#8da0ab" strokeWidth={1} />
          {/* Beam Interior Cavity Hatching */}
          <line x1={218} y1={180} x2={582} y2={180} stroke="#4f636e" strokeWidth={0.6} strokeDasharray="3 3" />
          <line x1={218} y1={268} x2={582} y2={268} stroke="#4f636e" strokeWidth={0.6} strokeDasharray="3 3" />
        </g>

        {/* Washer / Load Introduction Plate */}
        <g opacity={drawIn}>
          <rect x={330} y={134} width={140} height={16} fill="#546570" stroke="#e9f2f6" strokeWidth={1.2} rx={2} />
          <line x1={330} y1={142} x2={470} y2={142} stroke="#7d919e" strokeWidth={0.6} />
          <text x={400} y={126} fill="#e9f2f6" fontSize={11} fontFamily="'Segoe UI', Arial, sans-serif" textAnchor="middle" letterSpacing="0.8">
            LASTEINLEITUNG (UNTERLEGSCHEIBE)
          </text>
        </g>

        {/* Longitudinal Weld Seam Zone with dynamic stress glow */}
        <g>
          {/* Expanded Stress Field along longitudinal weld */}
          <rect
            x={400 - 240 * stressExpansion}
            y={146}
            width={480 * stressExpansion}
            height={12}
            fill="url(#stressField)"
            opacity={drawIn}
          />
          {/* Weld Bead Elements */}
          {weldPoints.map((idx) => {
            const bx = 160 + idx * 48;
            return (
              <path
                key={idx}
                d={`M ${bx} 148 Q ${bx + 24} 142 ${bx + 48} 148`}
                fill="none"
                stroke={forceColor}
                strokeWidth={1.8}
                opacity={drawIn * 0.9}
              />
            );
          })}
        </g>

        {/* Downward Force Vectors (1P -> 2P surge) */}
        <g opacity={drawIn}>
          {arrowPositions.map((ax, i) => (
            <g key={i}>
              <line
                x1={ax}
                y1={130 - forceLength}
                x2={ax}
                y2={130}
                stroke={forceColor}
                strokeWidth={i === 1 ? 3 : 2}
                markerEnd="url(#forceHead)"
              />
            </g>
          ))}
          {/* Force Magnitude Indicator */}
          <rect x={335} y={54} width={130} height={28} fill="#1d262b" stroke={forceColor} strokeWidth={1.2} rx={3} />
          <text
            x={400}
            y={73}
            fill={forceColor}
            fontSize={13}
            fontWeight="bold"
            fontFamily="'Segoe UI', Arial, sans-serif"
            textAnchor="middle"
          >
            F = {shockLoad.toFixed(1)} P ({shockLoad > 1.05 ? `+${Math.round((shockLoad - 1) * 100)}%` : 'NENNLAST'})
          </text>
        </g>

        {/* Stress Distribution Diagram (Quantity Over Length) */}
        <g opacity={drawIn}>
          {/* Baseline & Ticks */}
          <line x1={150} y1={300} x2={650} y2={300} stroke="#8da0ab" strokeWidth={1} />
          <line x1={150} y1={190} x2={150} y2={300} stroke="#8da0ab" strokeWidth={1} />
          
          {axisTicks.map((val) => {
            const ty = 300 - (val / 400) * 110;
            return (
              <g key={val}>
                <line x1={144} y1={ty} x2={150} y2={ty} stroke="#8da0ab" strokeWidth={0.8} />
                <text x={138} y={ty + 4} fill="#8da0ab" fontSize={9} fontFamily="'Segoe UI', Arial, sans-serif" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}
          <text x={138} y={182} fill="#e0b44c" fontSize={9} fontFamily="'Segoe UI', Arial, sans-serif" textAnchor="end">
            σ [MPa]
          </text>

          {/* Stress Contour Shading Area */}
          <polygon
            points={`160,300 ${stressCurvePoints} 640,300`}
            fill="url(#stressField)"
            opacity={0.45 * stressExpansion}
          />
          {/* Stress Curve Polyline */}
          <polyline
            points={stressCurvePoints}
            fill="none"
            stroke={forceColor}
            strokeWidth={2.4}
          />

          {/* Peak Stress Callout */}
          <circle cx={400} cy={300 - 110 * (shockLoad / 2)} r={4} fill="#d0523f" stroke="#e9f2f6" strokeWidth={1.2} />
          <line
            x1={400}
            y1={300 - 110 * (shockLoad / 2)}
            x2={470}
            y2={300 - 110 * (shockLoad / 2) - 22}
            stroke="#d0523f"
            strokeWidth={1}
            strokeDasharray="3 2"
          />
          <text
            x={476}
            y={300 - 110 * (shockLoad / 2) - 18}
            fill="#d0523f"
            fontSize={12}
            fontWeight="bold"
            fontFamily="'Segoe UI', Arial, sans-serif"
          >
            σ_max = {peakStressMPa} N/mm²
          </text>

          {/* Longitudinal Axis Label */}
          <text x={400} y={322} fill="#8da0ab" fontSize={10} fontFamily="'Segoe UI', Arial, sans-serif" textAnchor="middle" letterSpacing="0.6">
            LÄNGSNAHT-KOORDINATE x [mm]
          </text>
        </g>

        {/* Stress Gradient Legend Bands */}
        <g opacity={drawIn}>
          <rect x={150} y={350} width={500} height={10} fill="#253138" stroke="#43525b" strokeWidth={0.8} />
          {stressBands.map((band, idx) => (
            <rect
              key={idx}
              x={150 + idx * 100}
              y={350}
              width={100}
              height={10}
              fill={band.color}
              opacity={band.op}
            />
          ))}
          <text x={150} y={374} fill="#5b7f9c" fontSize={9} fontFamily="'Segoe UI', Arial, sans-serif">
            GERINGE SPANNUNG
          </text>
          <text x={400} y={374} fill="#e0b44c" fontSize={9} fontFamily="'Segoe UI', Arial, sans-serif" textAnchor="middle">
            SCHERSPANNUNGSZONE
          </text>
          <text x={650} y={374} fill="#d0523f" fontSize={9} fontFamily="'Segoe UI', Arial, sans-serif" textAnchor="end">
            KRITISCHE KERBWIRKUNG
          </text>
        </g>

        {/* Leader Line for Weld Seam */}
        <g opacity={drawIn}>
          <line x1={220} y1={148} x2={160} y2={108} stroke="#8da0ab" strokeWidth={1} />
          <text x={154} y={104} fill="#e9f2f6" fontSize={10} fontFamily="'Segoe UI', Arial, sans-serif" textAnchor="end">
            SCHWEISSNAHT (LÄNGSVERBINDUNG)
          </text>
        </g>
      </svg>

      {p.title ? (
        <div
          style={{
            marginTop: 18,
            transform: `translateY(${labelRise}px)`,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: '#e9f2f6',
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};