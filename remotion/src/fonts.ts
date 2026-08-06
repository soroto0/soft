import { continueRender, delayRender, staticFile } from 'remotion';

// Гарнитуры всей моушн-графики: и встроенных видов из Overlay.tsx, и вариантов
// из библиотеки.
//
// Отдельным модулем, а не константами в Overlay.tsx, по той же причине, по
// которой туда переехал OverlayProps: варианты не могут тянуть ничего из
// Overlay.tsx — вышел бы цикл импортов. Один общий источник нужен, иначе
// половина плашек ролика набрана одним шрифтом, половина другим.
//
// Зачем вообще: до этого графика была набрана СИСТЕМНЫМИ шрифтами Windows —
// Segoe UI Black, Segoe UI, Bahnschrift, Georgia. Это гарнитуры интерфейса
// операционной системы, а не оформления, и в кадре они читаются дёшево;
// именно на них пришла жалоба «уродский шрифт». Вшить их в проект нельзя и по
// второй причине: репозиторий публичный, а распространять Segoe не разрешено.
//
// ПОЧЕМУ ФАЙЛЫ ЛЕЖАТ В public/fonts, А НЕ @remotion/google-fonts. Раньше
// здесь стоял loadFont() из @remotion/google-fonts, и вот этот же комментарий
// уверял, что «файлы лежат в проекте и никуда не ходят по сети». Это была
// неправда: пакет держит только СПИСОК ссылок, а сам .woff2 браузер тянет с
// fonts.gstatic.com в момент рендера. Журнал 2026-08-05 15:54 —
// «0QIvMX1D_JOuMwT7I-NP.woff2: net::ERR_NAME_NOT_RESOLVED», рендер оверлея
// упал целиком и плашку дорисовал запасной Pillow, то есть ролик молча вышел
// с другой гарнитурой. Поломка тихая: в кадре просто другой шрифт, никто не
// замечает. Плюс каждый ночной прогон зависел от чужого сервера.
//
// Теперь .woff2 лежат в репозитории (см. remotion/public/fonts), подключаются
// через staticFile и раздаются тем же сервером, что и сам бандл — сети не
// требуется вообще. Проверено обрывом связи: в hosts прописан
// «0.0.0.0 fonts.gstatic.com», оверлей отрисован — кадры совпали с эталоном
// побайтово, в журнале браузера ни одного обращения наружу.
//
// Начертания переменные (variable): один файл держит весь диапазон
// насыщенности, а в графике встречаются и 100, и 900. Подмножества нарезаны
// как у Google — latin/latin-ext/cyrillic/cyrillic-ext; текст в роликах
// русский, и без кириллических файлов кадр остался бы с квадратами.
//
// Лицензии — SIL OFL 1.1, файлы OFL-*.txt лежат рядом с .woff2: репозиторий
// публичный. Версии срезов: Oswald v57, Inter v20, Lora v37.
//
//   DISPLAY — узкий гротеск для крупного: счётчики, титры, плашки. Держит
//             большой кегль и не расплывается в белое пятно, как жирный Segoe.
//   TEXT    — подписи, мелкий текст, служебные строки.
//   SERIF   — цитаты: засечки отделяют чужую речь от закадрового голоса.

type Face = {
  family: string;
  style: 'normal' | 'italic';
  weight: string;
  file: string;
  range: string;
};

// Диапазоны символов — те же, что отдаёт css2 у Google. Без unicode-range
// браузер грузил бы все четыре файла на каждую надпись; с ним берётся ровно
// тот срез, чьи символы в строке есть.
const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, ' +
  'U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, ' +
  'U+2212, U+2215, U+FEFF, U+FFFD';
const LATIN_EXT =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, ' +
  'U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, ' +
  'U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';
const CYRILLIC =
  'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
const CYRILLIC_EXT =
  'U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F';

const SUBSETS: [string, string][] = [
  ['latin', LATIN],
  ['latin-ext', LATIN_EXT],
  ['cyrillic', CYRILLIC],
  ['cyrillic-ext', CYRILLIC_EXT],
];

const spread = (
  family: string,
  slug: string,
  weight: string,
  style: 'normal' | 'italic' = 'normal',
): Face[] =>
  SUBSETS.map(([name, range]) => ({
    family,
    style,
    weight,
    file: `${slug}-${name}.woff2`,
    range,
  }));

const FACES: Face[] = [
  ...spread('Oswald', 'oswald', '200 700'),
  ...spread('Inter', 'inter', '100 900'),
  ...spread('Lora', 'lora', '400 700'),
  ...spread('Lora', 'lora-italic', '400 700', 'italic'),
];

// Грузим через delayRender: без него первые кадры успевали бы отрисоваться
// системным запасным шрифтом — ровно та же тихая подмена гарнитуры, ради
// которой шрифты и переехали в проект. continueRender стоит и в catch:
// сорванная загрузка должна испортить кадр, а не подвесить рендер на час.
let loaded = false;

const loadAll = () => {
  if (loaded || typeof document === 'undefined') {
    return;
  }
  loaded = true;
  for (const f of FACES) {
    const handle = delayRender(`Шрифт ${f.file}`);
    const face = new FontFace(
      f.family,
      `url(${staticFile(`fonts/${f.file}`)}) format('woff2')`,
      { weight: f.weight, style: f.style, unicodeRange: f.range },
    );
    face
      .load()
      .then((ready) => {
        document.fonts.add(ready);
        continueRender(handle);
      })
      .catch(() => {
        continueRender(handle);
      });
  }
};

loadAll();

export const DISPLAY = 'Oswald';
export const TEXT = 'Inter';
export const SERIF = 'Lora';
