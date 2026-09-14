import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const VolumeVsSurfaceScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));
  const opacity = p.enter * p.exit;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  } as const;

  // 1. Global Drift
  const push = interpolate(frame, [0, span], [1, 1.04], EO);

  // 2. Timing Sequences
  const dateAlpha = interpolate(frame, [0, span * 0.15], [0, 1], EO);
  const bodyAlpha = interpolate(frame, [span * 0.1, span * 0.25], [0, 1], EO);
  const bodyFadeOut = interpolate(frame, [span * 0.5, span * 0.7], [1, 0.15], EO);
  const lineProgress = interpolate(frame, [span * 0.25, span * 0.45], [0, 1], EO);
  const cardAlpha = interpolate(frame, [span * 0.45, span * 0.65], [0, 1], EO);
  const handSlide = interpolate(frame, [span * 0.45, span * 0.65], [120, 0], EO);
  
  const prohibitPop = spring({
    frame: frame - Math.round(span * 0.55),
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.5 },
  });

  const gridAlpha = interpolate(frame, [0, span * 0.2], [0, 0.3], EO);
  const captionRise = interpolate(frame, [span * 0.1, span * 0.3], [20, 0], EO);

  // Anatomical Layers Data
  const layers = [
    { name: 'MÉDULA', color: '#e9f2f6', size: 20, h: 100, opacity: 0.9 },
    { name: 'TEJIDO', color: '#d0523f', size: 40, h: 110, opacity: 0.4 },
    { name: 'DERMIS', color: '#8a949b', size: 60, h: 120, opacity: 0.2 },
  ];

  // Helper for Isometric Path (Box)
  const getIsoBox = (w: number, d: number, h: number) => {
    const x0 = 0;
    const y0 = 0;
    // Top face
    const top = `M ${x0} ${y0 - h} L ${x0 + w * 0.866} ${y0 - h + w * 0.5} L ${x0 + (w - d) * 0.866} ${y0 - h + (w + d) * 0.5} L ${x0 - d * 0.866} ${y0 - h + d * 0.5} Z`;
    // Right face
    const right = `M ${x0 + w * 0.866} ${y0 - h + w * 0.5} L ${x0 + w * 0.866} ${y0 + w * 0.5} L ${x0 + (w - d) * 0.866} ${y0 + (w + d) * 0.5} L ${x0 + (w - d) * 0.866} ${y0 - h + (w + d) * 0.5} Z`;
    // Front face
    const front = `M ${x0 - d * 0.866} ${y0 - h + d * 0.5} L ${x0 - d * 0.866} ${y0 + d * 0.5} L ${x0 + (w - d) * 0.866} ${y0 + (w + d) * 0.5} L ${x0 + (w - d) * 0.866} ${y0 - h + (w + d) * 0.5} Z`;
    return { top, right, front };
  };

  const L1 = Math.hypot(100, 50);

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={width} height={height} viewBox="0 0 800 450" fill="none">
        <g transform={`translate(400 225) scale(${push}) translate(-400 -225)`}>
          {/* Background Grid */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={150} y1={100 + i * 60} x2={650} y2={100 + i * 60} stroke="#e9f2f6" strokeWidth={1} opacity={gridAlpha * 0.2} />
          ))}

          {/* Date Label */}
          <text x={400} y={60} fill="#e9f2f6" fontSize={24} textAnchor="middle" opacity={dateAlpha} fontFamily="serif" letterSpacing="0.2em">
            ANNO 1850
          </text>

          {/* Anatomical Body (Background) */}
          <g transform="translate(280 240)" opacity={bodyAlpha * bodyFadeOut}>
            {layers.reverse().map((layer, i) => {
              const box = getIsoBox(layer.size, layer.size, layer.h);
              const stagger = interpolate(frame, [span * (0.1 + i * 0.05), span * (0.3 + i * 0.05)], [0, 1], EO);
              return (
                <g key={layer.name} opacity={stagger}>
                  <path d={box.front} fill={layer.color} opacity={layer.opacity} stroke="#e9f2f6" strokeWidth={0.5} />
                  <path d={box.right} fill={layer.color} opacity={layer.opacity * 0.8} stroke="#e9f2f6" strokeWidth={0.5} />
                  <path d={box.top} fill={layer.color} opacity={layer.opacity * 1.2} stroke="#e9f2f6" strokeWidth={0.5} />
                  
                  {/* Layer Label */}
                  <line x1={40} y1={-layer.h + 20} x2={120} y2={-layer.h - 20} stroke="#e9f2f6" strokeWidth={1} 
                        strokeDasharray={L1} strokeDashoffset={L1 * (1 - lineProgress)} opacity={0.6} />
                  <text x={125} y={-layer.h - 25} fill="#e9f2f6" fontSize={10} opacity={lineProgress}>{layer.name}</text>
                </g>
              );
            })}
            
            {/* Prohibition Mark */}
            <g transform={`scale(${prohibitPop})`} opacity={prohibitPop}>
              <circle cx={0} cy={-50} r={70} stroke="#d0523f" strokeWidth={8} fill="none" />
              <line x1={-45} y1={-95} x2={45} y2={-5} stroke="#d0523f" strokeWidth={8} />
              <text x={0} y={40} fill="#d0523f" fontSize={18} textAnchor="middle" fontWeight="bold">PROHIBIDO</text>
            </g>
          </g>

          {/* Hand and Cardboard (Foreground) */}
          <g transform={`translate(${500 + handSlide} 240)`} opacity={cardAlpha}>
            {/* The Cardboard Sheet */}
            <rect x={-60} y={-100} width={120} height={180} fill="#e9f2f6" stroke="#8a949b" strokeWidth={2} />
            <path d="M -30 -40 Q 0 -80 30 -40 L 30 40 Q 0 60 -30 40 Z" fill="none" stroke="#e0b44c" strokeWidth={2} />
            <circle cx={0} cy={-50} r={12} stroke="#e0b44c" strokeWidth={2} fill="none" />
            
            {/* Hand holding the sheet */}
            <path d="M 60 0 C 100 0 120 40 120 80 L 140 80" stroke="#e9f2f6" strokeWidth={12} strokeLinecap="round" fill="none" />
            <path d="M 60 -10 C 50 -10 40 0 40 10 L 40 30 C 40 40 50 50 60 50" stroke="#e9f2f6" strokeWidth={8} strokeLinecap="round" fill="none" />
            
            {/* Label for Cardboard */}
            <rect x={-70} y={90} width={140} height={24} rx={4} fill="#e0b44c" />
            <text x={0} y={107} fill="#16202b" fontSize={12} textAnchor="middle" fontWeight="bold">MANIQUÍ DE CARTÓN</text>
            
            {/* Measure Line */}
            <line x1={-60} y1={-115} x2={60} y2={-115} stroke="#e9f2f6" strokeWidth={1} />
            <line x1={-60} y1={-110} x2={-60} y2={-120} stroke="#e9f2f6" strokeWidth={1} />
            <line x1={60} y1={-110} x2={60} y2={-120} stroke="#e9f2f6" strokeWidth={1} />
            <text x={0} y={-125} fill="#e9f2f6" fontSize={10} textAnchor="middle">0.5 mm</text>
          </g>
        </g>

        {/* Scene Caption */}
        {p.title ? (
          <g transform={`translate(${width / 2} ${height - 60 + captionRise})`}>
            <rect x={-160} y={-25} width={320} height={50} rx={25} fill="#16202b" opacity={0.8} />
            <text
              fill="#e9f2f6"
              fontSize={32}
              textAnchor="middle"
              style={{ fontFamily: 'serif', letterSpacing: '0.05em' }}
            >
              {p.title}
            </text>
          </g>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};