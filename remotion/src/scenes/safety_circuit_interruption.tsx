import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SafetyCircuitInterruptionScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  // Timings
  const snapFrame = Math.min(4.033 * fps, span * 0.65);
  const gridFade = interpolate(frame, [0, span * 0.1], [0, 0.35], EO);
  const push = interpolate(frame, [0, span], [1, 1.04], EO);
  const explosionPop = spring({ frame: frame - span * 0.1, fps, config: { damping: 12 } });
  const pumpPop = spring({ frame: frame - span * 0.2, fps, config: { damping: 12 } });
  const lineDraw = interpolate(frame, [span * 0.25, span * 0.45], [0, 1], EO);
  
  const isSnapped = frame >= snapFrame;
  const snapRecoil = spring({ 
    frame: frame - snapFrame, 
    fps, 
    config: { stiffness: 200, damping: 10, mass: 0.5 } 
  });

  const sparkOpacity = interpolate(frame, [snapFrame, snapFrame + 5, snapFrame + 15], [0, 1, 0], EO);
  const calloutScale = interpolate(frame, [snapFrame + 10, snapFrame + 25], [0, 1], EO);
  const textRise = interpolate(frame, [span * 0.8, span], [20, 0], EO);

  const lineLength = 400;
  const breakX = 400;

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={width * 0.8} height={height * 0.8} viewBox="0 0 800 450">
        <g transform={`translate(400 225) scale(${push}) translate(-400 -225)`}>
          {/* Grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((k) => (
            <line key={k} x1={100} y1={450 * k} x2={700} y2={450 * k} stroke="#8a949b" strokeWidth={1} opacity={gridFade} />
          ))}

          {/* Connection Line (Logic Flow) */}
          {!isSnapped ? (
            <line 
              x1={200} y1={225} x2={200 + lineLength * lineDraw} y2={225} 
              stroke="#8a949b" strokeWidth={4} strokeDasharray="8 4"
            />
          ) : (
            <g>
              <line 
                x1={200} y1={225} x2={breakX - 10 - snapRecoil * 15} y2={225 - snapRecoil * 5} 
                stroke="#d0523f" strokeWidth={4} strokeDasharray="8 4"
              />
              <line 
                x1={breakX + 10 + snapRecoil * 15} y1={225 + snapRecoil * 5} x2={600} y2={225} 
                stroke="#d0523f" strokeWidth={4} strokeDasharray="8 4"
              />
              {/* Sparks */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <line
                  key={angle}
                  x1={breakX} y1={225}
                  x2={breakX + Math.cos(angle) * 30} y2={225 + Math.sin(angle) * 30}
                  stroke="#e0b44c" strokeWidth={2} opacity={sparkOpacity}
                />
              ))}
            </g>
          )}

          {/* Explosion Icon */}
          <g transform={`translate(200 225) scale(${explosionPop})`}>
            <path d="M -30 0 L -10 -10 L 0 -30 L 10 -10 L 30 0 L 10 10 L 0 30 L -10 10 Z" fill="#e0b44c" />
            <circle r={15} fill="#0d1117" />
            <path d="M -8 -8 L 8 8 M 8 -8 L -8 8" stroke="#e0b44c" strokeWidth={3} />
            <text y={50} fill="#e0b44c" fontSize={14} textAnchor="middle" fontWeight="bold">EXPLOSION</text>
          </g>

          {/* Water Pump Icon (Isometric Schematic) */}
          <g transform={`translate(600 225) scale(${pumpPop})`}>
            <ellipse cx={0} cy={30} rx={40} ry={20} fill="none" stroke="#e9f2f6" strokeWidth={2} />
            <ellipse cx={0} cy={-10} rx={40} ry={20} fill="#16202b" stroke="#e9f2f6" strokeWidth={2} />
            <line x1={-40} y1={-10} x2={-40} y2={30} stroke="#e9f2f6" strokeWidth={2} />
            <line x1={40} y1={-10} x2={40} y2={30} stroke="#e9f2f6" strokeWidth={2} />
            <path d="M -15 -10 L 0 -25 L 15 -10" fill="none" stroke="#e9f2f6" strokeWidth={2} />
            <text y={65} fill="#e9f2f6" fontSize={14} textAnchor="middle">HAUPTPUMPE</text>
          </g>

          {/* Severed Cable Callout */}
          <g transform={`translate(${breakX} 120) scale(${calloutScale})`} opacity={calloutScale}>
            <rect x={-60} y={-40} width={120} height={80} rx={8} fill="#16202b" stroke="#8a949b" strokeWidth={1} />
            <text y={-25} fill="#8a949b" fontSize={10} textAnchor="middle">NYY-J 4x240mm²</text>
            {/* Severed Wires */}
            <g transform="translate(-20 0)">
              <rect x={0} y={-10} width={40} height={20} rx={2} fill="#333" />
              <rect x={35} y={-8} width={15} height={4} fill="#e0b44c" />
              <rect x={35} y={-2} width={15} height={4} fill="#d0523f" />
              <rect x={35} y={4} width={15} height={4} fill="#8a949b" />
            </g>
            <path d="M 0 40 L 0 105" stroke="#8a949b" strokeWidth={1} strokeDasharray="4 2" />
            <circle cx={0} cy={105} r={4} fill="#d0523f" />
          </g>

          {/* Dimension Line */}
          <g opacity={lineDraw * 0.6}>
            <line x1={200} y1={280} x2={600} y2={280} stroke="#8a949b" strokeWidth={1} />
            <line x1={200} y1={275} x2={200} y2={285} stroke="#8a949b" strokeWidth={1} />
            <line x1={600} y1={275} x2={600} y2={285} stroke="#8a949b" strokeWidth={1} />
            <rect x={375} y={270} width={50} height={20} fill="#0d1117" />
            <text x={400} y={285} fill="#8a949b" fontSize={12} textAnchor="middle">240 m</text>
          </g>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: 60,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `translateY(${textRise}px)`
        }}>
          <div style={{
            backgroundColor: '#d0523f',
            padding: '8px 24px',
            borderRadius: 4,
            color: '#e9f2f6',
            fontSize: 32,
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            {p.title}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};