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

  // Box Placement.
  // Раньше карточка ставилась только справа от точки и «не выезжала за
  // кадр» через Math.min. Но точка по умолчанию стоит на 70% ширины, и
  // ограничитель прижимал карточку ВПЛОТНУЮ к ней: выноска схлопывалась в
  // четыре пикселя, а кружок-цель уезжал ПОД карточку — весь смысл
  // выноски пропадал. Поэтому если справа места нет, карточка
  // переезжает ВЛЕВО от точки, а выноска цепляется к её ближнему краю.
  const BOX_W = 340;
  const BOX_H = 140;
  const LEAD = 90;              // минимальная длина выноски
  const EDGE = 40;              // отступ карточки от кромки кадра
  const onRight = tx + LEAD + BOX_W + EDGE <= width;
  const BOX_X = onRight
    ? tx + LEAD
    : Math.max(EDGE, tx - LEAD - BOX_W);
  // По вертикали тоже с ограничителем: точку в углу кадра карточка иначе
  // догоняла верхней или нижней кромкой и обрезалась.
  const BOX_Y = Math.min(Math.max(ty - BOX_H / 2, EDGE), height - BOX_H - EDGE);

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
        {/* feTurbulence ГЕНЕРИРУЕТ шум и не принимает исходник на вход:
            без обратного сведения с SourceGraphic фильтр ЗАМЕНЯЛ подложку
            шумом целиком. Кремовая подложка исчезала, оставалась тёмная
            рамка с тёмным текстом — надпись была нечитаема. */}
        <filter id="paperGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
          <feComponentTransfer in="mono" result="grain">
            <feFuncA type="linear" slope="0.08" />
          </feComponentTransfer>
          <feComposite in="grain" in2="SourceGraphic" operator="in" result="masked" />
          <feBlend in="SourceGraphic" in2="masked" mode="multiply" />
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
  // Цепляемся за тот край карточки, который смотрит на точку
  const endNodeCx = onRight ? BOX_X : BOX_X + BOX_W;
  const endNodeCy = BOX_Y + (BOX_H / 2);
  
  // Calculate line segment points
  // We want an "L" shaped leader or a straight angled leader? 
  // For "Archival/Museum", a straight leader often looks cleaner if angle is shallow, 
  // but an angled path with a distinct vertex looks more technical. Let's do a slight curve or just straight for precision.
  // Straight line from Target -> Box Edge.
  const linePath = `M ${startNodeCx} ${startNodeCy} L ${endNodeCx} ${endNodeCy}`;

  // Content Rendering
  const mainText = p.content || "Без подписи";
  // Служебная строка-«шапка» музейной этикетки. Была захардкожена
  // по-английски — в русском ролике латиница в кадре читается как чужой
  // ассет. Смысла в ней нет, только ритм этикетки, поэтому просто
  // по-русски.
  const subText = "Архивная справка";

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
          // Наезд масштаба идёт от того края, к которому пришла выноска:
          // иначе карточка «отрывается» от линии на входе
          transformOrigin: onRight ? 'left center' : 'right center',
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
              // 10px на кадре 720p — это полтора пикселя штриха, шапка
              // этикетки превращалась в серую царапину
              fontSize: '13px',
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
