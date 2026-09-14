/* Контент-фабрика — фронтенд. Работает через pywebview.api;
   без бэкенда (открыт просто index.html) включается демо-режим. */

const $ = (id) => document.getElementById(id);

// Имена каналов и проектов приходят из имён папок и свободного ввода —
// в разметку их можно вставлять только экранированными.
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Этапы = лента наверху. id совпадает с id секции (stage-<id>), name — то,
// как этап называется в state.checks с бэкенда (для галочек «готово»).
// group — заголовок раздела в боковом меню. Разделов ровно два, и это не
// украшение: «Главное» — то, куда возвращаются между роликами, «Этапы» —
// путь одного ролика. Смешивать их в один список значило заставлять искать
// «Проекты» между «Озвучкой» и «Субтитрами».
const STAGES = [
  { id: "dashboard", label: "Дашборд",   icon: "▤", check: null, group: "Главное" },
  { id: "projects",  label: "Проекты",   icon: "🗂", check: null, group: "Главное" },
  { id: "project",  label: "Проект",     icon: "◉", check: null, group: "Этапы" },
  { id: "script",   label: "Сценарий",   icon: "✎", check: "Сценарий", group: "Этапы" },
  { id: "voice",    label: "Озвучка",    icon: "🎙", check: "Озвучка", group: "Этапы" },
  { id: "subs",     label: "Субтитры",   icon: "💬", check: "Субтитры", group: "Этапы" },
  { id: "media",    label: "Раскадровка", icon: "▦", check: "Раскадровка", group: "Этапы" },
  { id: "overlays", label: "Оверлеи",    icon: "✦", check: "Оверлеи", group: "Этапы" },
  { id: "render",   label: "Рендер",     icon: "▶", check: "Рендер", group: "Этапы" },
  { id: "ai",      label: "ИИ-видео",  icon: "✧", check: null, group: "Главное" },
  // Отдельный пункт, а не карточка внутри «Экспорта»: материал россыпью
  // нужен тем, кто режет сам, и искать его в конце ленты этапов неверно —
  // это не этап конвейера, а вход в другую работу.
  { id: "montage", label: "Монтаж",    icon: "🎬", check: null, group: "Главное" },
  { id: "export",   label: "Экспорт",    icon: "⤓", check: "Premiere", group: "Этапы" },
];

// Ярлыки на дашборде. Каждый ведёт либо на этап, либо прямо в питон —
// выдуманных кнопок здесь нет, всё это уже работало и раньше, просто
// лежало на четвёртом экране.
const QUICK_TOOLS = [
  { icon: "✎",  title: "Сценарий",  sub: "Черновик по теме",     stage: "script" },
  { icon: "🎙", title: "Озвучка",   sub: "Синтез голоса",        stage: "voice" },
  { icon: "💬", title: "Субтитры",  sub: "По своей же озвучке",  stage: "subs" },
  { icon: "🖼", title: "Превью",    sub: "Обложки для ролика",   call: "make_thumbnails" },
  { icon: "🔍", title: "SEO",       sub: "Заголовок и теги",     call: "seo" },
];

// Edge TTS — голос должен звучать на языке сценария, иначе английская
// модель либо коверкает произношение, либо вообще отказывается читать.
const EDGE_VOICES_BY_LANG = {
  "английский": ["en-US-GuyNeural", "en-US-ChristopherNeural",
    "en-US-EricNeural", "en-US-AndrewNeural", "en-US-BrianNeural",
    "en-US-JennyNeural", "en-US-AriaNeural", "en-US-MichelleNeural"],
  "русский": ["ru-RU-DmitryNeural", "ru-RU-SvetlanaNeural"],
  "испанский": ["es-ES-AlvaroNeural", "es-ES-ElviraNeural",
    "es-MX-JorgeNeural", "es-MX-DaliaNeural"],
  "немецкий": ["de-DE-ConradNeural", "de-DE-KatjaNeural", "de-DE-AmalaNeural"],
  "французский": ["fr-FR-HenriNeural", "fr-FR-DeniseNeural", "fr-FR-EloiseNeural"],
  "португальский": ["pt-BR-AntonioNeural", "pt-BR-FranciscaNeural",
    "pt-PT-DuarteNeural", "pt-PT-RaquelNeural"],
};
// Polly не умеет во все эти языки, но Matthew хотя бы не падает молча —
// список голосов на движке "Amazon Polly" остаётся английским как был.
const POLLY_VOICES = ["Matthew", "Joanna", "Stephen", "Ruth", "Gregory", "Danielle"];


