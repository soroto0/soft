import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const SoilLiquefactionFlowScene: React.FC<SceneProps> = (p) => {
	const frame = useCurrentFrame();
	const { width, height, fps } = useVideoConfig();
	const durationInFrames = p.dur * fps;

	const opacity = interpolate(p.enter * p.exit, [0, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

	const flowProgress = interpolate(frame, [0, durationInFrames], [0, 1], { easing: Easing.linear });
	const particleOffset = interpolate(frame, [0, durationInFrames], [0, 600]);
	const subsidence = interpolate(frame, [0, durationInFrames], [0, 50], { easing: Easing.bezier(0.4, 0, 0.2, 1) });

	return (
		<AbsoluteFill style={{ opacity, color: '#e9f2f6', fontFamily: 'sans-serif' }}>
			<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
				<rect x={width / 2 - 200} y={height / 2 - 100 - subsidence} width={400} height={40} fill="none" stroke="#e0b44c" strokeWidth={4} />
				<line x1={0} y1={height / 2 - 60 - subsidence} x2={width} y2={height / 2 - 60 - subsidence} stroke="#e9f2f6" strokeWidth={2} />
				<rect x={width / 2 + 100} y={height / 2 - 60} width={200} height={400} fill="#d0523f" fillOpacity={0.2} />
				
				{new Array(20).fill(0).map((_, i) => (
					<circle
						key={i}
						cx={width / 2 + (i * 20 - 200) + (flowProgress * 300)}
						cy={height / 2 - 40 + (i % 3) * 10 - (i % 2) * particleOffset * 0.5}
						r={2}
						fill="#e9f2f6"
						opacity={interpolate(flowProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0])}
					/>
				))}
			</svg>
			<div style={{ position: 'absolute', bottom: 100, width: '100%', textAlign: 'center', fontSize: 32, fontWeight: 300, letterSpacing: '0.1em' }}>
				{p.title}
			</div>
		</AbsoluteFill>
	);
};