import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PourSequenceAnimationScene: React.FC<SceneProps> = (p) => {
	const frame = useCurrentFrame();
	const { width, height, fps } = useVideoConfig();
	const duration = p.dur * fps;

	const mudLevel = interpolate(frame, [0, duration], [height * 0.75, height * 0.72], { easing: Easing.linear });
	const concreteOpacity = interpolate(frame, [0, duration * 0.2, duration * 0.4], [0, 0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
	const pipeY = interpolate(frame, [0, duration * 0.3], [height * 0.2, height * 0.65], { easing: Easing.bezier(0.42, 0, 0.58, 1), extrapolateRight: 'clamp' });

	return (
		<AbsoluteFill style={{ opacity: p.enter * p.exit }}>
			<svg width={width} height={height}>
				<rect x={width * 0.2} y={mudLevel} width={width * 0.6} height={height * 0.25} fill="#3d4a52" />
				<rect x={width * 0.2} y={mudLevel} width={width * 0.6} height={height * 0.05} fill="#d0523f" fillOpacity={concreteOpacity} />
				<line x1={width * 0.5} y1={0} x2={width * 0.5} y2={pipeY} stroke="#e0b44c" strokeWidth="12" strokeLinecap="round" />
				<text
					x={width / 2}
					y={height * 0.9}
					fill="#e9f2f6"
					fontSize={48}
					textAnchor="middle"
					fontFamily="sans-serif"
					letterSpacing="2px"
				>
					{p.title}
				</text>
			</svg>
		</AbsoluteFill>
	);
};