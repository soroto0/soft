import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { VariantProps } from '../types';

export const BarsAiFCF3: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  // Parse content
  const items = p.content
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [label, valueStr] = pair.split(':');
      return { label: label?.trim() || '', value: parseFloat(valueStr || '0') };
    });

  if (!items.length) return null;

  // Animation timings
  const slideStart = 0;
  const slideDuration = 45; // ~1.5s sweep
  
  // Determine visual max for normalization
  const maxVal = Math.max(...items.map((i) => i.value), 1);
  
  // Opacity envelope is handled by props
  const globalOpacity = Math.min(p.enter * p.exit, 1);
  if (globalOpacity <= 0.001) return null;

  // --- Styles & Theme Constants ---
  const styles = {
    root: {
      backgroundColor: 'rgba(0, 12, 18, 0.6)', // Deep charcoal/vignette
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      fontFamily: "'Bahnschrift', sans-serif",
      color: '#e0f7fa',
      overflow: 'hidden' as const,
      position: 'relative' as const,
      WebkitFontSmoothing: 'antialiased' as const,
      MozOsxFontSmoothing: 'grayscale' as const,
    },
    container: {
      width: '90%',
      maxWidth: 800,
      position: 'relative' as const,
      zIndex: 2,
    },
    barLabel: {
      fontSize: Math.max(14, Math.min(width * 0.015, 24)),
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      marginBottom: 6,
      textAlign: 'left' as const,
      color: '#80deea',
      opacity: 0.9,
      textShadow: '0 0 8px rgba(0, 229, 255, 0.4)',
    },
    barTrack: {
      height: 24,
      background: 'rgba(0, 20, 30, 0.5)',
      border: '1px solid #005f73',
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
      position: 'relative' as const,
      clipPath: 'polygon(0 0, 100% 0, 100% 100%, 15% 100%, 0 calc(100% - 10px))',
      marginBottom: 16,
    },
    barFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #003049, #0077b6, #00b4d8)',
      position: 'absolute' as const,
      left: 0,
      top: 0,
      transition: 'none',
      boxShadow: '0 0 15px rgba(0, 180, 216, 0.6), inset 0 0 2px rgba(255,255,255,0.5)',
      clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0)', // Standard rect inside clipped parent
    },
    valueText: {
      position: 'absolute' as const,
      right: 12,
      top: -28,
      fontFamily: "'Consolas', monospace",
      fontSize: 16,
      color: '#90eeff',
      textShadow: '0 0 5px #00ffff',
    },
    scanlineOverlay: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 229, 255, 0.05) 2px,
        rgba(0, 229, 255, 0.05) 4px
      )`,
      pointerEvents: 'none' as const,
      zIndex: 1,
    },
    svgFilters: {
      position: 'absolute' as const,
      width: 0,
      height: 0,
    }
  };

  return (
    <AbsoluteFill style={styles.root}>
      {/* SVG Filters for Glow and Noise */}
      <svg style={styles.svgFilters}>
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" result="noise"/>
            <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise"/>
            <feComponentTransfer in="monoNoise" result="visibleNoise">
               <feFuncA type="linear" slope="0.15"/>
            </feComponentTransfer>
            <feBlend in="SourceGraphic" in2="visibleNoise" mode="screen" />
          </filter>
        </defs>
      </svg>

      {/* CRT Scanlines Layer */}
      <div style={styles.scanlineOverlay} />

      {/* Main Content Container with Noise Overlay */}
      <div style={styles.container} className="filter-noise-wrapper">
        
        {/* Animated Glowing Needle/Head */}
        {/* Calculated position based on global frame progress of the slide */}
        <div 
          style={{
            position: 'absolute' as const,
            top: 0,
            bottom: 0,
            left: 0,
            width: 4,
            background: 'linear-gradient(to bottom, transparent, #00ffff, transparent)',
            transform: `translateX(${interpolate(frame, [slideStart, slideStart + slideDuration], [-width, width * 1.2], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
            opacity: globalOpacity,
            filter: 'url(#glow)',
            zIndex: 10,
            pointerEvents: 'none' as const,
          }}
        />

        {/* The Bars */}
        {items.map((item, i) => {
          // Individual item animation timing
          const itemStart = slideStart + (i * 15);
          const itemSlideEnd = itemStart + slideDuration;
          
          // How far through this item's specific slide are we? (0 to 1)
          const itemProgressRaw = interpolate(frame, [itemStart, itemSlideEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

          // Width calculation
          const targetWidthPercent = (item.value / maxVal) * 90;
          const currentWidth = targetWidthPercent * itemProgressRaw;

          // Tick effect: Show value only after sweep passes
          const valueVisible = frame > itemStart + (slideDuration * 0.8);

          return (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={styles.barLabel}>{item.label}</div>
              <div style={styles.barTrack}>
                <div 
                  style={{
                    ...styles.barFill,
                    width: `${currentWidth}%`,
                  }}
                />
                
                {/* Value Label appearing at the end of the sweep */}
                {valueVisible && (
                  <div style={{
                    ...styles.valueText,
                    opacity: interpolate(frame, [itemStart + (slideDuration*0.8), itemStart + (slideDuration*0.8) + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                  }}>
                    {item.value}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Static Grid Lines overlaying the bars for technical look */}
        <div style={{
          position: 'absolute' as const,
          top: -20,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            linear-gradient(90deg, rgba(0,229,255,0.1) 1px, transparent 1px),
            linear-gradient(0deg, rgba(0,229,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '10% 25%',
          pointerEvents: 'none' as const,
          zIndex: 1,
        }} />

      </div>

      {/* Global Vignette / Dark Edges */}
      <div style={{
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        boxShadow: 'inset 0 0 150px rgba(0,0,0,0.9)',
        pointerEvents: 'none' as const,
        zIndex: 5,
      }} />
    </AbsoluteFill>
  );
};