// Цвет канала: свой accent из профиля, иначе из палитры по порядку — чтобы
// каналы визуально отличались и в меню, и на экране входа.
const CH_COLORS = ["#0071e3", "#af52de", "#ff9500", "#34c759", "#ff375f"];
function chColor(c, i) {
  const a = (c && c.accent || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(a) ? a : CH_COLORS[i % CH_COLORS.length];
}
function chLetter(c) {
  return ((c && (c.name || c.id)) || "?").trim().charAt(0).toUpperCase();
}
// Выставить значение выпадающего списка, только если такой пункт в нём есть:
// иначе присваивание молча даёт "" и на бэкенд уходит пустой язык/жанр.
function setSel(id, val) {
  const el = $(id);
  if (!el || !val) return false;
  if (![...el.options].some((o) => o.value === val)) return false;
  el.value = val;
  return true;
}

/* ---------- API-мост ---------- */
function api() { return window.pywebview ? window.pywebview.api : mockApi; }

const mockApi = {  // демо-режим для просмотра дизайна в браузере
  async get_state() {
    return {
      project: "C:\\Users\\ali\\Downloads\\2\\project1", version: "3.0",
      checks: { "Сценарий": true, "Озвучка": true, "Субтитры": true,
                "Раскадровка": true, "Оверлеи": false, "Рендер": true,
                "Premiere": true },
      projects: [{ name: "project1", path: "...", done: 6, total: 7,
                   tags: ["английский", "45 мин"] },
                 { name: "meiwes", path: "...", done: 4, total: 7,
                   tags: ["true crime"] }],
      script: "", scenes: "", overlays: "", subs: [],
      settings: {}, render_opts: {},
    };
  },
  async call() { addLog("демо-режим: бэкенд не подключён", "warn"); return null; },
};

async function rpc(method, ...args) {
  const a = api();
  if (a === mockApi) return mockApi.call();
  try { return await a[method](...args); }
  catch (e) { addLog("[ОШИБКА] " + e, "err"); return null; }
}

/* ---------- Навигация по этапам ---------- */
let curStage = "project";

function showStage(id) {
  curStage = id;
  document.querySelectorAll(".stage").forEach(
    (s) => s.classList.toggle("active", s.id === "stage-" + id));
  document.querySelectorAll(".tl-node").forEach(
    (n) => n.classList.toggle("active", n.dataset.stage === id));
  document.querySelectorAll(".mini-row").forEach(
    (n) => n.classList.toggle("active", n.dataset.stage === id));
  const s = STAGES.find((x) => x.id === id);
  if (s && !isBusy) setStatus(s.label);
  // Список сгенерированного подтягиваем при заходе на вкладку: файлы
  // появляются в папке из фонового потока, и без этого он оставался
  // таким, каким был на момент запуска окна.
  // ЗДЕСЬ СТОЯЛО window.app — И ВКЛАДКА НЕ РАБОТАЛА ВООБЩЕ. app объявлен
  // через const, а const НЕ создаёт свойства у window: условие всегда было
  // ложным, и не срабатывало ни скрытие поля картинок, ни загрузка
  // галереи, ни ингредиенты, ни сцены. Со стороны вкладка выглядела
  // мёртвой: «Сгенерировано 0» и лишнее поле в режиме, которому картинки
  // не нужны.
  if (id === "ai" && typeof app !== "undefined") {
    app.aiKindChanged();
    app.aiRefresh();
    app.aiIngLoad();
    app.aiSceneLoad();
  }
  // Монтажный набор — по той же причине: файлы дописываются фоном, и
  // список обязан читаться в момент захода, а не при запуске окна.
  if (id === "montage" && typeof app !== "undefined") app.loadMontageSources();
  if (id === "dashboard" && typeof app !== "undefined") {
    app.fillParMax();
    app.startParStatus();
  }
  const sc = document.querySelector(".scroll");
  if (sc) sc.scrollTop = 0;
}
// Совместимость со старыми вызовами вида showPage("video", "media")
function showPage(_page, sub) { showStage(sub || _page); }

/* ---------- Журнал / статус (вызывается и из Python) ---------- */
function addLog(msg, cls = "") {
  const t = new Date().toLocaleTimeString("ru", { hour12: false });
  // лента идёт в две консоли: страница «Журнал» + нижняя панель
  for (const [box, cap] of [[$("console"), 4000], [$("console2"), 600]]) {
    if (!box) continue;
    const line = document.createElement("div");
    line.innerHTML = `<span class="t">${t}</span>  `;
    const span = document.createElement("span");
    span.className = cls;
    span.textContent = msg;
    line.appendChild(span);
    box.appendChild(line);
    while (box.childNodes.length > cap) box.removeChild(box.firstChild);
    if ($("autoscroll").checked) box.scrollTop = box.scrollHeight;
  }
  $("pulse").textContent = msg.slice(0, 90);
}
let nameTarget = null;
function openName(title, hint, value, target) {
  nameTarget = target;
  $("nameTitle").textContent = title;
  $("nameHint").textContent = hint;
  $("nameInput").value = value || "";
  $("nameModal").classList.add("open");
  setTimeout(() => $("nameInput").focus(), 50);
}
let isBusy = false;

function setStatus(text) {
  $("status").textContent = text;
  // «Готов» и название этапа — покой; всё остальное считаем работой.
  // Дашборд и Проекты обязаны быть в списке: без них заход на новый экран
  // выставлял isBusy=true, островок навсегда оставался «в работе», кольцо
  // переставало показывать готовность, а showStage больше не менял подпись
  // (там стоит «if (!isBusy)») — статус залипал на «Дашборд».
  const busy = !!text && !/^(Готов|Дашборд|Проекты|Проект|Сценарий|Озвучка|Субтитры|Раскадровка|Оверлеи|Рендер|Экспорт)$/.test(text);
  isBusy = busy;
  $("island").classList.toggle("busy", busy);
}
function setProgress(done, total) {
  const pct = total ? Math.round(100 * done / total) : 0;
  $("pulsePct").textContent = pct + "%";
  if (total) setRing(pct);
}
// Кольцо: во время операции показывает её прогресс, в покое — готовность
// пайплайна (сколько этапов пройдено).
function setRing(pct) {
  $("ring").style.setProperty("--pct", pct);
  $("ringPct").textContent = pct + "%";
}
function taskDone() {
  setStatus("Готов");
  setProgress(0, 0);
  refresh();
  // Галерею ИИ обновляем ЗДЕСЬ. Задача «Кадры» пишет в журнал «Готово: 8 из
  // 8», кладёт файлы на диск - и на этом всё: refresh() перечитывает
  // состояние проекта, но список кадров не трогает. Экран оставался пустым,
  // и кадры появлялись, только если уйти на другую вкладку и вернуться.
  // Вкладки переключаются классом .active, а НЕ style.display: проверка по
  // display была бы всегда истинной. Признак открытой вкладки - curStage.
  if (curStage === "ai" && typeof app !== "undefined" && app.aiRefresh) {
    app.aiRefresh();
  }
}

/* ---------- Состояние ---------- */
let state = null;
let lastProject = null;
let channelsCache = [];

// Палитр в софте три, а каналов у человека бывает больше. Берём ту, что
// занята меньше всех: второй канал не станет копией первого, третий — копией
// второго. Порядок при равенстве постоянный, чтобы выбор не прыгал.
const PALETTES = ["harsh", "warm", "contemplative"];
function leastUsedPalette() {
  const used = {};
  PALETTES.forEach((p) => { used[p] = 0; });
  (channelsCache || []).forEach((c) => {
    const p = (c && c.palette) || "";
    if (p in used) used[p] += 1;
  });
  return PALETTES.reduce((a, b) => (used[b] < used[a] ? b : a), PALETTES[0]);
}

// Смена КАНАЛА перезагружает поля жёстче, чем смена проекта: даже если курсор
// стоит в поле, даже если новое значение пустое. Иначе сценарий прошлого канала
// переживал переключение и уезжал в новый — так 3-минутный тестовый текст попал
// в 20-минутный «The Home Vault» и ролик вышел на 3 минуты вместо 20.
let forceReload = false;
// Переключили канал — путь проекта обновить безусловно (см. refresh).
let forceProjPath = false;

async function refresh() {
  const s = await rpc("get_state");
  if (!s) { if (!state) state = await mockApi.get_state(); else return; }
  else state = s;
  if (state.pending_veo && state.pending_veo > 0 && !isBusy) {
    // сообщение, а не операция: пишем в журнал, иначе островок навсегда
    // остаётся «в работе» и кольцо перестаёт показывать готовность
    addLog(`Сохранено задач Veo: ${state.pending_veo}. `
           + "Нажми «Генерировать видео», чтобы продолжить.", "warn");
  }
  // Путь не перетираем, пока его правят руками: refresh дёргается и по
  // taskDone, и посреди набора адрес подменялся на текущий проект
  // Путь проекта обычно НЕ перебиваем, пока курсор в поле, — иначе он
  // затирал бы то, что человек печатает. Но после осознанного переключения
  // канала обновить обязаны: в поле осталась папка ЧУЖОГО канала, и с ней
  // же уйдёт следующая генерация. Владелец поймал это дважды подряд —
  // выбирал abyss, а в поле оставалась estoico-es/2026-08-06.
  if (forceProjPath || document.activeElement !== $("projPath")) {
    $("projPath").value = state.project || "";
    forceProjPath = false;
  }
  $("version").textContent = "v" + (state.version || "3.0");
  renderCards();
  renderProjects();
  renderChecklist();
  // При СМЕНЕ проекта поля обязаны принять значение нового проекта, даже
  // если оно пустое — иначе старый текст (сценарий/сцены/оверлеи) утекает
  // в новый проект и при «Генерировать видео» записывается в него (так
  // английское видео получало русские оверлеи от прошлого проекта). При
  // обычном refresh (тот же проект) — не трогаем непустое поле, чтобы не
  // затирать несохранённый ввод пользователя.
  const projectChanged = state.project !== lastProject || forceReload;
  lastProject = state.project;
  const hard = forceReload;
  forceReload = false;
  const setField = (id, val) => {
    if (!hard && document.activeElement === $(id)) return;
    if (projectChanged) $(id).value = val || "";
    else if (val) $(id).value = val;
  };
  setField("scriptText", state.script);
  setField("scenesText", state.scenes);
  setField("overlaysText", state.overlays);
  // «Тема» — тот же класс бага: не очищалась при смене проекта, и старая
  // тема тихо уезжала в generate_all нового проекта, минуя topic_formula
  // канала
  if (projectChanged && document.activeElement !== $("topic"))
    $("topic").value = "";
  if (state.subs) renderSubs(state.subs);
  else if (projectChanged) renderSubs([]);
  updateStats();
}

function renderCards() {
  if (!state) return;
  const done = (s) => !!(s.check && state.checks && state.checks[s.check]);

  const row = $("tlRow");
  row.innerHTML = "";
  let lastGroup = "";
  for (const s of STAGES) {
    if (s.group && s.group !== lastGroup) {
      lastGroup = s.group;
      const h = document.createElement("div");
      h.className = "nav-group";
      h.textContent = s.group;
      row.appendChild(h);
    }
    const b = document.createElement("button");
    b.className = "tl-node" + (done(s) ? " done" : "") + (s.id === curStage ? " active" : "");
    b.dataset.stage = s.id;
    b.onclick = () => showStage(s.id);
    b.innerHTML = `<span class="circle">${done(s) ? "✓" : s.icon}</span>
                   <span class="lbl">${s.label}</span>`;
    row.appendChild(b);
  }

  const mini = $("miniRows");
  mini.innerHTML = "";
  for (const s of STAGES) {
    if (!s.check) continue;      // «Проект» — не этап пайплайна
    const b = document.createElement("button");
    b.className = "mini-row" + (done(s) ? " done" : "") + (s.id === curStage ? " active" : "");
    b.dataset.stage = s.id;
    b.onclick = () => showStage(s.id);
    b.innerHTML = `<span class="d"></span><span>${s.label}</span>`;
    mini.appendChild(b);
  }

  // В покое кольцо = доля пройденных этапов
  if (!isBusy) {
    const steps = STAGES.filter((s) => s.check);
    setRing(Math.round(100 * steps.filter(done).length / steps.length));
  }
}

function renderProjects() {
  if (!state) return;
  const box = $("projList");
  box.innerHTML = "";
  const projs = state.projects || [];
  $("projCount").textContent = projs.length;
  for (const p of projs) {
    const pct = Math.round(100 * p.done / (p.total || 7));
    const row = document.createElement("div");
    row.className = "proj" + (p.current ? " current" : "");
    // Имя проекта = имя папки: пришло с диска, а не из кода, поэтому в
    // разметку — только через esc (тот же класс, что ломал onclick на
    // апострофе). Числа и теги — оттуда же.
    row.innerHTML = `
      <div class="popen" style="flex:1; min-width:0; cursor:pointer">
        <div class="nm">${esc(p.name)}${p.current ? " · текущий" : ""}</div>
        <div class="meta">${esc(p.done)}/${esc(p.total || 7)} этапов${
          (p.tags || []).length ? " · " + esc(p.tags.join(" · ")) : ""}</div>
      </div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <button class="btn ghost pbtn-open">Открыть</button>
      <button class="iconbtn" title="Переименовать">✎</button>
      <button class="iconbtn" title="Папка в проводнике">📂</button>
      <button class="iconbtn" title="Удалить проект">🗑</button>`;
    const openIt = () => rpc("set_project", p.path).then(() => {
      addLog(`Открыт проект: ${p.name}`, "ok"); refresh();
    });
    row.querySelector(".popen").onclick = openIt;
    row.querySelector(".pbtn-open").onclick = openIt;
    const [ren, fold, del] = row.querySelectorAll(".iconbtn");
    ren.onclick = () => app.renameProject(p.path, p.name);
    fold.onclick = () => rpc("open_project_folder", p.path);
    del.onclick = () => {
      if (confirm(`Удалить проект «${p.name}» целиком?
Все файлы будут стёрты безвозвратно.`))
        rpc("delete_project", p.path).then(refresh);
    };
    box.appendChild(row);
  }
}

function renderChecklist() {
  if (!state) return;
  // Показываем только имя папки: полный путь Windows не влезает в панель.
  // Делится по ОБОИМ слэшам и ДО выхода по !state.checks — иначе без
  // чеклиста в панели оставался необрезанный путь целиком.
  $("sideProject").textContent =
    (state.project || "—").split(/[\\/]/).filter(Boolean).pop() || "—";
  if (!state.checks) return;
  $("checklist").innerHTML = Object.entries(state.checks)
    .map(([k, v]) => `${esc(v ? "✓" : "·")} ${esc(k)}`).join("<br>");
}

function renderSubs(rows) {
  const box = $("subsList");
  if (!rows || !rows.length) { box.textContent = "Субтитры ещё не готовы."; return; }
  box.textContent = rows.slice(0, 400)
    .map(([a, , t]) => `${a}  ${t}`).join("\n");
}

function updateStats() {
  const w = $("scriptText").value.trim().split(/\s+/).filter(Boolean).length;
  $("scriptStats").textContent = `${w} слов · ~${Math.floor(w / 150)} мин озвучки`;
}
$("scriptText").addEventListener("input", updateStats);

/* ---------- Действия ---------- */
const app = {
  /* ---------- каналы ---------- */
  async loadChannels(showGate) {
    const r = await rpc("channels_get");
    if (!r) return;
    const sel = $("channelSel");
    sel.innerHTML = (r.channels || []).map(
      (c) => `<option value="${esc(c.id)}">${esc(c.name || c.id)}</option>`).join("")
      || '<option value="">— нет каналов —</option>';
    if (r.current) sel.value = r.current;
    channelsCache = r.channels || [];
    app.renderGate();
    app.renderChannelPop();
    // Экран входа поднимаем только при старте и только если канал ещё не
    // выбран: дёргать его на каждое обновление списка — значит выбрасывать
    // пользователя из работы посреди дела.
    if (showGate && !r.current) $("gate").classList.add("open");
  },
  renderGate() {
    const grid = $("gateGrid");
    if (!grid) return;
    const tiles = channelsCache.map((c, i) => {
      const sub = [c.lang, c.tone].filter(Boolean).join(" · ");
      // chLetter — первая буква имени канала, тоже данные из профиля: без
      // esc «&» или «<» в названии рвал бы плитку
      return `<button class="gate-tile" data-ch="${esc(c.id)}" title="${esc(sub)}">
        <span class="face" style="background:${chColor(c, i)}">${esc(chLetter(c))}</span>
        <span class="nm">${esc(c.name || c.id)}</span>
      </button>`;
    });
    tiles.push(`<button class="gate-tile" data-ch="">
      <span class="face" style="background:rgba(0,0,0,.14); color:var(--ink-2)">+</span>
      <span class="nm">Создать канал</span>
    </button>`);
    grid.innerHTML = tiles.join("");
    grid.querySelectorAll(".gate-tile").forEach((b) => {
      b.onclick = () => b.dataset.ch ? app.gatePick(b.dataset.ch) : app.newChannel();
    });
  },
  // Меню каналов в верхней панели + аватар текущего канала
  renderChannelPop() {
    const cur = $("channelSel").value;
    const box = $("channelPopRows");
    if (box) {
      // В строке канала три действия, а не одно. Раньше был только выбор:
      // убрать канал из софта было нельзя вообще (владелец пробовал и не
      // смог), а выключить его из ночи — только правкой channels.json.
      box.innerHTML = channelsCache.map((c, i) => `
        <div class="pop-row${c.id === cur ? " active" : ""}" data-ch="${esc(c.id)}">
          <span class="ava" style="background:${chColor(c, i)}">${esc(chLetter(c))}</span>
          <span class="pop-name">${esc(c.name || c.id)}</span>
          <button class="pop-mini" data-night="${esc(c.id)}"
            title="${c.active === false ? "включить в ночной автопилот" : "убрать из ночного автопилота"}"
            >${c.active === false ? "🌙̶" : "🌙"}</button>
          <button class="pop-mini danger" data-del="${esc(c.id)}"
            title="убрать канал из софта (папка с роликами останется)">✕</button>
        </div>`).join("") || '<div class="pop-act">нет каналов</div>';
      box.querySelectorAll(".pop-row").forEach((r) => {
        r.onclick = (e) => {
          if (e.target.closest("button")) return;   // клик по кнопке — не выбор
          app.gatePick(r.dataset.ch);
        };
      });
      box.querySelectorAll("[data-night]").forEach((b) => {
        b.onclick = (e) => {
          e.stopPropagation();
          const id = b.dataset.night;
          const c = channelsCache.find((x) => x.id === id) || {};
          rpc("channel_autopilot", id, c.active === false).then(() => { app.loadChannels(true); refresh(); });
        };
      });
      box.querySelectorAll("[data-del]").forEach((b) => {
        b.onclick = (e) => {
          e.stopPropagation();
          const id = b.dataset.del;
          const c = channelsCache.find((x) => x.id === id) || {};
          // Спрашиваем прямо и говорим, что папка останется: иначе
          // «удалил, а место не освободилось» читается как поломка.
          if (!confirm("Убрать канал «" + (c.name || id) + "» из софта?"
                     + "\n\nПапка с роликами останется на диске — сценарии,"
                     + "\nозвучка и оплаченные кадры не стираются."
                     + "\nУдалить её можно вручную.")) return;
          rpc("channel_delete", id).then(() => { app.loadChannels(true); refresh(); });
        };
      });
    }
    const i = channelsCache.findIndex((c) => c.id === cur);
    const c = i >= 0 ? channelsCache[i] : null;
    const av = $("channelAvatar");
    if (av) {
      av.textContent = c ? chLetter(c) : "—";
      av.style.background = c ? chColor(c, i) : "rgba(0,0,0,.2)";
    }
    if ($("sideChannel")) $("sideChannel").textContent = c ? (c.name || c.id) : "без канала";
    // Та же карточка канала, но в подвале бокового меню — она видна всегда,
    // а верхний аватар прячется, когда окно узкое.
    if ($("navAva")) {
      $("navAva").textContent = c ? chLetter(c) : "—";
      $("navAva").style.background = c ? chColor(c, i) : "rgba(255,255,255,.12)";
    }
    if ($("navChannel")) $("navChannel").textContent = c ? (c.name || c.id) : "Канал не выбран";
    if ($("navLang")) {
      $("navLang").textContent = c
        ? [c.lang, c.minutes ? c.minutes + " мин" : ""].filter(Boolean).join(" · ")
        : "язык и голос берутся отсюда";
    }
    // Списки «Язык/Жанр/Стиль» общие на все каналы, а канал их ЗАДАЁТ
    // (webapp: apply_to_params). Пока списки показывали своё, они попросту
    // врали, а кнопки отдельных шагов уходили с чужим значением — испанский
    // канал транскрибировался как английский. Приводим их к профилю.
    if (c) {
      if (setSel("lang", c.lang)) app.fillVoices();
      setSel("tone", c.tone);
      setSel("visualStyle", c.visual_style);
    }
    // Акцент интерфейса = цвет активного канала: сразу видно, где работаешь
    if (c) {
      const col = chColor(c, i);
      document.documentElement.style.setProperty("--accent", col);
      document.documentElement.style.setProperty("--accent-hover", col);
      document.documentElement.style.setProperty("--accent-soft", col + "1a");
    }
  },
  toggleChannelPop() { $("channelPop").classList.toggle("open"); },
  gatePick(id) {
    $("channelSel").value = id;
    $("gate").classList.remove("open");
    $("channelPop").classList.remove("open");
    forceReload = true; forceProjPath = true;
    // ПОСЛЕ переключения перечитываем каналы у бэкенда. Подпись «Канал»
    // в боковой панели строится из значения выпадающего списка
    // (renderChannelPop берёт $("channelSel").value), а список заполняется
    // только в loadChannels. Без этого вызова подпись оставалась от
    // ПРОШЛОГО канала: справа «Pensamiento Estoico», в списке «abyss».
    rpc("channel_select", id).then(() => app.loadChannels(false)).then(refresh);
  },
  skipGate() { $("gate").classList.remove("open"); },
  openGate() { app.renderGate(); $("gate").classList.add("open"); },
  selectChannel() {
    const id = $("channelSel").value;
    app.renderChannelPop();
    if (id) { forceReload = true; forceProjPath = true;
               rpc("channel_select", id)
                 .then(() => app.loadChannels(false)).then(refresh); }
  },
  editChannel() {
    const id = $("channelSel").value;
    const cur = channelsCache.find((c) => c.id === id) || {};
    // Форма намеренно простая: правится JSON профиля целиком. Каналов три,
    // меняются они редко — отдельный экран с два десятками полей тут лишний.
    const draft = JSON.stringify({
      id: cur.id || "", name: cur.name || "", lang: cur.lang || "английский",
      tone: cur.tone || "документальный", minutes: cur.minutes || 10,
      // palette в этом списке не было, а задать её больше негде — и канал,
      // заведённый через окно, оставался БЕЗ ПОЧЕРКА навсегда. Цена пустого
      // значения измерена: variant_factory.ensure отвечает «нет известной
      // палитры — добавлять нечего» и не создаёт каналу ни одной своей
      // плашки (0 против 144), а склейки, движение кадра, воздух и звук идут
      // общим пулом с общими весами. То есть ровно то, на что владелец
      // жаловался словами «монтаж трёх каналов очень похож», только теперь у
      // всех каналов сразу.
      // Существующему каналу подставляем ЕГО значение (иначе правка любого
      // другого поля молча переписала бы почерк), новому — САМУЮ РЕДКУЮ из
      // уже занятых.
      //
      // Здесь стояло жёсткое «harsh», и каждый новый канал рождался копией
      // первого. Замер 21.08: три канала из четырёх сидели на harsh, а она
      // задаёт склейки, целевую громкость, обработку голоса, настроение
      // музыки, фоновый шум, стиль обложек и вероятности свечения, пыли и
      // мерцания. Владелец увидел это сразу: «в швейцарском канале эффекты
      // как на немецком». Плашки при этом расходились честно (совпадение
      // 11%) — одинаковым было ровно то, что тянет за собой палитра.
      palette: cur.palette || (cur.id ? "" : leastUsedPalette()),
      voice: cur.voice || "", rate: cur.rate || 0,
      visual_style: cur.visual_style || "кинематографичный",
      watermark: cur.watermark || "", accent: cur.accent || "",
      avoid: cur.avoid || "", youtube_url: cur.youtube_url || "",
      // ЭТИХ ДВУХ ПОЛЕЙ В ФОРМЕ НЕ БЫЛО — а именно они говорят софту, О ЧЁМ
      // канал. Без них новый канал нельзя было завести по смыслу: владелец
      // сделал канал про кулинарию и получил ролик про стройку, потому что
      // сказать «здесь кулинария» было негде. topic_formula выбирает тему,
      // script_extra задаёт, как её писать.
      topic_formula: cur.topic_formula || "",
      script_extra: cur.script_extra || "",
    }, null, 2);
    const out = prompt(
      "Настройки канала (id — латиницей, он же имя папки).\n" +
      "\ntopic_formula — О ЧЁМ канал. По нему подбирается тема\n" +
      "  каждого ролика. Пусто = тему придётся вписывать руками.\n" +
      "script_extra — как писать сценарий: чей голос, что показывать.\n" +
      "palette — почерк канала: harsh (жёсткий разбор), warm (бытовой),\n" +
      "contemplative (медленный). Пустая палитра = канал без своего лица.\n" +
      "Пустой voice = голос выбирается автоматически.", draft);
    if (!out) return;
    let obj;
    try { obj = JSON.parse(out); }
    catch (e) { return addLog("Не разобрал JSON: " + e, "err"); }
    rpc("channel_save", obj).then(() => { app.loadChannels(true); refresh(); });
  },
  newChannel() {
    $("channelSel").value = "";
    app.editChannel();
  },
  browse: () => rpc("browse_project").then(refresh),
  newProject() { openName("Новый проект", "Введи имя папки проекта:", "", null); },
  renameProject(path, cur) {
    openName("Переименовать проект", "Новое имя папки:", cur, path);
  },
  closeName() { $("nameModal").classList.remove("open"); },
  confirmName() {
    const name = $("nameInput").value.trim();
    if (!name) return;
    $("nameModal").classList.remove("open");
    if (nameTarget)
      rpc("rename_project", nameTarget, name).then(refresh);
    else
      rpc("new_project", name).then(refresh);
  },
  deleteProject() {
    if (confirm("Удалить ТЕКУЩИЙ проект целиком?\nВсе файлы будут стёрты безвозвратно."))
      rpc("delete_current_project").then(refresh);
  },
  fillVoices() {
    const edge = $("ttsEngine").value.includes("Edge");
    const list = edge
      ? (EDGE_VOICES_BY_LANG[$("lang").value] || EDGE_VOICES_BY_LANG["английский"])
      : POLLY_VOICES;
    $("ttsVoice").innerHTML = list.map(v => `<option>${v}</option>`).join("");
    // паузы между абзацами теперь умеет и Edge (нарезкой + вставкой тишины),
    // раньше это был только Polly через SSML — галочку больше не прячем
    $("pausesWrap").style.display = "";
    // движок Polly различается по цене в 25 раз — показываем выбор только
    // когда он вообще применим
    $("pollyEngineWrap").style.display = edge ? "none" : "";
    $("pollyEngine").style.display = edge ? "none" : "";
  },
  genScript() {
    const t = $("topic").value.trim();
    if (!t) return addLog("Напиши тему видео", "warn");
    rpc("gen_script", t, parseInt($("minutes").value),
        $("tone").value, $("lang").value);
  },
  saveScript: () => rpc("save_script", $("scriptText").value),
  autoScenes: () => rpc("auto_scenes", $("scriptText").value)
      .then(r => { if (r) { $("scenesText").value = r; showPage("video", "media"); } }),
  runTts: () => rpc("tts", {
    engine: $("ttsEngine").value, voice: $("ttsVoice").value,
    polly_engine: $("pollyEngine") ? $("pollyEngine").value : "neural",
    rate: $("ttsRate").value, pauses: $("ttsPauses").checked,
    enhance: $("ttsEnhance").checked,
    script: $("scriptText").value,
  }),
  applyPreset() {
    const p = $("rPreset").value;
    const set = (id, v) => { if ($(id)) $(id).checked = v; };
    if (p === "documentary") {          // минимал: чистые плашки, jump cuts
      $("rSubStyle").value = "pill"; $("rInt").value = "слабая";
      set("rGrain", false); set("rVhs", false); set("rChromab", false);
      set("rBloom", false); set("rLeak", false); set("rDust", false);
      set("rFlicker", false); set("rVignette", true); set("rLetterbox", true);
      addLog("Пресет «документальный»: чистые плашки, jump cuts, "
             + "минимум эффектов, спокойный тон", "dim");
    } else if (p === "dynamic") {       // ярко: эффекты, быстрый монтаж
      $("rSubStyle").value = "yellow_pop"; $("rInt").value = "сильная";
      set("rGrain", true); set("rBloom", true); set("rLeak", true);
      set("rChromab", true); set("rFlicker", true);
      addLog("Пресет «динамичный»: жёлтые субтитры, быстрый монтаж, эффекты", "dim");
    } else if (p === "shorts") {        // вертикаль: слово в кадре, быстрый план
      // Шортс это не «тот же ролик, только узкий»: в кадре 1080 строка
      // субтитров набирается в три ряда мелким кеглем и в ленте не
      // читается, а план в 4 секунды на вертикали смотрится стоячим.
      // Поэтому пресет трогает и разрешение, и субтитры разом — по
      // отдельности их выставляли неправильно.
      $("rRes").value = "shorts";
      $("rSubStyle").value = "word_pop"; $("rSubSize").value = "средние";
      $("rInt").value = "сильная";
      set("rSubs", true);               // без подписей формат не работает
      set("rLetterbox", false);         // чёрные полосы съедают вертикаль
      set("rVignette", false);
      addLog("Пресет «шортс»: вертикаль 9:16, подпись по одному слову, "
             + "план ~1.5 с, субтитры включены", "dim");
    }
  },
  // ---- ИИ-видео: прямой доступ к генератору, без конвейера ----
  // Сколько картинок нужно каждому режиму — то же число, что проверяет
  // бэкенд. Показываем ДО запуска: иначе Batch Frame уходит на сервер с
  // одной картинкой, тратит слот и падает там.
  // ДВА ШАГА, а не один. Однокнопочная сборка «тема -> готовое видео»
  // отнимала у человека тот единственный шаг, где он и решает, каким
  // ролик будет: выбор кадров. Теперь генератор отдаёт кадры, человек
  // отмечает нужные, и ролик собирается только из них.
  aiFrames() {
    const t = $("abTopic").value.trim();
    if (!t) return addLog("Напиши тему", "warn");
    rpc("ai_frames", t, $("abLang").value, $("abRatio").value,
        parseInt($("abCount").value));
  },
  aiPicked() {
    return [...document.querySelectorAll(".ai-pick:checked")]
      .map((c) => c.dataset.path);
  },
  aiCountPicked() {
    const n = app.aiPicked().length;
    if ($("aiPicked")) $("aiPicked").textContent = "выбрано " + n;
  },
  aiPickAll() {
    document.querySelectorAll(".ai-pick").forEach((c) => { c.checked = true; });
    app.aiCountPicked();
  },
  aiPickNone() {
    document.querySelectorAll(".ai-pick").forEach((c) => { c.checked = false; });
    app.aiCountPicked();
  },
  aiBuildFrom() {
    const sel = app.aiPicked();
    if (sel.length < 2) return addLog("Отметь хотя бы два кадра", "warn");
    // Порядок сборки = порядок в списке: кадры идут новыми сверху, а
    // ролик должен идти по сюжету, поэтому разворачиваем.
    const ordered = sel.slice().reverse();
    rpc("ai_build_from", ordered.join(" | "), $("abLang").value,
        $("abRatio").value, $("abTopic").value.trim());
  },
  aiKindChanged() {
    const need = {text: 0, banana: 0, image: 1, batch: 2, component: 2};
    const n = need[$("aiKind").value] || 0;
    $("aiNeed").textContent = n === 0 ? "картинки не нужны"
      : n === 1 ? "нужна 1 картинка" : "нужно минимум " + n + " картинки";
    $("aiImagesRow").style.display = n === 0 ? "none" : "";
  },
  aiPickImages() {
    rpc("ai_pick_images").then((p) => { if (p) $("aiImages").value = p; });
  },
  aiGenerate() {
    const prompt = $("aiPrompt").value.trim();
    // Камера отдельным списком, а не словами в промпте: у Flow это
    // отдельный орган управления, и не зря — забытое движение камеры
    // даёт статичный кадр, который в ленте читается как фотография.
    const cam = $("aiCamera").value;
    const full = cam ? prompt + ". Camera: " + cam : prompt;
    rpc("ai_generate", $("aiKind").value, full, $("aiAspect").value,
        parseInt($("aiCount").value), $("aiImages").value);
  },
  aiIngAdd(kind) { rpc("ai_ingredient_add", kind).then(app.aiIngShow); },
  aiIngRemove(name) { rpc("ai_ingredient_remove", name).then(app.aiIngShow); },
  aiIngLoad() { rpc("ai_ingredients").then(app.aiIngShow); },
  aiIngShow(rows) {
    const box = $("aiIngRow");
    if (!box) return;
    rows = rows || [];
    $("aiIngCount").textContent = rows.length;
    box.innerHTML = rows.length ? rows.map((r) => `
      <div class="ing-cell" title="${esc(r.name)}">
        <img src="file:///${encodeURI(r.path.replace(/\\/g, "/"))}">
        <span class="ing-tag">${esc(r.label)}</span>
        <button class="ing-x" data-ing="${esc(r.name)}">✕</button>
      </div>`).join("")
      : '<div class="hint">пусто — герой будет разным в каждом клипе</div>';
    box.querySelectorAll("[data-ing]").forEach((b) => {
      b.onclick = () => app.aiIngRemove(b.dataset.ing);
    });
  },
  aiSceneNew() {
    const n = prompt("Имя сцены:", "");
    if (n) rpc("ai_scene_new", n).then(app.aiSceneShow);
  },
  aiSceneLoad() { rpc("ai_scenes").then(app.aiSceneShow); },
  aiSceneShow(rows) {
    const box = $("aiSceneRows");
    if (!box) return;
    rows = rows || [];
    window._scenes = rows;
    $("aiSceneCount").textContent = rows.length;
    box.innerHTML = rows.length ? rows.map((s) => `
      <div class="scene-row">
        <span class="scene-name">${esc(s.name)}</span>
        <span class="hint">${s.clips} клип. · ${s.secs} c</span>
        <div class="spacer"></div>
        <button class="btn ghost" data-ext="${esc(s.name)}">Продолжить</button>
        <button class="btn ghost" data-asm="${esc(s.name)}">Склеить</button>
      </div>`).join("")
      : '<div class="hint">сцен пока нет</div>';
    box.querySelectorAll("[data-ext]").forEach((b) => {
      b.onclick = () => {
        const what = prompt("Что происходит дальше в сцене «"
                            + b.dataset.ext + "»?", "");
        if (what) rpc("ai_scene_extend", b.dataset.ext, what,
                      $("aiAspect").value);
      };
    });
    box.querySelectorAll("[data-asm]").forEach((b) => {
      b.onclick = () => rpc("ai_scene_assemble", b.dataset.asm);
    });
  },
  aiToScene(path) {
    const list = (window._scenes || []).map((s) => s.name);
    if (!list.length) return addLog("Сначала заведи сцену", "warn");
    const n = prompt("В какую сцену положить?" + "\n\n" + list.join(", "),
                     list[0]);
    if (n) rpc("ai_scene_add", n, path).then(app.aiSceneShow);
  },
  aiExtend(path, name) {
    // Продолжение берёт ПОСЛЕДНИЙ кадр клипа и стартует с него — так у
    // Flow снят потолок в восемь секунд. Стык не виден: там один и тот
    // же кадр.
    const what = prompt("Что происходит дальше в кадре?" +
                        "\n\nПродолжаем: " + name, "");
    if (!what) return;
    rpc("ai_extend", path, what, $("aiAspect").value);
  },
  aiRefresh() {
    rpc("ai_list").then((rows) => {
      const box = $("aiGrid");
      if (!box) return;
      rows = rows || [];
      $("aiCount2").textContent = rows.length;
      if (!rows.length) {
        box.innerHTML = '<div class="hint">пока пусто</div>';
        return;
      }
      box.innerHTML = rows.map((r) => `
        <div class="ai-cell">
          ${r.kind === "video"
            ? `<video src="file:///${encodeURI(r.path.replace(/\\/g, "/"))}"
                     controls preload="metadata"></video>`
            : `<img src="file:///${encodeURI(r.path.replace(/\\/g, "/"))}">`}
          ${r.kind === "image" ? `<label class="ai-pick-box">
            <input type="checkbox" class="ai-pick"
                   data-path="${esc(r.path)}"> выбрать
          </label>` : ""}
          <div class="ai-meta">
            <span class="ai-name">${esc(r.name)}</span>
            <span class="hint">${r.size_mb} МБ</span>
          </div>
          <div class="ai-acts">
            ${r.kind === "video" ? `
              <button data-ext2="${esc(r.path)}" data-nm="${esc(r.name)}">Продолжить</button>
              <button data-sc="${esc(r.path)}">в сцену</button>` : ""}
          </div>
          <div class="ai-prompt" title="${esc(r.prompt)}">${esc(r.prompt)}</div>
        </div>`).join("");
      // Кнопки нарисованы шаблоном, обработчики вешаем ПОСЛЕ вставки:
      // innerHTML их не переносит, и без этого они были бы мёртвыми.
      // Счётчик выбранных обновляем и при отрисовке, и по клику: без
      // первого он врал сразу после генерации новых кадров.
      box.querySelectorAll(".ai-pick").forEach((c) => {
        c.onchange = () => app.aiCountPicked();
      });
      app.aiCountPicked();
      box.querySelectorAll("[data-ext2]").forEach((b) => {
        b.onclick = () => app.aiExtend(b.dataset.ext2, b.dataset.nm);
      });
      box.querySelectorAll("[data-sc]").forEach((b) => {
        b.onclick = () => app.aiToScene(b.dataset.sc);
      });
    });
  },
  pickMusic: () => rpc("pick_music").then(p => { if (p) $("musicPath").value = p; }),
  mixMusic: () => rpc("mix_music", $("musicPath").value,
                      parseInt($("musicGain").value)),
  autoMusic: () => rpc("auto_music", parseInt($("musicGain").value)),
  pickMusicLib: () => rpc("pick_folder").then(p => { if (p) $("sMusicLib").value = p; }),
  fillMusicLib: () => rpc("settings_save", app._settingsPayload())
      .then(() => rpc("fill_music_library", parseInt($("jamendoCount").value))),
  pickAsmr: () => rpc("pick_folder").then(p => { if (p) $("asmrPath").value = p; }),
  addAsmr: () => rpc("add_asmr", $("asmrPath").value, parseFloat($("asmrEvery").value)),
  runSubs: () => rpc("subs", $("whisperModel").value,
                     parseInt($("subLineWidth").value), $("lang").value),
  fetchStocks: () => rpc("stocks", $("scenesText").value, $("kenburns").checked),
  addMedia: () => rpc("add_own_media").then(refresh),
  storyboard() {
    const mode = $("visualMode").value;
    if (mode === "ai" && !confirm(
        "Режим «ИИ в едином стиле»: каждый кадр генерируется ИИ.\n" +
        "Это даёт вид как у канала, но идёт долго (сотни картинок) и\n" +
        "тратит кредиты ИИ-провайдера (VeoNonStop, запасной — Agnes).\n\nПродолжить?"))
      return;
    if (mode === "mixed" && !confirm(
        `Режим «микс»: ~${Math.round(parseFloat($("aiRatio").value) * 100)}% ` +
        "планов будут намеренно ИИ-кадрами (тратит кредиты ИИ-провайдера: " +
        "VeoNonStop, запасной — Agnes).\n\nПродолжить?"))
      return;
    if ($("genvideo").checked && mode !== "ai" && !confirm(
        "ИИ-генерация клипов для ненайденных планов тратит кредиты " +
        "ИИ-провайдера (VeoNonStop, запасной — Agnes).\n\nПродолжить?"))
      return;
    rpc("storyboard", parseFloat($("beat").value), $("genvideo").checked,
        mode, $("visualStyle").value, parseFloat($("aiRatio").value));
  },
  suggestOverlays: () => rpc("suggest_overlays", parseFloat($("ovDur").value))
      .then(r => { if (r) $("overlaysText").value = r; }),
  saveOverlays: () => rpc("save_overlays", $("overlaysText").value),
  // Эффекты поверх кадра — ОДИН набор ключей на обе кнопки.
  // Раньше их слала только кнопка «Рендер», явными true/false из галочек, а
  // genParams() («Собрать всё» и Автопилот) не слал вовсе — и питон
  // подставлял свои умолчания, где bloom, light_leak и sand ВКЛЮЧЕНЫ. Один и
  // тот же проект выходил со свечением и засветкой через цепочку и плоским
  // через «Рендер», при одинаково выглядящих галочках и без единой строки
  // объяснения на экране. Теперь оба пути шлют одно и то же, а галочки в
  // index.html выставлены ровно в питоновские умолчания — то, что человек
  // видит, и есть то, что получится.
  // randomize здесь ЖЕ, и это не лишнее: при включённом «Разнообразии»
  // bloom, засветку, пыль и мерцание выбирает core.project_style — от пути
  // проекта, детерминированно. «Собрать всё» его слало, «Рендер» нет, и
  // пересборка того же проекта выходила с другими эффектами, чем первая
  // сборка. Тем же соображением сюда добавляли профиль канала (см.
  // _render_opts в webapp.py): пересборка обязана давать тот же ролик.
  fxParams() {
    const on = id => ($(id) ? $(id).checked : false);
    return {
      bloom: on("rBloom"), light_leak: on("rLeak"), dust: on("rDust"),
      flicker: on("rFlicker"), sand: on("rSand"), stars: on("rStars"),
      embers: on("rEmbers"), randomize: on("randomize"),
    };
  },
  render: () => rpc("render", Object.assign({
    resolution: $("rRes").value, fps: parseInt($("rFps").value),
    intensity: $("rInt").value, sub_size: $("rSubSize").value,
    quality: $("rQuality").value, sub_style: $("rSubStyle").value,
    subs: $("rSubs").checked, grain: $("rGrain").checked,
    vignette: $("rVignette").checked, letterbox: $("rLetterbox").checked,
    vhs: $("rVhs").checked, chromab: $("rChromab").checked,
    chapters: $("rChapters").checked, draft: $("rDraft").checked,
    out_name: $("outName").value,
    overlays: $("overlaysText").value,
  }, app.fxParams())),
  stopRender: () => rpc("stop_render"),
  openResult: () => rpc("open_result", $("outName").value),
  openFolder: () => rpc("open_folder"),
  runSeo: () => rpc("seo").then(r => { if (r) $("seoOut").textContent = r; }),
  makeThumbs: () => rpc("make_thumbnails", 3),
  generateAll() { rpc("generate_all", app.genParams()); },
  // Ночной прогон идёт РОВНО с теми же настройками, что и кнопка рядом:
  // отдельный набор параметров разъехался бы с ней при первой же правке.
  /* ---------- Вкладка «Экспорт»: монтажный набор ---------- */
  /* Список строит Python: он один знает, что реально лежит на диске.
     Страница только рисует и просит открыть пункт ПО КЛЮЧУ — путь она не
     называет, иначе окно могло бы попросить открыть что угодно. */
  /* Каналы и ролики для вкладки «Монтаж». Список строит Python: он
     знает, где лежат папки каналов и в какой из них есть что монтировать. */
  montageSources: null,
  async loadMontageSources() {
    const src = await rpc("montage_sources");
    if (!src || !src.channels) return;
    this.montageSources = src;
    const cs = $("mChannel");
    if (!cs) return;
    cs.innerHTML = src.channels.map(
      c => `<option value="${c.id}">${c.name}</option>`).join("");
    // Выбранным показываем тот канал, чей проект открыт сейчас.
    const cur = (src.current || "").replace(/\\/g, "/");
    let pick = src.channels.find(
      c => c.projects.some(p => cur.startsWith(p.path.replace(/\\/g, "/"))));
    if (!pick) pick = src.channels[0];
    if (pick) cs.value = pick.id;
    await this.montageChannel(cur);
  },
  async montageChannel(keepPath) {
    const src = this.montageSources;
    if (!src) return;
    const c = src.channels.find(x => x.id === $("mChannel").value);
    // ПЕРЕКЛЮЧАЕМ САМ КАНАЛ, а не только папку. Без этой строки выбор на
    // вкладке менял лишь рабочую папку, а язык, голос, палитра и формат
    // кадра оставались от прежнего канала: владелец выбрал Tiefenzeit,
    // нажал «Собрать материал» — и получил Einsturzpunkt с вертикальным
    // кадром и планом 1.5 c (31.08).
    if (c) {
      await rpc("channel_select", c.id);
      const sel = $("channelSel");
      if (sel) sel.value = c.id;
      await this.loadChannels(false);
    }
    const ps = $("mProject");
    if (!c || !ps) return;
    if (!c.projects.length) {
      ps.innerHTML = '<option value="">— нет готовых папок —</option>';
      $("mPath").textContent = "У этого канала пока нечего монтировать";
      $("exportRows").innerHTML =
        '<div class="hint">Сначала собери ролик на этом канале.</div>';
      return;
    }
    ps.innerHTML = c.projects.map(
      p => `<option value="${p.path}">${p.name}</option>`).join("");
    const want = (keepPath || "").replace(/\\/g, "/");
    const same = c.projects.find(p => p.path.replace(/\\/g, "/") === want);
    ps.value = same ? same.path : c.projects[0].path;
    this.montageProject();
  },
  async montageProject() {
    const path = $("mProject").value;
    if (!path) return;
    $("mPath").textContent = path;
    await rpc("set_project", path);
    this.loadExportKit();
  },

  buildMaterial() {
    // Своя тема и свой сценарий — с ЭТОЙ вкладки, а не с «Сценария».
    // Пусто в обоих полях означает прежнее поведение: тема из очереди
    // канала, сценарий пишется сам.
    const topic = ($("mTopic") ? $("mTopic").value : "").trim();
    const script = ($("mScript") ? $("mScript").value : "").trim();
    const откуда = script ? "по твоему сценарию"
                          : (topic ? `по теме «${topic}»`
                                   : "по теме из очереди канала");
    if (!confirm(`Соберу материал ${откуда}: озвучка, субтитры, клип под `
                 + "каждый план. Рендера и плашек НЕ будет.\n\n"
                 + "Это часы работы. Запускать?")) return;
    rpc("build_material",
        Object.assign(app.genParams(), { script: script, topic: topic }));
  },
  materialDone() {
    addLog("[Материал] Готово — смотри список ниже", "ok");
    this.loadExportKit();
  },

  async loadExportKit() {
    const box = $("exportRows");
    if (!box) return;
    const rows = await rpc("export_kit");
    if (!rows || !rows.length) { box.innerHTML =
      '<div class="hint">Проект пуст — сначала собери сценарий.</div>'; return; }
    box.innerHTML = rows.map(r => {
      const cls = r.ready ? "exp-row" : "exp-row miss";
      const mark = r.ready ? "✓" : "·";
      const click = r.ready ? ` onclick="app.exportOpen('${r.key}')"` : "";
      return `<div class="${cls}"${click}>
                <div class="exp-mark">${mark}</div>
                <div class="exp-mid">
                  <div class="exp-title">${r.title}</div>
                  <div class="exp-hint">${r.hint}</div>
                </div>
                <div class="exp-info">${r.info}</div>
              </div>`;
    }).join("");
  },
  exportOpen(key) { rpc("export_open", key); },
  exportPack() { rpc("export_pack"); },
  exportPacked(dir) {
    addLog("[Экспорт] Папка собрана: " + dir, "ok");
    this.loadExportKit();
  },

  /* Поле «Каналов одновременно» заполняем ЧИСЛОМ ВКЛЮЧЁННЫХ КАНАЛОВ.
     В разметке стояла двойка, и при каждом перезапуске окна она
     возвращалась — просьба «три канала» трижды дала два. */
  async fillParMax() {
    const el = $("parMax");
    if (!el) return;
    const n = await rpc("active_channels_count");
    if (n && n > 0) { el.value = Math.min(4, n); el.max = Math.max(4, n); }
  },
  /* Ход сборки. Отвечает на единственный вопрос, который тут важен:
     ЗАВИСЛО ИЛИ РАБОТАЕТ. Отличить можно только по пульсу журнала — по
     общему времени нельзя, ролик честно собирается часами. */
  parStatusTimer: null,
  async loadParStatus() {
    const box = $("parStatus");
    if (!box) return;
    const st = await rpc("parallel_status");
    if (!st) return;
    if (!st.running || !st.running.length) {
      box.innerHTML = '<div class="hint">Сейчас ничего не собирается.</div>';
      return;
    }
    const lim = st.silent_limit_min || 45;
    box.innerHTML = st.running.map(r => {
      const m = r.silent_min;
      let mark = "работает", cls = "ok";
      if (m === null) { mark = "журнала нет"; cls = "warn"; }
      else if (m > lim) { mark = `МОЛЧИТ ${m} мин — похоже, зависло`; cls = "err"; }
      else if (m > 10) { mark = `тихо ${m} мин`; cls = "warn"; }
      else { mark = `работает, строка ${m} мин назад`; }
      return `<div class="exp-row">
                <div class="exp-mark">${cls === "ok" ? "▶" : "!"}</div>
                <div class="exp-mid">
                  <div class="exp-title">${r.id}</div>
                  <div class="exp-hint">${esc(r.last || "")}</div>
                </div>
                <div class="exp-info">${mark}</div>
              </div>`;
    }).join("");
  },
  startParStatus() {
    if (this.parStatusTimer) return;
    this.loadParStatus();
    this.parStatusTimer = setInterval(() => this.loadParStatus(), 20000);
  },
  autopilotParallel() {
    // ПУСТОЕ ПОЛЕ = ВСЕ включённые каналы. Прежде здесь стояла двойка,
    // зашитая в разметку, и она возвращалась при каждом перезапуске окна:
    // владелец трижды просил три канала и трижды получал два. Подстановка
    // числа из питона не спасала — showStage при старте не вызывается, а
    // страница может открыться раньше, чем мост ответит. Теперь решает
    // питон: 0 значит «сколько каналов включено, столько и бери».
    const raw = ($("parMax").value || "").trim();
    const n = raw ? (parseInt(raw) || 0) : 0;
    const v = parseInt($("autoVideos").value) || 1;
    if (!confirm(`Запущу каналы параллельно, ${n ? "до " + n : "ВСЕ включённые"} одновременно, `
                 + `по ${v} ролик(ов) на канал.\n\n`
                 + "Каждый канал пойдёт отдельным процессом и будет писать "
                 + "в свой журнал autopilot_logs/. Это часы работы, окно "
                 + "закрывать нельзя. Запускать?")) return;
    rpc("autopilot_parallel", { max: n, videos: v });
  },

  autopilot() {
    const n = parseInt($("autoVideos").value) || 1;
    const chn = channelsCache.length || 0;
    // Обещать «соберёт N роликов» больше нельзя: канал, у которого ролик на
    // сегодня уже готов, пропускается, а брошенный доделывается с того места,
    // где встал. План на эту ночь автопилот печатает в журнал первой же
    // строкой — там видно, что именно он собрался делать.
    if (!confirm(`Автопилот пройдёт по ${chn} канал(ам), до ${n} ролик(ов) `
                 + "на канал: незаконченные доделает, сегодняшние готовые "
                 + "пропустит. Это часы работы — ноутбук должен остаться "
                 + "включённым. План появится в журнале. Запускать?"))
      return;
    // script/topic — намеренно пустые: иначе текст, лежащий в поле сценария,
    // уехал бы во ВСЕ каналы разом, и ночь дала бы три копии одного ролика.
    rpc("autopilot", Object.assign(app.genParams(),
                                   { videos: n, script: "", topic: "" }));
  },
  genParams() {
    return Object.assign({
      lang: $("lang").value, tone: $("tone").value,
      visual_mode: $("visualMode").value, visual_style: $("visualStyle").value,
      ai_ratio: parseFloat($("aiRatio").value),
      script: $("scriptText").value,
      engine: $("ttsEngine").value, voice: $("ttsVoice").value,
    polly_engine: $("pollyEngine") ? $("pollyEngine").value : "neural",
      rate: $("ttsRate").value, pauses: $("ttsPauses").checked,
      enhance: $("ttsEnhance").checked,
      whisper: $("whisperModel").value, beat: parseFloat($("beat").value),
      resolution: $("rRes").value, fps: parseInt($("rFps").value),
      intensity: $("rInt").value, sub_size: $("rSubSize").value,
    quality: $("rQuality").value, sub_style: $("rSubStyle").value,
      subs: $("rSubs").checked, grain: $("rGrain").checked,
      vignette: $("rVignette").checked, letterbox: $("rLetterbox").checked,
      vhs: $("rVhs").checked, chromab: $("rChromab").checked,
      chapters: $("rChapters").checked, draft: $("rDraft").checked,
      overlays: $("overlaysText").value,
      thumbs: $("rThumbs") ? $("rThumbs").checked : true,
      grow_variants: $("rGrow") ? $("rGrow").checked : true,
      check_shots: $("rShots") ? $("rShots").checked : true,
      topic: $("topic") ? $("topic").value : "",
    }, app.fxParams());
  },
  clearLog() { $("console").innerHTML = ""; $("console2").innerHTML = ""; },
  copyLog() {
    navigator.clipboard.writeText($("console2").innerText);
    addLog("Журнал скопирован в буфер обмена", "dim");
  },
  toggleDrawer() {
    const d = $("drawer");
    const open = d.classList.toggle("open");
    document.body.classList.toggle("log-open", open);
    if (open) {
      const b = $("console2");
      b.scrollTop = b.scrollHeight;
    }
  },
  // ---------- набор материала под ручной монтаж ----------
  openKit() { $("kitModal").classList.add("open"); app.kitCost(); },
  closeKit() { $("kitModal").classList.remove("open"); },
  kitCost() {
    // Цифры не выдуманные: замер 24.08.2026 на запасном генераторе — кадр
    // 2624x1472 около двух минут, клип 5 с в 720p — 98 секунд. Человек
    // должен видеть, во что он ввязывается, ДО нажатия кнопки, иначе
    // «собрать» на 20 клипов выглядит как зависшая программа.
    const f = +$("kitAiFrames").value || 0, c = +$("kitAiClips").value || 0;
    const mins = Math.round((f * 2 + c * 1.7) + 1.5);
    $("kitCostLine").textContent = (f || c)
      ? `Поиск плюс генерация: примерно ${mins} мин. Кадр ~2 мин, клип ~1.7 мин.`
      : "Только поиск в интернете — минута-две на всё.";
  },
  kitStart() {
    const q = $("kitQuery").value.trim();
    if (!q) { $("kitQuery").focus(); return; }
    $("kitOpenBtn").hidden = true;
    rpc("mediakit_build", {
      query: q,
      shots: +$("kitShots").value || 8,
      stock_video: $("kitVideo").checked,
      stock_photo: $("kitPhoto").checked,
      music: $("kitMusic").checked,
      ai_frames: +$("kitAiFrames").value || 0,
      ai_clips: +$("kitAiClips").value || 0,
    });
  },
  kitDone(dir) {
    // Окно НЕ закрываем: человек тут же видит кнопку «Открыть папку», а не
    // ищет результат по журналу.
    $("kitOpenBtn").hidden = false;
    $("kitCostLine").textContent = "Готово: " + dir;
  },
  kitOpen() { rpc("mediakit_open", ""); },
  openSettings() {
    rpc("settings_get").then(s => {
      s = s || {};
      $("sAwsKey").value = s.aws_access_key || "";
      $("sAwsSecret").value = s.aws_secret_key || "";
      $("sAwsRegion").value = s.aws_region || "";
      $("sVeo").value = s.veo_key || "";
      $("sGemini").value = s.gemini_key || "";
      $("sAgnes").value = s.agnes_key || "";
      $("sPexels").value = s.pexels_keys || "";
      $("sPixabay").value = s.pixabay_keys || "";
      $("sMusicLib").value = s.music_library || "";
      $("sJamendo").value = s.jamendo_key || "";
      $("settingsModal").classList.add("open");
    });
  },
  closeSettings() { $("settingsModal").classList.remove("open"); },
  _settingsPayload: () => ({
    aws_access_key: $("sAwsKey").value.trim(),
    aws_secret_key: $("sAwsSecret").value.trim(),
    aws_region: $("sAwsRegion").value.trim(),
    veo_key: $("sVeo").value.trim(),
    gemini_key: $("sGemini").value.trim(),
    agnes_key: $("sAgnes").value.trim(),
    pexels_keys: $("sPexels").value.trim(),
    pixabay_keys: $("sPixabay").value.trim(),
    music_library: $("sMusicLib").value.trim(),
    jamendo_key: $("sJamendo").value.trim(),
  }),
  saveSettings() {
    rpc("settings_save", app._settingsPayload())
      .then(() => { app.closeSettings(); addLog("Настройки сохранены", "ok"); });
  },
  checkKeys() {
    addLog("Проверяю ключи Gemini и Agnes — по одному короткому запросу…", "dim");
    rpc("check_keys");
  },
};

$("projPath").addEventListener("change",
  () => rpc("set_project", $("projPath").value).then(refresh));
// ЯЗЫК ПРИНАДЛЕЖИТ КАНАЛУ, и раньше это делало список неработающим: канал
// навязывал свой язык при каждом обновлении состояния (см. setSel("lang",
// c.lang) в applyChannels), поэтому выбранный руками язык откатывался
// назад через секунду. Со стороны это выглядело так: «какой канал ни
// выбери, язык озвучки поменять нельзя».
//
// Чиним не отменой власти канала, а тем, что список её ЗАПИСЫВАЕТ: смена
// языка при выбранном канале правит профиль канала. Тогда выбор держится
// и в следующем ролике тоже — а без канала список работает как прежде,
// разово на текущий проект.
$("lang").addEventListener("change", () => {
  app.fillVoices();
  const id = $("channelSel") ? $("channelSel").value : "";
  const c = channelsCache.find((x) => x.id === id);
  if (!c) return;                       // без канала — разовая настройка
  const lang = $("lang").value;
  if (!lang || lang === c.lang) return;
  // Голос канала привязан к языку: немецкий голос на испанском тексте
  // читает по-немецки. Меняя язык, снимаем закреплённый голос — тогда
  // он подберётся заново под новый язык.
  rpc("channel_save", {id: c.id, lang: lang, voice: ""}).then(() => {
    addLog("Язык канала «" + (c.name || c.id) + "» изменён на " + lang
           + "; закреплённый голос снят — подберётся под новый язык");
    app.loadChannels(true); refresh();
  });
});

/* ---------- Старт ---------- */
app.fillVoices();
showStage("project");
addLog("Интерфейс загружен. Лента этапов сверху; одна кнопка "
       + "«Генерировать видео» проходит весь путь сама.", "dim");
// Каналы грузим ТОЛЬКО когда мост pywebview поднят: вызов сразу при разборе
// скрипта уходил в заглушку (window.pywebview ещё нет) и список оставался
// пустым, хотя профили в channels.json были.
// check_keys_startup — не косметика: мёртвый ЗАПАСНОЙ ключ (Agnes) ничем
// себя не выдаёт, пока отвечает основной (Gemini), и вылезает ровно тогда,
// когда дневная квота Gemini кончилась на середине ролика. Спрашиваем на
// старте; сам вызов защищён от повторного захода (boot() зовётся дважды).
function boot() {
  refresh(); app.loadChannels(true); rpc("check_keys_startup");
  // Мастер первого запуска — по ОТСУТСТВИЮ обязательного ключа, а не по
  // метке «первый раз»: после переустановки метка соврала бы, ключ — нет.
  rpc("needs_setup").then((need) => { if (need) app.openSetup(); });
}
if (window.pywebview) boot();
else window.addEventListener("pywebviewready", boot);
setTimeout(() => { if (!state) boot(); }, 700);   // демо-режим в браузере
// Клик вне меню каналов закрывает его
document.addEventListener("click", (e) => {
  const pop = $("channelPop");
  if (!pop || !pop.classList.contains("open")) return;
  if (!pop.contains(e.target) && e.target.id !== "channelAvatar")
    pop.classList.remove("open");
});

setInterval(() => rpc("noop"), 3600 * 1000);          // держим мост живым

/* =====================================================================
   ДАШБОРД, СПИСОК ПРОЕКТОВ И СТРОКА СОСТОЯНИЯ

   Добавлено поверх прежнего экрана: логика конвейера не тронута, все
   кнопки ведут в те же rpc, что и раньше. Новое здесь только одно —
   проекты и состояние машины видно сразу, а не после трёх переходов.
   ===================================================================== */

/* ---------- Ярлыки инструментов ---------- */

function renderQuickTools() {
  const box = $("quickTools");
  if (!box || box.dataset.built) return;      // ярлыки статичны — строим один раз
  box.innerHTML = "";
  for (const t of QUICK_TOOLS) {
    const b = document.createElement("button");
    b.className = "qt";
    b.onclick = () => (t.stage ? showStage(t.stage) : rpc(t.call));
    b.innerHTML = `<span class="qt-ico">${t.icon}</span>
                   <span class="qt-title">${t.title}</span>
                   <span class="qt-sub">${t.sub}</span>`;
    box.appendChild(b);
  }
  box.dataset.built = "1";
}

/* ---------- Список проектов ---------- */

let projectsCache = [];

// Имя НЕ renderProjects: так уже называется функция выше, которая строит
// мини-ленту проектов на экране «Проект» из state.projects. Второе объявление
// с тем же именем молча затирало первое — список #projList оставался пустым
// навсегда, а каждый refresh() уходил читать meta.json всех папок канала,
// ровно то, чего этот экран и должен избегать.
async function renderProjectsPage() {
  const box = $("projectRows");
  if (!box) return;
  const rows = (await rpc("projects_list")) || [];
  projectsCache = rows;

  const counter = $("projectsCount");
  if (counter) counter.textContent = rows.length;

  if (!rows.length) {
    box.innerHTML = `<div class="empty">Проектов пока нет.
      Нажмите «Новый проект» внизу — он ляжет в папку текущего канала.</div>`;
    return;
  }

  box.innerHTML = "";
  rows.forEach((p, i) => {
    const el = document.createElement("div");
    el.className = "prow" + (p.current ? " current" : "");

    // Чипы показывают то, чем проекты РЕАЛЬНО отличаются друг от друга:
    // язык и голос приходят из профиля канала, длительность — оттуда же.
    // Всё это свободный ввод человека (channels.json), поэтому в разметку —
    // только через esc, как имя проекта строкой ниже.
    const chips = [];
    if (p.lang) chips.push(`<span class="chip">🌐 ${esc(p.lang)}</span>`);
    if (p.minutes) chips.push(`<span class="chip">⏱ ${esc(p.minutes)} мин</span>`);
    if (p.voice) chips.push(`<span class="chip">🎙 ${esc(p.voice)}</span>`);
    if (p.channel_name) chips.push(`<span class="chip">📺 ${esc(p.channel_name)}</span>`);
    if (p.size_mb) chips.push(`<span class="chip ok">▶ ${p.size_mb} МБ</span>`);

    el.innerHTML = `
      <div class="pnum">${i + 1}</div>
      <div class="pbody">
        <div class="ptitle">${p.topic ? esc(p.topic) : "<i>Нет темы</i>"}</div>
        <div class="pchips">${chips.join("")}</div>
      </div>
      <div class="pprog" title="Пройдено этапов">${p.done}/${p.total}</div>
      <div class="pacts">
        <button class="iconbtn" title="Открыть проект">↗</button>
        <button class="iconbtn" title="Папка на диске">🗀</button>
        <button class="iconbtn danger" title="Удалить">🗑</button>
      </div>`;

    const [openBtn, folderBtn, delBtn] = el.querySelectorAll(".pacts button");
    openBtn.onclick = async () => { await rpc("set_project", p.path); refresh(); showStage("project"); };
    // Папку ПРОИЗВОЛЬНОГО проекта открывает open_project_folder(path).
    // У open_folder аргументов нет вовсе — он открывает текущий проект, и
    // лишний путь ронял вызов на мосту (TypeError), кнопка не работала.
    folderBtn.onclick = () => rpc("open_project_folder", p.path);
    delBtn.onclick = async () => {
      // Проект — это часы работы и гигабайты на диске; спрашиваем всегда.
      if (!confirm(`Удалить проект «${p.topic || p.name}» со всеми файлами?`)) return;
      await rpc("delete_project", p.path);
      refresh();                 // текущий проект мог быть удалён — перечитать
      renderProjectsPage();
    };
    box.appendChild(el);
  });

  // Дашборд показывает те же строки, но только четыре свежих: он для
  // «что у меня в работе», а не для управления списком.
  const dash = $("dashRows");
  if (dash) {
    dash.innerHTML = "";
    rows.slice(0, 4).forEach((p) => {
      const d = document.createElement("div");
      d.className = "prow slim" + (p.current ? " current" : "");
      d.innerHTML = `
        <div class="pbody">
          <div class="ptitle">${p.topic ? esc(p.topic) : "<i>Нет темы</i>"}</div>
          <div class="pchips">
            ${p.lang ? `<span class="chip">🌐 ${esc(p.lang)}</span>` : ""}
            ${p.size_mb ? `<span class="chip ok">▶ ${p.size_mb} МБ</span>` : ""}
          </div>
        </div>
        <div class="pprog">${p.done}/${p.total}</div>`;
      d.onclick = async () => { await rpc("set_project", p.path); refresh(); showStage("project"); };
      dash.appendChild(d);
    });
  }
}

/* ---------- Строка состояния ---------- */

async function refreshStats() {
  // Без моста опрос каждые 5 с только сыпал бы в журнал «демо-режим:
  // бэкенд не подключён» (см. mockApi.call).
  if (!window.pywebview) return;
  const st = await rpc("system_stats");
  if (!st) return;
  const mem = $("statMem"), q = $("statQueue");
  if (mem && st.mem_total) mem.textContent = `Память ${st.mem_used} / ${st.mem_total} ГБ`;
  if (q) q.textContent = st.queue ? `Очередь: ${st.queue}` : "Очередь пуста";
}

/* ---------- Нижняя панель ---------- */

const bar = {
  newProject() {
    const name = prompt("Название проекта:");
    if (name) rpc("new_project", name).then(() => { refresh(); renderProjectsPage(); });
  },
  preview() { rpc("open_result"); },
  generate() { rpc("generate_all", app.genParams()); },
  // Папка ТЕКУЩЕГО проекта — это open_folder без аргументов.
  // open_project_folder требует путь и без него падал на мосту.
  folder() { rpc("open_folder"); },
};
window.bar = bar;

/* ---------- Подключение к жизненному циклу ---------- */

// Дашборд и проекты обновляем при заходе на них, а не по таймеру: чтение
// meta.json полусотни папок на каждом тике — это диск на ровном месте.
const _showStage = showStage;
showStage = function (id) {
  _showStage(id);
  if (id === "dashboard") { renderQuickTools(); renderProjectsPage(); }
  if (id === "projects") renderProjectsPage();
};

setInterval(refreshStats, 5000);
setTimeout(() => { refreshStats(); renderQuickTools(); }, 800);

/* =====================================================================
   РЕЖИМ МОНТАЖА

   Два независимых переключателя — источник кадров и движок графики —
   людьми воспринимались как один. Человек ставил «ИИ в едином стиле»,
   ждал, что Node больше не нужен, а плашки продолжали идти через
   Remotion, и первый же прогон падал на отсутствующем npx. Режим
   выставляет оба разом; «Свой» оставлен для тех, кому нужна смесь.
   ===================================================================== */

const MONTAGE_MODES = {
  full:    { visual: "mixed", engine: "auto",
             note: "Сток плюс ИИ-кадры, графика через Remotion. Нужен Node.js." },
  ai_only: { visual: "ai", engine: "pillow",
             note: "Каждый кадр генерируется ИИ, плашки рисует встроенный движок. "
                 + "Node.js не нужен, Remotion и HyperFrames не участвуют. "
                 + "Дороже по генерации и дольше, зато кадр всегда попадает в текст." },
};

async function applyMontageMode(mode, save) {
  const m = MONTAGE_MODES[mode];
  if (!m) return;                       // «Свой» — ничего не навязываем
  if ($("visualMode")) $("visualMode").value = m.visual;
  if ($("overlayEngine")) $("overlayEngine").value = m.engine;
  // Доля ИИ в режиме «только ИИ» ни на что не влияет — кадры и так все
  // генерируются, — но оставлять её на 85% значит показывать человеку
  // цифру, которая противоречит выбранному режиму.
  if (mode === "ai_only" && $("aiRatio")) {
    const opt = [...$("aiRatio").options].find((o) => o.value === "0.85");
    if (opt) $("aiRatio").value = "0.85";
  }
  addLog("[Монтаж] " + m.note, "dim");
  if (save) await rpc("settings_save", { overlay_engine: m.engine });
}

// Движок графики читается питоном из settings.json, а не из параметров
// прогона, поэтому его надо сохранить, а не просто выставить в списке.
async function saveOverlayEngine() {
  const el = $("overlayEngine");
  if (!el) return;
  await rpc("settings_save", { overlay_engine: el.value });
  addLog("[Монтаж] Движок графики: " + el.options[el.selectedIndex].text, "dim");
}

app.setMontageMode = (mode) => applyMontageMode(mode, true);
app.saveOverlayEngine = saveOverlayEngine;

// Ручная правка любого из двух списков переводит режим в «Свой»: иначе
// подпись режима врала бы о том, что на самом деле выставлено.
document.addEventListener("DOMContentLoaded", () => {
  // Поле «Каналов одновременно» заполняем ПРИ ЗАГРУЗКЕ. Раньше это стояло
  // только на входе во вкладку через showStage, а showStage при старте не
  // вызывается вовсе — поле так и оставалось с зашитой в разметку двойкой,
  // и просьба «три канала» трижды превращалась в два (31.08).
  if (typeof app !== "undefined") { app.fillParMax(); app.startParStatus(); }
  const mm = $("montageMode");
  ["visualMode", "overlayEngine"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("change", () => {
      if (mm) mm.value = "custom";
      if (id === "overlayEngine") saveOverlayEngine();
    });
  });
});

