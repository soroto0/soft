import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// Движок моушн-графики «Контент-фабрики». Рендерится в PNG-секвенцию
// с альфа-каналом; python накладывает её через ffmpeg overlay.

export type OverlayProps = {
  type: string; // lower3 | counter | callout | popup | bars | timeline
  content: string;
  pos: string; // top-right / bottom / point:70,60 / ...
  dur: number; // секунды
  fps?: number;
  width?: number;
  height?: number;
  img?: string; // имя файла в public/ (для popup)
};

const ACCENT = '#7c5cff';
const ACCENT_LIGHT = '#9d85ff';
const PLATE = 'rgba(12,12,18,0.82)';
const FONT = "'Segoe UI', 'Arial', sans-serif";

// Затухание в конце: 1 -> 0 за последние 0.3 c
const useExit = (dur: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return interpolate(t, [dur - 0.3, dur], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
};

// ---------- lower3: плашка ----------
const Lower3: React.FC<OverlayProps> = (p) => {
  const frame = useCurrentFrame();
  const {fps, height: H} = useVideoConfig();
  const exit = useExit(p.dur);
  const strip = spring({frame, fps, config: {damping: 16}, durationInFrames: fps * 0.3});
  const plate = spring({
    frame: frame - fps * 0.1,
    fps,
    config: {damping: 13, stiffness: 120},
    durationInFrames: fps * 0.45,
  });
  const text = spring({
    frame: frame - fps * 0.3,
    fps,
    config: {damping: 15},
    durationInFrames: fps * 0.35,
  });
  const fontSize = H * 0.042;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 80 - (1 - exit) * 60,
          bottom: H * 0.16,
          opacity: exit,
          display: 'flex',
          alignItems: 'stretch',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
        }}
      >
        <div
          style={{
            width: 9,
            background: `linear-gradient(180deg, ${ACCENT_LIGHT}, ${ACCENT})`,
            transform: `scaleY(${strip})`,
            transformOrigin: 'top',
          }}
        />
        <div
          style={{
            background: `linear-gradient(180deg, rgba(22,22,30,0.88), ${PLATE})`,
            padding: `${fontSize * 0.45}px ${fontSize * 0.8}px`,
            maxWidth: '58vw',
            transform: `scaleX(${Math.max(plate, 0.001)})`,
            transformOrigin: 'left',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize,
              color: '#fff',
              whiteSpace: 'nowrap',
              letterSpacing: 0.5,
              textShadow: '0 3px 10px rgba(0,0,0,0.6)',
              transform: `translateY(${(1 - text) * fontSize * 1.4}px)`,
              opacity: text,
            }}
          >
            {p.content}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- counter: накручивающийся счётчик ----------
const Counter: React.FC<OverlayProps> = (p) => {
  const frame = useCurrentFrame();
  const {fps, height: H} = useVideoConfig();
  const exit = useExit(p.dur);
  const t = frame / fps;
  const m = p.content.match(/([^\d]*)([\d][\d,. ]*)(.*)/);
  const prefix = m?.[1] ?? '';
  const digits = m?.[2] ?? '0';
  const suffix = m?.[3] ?? '';
  const value = parseInt(digits.replace(/[^\d]/g, ''), 10) || 0;
  const grouped = digits.includes(',') || value >= 10000;
  const tHit = Math.max(p.dur * 0.6, 0.1);
  const k = interpolate(t, [0, tHit], [0, 1], {
    extrapolateRight: 'clamp',
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });
  const cur = Math.round(value * k);
  const shown = grouped ? cur.toLocaleString('en-US') : String(cur);
  const hit = spring({
    frame: frame - tHit * fps,
    fps,
    config: {damping: 9, stiffness: 190},
    durationInFrames: fps * 0.5,
  });
  const scale = t < tHit ? 1 : 1 + 0.09 * (1 - hit);
  const enter = spring({frame, fps, config: {damping: 14}, durationInFrames: fps * 0.3});
  const jitter = k < 1 ? Math.sin(t * 43) * 2 : 0;
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          position: 'absolute',
          width: '62%',
          height: '30%',
          background:
            'radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 70%)',
          opacity: exit * enter,
        }}
      />
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: H * 0.13,
          color: '#fff',
          WebkitTextStroke: `${H * 0.006}px rgba(0,0,0,0.9)`,
          textShadow: '0 6px 30px rgba(0,0,0,0.8)',
          transform: `scale(${enter * scale}) translateY(${jitter}px)`,
          opacity: exit,
          letterSpacing: 2,
        }}
      >
        {prefix}
        {shown}
        {suffix}
      </div>
    </AbsoluteFill>
  );
};

