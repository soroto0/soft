import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

export const BannerAi8804: React.FC<VariantProps> = (p) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const { enter, exit, content } = p;

  // Entrance/exit are already provided (0->1 over first 0.4s, 1->0 over last 0.3s)
  // We'll use these to drive opacity and position

  // Create a retro TV 80s color palette
  const magenta = '#FF00FF';
  const cyan = '#00FFFF';
  const darkPurple = '#1A001A';

  // Animate the scanline effect - create vertical lines that move down
  const scanlineOffset = (frame * 2) % 20;

  // Chromatic aberration effect - slight horizontal shift
  const chromaShift = interpolate(frame, [0, 30], [-2, 2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.linear
  });

  // Scale up slightly for entrance
  const scale = interpolate(enter, [0, 1], [0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  // Position from bottom up
  const translateY = interpolate(enter, [0, 1], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  // Text appear staggered
  const textScale = interpolate(enter, [0, 1], [0.9, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  // Glow intensity
  const glowIntensity = interpolate(enter, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(enter, [0, 1], [0, exit], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })
      }}
    >
      {/* Retro TV scanlines overlay */}
      <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
        <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
          {Array.from({ length: 20 }, (_, i) => (
            <line
              key={i}
              x1={0}
              y1={i * 30 + scanlineOffset}
              x2={width}
              y2={i * 30 + scanlineOffset}
              stroke={i % 2 === 0 ? 'rgba(255,0,255,0.08)' : 'rgba(0,255,255,0.08)'}
              strokeWidth={1}
            />
          ))}
        </svg>
      </AbsoluteFill>

      {/* Background banner with retro colors */}
      <AbsoluteFill style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', bottom: translateY }}>
        <div
          style={{
            transform: `translateX(${chromaShift}px) scale(${scale})`,
            backgroundColor: darkPurple,
            width: '90%',
            height: '80px',
            margin: '0 auto',
            borderRadius: '4px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: `0 0 ${20 * glowIntensity}px ${magenta}, 0 0 ${40 * glowIntensity}px ${cyan}`,
            filter: `contrast(${1 + glowIntensity * 0.3}) brightness(${0.9 + glowIntensity * 0.2})`
          }}
        >
          {/* Chromatic aberration split effect */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: `linear-gradient(90deg, ${magenta} 0%, ${cyan} 50%, ${magenta} 100%)`,
              opacity: 0.1,
              mixBlendMode: 'screen'
            }}
          />
          
          {/* Diagonal stripe pattern */}
          <div
            style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 200,
              height: 200,
              background: `repeating-linear-gradient(
                45deg,
                ${magenta},
                ${magenta} 10px,
                ${cyan} 10px,
                ${cyan} 20px
              )`,
              opacity: 0.08,
              transform: 'rotate(45deg)'
            }}
          />
        </div>

        {/* Main content container */}
        <div
          style={{
            position: 'absolute',
            bottom: '15px',
            left: '50%',
            transform: `translateX(-50%) scale(${textScale})`,
            color: 'white',
            textAlign: 'center',
            fontFamily: "'Courier New', 'Consolas', monospace",
            fontSize: '28px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            textShadow: `2px 2px 0px ${magenta}, -1px -1px 0px ${cyan}, 1px 1px 0px ${magenta}`,
            padding: '0 20px'
          }}
        >
          {content}
        </div>

        {/* Decorative corner elements */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            width: '30px',
            height: '30px',
            border: `2px solid ${magenta}`,
            borderRight: 'none',
            borderBottom: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '30px',
            height: '30px',
            border: `2px solid ${cyan}`,
            borderLeft: 'none',
            borderBottom: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            width: '30px',
            height: '30px',
            border: `2px solid ${magenta}`,
            borderTop: 'none',
            borderRight: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            width: '30px',
            height: '30px',
            border: `2px solid ${cyan}`,
            borderTop: 'none',
            borderLeft: 'none'
          }}
        />

        {/* Inner glow effect */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            boxShadow: 'inset 0 0 20px rgba(255,0,255,0.2), inset 0 0 40px rgba(0,255,255,0.1)',
            pointerEvents: 'none'
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
