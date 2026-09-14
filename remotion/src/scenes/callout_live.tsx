import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';

// Живая выноска: маркер -> линия -> подпись -> число. Ничего не появляется
// разом. Замер 02.09.2026 по десяти чужим роликам: между соседними
// элементами 80-120 мс, линия ПРОЧЕРЧИВАЕТСЯ за 0.5-0.8 с (strokeDashoffset),
// а не проявляется прозрачностью. Прозрачность вместо прочерчивания — то,
// что в разборах названо главным убийцей эффекта.
export const CalloutLiveScene: React.FC<{
  title?: string;
  items?: string[];
  enter?: number;
  exit?: number;
}> = ({ title = '', items = [], enter = 1, exit = 1 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  const EO = {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp' as const,
    extrapolateRight: 'clamp' as const,
  };

  // якорь на предмете: 0 -> 1 с перелётом до 1.12
  const marker = interpolate(t, [0.20, 0.55], [0, 1.12], EO);
  const markerSettle = interpolate(t, [0.55, 0.75], [1.12, 1.0], EO);
  const mScale = t < 0.55 ? marker : markerSettle;

  // линия прочерчивается: длина -> 0
  const L = Math.hypot(360, 150);
  const draw = interpolate(t, [0.42, 1.15], [1, 0], EO);

  // подпись выезжает следом, со сдвигом 120 мс от линии
  const labelX = interpolate(t, [1.00, 1.45], [-26, 0], EO);
  const labelA = interpolate(t, [1.00, 1.35], [0, 1], EO);

  // число набегает счётчиком
  const count = Math.round(interpolate(t, [1.30, 2.30], [0, 118], EO));
  const countA = interpolate(t, [1.30, 1.55], [0, 1], EO);

  const anchorX = width * 0.58;
  const anchorY = height * 0.52;
  const labelPosX = anchorX - 360;
  const labelPosY = anchorY - 150;

  const out = interpolate(t, [Math.max(0.1, exit * 0 + 4.6), 5.1], [1, 1], EO);

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent', opacity: out }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <line
          x1={labelPosX + 20}
          y1={labelPosY + 26}
          x2={anchorX}
          y2={anchorY}
          stroke="#f0a92b"
          strokeWidth={3}
          strokeDasharray={L}
          strokeDashoffset={L * draw}
          strokeLinecap="round"
        />
        <circle
          cx={anchorX}
          cy={anchorY}
          r={18 * mScale}
          fill="none"
          stroke="#f0a92b"
          strokeWidth={4}
        />
        <circle cx={anchorX} cy={anchorY} r={5 * mScale} fill="#f0a92b" />
      </svg>

      <div
        style={{
          position: 'absolute',
          left: labelPosX - 240,
          top: labelPosY - 8,
          transform: `translateX(${labelX}px)`,
          opacity: labelA,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontWeight: 800,
          fontSize: 46,
          letterSpacing: 1.5,
          color: '#eef4f8',
          background: 'rgba(13,17,23,0.72)',
          padding: '10px 20px',
        }}
      >
        {title}
      </div>

      <div
        style={{
          position: 'absolute',
          left: labelPosX - 240,
          top: labelPosY + 62,
          opacity: countA,
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontWeight: 800,
          fontSize: 78,
          color: '#f0a92b',
        }}
      >
        {count}
        <span style={{ fontSize: 34, marginLeft: 10, color: '#9fb4c7' }}>
          {items[0] ?? ''}
        </span>
      </div>
    </AbsoluteFill>
  );
};

export default CalloutLiveScene;
