// РАЗБОР СОДЕРЖИМОГО ОВЕРЛЕЯ — один на всех: и на воротах
// (Overlay.hasPayload), и в рисующем коде (Overlay.tsx, variants/_forms.tsx).
//
// Зачем отдельный файл. Ворота и рисующий код читали content ПО-РАЗНОМУ.
// Ворота спрашивали «строка непустая?», а рисовать пытались пары
// «подпись:значение». Строка «Kein Datensatz vorhanden» непустая, пар в ней
// ноль — и в ролик уходила подложка без единого знака внутри. Замер на
// стенде (кадр 45, вариант ch_harsh_01, шахматка под альфой):
//   bars     | Kein Datensatz vorhanden -> тёмная полоса 848x36, 1.59% кадра,
//                                          содержимого нет;
//   compare  | Nur eine Seite           -> правая рамка пустая, 4.87% кадра;
//   titlecard| ::01                     -> встроенный вид залил ВЕСЬ кадр
//                                          rgba(0,0,0,0.35) на 4 секунды.
// Пока разбор живёт в двух местах, он рано или поздно разъезжается снова,
// поэтому он здесь один.
//
// Файл намеренно не импортирует ничего из src/: Overlay.tsx тянет реестр
// вариантов, варианты тянут _forms.tsx — любой импорт отсюда наверх замкнул
// бы цикл (та же причина, по которой типы вынесены в types.ts).

/** Разделители, которые сами по себе ничего не значат: «::» между заголовком
 *  и подписью, «;;» между карточками, «*» перед зачернённой строкой. */
export const RE_SEPS = /::|;;|\*/g;

/** Есть ли хоть одна буква или цифра, когда разделители убраны.
 *
 *  Точная копия has_payload из overlays.py, включая причину: у quote, stamp и
 *  titlecard разделитель «::» дописывается автоматически, и текст,
 *  потерявшийся по дороге, приходит сюда строкой «::» — формально непустой.
 *  \p{L}\p{N} с флагом u, а не [a-z0-9]: содержимое бывает немецким,
 *  испанским и русским, и «Ürüne» обязано считаться буквами. */
export const anyAlnum = (s: string): boolean =>
  /[\p{L}\p{N}]/u.test((s || '').replace(RE_SEPS, ' '));

/** Часть до первого «::» — то, ради чего плашка существует: тема титра, сама
 *  цитата, левая половина сравнения. Часть ПОСЛЕ разделителя бывает пустой
 *  законно (автор, дата, номер главы), часть до — никогда. */
export const headOf = (s: string): string => (s || '').split('::')[0];

/** Пары «подпись:число» — так читают content bars и infographic.
 *  lastIndexOf, а не первое двоеточие: подпись сама бывает с двоеточием
 *  («Stufe 2: Riss»), и по первому знаку значение уехало бы в подпись. */
export const numPairs = (s: string): { label: string; value: number }[] => {
  const out: { label: string; value: number }[] = [];
  const chunks = (s || '').split(',');
  for (let i = 0; i < chunks.length; i += 1) {
    const idx = chunks[i].lastIndexOf(':');
    if (idx < 0) continue;
    const label = chunks[i].slice(0, idx).trim();
    const value = parseFloat(chunks[i].slice(idx + 1).replace(/[^\d.]/g, ''));
    if (label && !isNaN(value)) out.push({ label, value });
  }
  return out;
};

/** Пары «год:событие» — так читает content timeline. Значение здесь
 *  текстовое, поэтому и проверка другая: нужны непустые обе половины.
 *
 *  Раньше здесь стояло slice(0, indexOf(':')) без проверки на -1, и строка
 *  БЕЗ двоеточия давала год «Nur eine Zeile Tex» — то есть всю строку без
 *  последнего знака (замер: b2_timeline_nopairs_harsh, «NUR EINE ZEILE TEX»
 *  в кадре). Отрицательный индекс в slice считается от конца строки, поэтому
 *  мусор получался молча, без единой ошибки в журнале. */
export const textPairs = (s: string): { year: string; label: string }[] => {
  const out: { year: string; label: string }[] = [];
  const chunks = (s || '').split(',');
  for (let i = 0; i < chunks.length; i += 1) {
    const idx = chunks[i].indexOf(':');
    if (idx < 0) continue;
    const year = chunks[i].slice(0, idx).trim();
    const label = chunks[i].slice(idx + 1).trim();
    if (year && label) out.push({ year, label });
  }
  return out;
};

/** Строки документа для redact: пустые отбрасываются, «*» в начале — метка
 *  «эту строку замазать», а не содержимое. */
export const redactLines = (s: string): { text: string; hidden: boolean }[] =>
  (s || '').split('::')
    .map((raw) => ({
      hidden: raw.trim().charAt(0) === '*',
      text: raw.trim().replace(/^\*/, '').trim(),
    }))
    .filter((ln) => ln.text.length > 0);
