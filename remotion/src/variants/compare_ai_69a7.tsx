import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { VariantProps } from '../types';

export const CompareAi69A7: React.FC<VariantProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Fixed hex values for the "Field Notebook" aesthetic
  const C_BG = '#F2F0E9';      // Aged paper
  const C_INK = '#3B3C36';     // Deep olive charcoal
  const C_GRID = 'rgba(59, 60, 54, 0.15)';
  // Зазор каждой половины от осевой линии, в пикселях кадра, а не в
  // процентах: две подписи не должны соприкасаться даже когда обе
  // короткие и обе доезжают до центра.
  const GUTTER = Math.round(width * 0.035);

  // Parse Content
  const parts = p.content?.split('::') || ['', ''];
  const leftText = parts[0] || '';
  const rightText = parts[1] || '';

  // Motion Configs
  // Slide in from opposite edges
  const slideLeft = interpolate(frame, [0, 40], [-100, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  const slideRight = interpolate(frame, [0, 40], [100, 0], {
    easing: Easing.out(Easing.back(1.5)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Divider Draw. Было [30,80]: оверлей живёт 90 кадров и с 81-го уже
  // гаснет, поэтому линия НИ НА ОДНОМ видимом кадре не была дочерчена —
  // на середине ролика от неё торчал огрызок в 9%. Рисуем её сразу за
  // текстом и заканчиваем задолго до ухода.
  const dividerProgress = interpolate(frame, [10, 45], [0, 1], {
    easing: Easing.quad,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fade global based on p.enter and p.exit
  const globalOpacity = p.enter * p.exit;

  // Helper to render lines for the graph paper grid
  const renderGrid = () => {
    const gridSize = 24;
    const items = [];
    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      items.push(
        <div
          key={`v-${x}`}
          style={{
            position: 'absolute',
            top: 0,
            left: x,
            bottom: 0,
            width: 1,
            background: C_GRID,
            transform: `translateX(-${0.5}px)`, // Center line
          }}
        />
      );
    }
    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      items.push(
        <div
          key={`h-${y}`}
          style={{
            position: 'absolute',
            left: 0,
            top: y,
            right: 0,
            height: 1,
            background: C_GRID,
            transform: `translateY(-${0.5}px)`, // Center line
          }}
        />
      );
    }
    return items;
  };

  return (
    <>
      <style>{`
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -10%); }
          20% { transform: translate(-15%, 5%); }
          30% { transform: translate(7%, -25%); }
          40% { transform: translate(-5%, 25%); }
          50% { transform: translate(-15%, 10%); }
          60% { transform: translate(15%, 0%); }
          70% { transform: translate(0%, 15%); }
          80% { transform: translate(3%, 35%); }
          90% { transform: translate(-10%, 10%); }
        }
      `}</style>
      
      {/* SVG Filters for Texture */}
      <svg width="0" height="0">
        <defs>
          <filter id="roughEdge">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="6" />
          </filter>
          <filter id="grainTexture">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>

      <AbsoluteFill style={{ opacity: globalOpacity }}>
        
        {/* Layer 1: Base Paper Panel */}
        <div 
          style={{
            position: 'absolute',
            inset: '10%',
            backgroundColor: C_BG,
            boxShadow: '0 10px 30px rgba(0,0,0,0.3), inset 0 0 40px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            filter: 'url(#roughEdge)',
          }}
        >
          {/* Grid Background */}
          {renderGrid()}
          
          {/* Subtle Grain Overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.1\'/%3E%3C/svg%3E")',
            pointerEvents: 'none',
            mixBlendMode: 'multiply',
          }} />

          {/* Layer 2: Divider Line */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '15%',
            bottom: '15%',
            width: 1,
            backgroundColor: C_INK,
            transformOrigin: 'top',
            transform: `scaleY(${dividerProgress})`,
            opacity: 0.6,
          }} />

          {/* Layer 3: Content.
              alignItems:center — без него содержимое обеих половин липло к
              ВЕРХНЕМУ краю листа, а под ним оставалось четыре пятых пустой
              бумаги: композиция читалась как незагруженная страница.
              GUTTER — зазор от осевой линии. Без него короткие подписи
              смыкались вплотную («СЛЕВА» + «СПРАВА» = «СЛЕВАСПРАВА»), и
              заодно оба ряда карандашных штрихов сходились в одну кучу
              ровно на разделителе. */}
          <div style={{
            display: 'flex', alignItems: 'center',
            width: '100%', height: '100%', padding: '40px',
          }}>

            {/* Left Side */}
            <div style={{ flex: 1, paddingRight: GUTTER, transform: `translateX(${slideLeft}px)` }}>
              {/* Pencil Tick Marks */}
              <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: '3px', marginBottom: '12px', opacity: 0.7
              }}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} style={{ width: 12, height: 2, backgroundColor: C_INK }} />
                ))}
              </div>

              <h2 style={{
                fontFamily: '"Courier New", Consolas, monospace',
                // 2.4vw на лист в 80% кадра — подпись мельче собственной
                // миллиметровки, лист читался как пустой
                fontSize: '3.4vw',
                fontWeight: 'bold',
                color: C_INK,
                margin: 0,
                lineHeight: 1.2,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                textAlign: 'right',
              }}>
                {leftText}
              </h2>
            </div>

            {/* Right Side */}
            <div style={{ flex: 1, paddingLeft: GUTTER, transform: `translateX(${slideRight}px)` }}>
              {/* Pencil Tick Marks */}
              <div style={{
                display: 'flex', justifyContent: 'flex-start', gap: '3px', marginBottom: '12px', opacity: 0.7
              }}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} style={{ width: 12, height: 2, backgroundColor: C_INK }} />
                ))}
              </div>

              <h2 style={{
                fontFamily: '"Courier New", Consolas, monospace',
                // 2.4vw на лист в 80% кадра — подпись мельче собственной
                // миллиметровки, лист читался как пустой
                fontSize: '3.4vw',
                fontWeight: 'bold',
                color: C_INK,
                margin: 0,
                lineHeight: 1.2,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                textAlign: 'left',
              }}>
                {rightText}
              </h2>
            </div>
          </div>

        </div>

        {/* Decorative Pin. Лежал ВНУТРИ листа с top:-20px, а у листа
            overflow:hidden под миллиметровку — от кнопки оставалась
            четырёхпиксельная дуга у верхней кромки, читавшаяся как
            артефакт. Поэтому кнопка вынесена наружу листа и сама
            наезжает на его край. */}
        <div style={{
          position: 'absolute',
          top: 'calc(10% - 12px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: `2px solid ${C_INK}`,
          backgroundColor: C_BG,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }} />
      </AbsoluteFill>
    </>
  );
};