/* ===================== МАСТЕР ПЕРВОГО ЗАПУСКА =====================
   Всё содержимое рисуется ИЗ РЕЕСТРА core.KEY_SPECS, а не из разметки.
   Раньше подписи к ключам жили в index.html и разошлись с правдой: платный
   VeoNonStop был подписан «основной», бесплатный Gemini — «запасной». Пока
   подписи лежат в другом файле, чем проверка, они расходятся снова; поэтому
   единственный источник — питон.                                        */

const SETUP = { keys: [], probing: {}, values: {} };

/* Состояния приходят из питона по-русски («не спросил» — с пробелом), а имя
   класса с пробелом развалилось бы на два класса и красило бы не то. Поэтому
   в разметку идёт латинская метка, а человеку показывается русский текст. */
const KSTATE = {
  "ok": "ok", "пусто": "empty", "лимит": "limit", "мёртв": "dead",
  "не спросил": "unknown", "wait": "wait", "filled": "filled",
};
const kslug = (s) => KSTATE[s] || "unknown";

function setupRow(k) {
  const money = k.money === "платный"
    ? '<span class="tag paid">платный</span>'
    : '<span class="tag free">бесплатно</span>';
  const st = SETUP.probing[k.id] || (k.filled ? { state: "filled" } : null);
  const dot = st ? `<span class="kdot ${kslug(st.state)}"></span>` : "";
  const note = st && st.text
    ? `<span class="kstate ${kslug(st.state)}">${esc(st.text)}${st.why ? " — " + esc(st.why) : ""}</span>`
    : "";
  return `
    <div class="krow" data-key="${esc(k.id)}">
      <div class="khead">${dot}<b>${esc(k.title)}</b>${money}
        <span class="kwhen">${esc(k.howlong)}</span></div>
      <div class="kgives">${esc(k.gives)}</div>
      <div class="field">
        <input type="text" id="k_${esc(k.id)}" class="grow" spellcheck="false"
               value="${esc(SETUP.values[k.id] || "")}"
               placeholder="${k.filled && k.hint ? esc(k.hint) + " — вписан"
                             : k.filled ? "уже вписан" : "вставь ключ сюда"}">
        <button class="btn ghost" onclick="app.setupGet('${esc(k.id)}')">Получить</button>
        <button class="btn ghost" onclick="app.setupProbe('${esc(k.id)}')">Проверить</button>
      </div>
      <div class="kwithout">Без него: ${esc(k.without)}</div>
      ${note}
    </div>`;
}

