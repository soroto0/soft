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
const STAGES = [
  { id: "project",  label: "Проект",     icon: "◉", check: null },
  { id: "script",   label: "Сценарий",   icon: "✎", check: "Сценарий" },
  { id: "voice",    label: "Озвучка",    icon: "🎙", check: "Озвучка" },
  { id: "subs",     label: "Субтитры",   icon: "💬", check: "Субтитры" },
  { id: "media",    label: "Раскадровка", icon: "▦", check: "Раскадровка" },
  { id: "overlays", label: "Оверлеи",    icon: "✦", check: "Оверлеи" },
  { id: "render",   label: "Рендер",     icon: "▶", check: "Рендер" },
  { id: "export",   label: "Экспорт",    icon: "⤓", check: "Premiere" },
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
  // «Готов» и название этапа — покой; всё остальное считаем работой
  const busy = !!text && !/^(Готов|Проект|Сценарий|Озвучка|Субтитры|Раскадровка|Оверлеи|Рендер|Экспорт)$/.test(text);
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
function taskDone() { setStatus("Готов"); setProgress(0, 0); refresh(); }

/* ---------- Состояние ---------- */
let state = null;
let lastProject = null;
let channelsCache = [];

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
  for (const s of STAGES) {
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
      box.innerHTML = channelsCache.map((c, i) => `
        <div class="pop-row${c.id === cur ? " active" : ""}" data-ch="${esc(c.id)}">
          <span class="ava" style="background:${chColor(c, i)}">${esc(chLetter(c))}</span>
          <span>${esc(c.name || c.id)}</span>
        </div>`).join("") || '<div class="pop-act">нет каналов</div>';
      box.querySelectorAll(".pop-row").forEach((r) => {
        r.onclick = () => app.gatePick(r.dataset.ch);
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
    rpc("channel_select", id).then(refresh);
  },
  skipGate() { $("gate").classList.remove("open"); },
  openGate() { app.renderGate(); $("gate").classList.add("open"); },
  selectChannel() {
    const id = $("channelSel").value;
    app.renderChannelPop();
    if (id) { forceReload = true; forceProjPath = true;
               rpc("channel_select", id).then(refresh); }
  },
  editChannel() {
    const id = $("channelSel").value;
    const cur = channelsCache.find((c) => c.id === id) || {};
    // Форма намеренно простая: правится JSON профиля целиком. Каналов три,
    // меняются они редко — отдельный экран с два десятками полей тут лишний.
    const draft = JSON.stringify({
      id: cur.id || "", name: cur.name || "", lang: cur.lang || "английский",
      tone: cur.tone || "документальный", minutes: cur.minutes || 10,
      voice: cur.voice || "", rate: cur.rate || 0,
      visual_style: cur.visual_style || "кинематографичный",
      watermark: cur.watermark || "", accent: cur.accent || "",
      avoid: cur.avoid || "", youtube_url: cur.youtube_url || "",
    }, null, 2);
    const out = prompt(
      "Настройки канала (id — латиницей, он же имя папки).\n" +
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
    }
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
  render: () => rpc("render", {
    resolution: $("rRes").value, fps: parseInt($("rFps").value),
    intensity: $("rInt").value, sub_size: $("rSubSize").value,
    quality: $("rQuality").value, sub_style: $("rSubStyle").value,
    subs: $("rSubs").checked, grain: $("rGrain").checked,
    vignette: $("rVignette").checked, letterbox: $("rLetterbox").checked,
    vhs: $("rVhs").checked, chromab: $("rChromab").checked,
    chapters: $("rChapters").checked, draft: $("rDraft").checked,
    bloom: $("rBloom").checked, light_leak: $("rLeak").checked,
    dust: $("rDust").checked, flicker: $("rFlicker").checked,
    sand: $("rSand") ? $("rSand").checked : false,
    stars: $("rStars") ? $("rStars").checked : false,
    embers: $("rEmbers") ? $("rEmbers").checked : false,
    out_name: $("outName").value,
    overlays: $("overlaysText").value,
  }),
  stopRender: () => rpc("stop_render"),
  openResult: () => rpc("open_result", $("outName").value),
  openFolder: () => rpc("open_folder"),
  runSeo: () => rpc("seo").then(r => { if (r) $("seoOut").textContent = r; }),
  makeThumbs: () => rpc("make_thumbnails", 3),
  generateAll() { rpc("generate_all", app.genParams()); },
  // Ночной прогон идёт РОВНО с теми же настройками, что и кнопка рядом:
  // отдельный набор параметров разъехался бы с ней при первой же правке.
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
    return {
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
      randomize: $("randomize").checked,
      thumbs: $("rThumbs") ? $("rThumbs").checked : true,
      grow_variants: $("rGrow") ? $("rGrow").checked : true,
      check_shots: $("rShots") ? $("rShots").checked : true,
      topic: $("topic") ? $("topic").value : "",
    };
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
$("lang").addEventListener("change", app.fillVoices);

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
function boot() { refresh(); app.loadChannels(true); rpc("check_keys_startup"); }
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
