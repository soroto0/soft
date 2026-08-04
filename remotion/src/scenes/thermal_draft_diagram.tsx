import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ThermalDraftDiagramScene: React.FC<SceneProps> = (p) => {
	const frame = useCurrentFrame();
	const { width, height, fps } = useVideoConfig();
	const opacity = p.enter * p.exit;

	const durationInFrames = p.dur * fps;

	const arrowPos = interpolate(frame, [0, durationInFrames], [0, 1], {
		easing: Easing.linear,
	});

	const heatIntensity = interpolate(frame, [0, durationInFrames / 2, durationInFrames], [0.3, 1, 0.3]);

	const lineDashOffset = interpolate(frame, [0, durationInFrames], [0, -100], {
		extrapolateLeft: 'extend',
		extrapolateRight: 'extend',
	});

	return (
		<AbsoluteFill style={{ opacity, color: '#e9f2f6', fontFamily: 'sans-serif' }}>
			<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
				<rect x={width * 0.6} y={height * 0.4} width={width * 0.2} height={height * 0.4} fill="#1a1d21" stroke="#e9f2f6" strokeWidth="2" />
				<rect x={width * 0.65} y={height * 0.75} width={width * 0.1} height={height * 0.05} fill="#d0523f" fillOpacity={heatIntensity} />
				
				<path
					d={`M ${width * 0.68} ${height * 0.75} Q ${width * 0.62} ${height * 0.5}, ${width * 0.65} ${height * 0.3}`}
					stroke="#e0b44c"
					strokeWidth="3"
					fill="none"
					strokeDasharray="10 10"
					strokeDashoffset={lineDashOffset}
				/>
				
				{[0.2, 0.5, 0.8].map((offset, i) => (
					<circle
						key={i}
						cx={width * 0.65}
						cy={interpolate(arrowPos, [0, 1], [height * 0.75, height * 0.2]) - (i * 100)}
						r="4"
						fill="#e0b44c"
						opacity={interpolate(arrowPos, [0, 1], [0, 1])}
					/>
				))}

				<line x1="0" y1={height * 0.8} x2={width} y2={height * 0.8} stroke="#e9f2f6" strokeWidth="2" />
				<text x={width / 2} y={height * 0.9} textAnchor="middle" fontSize="48" fill="#e9f2f6" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
					{p.title}
				</text>
			</svg>
		</AbsoluteFill>
	);
};