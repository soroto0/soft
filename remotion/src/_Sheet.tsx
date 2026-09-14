import './index.css';
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Overlay } from './Overlay';
import type { OverlayProps } from './types';

// КОНТАКТНЫЙ ЛИСТ ПЛАШЕК — инструмент замера, не часть ролика.
//
// Живой Root.tsx не трогаем (та же причина, что и у ae_demo_entry.tsx):
// лист подключается своей точкой входа _sheet_entry.tsx и на сборку роликов
// не влияет.
//
// Зачем: проверять оверлеи по одному — это отдельный запуск браузера на
// каждый кадр (замер: ~20 с на плашку, 222 плашки = полтора часа). Лист
// рисует всю сетку за ОДИН кадр, и по нему сразу видно и глазами
// («формы разные?»), и числом («сколько кадра закрашено?»).
//
// bg задаётся снаружи: на сплошном #ff00ff доля НЕ-маджентовых пикселей в
// клетке и есть покрытие плашки, считать альфу не нужно.

type Cell = OverlayProps & { label?: string };

export type SheetProps = {
  cells: Cell[];
  cols: number;
  scale: number;
  bg: string;
  cellW: number;
  cellH: number;
  cap: number;      // высота полосы с подписью под клеткой, px готового листа
};

export const sheetSize = (p: SheetProps) => {
  const rows = Math.max(1, Math.ceil(p.cells.length / p.cols));
  return {
    width: Math.round(p.cols * p.cellW * p.scale),
    height: Math.round(rows * (p.cellH * p.scale + p.cap)),
  };
};

export const Sheet: React.FC<SheetProps> = (p) => {
  const w = p.cellW * p.scale;
  const h = p.cellH * p.scale;
  return (
    <AbsoluteFill style={{ background: '#101010', display: 'flex',
      flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' }}>
      {p.cells.map((cell, i) => (
        <div key={i} style={{ width: w, height: h + p.cap }}>
          {/* Кадр клетки. Всё, что внутри, — ровно то, что увидит зритель:
              Overlay получает настоящие width/height, а уменьшает клетку
              transform, а не другой размер кадра. Иначе кегли и отступы
              считались бы от чужой высоты и лист врал бы. */}
          <div style={{ width: w, height: h, position: 'relative',
            overflow: 'hidden', background: p.bg }}>
            <div style={{ position: 'absolute', left: 0, top: 0,
              width: p.cellW, height: p.cellH,
              transformOrigin: 'top left', transform: `scale(${p.scale})` }}>
              <Overlay {...cell} width={p.cellW} height={p.cellH} />
            </div>
          </div>
          <div style={{ height: p.cap, fontFamily: 'monospace',
            fontSize: Math.max(9, p.cap * 0.62), lineHeight: `${p.cap}px`,
            color: '#9aa', background: '#101010', paddingLeft: 6,
            whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {cell.label ?? `${cell.type}/${cell.variant ?? '-'}`}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
