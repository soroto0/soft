import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const LipidCapillarityInfiltrationScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 1) * fps));

  const infiltration = interpolate(frame, [span * 0.1, span * 0.9], [0, 260], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pressure = interpolate(frame, [0, span * 0.8], [101.3, 4.8], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const arrowShift = interpolate(frame % 25, [0, 25], [0, 40], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;
  const ducts = [0, 1, 2, 3];
  const pressureTicks = [100, 75, 50, 25, 0];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 450">
        <defs>
          <pattern id="fiberHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#8a949b" strokeWidth="1" />
          </pattern>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e0b44c" />
          </marker>
        </defs>

        {/* 1. External Oil Layer */}
        <rect x="50" y="80" width="120" height="280" fill="#e0b44c" fillOpacity="0.15" stroke="#e0b44c" strokeWidth="1" />
        <text x="110" y="70" fill="#e0b44c" fontSize="12" textAnchor="middle" fontWeight="bold">LÍPIDO (ACEITE)</text>
        <line x1="110" y1="80" x2="110" y2="100" stroke="#e0b44c" strokeWidth="1" />

        {/* 2. Potato Fiber Matrix with Micro-ducts */}
        <g transform="translate(170, 80)">
          {/* Fiber Walls */}
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={`wall-${i}`} x="0" y={i * 60} width="450" height="40" fill="url(#fiberHatch)" stroke="#e9f2f6" strokeWidth="0.5" />
          ))}
          
          {/* Micro-ducts (Gaps) and Infiltration */}
          {ducts.map((i) => (
            <g key={`duct-${i}`}>
              <rect x="0" y={i * 60 + 40} width="450" height="20" fill="#1a1a1a" fillOpacity="0.3" />
              {/* Oil penetrating */}
              <rect x="0" y={i * 60 + 40} width={infiltration} height="20" fill="#e0b44c" fillOpacity="0.6" />
              
              {/* Capillary Arrows */}
              <line 
                x1={infiltration + arrowShift} 
                y1={i * 60 + 50} 
                x2={infiltration + arrowShift + 20} 
                y2={i * 60 + 50} 
                stroke="#e0b44c" 
                strokeWidth="2" 
                markerEnd="url(#arrowhead)"
                opacity={infiltration < 400 ? 1 : 0}
              />
            </g>
          ))}
        </g>

        {/* Labels and Leader Lines */}
        <g>
          <line x1="400" y1="100" x2="450" y2="50" stroke="#8a949b" strokeWidth="1" />
          <text x="455" y="45" fill="#e9f2f6" fontSize="11">MATRIZ DE FIBRA (PARED CELULAR)</text>
          
          <line x1="400" y1="130" x2="450" y2="160" stroke="#8a949b" strokeWidth="1" />
          <text x="455" y="170" fill="#e0b44c" fontSize="11">MICRO-CONDUCTO (CAPILAR)</text>
          
          <line x1="620" y1="220" x2="660" y2="220" stroke="#8a949b" strokeWidth="1" />
          <text x="665" y="225" fill="#8a949b" fontSize="11">NÚCLEO ALMIDÓN</text>
        </g>

        {/* 3. Pressure Gauge (The Driver) */}
        <g transform="translate(680, 80)">
          <text x="0" y="-20" fill="#e9f2f6" fontSize="12" textAnchor="middle">P. VAPOR</text>
          <rect x="-10" y="0" width="20" height="280" fill="none" stroke="#8a949b" strokeWidth="1" />
          {pressureTicks.map((t) => (
            <g key={t} transform={`translate(0, ${280 - (t / 100) * 280})`}>
              <line x1="-15" y1="0" x2="10" y2="0" stroke="#8a949b" strokeWidth="1" />
              <text x="-20" y="4" fill="#8a949b" fontSize="9" textAnchor="end">{t} kPa</text>
            </g>
          ))}
          {/* Pressure Indicator */}
          <rect 
            x="-8" 
            y={280 - (pressure / 101.3) * 280} 
            width="16" 
            height={(pressure / 101.3) * 280} 
            fill={pressure < 20 ? "#d0523f" : "#5b7f9c"} 
          />
          <text 
            x="0" 
            y={280 - (pressure / 101.3) * 280 - 10} 
            fill={pressure < 20 ? "#d0523f" : "#e9f2f6"} 
            fontSize="14" 
            textAnchor="middle" 
            fontWeight="bold"
          >
            {pressure.toFixed(1)}
          </text>
          {pressure < 20 && (
            <text x="0" y="300" fill="#d0523f" fontSize="10" textAnchor="middle" fontWeight="bold">
              SUCCIÓN POR VACÍO
            </text>
          )}
        </g>

        {/* Capillary Force Vector */}
        <g transform="translate(300, 380)">
          <text x="0" y="0" fill="#e0b44c" fontSize="12" fontWeight="bold">FUERZA CAPILAR (F_c)</text>
          <line x1="0" y1="15" x2="150" y2="15" stroke="#e0b44c" strokeWidth="3" markerEnd="url(#arrowhead)" />
          <text x="0" y="35" fill="#8a949b" fontSize="10">Ascenso espontáneo por tensión superficial</text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: 40,
          width: '100%',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          fontSize: 32,
          fontWeight: 'bold',
          color: '#e9f2f6',
          letterSpacing: '2px'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};