/* Забрать набранное из полей ПЕРЕД перерисовкой.
   Без этого «Проверить» стирало ВСЕ введённые ключи: renderSetup()
   пересобирает innerHTML целиком, а вместе с ним пересоздаёт поля ввода —
   и человек на первом же экране терял то, что только что вставил. Сама
   проверка при этом уходила с верным значением, поэтому в журнале дефект
   не виден. Замерено вживую. */
function grabSetupValues() {
  for (const k of SETUP.keys) {
    const el = $("k_" + k.id);
    if (el) SETUP.values[k.id] = el.value;
  }
}

function renderSetup() {
  grabSetupValues();
  const req = SETUP.keys.filter(k => k.role === "обязательный");
  const opt = SETUP.keys.filter(k => k.role !== "обязательный");
  const free = req.filter(k => k.money === "бесплатно").length;
  $("setupLead").innerHTML =
    `Чтобы собрать первый ролик, нужно ${req.length} ключа — ` +
    `${free === req.length ? "оба бесплатные" : "часть бесплатных"}. ` +
    `Озвучка работает без ключей вообще. Остальное подключается когда угодно ` +
    `и на первый ролик не влияет.`;
  $("setupRequired").innerHTML = req.map(setupRow).join("");
  $("setupOptional").innerHTML = opt.map(setupRow).join("");
}

