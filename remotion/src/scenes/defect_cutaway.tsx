import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const DefectCutawayScene: React.FC<SceneProps> = (p) => {
	const frame = useCurrentFrame();
	const { width, height, fps } = useVideoConfig();
	const totalFrames = p.dur * fps;

	const opacity = interpolate(p.enter * p.exit, [0, 1], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const lineProgress = interpolate(frame, [0, totalFrames], [0, 1], {
		easing: Easing.linear,
	});

	const voidScale = interpolate(frame, [0, totalFrames], [0.8, 1.2], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const glowIntensity = interpolate(frame, [0, totalFrames / 2, totalFrames], [0.2, 0.8, 0.2]);

	return (
		<AbsoluteFill style={{ backgroundColor: '#07090c', opacity, color: '#e9f2f6', fontFamily: 'sans-serif' }}>
			<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
				<rect
					x={width * 0.3}
					y={height * 0.2}
					width={width * 0.4}
					height={height * 0.6}
					fill="#1a1f26"
					stroke="#e9f2f6"
					strokeWidth="2"
				/>

				<path
					d={`M ${width * 0.3} ${height * 0.4} L ${width * 0.7} ${height * 0.4} M ${width * 0.3} ${height * 0.6} L ${width * 0.7} ${height * 0.6}`}
					stroke="#e9f2f6"
					strokeWidth="1"
					strokeDasharray="10 5"
					strokeDashoffset={lineProgress * 15}
				/>

				<g transform={`translate(${width / 2}, ${height / 2}) scale(${voidScale})`}>
					<ellipse
						cx={0}
						cy={0}
						rx={width * 0.08}
						ry={height * 0.05}
						fill="#d0523f"
						fillOpacity={glowIntensity}
						stroke="#e0b44c"
						strokeWidth="2"
					/>
					<text
						x={0}
						y={height * 0.08}
						textAnchor="middle"
						fill="#e0b44c"
						fontSize="24"
						letterSpacing="2"
						style={{ textTransform: 'uppercase' }}
					>
						Unconsolidated Material
					</text>
				</g>
			</svg>

			{p.title && (
				<div
					style={{
						position: 'absolute',
						bottom: height * 0.1,
						width: '100%',
						textAlign: 'center',
						fontSize: '48px',
						fontWeight: 300,
						color: '#e0b44c',
						textTransform: 'uppercase',
						letterSpacing: '4px',
					}}
				>
					{p.title}
				</div>
			)}
		</AbsoluteFill>
	);
};