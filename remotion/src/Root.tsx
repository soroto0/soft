import './index.css';
import {Composition} from 'remotion';
import {Overlay, OverlayProps} from './Overlay';
import {Thumbnail} from './Thumbnail';
import {Scene} from './Scene';
import type {SceneProps} from './types';
import type {ThumbnailProps} from './types';

// Одна композиция «Overlay»: тип, контент и геометрия приходят из props
// (их передаёт python-пайплайн через --props=file.json)
export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Composition
      id="Thumbnail"
      component={Thumbnail}
      durationInFrames={1}
      fps={1}
      width={1280}
      height={720}
      defaultProps={
        {
          headline: 'ОНИ НЕ\nВЕРНУЛИСЬ',
          bg: '',
          accent: '#f5c451',
          layout: 'left',
        } as ThumbnailProps
      }
    />
    <Composition
      id="Overlay"
      component={Overlay}
      durationInFrames={120}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={
        {
          type: 'lower3',
          content: 'Portland Airport, 1971',
          pos: 'bottom',
          dur: 4,
          fps: 30,
          width: 1920,
          height: 1080,
          img: '',
        } as OverlayProps
      }
      calculateMetadata={({props}) => {
        const p = props as OverlayProps;
        return {
          durationInFrames: Math.max(2, Math.round(p.dur * (p.fps ?? 30))),
          fps: p.fps ?? 30,
          width: p.width ?? 1920,
          height: p.height ?? 1080,
          props,
        };
      }}
    />
    {/* СЦЕНЫ — планы, нарисованные целиком, а не снятые. Отдельная
        композиция: у сцены непрозрачный фон и она занимает весь план. */}
    <Composition
      id="Scene"
      component={Scene}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{kind: 'globe', title: '', dur: 5,
                     exit: 1, enter: 1} as SceneProps}
      calculateMetadata={({props}) => {
        const p = props as SceneProps;
        return {
          durationInFrames: Math.max(2, Math.round((p.dur ?? 5) * 30)),
          props,
        };
      }}
    />
    </>
  );
};
