import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import type { ThumbnailProps } from './types';

// Обложка для YouTube — принципиально НЕ оверлей: здесь фон обязан быть
// непрозрачным на весь кадр, а текст — читаемым в ленте шириной ~210px,
// то есть кегль в 3-4 раза крупнее, чем в титрах. Поэтому отдельная
// композиция, а не вариант titlecard.
//
// ТРИ РАЗНЫХ УСТРОЙСТВА ОБЛОЖКИ, ПО ОДНОМУ НА КАНАЛ, И ПО НЕСКОЛЬКУ СХЕМ
// ВНУТРИ КАЖДОГО.
//
// Раньше вёрстка была ОДНА на все каналы (фото на весь кадр, блок текста
// слева по центру, 2-3 строки капсом одного кегля), и менялась у неё только
// палитра. Замер по готовым файлам abyss/thumbs/thumb1.jpg и
// estoico-es/thumbs/thumb1.jpg: совпадало всё, кроме слов и фотографии.
//
// Что рисовать вместо этого — НЕ придумано, а СНЯТО с обложек лидеров и
// провалов каждой ниши (обложки скачаны по id из .niche_cache,
// i.ytimg.com/vi/{id}/maxresdefault.jpg). Ниши оказались устроены
// по-разному, и переносить приём с одной на другую нельзя:
//
//   abyss / Fascinating Horror (1.45M, медиана 375 328)
//     Победители (x8.85 Soyuz 11, x7.32 Ronan Point, x4.71 AA191): АНТИКВА
//     капителью, белая с толстой чёрной обводкой — не гротеск. Кадр —
//     выцветший архив с тяжёлой виньеткой, будто кассета. Текст либо
//     колонкой справа от объекта, либо лентой по верху с именем канала
//     мелко внизу. Единственное цветное пятно — красное свечение за
//     объектом. Ни стрелок, ни галочек, ни плашек с годом.
//     Оговорка честная: провалы этого канала (x0.07-0.09) — все Shorts,
//     вертикальные и вовсе без текста, то есть сравнение спутано форматом.
//     Поэтому для abyss взято устройство ПОБЕДИТЕЛЕЙ, а не разница.
//
//   estoico-es / Philosophy Origins Español (33.3k, медиана 19 864)
//     Победители (x16.63 Schopenhauer, x14.71 Spinoza, x11.42 Dostoyevski):
//     тяжёлый сжатый гротеск, ИМЯ МЫСЛИТЕЛЯ жёлтым — самое крупное слово в
//     кадре, под ним второй строкой белым «DOCUMENTAL» или короткий
//     вопрос. Текст занимает ОДИН угол (верх-лево, низ-лево, низ-право —
//     у каждого ролика свой), остальное отдано сцене: комната, лампа,
//     рукописи, собор — с глубиной и предметами.
//     Провалы (x0.09-0.03): те же шрифт и цвета, но самое крупное слово —
//     отвлечённое понятие («EXISTENCIALISMO FILOSÓFICO») или ЦИТАТА, а
//     кадр — вырезанные бюсты на чёрной пустоте, без сцены и глубины.
//     Значит решает не сдержанность оформления, а ЧТО крупнее всего
//     написано и есть ли за текстом настоящая сцена.
//
//   home-vault / Elias Yoder (317k, медиана 68 695)
//     Образец владельца + пара x29.05 «KILL EVERY Mosquito» против x0.14
//     «Unclog Any Kitchen Sink»: полный набор элементов — заголовок в три
//     ступени разного кегля и цвета, подзаголовок, столбик выгод с
//     галочками, лента внизу, стрелка на предмет, круглая врезка с
//     деталью. Свет тёмный и драматичный, а не ровный кухонный.

const HEX = /^#[0-9a-fA-F]{3,8}$/;

