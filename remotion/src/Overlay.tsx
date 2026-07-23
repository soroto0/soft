import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';

export type OverlayProps = { type: string; content: string; pos: string; dur: number; fps?: number; width?: number; height?: number; img?: string; items?: { label: string; img: string }[]; };

const useExit = (dur: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return interpolate(t, [dur - 0.3, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
};

const useEnter = (dur: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return interpolate(t, [0, 0.4], [0, 1], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
};

const formatCounter = (value: number) => {
  if (value < 1000) return Math.floor(value).toString();
  return value.toLocaleString('en-US');
};

const LowerThird = ({ content, exit, enter }: { content: string; exit: number; enter: number }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  // Animation logic
  const slideIn = interpolate(frame, [0, 40], [-width * 0.2, 0], {
    easing: Easing.out(Easing.ease),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
  
  const opacity = enter * exit;
  const scale = interpolate(enter, [0, 1], [0.95, 1]);

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start', padding: '80px 60px' }}>
      <div style={{ 
        transform: `translateX(${slideIn}px) scale(${scale})`, 
        opacity: opacity,
        display: 'flex',
        flexDirection: 'column',
        width: '60%',
        gap: '12px'
      }}>
        {/* Glow/Background Plate */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(90deg, rgba(232,163,61,0.15) 0%, rgba(20,20,20,0.0) 100%)', borderRadius: '4px' }} />
        
        {/* Main Text Container */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Accent Line */}
          <div style={{ 
            position: 'absolute', top: '50%', left: '-20px', width: '12px', height: '3px', background: '#e8a33d', boxShadow: '0 0 8px #e8a33d' 
          }} />
          
          <div style={{ 
            fontFamily: "'Segoe UI Black', 'Arial', sans-serif", 
            fontSize: '64px', 
            lineHeight: 1, 
            color: '#ffffff',
            textShadow: '0 4px 12px rgba(0,0,0,0.8)',
            letterSpacing: '-1px'
          }}>
            {content}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Counter = ({ content, exit, enter }: { content: string; exit: number; enter: number }) => {
  const frame = useCurrentFrame();

  // Parse content
  const match = content.match(/([^\d]*)([\d][\d,.\s]*)(.*)/);
  const prefix = match ? match[1] : '';
  const suffix = match ? match[3] : '';
  const rawNumStr = match ? match[2].replace(/[,\s]/g, '') : '0';
  const targetNum = parseFloat(rawNumStr) || 0;

  const currentVal = interpolate(frame, [0, 60], [0, targetNum], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const opacity = enter * exit;
  const scale = interpolate(enter, [0, 1], [0.8, 1]);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ 
        opacity: opacity,
        transform: `scale(${scale})`,
        textAlign: 'center',
        filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))'
      }}>
        <div style={{ 
          fontFamily: "'Segoe UI Black', 'Arial', sans-serif", 
          fontSize: '140px', 
          color: '#ffffff',
          textShadow: '0 0 40px rgba(232,163,61,0.3)'
        }}>
          {prefix}{formatCounter(currentVal)}{suffix}
        </div>
        <div style={{ 
          width: '100px', 
          height: '4px', 
          background: '#e8a33d', 
          margin: '20px auto 0', 
          borderRadius: '2px',
          boxShadow: '0 0 10px #e8a33d'
        }} />
      </div>
    </AbsoluteFill>
  );
};

const BarChart = ({ content, exit, enter }: { content: string; exit: number; enter: number }) => {
  const frame = useCurrentFrame();

  const items = content.split(',').map(pair => {
    const [label, val] = pair.split(':');
    return { label: label.trim(), val: parseFloat(val) };
  });

  const maxVal = Math.max(...items.map(i => i.val), 1);
  const opacity = enter * exit;
  const scale = interpolate(enter, [0, 1], [0.9, 1]);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
      <div style={{ 
        opacity: opacity,
        transform: `scale(${scale})`,
        width: '70%',
        maxWidth: '800px'
      }}>
        {items.map((item, idx) => {
          const barWidth = (item.val / maxVal) * 100;
          const animWidth = interpolate(frame, [idx * 10 + 10, idx * 10 + 40], [0, barWidth], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp'
          });

          return (
            <div key={idx} style={{ marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '150px', textAlign: 'right', paddingRight: '20px', color: '#ccc', fontFamily: "'Segoe UI', sans-serif", fontSize: '24px' }}>
                {item.label}
              </div>
              <div style={{ flex: 1, height: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', top: 0, left: 0, bottom: 0, width: `${animWidth}%`, 
                  background: 'linear-gradient(90deg, #e8a33d, #ffd27a)',
                  boxShadow: '0 0 15px rgba(232,163,61,0.5)',
                  transition: 'width 0.1s linear'
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Timeline = ({ content, exit, enter }: { content: string; exit: number; enter: number }) => {
  const frame = useCurrentFrame();

  const events = content.split(',').map(pair => {
    const [year, label] = pair.split(':');
    return { year: year.trim(), label: label.trim() };
  });

  const opacity = enter * exit;
  const scale = interpolate(enter, [0, 1], [0.9, 1]);

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '150px' }}>
      <div style={{ 
        opacity: opacity,
        transform: `scale(${scale})`,
        width: '80%',
        position: 'relative',
        height: '100px'
      }}>
        {/* Line */}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: 'rgba(255,255,255,0.2)' }} />
        
        {events.map((evt, idx) => {
          const xPos = (idx / (events.length - 1 || 1)) * 100;
          const dotAnim = interpolate(frame, [idx * 10 + 10, idx * 10 + 20], [0, 1], {
            easing: Easing.out(Easing.back(1.5)),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp'
          });

          return (
            <div key={idx} style={{ position: 'absolute', top: '50%', left: `${xPos}%`, transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ 
                width: '16px', height: '16px', borderRadius: '50%', 
                background: '#e8a33d', 
                boxShadow: '0 0 10px #e8a33d',
                transform: `scale(${dotAnim})`,
                marginBottom: '10px'
              }} />
              <div style={{ color: '#fff', fontFamily: "'Segoe UI Black', sans-serif", fontSize: '20px' }}>{evt.year}</div>
              <div style={{ color: '#aaa', fontFamily: "'Segoe UI', sans-serif", fontSize: '14px', marginTop: '4px' }}>{evt.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Callout = ({ content, pos, exit, enter }: { content: string; pos: string; exit: number; enter: number }) => {
  const { width, height } = useVideoConfig();

  // Parse position
  let x = 70, y = 55;
  if (pos.startsWith('point:')) {
    const parts = pos.replace('point:', '').split(',');
    if (parts.length === 2) {
      x = parseFloat(parts[0]);
      y = parseFloat(parts[1]);
    }
  }

  const opacity = enter * exit;
  const scale = interpolate(enter, [0, 1], [0.8, 1]);

  // Calculate absolute pixels for the pointer
  const pxX = (x / 100) * width;
  const pxY = (y / 100) * height;

  // Target box position (offset from point)
  const boxW = 300;
  const boxH = 80;
  let boxX = pxX + 40;
  let boxY = pxY - 40;

  // Keep in bounds roughly
  if (boxX + boxW > width) boxX = pxX - boxW - 40;
  if (boxY < 0) boxY = 20;
  if (boxY + boxH > height) boxY = height - boxH - 20;

  return (
    <AbsoluteFill>
      <div style={{ 
        opacity: opacity,
        transform: `translate(${pxX}px, ${pxY}px) scale(${scale})`,
        position: 'absolute',
        pointerEvents: 'none'
      }}>
        {/* Connector Line */}
        <svg width={Math.abs(boxX - pxX) + boxW} height={Math.abs(boxY - pxY) + boxH} style={{ position: 'absolute', top: -boxH/2, left: -boxW/2 }}>
           <line x1="0" y1={boxH/2} x2={boxW} y2={boxH/2} stroke="#e8a33d" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
        </svg>
        
        {/* The Box */}
        <div style={{ 
          position: 'absolute', top: -boxH/2, left: boxX > pxX ? 40 : -boxW - 40, 
          width: boxW, height: boxH,
          background: 'rgba(20,20,20,0.9)',
          border: '1px solid rgba(232,163,61,0.3)',
          borderRadius: '8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          transform: 'translate(-50%, -50%)' // Center on calculated anchor relative to SVG
        }}>
          <div style={{ 
            width: '4px', height: '40px', background: '#e8a33d', marginRight: '16px', borderRadius: '2px',
            boxShadow: '0 0 8px #e8a33d'
          }} />
          <span style={{ color: '#fff', fontFamily: "'Segoe UI', sans-serif", fontSize: '24px', lineHeight: 1.2 }}>
            {content}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Popup = ({ img, exit, enter }: { img: string; exit: number; enter: number }) => {
  const frame = useCurrentFrame();

  const opacity = enter * exit;
  const sway = Math.sin(frame * 0.05) * 10;
  const scale = interpolate(enter, [0, 1], [0.5, 1]);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ 
        opacity: opacity,
        transform: `scale(${scale}) rotate(${sway}deg)`,
        position: 'relative',
        filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.8))'
      }}>
        <Img src={img} style={{ maxHeight: '60vh', maxWidth: '80vw', borderRadius: '8px' }} />
        {/* Tactile shadow layer simulation */}
        <div style={{ 
          position: 'absolute', top: '20px', left: '20px', right: '-20px', bottom: '-20px', 
          background: 'rgba(0,0,0,0.4)', borderRadius: '8px', zIndex: -1 
        }} />
      </div>
    </AbsoluteFill>
  );
};

const Compare = ({ content, exit, enter }: { content: string; exit: number; enter: number }) => {

  const [left, right] = content.split('::').map(s => s.trim());
  
  const opacity = enter * exit;
  const scale = interpolate(enter, [0, 1], [0.9, 1]);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
      <div style={{ 
        opacity: opacity,
        transform: `scale(${scale})`,
        width: '90%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Left Box */}
        <div style={{ 
          flex: 1, background: 'rgba(20,20,20,0.8)', border: '1px solid rgba(255,255,255,0.1)', 
          borderRadius: '12px', padding: '40px', textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <div style={{ color: '#fff', fontFamily: "'Segoe UI Black', sans-serif", fontSize: '48px', lineHeight: 1.2 }}>
            {left}
          </div>
        </div>

        {/* Connector */}
        <div style={{ width: '100px', height: '2px', background: 'linear-gradient(90deg, transparent, #e8a33d, transparent)', margin: '0 20px' }} />

        {/* Right Box */}
        <div style={{ 
          flex: 1, background: 'rgba(20,20,20,0.8)', border: '1px solid rgba(255,255,255,0.1)', 
          borderRadius: '12px', padding: '40px', textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <div style={{ color: '#fff', fontFamily: "'Segoe UI Black', sans-serif", fontSize: '48px', lineHeight: 1.2 }}>
            {right}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Banner = ({ content, exit, enter }: { content: string; exit: number; enter: number }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();

  const opacity = enter * exit;
  const slideDown = interpolate(frame, [0, 30], [-height, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: '40px' }}>
      <div style={{ 
        transform: `translateY(${slideDown}px)`,
        opacity: opacity,
        background: 'linear-gradient(180deg, #f0f0f0 0%, #dcdcdc 100%)',
        width: '90%',
        padding: '20px 40px',
        borderRadius: '8px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          color: '#111', 
          fontFamily: "'Segoe UI Black', sans-serif", 
          fontSize: '42px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          {content}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Collage = ({ items, exit, enter }: { items: { label: string; img: string }[]; exit: number; enter: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = Math.max(items.length, 1);

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* архивная "миллиметровка" — фон в духе документальных архивов */}
      <AbsoluteFill style={{
        opacity: 0.5 * enter,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '38px 38px',
        background: 'rgba(8,8,11,0.55)',
      }} />
      <div style={{ display: 'flex', gap: 36, opacity: exit, zIndex: 1 }}>
        {items.slice(0, 3).map((it, idx) => {
          const start = idx * 8;
          const pop = interpolate(frame, [start, start + 22], [0, 1], {
            easing: Easing.out(Easing.back(1.6)),
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          const settle = Math.sin(Math.max(frame - start - 22, 0) / fps * 1.1 + idx) * 1.2;
          return (
            <div key={idx} style={{
              opacity: interpolate(frame, [start, start + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              transform: `scale(${Math.max(pop, 0.001)}) rotate(${(idx % 2 ? 1 : -1) * 2 + settle}deg)`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                background: '#fff', padding: 10, borderRadius: 3,
                boxShadow: '0 24px 50px rgba(0,0,0,0.6)',
              }}>
                <Img src={it.img} style={{ width: 300, height: 200, objectFit: 'cover', display: 'block' }} />
              </div>
              <div style={{
                background: 'linear-gradient(180deg,#3a2a12,#211508)',
                border: '1px solid rgba(232,163,61,0.5)',
                color: '#ffd27a', fontFamily: "'Segoe UI Semibold', sans-serif",
                fontSize: 18, padding: '8px 18px', borderRadius: 6,
                letterSpacing: 0.5, boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
              }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const TitleCard = ({ content, exit, enter }: { content: string; exit: number; enter: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [head, sub] = content.split('::');
  const words = head.trim().split(/\s+/);

  const barWidth = interpolate(frame, [0, 18], [0, 1], {
    easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const subOp = interpolate(frame, [words.length * 4 + 14, words.length * 4 + 30], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }) * enter;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', background: `rgba(0,0,0,${0.35 * enter})` }}>
      <div style={{ opacity: exit, textAlign: 'center', maxWidth: '84%' }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 20px',
          fontFamily: "'Segoe UI Black', sans-serif", fontSize: 78, lineHeight: 1.05,
          textTransform: 'uppercase', color: '#fff',
        }}>
          {words.map((w, i) => {
            const start = i * 4;
            const k = interpolate(frame, [start, start + 14], [0, 1], {
              easing: Easing.out(Easing.back(1.8)),
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });
            return (
              <span key={i} style={{
                display: 'inline-block',
                opacity: interpolate(frame, [start, start + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                transform: `scale(${Math.max(0.001, interpolate(k, [0, 1], [1.6, 1]))}) translateY(${(1 - k) * 30}px)`,
                textShadow: '0 8px 30px rgba(0,0,0,0.7)',
              }}>{w}</span>
            );
          })}
        </div>
        <div style={{
          width: 140 * barWidth, height: 5, background: 'linear-gradient(90deg,#e8a33d,#ffd27a)',
          margin: '22px auto 0', borderRadius: 3, boxShadow: '0 0 16px rgba(232,163,61,0.6)',
        }} />
        {sub && (
          <div style={{
            opacity: subOp, marginTop: 18, fontFamily: "'Segoe UI', sans-serif",
            fontSize: 26, color: '#e6e6ee', letterSpacing: 1,
          }}>{sub.trim()}</div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export const Overlay: React.FC<OverlayProps> = (p) => {
  const exit = useExit(p.dur);
  const enter = useEnter(p.dur);

  switch (p.type) {
    case 'lower3':
      return <LowerThird content={p.content} exit={exit} enter={enter} />;
    case 'counter':
      return <Counter content={p.content} exit={exit} enter={enter} />;
    case 'bars':
    case 'infographic':
      return <BarChart content={p.content} exit={exit} enter={enter} />;
    case 'timeline':
      return <Timeline content={p.content} exit={exit} enter={enter} />;
    case 'callout':
      return <Callout content={p.content} pos={p.pos} exit={exit} enter={enter} />;
    case 'popup':
      return <Popup img={p.img ?? ''} exit={exit} enter={enter} />;
    case 'compare':
      return <Compare content={p.content} exit={exit} enter={enter} />;
    case 'banner':
      return <Banner content={p.content} exit={exit} enter={enter} />;
    case 'collage':
      return <Collage items={p.items ?? []} exit={exit} enter={enter} />;
    case 'titlecard':
      return <TitleCard content={p.content} exit={exit} enter={enter} />;
    default:
      return <AbsoluteFill />;
  }
};
