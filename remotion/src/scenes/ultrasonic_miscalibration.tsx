import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const UltrasonicMiscalibrationScene: React.FC<SceneProps> = (p) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const totalFrames = p.dur * fps;
  const opacity = p.enter * p.exit;

  // Sound wave traveling animation loop
  const pulseCycle = (frame % Math.floor(fps * 1.2)) / (fps * 1.2);
  const waveY = interpolate(
    pulseCycle,
    [0, 0.5, 1],
    [height * 0.35, height * 0.55, height * 0.35],
    { easing: Easing.inOut(Easing.quad) }
  );

  // Crack intensity animation
  const crackIntensity = interpolate(
    frame,
    [0, totalFrames * 0.3, totalFrames],
    [0.2, 1, 0.85],
    { extrapolateRight: 'clamp' }
  );

  // Animated dashed phantom calibration line
  const phantomDashOffset = interpolate(
    frame,
    [0, totalFrames],
    [0, -100]
  );

  // Gauge reveal animation
  const readoutOpacity = interpolate(
    frame,
    [fps * 0.4, fps * 1.2],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const captionText = p.title || 'Ultrasonic Echo Error';

  // Cross-section vertical markers
  const topSurfaceY = height * 0.35;
  const phantomY = height * 0.55;
  const backWallY = height * 0.65;
  const beamCenterX = width * 0.34;

  return (
    <AbsoluteFill
      style={{
        opacity,
        color: '#e9f2f6',
        fontFamily: 'monospace',
        overflow: 'hidden',
      }}
    >
      {/* Background Grid */}
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', inset: 0, opacity: 0.15 }}
      >
        <defs>
          <pattern
            id="grid-pattern"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#e9f2f6"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid-pattern)" />
      </svg>

      {/* Main Schematic Diagram */}
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Metal Plate Cross Section Area */}
        <rect
          x={width * 0.12}
          y={topSurfaceY}
          width={width * 0.44}
          height={backWallY - topSurfaceY}
          fill="#111823"
          stroke="#e9f2f6"
          strokeWidth="1.5"
        />

        {/* Metal Hatch Pattern inside remaining solid area */}
        <line
          x1={width * 0.12}
          y1={topSurfaceY}
          x2={width * 0.56}
          y2={topSurfaceY}
          stroke="#e9f2f6"
          strokeWidth="3"
        />
        <line
          x1={width * 0.12}
          y1={backWallY}
          x2={width * 0.56}
          y2={backWallY}
          stroke="#e9f2f6"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.6"
        />

        {/* Ultrasonic Transducer Probe */}
        <rect
          x={beamCenterX - width * 0.05}
          y={topSurfaceY - height * 0.08}
          width={width * 0.1}
          height={height * 0.08}
          fill="#1c2533"
          stroke="#e9f2f6"
          strokeWidth="2"
          rx="2"
        />
        <text
          x={beamCenterX}
          y={topSurfaceY - height * 0.035}
          fill="#e9f2f6"
          fontSize={width * 0.009}
          textAnchor="middle"
          fontWeight="bold"
        >
          UT TRANSDUCER
        </text>

        {/* Sound Wave Beam Path (Miscalibrated) */}
        <line
          x1={beamCenterX}
          y1={topSurfaceY}
          x2={beamCenterX}
          y2={phantomY}
          stroke="#e0b44c"
          strokeWidth="1.5"
          strokeDasharray="6 4"
        />

        {/* Wave Front Animation */}
        <circle
          cx={beamCenterX}
          cy={waveY}
          r={width * 0.025}
          fill="none"
          stroke="#e0b44c"
          strokeWidth="2"
          opacity={0.8}
        />
        <circle
          cx={beamCenterX}
          cy={waveY}
          r={width * 0.012}
          fill="none"
          stroke="#e0b44c"
          strokeWidth="1"
          opacity={0.5}
        />

        {/* Phantom Reflection Interface (4mm Calibrated Depth) */}
        <line
          x1={width * 0.15}
          y1={phantomY}
          x2={width * 0.53}
          y2={phantomY}
          stroke="#e0b44c"
          strokeWidth="1.5"
          strokeDasharray="8 6"
          strokeDashoffset={phantomDashOffset}
        />
        <text
          x={width * 0.54}
          y={phantomY + 4}
          fill="#e0b44c"
          fontSize={width * 0.009}
          textAnchor="start"
        >
          PHANTOM ECHO DEPTH (4.00mm)
        </text>

        {/* Actual Chloride Stress Cracks (Ignoring Wave, Deep Loss) */}
        <g opacity={crackIntensity}>
          {/* Main Crack Network originating from back wall eating 70% depth */}
          <path
            d={`M ${beamCenterX - 20} ${backWallY}
               L ${beamCenterX - 15} ${backWallY - height * 0.08}
               L ${beamCenterX - 25} ${backWallY - height * 0.14}
               L ${beamCenterX - 5} ${backWallY - height * 0.22}
               L ${beamCenterX + 10} ${backWallY - height * 0.17}
               L ${beamCenterX + 5} ${backWallY - height * 0.09}
               Z`}
            fill="#d0523f"
            fillOpacity="0.25"
            stroke="#d0523f"
            strokeWidth="2"
          />
          {/* Branching Crack Micro-lines */}
          <path
            d={`M ${beamCenterX - 15} ${backWallY - height * 0.08} L ${beamCenterX - 35} ${backWallY - height * 0.11}
               M ${beamCenterX - 5} ${backWallY - height * 0.22} L ${beamCenterX - 12} ${topSurfaceY + height * 0.04}
               M ${beamCenterX + 10} ${backWallY - height * 0.17} L ${beamCenterX + 28} ${backWallY - height * 0.21}`}
            stroke="#d0523f"
            strokeWidth="1.5"
            fill="none"
          />
          <text
            x={beamCenterX - width * 0.02}
            y={backWallY - height * 0.12}
            fill="#d0523f"
            fontSize={width * 0.01}
            fontWeight="bold"
          >
            CHLORIDE CRACKING (70% WALL LOSS)
          </text>
        </g>

        {/* Thickness Dimension Lines */}
        {/* Nominal 4mm marker */}
        <line
          x1={width * 0.10}
          y1={topSurfaceY}
          x2={width * 0.10}
          y2={phantomY}
          stroke="#e0b44c"
          strokeWidth="1"
        />
        <text
          x={width * 0.09}
          y={(topSurfaceY + phantomY) / 2}
          fill="#e0b44c"
          fontSize={width * 0.009}
          textAnchor="end"
          transform={`rotate(-90 ${width * 0.09} ${(topSurfaceY + phantomY) / 2})`}
        >
          CALIBRATED: 4.0mm
        </text>

        {/* Actual Total Wall thickness marker */}
        <line
          x1={width * 0.58}
          y1={topSurfaceY}
          x2={width * 0.58}
          y2={backWallY}
          stroke="#e9f2f6"
          strokeWidth="1"
          opacity="0.5"
        />
        <text
          x={width * 0.59}
          y={(topSurfaceY + backWallY) / 2}
          fill="#e9f2f6"
          fontSize={width * 0.009}
          opacity="0.7"
          transform={`rotate(90 ${width * 0.59} ${(topSurfaceY + backWallY) / 2})`}
        >
          NOMINAL WALL
        </text>
      </svg>

      {/* Right Side Digital Instrument Readout Panel */}
      <div
        style={{
          position: 'absolute',
          top: height * 0.25,
          left: width * 0.63,
          width: width * 0.25,
          backgroundColor: '#0d131d',
          border: '1px solid #1e293b',
          borderRadius: 6,
          padding: width * 0.015,
          opacity: readoutOpacity,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            fontSize: width * 0.008,
            color: '#8a99ad',
            letterSpacing: 1.5,
            marginBottom: height * 0.01,
            borderBottom: '1px solid #1e293b',
            paddingBottom: 4,
          }}
        >
          INSTRUMENT READOUT
        </div>

        <div style={{ marginBottom: height * 0.02 }}>
          <div style={{ fontSize: width * 0.008, color: '#e0b44c' }}>
            MEASURED SOUND BACKING
          </div>
          <div
            style={{
              fontSize: width * 0.028,
              color: '#e0b44c',
              fontWeight: 'bold',
              fontFamily: 'monospace',
            }}
          >
            4.00 <span style={{ fontSize: width * 0.012 }}>mm</span>
          </div>
        </div>

        <div style={{ marginBottom: height * 0.015 }}>
          <div style={{ fontSize: width * 0.008, color: '#d0523f' }}>
            ACTUAL REMAINING WALL
          </div>
          <div
            style={{
              fontSize: width * 0.02,
              color: '#d0523f',
              fontWeight: 'bold',
              fontFamily: 'monospace',
            }}
          >
            1.20 <span style={{ fontSize: width * 0.01 }}>mm</span>
          </div>
        </div>

        <div
          style={{
            fontSize: width * 0.0075,
            color: '#d0523f',
            backgroundColor: 'rgba(208, 82, 63, 0.15)',
            border: '1px solid #d0523f',
            padding: '6px 8px',
            borderRadius: 4,
            lineHeight: 1.3,
          }}
        >
          WARNING: FALSE ECHO RETURN
          <br />
          LOCALIZED ATTENUATION FAILURE
        </div>
      </div>

      {/* Caption Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: height * 0.08,
          left: width * 0.1,
          right: width * 0.1,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: width * 0.018,
            fontWeight: 600,
            letterSpacing: 2,
            color: '#e9f2f6',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          {captionText}
        </div>
        <div
          style={{
            fontSize: width * 0.009,
            color: '#8a99ad',
            letterSpacing: 1,
          }}
        >
          INCORRECT MATERIAL CALIBRATION / PASS-THROUGH ECHO
        </div>
      </div>
    </AbsoluteFill>
  );
};