type Look = {
  font: string;
  upper: boolean;
  weight: number;
  tracking: string;
  smallCaps: boolean;
  // Средняя ширина знака в долях кегля — СВОЯ у каждой гарнитуры. Замер по
  // отрендеренным обложкам: Franklin Gothic капсом 0.49, Arial Black
  // капсом 0.75, Georgia строчными 0.58 — полтора раза разницы. Один общий
  // делитель подгонялся под узкий шрифт, и на широком строка «BEND FIX» не
  // влезала в колонку, переносилась и растягивала плашку на пол-кадра.
  advance: number;
  maxSize: number;
  // Схемы вёрстки этого канала. Их несколько намеренно: одна схема на
  // канал — это тот же шаблон, только свой. Выбор по хешу заголовка, то
  // есть от ролика к ролику схема меняется, а один и тот же ролик всегда
  // рисуется одинаково (иначе перерисовка обложки давала бы другую).
  schemes: string[];
  // Какая ступень заголовка САМАЯ КРУПНАЯ И ЦВЕТНАЯ. Не косметика: у
  // estoico-es это первая строка, потому что у всех победителей ниши самое
  // крупное слово в кадре — ИМЯ МЫСЛИТЕЛЯ, а у провалов на его месте стоит
  // отвлечённое понятие. У home-vault это вторая строка — та, где цена.
  // -1 значит «все ступени равны», как у хроники.
  loud: number;
  archive: boolean;      // выцветание и виньетка «архивной кассеты»
  glow: boolean;         // цветное свечение за объектом
  badges: boolean;       // столбик выгод с галочками
  ribbon: boolean;       // нижняя лента из трёх пунктов
  inset: boolean;        // круглая зум-врезка на деталь
  arrow: boolean;        // стрелка-указатель
  rough: boolean;        // рваные края плашек (трафаретная краска)
  scrim: number;
  hi: string;            // цвет самого крупного слова / подсветки
  alarm: string;         // цвет плашки под строкой
  // НА КАКОЙ строке плашка. Было жёстко i === 2, то есть только на
  // третьей: у harsh заголовки в две строки, и цветного пятна не
  // выходило никогда — все шесть готовых обложек einsturzpunkt
  // белым по серому. 'last' ставит плашку на последнюю строку, но
  // только когда строк больше одной: одинокая строка целиком на
  // плашке читается как кнопка, а не как заголовок.
  plate: 'none' | 'last' | 'third';
};

