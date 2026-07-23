/* Контент-фабрика — фронтенд. Работает через pywebview.api;
   без бэкенда (открыт просто index.html) включается демо-режим. */

const $ = (id) => document.getElementById(id);

const ICO = {
  script: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l5 5v13H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>',
  tts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3M8 21h8"/></svg>',
  subs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg>',
  media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="7" height="7" rx="1"/><rect x="14" y="5" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  overlays: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 15l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z"/></svg>',
  render: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-4h14L20 9"/><rect x="3" y="9" width="18" height="10" rx="1.5"/><path d="M3 9l3-4M9 9l3-4M15 9l3-4"/></svg>',
  build: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5L12 12l8-4.5M12 12v9"/></svg>',
};
const STAGES = [
  [ICO.script, "Сценарий", "materials", "script"],
  [ICO.tts, "Озвучка", "materials", "tts"],
  [ICO.subs, "Субтитры", "materials", "subs"],
  [ICO.media, "Раскадровка", "video", "media"],
  [ICO.overlays, "Оверлеи", "video", "overlays"],
  [ICO.render, "Рендер", "video", "render"],
  [ICO.build, "Premiere", "build", null],
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

/* ---------- Навигация ---------- */
document.querySelectorAll(".nav-item").forEach((el) => {
  el.onclick = () => showPage(el.dataset.page);
});
document.querySelectorAll(".subnav").forEach((nav) => {
  nav.querySelectorAll(".pill").forEach((btn) => {
    btn.onclick = () => showSub(nav, btn.dataset.sub);
  });
});
function showPage(name, sub) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  $("page-" + name).classList.add("active");
  document.querySelector(`.nav-item[data-page="${name}"]`).classList.add("active");
  if (sub) {
    const nav = $("page-" + name).querySelector(".subnav");
    if (nav) showSub(nav, sub);
  }
}
function showSub(nav, sub) {
  const page = nav.closest(".page");
  nav.querySelectorAll(".pill").forEach((b) => b.classList.toggle("active", b.dataset.sub === sub));
  page.querySelectorAll(".subpage").forEach((sp) => sp.classList.toggle("active", sp.id === "sub-" + sub));
}

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
function setStatus(text) { $("status").textContent = text; }
function setProgress(done, total) {
  $("sbarFill").style.width = total ? (100 * done / total) + "%" : "0%";
}
function taskDone() { setStatus("Готов"); setProgress(0, 0); refresh(); }

/* ---------- Состояние ---------- */
let state = null;
async function refresh() {
  const s = await rpc("get_state");
  if (!s) { if (!state) state = await mockApi.get_state(); else return; }
  else state = s;
  $("projPath").value = state.project || "";
  $("version").textContent = "v" + (state.version || "3.0");
  renderCards();
  renderProjects();
  renderChecklist();
  if (state.script !== undefined && document.activeElement !== $("scriptText") && state.script)
    $("scriptText").value = state.script;
  if (state.scenes && document.activeElement !== $("scenesText"))
    $("scenesText").value = state.scenes;
  if (state.overlays && document.activeElement !== $("overlaysText"))
    $("overlaysText").value = state.overlays;
  if (state.subs) renderSubs(state.subs);
  updateStats();
}

function renderCards() {
  const box = $("stageCards");
  box.innerHTML = "";
  for (const [ico, name, page, sub] of STAGES) {
    const ok = state.checks && state.checks[name];
    const card = document.createElement("div");
    card.className = "card";
    card.onclick = () => showPage(page, sub);
    card.innerHTML = `<div class="cico">${ico}</div>
      <div><div class="cname">${name}</div>
      <span class="chip ${ok ? "ok" : "wait"}">${ok ? "Готов" : "Ожидание"}</span></div>`;
    box.appendChild(card);
  }
}

