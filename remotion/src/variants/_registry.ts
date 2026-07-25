// АВТОГЕНЕРИРУЕМЫЙ ФАЙЛ — не редактировать руками.
// Пересоздаётся из overlays.rebuild_registry() по variants.json.
// Нужен потому, что Remotion собирает бандл статически:
// динамический import() в бандл не попадёт.
import React from 'react';
import type { VariantProps } from '../types';
import { CalloutAi6CDB } from './callout_ai_6cdb';
import { CompareAi69A7 } from './compare_ai_69a7';
import { TitlecardAi11B9 } from './titlecard_ai_11b9';

export const VARIANTS: Record<string, React.FC<VariantProps>> = {
  'callout/ai_6cdb': CalloutAi6CDB,
  'compare/ai_69a7': CompareAi69A7,
  'titlecard/ai_11b9': TitlecardAi11B9,
};
