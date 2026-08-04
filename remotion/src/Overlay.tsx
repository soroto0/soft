import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { VARIANTS, DECOR } from './variants/_registry';
import type { OverlayProps } from './types';

// тип переехал в types.ts (варианты не могут тянуть его отсюда — вышел бы
// цикл импортов), но реэкспортируем: на него ссылается Root.tsx
export type { OverlayProps };

// Единственное место с "брендовыми" цветами — Gemini подбирает под тему
// видео и переписывает ТОЛЬКО этот объект (тонкая, низкорисковая правка),
// вместо генерации всего файла заново (что оказалось ненадёжным: логика
// компонентов ломалась/игнорировалась). accentRgb — то же, что accent, но
// как "r,g,b" для использования внутри rgba(...).
const THEME = {
  accent: '#00C8D4',
  accentLight: '#7EE8D0',
  accentRgb: '0,200,212',
  bannerFrom: '#D6EAF7',
  bannerTo: '#BDD8E8',
  bannerText: '#0A1F2E',
  kickerFrom: '#0E2A35',
  kickerTo: '#163D4D',
};

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

// Светимость цвета вида "#rrggbb" по WCAG. Нужна там, где текст ложится НА
// акцентный цвет: сам акцент переписывается под каждый ролик (см. THEME), и
// то, что читалось на ярком бирюзовом, на тёмно-синем становится тёмным по
// тёмному. Замерено: подписи выходили с контрастом 1.2:1.
const _lum = (hex: string): number => {
  const h = hex.replace('#', '');
  const v = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};

