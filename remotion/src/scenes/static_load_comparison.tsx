import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const StaticLoadComparisonScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const structureProgress = interpolate(frame, [0, span * 0.25], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const designLoadProgress = interpolate(frame, [span * 0.2, span * 0.45], [0, 1], {
    easing: Easing.out(Easing.back(1.2)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const actualLoadProgress = interpolate(frame, [span * 0.35, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stressProgress = interpolate(frame, [span * 0.5, span * 0.9], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const currentActualLoad = Math.round(interpolate(actualLoadProgress, [0, 1], [25, 524]));
  const actualArrowHeight = interpolate(actualLoadProgress, [0, 1], [20, 170]);
  const flexDeflection = interpolate(actualLoadProgress, [0, 1], [0, 14]);

  const balusters = [140, 195, 250, 305, 360, 415, 470, 525, 580, 635, 690];
  const gridTicksY = [100, 160, 220, 280, 340, 400];
  const loadMarkers = [100, 200, 300, 400, 500];

  const midPointDeflect = 220 + flexDeflection * 1.5;
  const btmDeflect = 350 + flexDeflection * 0.9;

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      <svg width="88%" height="84%" viewBox="0 0 960 540" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="actualArrowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" />
            <stop offset="60%" stopColor="#d0523f" />
            <stop offset="100%" stopColor="#a82b19" />
          </linearGradient>

          <linearGradient id="iceWeightGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9f2f6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8a949b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#d0523f" stopOpacity="0.6" />
          </linearGradient>

          <pattern id="hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#8a949b" strokeWidth="1" opacity="0.4" />
          </pattern>

          <marker id="arrowHeadDesign" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#8a949b" />
          </marker>

          <marker id="arrowHeadActual" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#d0523f" />
          </marker>
        </defs>

        {/* Blueprint background grid lines */}
        {gridTicksY.map((y) => (
          <line
            key={y}
            x1="60"
            y1={y}
            x2="720"
            y2={y}
            stroke="#2c3b4e"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity={0.5 * structureProgress}
          />
        ))}

        {/* Structural deck / support base */}
        <rect x="60" y="380" width="680" height="20" fill="url(#hatch)" stroke="#5d6a73" strokeWidth="1" opacity={structureProgress} />
        <line x1="60" y1="380" x2="740" y2="380" stroke="#e9f2f6" strokeWidth="1.5" opacity={structureProgress} />

        {/* Main Post Left (x = 100) */}
        <g opacity={structureProgress}>
          <rect x="92" y="210" width="16" height="170" fill="#3a4b5c" stroke="#e9f2f6" strokeWidth="1" />
          <rect x="84" y="370" width="32" height="10" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="1" />
          <circle cx="92" cy="375" r="2" fill="#e9f2f6" />
          <circle cx="108" cy="375" r="2" fill="#e9f2f6" />
        </g>

        {/* Main Post Right (x = 700) */}
        <g opacity={structureProgress}>
          <rect x="692" y="210" width="16" height="170" fill="#3a4b5c" stroke="#e9f2f6" strokeWidth="1" />
          <rect x="684" y="370" width="32" height="10" fill="#5d6a73" stroke="#e9f2f6" strokeWidth="1" />
          <circle cx="692" cy="375" r="2" fill="#e9f2f6" />
          <circle cx="708" cy="375" r="2" fill="#e9f2f6" />
        </g>

        {/* Vertical Balusters */}
        {balusters.map((bx) => {
          const ratio = (bx - 100) / 600;
          const curveDeflect = Math.sin(ratio * Math.PI) * flexDeflection;
          return (
            <line
              key={bx}
              x1={bx}
              y1={220 + curveDeflect * 1.2}
              x2={bx}
              y2={350 + curveDeflect * 0.8}
              stroke="#8a949b"
              strokeWidth="2"
              opacity={structureProgress}
            />
          );
        })}

        {/* Ice / Accumulated Load Overlay Layer */}
        {actualLoadProgress > 0.05 && (
          <path
            d={`M 100 220 Q 400 ${midPointDeflect} 700 220 L 700 ${220 - 18 * actualLoadProgress} Q 400 ${
              220 - 32 * actualLoadProgress + flexDeflection * 1.5
            } 100 ${220 - 18 * actualLoadProgress} Z`}
            fill="url(#iceWeightGrad)"
            stroke="#e0b44c"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity={0.8 * actualLoadProgress}
          />
        )}

        {/* Top Rail Tube */}
        <path
          d={`M 100 220 Q 400 ${midPointDeflect} 700 220`}
          fill="none"
          stroke={stressProgress > 0.3 ? '#d0523f' : '#e9f2f6'}
          strokeWidth="8"
          strokeLinecap="round"
          opacity={structureProgress}
        />

        {/* Bottom Rail Tube */}
        <path
          d={`M 100 350 Q 400 ${btmDeflect} 700 350`}
          fill="none"
          stroke="#8a949b"
          strokeWidth="5"
          strokeLinecap="round"
          opacity={structureProgress}
        />

        {/* Dimension Line 1.00 m */}
        <g opacity={structureProgress}>
          <line x1="100" y1="415" x2="700" y2="415" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="6 3" />
          <line x1="100" y1="405" x2="100" y2="425" stroke="#e9f2f6" strokeWidth="1" />
          <line x1="700" y1="405" x2="700" y2="425" stroke="#e9f2f6" strokeWidth="1" />
          <rect x="345" y="405" width="110" height="20" fill="#18222d" stroke="#e9f2f6" strokeWidth="0.8" />
          <text x="400" y="419" fill="#e9f2f6" fontSize="11" textAnchor="middle" letterSpacing="1">
            SPAN: 1.00 m
          </text>
        </g>

        {/* VECTOR 1: Design Load (25 kg) */}
        <g opacity={designLoadProgress}>
          {/* Arrow pointing down to x=250 */}
          <line
            x1="250"
            y1="130"
            x2="250"
            y2="208"
            stroke="#8a949b"
            strokeWidth="3"
            markerEnd="url(#arrowHeadDesign)"
          />
          {/* Top cap */}
          <line x1="235" y1="130" x2="265" y2="130" stroke="#8a949b" strokeWidth="2" />

          {/* Label Box */}
          <rect x="170" y="80" width="140" height="38" fill="#18222d" stroke="#8a949b" strokeWidth="1" rx="2" />
          <text x="240" y="96" fill="#8a949b" fontSize="10" textAnchor="middle" fontWeight="bold">
            DESIGN LOAD
          </text>
          <text x="240" y="110" fill="#e9f2f6" fontSize="12" textAnchor="middle" fontWeight="bold">
            25 kg / m
          </text>
        </g>

        {/* VECTOR 2: Actual Load (500+ kg) */}
        {actualLoadProgress > 0.01 && (
          <g opacity={actualLoadProgress}>
            {/* Main actual force vector arrow */}
            <line
              x1="520"
              y1={210 + flexDeflection * 1.3 - actualArrowHeight}
              x2="520"
              y2={210 + flexDeflection * 1.3 - 8}
              stroke="url(#actualArrowGrad)"
              strokeWidth="10"
              markerEnd="url(#arrowHeadActual)"
            />

            {/* Force scale tick marks along actual vector */}
            {loadMarkers.map((m) => {
              const tickY = 210 + flexDeflection * 1.3 - (m / 500) * actualArrowHeight;
              if (m > currentActualLoad) return null;
              return (
                <g key={m}>
                  <line x1="530" y1={tickY} x2="542" y2={tickY} stroke="#e0b44c" strokeWidth="1.5" />
                  <text x="548" y={tickY + 4} fill="#e0b44c" fontSize="9">
                    {m} kg
                  </text>
                </g>
              );
            })}

            {/* Dynamic Load Callout Box */}
            <rect
              x="440"
              y={Math.max(20, 180 + flexDeflection * 1.3 - actualArrowHeight - 50)}
              width="160"
              height="44"
              fill="#18222d"
              stroke="#d0523f"
              strokeWidth="2"
              rx="3"
            />
            <text
              x="520"
              y={Math.max(34, 180 + flexDeflection * 1.3 - actualArrowHeight - 34)}
              fill="#d0523f"
              fontSize="10"
              textAnchor="middle"
              fontWeight="bold"
            >
              ACTUAL DEAD WEIGHT
            </text>
            <text
              x="520"
              y={Math.max(52, 180 + flexDeflection * 1.3 - actualArrowHeight - 16)}
              fill="#e0b44c"
              fontSize="16"
              textAnchor="middle"
              fontWeight="bold"
            >
              {currentActualLoad} kg / m
            </text>
          </g>
        )}

        {/* COMPARISON SIDEBAR PANEL */}
        <g opacity={actualLoadProgress}>
          <rect x="760" y="80" width="145" height="320" fill="#121a24" stroke="#3a4b5c" strokeWidth="1" rx="4" />
          <text x="832" y="102" fill="#e9f2f6" fontSize="10" textAnchor="middle" fontWeight="bold" letterSpacing="1">
            LOAD COMPARISON
          </text>
          <line x1="775" y1="112" x2="890" y2="112" stroke="#3a4b5c" strokeWidth="1" />

          {/* Bar 1: Design (25kg) */}
          <text x="778" y="360" fill="#8a949b" fontSize="9">
            DESIGN
          </text>
          <rect x="780" y="325" width="30" height="20" fill="#8a949b" rx="1" />
          <text x="795" y="320" fill="#8a949b" fontSize="9" textAnchor="middle">
            25kg
          </text>

          {/* Bar 2: Actual (500kg) */}
          <text x="843" y="360" fill="#d0523f" fontSize="9">
            ACTUAL
          </text>
          <rect
            x="845"
            y={345 - (currentActualLoad / 500) * 200}
            width="30"
            height={(currentActualLoad / 500) * 200}
            fill="url(#actualArrowGrad)"
            rx="1"
          />
          <text x="860" y={338 - (currentActualLoad / 500) * 200} fill="#e0b44c" fontSize="10" textAnchor="middle" fontWeight="bold">
            {currentActualLoad}kg
          </text>

          {/* Overload Factor Indicator */}
          {currentActualLoad > 100 && (
            <g opacity={stressProgress}>
              <rect x="772" y="125" width="121" height="38" fill="#d0523f" opacity="0.2" rx="2" />
              <rect x="772" y="125" width="121" height="38" fill="none" stroke="#d0523f" strokeWidth="1" rx="2" />
              <text x="832" y="140" fill="#d0523f" fontSize="9" textAnchor="middle" fontWeight="bold">
                OVERLOAD FACTOR
              </text>
              <text x="832" y="156" fill="#e0b44c" fontSize="14" textAnchor="middle" fontWeight="bold">
                {(currentActualLoad / 25).toFixed(1)}x
              </text>
            </g>
          )}
        </g>
      </svg>

      {/* Caption overlay at bottom edge */}
      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            fontFamily: "'Segoe UI', Roboto, sans-serif",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 2,
            color: '#e9f2f6',
            textTransform: 'uppercase',
            backgroundColor: 'rgba(18, 26, 36, 0.85)',
            padding: '8px 24px',
            borderRadius: 4,
            border: '1px solid #3a4b5c',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {p.title}
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            fontFamily: "'Segoe UI', Roboto, sans-serif",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 2,
            color: '#e9f2f6',
            backgroundColor: 'rgba(18, 26, 36, 0.85)',
            padding: '8px 24px',
            borderRadius: 4,
            border: '1px solid #3a4b5c',
          }}
        >
          RAILING LOAD ANALYSIS
        </div>
      )}
    </AbsoluteFill>
  );
};