function renderProjects() {
  const box = $("projList");
  box.innerHTML = "";
  const projs = state.projects || [];
  $("projCount").textContent = projs.length;
  for (const p of projs) {
    const pct = Math.round(100 * p.done / (p.total || 7));
    const row = document.createElement("div");
    row.className = "projrow" + (p.current ? " current" : "");
    row.innerHTML = `
      <div class="popen" style="flex:1; cursor:pointer">
        <div class="pname">${p.name}${p.current ? " ● текущий" : ""}</div>
        <div style="margin-top:4px">${(p.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}</div>
      </div>
      <span class="hint" style="margin:0">${p.done}/${p.total || 7}</span>
      <div class="pbar"><i style="width:${pct}%"></i></div>
      <button class="btn gold pbtn-open">Открыть</button>
      <button class="iconbtn" title="Переименовать">✏️</button>
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
      if (confirm(`Удалить проект «${p.name}» целиком?\nВсе файлы будут стёрты безвозвратно.`))
        rpc("delete_project", p.path).then(refresh);
    };
    box.appendChild(row);
  }
}

function renderChecklist() {
  if (!state.checks) return;
  $("checklist").innerHTML = Object.entries(state.checks)
    .map(([k, v]) => `${k.toLowerCase()} ${v ? "<b>✓</b>" : "<i>✗</i>"}`).join("&nbsp; ");
}

function renderSubs(rows) {
  const box = $("subsList");
  box.innerHTML = "";
  for (const [a, b, t] of rows.slice(0, 400)) {
    const r = document.createElement("div");
    r.className = "srow";
    r.innerHTML = `<span class="st">${a}</span><span>${t}</span>`;
    box.appendChild(r);
  }
}

function updateStats() {
  const w = $("scriptText").value.trim().split(/\s+/).filter(Boolean).length;
  $("scriptStats").textContent = `${w} слов · ~${Math.floor(w / 150)} мин озвучки`;
}
$("scriptText").addEventListener("input", updateStats);

/* ---------- Действия ---------- */
const app = {
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
    $("pausesWrap").style.display = edge ? "none" : "";
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
        "тратит кредиты Agnes.\n\nПродолжить?"))
      return;
    if (mode === "mixed" && !confirm(
        `Режим «микс»: ~${Math.round(parseFloat($("aiRatio").value) * 100)}% ` +
        "планов будут намеренно ИИ-кадрами (тратит кредиты Agnes).\n\nПродолжить?"))
      return;
    if ($("genvideo").checked && mode !== "ai" && !confirm(
        "ИИ-генерация клипов для ненайденных планов тратит кредиты Agnes.\n\nПродолжить?"))
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
    out_name: $("outName").value,
    overlays: $("overlaysText").value,
  }),
  stopRender: () => rpc("stop_render"),
  openResult: () => rpc("open_result", $("outName").value),
  openFolder: () => rpc("open_folder"),
  runSeo: () => rpc("seo").then(r => { if (r) $("seoOut").textContent = r; }),
  generateAll() {
    rpc("generate_all", {
      lang: $("lang").value, tone: $("tone").value,
      visual_mode: $("visualMode").value, visual_style: $("visualStyle").value,
      ai_ratio: parseFloat($("aiRatio").value),
      script: $("scriptText").value,
      engine: $("ttsEngine").value, voice: $("ttsVoice").value,
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
    });
  },
  clearLog() { $("console").innerHTML = ""; $("console2").innerHTML = ""; },
  copyLog() {
    navigator.clipboard.writeText($("console").innerText);
    addLog("Журнал скопирован в буфер обмена", "dim");
  },
  toggleDrawer() {
    const d = $("drawer");
    d.classList.toggle("collapsed");
    try {
      localStorage.setItem("drawer",
        d.classList.contains("collapsed") ? "0" : "1");
    } catch (e) { /* file:-песочница может запрещать localStorage */ }
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
      $("settingsModal").classList.add("open");
    });
  },
  closeSettings() { $("settingsModal").classList.remove("open"); },
  saveSettings() {
    rpc("settings_save", {
      aws_access_key: $("sAwsKey").value.trim(),
      aws_secret_key: $("sAwsSecret").value.trim(),
      aws_region: $("sAwsRegion").value.trim(),
      veo_key: $("sVeo").value.trim(),
      gemini_key: $("sGemini").value.trim(),
      agnes_key: $("sAgnes").value.trim(),
      pexels_keys: $("sPexels").value.trim(),
      pixabay_keys: $("sPixabay").value.trim(),
    }).then(() => { app.closeSettings(); addLog("Настройки сохранены", "ok"); });
  },
};

$("projPath").addEventListener("change",
  () => rpc("set_project", $("projPath").value).then(refresh));
$("lang").addEventListener("change", app.fillVoices);

/* ---------- Старт ---------- */
try {
  if (localStorage.getItem("drawer") === "0")
    $("drawer").classList.add("collapsed");
} catch (e) { /* file:-песочница может запрещать localStorage */ }
app.fillVoices();
addLog("Интерфейс загружен. Порядок: Сценарий → Озвучка → Транскрибация → " +
       "Раскадровка → Рендер, или одна кнопка «Генерировать видео».", "dim");
if (window.pywebview) refresh();
else window.addEventListener("pywebviewready", refresh);
setTimeout(() => { if (!state) refresh(); }, 700);   // демо-режим в браузере
setInterval(() => rpc("noop"), 3600 * 1000);          // держим мост живым
