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
                     exit: 1, enter: 1, fps: 30,
                     width: 1920, height: 1080} as SceneProps}
      // РАЗМЕР КАДРА ЗАДАЁТСЯ ЗДЕСЬ, А НЕ ФЛАГАМИ КОМАНДНОЙ СТРОКИ.
      // Причина простая и проверяемая: у `npx remotion render` в 4.0.496
      // флагов --width/--height нет вовсе (в @remotion/cli/dist их не
      // найти), а есть только --scale, который растягивает готовый кадр и
      // не меняет useVideoConfig(). Сцены же (567 файлов в src/scenes/)
      // все до одной верстаются от useVideoConfig().width/height — им
      // нужен ИМЕННО другой видеоконфиг, а не масштаб на выходе.
      // calculateMetadata умеет вернуть width/height/fps, и ровно так же
      // здесь устроен Overlay выше — одно правило на обе композиции.
      //
      // fps тоже читается из props, а не прибит числом 30: длительность
      // раньше считалась `p.dur * 30` при любом fps композиции, и на
      // канале с другой частотой сцена вышла бы не той длины.
      calculateMetadata={({props}) => {
        const p = props as SceneProps;
        const fps = p.fps ?? 30;
        return {
          durationInFrames: Math.max(2, Math.round((p.dur ?? 5) * fps)),
          fps,
          width: p.width ?? 1920,
          height: p.height ?? 1080,
          props,
        };
      }}
    />
    </>
  );
};
