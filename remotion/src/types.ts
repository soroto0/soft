// Общие типы для ядра (Overlay.tsx) и для сгенерированных вариантов
// (variants/*.tsx). Вынесены в отдельный файл намеренно: варианты не могут
// импортировать тип из Overlay.tsx, потому что Overlay.tsx сам импортирует
// реестр вариантов — получился бы цикл.

export type OverlayProps = {
  type: string;
  content: string;
  pos: string;
  dur: number;
  fps?: number;
  width?: number;
  height?: number;
  img?: string;
  items?: { label: string; img: string }[];
  variant?: string;
};

// Что получает КАЖДЫЙ вариант из библиотеки. exit/enter уже посчитаны ядром
// (useExit/useEnter в Overlay.tsx) — вариант не считает их сам, иначе тайминг
// появления/ухода разъедется с остальными оверлеями в ролике.
//   enter: 0→1 за первые 0.4с
//   exit:  1→0 за последние 0.3с от p.dur
// Оба надо умножать в opacity своих слоёв, иначе оверлей моргнёт при склейке.
export type VariantProps = OverlayProps & { exit: number; enter: number };

// Обложка для YouTube. Отдельный тип, а не вариант оверлея: у неё
// противоположные требования — непрозрачный фон на весь кадр и кегль,
// читаемый в ленте шириной ~210px.
//   headline — текст, перевод строки = новая строка в макете
//   bg       — путь к картинке относительно remotion/public, или http-URL
//   layout   — 'left' | 'bottom' | 'split'
export type ThumbnailProps = {
  headline: string;
  bg?: string;
  accent?: string;
  layout?: string;
};

// СЦЕНА — не оверлей. Занимает кадр целиком и заменяет собой съёмку там,
// где снимать нечего: планета, карта, схема узла, ход процесса. Оверлеи
// ложатся поверх видео, сцена сама и есть видео этого плана.
//   kind   — какую сцену рисовать (globe, map, ...)
//   title  — подпись в кадре, обычно ключевая фраза из закадрового текста
//   lat/lon — точка, если сцена про место
//   items  — данные сцены: этапы, узлы, значения
export type SceneProps = {
  kind: string;
  title?: string;
  lat?: number;
  lon?: number;
  items?: string[];
  dur: number;
  exit: number;
  enter: number;
};
