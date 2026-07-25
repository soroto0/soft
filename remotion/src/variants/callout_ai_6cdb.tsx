import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

export const CalloutAi6CDB: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const dur = p.dur ?? 5;
  
  // Theme Colors: Aged Ivory on Deep Charcoal
  const IVORY = '#F2EBE1';
  const CHARCOAL = '#1A1D20';
  const ACCENT_RED = '#8B3A3A';
  const MOUNT_COLOR = '#EAE4D9';

  // Parse Position: Point X,Y in percents. Default 70,55.
  let targetX = 70;
  let targetY = 55;
  if (p.pos && p.pos.startsWith('point:')) {
    try {
      const [x, y] = p.pos.split(':').pop()!.split(',').map(Number);
      if (!isNaN(x) && !isNaN(y)) { targetX = x; targetY = y; }
    } catch {}
  }

  const tx = (targetX / 100) * width;
  const ty = (targetY / 100) * height;

  // Box Placement: Anchored to the right side of the screen for this variant
  // to contrast with a left-originating pointer.
  const BOX_W = 340;
  const BOX_H = 140;
  const BOX_X = Math.min(tx + 60, width - BOX_W - 40); // Don't go off screen
  const BOX_Y = ty - (BOX_H / 2);

  // Animation Timings
  const ANIM_DUR_IN = 15; // frames
  const ANIM_DUR_OUT = 10; // frames
  const FADE_OUT_START = dur * fps - (0.3 * fps);

  // Entrance Motion (Slide + Scale)
  const progressIn = Math.min(frame / ANIM_DUR_IN, 1);
  const easedIn = interpolate(progressIn, [0, 0.7, 1], [0, 1, 0.95], { easing: Easing.out(Easing.back(1.5)), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  
  // Exit Motion
  const progressOut = frame >= FADE_OUT_START ? Math.min((frame - FADE_OUT_START) / ANIM_DUR_OUT, 1) : 0;
  const slideOutOffset = interpolate(progressOut, [0, 1], [0, 40], { easing: Easing.in(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacityExit = interpolate(progressOut, [0, 1], [1, 0], { easing: Easing.linear, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Combined Opacity for all layers
  const layerOpacity = p.enter * p.exit * opacityExit;

  if (layerOpacity <= 0.01) return null;

  // SVG Filters & Gradients Definition
  const Filters = () => (
    <svg width="0" height="0">
      <defs>
        {/* Subtle paper texture */}
        <filter id="paperGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.08" />
          </feComponentTransfer>
        </filter>
        {/* Soft shadow for depth */}
        <filter id="softDrop" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.4" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );

  // Pointer Geometry
  const startNodeCx = tx;
  const startNodeCy = ty;
  const endNodeCx = BOX_X;
  const endNodeCy = BOX_Y + (BOX_H / 2); // Connect to middle-left of box
  
  // Calculate line segment points
  // We want an "L" shaped leader or a straight angled leader? 
  // For "Archival/Museum", a straight leader often looks cleaner if angle is shallow, 
  // but an angled path with a distinct vertex looks more technical. Let's do a slight curve or just straight for precision.
  // Straight line from Target -> Box Edge.
  const linePath = `M ${startNodeCx} ${startNodeCy} L ${endNodeCx} ${endNodeCy}`;

  // Content Rendering
  const mainText = p.content || "Subject Identified";
  const subText = "Archival Reference Data"; // Hardcoded secondary context for documentary feel

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Filters />
      
      {/* Main Container Group */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: width,
        height: height,
        transform: `translate(${slideOutOffset}px, 0px)`,
        opacity: layerOpacity,
        pointerEvents: 'none',
      }}>
        
        {/* Layer 1: Leader Line & Target Node */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          {/* The Line */}
          <path d={linePath} fill="none" stroke={CHARCOAL} strokeWidth="2" strokeLinecap="round" filter="url(#softDrop)" opacity="0.6" />
          
          {/* Inner dashed accent line for that blueprint/archival look */}
          <path d={linePath} fill="none" stroke={ACCENT_RED} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.8" />

          {/* Target Circle at Source */}
          <circle cx={startNodeCx} cy={startNodeCy} r="6" fill="none" stroke={CHARCOAL} strokeWidth="2" />
          <circle cx={startNodeCx} cy={startNodeCy} r="2" fill={ACCENT_RED} />
          
          {/* Connection Node at Box */}
          <rect x={endNodeCx - 4} y={endNodeCy - 4} width="8" height="8" fill={IVORY} stroke={CHARCOAL} strokeWidth="1" transform={`rotate(45 ${endNodeCx} ${endNodeCy})`} />
        </svg>

        {/* Layer 2: The Photo Frame / Mount Card */}
        <div style={{
          position: 'absolute',
          left: BOX_X,
          top: BOX_Y,
          width: BOX_W,
          height: BOX_H,
          backgroundColor: CHARCOAL,
          borderRadius: '2px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          transform: `scale(${easedIn})`,
          transformOrigin: 'left center',
        }}>
          {/* Cream Mount Background */}
          <div style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            bottom: 8,
            backgroundColor: MOUNT_COLOR,
            borderLeft: `1px solid ${ACCENT_RED}`, // Red rule like a museum tag
            filter: 'url(#paperGrain)' // Apply grain to the mount
          }} />

          {/* Text Content Overlay */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            padding: '20px 20px 20px 28px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            fontFamily: '"Palatino Linotype", "Bookman Old Style", serif',
            color: CHARCOAL,
            textShadow: '0px 1px 0px rgba(255,255,255,0.5)'
          }}>
            
            {/* Header / Category Kicker - subtle and technical */}
            <div style={{
              fontFamily: '"Bahnschrift", sans-serif',
              fontSize: '10px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: ACCENT_RED,
              marginBottom: '8px',
              borderBottom: `1px solid ${CHARCOAL}`,
              paddingBottom: '4px',
              opacity: 0.8
            }}>
              {subText}
            </div>

            {/* Main Caption */}
            <div style={{
              fontSize: '22px',
              lineHeight: '1.2',
              fontWeight: 'normal',
              fontStyle: 'italic',
              maxWidth: '90%'
            }}>
              "{mainText}"
            </div>

            {/* Decorative element: Corner crosshair or similar archival mark */}
            <div style={{
              marginTop: 'auto',
              width: '20px',
              height: '20px',
              borderRight: '1px solid rgba(0,0,0,0.3)',
              borderTop: '1px solid rgba(0,0,0,0.3)',
              alignSelf: 'flex-end'
            }} />
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
};
