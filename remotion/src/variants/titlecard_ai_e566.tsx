import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

export const TitlecardAiE566: React.FC<VariantProps> = (p) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  const [mainHead, subtitle] = p.content.split('::');

  const xPosition = interpolate(frame, [0, 20], [-50, 0], {
    easing: Easing.out(Easing.poly(4)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const blurAmount = interpolate(frame, [0, 40], [15, 0], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const grainIntensity = interpolate(frame, [0, frame + 20], [0.15, 0], {
    easing: Easing.linear,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <AbsoluteFill>
      <svg width="0" height="0">
        <defs>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" result="noise"/>
            <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>
            <feComponentTransfer in="mono" result="grain">
              <feFuncA type="linear" slope={grainIntensity}/>
            </feComponentTransfer>
            <feComposite in="grain" in2="SourceGraphic" operator="in" result="m"/>
            <feBlend in="SourceGraphic" in2="m" mode="multiply"/>
          </filter>
          <filter id="inkBleed">
            <feGaussianBlur stdDeviation="1.2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <clipPath id="journalSpread">
            <rect x="10%" y="10%" width="80%" height="80%" rx="8"/>
          </clipPath>
        </defs>
      </svg>

      {/* Background paper texture - moved to sized container */}
      <div style={{
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        // FIX: Make the background semi-transparent so the video underneath is visible
        background: 'rgba(248, 243, 233, 0.4)',
        filter: `url(#grain)`,
        pointerEvents: 'none'
      }} />

      {/* Main content area with aged paper effect */}
      <div style={{ 
        position: 'absolute',
        left: `${xPosition}%`,
        top: '15%',
        width: '75%',
        height: '70%',
        background: 'rgba(248, 243, 233, 0.92)',
        border: `2px solid #b8a594`,
        boxSizing: 'border-box',
        boxShadow: `${blurAmount}px ${blurAmount * 2}px rgba(0,0,0,0.35), inset 0 0 40px rgba(184, 165, 148, 0.4)`,
        transform: `scale(1)`,
        transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        clipPath: 'polygon(8% 8%, 92% 8%, 92% 92%, 8% 92%)',
        filter: `url(#inkBleed)`,
        backfaceVisibility: 'hidden'
      }}>
        
        {/* Decorative margin rules - journal page formatting */}
        <AbsoluteFill style={{ 
          borderLeft: `1px dashed #a69582`,
          borderRight: `1px dashed #a69582`,
          borderTop: `1px solid #c9b8a5`,
          borderBottom: `1px solid #c9b8a5`,
          pointerEvents: 'none',
          opacity: 0.6
        }} />
        
        {/* Wax seal accent */}
        <AbsoluteFill style={{ 
          position: 'absolute',
          top: '12%',
          right: '12%',
          width: '40px',
          height: '40px',
          background: `radial-gradient(circle at 30% 30%, #d4af37, #b8860b)`,
          borderRadius: '50%',
          border: `3px solid #8b6f1d`,
          boxShadow: '2px 2px 6px rgba(0,0,0,0.3)',
          opacity: interpolate(frame, [0, 10], [0, 0.9], {
            easing: Easing.out(Easing.back(1.5)),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp'
          })
        }} />

        {/* Typography layer - Georgian/serif aesthetic with wide tracking */}
        <div style={{ 
          position: 'absolute',
          top: '35%',
          left: '15%',
          right: '15%',
          textAlign: 'left',
          color: '#4a3520',
          fontFamily: "'Georgia', 'Times New Roman', serif",
          lineHeight: 1.4,
          textTransform: 'none',
          letterSpacing: '-0.02em',
          wordSpacing: '0.05em'
        }}>
          <div style={{ 
            fontSize: Math.min(width * 0.085, height * 0.11),
            fontWeight: '700',
            marginBottom: '1.4em',
            padding: '0 15px',
            borderBottom: `3px double #a69582`,
            position: 'relative',
            opacity: interpolate(frame, [0, 30], [0.3, 1], {
              easing: Easing.out(Easing.elastic(0.8)),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp'
            }),
            transform: `translateY(${interpolate(frame, [0, 20], [20, 0], {
              easing: Easing.out(Easing.back(1.3)),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp'
            })}px)`
          }}>
            {mainHead?.toUpperCase()}
          </div>
          
          {subtitle && (
            <div style={{ 
              fontSize: Math.min(width * 0.032, height * 0.042),
              opacity: interpolate(frame, [15, 45], [0, 1], {
                easing: Easing.out(Easing.quad),
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp'
              }),
              transform: `translateY(${interpolate(frame, [15, 45], [15, 0], {
                easing: Easing.out(Easing.ease),
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp'
              })}px)`,
              color: '#6b5545',
              fontStyle: 'italic',
              borderLeft: `2px solid #c9b8a5`,
              paddingLeft: '20px',
              maxWidth: '70%'
            }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* Page edge texture strip - aged paper effect */}
        <div style={{ 
          position: 'absolute',
          bottom: '8%',
          left: '8%',
          right: '8%',
          height: '6px',
          background: `linearGradient(to right, transparent, #d4c8b0, transparent)`,
          opacity: 0.5
        }} />
      </div>

      {/* Entrance exit handling - p.enter and p.exit already handled by caller */}
      <AbsoluteFill style={{ 
        opacity: p.enter,
        transform: `scale(${interpolate(frame, [0, 10], [0.85, 1], {
          easing: Easing.in(Easing.back(1.2)),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })})`
      }} />
      
      {/* Subtle dust particles floating - adds vintage atmosphere */}
      {[...Array(8)].map((_, i) => (
        <AbsoluteFill 
          key={i}
          style={{
            position: 'absolute',
            width: '2px',
            height: '2px',
            background: '#b8a594',
            borderRadius: '50%',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: interpolate(frame + i * 5, [0, width/10], [0.1, 0], {
              easing: Easing.linear,
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp'
            })
          }} 
        />
      ))}
    </AbsoluteFill>
  );
};
