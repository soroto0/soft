import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const BlastPanelFailureScene: React.FC<SceneProps> = (p) => {
	const frame = useCurrentFrame();
	const { width, height, fps } = useVideoConfig();

	const opacity = p.enter * p.exit;
	const durationFrames = p.dur * fps;

	const waveIntensity = interpolate(frame, [0, durationFrames * 0.5, durationFrames], [0, 1, 0.5], {
		easing: Easing.linear,
	});

	const boltStiffness = interpolate(frame, [durationFrames * 0.3, durationFrames * 0.6], [0, 5], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const wallDeformation = interpolate(frame, [durationFrames * 0.4, durationFrames * 0.9], [0, 60], {
		easing: Easing.bezier(0.4, 0, 0.2, 1),
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill style={{ backgroundColor: '#07090c', opacity: opacity, color: '#e9f2f6', fontFamily: 'sans-serif' }}>
			<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
				<g transform={`translate(${width * 0.1}, ${height * 0.1})`}>
					<rect
						x={width * 0.2}
						y={height * 0.2}
						width={width * 0.4}
						height={height * 0.4}
						fill="none"
						stroke="#e9f2f6"
						strokeWidth="4"
					/>
					<rect
						x={width * 0.3}
						y={height * 0.3}
						width={width * 0.2}
						height={height * 0.2}
						fill="#07090c"
						stroke="#e0b44c"
						strokeWidth={2 + boltStiffness}
					/>
					<line
						x1={width * 0.35}
						y1={height * 0.35}
						x2={width * 0.45}
						y2={height * 0.45}
						stroke="#d0523f"
						strokeWidth="6"
					/>
					<path
						d={`M ${width * 0.2} ${height * 0.2} Q ${width * 0.2 - wallDeformation} ${height * 0.4}, ${width * 0.2} ${height * 0.6}`}
						fill="none"
						stroke="#e9f2f6"
						strokeWidth="4"
					/>
					<circle
						cx={width * 0.4}
						cy={height * 0.4}
						r={waveIntensity * 100}
						fill="none"
						stroke="#d0523f"
						strokeWidth="2"
						strokeDasharray="8 8"
					/>
				</g>
			</svg>
			<div style={{ 
				position: 'absolute', 
				top: height * 0.75, 
				width: '100%', 
				textAlign: 'center', 
				fontSize: '48px', 
				fontWeight: 'bold', 
				letterSpacing: '4px', 
				textTransform: 'uppercase',
				color: '#e0b44c'
			}}>
				{p.title}
			</div>
		</AbsoluteFill>
	);
};