import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { SceneProps } from '../types';

export const HoopStressDiagramScene: React.FC<SceneProps> = (p) => {
	const { width, height, fps } = useVideoConfig();
	const frame = useCurrentFrame();
	const totalFrames = p.dur * fps;
	const opacity = p.enter * p.exit;

	const progress = interpolate(frame, [0, totalFrames], [0, 1], {
		easing: Easing.linear,
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const expansion = interpolate(progress, [0, 1], [0, 40], {
		easing: Easing.bezier(0.4, 0, 0.2, 1),
	});

	const arrowLength = interpolate(progress, [0, 1], [10, 60], {
		easing: Easing.bezier(0.4, 0, 0.2, 1),
	});

	const textOpacity = interpolate(progress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

	const cx = width / 2;
	const cy = height * 0.45;
	const r = 200;

	return (
		<AbsoluteFill style={{ opacity }}>
			<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
				<defs>
					<marker
						id="arrow"
						markerWidth="10"
						markerHeight="10"
						refX="9"
						refY="5"
						orient="auto"
					>
						<path d="M0,0 L10,5 L0,10 Z" fill="#e0b44c" />
					</marker>
				</defs>

				<circle
					cx={cx}
					cy={cy}
					r={r + expansion}
					fill="none"
					stroke="#e9f2f6"
					strokeWidth={12}
				/>

				{[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
					const angleRad = (angle * Math.PI) / 180;
					const x1 = cx + (r + expansion) * Math.cos(angleRad);
					const y1 = cy + (r + expansion) * Math.sin(angleRad);
					const x2 = cx + (r + expansion + arrowLength) * Math.cos(angleRad);
					const y2 = cy + (r + expansion + arrowLength) * Math.sin(angleRad);

					return (
						<line
							key={angle}
							x1={x1}
							y1={y1}
							x2={x2}
							y2={y2}
							stroke="#e0b44c"
							strokeWidth={6}
							markerEnd="url(#arrow)"
						/>
					);
				})}

				<text
					x={cx}
					y={height * 0.88}
					fill="#e9f2f6"
					style={{
						fontSize: 48,
						fontWeight: 300,
						textAnchor: 'middle',
						fontFamily: 'sans-serif',
						opacity: textOpacity,
					}}
				>
					{p.title}
				</text>

				<text
					x={cx}
					y={cy}
					fill="#d0523f"
					style={{
						fontSize: 32,
						textAnchor: 'middle',
						fontFamily: 'monospace',
						opacity: interpolate(progress, [0.3, 0.5], [0, 1]),
					}}
				>
					INTERNAL PRESSURE
				</text>
			</svg>
		</AbsoluteFill>
	);
};