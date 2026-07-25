import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

export const Lower3Ai381C: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  // Configuration
  const fontSize = Math.max(24, Math.min(height * 0.035, 40));
  const lineHeight = 1.4;
  const padX = 24;
  const stripeWidth = 6;
  
  // Colors: Manila card palette
  const colorStripe = '#A32828'; // Dark archival red
  const colorCard = '#F5F1E1';   // Aged manila/cream
  const colorText = '#1A1A1A';   // Faded ink black

  // Entrance Animation: Slide up + Fade in
  // Uses p.enter for opacity and sync.
  // Uses internal interpolation for the slide position to create a "drawer" effect.
  const slideProgress = interpolate(frame, [0, Math.max(1, fps * 0.35)], [0, 1], {
    easing: Easing.linear,
  });

  // Exit Animation handled by opacity only (p.exit), keeping the slide steady
  // until it drops out, or we can make it slide down. Let's make it drop down
  // slightly to feel like it's being pulled away.
  const exitSlide = interpolate(p.exit, [0, 1], [0, -1], {
    easing: Easing.linear,
  });

  const totalSlideOffset = slideProgress < 1 
    ? (height * 1.2) * (1 - slideProgress) // Enters from below
    : (exitSlide * height * 0.5); // Exits further below

  const yOffset = height + totalSlideOffset;
  const opacity = p.enter * p.exit;
  
  if (opacity <= 0.01 || yOffset > height + 10) return null;

  // Text Wrapping Logic
  const words = (p.content || '').split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  // Approximate character width for monospace-ish behavior
  const charWidth = fontSize * 0.6; 
  const availableWidth = width * 0.6; 

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length * charWidth > availableWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineCount = Math.max(lines.length, 1);
  const textHeight = fontSize * lineHeight * lineCount;
  const cardHeight = textHeight + (padX * 2);
  const cardWidth = (width * 0.65) - stripeWidth; // Leave margin on right

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* The Card Container */}
      <div
        style={{
          position: 'absolute',
          bottom: 60, // Base anchor from bottom
          transform: `translateY(${totalSlideOffset}px)`,
          opacity,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* Carbon Copy Shadow */}
        <div
          style={{
            position: 'relative',
            width: cardWidth,
            height: cardHeight,
            backgroundColor: 'transparent',
            boxShadow: '4px 6px 12px rgba(0,0,0,0.15)',
            transform: 'translate(2px, 3px)',
            filter: 'blur(1px)',
            zIndex: 1,
          }}
        />

        {/* The Manila Card */}
        <div
          style={{
            position: 'relative',
            width: cardWidth,
            height: cardHeight,
            backgroundColor: colorCard,
            zIndex: 2,
            display: 'flex',
            flexDirection: 'row',
            overflow: 'hidden',
            borderLeft: `${stripeWidth}px solid ${colorStripe}`,
          }}
        >
          {/* Texture Grain Overlay (CSS pattern simulation) */}
          <div 
            style={{ 
              position: 'absolute', 
              inset: 0, 
              opacity: 0.03, 
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              pointerEvents: 'none'
            }} 
          />

          {/* Red Index Stripe Accent */}
          <div 
             style={{
               width: stripeWidth,
               height: '100%',
               backgroundColor: colorStripe,
               flexShrink: 0,
             }} 
          />

          {/* Content Area */}
          <div
            style={{
              flex: 1,
              padding: `${padX}px ${padX + stripeWidth}px`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              zIndex: 3,
            }}
          >
            {lines.map((line, i) => (
              <div
                key={i}
                style={{
                  fontFamily: '"Courier New", Courier, monospace', // Typewriter feel
                  fontWeight: 700,
                  fontSize: fontSize,
                  lineHeight: lineHeight,
                  color: colorText,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                {line}
              </div>
            ))}
          </div>
          
          {/* Subtle Stamp/Seal graphic in corner (optional flair) */}
          <div 
             style={{
               position: 'absolute',
               right: padX,
               bottom: padX / 2,
               width: 24,
               height: 24,
               borderRadius: '50%',
               border: `1px solid ${colorText}`, // Using text color for subtle seal
               opacity: 0.3,
               transform: 'rotate(-15deg)',
             }} 
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
