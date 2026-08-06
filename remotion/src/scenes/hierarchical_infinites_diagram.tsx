import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HierarchicalInfinitesDiagramScene: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  // Animation 1: Expand/slide visual layers
  const layerExpand = interpolate(frame, [0, span * 0.45], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Animation 2: Shift focus & scale up higher infinities spacing
  const hierarchyScale = interpolate(frame, [span * 0.25, span * 0.75], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Animation 3: Dynamic stroke pulse for physical reality border
  const physicalPulse = interpolate(frame, [span * 0.35, span * 0.95], [0, 120], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Animation 4: Text caption entrance translation
  const textRise = interpolate(frame, [span * 0.1, span * 0.5], [16, 0], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = p.enter * p.exit;

  const layers = [
    {
      symbol: 'ℵ₀',
      name: 'ALEPH-NULL (ℵ₀)',
      math: 'ℕ = {1, 2, 3, 4, ...}',
      desc: 'Countable Infinity (Discrete)',
      y: 280,
      w: 240,
      h: 52,
      color: '#e9f2f6',
    },
    {
      symbol: 'ℵ₁',
      name: 'ALEPH-ONE (ℵ₁ = 2^ℵ₀)',
      math: 'ℝ = Continuum (c)',
      desc: 'Physical Points / Space-Time',
      y: 200,
      w: 360,
      h: 58,
      color: '#e0b44c',
    },
    {
      symbol: 'ℵ₂',
      name: 'ALEPH-TWO (ℵ₂ = 2^ℵ₁)',
      math: 'F: ℝ → ℝ (Function Space)',
      desc: 'Higher Set Hierarchy',
      y: 110,
      w: 480,
      h: 66,
      color: '#d0523f',
    },
  ];

  const axisTicks = [
    { val: 'ℵ₀', y: 280 },
    { val: 'ℵ₁', y: 200 },
    { val: 'ℵ₂', y: 110 },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '82%',
          height: '78%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <svg viewBox="0 0 700 400" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <linearGradient id="layerGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e0b44c" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#e9f2f6" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#d0523f" stopOpacity="0.22" />
            </linearGradient>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#e0b44c" />
            </marker>
          </defs>

          {/* Archival Grid Lines */}
          <g opacity={0.15}>
            {[80, 160, 240, 320, 400, 480, 560, 640].map((x) => (
              <line key={`v-${x}`} x1={x} y1={20} x2={x} y2={360} stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="4 4" />
            ))}
            {[60, 120, 180, 240, 300, 360].map((y) => (
              <line key={`h-${y}`} x1={40} y1={y} x2={660} y2={y} stroke="#e9f2f6" strokeWidth={0.5} strokeDasharray="4 4" />
            ))}
          </g>

          {/* Cardinality Vertical Scale Axis */}
          <g>
            <line x1={80} y1={340} x2={80} y2={60} stroke="#e9f2f6" strokeWidth={1.5} markerEnd="url(#arrow)" />
            <text x={70} y={50} fill="#e9f2f6" fontSize={10} textAnchor="end" fontFamily="monospace">
              CARDINALITY |S|
            </text>
            {axisTicks.map((tick) => {
              const currentY = tick.y + (1 - layerExpand) * 15;
              return (
                <g key={tick.val} opacity={layerExpand}>
                  <line x1={74} y1={currentY} x2={86} y2={currentY} stroke="#e9f2f6" strokeWidth={1} />
                  <text x={65} y={currentY + 4} fill="#e0b44c" fontSize={11} textAnchor="end" fontFamily="monospace" fontWeight="bold">
                    {tick.val}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Layered Infinite Set Containers */}
          {layers.map((layer, index) => {
            const spreadY = (layer.y - 180) * (0.4 + 0.6 * hierarchyScale) + 180;
            const currentWidth = layer.w * (0.3 + 0.7 * layerExpand);
            const xPos = 370 - currentWidth / 2;
            const itemOpacity = Math.min(1, layerExpand * (1 + index * 0.2));

            return (
              <g key={layer.symbol} opacity={itemOpacity}>
                <rect
                  x={xPos}
                  y={spreadY - layer.h / 2}
                  width={currentWidth}
                  height={layer.h}
                  rx={6}
                  fill="url(#layerGrad)"
                  stroke={layer.color}
                  strokeWidth={1.2}
                  strokeDasharray={index === 2 ? '6 3' : 'none'}
                />

                <line
                  x1={xPos + 15}
                  y1={spreadY + 8}
                  x2={xPos + currentWidth - 15}
                  y2={spreadY + 8}
                  stroke={layer.color}
                  strokeWidth={0.6}
                  strokeDasharray="3 3"
                  opacity={0.6}
                />

                {layerExpand > 0.4 && (
                  <>
                    <text
                      x={xPos + 16}
                      y={spreadY - 6}
                      fill={layer.color}
                      fontSize={12}
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {layer.name}
                    </text>
                    <text
                      x={xPos + currentWidth - 16}
                      y={spreadY - 6}
                      fill="#e9f2f6"
                      fontSize={10}
                      textAnchor="end"
                      fontFamily="sans-serif"
                      opacity={0.85}
                    >
                      {layer.math}
                    </text>
                    <text
                      x={xPos + 16}
                      y={spreadY + 20}
                      fill="#e9f2f6"
                      fontSize={9}
                      fontFamily="sans-serif"
                      opacity={0.7}
                    >
                      {layer.desc}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Inclusion / Power Set Arrows */}
          <g opacity={hierarchyScale}>
            <path
              d="M 370 252 L 370 230"
              stroke="#e0b44c"
              strokeWidth={1}
              strokeDasharray="2 2"
              markerEnd="url(#arrow)"
            />
            <path
              d="M 370 171 L 370 143"
              stroke="#d0523f"
              strokeWidth={1}
              strokeDasharray="2 2"
              markerEnd="url(#arrow)"
            />
            <text x={380} y={242} fill="#e0b44c" fontSize={8} fontFamily="monospace">
              2^ℵ₀ (POWER SET)
            </text>
            <text x={380} y={160} fill="#d0523f" fontSize={8} fontFamily="monospace">
              2^ℵ₁ (POWER SET)
            </text>
          </g>

          {/* Physical Reality Bracket */}
          <g opacity={Math.min(1, layerExpand * 1.2)}>
            <rect
              x={610}