const LOOKS: Record<string, Look> = {
  harsh: {
    // БЫЛА ТОНКАЯ АНТИКВА ОБЫЧНОГО ВЕСА — и это, а не заголовок, держало CTR.
    // Замер на живом ролике einsturzpunkt/2026-08-10: заголовок набрал 4/4 по
    // закону клика, 1600 показов, а CTR вышел 2,3% при том, что нормой старта
    // в документальной нише считают 5-8%. Собственная приёмка софта поставила
    // той обложке 45/100 с диагнозом «блёклая палитра и плотный текст».
    //
    // Смотреть надо было на связку: Georgia 400 капителью, белым по серому
    // бетону, да ещё под затемнением 0.55 — в ленте между яркими соседями это
    // ровное пятно. У победителей ниши на обложке тяжёлый узкий гротеск и
    // цветное пятно-якорь.
    //
    // Oswald — тот же шрифт, что несёт плашки этого канала (DISPLAY в
    // fonts.ts), он уже самохостится и грузится с delayRender. Единство с
    // роликом здесь плюс: зритель узнаёт канал в ленте.
    font: 'Oswald, "Arial Narrow", Impact, sans-serif',
    upper: true,
    weight: 700,
    tracking: '0.01em',
    smallCaps: false,
    advance: 0.5,
    maxSize: 96,
    // Четыре схемы, а не две: при двух из четырёх обложек подряд три легли
    // на одну и ту же (замер einsturzpunkt 13.08), и канал в ленте читался
    // как один ролик, размноженный. Список ДОЛЖЕН совпадать с
    // core.THUMB_LAYOUT['harsh']['schemes'] — там по этим же именам считается
    // бюджет знаков для приёмки обложек.
    schemes: ['column', 'band', 'tl', 'br'],
    loud: -1,
    archive: true,
    glow: true,
    badges: false,
    ribbon: false,
    inset: false,
    arrow: false,
    rough: false,
    scrim: 0.55,
    hi: '#ffffff',
    // Пустая строка означала «цветного якоря нет вовсе»: все три обложки
    // ролика 10.08 вышли бесцветными, белым по серому. Один цвет в кадре —
    // это то, за что глаз цепляется в ленте раньше, чем прочитает слово.
    // Берём акцент канала из channels.json (#e2622a), а не произвольный
    // красный: обложка и плашки в ролике должны быть одного канала.
    alarm: '#e2622a',
    plate: 'last',
  },
  warm: {
    font: 'Impact, "Haettenschweiler", "Arial Narrow", "Arial Black", sans-serif',
    upper: true,
    weight: 400,
    tracking: '0.005em',
    smallCaps: false,
    advance: 0.47,
    maxSize: 128,
    schemes: ['sheet', 'panel'],
    loud: 1,
    archive: false,
    glow: false,
    badges: true,
    ribbon: true,
    inset: true,
    arrow: true,
    rough: true,
    scrim: 0.8,
    hi: '#f2b134',
    alarm: '#b03a2e',
    plate: 'third',
  },
  // ЖИВОЕ (tiefenzeit). Замер восьми обложек @Extremwelt 30.08.2026.
  // Устройство, повторяющееся во всех восьми:
  //   - две строки, верхняя МЕЛЬЧЕ нижней («GRÖSSER ALS» / «LÖWEN»,
  //     «DIE GIGANTEN» / «DER TIEFSEE», «WIR LAGEN» / «FALSCH»);
  //   - крупная нижняя строка КРАСНАЯ, верхняя белая — цветного всегда
  //     меньше, чем белого. Это ровно механика loud + hi, поэтому loud: 1;
  //   - текст в пустой половине кадра, существо в другой: схемы bl/tl/band
  //     дают блок шириной 660 из 1280, то есть ровно половину;
  //   - широкий тяжёлый гротеск, не узкий: Arial Black, а не Oswald;
  //   - ни плашек, ни лент, ни стрелок, ни рамок — alarm пуст, badges,
  //     ribbon, inset, arrow, rough все false;
  //   - затемнение слабое (0.32): фон и так почти чёрный, и сильный scrim
  //     съедал бы контровой свет, ради которого кадр и снят.
  wildlife: {
    font: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
    upper: true,
    weight: 900,
    tracking: '0.005em',
    smallCaps: false,
    advance: 0.58,
    maxSize: 150,
    schemes: ['bl', 'tl', 'band'],
    loud: 1,
    archive: false,
    glow: false,
    badges: false,
    ribbon: false,
    inset: false,
    arrow: false,
    rough: false,
    scrim: 0.32,
    hi: '#e01b1b',
    alarm: '',
    plate: 'none',
  },
  contemplative: {
    font: 'Impact, "Haettenschweiler", "Arial Narrow", "Arial Black", sans-serif',
    upper: true,
    weight: 400,
    tracking: '0.01em',
    smallCaps: false,
    advance: 0.47,
    maxSize: 120,
    schemes: ['tl', 'bl', 'br'],
    loud: 0,
    archive: false,
    glow: false,
    badges: false,
    ribbon: false,
    inset: false,
    arrow: false,
    rough: false,
    scrim: 0.5,
    hi: '#f2c832',
    alarm: '',
    plate: 'none',
  },
};

// Канал без палитры не должен остаться вообще без обложки.
const LOOK_DEFAULT: Look = {
  font: '"Segoe UI Black", "Arial Black", sans-serif',
  upper: true,
  weight: 900,
  tracking: '-0.02em',
  smallCaps: false,
  advance: 0.62,
  maxSize: 140,
  schemes: ['bl'],
  loud: -1,
  archive: false,
  glow: false,
  badges: false,
  ribbon: false,
  inset: false,
  arrow: false,
  rough: false,
  scrim: 0.85,
  hi: '#ffffff',
  alarm: '',
  plate: 'none',
};

// Кегль под КОНКРЕТНУЮ строку и КОНКРЕТНУЮ ширину колонки. Переносы на
// обложке расставляет модель; лишний перенос от нехватки места — это
// сломанный макет, поэтому строка не переносится сама, а уменьшается.
// Пол кегля — 64, а не 24. Обложка рисуется шириной 1280, а в ленте
// YouTube показывает её на 210 точках: уменьшение в 6.1 раза. Двадцать
// четыре пикселя превращаются в ЧЕТЫРЕ — это не мелкий шрифт, это
// невидимый. Порог читаемости на экране около 10 точек, значит в макете
// нужно не меньше 61; берём 64 с запасом.
//
// Судья зрения сказал об этом дважды на разных обложках: «текст мелкий и
// сбит, при 210 точках не разобрать». Раньше подгонка молча ужимала
// длинный заголовок до нечитаемого вместо того, чтобы признать его
// слишком длинным.
export const MIN_SIZE = 64;

const fit = (text: string, avail: number, look: Look, max: number) =>
  Math.max(MIN_SIZE,
           Math.min(max, avail / (Math.max(text.length, 1) * look.advance)));

