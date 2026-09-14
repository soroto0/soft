import { Composition, registerRoot } from 'remotion';
import { Sheet, sheetSize } from './_Sheet';
import type { SheetProps } from './_Sheet';

// Точка входа контактного листа. Живой Root.tsx не трогаем — см. _Sheet.tsx.
// Собирается отдельно:
//   npx remotion bundle src/_sheet_entry.tsx build_sheet
//   npx remotion still build_sheet Sheet out.png --props=cells.json --frame=N

const Root: React.FC = () => (
  <Composition
    id="Sheet"
    component={Sheet}
    durationInFrames={240}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{
      cells: [{ type: 'lower3', content: 'Пример', pos: 'bottom', dur: 4 }],
      cols: 1, scale: 0.5, bg: '#ff00ff',
      cellW: 1920, cellH: 1080, cap: 22,
    } as SheetProps}
    calculateMetadata={({ props }) => {
      const s = sheetSize(props as SheetProps);
      // Чётная сторона: h264 и часть кодеков нечётную не берут, а лист
      // иногда хочется снять видео, а не картинкой.
      return { width: s.width + (s.width % 2), height: s.height + (s.height % 2),
        durationInFrames: 240, fps: 30, props };
    }}
  />
);

registerRoot(Root);
