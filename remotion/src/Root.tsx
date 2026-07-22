import './index.css';
import {Composition} from 'remotion';
import {Overlay, OverlayProps} from './Overlay';

// Одна композиция «Overlay»: тип, контент и геометрия приходят из props
// (их передаёт python-пайплайн через --props=file.json)
export const RemotionRoot: React.FC = () => {
  return (
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
  );
};
