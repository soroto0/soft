import { DISPLAY, TEXT, SERIF } from '../fonts';

// ПОЧЕРК КАНАЛА. Здесь описано, чем плашки одного канала отличаются от
// плашек другого — и это НЕ «тот же вид другим цветом».
//
// Зачем файл вообще. Раньше все три канала брали плашки из одной общей
// библиотеки и разводились только смещением по номеру канала: один и тот же
// дизайн просто доставался им в разном порядке. Владелец сказал прямо: «я не
// хочу чтобы эти баннеры использовались в других моих каналах лишь в abyss
// хочу, а в других каналах должен быть новые баннеры по его стилям».
//
// Поэтому у каждой палитры СВОЙ словарь приёмов: свои места в кадре, свои
// подложки, свои техники появления. Пересечений между словарями нет ни
// одного — два канала не могут случайно получить одинаковую плашку, потому
// что таких плашек просто не существует в природе. Цвет тут — следствие, а
// не средство: даже перекрасив harsh в мёд, warm из него не получить, у него
// другая геометрия, другой шрифт и другая физика движения.
//
// Семьи цветов взяты не с потолка, а из уже описанного профиля канала:
// channels.json (palette/accent), render.PALETTES (монтаж), core.ATMOSPHERE
// (воздух кадра) и словаря семейств в webapp._regen_overlay_theme.

// Гарнитур ровно три — те же, что у всего проекта (fonts.ts). Своих сюда
// добавлять НЕЛЬЗЯ, и это не вкусовщина: шрифт берётся ТОЛЬКО из файлов в
// remotion/public/fonts, никаких loadFont() из @remotion/google-fonts и
// никаких ссылок на fonts.gstatic.com. Пока они были, рендер зависел от
// связи: замер 2026-08-05 15:54 — «ERR_NAME_NOT_RESOLVED,
// 0QIvMX1D_JOuMwT7I-NP.woff2», весь оверлей упал и плашку дорисовал запасной
// Pillow, то есть ролик молча вышел с чужой гарнитурой. Четвёртая гарнитура
// = ещё 4 файла .woff2 в репозиторий и ещё одна лицензия к проверке.
//
// Каналы разводятся не числом шрифтов, а РОЛЬЮ каждого: у harsh крупное
// набрано узким гротеском капсом с широкой разрядкой, у warm — антиквой
// полужирной строчными по светлой карточке, у contemplative — той же
// антиквой светлого начертания с большой разрядкой и без подложки вовсе.

export type Palette = 'harsh' | 'warm' | 'contemplative';

export type Look = {
  ink: string;          // основной текст
  inkDim: string;       // вторичный текст, подписи
  onPlate: string;      // текст поверх заливки подложки
  accent: string;       // акцент канала
  accent2: string;      // второй акцент — для контраста внутри плашки
  plate: string;        // заливка подложки
  edge: string;         // линии, рамки, рейки
  radius: number;       // скругление
  ruleW: number;        // толщина линий
  display: string;      // шрифт крупного
  body: string;         // шрифт мелкого
  quote: string;        // шрифт цитат
  upper: boolean;       // капс у заголовков
  track: string;        // межбуквенное
  weightHi: number;     // насыщенность крупного
  build: number;        // за сколько кадров собирается плашка
  shadow: string;
  anchors: string[];
  plates: string[];
  reveals: string[];
};

