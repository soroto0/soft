/* Контент-фабрика — фронтенд. Работает через pywebview.api;
   без бэкенда (открыт просто index.html) включается демо-режим. */

const $ = (id) => document.getElementById(id);

const STAGES = [
  ["📝", "Сценарий", "script"],
  ["🎙", "Озвучка", "tts"],
  ["💬", "Субтитры", "subs"],
  ["🎞", "Раскадровка", "media"],
  ["✨", "Оверлеи", "overlays"],
  ["🎬", "Рендер", "render"],
  ["📦", "Premiere", "build"],
];

const EDGE_VOICES = ["en-US-GuyNeural", "en-US-ChristopherNeural",
  "en-US-EricNeural", "en-US-AndrewNeural", "en-US-BrianNeural",
  "en-US-JennyNeural", "en-US-AriaNeural", "en-US-MichelleNeural"];
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
function showPage(name) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  $("page-" + name).classList.add("active");
  document.querySelector(`.nav-item[data-page="${name}"]`).classList.add("active");
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
  for (const [ico, name, page] of STAGES) {
    const ok = state.checks && state.checks[name];
    const card = document.createElement("div");
    card.className = "card";
    card.onclick = () => showPage(page);
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
    row.className = "projrow";
    row.innerHTML = `
      <div style="flex:1">
        <div class="pname">${p.name}${p.current ? " ◀" : ""}</div>
        <div style="margin-top:4px">${(p.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}</div>
      </div>
      <span class="hint" style="margin:0">${p.done}/${p.total || 7}</span>
      <div class="pbar"><i style="width:${pct}%"></i></div>
      <button class="iconbtn" title="Открыть папку">📂</button>
      <button class="iconbtn" title="Сделать текущим">▶</button>
      <button class="iconbtn" title="Удалить">🗑</button>`;
    const [fold, open, del] = row.querySelectorAll(".iconbtn");
    fold.onclick = () => rpc("open_project_folder", p.path);
    open.onclick = () => rpc("set_project", p.path).then(refresh);
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
  newProject() {
    const name = prompt("Имя нового проекта (папки):");
    if (name) rpc("new_project", name).then(refresh);
  },
  deleteProject() {
    if (confirm("Удалить ТЕКУЩИЙ проект целиком?\nВсе файлы будут стёрты безвозвратно."))
      rpc("delete_current_project").then(refresh);
  },
  fillVoices() {
    const edge = $("ttsEngine").value.includes("Edge");
    const list = edge ? EDGE_VOICES : POLLY_VOICES;
    $("ttsVoice").innerHTML = list.map(v => `<option>${v}</option>`).join("");
    $("pausesWrap").style.display = edge ? "none" : "";
  },
  genScript() {
    const t = $("topic").value.trim();
    if (!t) return addLog("Напиши тему видео", "warn");
    rpc("gen_script", t, parseInt($("minutes").value));
  },
  saveScript: () => rpc("save_script", $("scriptText").value),
  autoScenes: () => rpc("auto_scenes", $("scriptText").value)
      .then(r => { if (r) { $("scenesText").value = r; showPage("media"); } }),
  runTts: () => rpc("tts", {
    engine: $("ttsEngine").value, voice: $("ttsVoice").value,
    rate: $("ttsRate").value, pauses: $("ttsPauses").checked,
    script: $("scriptText").value,
  }),
  pickMusic: () => rpc("pick_music").then(p => { if (p) $("musicPath").value = p; }),
  mixMusic: () => rpc("mix_music", $("musicPath").value, $("mood").value,
                      parseInt($("musicGain").value)),
  runSubs: () => rpc("subs", $("whisperModel").value),
  fetchStocks: () => rpc("stocks", $("scenesText").value, $("kenburns").checked),
  storyboard() {
    if ($("genvideo").checked && !confirm(
        "Включена ИИ-генерация клипов для ненайденных планов.\n" +
        "Каждый клип тратит кредиты Agnes и делается 1-3 минуты.\n\nПродолжить?"))
      return;
    rpc("storyboard", parseFloat($("beat").value), $("genvideo").checked);
  },
  suggestOverlays: () => rpc("suggest_overlays")
      .then(r => { if (r) $("overlaysText").value = r; }),
  saveOverlays: () => rpc("save_overlays", $("overlaysText").value),
  render: () => rpc("render", {
    resolution: $("rRes").value, fps: parseInt($("rFps").value),
    intensity: $("rInt").value, sub_size: $("rSubSize").value,
    subs: $("rSubs").checked, grain: $("rGrain").checked,
    vignette: $("rVignette").checked, letterbox: $("rLetterbox").checked,
    vhs: $("rVhs").checked, chromab: $("rChromab").checked,
    chapters: $("rChapters").checked, draft: $("rDraft").checked,
    overlays: $("overlaysText").value,
  }),
  stopRender: () => rpc("stop_render"),
  openResult: () => rpc("open_result"),
  openFolder: () => rpc("open_folder"),
  runSeo: () => rpc("seo").then(r => { if (r) $("seoOut").textContent = r; }),
  generateAll() {
    rpc("generate_all", {
      script: $("scriptText").value,
      engine: $("ttsEngine").value, voice: $("ttsVoice").value,
      rate: $("ttsRate").value, pauses: $("ttsPauses").checked,
      whisper: $("whisperModel").value, beat: parseFloat($("beat").value),
      resolution: $("rRes").value, fps: parseInt($("rFps").value),
      intensity: $("rInt").value, sub_size: $("rSubSize").value,
      subs: $("rSubs").checked, grain: $("rGrain").checked,
      vignette: $("rVignette").checked, letterbox: $("rLetterbox").checked,
      vhs: $("rVhs").checked, chromab: $("rChromab").checked,
      chapters: $("rChapters").checked, draft: $("rDraft").checked,
      overlays: $("overlaysText").value,
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
      gemini_key: $("sGemini").value.trim(),
      agnes_key: $("sAgnes").value.trim(),
      pexels_keys: $("sPexels").value.trim(),
      pixabay_keys: $("sPixabay").value.trim(),
    }).then(() => { app.closeSettings(); addLog("Настройки сохранены", "ok"); });
  },
};

$("projPath").addEventListener("change",
  () => rpc("set_project", $("projPath").value).then(refresh));

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
