import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DynamicLoadingScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const tension = interpolate(frame, [0, span * 0.4], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const load = interpolate(frame, [span * 0.2, span * 0.65], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const shear = interpolate(frame, [span * 0.45, span * 0.9], [0, 1], {
    easing: Easing.out(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labels = interpolate(frame, [span * 0.3, span * 0.8], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stirrups = [195, 215, 235, 255];

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="75%" viewBox="0 0 800 450" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1e293b" stopOpacity={0.8} />
            <stop offset="0.5" stopColor="#0f172a" stopOpacity={0.9} />
            <stop offset="1" stopColor="#1e293b" stopOpacity={0.8} />
          </linearGradient>
        </defs>

        {/* Concrete Column */}
        <rect x={360} y={80} width={80} height={280} fill="url(#beamGrad)" stroke="#475569" strokeWidth={1.5} />

        {/* Concrete Beam */}
        <rect x={180} y={180} width={440} height={80} fill="url(#beamGrad)" stroke="#475569" strokeWidth={1.5} />

        {/* Rebar - Horizontal */}
        <line x1={180} y1={195} x2={620} y2={195} stroke="#94a3b8" strokeWidth={2} opacity={0.6} />
        <line x1={180} y1={245} x2={620} y2={245} stroke="#94a3b8" strokeWidth={2} opacity={0.6} />

        {/* Rebar - Vertical */}
        <line x1={375} y1={80} x2={375} y2={360} stroke="#94a3b8" strokeWidth={2} opacity={0.6} />
        <line x1={425} y1={80} x2={425} y2={360} stroke="#94a3b8" strokeWidth={2} opacity={0.6} />

        {/* Stirrups (Bügel) */}
        {stirrups.map((yVal) => (
          <line key={yVal} x1={375} y1={yVal} x2={425} y2={yVal} stroke="#64748b" strokeWidth={1.5} opacity={0.5} />
        ))}

        {/* Tension Cable (Spannseil) */}
        <line
          x1={180}
          y1={140}
          x2={620}
          y2={300}
          stroke="#e0b44c"
          strokeWidth={3}
          strokeDasharray="6 4"
          opacity={0.3 + 0.7 * tension}
        />

        {/* Anchor plates */}
        <rect x={175} y={130} width={10} height={20} fill="#e0b44c" transform="rotate(20, 180, 140)" opacity={0.5 + 0.5 * tension} />
        <rect x={615} y={290} width={10} height={20} fill="#e0b44c" transform="rotate(20, 620, 300)" opacity={0.5 + 0.5 * tension} />

        {/* Tension Force Arrows (pulling inwards from anchors) */}
        <g transform={`translate(180, 140) rotate(20) scale(${tension})`} opacity={tension}>
          <line x1={0} y1={0} x2={50} y2={0} stroke="#e0b44c" strokeWidth={2} />
          <polygon points="50,0 42,-4 42,4" fill="#e0b44c" />
        </g>

        <g transform={`translate(620, 300) rotate(200) scale(${tension})`} opacity={tension}>
          <line x1={0} y1={0} x2={50} y2={0} stroke="#e0b44c" strokeWidth={2} />
          <polygon points="50,0 42,-4 42,4" fill="#e0b44c" />
        </g>

        {/* Vertical Load Vectors (orangefarbene Last-Vektoren) */}
        <g transform={`translate(330, 180) scale(1, ${load})`} opacity={load}>
          <line x1={0} y1={-70} x2={0} y2={-5} stroke="#e0b44c" strokeWidth={2.5} />
          <polygon points="0,0 -5,-10 5,-10" fill="#e0b44c" />
        </g>

        <g transform={`translate(400, 180) scale(1, ${load})`} opacity={load}>
          <line x1={0} y1={-100} x2={0} y2={-5} stroke="#e0b44c" strokeWidth={3.5} />
          <polygon points="0,0 -6,-12 6,-12" fill="#e0b44c" />
        </g>

        <g transform={`translate(470, 180) scale(1, ${load})`} opacity={load}>
          <line x1={0} y1={-70} x2={0} y2={-5} stroke="#e0b44c" strokeWidth={2.5} />
          <polygon points="0,0 -5,-10 5,-10" fill="#e0b44c" />
        </g>

        {/* Shear Force Arrows (danger red) */}
        <g opacity={shear}>
          {/* Left interface shear couple */}
          <g transform="translate(345, 220)">
            <line x1={0} y1={20} x2={0} y2={-15} stroke="#d0523f" strokeWidth={2} />
            <polygon points="0,-20 -4,-12 4,-12" fill="#d0523f" />
          </g>
          <g transform="translate(355, 220)">
            <line x1={0} y1={-20} x2={0} y2={15} stroke="#d0523f" strokeWidth={2} />
            <polygon points="0,20 -4,12 4,12" fill="#d0523f" />
          </g>

          {/* Right interface shear couple */}
          <g transform="translate(445, 220)">
            <line x1={0} y1={20} x2={0} y2={-15} stroke="#d0523f" strokeWidth={2} />
            <polygon points="0,-20 -4,-12 4,-12" fill="#d0523f" />
          </g>
          <g transform="translate(455, 220)">
            <line x1={0} y1={-20} x2={0} y2={15} stroke="#d0523f" strokeWidth={2} />
            <polygon points="0,20 -4,12 4,12" fill="#d0523f" />
          </g>
        </g>

        {/* Cracks propagating in the node */}
        <path
          d="M 365 195 L 380 215 L 390 230 L 400 245"
          fill="none"
          stroke="#d0523f"
          strokeWidth={2.5}
          strokeDasharray="100"
          strokeDashoffset={100 * (1 - shear)}
          opacity={shear}
        />
        <path
          d="M 435 195 L 420 215 L 410 230 L 400 245"
          fill="none"
          stroke="#d0523f"
          strokeWidth={2.5}
          strokeDasharray="100"
          strokeDashoffset={100 * (1 - shear)}
          opacity={shear}
        />

        {/* Labels & Leader Lines */}
        <g opacity={labels}>
          <line x1={180} y1={105} x2={240} y2={155} stroke="#e9f2f6" strokeWidth={0.8} strokeDasharray="2 2" opacity={0.5} />
          <text x={180} y={95} fill="#e9f2f6" fontSize={11} fontFamily="monospace" textAnchor="middle">
            SPANNSEIL (VORSPANNUNG)
          </text>
        </g>

        <g opacity={labels}>
          <line x1={400} y1={55} x2={400} y2={80} stroke="#e9f2f6" strokeWidth={0.8} strokeDasharray="2 2" opacity={0.5} />
          <text x={400} y={45} fill="#e0b44c" fontSize={11} fontFamily="monospace" textAnchor="middle">
            ERHÖHTE VERTIKALLAST
          </text>
        </g>

        <g opacity={labels}>
          <line x1={580} y1={135} x2={420} y2={210} stroke="#e9f2f6" strokeWidth={0.8} strokeDasharray="2 2" opacity={0.5} />
          <text x={580} y={125} fill="#d0523f" fontSize={11} fontFamily="monospace" textAnchor="middle">
            SCHERRISSE (VERSAGEN)
          </text>
        </g>

        <g opacity={labels}>
          <line x1={220} y1={320} x2={375} y2={255} stroke="#e9f2f6" strokeWidth={0.8} strokeDasharray="2 2" opacity={0.5} />
          <text x={220} y={335} fill="#e9f2f6" fontSize={11} fontFamily="monospace" textAnchor="middle">
            INTERNE BEWEHRUNG (BÜGEL)
          </text>
        </g>
      </svg>

      {p.title ? (
        <div style={{
          position: 'absolute',
          bottom: 40,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: 28,
          fontWeight: 300,
          letterSpacing: '0.05em',
          color: '#e9f2f6',
          textAlign: 'center',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};