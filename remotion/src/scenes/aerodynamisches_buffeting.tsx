import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const AerodynamischesBuffetingScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const opacity = p.enter * p.exit;

  const intro = interpolate(frame, [0, span * 0.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const vortexIntensity = interpolate(frame, [span * 0.1, span * 0.5], [0.3, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const signalGrowth = interpolate(frame, [span * 0.25, span * 0.85], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleRise = interpolate(frame, [span * 0.15, span * 0.5], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Flow animation variables
  const flowPhase = (frame / fps) * 2.8;
  const cycle = (frame / fps) * 2 * Math.PI * 1.4;
  const buffetOscillation = Math.sin(cycle);

  // Vortices along Kármán vortex street
  const vortexCount = 7;
  const vortices = Array.from({ length: vortexCount }).map((_, i) => {
    const rawX = 210 + (((i * 55 + flowPhase * 80) % 360));
    const side = i % 2 === 0 ? -1 : 1;
    const yBase = 220 + side * 34;
    const yWobble = Math.sin(flowPhase * 3 + i) * 6;
    const distanceToTarget = Math.max(0, 580 - rawX);
    const scale = interpolate(rawX, [210, 380, 570], [0.6, 1.2, 0.9], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return {
      id: i,
      x: rawX,
      y: yBase + yWobble,
      side,
      scale,
      distanceToTarget,
    };
  });

  // Streamlines
  const streamY = [140, 170, 200, 240, 270, 300];

  // Graph data points for periodic buffeting load F(t)
  const graphPoints = Array.from({ length: 28 }).map((_, i) => {
    const gx = 450 + i * 11;
    const gPhase = i * 0.45 - flowPhase * 2.2;
    const gy = 410 - Math.sin(gPhase) * 28 * vortexIntensity * signalGrowth;
    return `${gx},${gy}`;
  }).join(' ');

  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="78%" viewBox="0 0 840 500" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="vortexGradPos" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d0523f" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="vortexGradNeg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5b7f9c" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#e9f2f6" stopOpacity="0.1" />
          </linearGradient>
          <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#e9f2f6" opacity="0.8" />
          </marker>
          <marker id="arrowAmber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#e0b44c" />
          </marker>
          <marker id="arrowRed" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#d0523f" />
          </marker>
        </defs>

        {/* Technical Coordinate Grid & Baseline */}
        <g opacity={0.25 * intro} stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="3 3">
          <line x1="60" y1="220" x2="780" y2="220" />
          <line x1="170" y1="70" x2="170" y2="370" />
          <line x1="600" y1="70" x2="600" y2="370" />
        </g>

        {/* Inflow Streamlines (Wind) */}
        {streamY.map((y, idx) => {
          const dashOffset = (frame * 2.2 + idx * 14) % 40;
          return (
            <g key={`stream-${idx}`} opacity={0.45 * intro}>
              <line
                x1="60"
                y1={y}
                x2="135"
                y2={y + (y < 220 ? -12 : 12)}
                stroke="#e9f2f6"
                strokeWidth={1.2}
                strokeDasharray="8 6"
                strokeDashoffset={-dashOffset}
                markerEnd="url(#arrow)"
              />
            </g>
          );
        })}

        {/* Flow Speed Label */}
        <g opacity={0.7 * intro}>
          <text x="70" y="110" fill="#e9f2f6" fontSize={10} letterSpacing="1.5">ANSTRÖMUNG v∞</text>
          <line x1="70" y1="118" x2="130" y2="118" stroke="#e9f2f6" strokeWidth={1} markerEnd="url(#arrow)" />
        </g>

        {/* Upstream Tower: Reihe 1 (Vortex Generator) */}
        <g opacity={intro} transform="translate(170, 220)">
          <circle r="42" fill="#141c22" stroke="#e9f2f6" strokeWidth={1.8} />
          <circle r="36" fill="none" stroke="#e9f2f6" strokeWidth={0.6} strokeDasharray="2 2" />
          {/* Separation points */}
          <circle cx="6" cy="-42" r="3.5" fill="#e0b44c" />
          <circle cx="6" cy="42" r="3.5" fill="#5b7f9c" />
          <text x="0" y="4" fill="#e9f2f6" fontSize={11} fontWeight="bold" textAnchor="middle" letterSpacing="0.8">T-01</text>
          <text x="0" y="-56" fill="#e9f2f6" fontSize={9.5} textAnchor="middle" letterSpacing="1">REIHE 1 (LUV)</text>
          <text x="0" y="-68" fill="#8a9ba8" fontSize={8} textAnchor="middle">WIRBELABLÖSUNG</text>
        </g>

        {/* Downstream Tower: Reihe 2 (Buffeting Target) */}
        <g opacity={intro} transform="translate(600, 220)">
          {/* Shell deformation envelope caused by alternating buffet loads */}
          <path
            d={`M -42 0 C -42 ${-28 + buffetOscillation * 9}, ${-28 + buffetOscillation * 7} -42, 0 -42 C 28 -42, 42 -28, 42 0 C 42 28, ${28 - buffetOscillation * 7} 42, 0 42 C ${-28 - buffetOscillation * 9} 42, -42 ${28 - buffetOscillation * 9}, -42 0 Z`}
            fill="rgba(208, 82, 63, 0.08)"
            stroke="#d0523f"
            strokeWidth={1.2}
            strokeDasharray="4 3"
          />
          {/* Actual Shell Structure */}
          <circle r="42" fill="#141c22" stroke="#e9f2f6" strokeWidth={1.8} />
          <circle r="36" fill="none" stroke="#e9f2f6" strokeWidth={0.6} strokeDasharray="2 2" />
          <text x="0" y="4" fill="#e9f2f6" fontSize={11} fontWeight="bold" textAnchor="middle" letterSpacing="0.8">T-02</text>
          <text x="0" y="-56" fill="#d0523f" fontSize={9.5} textAnchor="middle" fontWeight="bold" letterSpacing="1">REIHE 2 (LEE)</text>
          <text x="0" y="-68" fill="#e0b44c" fontSize={8} textAnchor="middle">BUFFETING-ZONE</text>

          {/* Dynamic Impact Force Vectors on Tower 2 Shell */}
          {[-30, 0, 30].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const forceMag = (24 + buffetOscillation * 14 * (deg === 0 ? 1 : 0.7)) * vortexIntensity;
            const startX = -42 * Math.cos(rad) - forceMag;
            const startY = 42 * Math.sin(rad) + buffetOscillation * 12;
            const endX = -42 * Math.cos(rad) - 2;
            const endY = 42 * Math.sin(rad);
            return (
              <g key={`force-${deg}`} opacity={vortexIntensity}>
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={deg === 0 ? '#d0523f' : '#e0b44c'}
                  strokeWidth={2}
                  markerEnd={deg === 0 ? 'url(#arrowRed)' : 'url(#arrowAmber)'}
                />
              </g>
            );
          })}

          {/* Oscillating Transverse Load Arrow */}
          <g opacity={vortexIntensity}>
            <line
              x1="0"
              y1={buffetOscillation * -32}
              x2="0"
              y2={buffetOscillation * 38}
              stroke="#d0523f"
              strokeWidth={2.4}
              markerEnd="url(#arrowRed)"
            />
            <text x="56" y="6" fill="#d0523f" fontSize={9} fontWeight="bold">F_quer(t)</text>
          </g>
        </g>

        {/* Kármán Vortex Street Particles & Spirals */}
        {vortices.map((v) => {
          const rot = (frame * 6 * v.side) % 360;
          return (
            <g
              key={`vortex-${v.id}`}
              transform={`translate(${v.x}, ${v.y}) scale(${v.scale * vortexIntensity})`}
              opacity={0.85 * intro}
            >
              {/* Swirling vortex rings */}
              <circle
                r="18"
                fill={v.side < 0 ? 'url(#vortexGradPos)' : 'url(#vortexGradNeg)'}
                stroke={v.side < 0 ? '#e0b44c' : '#5b7f9c'}
                strokeWidth={0.8}
                strokeDasharray="4 2"
              />
              <path
                d="M -12 0 A 12 12 0 1 1 10 7"
                fill="none"
                stroke={v.side < 0 ? '#e0b44c' : '#e9f2f6'}
                strokeWidth={1.4}
                transform={`rotate(${rot})`}
                markerEnd="url(#arrow)"
              />
              <text
                x="0"
                y="3"
                fill="#e9f2f6"
                fontSize={8}
                textAnchor="middle"
                opacity={0.8}
              >
                {v.side < 0 ? '+Γ' : '-Γ'}
              </text>
            </g>
          );
        })}

        {/* Vortex Street Envelope & Wavelength Marker */}
        <g opacity={0.5 * intro}>
          <path
            d="M 214 186 Q 300 160 400 170 T 556 186"
            fill="none"
            stroke="#e0b44c"
            strokeWidth={0.9}
            strokeDasharray="3 3"
          />
          <path
            d="M 214 254 Q 300 280 400 270 T 556 254"
            fill="none"
            stroke="#5b7f9c"
            strokeWidth={0.9}
            strokeDasharray="3 3"
          />
          {/* Dimension line for vortex spacing / wavelength lambda */}
          <line x1="310" y1="130" x2="420" y2="130" stroke="#e9f2f6" strokeWidth={0.8} markerEnd="url(#arrow)" markerStart="url(#arrow)" />
          <text x="365" y="122" fill="#e9f2f6" fontSize={8.5} textAnchor="middle" letterSpacing="0.6">WIRBELABSTAND λ = v / f_s</text>
        </g>

        {/* Dynamic Load Oscillogram (Buffeting Signal over Time) */}
        <g opacity={signalGrowth} transform="translate(0, 0)">
          {/* Panel boundary */}
          <rect x="430" y="350" width="350" height="90" fill="#0d1419" stroke="#e9f2f6" strokeWidth={0.6} opacity={0.6} />
          {/* Grid lines */}
          <line x1="450" y1="410" x2="760" y2="410" stroke="#e9f2f6" strokeWidth={0.7} strokeDasharray="3 2" opacity={0.4} />
          <line x1="450" y1="375" x2="760" y2="375" stroke="#d0523f" strokeWidth={0.6} strokeDasharray="4 3" opacity={0.6} />
          <line x1="450" y1="445" x2="760" y2="445" stroke="#d0523f" strokeWidth={0.6} strokeDasharray="4 3" opacity={0.6} />

          {/* Graph wave */}
          <polyline
            fill="none"
            stroke="#e0b44c"
            strokeWidth={1.8}
            points={graphPoints}
          />

          {/* Axis Labels & Values */}
          <text x="450" y="364" fill="#d0523f" fontSize={7.5} letterSpacing="0.8">+F_krit (Kollapsgrenze)</text>
          <text x="450" y="454" fill="#d0523f" fontSize={7.5} letterSpacing="0.8">-F_krit</text>
          <text x="760" y="406" fill="#e9f2f6" fontSize={8} textAnchor="end">t (Zeit)</text>
          <text x="440" y="413" fill="#e0b44c" fontSize={8} textAnchor="end">0</text>
          <text x="450" y="342" fill="#e9f2f6" fontSize={9} fontWeight="bold" letterSpacing="0.8">
            PERIODISCHE LASTIMPULSE (BUFFETING)
          </text>
        </g>

        {/* Diagnostic Parameter Legend Box */}
        <g opacity={0.85 * intro} transform="translate(60, 350)">
          <rect x="0" y="0" width="220" height="90" fill="#0d1419" stroke="#e9f2f6" strokeWidth={0.6} opacity={0.6} />
          <text x="14" y="20" fill="#e0b44c" fontSize={9} fontWeight="bold" letterSpacing="0.8">AERODYNAMISCHE KOPPLUNG</text>
          <text x="14" y="38" fill="#e9f2f6" fontSize={8}>• Strouhal-Zahl: St ≈ 0.20</text>
          <text x="14" y="52" fill="#e9f2f6" fontSize={8}>• Wirbelfrequenz: f_s = St · v / D</text>
          <text x="14" y="66" fill="#e9f2f6" fontSize={8}>• Interferenz: Turm-zu-Turm Nachlauf</text>
          <text x="14" y="80" fill="#d0523f" fontSize={8}>• Resonanz: Dynamische Hüllenbelastung</text>
        </g>
      </svg>

      {/* Caption Banner */}
      {p.title ? (
        <div
          style={{
            position: 'absolute',
            bottom: 34,
            transform: `translateY(${titleRise}px)`,
            fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: '#e9f2f6',
            textTransform: 'uppercase',
            borderLeft: '3px solid #e0b44c',
            paddingLeft: 14,
          }}
        >
          {p.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};