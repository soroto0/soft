import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing, Img } from 'remotion';
import type { VariantProps } from '../types';
import { DISPLAY } from '../fonts';

export const Lower3Ai0FBF: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  useVideoConfig();

  // Entrance and exit opacities are already calculated by the core
  const entranceOpacity = p.enter;
  const exitOpacity = p.exit;
  const combinedOpacity = entranceOpacity * exitOpacity;

  // Use deterministic frame-based motion for internal animation
  const slideOffset = interpolate(frame, [0, 30, 60], [-20, 0, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease)
  });

  const scale = interpolate(frame, [0, 20, 40, 100], [0.8, 0.95, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease)
  });

  const lineProgress = interpolate(frame, [0, 15, 30], [0, 0.5, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.poly(3)
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: p.pos === 'left' ? 'flex-start' : p.pos === 'right' ? 'flex-end' : 'center',
        padding: p.pos === 'left' ? '60px 80px' : p.pos === 'right' ? '60px 80px' : '60px 120px',
        bottom: 40,
        opacity: combinedOpacity,
        pointerEvents: 'none'
      }}
    >
      {/* SVG Filters for premium texture */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" result="noise"/>
            <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>
            <feComponentTransfer in="mono" result="grain">
              <feFuncA type="linear" slope="0.06"/>
            </feComponentTransfer>
            <feComposite in="grain" in2="SourceGraphic" operator="in" result="m"/>
            <feBlend in="SourceGraphic" in2="m" mode="multiply"/>
          </filter>
          <filter id="softDrop">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.15"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Main panel with subtle texture */}
      <AbsoluteFill
        style={{
          transform: `translateY(${slideOffset}px) scale(${scale})`,
          filter: 'url(#grain) url(#softDrop)',
          pointerEvents: 'auto'
        }}
      >
        {/* Panel background with Swiss design aesthetic */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '20px 32px',
            borderRadius: '0',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            borderLeft: '4px solid #C00',
            minWidth: '240px',
            maxWidth: '720px',
            position: 'relative'
          }}
        >
          {/* Decorative accent line at top */}
          <div
            style={{
              width: `${lineProgress * 100}%`,
              height: '2px',
              backgroundColor: '#C00',
              marginBottom: '16px',
              transition: 'width 0.3s ease'
            }}
          />
          
          {/* Content text using Swiss typography - Bahnschrift for technical feel */}
          <div
            style={{
              fontFamily: DISPLAY,
              fontSize: '22px',
              fontWeight: '700',
              color: '#1a1a1a',
              letterSpacing: '-0.8px',
              lineHeight: 1.25,
              textTransform: 'none',
              whiteSpace: 'normal',
              overflow: 'visible',
              textOverflow: 'none',
              padding: '0 16px'
            }}
          >
            {p.content}
          </div>

          {/* Optional image support with Swiss minimalism */}
          {p.img && (
            <div
              style={{
                marginTop: '16px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '13px',
                color: '#666',
                padding: '8px 0',
                borderTop: '1px solid #f0f0f0'
              }}
            >
              <Img
                src={p.img}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '0',
                  marginRight: '12px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'
                }}
              />
              <span style={{ fontFamily: DISPLAY, color: '#777' }}>VIS</span>
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* Red accent line beneath panel for Swiss visual identity */}
      <div
        style={{
          position: 'absolute',
          bottom: '-4px',
          width: p.pos === 'left' ? 'auto' : p.pos === 'right' ? 'auto' : '100%',
          left: p.pos === 'left' ? '0' : p.pos === 'right' ? 'auto' : '50%',
          right: p.pos === 'right' ? '0' : p.pos === 'left' ? 'auto' : 'auto',
          height: '3px',
          backgroundColor: '#C00',
          transform: p.pos === 'center' ? 'translateX(-50%)' : 'none',
          opacity: combinedOpacity
        }}
      />
    </AbsoluteFill>
  );
};