// Чернила, читаемые НА заданном фоне: тёмные на светлом, белые на тёмном.
// Порог 0.35 — по замеру контраста против обоих вариантов.
const inkOn = (bg: string): [number, number, number] =>
  _lum(bg) > 0.35 ? [8, 26, 30] : [255, 255, 255];

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
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(90deg, rgba(${THEME.accentRgb},0.15) 0%, rgba(20,20,20,0.0) 100%)`, borderRadius: '4px' }} />

        {/* Main Text Container */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Accent Line */}
          <div style={{
            position: 'absolute', top: '50%', left: '-20px', width: '12px', height: '3px', background: THEME.accent, boxShadow: `0 0 8px ${THEME.accent}`
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

// Второй вариант lower3 — минималистичный: без светящейся плашки-фона,
// текст стоит на месте и слегка приподнимается, а под ним САМОСТОЯТЕЛЬНО
// «дорисовывается» акцентная линия (scaleX 0->1, transform-origin left —
// allowlisted-safe трансформ, не clip-path). Другая техника входа
// (растёт черта, а не едет плашка), другой силуэт (нет фона совсем).
const LowerThirdUnderline = ({ content, exit, enter }: { content: string; exit: number; enter: number }) => {
  const frame = useCurrentFrame();
  const opacity = enter * exit;
  const rise = interpolate(frame, [0, 18], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
  const lineScale = interpolate(frame, [6, 26], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start', padding: '90px 70px' }}>
      <div style={{ transform: `translateY(${rise}px)`, opacity, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{
          fontFamily: "'Segoe UI Black', 'Arial', sans-serif",
          fontSize: '52px',
          lineHeight: 1,
          color: '#ffffff',
          textShadow: '0 3px 14px rgba(0,0,0,0.85)',
          letterSpacing: '-0.5px'
        }}>
          {content}
        </div>
        <div style={{
          width: '140px',
          height: '5px',
          background: THEME.accent,
          borderRadius: '2px',
          transform: `scaleX(${lineScale})`,
          transformOrigin: 'left center',
          boxShadow: `0 0 10px ${THEME.accent}`
        }} />
      </div>
    </AbsoluteFill>
  );
};

const Counter = ({ content, exit, enter }: { content: string; exit: number; enter: number }) => {
  const frame = useCurrentFrame();

  // Parse content
  const match = content.match(/([^\d]*)([\d][\d,.\s]*)(.*)/);
  const prefix = match ? match[1] : '';
  // Пробел между числом и единицей. Группа числа жадная и захватывает \s,
  // поэтому «1,200 acres» распадалось на «1,200 » и «acres», а в кадр уходило
  // слипшееся «1,200acres». Хвостовой пробел возвращаем единице измерения;
  // там, где его не было («270°F»), ничего не меняется.
  const suffix = match ? (match[2].match(/\s+$/)?.[0] ?? '') + match[3] : '';
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
          textShadow: `0 0 40px rgba(${THEME.accentRgb},0.3)`
        }}>
          {prefix}{formatCounter(currentVal)}{suffix}
        </div>
        <div style={{
          width: '100px',
          height: '4px',
          background: THEME.accent,
          margin: '20px auto 0',
          borderRadius: '2px',
          boxShadow: `0 0 10px ${THEME.accent}`
        }} />
      </div>
    </AbsoluteFill>
  );
};

// Хеш строки -> целое число. НЕ Math.random(): рендер должен быть
// воспроизводим по времени (детерминизм) — тот же content всегда даёт тот
// же угол наклона и тот же угол экрана, но РАЗНЫЙ content (разные счётчики
// в одном видео, разные видео) даёт разные значения без единой лишней
// переменной в пропсах.
const _hashStr = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

// Бирка «рваная бумага/лента» — референс из документалок с бумажными
// вставками (пожелтевшая бумага, скошенные края как у закладки, лёгкий
// наклон как приклеенная заметка). Помимо цвета (через THEME) добавляет
// ЕЩЁ параметрическую вариативность: угол наклона и угол экрана берутся
// детерминированно из текста, а не жёстко зашиты — на одном видео разные
// цифры оказываются в разных углах с разным наклоном, не одним и тем же
// местом каждый раз.
const CounterTag = ({ content, exit, enter }: { content: string; exit: number; enter: number }) => {
  const frame = useCurrentFrame();
  const match = content.match(/([^\d]*)([\d][\d,.\s]*)(.*)/);
  const prefix = match ? match[1] : '';
  // Пробел между числом и единицей. Группа числа жадная и захватывает \s,
  // поэтому «1,200 acres» распадалось на «1,200 » и «acres», а в кадр уходило
  // слипшееся «1,200acres». Хвостовой пробел возвращаем единице измерения;
  // там, где его не было («270°F»), ничего не меняется.
  const suffix = match ? (match[2].match(/\s+$/)?.[0] ?? '') + match[3] : '';
  const rawNumStr = match ? match[2].replace(/[,\s]/g, '') : '0';
  const targetNum = parseFloat(rawNumStr) || 0;
  const currentVal = interpolate(frame, [0, 40], [0, targetNum], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const opacity = enter * exit;
  const pop = interpolate(enter, [0, 1], [0.6, 1]);
  const h = _hashStr(content);
  const tilt = ((h % 700) / 100) - 3.5;               // -3.5..+3.5°
  const corner = h % 4;                               // 4 угла экрана
  const cornerStyle = ([
    { top: '80px', left: '80px' },
    { top: '80px', right: '80px' },
    { bottom: '130px', left: '80px' },
    { bottom: '130px', right: '80px' },
  ] as const)[corner];

  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute', ...cornerStyle,
        transform: `rotate(${tilt}deg) scale(${Math.max(pop, 0.001)})`,
        opacity,
        background: '#f2e9d8',
        boxShadow: '0 10px 24px rgba(0,0,0,0.5)',
        clipPath: 'polygon(4% 0%, 96% 0%, 100% 50%, 96% 100%, 4% 100%, 0% 50%)',
        padding: '20px 46px'
      }}>
        <div style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontWeight: 700,
          fontSize: '46px',
          color: '#1a1410',
          whiteSpace: 'nowrap'
        }}>
          {prefix}{formatCounter(currentVal)}{suffix}
        </div>
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
                  background: `linear-gradient(90deg, ${THEME.accent}, ${THEME.accentLight})`,
                  boxShadow: `0 0 15px rgba(${THEME.accentRgb},0.5)`,
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
  const DOT = 16;

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
            // Сдвиг вверх ровно на половину точки: её центр ложится на ось,
            // а год с подписью уходят ниже линии — иначе ось режет цифры года.
            // Колонка с alignItems:center — чтобы точка встала над годом, а не
            // прижалась к левому краю блока (textAlign не центрирует блоки).
            <div key={idx} style={{
              position: 'absolute', top: '50%', left: `${xPos}%`,
              transform: `translate(-50%, -${DOT / 2}px)`,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              textAlign: 'center'
            }}>
              <div style={{
                width: `${DOT}px`, height: `${DOT}px`, borderRadius: '50%',
                background: THEME.accent,
                boxShadow: `0 0 10px ${THEME.accent}`,
                transform: `scale(${dotAnim})`,
                marginBottom: '10px'
              }} />
              <div style={{ color: '#fff', fontFamily: "'Segoe UI Black', sans-serif", fontSize: '20px', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>{evt.year}</div>
              {/* #e8edf2 даёт 5.07:1 против серого (96,100,104) — выше порога 4.5:1;
                  тень держит читаемость и на светлом кадре */}
              <div style={{ color: '#e8edf2', fontFamily: "'Segoe UI', sans-serif", fontSize: '14px', marginTop: '4px', textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>{evt.label}</div>
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
           <line x1="0" y1={boxH/2} x2={boxW} y2={boxH/2} stroke={THEME.accent} strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
        </svg>

        {/* The Box */}
        <div style={{
          position: 'absolute', top: -boxH/2, left: boxX > pxX ? 40 : -boxW - 40,
          width: boxW, height: boxH,
          background: 'rgba(20,20,20,0.9)',
          border: `1px solid rgba(${THEME.accentRgb},0.3)`,
          borderRadius: '8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          transform: 'translate(-50%, -50%)' // Center on calculated anchor relative to SVG
        }}>
          <div style={{
            width: '4px', height: '40px', background: THEME.accent, marginRight: '16px', borderRadius: '2px',
            boxShadow: `0 0 8px ${THEME.accent}`
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
        <div style={{ width: '100px', height: '2px', background: `linear-gradient(90deg, transparent, ${THEME.accent}, transparent)`, margin: '0 20px' }} />

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
        background: `linear-gradient(180deg, ${THEME.bannerFrom} 0%, ${THEME.bannerTo} 100%)`,
        width: '90%',
        padding: '20px 40px',
        borderRadius: '8px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          color: THEME.bannerText,
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

// Второй вариант banner — угловая лента слева (не перекрашенный Banner,
// другая форма/позиция/анимация): въезжает слева со скосом и пружинным
// перелётом, а не падает сверху плашкой на весь кадр. Даёт видимую
// вариативность монтажа между проектами (см. selectBannerVariant в
// overlays.py — какой вариант достанется, решает детерминированный
// «почерк» проекта, не рандом на глаз).
const BannerRibbon = ({ content, exit, enter }: { content: string; exit: number; enter: number }) => {
  const frame = useCurrentFrame();
  const opacity = enter * exit;
  const slideX = interpolate(frame, [0, 24], [-700, 0], {
    easing: Easing.out(Easing.back(1.3)),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'flex-start', paddingTop: '70px' }}>
      <div style={{
        transform: `translateX(${slideX}px) skewX(-8deg)`,
        opacity: opacity,
        background: THEME.accent,
        maxWidth: '78%',
        padding: '22px 60px 22px 48px',
        boxShadow: '0 12px 26px rgba(0,0,0,0.55)',
        borderLeft: `6px solid ${THEME.accentLight}`
      }}>
        <div style={{
          transform: 'skewX(8deg)',
          color: '#ffffff',
          fontFamily: "'Segoe UI Black', sans-serif",
          fontSize: '38px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          textShadow: '0 3px 10px rgba(0,0,0,0.5)'
        }}>
          {content}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Watermark = ({ content, pos, enter }: { content: string; pos: string; enter: number }) => {
  // Постоянный бейдж на весь ролик (p.dur = вся длина видео, не 4с как у
  // остальных типов) — не мигает, не появляется/исчезает по ходу видео,
  // один раз плавно въезжает в начале и держится. Едва заметный, чтобы не
  // отвлекать от контента, но постоянно присутствует на кадре.
  const right = !pos.includes('left');
  const top = pos.includes('top');
  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute',
        [top ? 'top' : 'bottom']: '4%',
        [right ? 'right' : 'left']: '4%',
        opacity: enter * 0.68,
        transform: `translateX(${(1 - enter) * (right ? 40 : -40)}px)`,
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'rgba(15,15,18,0.55)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: '999px',
        padding: '8px 16px',
        backdropFilter: 'blur(2px)',
      } as React.CSSProperties}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: THEME.accent }} />
        <span style={{
          color: '#fff', fontFamily: "'Segoe UI', sans-serif", fontWeight: 600,
          fontSize: '15px', letterSpacing: '0.5px', whiteSpace: 'nowrap',
        }}>
          {content}
        </span>
      </div>
    </AbsoluteFill>
  );
};

const Collage = ({ items, exit, enter }: { items: { label: string; img: string }[]; exit: number; enter: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
                background: `linear-gradient(180deg,${THEME.kickerFrom},${THEME.kickerTo})`,
                border: `1px solid rgba(${THEME.accentRgb},0.5)`,
                color: THEME.accentLight, fontFamily: "'Segoe UI Semibold', sans-serif",
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
          width: 140 * barWidth, height: 5, background: `linear-gradient(90deg,${THEME.accent},${THEME.accentLight})`,
          margin: '22px auto 0', borderRadius: 3, boxShadow: `0 0 16px rgba(${THEME.accentRgb},0.6)`,
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

// ── Новые типы: не «ещё одна плашка», а другие ТЕХНИКИ движения ──────────

// Кинетическая типографика: слова влетают ПО ОДНОМУ со сдвигом по времени.
// Техника — покадровый стагger, а не появление блока целиком.
const Kinetic = ({ content, exit }: { content: string; exit: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = content.split(/\s+/).filter(Boolean);
  const step = Math.max(2, Math.round(fps * 0.09));   // задержка между словами

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 8%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 22px' }}>
        {words.map((w, i) => {
          const t0 = i * step;
          const a = interpolate(frame, [t0, t0 + 9], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          const up = interpolate(frame, [t0, t0 + 9], [34, 0], {
            easing: Easing.out(Easing.back(1.6)),
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          return (
            <span key={i} style={{
              opacity: a * exit,
              transform: `translateY(${up}px)`,
              fontFamily: "'Segoe UI Black', 'Arial Black', sans-serif",
              fontSize: 88, lineHeight: 1.12, color: '#ffffff',
              textTransform: 'uppercase', letterSpacing: '-0.02em',
              textShadow: '0 6px 22px rgba(0,0,0,0.85)',
            }}>{w}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Аннотация-обводка: круг РИСУЕТСЯ по контуру (stroke-dashoffset) и от него
// тянется линия-выноска. Техника — прорисовка пути, как рукой поверх кадра.
const Highlight = ({ content, pos, exit, enter }: { content: string; pos: string; exit: number; enter: number }) => {
  const frame = useCurrentFrame();
  const m = /point:([\d.]+),([\d.]+)/.exec(pos || '');
  const cx = m ? parseFloat(m[1]) : 62;
  const cy = m ? parseFloat(m[2]) : 45;
  const draw = interpolate(frame, [0, 26], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const LEN = 2 * Math.PI * 78;
  const labelIn = interpolate(frame, [20, 34], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  // Выноска уходит В СТОРОНУ СВОБОДНОГО МЕСТА: при точке в правой половине
  // подпись справа не помещалась (60% + отступ + ширина > 100%) и обрезалась
  // краем кадра. Отражаем сторону и держим вертикаль в безопасных пределах.
  const toLeft = cx > 55;
  const dir = toLeft ? -1 : 1;
  const labelTop = Math.min(Math.max(cy - 16, 6), 74);

  return (
    <AbsoluteFill style={{ opacity: exit }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"
           style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <ellipse cx={cx} cy={cy} rx={9} ry={7}
                 fill="none" stroke={THEME.accent} strokeWidth={0.55}
                 strokeDasharray={LEN} strokeDashoffset={LEN * (1 - draw)}
                 vectorEffect="non-scaling-stroke"
                 style={{ filter: `drop-shadow(0 0 6px rgba(${THEME.accentRgb},0.7))` }} />
        <line x1={cx + 8 * dir} y1={cy - 5}
              x2={cx + (8 + 12 * labelIn) * dir} y2={cy - 11 * labelIn}
              stroke={THEME.accent} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{
        position: 'absolute',
        ...(toLeft ? { right: `${100 - cx + 22}%` } : { left: `${cx + 22}%` }),
        top: `${labelTop}%`,
        opacity: labelIn * enter, transform: `translateY(${(1 - labelIn) * 10}px)`,
        fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 34, color: '#fff',
        background: 'rgba(12,14,18,0.82)', padding: '10px 18px',
        [toLeft ? 'borderRight' : 'borderLeft']: `4px solid ${THEME.accent}`,
        textAlign: toLeft ? 'right' : 'left',
        textShadow: '0 2px 8px rgba(0,0,0,0.9)', maxWidth: '30%',
      } as React.CSSProperties}>{content}</div>
    </AbsoluteFill>
  );
};

// Врезка-цитата: огромная кавычка масштабируется, текст проявляется строкой.
const PullQuote = ({ content, exit, enter }: { content: string; exit: number; enter: number }) => {
  const frame = useCurrentFrame();
  const [text, author] = content.split('::');
  const markScale = interpolate(frame, [0, 16], [0.5, 1], {
    easing: Easing.out(Easing.back(2)),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const rule = interpolate(frame, [10, 30], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 12%', opacity: enter * exit }}>
      <div style={{ position: 'relative', maxWidth: '76%' }}>
        <div style={{
          position: 'absolute', left: -70, top: -70, fontSize: 200, lineHeight: 1,
          fontFamily: 'Georgia, serif', color: THEME.accent, opacity: 0.55,
          transform: `scale(${markScale})`, transformOrigin: 'left top',
        }}>“</div>
        <div style={{
          fontFamily: 'Georgia, serif', fontSize: 58, lineHeight: 1.3,
          color: '#ffffff', fontStyle: 'italic',
          textShadow: '0 4px 18px rgba(0,0,0,0.9)',
        }}>{text}</div>
        <div style={{
          height: 3, background: THEME.accent, marginTop: 26, width: 180,
          transform: `scaleX(${rule})`, transformOrigin: 'left center',
        }} />
        {author ? (
          <div style={{
            marginTop: 14, fontFamily: "'Segoe UI', Arial, sans-serif",
            fontSize: 28, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: THEME.accentLight, opacity: rule,
          }}>{author}</div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// Штамп места/даты в углу: «впечатывается» — резкий наезд масштаба с лёгким
// поворотом, как оттиск. Техника — короткий импульс, а не плавный въезд.
const Stamp = ({ content, exit }: { content: string; exit: number }) => {
  const frame = useCurrentFrame();
  const h = _hashStr(content);
  const tilt = ((h % 500) / 100) - 2.5;
  const punch = interpolate(frame, [0, 5, 9], [2.4, 0.94, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const fade = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const [main, sub] = content.split('::');

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'flex-end', padding: '70px 80px' }}>
      <div style={{
        opacity: fade * exit * 0.92,
        transform: `scale(${punch}) rotate(${tilt}deg)`,
        border: `4px solid ${THEME.accent}`, padding: '14px 26px',
        textAlign: 'right', background: 'rgba(10,12,16,0.35)',
      }}>
        <div style={{
          fontFamily: "'Bahnschrift', 'Segoe UI', sans-serif", fontSize: 44,
          letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ffffff',
        }}>{main}</div>
        {sub ? (
          <div style={{
            fontFamily: "'Courier New', monospace", fontSize: 24,
            letterSpacing: '0.1em', color: THEME.accentLight, marginTop: 6,
          }}>{sub}</div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// Засекреченный документ: чёрные полосы ЗАМАЗЫВАЮТ строки одна за другой.
// Техника — последовательная маскировка, узнаваемая по true-crime.
const Redact = ({ content, exit, enter }: { content: string; exit: number; enter: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = content.split('::').filter(Boolean);
  const step = Math.max(3, Math.round(fps * 0.22));

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: enter * exit }}>
      <div style={{
        background: '#efe9dd', padding: '48px 60px', maxWidth: '62%',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {lines.map((ln, i) => {
          const w = interpolate(frame, [i * step, i * step + 8], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          const hide = ln.startsWith('*');
          const txt = hide ? ln.slice(1) : ln;
          return (
            <div key={i} style={{ position: 'relative' }}>
              <div style={{
                fontFamily: "'Courier New', monospace", fontSize: 34,
                color: '#1d1a16', letterSpacing: '0.04em',
              }}>{txt}</div>
              {hide ? (
                <div style={{
                  position: 'absolute', inset: '-4px -8px',
                  background: '#12100e',
                  transform: `scaleX(${w})`, transformOrigin: 'left center',
                }} />
              ) : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Маркер по тексту: цветная полоса прочерчивается ЗА словами, слово за
// словом, как будто фразу выделяют маркером по ходу речи. Отличие от
// kinetic: там слова прилетают по одному, здесь они стоят на месте с
// самого начала, а бежит только подсветка — читать можно всю фразу сразу,
// а внимание всё равно ведётся по строке.
const Marker = ({ content, exit, enter }: { content: string; exit: number; enter: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = content.split(/\s+/).filter(Boolean);
  const step = Math.max(2, Math.round(fps * 0.11));
  const grow = Math.max(3, Math.round(fps * 0.13));   // за сколько кадров закрасить слово

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 9%' }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        alignItems: 'baseline', gap: '10px 16px', opacity: enter * exit,
      }}>
        {words.map((w, i) => {
          const t0 = i * step;
          // ширина полосы 0→100%: extrapolate обязателен с обеих сторон,
          // иначе после t0+grow полоса продолжает расти и вылезает за слово
          const fill = interpolate(frame, [t0, t0 + grow], [0, 1], {
            easing: Easing.out(Easing.quad),
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          // Слово перекрашивается из белого в тёмное ПОКА по нему идёт
          // полоса. Белое по акценту даёт контраст 1.8:1 — нечитаемо; но и
          // просто сделать текст тёмным нельзя: пока маркер до слова не
          // дошёл, оно лежит на самом видео, где тонет всё тёмное. Переход
          // привязан к fill, поэтому совпадает с проходом полосы и читается
          // как часть эффекта, а не как моргание.
          // Конечный цвет — НЕ зашитый тёмный, а подобранный под акцент:
          // палитра меняется на каждый ролик, и на тёмном акценте зашитый
          // тёмный давал текст, которого не видно (замер: 1.2:1).
          const target = inkOn(THEME.accent);
          const ink = (from: number, ci: number) =>
            interpolate(fill, [0.45, 0.72], [from, target[ci]], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });
          const halo = interpolate(fill, [0.45, 0.72], [0.8, 0], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          return (
            <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
              <span style={{
                position: 'absolute', left: '-0.14em', top: '0.10em', bottom: '0.04em',
                // запас на поля тоже умножается на fill: при fill=0 иначе
                // остаётся полоска в 0.28em и перед каждым непокрашенным
                // словом торчит бирюзовая засечка
                width: `calc(${fill * 100}% + ${fill * 0.28}em)`,
                background: THEME.accent, borderRadius: 3,
                transformOrigin: 'left center',
              }} />
              <span style={{
                position: 'relative',
                fontFamily: "'Segoe UI Black', 'Arial Black', sans-serif",
                fontSize: 76, lineHeight: 1.24,
                color: `rgb(${ink(255, 0)},${ink(255, 1)},${ink(255, 2)})`,
                letterSpacing: '-0.01em',
                textShadow: `0 4px 18px rgba(0,0,0,${halo})`,
              }}>{w}</span>
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Галерея в перспективе: карточки с фото уходят вглубь по сетчатому полу и
// проплывают мимо камеры. Глубина делается честным CSS-perspective, а не
// масштабом — при простом scale карточки остаются плоскими и эффект
// читается как «картинки разного размера», а не как пространство.
const Gallery = ({ items, exit, enter }: { items: { label: string; img: string }[]; exit: number; enter: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cards = (items ?? []).slice(0, 4);
  if (!cards.length) return <AbsoluteFill />;

  // общий проезд камеры вглубь: одна медленная линейная величина, от неё
  // считаются позиции всех карточек — так они движутся согласованно
  const travel = (frame / fps) * 260;
  const GAP = 620;

  return (
    <AbsoluteFill style={{ perspective: 900, opacity: enter * exit }}>
      {/* сетчатый пол — задаёт горизонт, без него глубину не прочитать */}
      <div style={{
        position: 'absolute', left: '-50%', right: '-50%', bottom: 0, height: '62%',
        transform: 'rotateX(72deg)', transformOrigin: 'bottom center',
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px),'
          + 'linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)',
        backgroundSize: '90px 90px',
        backgroundPosition: `0 ${travel % 90}px`,
        maskImage: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent 78%)',
        WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent 78%)',
      }} />
      {cards.map((c, i) => {
        const z = -GAP * (i + 1) + travel;          // -далеко ... 0 у камеры
        // гаснет и на подлёте, и когда проходит мимо: иначе карточка резко
        // возникает из ниоткуда у самого объектива
        const a = interpolate(z, [-GAP * 2, -GAP * 1.3, -120, 60], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const side = i % 2 === 0 ? -1 : 1;
        return (
          <div key={i} style={{
            position: 'absolute', top: '30%', left: '50%',
            transform: `translateX(-50%) translateX(${side * 210}px) translateZ(${z}px)`,
            opacity: a,
          }}>
            <div style={{
              background: '#ffffff', padding: 12, paddingBottom: 34,
              boxShadow: '0 26px 60px rgba(0,0,0,0.6)',
            }}>
              <Img src={c.img} style={{ display: 'block', width: 460, height: 268, objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', left: '50%', bottom: -14, transform: 'translateX(-50%)',
                background: '#ffffff', color: '#111', padding: '4px 14px',
                fontFamily: "'Segoe UI Black', 'Arial Black', sans-serif",
                fontSize: 26, whiteSpace: 'nowrap',
                boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
              }}>{c.label}</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// Фоновый слой: анимация рисуется ПОД встроенным видом, а не вместо него.
// Нужен типам, у которых движение неотделимо от данных — bars, infographic,
// compare, timeline, counter. Скачанная анимация не знает ни твоих значений,
// ни числа колонок, поэтому заменить их собой не может; а вот лечь фоном под
// настоящие цифры — вполне. Без этого Lottie расширяла только половину типов.
const OverlayCore: React.FC<OverlayProps> = (p) => {
  const exit = useExit(p.dur);
  const enter = useEnter(p.dur);

  // Сначала библиотека накопленных вариантов (ручные из этого файла + всё,
  // что нагенерировал ИИ за прошлые ролики). Ключ — "тип/вариант". Если
  // варианта нет — молча падаем в switch ниже на встроенный вид, поэтому
  // удаление файла варианта не может сломать рендер.
  if (p.variant) {
    const Generated = VARIANTS[`${p.type}/${p.variant}`];
    if (Generated) return <Generated {...p} exit={exit} enter={enter} />;
  }

  if (p.type === 'watermark') {
    // своя, более медленная кривая появления — рассчитана на весь ролик,
    // а не на 0.4с как у обычных transient-оверлеев
    return <Watermark content={p.content} pos={p.pos} enter={Math.min(enter * 3, 1)} />;
  }

  switch (p.type) {
    case 'lower3':
      return p.variant === 'underline'
        ? <LowerThirdUnderline content={p.content} exit={exit} enter={enter} />
        : <LowerThird content={p.content} exit={exit} enter={enter} />;
    case 'counter':
      return p.variant === 'tag'
        ? <CounterTag content={p.content} exit={exit} enter={enter} />
        : <Counter content={p.content} exit={exit} enter={enter} />;
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
      return p.variant === 'ribbon'
        ? <BannerRibbon content={p.content} exit={exit} enter={enter} />
        : <Banner content={p.content} exit={exit} enter={enter} />;
    case 'collage':
      return <Collage items={p.items ?? []} exit={exit} enter={enter} />;
    case 'titlecard':
      return <TitleCard content={p.content} exit={exit} enter={enter} />;
    case 'kinetic':
      return <Kinetic content={p.content} exit={exit} />;
    case 'highlight':
      return <Highlight content={p.content} pos={p.pos} exit={exit} enter={enter} />;
    case 'quote':
      return <PullQuote content={p.content} exit={exit} enter={enter} />;
    case 'stamp':
      return <Stamp content={p.content} exit={exit} />;
    case 'redact':
      return <Redact content={p.content} exit={exit} enter={enter} />;
    case 'marker':
      return <Marker content={p.content} exit={exit} enter={enter} />;
    case 'gallery':
      return <Gallery items={p.items ?? []} exit={exit} enter={enter} />;
    default:
      return <AbsoluteFill />;
  }
};

export const Overlay: React.FC<OverlayProps> = (p) => {
  // Декоративный слой ищем ОТДЕЛЬНО от заменяющих вариантов: у DECOR та же
  // ключевая схема "тип/вариант", но найденный здесь компонент не отменяет
  // встроенный вид, а подкладывается под него. variant у ядра гасим, иначе
  // оно полезло бы искать тот же ключ в VARIANTS и ничего не нашло бы.
  const exit = useExit(p.dur);
  const enter = useEnter(p.dur);
  const Decor = p.variant ? DECOR[`${p.type}/${p.variant}`] : undefined;
  if (!Decor) return <OverlayCore {...p} />;
  const core = { ...p, variant: undefined };
  return (
    <AbsoluteFill>
      <Decor {...p} exit={exit} enter={enter} />
      <OverlayCore {...core} />
    </AbsoluteFill>
  );
};
