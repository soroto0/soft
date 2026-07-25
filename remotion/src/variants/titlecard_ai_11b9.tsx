import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

const COLORS = {
  bg: '#1e1b19',
  panel: '#f0e6d2',
  ink: '#3b3229',
  accent: '#8a5a44',
  highlight: '#d4af37',
  textMain: '#2c241b',
  textSub: '#5c4d3c',
};

export const TitlecardAi11B9: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Animation Timings
  const headlineEntrance = interpolate(frame, [0, 40], [0, 1], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  const panelEntrance = interpolate(frame, [0, 30], [0.8, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  const stampEffect = interpolate(frame, [5, 15], [-2, 0], {
    easing: Easing.ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Split content
  const [headline, subtitle] = p.content.split('::');

  // Layout dimensions
  const PANEL_W = width * 0.65;
  const PANEL_H = height * 0.55;
  const PANEL_X = (width - PANEL_W) / 2 + (width * 0.05); // Slight offset for asymmetry
  const PANEL_Y = (height - PANEL_H) / 2;

  // Text sizing
  const TITLE_SIZE = Math.min(PANEL_W * 0.09, 80);
  const SUB_SIZE = Math.min(PANEL_W * 0.04, 32);

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      {/* Layer 1: Depth Shadow behind panel */}
      <div
        style={{
          position: 'absolute',
          left: PANEL_X + 20,
          top: PANEL_Y + 30,
          width: PANEL_W,
          height: PANEL_H,
          backgroundColor: 'rgba(0,0,0,0.6)',
          filter: 'blur(15px)',
          opacity: panelEntrance * p.enter * p.exit,
          transform: `scale(${panelEntrance})`,
          transformOrigin: 'center center',
        }}
      />

      {/* Layer 2: The Parchment Panel */}
      <div
        style={{
          position: 'absolute',
          left: PANEL_X,
          top: PANEL_Y,
          width: PANEL_W,
          height: PANEL_H,
          backgroundColor: COLORS.panel,
          opacity: panelEntrance * p.enter * p.exit,
          transform: `translateY(${stampEffect}px) scale(${panelEntrance})`,
          transformOrigin: 'bottom center',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '40px',
          boxSizing: 'border-box',
          border: `2px solid ${COLORS.ink}`,
          backgroundImage: `radial-gradient(circle at 50% 50%, transparent 60%, rgba(0,0,0,0.05) 100%)`,
        }}
      >
        {/* Decorative Corner Accents */}
        {[
          { t: 10, l: 10 },
          { t: 10, r: 10 },
          { b: 10, l: 10 },
          { b: 10, r: 10 },
        ].map((pos, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              ...pos,
              width: 24,
              height: 24,
              borderTop: pos.t ? `2px solid ${COLORS.accent}` : undefined,
              borderBottom: pos.b ? `2px solid ${COLORS.accent}` : undefined,
              borderLeft: pos.l ? `2px solid ${COLORS.accent}` : undefined,
              borderRight: pos.r ? `2px solid ${COLORS.accent}` : undefined,
              opacity: panelEntrance,
            }}
          />
        ))}

        {/* Layer 3: Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: headlineEntrance }}>
          
          {/* Top Rule */}
          <div style={{ 
            width: '100%', 
            height: 1, 
            background: COLORS.ink, 
            marginBottom: 30, 
            transform: `scaleX(${headlineEntrance})`,
            transformOrigin: 'center'
          }} />

          {/* Main Headline - Letterpress Style */}
          <h1 style={{
            fontSize: TITLE_SIZE,
            fontFamily: '"Segoe UI Black", "Arial Black", sans-serif',
            color: COLORS.textMain,
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.1,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            textShadow: `2px 2px 0px rgba(0,0,0,0.1)`,
          }}>
            {headline || "MISSING HEADLINE"}
          </h1>

          {/* Separator Line */}
          <div style={{
            width: 60,
            height: 4,
            backgroundColor: COLORS.accent,
            margin: '30px 0',
            borderRadius: 2,
            transform: `scaleX(${interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
            transformOrigin: 'center',
          }} />

          {/* Subtitle */}
          {subtitle && (
            <div style={{
              fontSize: SUB_SIZE,
              fontFamily: '"Georgia", serif',
              color: COLORS.textSub,
              textAlign: 'center',
              fontStyle: 'italic',
              maxWidth: '90%',
              opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* Bottom Graphic Element: Abstract Compass/Rose */}
        <div style={{
          width: '100%',
          height: 40,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: interpolate(frame, [20, 45], [0, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke={COLORS.ink} strokeWidth="1" />
            <path d="M20 2 L20 38 M2 20 L38 20" stroke={COLORS.accent} strokeWidth="1" />
            <path d="M8 8 L32 32 M8 32 L32 8" stroke={COLORS.ink} strokeWidth="0.5" opacity="0.5" />
            <polygon points="20,10 23,17 20,20 17,17" fill={COLORS.highlight} />
            <polygon points="20,30 23,23 20,20 17,23" fill={COLORS.ink} opacity="0.6" />
            <polygon points="10,20 17,17 20,20 17,23" fill={COLORS.ink} opacity="0.6" />
            <polygon points="30,20 23,23 20,20 23,17" fill={COLORS.highlight} />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};