// Устойчивый выбор схемы: одинаковый заголовок — одинаковая схема, разные
// ролики — разные схемы. Тот же приём, что у библиотеки оверлеев.
const pick = (seed: string, list: string[]) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
};

const STROKE = {
  WebkitTextStroke: '4px rgba(0,0,0,0.92)',
  paintOrder: 'stroke fill' as const,
  textShadow: '0 6px 20px rgba(0,0,0,0.85)',
};

// Подсветка ключевых слов: всё, где есть цифра или знак валюты, уходит во
// второй цвет. Правило механическое намеренно — цена и сумма экономии и
// есть то, ради чего эту обложку открывают, а отдельное поле «что
// подсветить» модель возвращала бы пустым в половине случаев.
const hilite = (text: string, hi: string) =>
  text.split(/(\s+)/).map((w, i) =>
    /[\d$€£]/.test(w) ? (
      <span key={i} style={{ color: hi }}>
        {w}
      </span>
    ) : (
      <span key={i}>{w}</span>
    )
  );

export const Thumbnail: React.FC<ThumbnailProps> = (p) => {
  const look = LOOKS[(p.style ?? '').toLowerCase()] ?? LOOK_DEFAULT;
  const accent = HEX.test(p.accent ?? '') ? (p.accent as string) : '#f5c451';
  const lines = (p.headline || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const sub = (p.sub ?? '').trim();
  const badges = (look.badges ? p.badges ?? [] : []).filter(Boolean).slice(0, 4);
  const ribbon = (look.ribbon ? p.ribbon ?? [] : []).filter(Boolean).slice(0, 3);
  const fx = Math.min(94, Math.max(6, p.focusX ?? 68));
  const fy = Math.min(94, Math.max(6, p.focusY ?? 52));
  // Схему выбирает канал, а раскладка от модели служит только затравкой:
  // модель не знает, какие схемы у канала есть, и разрешать ей выбирать
  // значило бы вернуть общий пул раскладок на все каналы.
  const scheme = pick((p.headline || '') + (p.layout || ''), look.schemes);

  const src = p.bg
    ? /^(https?:|data:)/.test(p.bg)
      ? p.bg
      : staticFile(p.bg)
    : '';

  // Где стоит текстовый блок и какой он ширины — это и есть схема.
  const box: React.CSSProperties =
    scheme === 'column'
      ? { right: 44, top: 96, width: 560, textAlign: 'right', alignItems: 'flex-end' }
      : scheme === 'band'
      ? { left: 60, right: 60, top: 42, alignItems: 'center', textAlign: 'center' }
      : scheme === 'tl'
      ? { left: 44, top: 34, width: 620, alignItems: 'flex-start' }
      : scheme === 'br'
      ? { right: 44, bottom: 44, width: 620, textAlign: 'right', alignItems: 'flex-end' }
      : scheme === 'panel'
      ? { left: 40, top: 128, width: 520, alignItems: 'flex-start' }
      : scheme === 'sheet'
      ? { left: 44, top: 150, width: 660, alignItems: 'flex-start' }
      : { left: 44, bottom: ribbon.length ? 132 : 48, width: 660, alignItems: 'flex-start' };
  const colW = Number(box.width ?? 660) || 1160;

  return (
    <AbsoluteFill style={{ backgroundColor: '#101116' }}>
      {/* Рваные края плашек — почерк home-vault: шум смещает контур, будто
          краску клали по трафарету. seed фиксирован, иначе одна и та же
          обложка рендерилась бы каждый раз чуть иначе. */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id="torn">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={3} seed={7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={11} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {src ? (
        <Img
          // data: и http(s): отдаём как есть. Через staticFile() их пускать
          // нельзя — он резолвит путь относительно public/, и data-URI
          // превращался в http://localhost:3001/public/data%3Aimage...
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            // архивная кассета: выцветание. Победители этой ниши выглядят
            // как плёнка, а не как свежая фотография. Яркость НЕ трогаем:
            // поверх ляжет ещё виньетка и затемнение под текстом, и вместе
            // они уже съедали кадр — замерено, обложка abyss выходила почти
            // чёрной, разобрать на ней было нечего.
            filter: look.archive ? 'saturate(0.55) contrast(0.95)' : undefined,
          }}
        />
      ) : null}

      {/* Свечение за объектом — единственное цветное пятно в сером кадре,
          приём победителей Fascinating Horror. Лежит ПОВЕРХ фотографии в
          режиме screen: снизу оно смешивалось режимом multiply и не
          подсвечивало объект, а гасило весь кадр до черноты. */}
      {look.glow ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at ${fx}% ${fy}%, ${accent} 0%, rgba(0,0,0,0) 42%)`,
            mixBlendMode: 'screen',
            opacity: 0.4,
          }}
        />
      ) : null}

      {/* виньетка — вторая половина «архивного» вида */}
      {look.archive ? (
        <AbsoluteFill
          style={{
            background:
              'radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.35) 74%, rgba(0,0,0,0.72) 100%)',
          }}
        />
      ) : null}

      {/* Затемнение под текстом — по той стороне, где текст и стоит */}
      <AbsoluteFill
        style={{
          background:
            scheme === 'band'
              ? `linear-gradient(to bottom, rgba(0,0,0,${look.scrim}) 0%, rgba(0,0,0,0) 34%), linear-gradient(to top, rgba(0,0,0,${look.scrim}) 0%, rgba(0,0,0,0) 26%)`
              : scheme === 'column' || scheme === 'br'
              ? `linear-gradient(to left, rgba(0,0,0,${look.scrim}) 0%, rgba(0,0,0,${look.scrim * 0.5}) 46%, rgba(0,0,0,0) 78%)`
              : scheme === 'tl'
              ? `linear-gradient(to bottom right, rgba(0,0,0,${look.scrim}) 0%, rgba(0,0,0,0) 58%)`
              : `linear-gradient(to right, rgba(0,0,0,${look.scrim}) 0%, rgba(0,0,0,${look.scrim * 0.55}) 50%, rgba(0,0,0,0) 84%)`,
        }}
      />

      {/* Тёмная панель под текстом — схема «panel»: кадр честно делится на
          беду слева и решение справа, как в образце владельца */}
      {scheme === 'panel' ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 600,
            background: 'linear-gradient(to right, rgba(8,8,10,0.95) 62%, rgba(8,8,10,0) 100%)',
          }}
        />
      ) : null}

      {ribbon.length ? (
        <AbsoluteFill
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.72) 96px, rgba(0,0,0,0) 140px)',
          }}
        />
      ) : null}

      {/* СТРЕЛКА на предмет. Куда именно — говорит модель (focusX/focusY):
          она придумала фон и знает, где там проблема. Без этого стрелка
          указывала бы в случайное место кадра. */}
      {look.arrow ? (
        <svg width={1280} height={720} style={{ position: 'absolute', inset: 0 }} viewBox="0 0 1280 720">
          <defs>
            <marker id="ah" markerWidth={6} markerHeight={6} refX={4.8} refY={3} orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={look.alarm || accent} />
            </marker>
          </defs>
          <path
            d={`M ${(fx * 1280) / 100 - 230} ${(fy * 720) / 100 - 170}
                Q ${(fx * 1280) / 100 - 178} ${(fy * 720) / 100 - 46}
                  ${(fx * 1280) / 100 - 54} ${(fy * 720) / 100 - 26}`}
            fill="none"
            stroke={look.alarm || accent}
            strokeWidth={11}
            strokeLinecap="round"
            markerEnd="url(#ah)"
          />
        </svg>
      ) : null}

      {/* ЗУМ-ВРЕЗКА: тот же фон, увеличенный на точке интереса, в круге с
          цветным кольцом. Второй картинки не просим — суточный лимит
          изображений конечен, а увеличенный фрагмент показывает ровно ту
          деталь, ради которой обложка и сделана. */}
      {look.inset && src ? (
        <div
          style={{
            position: 'absolute',
            right: 40,
            bottom: 132,
            width: 176,
            height: 176,
            borderRadius: '50%',
            overflow: 'hidden',
            border: `7px solid ${look.alarm || accent}`,
            boxShadow: '0 12px 30px rgba(0,0,0,0.7)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: `url(${src})`,
              backgroundSize: '340% 340%',
              backgroundPosition: `${fx}% ${fy}%`,
            }}
          />
        </div>
      ) : null}

      {/* СТОЛБИК ВЫГОД: галочка цвета канала на чёрной рваной плашке.
          Только у home-vault — на разборе обрушения «SAVES YOU THOUSANDS»
          было бы ложью про жанр. */}
      {badges.length ? (
        <div
          style={{
            position: 'absolute',
            right: 30,
            top: 34,
            width: 486,
            display: 'flex',
            flexDirection: 'column',
            gap: 11,
            alignItems: 'flex-end',
          }}
        >
          {badges.map((b, i) => (
            <div key={i} style={{ position: 'relative', padding: '8px 15px' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.87)',
                  filter: look.rough ? 'url(#torn)' : undefined,
                }}
              />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 900, fontSize: 28, color: accent, lineHeight: 1 }}>
                  ✔
                </span>
                <span
                  style={{
                    fontFamily: look.font,
                    fontSize: fit(b, 400, look, 36),
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    color: '#ffffff',
                    letterSpacing: '0.01em',
                  }}
                >
                  {hilite(b, look.hi)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ЗАГОЛОВОК — три уровня кегля вместо одного. Первая ступень мельче
          и белая, вторая — самая крупная и цветная (у estoico-es это имя
          мыслителя, самое крупное слово в кадре у всех победителей ниши),
          третья — на плашке тревоги. */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          gap: look.alarm ? 3 : 5,
          ...box,
        }}
      >
        {lines.map((line, i) => {
          const big =
            look.loud < 0
              ? false
              : lines.length > 1
              ? i === Math.min(look.loud, lines.length - 1)
              : true;
          // loud < 0 значит «все ступени РАВНЫ», и равны они полному кеглю.
          // Прежняя формула умножала на 0.66 и такие строки тоже: у harsh
          // выходило 96*0.66 = 63.4, то есть НИЖЕ MIN_SIZE, и каждая строка
          // канала рисовалась ровно 64 px независимо от длины — 10.5 px в
          // ленте YouTube. Канал, у которого замеренный победный приём —
          // целая фраза из 4-7 слов, физически не мог получить читаемую
          // обложку: подгонка кегля для него не работала вовсе.
          const mul = look.loud < 0 ? 1 : big ? 1 : 0.66;
          const size = fit(line, colW, look, look.maxSize * mul);
          const plateIdx =
            look.plate === 'last'
              ? (lines.length > 1 ? lines.length - 1 : -1)
              : look.plate === 'third'
              ? 2
              : -1;
          const onPlate = !!look.alarm && i === plateIdx;
          return (
            <div key={i} style={{ position: 'relative', padding: onPlate ? '4px 16px 9px' : 0 }}>
              {onPlate ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: look.alarm,
                    filter: look.rough ? 'url(#torn)' : undefined,
                  }}
                />
              ) : null}
              <div
                style={{
                  position: 'relative',
                  fontFamily: look.font,
                  fontWeight: look.weight,
                  fontSize: size,
                  lineHeight: 1.02,
                  letterSpacing: look.tracking,
                  textTransform: look.upper ? 'uppercase' : 'none',
                  fontVariant: look.smallCaps ? 'small-caps' : undefined,
                  whiteSpace: 'nowrap',
                  color: big && !onPlate ? look.hi : '#ffffff',
                  ...STROKE,
                }}
              >
                {line}
              </div>
            </div>
          );
        })}

        {sub ? (
          <div
            style={{
              marginTop: 12,
              fontFamily: look.font,
              fontWeight: look.weight,
              fontSize: fit(sub, colW, look, look.maxSize * 0.42),
              letterSpacing: '0.02em',
              textTransform: look.upper ? 'uppercase' : 'none',
              fontVariant: look.smallCaps ? 'small-caps' : undefined,
              whiteSpace: 'nowrap',
              color: '#ffffff',
              ...STROKE,
            }}
          >
            {hilite(sub, look.hi)}
          </div>
        ) : null}
      </div>

      {/* НИЖНЯЯ ЛЕНТА: три пункта на чёрных рваных плашках */}
      {ribbon.length ? (
        <div
          style={{
            position: 'absolute',
            left: 30,
            right: 30,
            bottom: 20,
            display: 'flex',
            gap: 13,
            justifyContent: 'space-between',
          }}
        >
          {ribbon.map((r, i) => (
            <div key={i} style={{ position: 'relative', flex: 1, padding: '9px 10px', textAlign: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.9)',
                  filter: look.rough ? 'url(#torn)' : undefined,
                }}
              />
              <div
                style={{
                  position: 'relative',
                  fontFamily: look.font,
                  fontSize: fit(r, 372, look, 30),
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  color: i === 1 ? look.hi : '#ffffff',
                  letterSpacing: '0.02em',
                }}
              >
                {hilite(r, look.hi)}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
