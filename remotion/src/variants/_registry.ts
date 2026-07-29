// АВТОГЕНЕРИРУЕМЫЙ ФАЙЛ — не редактировать руками.
// Пересоздаётся из overlays.rebuild_registry() по variants.json.
// Нужен потому, что Remotion собирает бандл статически:
// динамический import() в бандл не попадёт.
import React from 'react';
import type { VariantProps } from '../types';
import { BarsAiFCF3 } from './bars_ai_fcf3';
import { CalloutAi6CDB } from './callout_ai_6cdb';
import { CollageAi92B6 } from './collage_ai_92b6';
import { CompareAi69A7 } from './compare_ai_69a7';
import { GalleryAiDFC3 } from './gallery_ai_dfc3';
import { KineticAi3E90 } from './kinetic_ai_3e90';
import { MarkerAiB3D5 } from './marker_ai_b3d5';
import { QuoteAi7C1A } from './quote_ai_7c1a';
import { StampAi5B2D } from './stamp_ai_5b2d';
import { TimelineAiA18E } from './timeline_ai_a18e';
import { TitlecardAi11B9 } from './titlecard_ai_11b9';
import { TitlecardAiC4F7 } from './titlecard_ai_c4f7';

export const VARIANTS: Record<string, React.FC<VariantProps>> = {
  'bars/ai_fcf3': BarsAiFCF3,
  'callout/ai_6cdb': CalloutAi6CDB,
  'collage/ai_92b6': CollageAi92B6,
  'compare/ai_69a7': CompareAi69A7,
  'gallery/ai_dfc3': GalleryAiDFC3,
  'kinetic/ai_3e90': KineticAi3E90,
  'marker/ai_b3d5': MarkerAiB3D5,
  'quote/ai_7c1a': QuoteAi7C1A,
  'stamp/ai_5b2d': StampAi5B2D,
  'timeline/ai_a18e': TimelineAiA18E,
  'titlecard/ai_11b9': TitlecardAi11B9,
  'titlecard/ai_c4f7': TitlecardAiC4F7,
};