export const LOOKS: Record<Palette, Look> = {
  // abyss — разборы разрушений. Сталь, шифер, сигнальный оранжевый.
  // Прямые углы, узкий гротеск капсом, жёсткие короткие движения: так
  // выглядит документ, а не реклама. Акцент #b83a2b — из channels.json.
  harsh: {
    ink: '#eef1f2', inkDim: '#93a1a8', onPlate: '#eef1f2',
    accent: '#b83a2b', accent2: '#e2793a',
    plate: 'rgba(20,25,28,0.86)', edge: '#5d6b73',
    radius: 0, ruleW: 3,
    display: DISPLAY, body: TEXT, quote: DISPLAY,
    upper: true, track: '0.13em', weightHi: 700,
    build: 7, shadow: '0 8px 26px rgba(0,0,0,0.55)',
    anchors: ['bl', 'tl', 'br', 'bottomBar'],
    plates: ['slab', 'railed', 'bracket', 'strip'],
    reveals: ['snap', 'wipeL', 'drop', 'blink'],
  },
  // home-vault — бережливый быт. Мёд, дерево, кирпич. Светлая подложка с
  // ТЁМНЫМ текстом (в кадре это читается как ценник или карточка рецепта) —
  // единственный из трёх каналов, где плашка светлее видео. Скруглённые
  // углы, антиква полужирная строчными, мягкий подъём.
  // Акцент #3f9e6b — из channels.json, зелень идёт вторым голосом.
  warm: {
    ink: '#f6ece0', inkDim: '#c8ab8c', onPlate: '#33261a',
    accent: '#b5711f', accent2: '#3f9e6b',
    plate: 'rgba(247,237,222,0.94)', edge: '#8a6a45',
    radius: 14, ruleW: 4,
    display: SERIF, body: TEXT, quote: SERIF,
    upper: false, track: '0.005em', weightHi: 600,
    build: 13, shadow: '0 14px 34px rgba(40,22,8,0.38)',
    anchors: ['blCard', 'bottomCard', 'tr', 'centerLow'],
    plates: ['card', 'tape', 'note', 'ribbon'],
    reveals: ['rise', 'unfold', 'swing', 'fadeUp'],
  },
  // estoico-es — философы, 70 минут. Пыльная зелень, камень, выцветший
  // индиго. Заливки почти нет — только волосяные линии и воздух, антиква
  // строчными с широкой выключкой, движение долгое и почти незаметное.
  // Акцент #c8873a — из channels.json.
  contemplative: {
    ink: '#ece5d8', inkDim: '#a79c88', onPlate: '#ece5d8',
    accent: '#c8873a', accent2: '#7d8b74',
    plate: 'rgba(34,38,36,0.52)', edge: '#8d9488',
    radius: 2, ruleW: 1,
    display: SERIF, body: TEXT, quote: SERIF,
    upper: false, track: '0.06em', weightHi: 500,
    build: 26, shadow: '0 10px 30px rgba(0,0,0,0.35)',
    anchors: ['center', 'leftColumn', 'bottomWide', 'topQuiet'],
    plates: ['hairline', 'stone', 'margin', 'bare'],
    reveals: ['breathe', 'drawRule', 'driftUp', 'letterFade'],
  },
};

export type FormSpec = {
  anchor: string;
  plate: string;
  reveal: string;
  accentSwap: boolean;   // менять местами первый и второй акцент
};

// Тип оверлея, у которого место в кадре задано смыслом, а не вкусом:
// штамп обязан стоять в углу, титр — во весь кадр, выноска — у своей точки.
// Для них якорь из словаря канала игнорируется, иначе вариант «титульная
// карточка в левом нижнем углу» ломал бы саму идею типа.
const FIXED_LAYOUT = ['titlecard', 'quote', 'kinetic', 'compare', 'collage',
  'gallery', 'popup', 'callout', 'highlight', 'counter', 'infographic',
  'redact', 'marker'];

export const isFixedLayout = (type: string): boolean =>
  FIXED_LAYOUT.indexOf(type) >= 0;

// Разбор номера варианта на приёмы. Смешанное основание, а не хеш: соседние
// номера гарантированно дают РАЗНЫЕ подложку и появление, а не «как повезёт».
// 4x4x4 = 64 непохожих сочетания на канал — столько вариантов на тип ни один
// канал не выберет, значит фабрика не упрётся в потолок.
export const formSpec = (palette: Palette, n: number): FormSpec => {
  const L = LOOKS[palette];
  const i = Math.max(0, Math.floor(n));
  return {
    anchor: L.anchors[i % L.anchors.length],
    plate: L.plates[Math.floor(i / L.anchors.length) % L.plates.length],
    reveal: L.reveals[
      Math.floor(i / (L.anchors.length * L.plates.length)) % L.reveals.length],
    accentSwap: Math.floor(i / 7) % 2 === 1,
  };
};
