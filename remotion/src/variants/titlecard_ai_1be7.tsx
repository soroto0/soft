import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';
import { DISPLAY } from '../fonts';

export const TitlecardAi1BE7: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const [headline, subtitle] = p.content.split('::');
  const safeHeadline = headline || 'UNKNOWN TITLE';
  const safeSubtitle = subtitle || '';

  const grainOpacity = interpolate(frame, [0, 2 * fps], [0.3, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const chromaticOffset = interpolate(frame, [0, fps * 2], [4, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const scanlines = interpolate(frame, [0, fps], [0, 60], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fadeIn = interpolate(p.enter, [0, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(p.exit, [0, 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const combinedFade = interpolate(fadeIn, [0, 1], [fadeOut, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="0" height="0">
        <defs>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="5" stitchTiles="stitch" result="noise"/>
            <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>
            <feComponentTransfer in="mono" result="grain">
              <feFuncA type="linear" slope="0.08"/>
            </feComponentTransfer>
            <feComposite in="grain" in2="SourceGraphic" operator="in" result="m"/>
            <feBlend in="SourceGraphic" in2="m" mode="multiply"/>
          </filter>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feComposite in="blur" in2="SourceAlpha" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <clipPath id="vhs-clip">
            <rect x="0" y="0" width={p.width ?? 0} height={p.height ?? 0} rx="12" ry="12"/>
          </clipPath>
        </defs>
      </svg>

      <AbsoluteFill
        style={{
          filter: `url(#grain)`,
          opacity: interpolate(grainOpacity, [0, 1], [combinedFade, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `rgba(0, 0, 0, ${interpolate(frame, [0, fps], [0.15, 0.25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
          mixBlendMode: 'screen',
        }}
      >
        {[...Array(Math.floor(scanlines / 2))].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${(i * 3 + (frame % 6))}%`,
              left: 0,
              width: '100%',
              height: '2px',
              background: `rgba(0, 255, 150, ${0.1 + (frame % 3) * 0.05})`,
              transform: `translateX(${i % 2 === 0 ? 0 : -2}px)`,
            }}
          />
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${interpolate(frame, [0, fps], [0.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.elastic(1.2) })})`,
          opacity: combinedFade,
          color: '#FF00FF',
          fontFamily: DISPLAY,
          letterSpacing: '-2px',
          textTransform: 'uppercase',
          fontSize: Math.min(p.width ?? 0 * 0.18, 180),
          fontWeight: 900,
          filter: `drop-shadow(${chromaticOffset}px 0 0 #00FFFF) drop-shadow(${-chromaticOffset}px 0 0 #FF00FF)`,
          textAlign: 'center',
          padding: '20px 40px',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          border: '2px solid #FF00FF',
          boxSizing: 'border-box',
          clipPath: 'polygon(10% 0, 100% 0, 100% 90%, 90% 100%, 0 100%, 0 10%, 10% 0)',
        }}
      >
        {safeHeadline}
      </div>

      {safeSubtitle && (
        <div
          style={{
            position: 'absolute',
            top: '58%',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: combinedFade,
            color: '#FFFFFF',
            fontFamily: "'Times New Roman', serif",
            fontSize: Math.min(p.width ?? 0 * 0.06, 48),
            textAlign: 'center',
            textShadow: '2px 2px 0 #00FFFF',
            letterSpacing: '3px',
          }}
        >
          {safeSubtitle}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '10%',
          opacity: combinedFade,
          color: '#00FFFF',
          fontFamily: "'Consolas', monospace",
          fontSize: 18,
          textShadow: '1px 1px 0 #FF00FF',
        }}
      >
        SIGNAL: VHS-LAB // ECHO-7
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          opacity: combinedFade,
          color: '#FF00FF',
          fontFamily: "'Consolas', monospace",
          fontSize: 18,
          textShadow: '1px 1px 0 #00FFFF',
          textAlign: 'right',
        }}
      >
        FR: {frame}
      </div>

      <div
        style={{
          position: 'absolute',
          top: '20%',
          right: '5%',
          width: '60px',
          height: '60px',
          border: '2px dashed #00FFFF',
          borderRadius: '50%',
          opacity: combinedFade,
          animation: 'pulse 2s infinite',
        }}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </AbsoluteFill>
  );
};
