import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const FractureAnalysisComparisonScene: React.FC<SceneProps> = (p) => {
  const opacity = p.enter * p.exit;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = Math.max(1, Math.round((p.dur || 6) * fps));

  const drawProgress = interpolate(frame, [0, span * 0.45], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flowProgress = interpolate(frame, [span * 0.2, span * 0.85], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textRise = interpolate(frame, [0, span * 0.35], [20, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const flowOffset = flowProgress * 18;

  const scaleTicks = [0, 1, 2, 3, 4];
  const leftFeatures = [
    { y: 150, text: 'Scharfkantige Rissspitze' },
    { y: 220, text: 'Mikroriss-Verzweigung' },
    { y: 290, text: 'Keine Plastizität (Sprödbruch)' },
  ];
  const rightFeatures = [
    { y: 150, text: 'Glatte Konturen' },
    { y: 220, text: 'Viskoses Fließen (Wachsstruktur)' },
    { y: 290, text: 'Kontinuierliche Deformation' },
  ];

  return (
    <AbsoluteFill
      style={{
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <svg width="84%" height="72%" viewBox="0 0 900 480" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0b44c" stopOpacity={0.85} />
            <stop offset="50%" stopColor="#d0523f" stopOpacity={0.65} />
            <stop offset="100%" stopColor="#5b7f9c" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="brittleGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0523f" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#3d4b54" stopOpacity={0.3} />
          </linearGradient>
          <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e9f2f6" strokeWidth="0.5" strokeOpacity="0.08" />
          </pattern>
        </defs>

        <rect x="40" y="40" width="370" height="340" rx="6" fill="url(#gridPattern)" stroke="#5b7f9c" strokeWidth="1" strokeOpacity="0.4" />
        <rect x="490" y="40" width="370" height="340" rx="6" fill="url(#gridPattern)" stroke="#e0b44c" strokeWidth="1" strokeOpacity="0.4" />

        <text x="225" y="70" fill="#d0523f" fontSize="14" fontWeight="600" textAnchor="middle" letterSpacing="1">
          SPRÖDE RISSSPRUNG-MORPHOLOGIE
        </text>
        <text x="675" y="70" fill="#e0b44c" fontSize="14" fontWeight="600" textAnchor="middle" letterSpacing="1">
          KRIECHVERSAGEN / WACHSARTIGER FLUSS
        </text>

        <g opacity={drawProgress}>
          <path
            d="M 60 140 L 120 140 L 150 100 L 180 200 L 220 110 L 260 190 L 310 150 L 390 150 L 390 320 L 60 320 Z"
            fill="url(#brittleGradient)"
            stroke="#d0523f"
            strokeWidth="2.5"
            strokeLinejoin="miter"
          />
          <path d="M 180 200 L 200 245 M 220 110 L 235 75 M 260 190 L 285 225" stroke="#d0523f" strokeWidth="1.5" strokeDasharray="3 3" />
          
          <line x1="100" y1="200" x2="60" y2="200" stroke="#d0523f" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <line x1="320" y1="200" x2="360" y2="200" stroke="#d0523f" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <text x="210" y="270" fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity="0.8">
            Spannungsspitzen / Zerrissen
          </text>
        </g>

        <g opacity={drawProgress}>
          <path
            d={`M 510 150 C 550 ${130 + flowOffset}, 590 ${210 - flowOffset}, 640 160 C 690 ${110 + flowOffset}, 740 ${190 - flowOffset}, 830 150 L 830 320 Q 670 ${340 + flowOffset * 0.5}, 510 320 Z`}
            fill="url(#flowGradient)"
            stroke="#e0b44c"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          
          <path
            d={`M 510 185 C 560 ${165 + flowOffset}, 600 ${235 - flowOffset}, 650 195 C 700 ${155 + flowOffset}, 750 ${215 - flowOffset}, 830 185`}
            fill="none"
            stroke="#e0b44c"
            strokeWidth="1.2"
            strokeOpacity="0.7"
            strokeDasharray="4 2"
          />
          <path
            d={`M 510 220 C 560 ${200 + flowOffset}, 600 ${260 - flowOffset}, 650 230 C 700 ${190 + flowOffset}, 750 ${240 - flowOffset}, 830 220`}
            fill="none"
            stroke="#e0b44c"
            strokeWidth="1"
            strokeOpacity="0.5"
          />

          <path d="M 670 250 L 670 280" stroke="#e0b44c" strokeWidth="1.5" />
          <polygon points="665,278 670,287 675,278" fill="#e0b44c" />
          <text x="670" y="304" fill="#e0b44c" fontSize="10" textAnchor="middle">
            Viskose Gleitebene
          </text>
        </g>

        <line x1="450" y1="40" x2="450" y2="380" stroke="#e9f2f6" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4" />
        
        <g transform="translate(450, 210)">
          <line x1="-15" y1="0" x2="15" y2="0" stroke="#e9f2f6" strokeWidth="1.5" />
          <line x1="-15" y1="-5" x2="-15" y2="5" stroke="#e9f2f6" strokeWidth="1.5" />
          <line x1="15" y1="-5" x2="15" y2="5" stroke="#e9f2f6" strokeWidth="1.5" />
          <text x="0" y="-10" fill="#e9f2f6" fontSize="10" textAnchor="middle" opacity="0.9">
            20 µm
          </text>
        </g>

        {scaleTicks.map((t) => (
          <g key={t} transform={`translate(445, ${80 + t * 65})`}>
            <line x1="0" y1="0" x2="10" y2="0" stroke="#e9f2f6" strokeWidth="1" opacity="0.5" />
            <text x="-8" y="3" fill="#e9f2f6" fontSize="8" textAnchor="end" opacity="0.5">
              {t * 50}µm
            </text>
          </g>
        ))}

        {leftFeatures.map((item, idx) => (
          <g key={idx} opacity={interpolate(drawProgress, [0.3 + idx * 0.1, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
            <circle cx="50" cy={item.y} r="2.5" fill="#d0523f" />
            <text x="35" y={item.y + 3} fill="#e9f2f6" fontSize="9" textAnchor="end" opacity="0.85">
              {item.text}
            </text>
          </g>
        ))}

        {rightFeatures.map((item, idx) => (
          <g key={idx} opacity={interpolate(flowProgress, [0.2 + idx * 0.1, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
            <circle cx="850" cy={item.y} r="2.5" fill="#e0b44c" />
            <text x="865" y={item.y + 3} fill="#e9f2f6" fontSize="9" textAnchor="start" opacity="0.85">
              {item.text}
            </text>
          </g>
        ))}
      </svg>

      <div
        style={{
          position: 'absolute',
          bottom: 30,
          transform: `translateY(${textRise}px)`,
          color: '#e9f2f6',
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          borderBottom: '2px solid #e0b44c',
          paddingBottom: 6,
        }}
      >
        {p.title || 'MIKROSKOPISCHE BRUCHANALYSE'}
      </div>
    </AbsoluteFill>
  );
};