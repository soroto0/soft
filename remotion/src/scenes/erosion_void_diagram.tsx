import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const ErosionVoidDiagramScene: React.FC<SceneProps> = (p) => {
	const frame = useCurrentFrame();
	const { width, height, fps } = useVideoConfig();
	const duration = p.dur * fps;

	const opacity = p.enter * p.exit;

	const cavernWidth = interpolate(frame, [0, duration], [0, 400], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.linear,
	});

	const foundationShift = interpolate(frame, [0, duration], [0, -15], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.bezier(0.4, 0, 0.2, 1),
	});

	const sandLevel = interpolate(frame, [0, duration], [100, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill style={{ opacity, color: '#e9f2f6', fontFamily: 'sans-serif' }}>
			<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
				<g transform={`translate(${width / 2 - 200}, ${height / 2 - 100})`}>
					<rect x="0" y={foundationShift} width="400" height="40" fill="#e9f2f6" />
					<rect x="0" y={40 + foundationShift} width="400" height={sandLevel} fill="#e0b44c" />
					<path d={`M 0 ${40 + foundationShift} h ${cavernWidth} v 60 h -${cavernWidth} Z`} fill="#d0523f" />
					<line x1="0" y1="40" x2="400" y2="40" stroke="#e9f2f6" strokeWidth="2" />
					<text x="200" y="250" textAnchor="middle" fill="#e9f2f6" style={{ fontSize: '24px', letterSpacing: '0.05em' }}>
						{p.title || 'Subsurface Erosion Void'}
					</text>
				</g>
			</svg>
		</AbsoluteFill>
	);
};