// ---------- callout: выноска с прорисовкой линии ----------
const Callout: React.FC<OverlayProps> = (p) => {
  const frame = useCurrentFrame();
  const {fps, width: W, height: H} = useVideoConfig();
  const exit = useExit(p.dur);
  const t = frame / fps;
  const pm = p.pos.match(/point:([\d.]+),([\d.]+)/);
  const px = (W * (pm ? parseFloat(pm[1]) : 70)) / 100;
  const py = (H * (pm ? parseFloat(pm[2]) : 55)) / 100;
  const right = px < W * 0.55;
  const bw = Math.min(p.content.length * H * 0.023 + 90, W * 0.42);
  const bh = H * 0.038 + 44;
  const bx = right ? Math.min(px + W * 0.12, W - bw - 30) : Math.max(px - W * 0.12 - bw, 30);
  const by = Math.max(Math.min(py - H * 0.14, H - bh - 30), 30);
  const ex = right ? bx : bx + bw;
  const ey = by + bh / 2;
  const draw = interpolate(t, [0, 0.35], [0, 1], {
    extrapolateRight: 'clamp',
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });
  const lineLen = Math.hypot(ex - px, ey - py);
  const blockIn = spring({
    frame: frame - 0.3 * fps,
    fps,
    config: {damping: 11, stiffness: 150},
    durationInFrames: fps * 0.4,
  });
  const ring = (t0: number) => {
    const kp = interpolate(t, [t0, t0 + 0.7], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return {r: 34 + 60 * (1 - Math.pow(1 - kp, 3)), o: (1 - kp) * 0.9};
  };
  const r1 = ring(0.45);
  const r2 = ring(1.2);
  return (
    <AbsoluteFill style={{opacity: exit}}>
      <svg width={W} height={H}>
        <circle
          cx={px}
          cy={py}
          r={34}
          fill="none"
          stroke={ACCENT}
          strokeWidth={6}
          strokeDasharray={2 * Math.PI * 34}
          strokeDashoffset={(1 - draw) * 2 * Math.PI * 34}
          transform={`rotate(-90 ${px} ${py})`}
        />
        {[r1, r2].map((r, i) => (
          <circle key={i} cx={px} cy={py} r={r.r} fill="none" stroke={ACCENT} strokeWidth={3} opacity={r.o} />
        ))}
        <line
          x1={px}
          y1={py}
          x2={px + (ex - px) * draw}
          y2={py + (ey - py) * draw}
          stroke={ACCENT}
          strokeWidth={5}
          strokeDasharray={lineLen}
        />
        {draw < 1 && (
          <circle cx={px + (ex - px) * draw} cy={py + (ey - py) * draw} r={8} fill="#fff" />
        )}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: bx,
          top: by,
          width: bw,
          height: bh,
          background: PLATE,
          border: `3px solid ${ACCENT}`,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: H * 0.034,
          color: '#fff',
          boxShadow: '0 10px 35px rgba(0,0,0,0.5)',
          transform: `scale(${0.7 + 0.3 * blockIn})`,
          opacity: blockIn,
          padding: '0 18px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {p.content}
      </div>
    </AbsoluteFill>
  );
};

// ---------- popup: картинка-«вырезка» ----------
const Popup: React.FC<OverlayProps> = (p) => {
  const frame = useCurrentFrame();
  const {fps, width: W, height: H} = useVideoConfig();
  const t = frame / fps;
  const enter = spring({frame, fps, config: {damping: 10, stiffness: 130}, durationInFrames: fps * 0.5});
  const exitSlide = (p.img || p.content).length % 2 === 0;
  const tExit = p.dur - 0.35;
  const ke = interpolate(t, [tExit, p.dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (x) => x * x * x,
  });
  const sway = 2.5 + 1.2 * Math.sin(t * 0.9);
  const float = 6 * Math.sin(t * 1.6);
  const scale = exitSlide ? enter : enter * (1 - ke);
  const dx = exitSlide ? ke * W * 0.6 : 0;
  const posMap: Record<string, React.CSSProperties> = {
    'top-right': {right: 60, top: 60},
    'top-left': {left: 60, top: 60},
    top: {left: '50%', top: 60, transform: 'translateX(-50%)'},
    center: {left: '50%', top: '50%', transform: 'translate(-50%,-50%)'},
    bottom: {left: 80, bottom: H * 0.16},
  };
  const place = posMap[p.pos] ?? posMap['top-right'];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', ...place}}>
        <div
          style={{
            background: '#fff',
            padding: 14,
            borderRadius: 4,
            boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
            transform: `translate(${dx}px, ${float}px) rotate(${sway + ke * 10}deg) scale(${Math.max(
              scale,
              0.001
            )})`,
            filter: t < 0.3 ? `blur(${(1 - t / 0.3) * 5}px)` : undefined,
          }}
        >
          {p.img ? (
            <Img
              src={p.img}
              style={{maxWidth: W * 0.36, maxHeight: H * 0.5, display: 'block'}}
            />
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- bars: растущие бары ----------
const Bars: React.FC<OverlayProps> = (p) => {
  const frame = useCurrentFrame();
  const {fps, width: W, height: H} = useVideoConfig();
  const exit = useExit(p.dur);
  const pairs = p.content
    .split(',')
    .map((c) => c.split(':'))
    .filter((x) => x.length === 2)
    .map(([label, v]) => ({label: label.trim(), value: parseFloat(v.replace(/[^\d.]/g, '')) || 0}));
  const vmax = Math.max(...pairs.map((x) => x.value), 1);
  const enter = spring({frame, fps, config: {damping: 14}, durationInFrames: fps * 0.3});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          background: PLATE,
          borderRadius: 16,
          padding: 28,
          width: W * 0.5,
          boxShadow: '0 16px 50px rgba(0,0,0,0.5)',
          opacity: exit * enter,
          transform: `scale(${0.9 + 0.1 * enter})`,
        }}
      >
        {pairs.map((pair, j) => {
          const k = spring({
            frame: frame - j * 0.15 * fps,
            fps,
            config: {damping: 12, stiffness: 110},
            durationInFrames: fps * 0.8,
          });
          return (
            <div key={j} style={{display: 'flex', alignItems: 'center', margin: '14px 0'}}>
              <div
                style={{
                  fontFamily: FONT,
                  fontWeight: 700,
                  fontSize: H * 0.03,
                  color: '#fff',
                  width: '26%',
                }}
              >
                {pair.label}
              </div>
              <div style={{flex: 1, height: H * 0.045, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.08)'}}>
                <div
                  style={{
                    width: `${(pair.value / vmax) * 100 * k}%`,
                    height: '100%',
                    borderRadius: 10,
                    background: `linear-gradient(180deg, ${ACCENT_LIGHT}, ${ACCENT})`,
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: FONT,
                  fontWeight: 700,
                  fontSize: H * 0.03,
                  color: '#fff',
                  width: 90,
                  textAlign: 'right',
                }}
              >
                {Math.round(pair.value * Math.min(k, 1))}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- timeline: полоска с датами ----------
const Timeline: React.FC<OverlayProps> = (p) => {
  const frame = useCurrentFrame();
  const {fps, width: W, height: H} = useVideoConfig();
  const exit = useExit(p.dur);
  const t = frame / fps;
  const pts = p.content
    .split(',')
    .map((c) => {
      const i = c.indexOf(':');
      return i > 0 ? {year: c.slice(0, i).trim(), label: c.slice(i + 1).trim()} : null;
    })
    .filter(Boolean) as {year: string; label: string}[];
  const cw = W * 0.82;
  const margin = 90;
  const step = (cw - margin * 2) / Math.max(pts.length - 1, 1);
  const grow = interpolate(t, [0, 0.55], [0, 1], {
    extrapolateRight: 'clamp',
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });
  const enter = spring({frame, fps, config: {damping: 14}, durationInFrames: fps * 0.3});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center'}}>
      <div
        style={{
          position: 'relative',
          width: cw,
          height: H * 0.18,
          marginBottom: H * 0.14,
          background: 'rgba(12,12,18,0.72)',
          borderRadius: 16,
          boxShadow: '0 16px 50px rgba(0,0,0,0.5)',
          opacity: exit * enter,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: margin,
            top: '55%',
            width: (cw - margin * 2) * grow,
            height: 5,
            background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_LIGHT})`,
            borderRadius: 3,
          }}
        />
        {pts.map((pt, j) => {
          const tShow = 0.45 + j * 0.35;
          const pop = spring({
            frame: frame - tShow * fps,
            fps,
            config: {damping: 10, stiffness: 170},
            durationInFrames: fps * 0.4,
          });
          const ringK = interpolate(t, [tShow, tShow + 0.55], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const x = margin + step * j;
          return (
            <div key={j} style={{position: 'absolute', left: x, top: '55%', opacity: pop}}>
              <div
                style={{
                  position: 'absolute',
                  left: -11,
                  top: -9,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: ACCENT,
                  transform: `scale(${pop})`,
                  boxShadow: `0 0 18px ${ACCENT}`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: -11 - 28 * ringK,
                  top: -9 - 28 * ringK,
                  width: 22 + 56 * ringK,
                  height: 22 + 56 * ringK,
                  borderRadius: '50%',
                  border: `3px solid ${ACCENT}`,
                  opacity: 1 - ringK,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  transform: 'translateX(-50%)',
                  bottom: 22,
                  fontFamily: FONT,
                  fontWeight: 800,
                  fontSize: H * 0.036,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                }}
              >
                {pt.year}
              </div>
              <div
                style={{
                  position: 'absolute',
                  transform: 'translateX(-50%)',
                  top: 26,
                  fontFamily: FONT,
                  fontWeight: 400,
                  fontSize: H * 0.025,
                  color: 'rgba(225,225,235,1)',
                  whiteSpace: 'nowrap',
                }}
              >
                {pt.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- диспетчер ----------
export const Overlay: React.FC<OverlayProps> = (p) => {
  switch (p.type) {
    case 'lower3':
      return <Lower3 {...p} />;
    case 'counter':
      return <Counter {...p} />;
    case 'callout':
      return <Callout {...p} />;
    case 'popup':
      return <Popup {...p} />;
    case 'bars':
    case 'infographic':
      return <Bars {...p} />;
    case 'timeline':
      return <Timeline {...p} />;
    default:
      return <AbsoluteFill />;
  }
};
