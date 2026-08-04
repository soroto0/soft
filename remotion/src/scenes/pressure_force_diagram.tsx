import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const PressureForceDiagramScene: React.FC<SceneProps> = (p) => {
	const frame = useCurrentFrame();
	const { width, height, fps } = useVideoConfig();
	const duration = p.dur * fps;

	const opacity = interpolate(1, [0, 1], [0, 1]) * p.enter * p.exit;

	const wallX = width * 0.6;
	const wallWidth = 20;
	const wallHeight = height * 0.6;

	const arrowLength = interpolate(frame, [0, duration], [50, 250], {
		easing: Easing.bezier(0.25, 0.1, 0.25, 1),
	});

	const crackOpacity = interpolate(frame, [duration * 0.5, duration], [0, 1]);
	const accentColor = interpolate(frame, [0, duration], [0, 1]) > 0.7 ? '#d0523f' : '#e0b44c';

	return (
		<AbsoluteFill style={{ opacity, color: '#e9f2f6', fontFamily: 'sans-serif' }}>
			<svg width={width} height={height}>
				<rect
					x={wallX}
					y={(height - wallHeight) / 2}
					width={wallWidth}
					height={wallHeight}
					fill="#333b42"
					stroke="#e9f2f6"
					strokeWidth="2"
				/>

				{[0, 1, 2, 3, 4].map((i) => {
					const yPos = (height - wallHeight) / 2 + (wallHeight / 5) * i + 50;
					const offset = interpolate(frame, [0, duration], [0, -20]);
					return (
						<g key={i} style={{ transform: `translateX(${offset}px)` }}>
							<line
								x1={wallX - arrowLength}
								y1={yPos}
								x2={wallX}
								y2={yPos}
								stroke={accentColor}
								strokeWidth="4"
							/>
							<path
								d={`M ${wallX - 20} ${yPos - 10} L ${wallX} ${yPos} L ${wallX - 20} ${yPos + 10}`}
								fill="none"
								stroke={accentColor}
								strokeWidth="4"
							/>
						</g>
					);
				})}

				<path
					d={`M ${wallX} ${height / 2 - 20} Q ${wallX + 10} ${height / 2} ${wallX} ${height / 2 + 20}`}
					fill="none"
					stroke="#d0523f"
					strokeWidth="8"
					strokeOpacity={crackOpacity}
				/>
			</svg>

			<div
				style={{
					position: 'absolute',
					bottom: '10%',
					width: '100%',
					textAlign: 'center',
					fontSize: '48px',
					fontWeight: 'bold',
					letterSpacing: '2px',
					color: '#e9f2f6',
				}}
			>
				{p.title || 'Hydrostatic Pressure Failure'}
			</div>
		</AbsoluteFill>
	);
};