Object.assign(app, {
  async openSetup() {
    const r = await rpc("keys_report");
    SETUP.keys = (r && r.keys) || [];
    SETUP.probing = {};
    SETUP.values = {};
    renderSetup();
    $("setupModal").classList.add("open");
  },
  setupToggleMore() {
    const box = $("setupOptional");
    box.hidden = !box.hidden;
    $("setupMoreBtn").textContent = box.hidden
      ? "Что можно подключить позже →"
      : "Свернуть необязательные ↑";
  },
  setupGet(id) {
    const k = SETUP.keys.find(x => x.id === id);
    if (k) rpc("open_url", k.where);
  },
  async setupProbe(id) {
    grabSetupValues();
    SETUP.probing[id] = { state: "wait", text: "проверяю…" };
    renderSetup();
    const r = await rpc("key_probe", id, SETUP.values[id] || "");
    SETUP.probing[id] = r || { state: "не спросил", text: "нет ответа" };
    renderSetup();
  },
  // Пишем ТОЛЬКО непустые поля: пустое поле означает «не трогай», а не
  // «сотри». Иначе открытый и закрытый без правок мастер стирал бы ключи,
  // вписанные раньше в «Настройках API».
  async setupSave() {
    grabSetupValues();
    const payload = {};
    for (const k of SETUP.keys) {
      const v = (SETUP.values[k.id] || "").trim();
      if (v) payload[k.id] = v;
    }
    if (Object.keys(payload).length) await rpc("settings_save", payload);
    const r = await rpc("keys_report");
    if (r && !r.ready) {
      addLog("Ещё не вписаны обязательные ключи: " + r.missing.join(", "), "warn");
      SETUP.keys = r.keys; renderSetup();
      return;
    }
    $("setupModal").classList.remove("open");
    addLog("Ключи сохранены. Можно делать первый ролик.", "ok");
  },
  setupSkip() {
    $("setupModal").classList.remove("open");
    addLog("Мастер пропущен. Ключи всегда можно вписать в «Настройках API».", "dim");
  },
});


/* Правая панель: спрятать или показать.
   Выбор запоминается в localStorage, а не в settings.json: это настройка
   ОКНА, а не проекта, и гонять её через питон ради одного логического
   значения незачем. Обёрнуто в try — в некоторых сборках окна хранилище
   недоступно, и падать из-за настройки вида нельзя. */
Object.assign(app, {
  toggleSide() {
    const hidden = document.body.classList.toggle("side-hidden");
    try { localStorage.setItem("cf.side-hidden", hidden ? "1" : "0"); } catch (e) {}
  },
});

try {
  if (localStorage.getItem("cf.side-hidden") === "1") {
    document.body.classList.add("side-hidden");
  }
} catch (e) {}
