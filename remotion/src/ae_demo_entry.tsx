// Отдельная точка входа для пробы «монтаж как в AE».
//
// Живой Root.tsx НЕ трогаем: он регистрирует боевые композиции конвейера, и
// правка в нём ради пробы — верный способ уронить сборку роликов. Remotion
// принимает произвольный entry point, поэтому проба живёт своей жизнью и
// удаляется одним файлом.
import './index.css';
import {Composition, registerRoot} from 'remotion';
import {AeDemo} from './AeDemo';
import {TypoDemo} from './TypoDemo';
import {HeroDemo} from './HeroDemo';

const Root: React.FC = () => (
  <>
    <Composition
      id="AeDemo"
      component={AeDemo}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="TypoDemo"
      component={TypoDemo}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="HeroDemo"
      component={HeroDemo}
      durationInFrames={450}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);

registerRoot(Root);
