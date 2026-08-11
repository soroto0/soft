# =====================================================================
#  Сборка раздаваемой копии.
#
#  Кладёт в отдельную папку ТОЛЬКО то, что перечислено ниже поимённо, и
#  печатает полный список того, что попало. После сборки идут две проверки:
#
#    1. по именам   — не просочился ли файл из чёрного списка;
#    2. по содержимому — не встречается ли в собранных файлах хотя бы одно
#       НАСТОЯЩЕЕ значение из .env и settings.json этой машины.
#
#  Вторая проверка важнее первой. Список запрещённых имён закрывает то, что
#  мы предвидели; сверка с реальными значениями ловит ключ, утёкший туда,
#  куда никто не смотрел, — в чужой конфиг, в кэш, в забытый черновик.
#  Сами значения при этом никуда не печатаются: в отчёт идёт только имя
#  переменной и файл, где нашлось совпадение.
#
#  Если сработала любая проверка — папка удаляется, код возврата 1.
#  Ничего никуда не выкладывается: на выходе просто папка (и, по флагу,
#  zip рядом с ней). Что с ней делать дальше — решает владелец.
#
#      powershell -ExecutionPolicy Bypass -File setup\dist_pack.ps1
#      ... -OutDir D:\share -Zip
# =====================================================================
[CmdletBinding()]
param(
    [string]$OutDir = '',
    [switch]$Zip
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch { }

$Root = Split-Path -Parent $PSScriptRoot
if ($OutDir -eq '') { $OutDir = Join-Path ([IO.Path]::GetTempPath()) 'kontent-fabrika-dist' }
$Dist = Join-Path $OutDir 'kontent-fabrika'

function Say  ($m) { Write-Host $m }
function Ok   ($m) { Write-Host "  [OK]   $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  [~]    $m" -ForegroundColor Yellow }
function Bad  ($m) { Write-Host "  [X]    $m" -ForegroundColor Red }
function Step ($m) { Write-Host ''; Write-Host "== $m" -ForegroundColor Cyan }

# ---------------------------------------------------------------------
# Что кладём. Только поимённо: белый список безопаснее чёрного — забытый
# чёрный пункт означает утечку, забытый белый — всего лишь недостающий файл.
# ---------------------------------------------------------------------
$RootFiles = @(
    # ядро конвейера
    'core.py', 'render.py', 'overlays.py', 'webapp.py', 'channels.py',
    'gen_scenes.py', 'night_plan.py', 'autopilot.py', 'veo_client.py',
    'yt_research.py', 'sfx_library.py', 'quality.py', 'gen_remotion_gemini.py',
    # Модули, которые webapp.py импортирует, а список забывал. Импорты там
    # обёрнуты в try/except, поэтому пропажа не роняла приложение — она молча
    # выключала возможность:
    #   variant_factory — механический рост библиотеки плашек под канал. Без
    #     него у покупателя не появляется НИ ОДНОЙ своей плашки: накопленная
    #     библиотека привязана к каналам автора (overlays._library_variants
    #     сверяет метку канала строго), и новому каналу достаются только
    #     встроенные виды из Overlay.tsx. В журнале это одна строка warn
    #     «Планку видов канала выставить не удалось: No module named ...».
    #   yt_stats — подбор темы по СВОЕЙ статистике канала.
    #   demo — демо-режим (надпись на кадре и лимит роликов). В платной копии
    #     он молчит, потому что рядом нет demo.json; но без самого файла
    #     демо-раздача получалась ПОЛНОЙ версией без единого ограничения.
    'variant_factory.py', 'yt_stats.py', 'demo.py',
    # вспомогательное и CLI
    'pipeline.py', 'make_video.py', 'is_busy.py', 'add_lottie.py',
    'fill_variants.py', 'register_new_variants.py',
    # установка и документация
    'requirements.txt', '.env.example', 'README.md', '.gitignore',
    'Запустить.bat'
)

# Папка -> маски, которые внутри неё НЕ берём.
$Dirs = @(
    # setup\Output — готовый .exe установщика. Его туда кладёт компилятор Inno
    # ПОСЛЕ первой сборки, поэтому раньше маска и не требовалась. Теперь файл
    # там лежит, и без пропуска каждая новая раздача несла внутри себя
    # предыдущий установщик: замер — 3.5 МБ превратились в 6.6 МБ, и покупатель
    # находил в папке программы .exe, который незачем запускать.
    # Из setup\ покупателю нужен ровно setup.ps1 — мастер первого запуска, на
    # который смотрит Запустить.bat. Остальное здесь — инструменты ВЛАДЕЛЬЦА:
    #   Output       — готовый .exe установщика (его туда кладёт Inno после
    #                  первой сборки; без пропуска каждая новая раздача несла
    #                  внутри предыдущий установщик — замер: 3.5 МБ -> 6.6 МБ);
    #   dist_pack.ps1 — этот файл: покупателю нечего пересобирать, а в его
    #                  комментариях и в списке $OwnerBusinessWords поимённо
    #                  перечислены каналы владельца (20 упоминаний — второе
    #                  место по файлу во всей раздаче);
    #   installer.iss — рецепт сборки установщика, тоже не его забота;
    #   build_installers.ps1 — тот же рецепт целиком, включая порядок шагов и
    #                  путь к компилятору. Замер 2026-08-11: без этой маски он
    #                  уехал в раздачу первым же прогоном, 10 КБ описания того,
    #                  как собрать вторую копию продукта, — в руки покупателю.
    #   *.log        — журналы сборки, которые build_installers.ps1 кладёт
    #                  в setup\Output\; они и так под маской Output, но если
    #                  журнал однажды ляжет рядом со скриптом, маска нужна.
    @{ Src='setup';       Skip=@('Output', 'dist_pack.ps1', 'installer.iss',
                                 'build_installers.ps1', '*.log') },
    @{ Src='ui';          Skip=@('_old_dark') },
    # Remotion: только исходники. node_modules ставится на месте (npm ci),
    # build и public\ovl_* — мусор от прошлых рендеров.
    @{ Src='remotion';    Skip=@('node_modules', 'build', 'tmp*', 'ovl_*') },
    @{ Src='hyperframes'; Skip=@('renders', '.hyperframes', 'hf_*', 'node_modules') }
)

# ---------------------------------------------------------------------
# Что не должно оказаться в раздаче ни при каких условиях.
# ---------------------------------------------------------------------
$ForbiddenNames = @(
    '.env', '.env.bak', 'settings.json', 'used_media.json', 'app.log',
    'app.log.old', 'veononstop_support.txt', 'autopilot_report.txt',
    'variant_failures.json', 'channels.json', 'scenes.json',
    'scenes_audit.json',
    # Резервная копия рабочих профилей. Имя другое, содержимое то же самое —
    # каналы владельца целиком. Появилась 2026-08-09 рядом с channels.json,
    # то есть ровно там, откуда белый список берёт корневые файлы.
    'channels.json.bak_before_einsturzpunkt',
    # Счётчик картинок Veo за сутки. Не секрет, но это расход ВЛАДЕЛЬЦА:
    # покупателю он достанется уже наполовину исчерпанным.
    '.veo_image_usage.json',
    # Библиотека плашек. Раньше уезжала покупателю — и зря, по двум причинам.
    #
    # 1. Она ему не достаётся. overlays._library_variants сверяет метку канала
    #    СТРОГО (rec.channel == channel), а все 577 записей помечены каналами
    #    владельца: abyss 145, home-vault 144, estoico-es 144, проба-es 144.
    #    Канал покупателя не совпадает ни с одной, и файл на 300 КБ работает
    #    ровно как его отсутствие.
    # 2. Зато он уносит имена всех четырёх каналов владельца — 577 раз — и
    #    поле theme у 48 записей, то есть словами описанный дизайн-язык
    #    накопленной библиотеки.
    #
    # Пустой библиотеки у покупателя при этом не возникает. webapp.py на каждой
    # сборке зовёт variant_factory.ensure(канал): тот механически, без ИИ и без
    # единого платного вызова, заводит 8 видов на каждый из 18 типов — 144
    # своих записи в палитре ПОКУПАТЕЛЯ — и сам пишет ch_<палитра>.tsx. Именно
    # так и получены библиотеки home-vault/estoico-es/проба-es: у каждой 144
    # записи поверх ОДНОГО файла. Условие одно — у канала должна быть выставлена
    # palette (в channels.example.json она есть).
    #
    # Переклеить метки на 'my-channel' вместо удаления — хуже: сработало бы
    # только при точном совпадении id канала, а записи ch_* поверх заново
    # сгенерированного ch_<палитра>.tsx дают ровно ту рассинхронизацию реестра,
    # которая описана в variant_factory.ensure (реестр ссылался на ChCalm09..16,
    # в файле было 01..08) — и роняет `tsc --noEmit` по всему проекту, а с ним
    # проверку ИИ-схем: замер 2026-08-08, 49 схем подряд ушли в брак.
    'variants.json',
    # Метка демо-режима. Сама по себе не секрет, но попади она в платную
    # раздачу — покупатель получит три ролика с надписью «ДЕМО» поперёк кадра
    # и упрётся в лимит. Демо-копия заводит этот файл руками, после сборки.
    'demo.json'
)
$ForbiddenDirs = @(
    '.secrets', '.venv', '.git', '.claude', 'assets', 'music_library',
    '.niche_cache', '__pycache__', 'node_modules', '.ruff_cache', '.vscode',
    # Папки каналов — готовые ролики, кадры, обложки, meta.json с темами.
    # Списком копируются только setup/ui/remotion/hyperframes, поэтому попасть
    # сюда им неоткуда; список держим как страховку на случай, если белый
    # список когда-нибудь расширят. Раньше здесь были только три первых — а
    # рабочих папок каналов на машине пять. С 2026-08-09 их шесть:
    # einsturzpunkt завёлся после прошлой сборки установщика, и в списке его
    # не было — то есть страховка молча перестала страховать.
    'abyss', 'home-vault', 'estoico-es', 'einsturzpunkt',
    'проба_es', 'проба_минута',
    # Личное и рабочее, не имеющее отношения к продукту. brand\ — это те же
    # «брендинг», только латиницей: папку завели заново 2026-08-09, старое имя
    # осталось в списке и новое не закрывало.
    'брендинг', 'brand', 'analytics', 'subs2', 'project_veo_test', 'dist',
    '_архив_из_корней', '_битые_схемы', '_проверка_обложек'
)

# Данные владельца, которые не являются секретом, но являются его бизнесом:
# имена каналов, ниши, каналы-образцы из разбора конкурентов. Проверка ниже
# только ПРЕДУПРЕЖДАЕТ и ничего не удаляет — эти слова рассыпаны по
# комментариям core.py/render.py/overlays.py как инженерные обоснования
# («замер по abyss/2026-08-05»), вырезать их механически нельзя, не выкинув
# заодно объяснения, зачем код устроен именно так. Решение — за владельцем;
# дело скрипта в том, чтобы он видел цифру перед каждой раздачей.
$OwnerBusinessWords = @(
    'abyss', 'home-vault', 'estoico-es', 'einsturzpunkt', 'проба-es',
    'проба_es', 'Pensamiento Estoico', 'Fascinating Horror'
)

Say ''
Say '+---------------------------------------------+'
Say '|      Сборка раздаваемой копии                |'
Say '+---------------------------------------------+'

# ---------------------------------------------------------------------
# 1. Чистое место
# ---------------------------------------------------------------------
Step 'Готовлю папку'
if (Test-Path $Dist) { Remove-Item $Dist -Recurse -Force }
New-Item -ItemType Directory -Path $Dist -Force | Out-Null
Ok $Dist

# ---------------------------------------------------------------------
# 2. Копирование
# ---------------------------------------------------------------------
Step 'Копирую файлы'
$missing = @()
foreach ($f in $RootFiles) {
    $src = Join-Path $Root $f
    if (Test-Path $src) {
        Copy-Item $src (Join-Path $Dist $f) -Force
    } else {
        $missing += $f
    }
}
if ($missing.Count -gt 0) { Warn "Нет в проекте (пропущено): $($missing -join ', ')" }
Ok "Файлов в корне: $($RootFiles.Count - $missing.Count)"

foreach ($d in $Dirs) {
    $src = Join-Path $Root $d.Src
    if (-not (Test-Path $src)) { Warn "Папки нет: $($d.Src)"; continue }
    $dst = Join-Path $Dist $d.Src
    New-Item -ItemType Directory -Path $dst -Force | Out-Null

    Get-ChildItem $src -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($src.Length).TrimStart('\')
        $parts = $rel.Split('\')

        # отсечь по маскам этой папки
        $skip = $false
        foreach ($m in $d.Skip) {
            foreach ($p in $parts) { if ($p -like $m) { $skip = $true } }
        }
        # и по общим запрещённым папкам/именам
        foreach ($p in $parts[0..($parts.Count - 2)]) {
            if ($ForbiddenDirs -contains $p) { $skip = $true }
        }
        if ($_.Name -like '*.pyc') { $skip = $true }

        if (-not $skip) {
            $target = Join-Path $dst $rel
            $tdir = Split-Path $target -Parent
            if (-not (Test-Path $tdir)) { New-Item -ItemType Directory -Path $tdir -Force | Out-Null }
            Copy-Item $_.FullName $target -Force
        }
    }
    $n = @(Get-ChildItem $dst -Recurse -File).Count
    Ok "$($d.Src)\  — файлов: $n"
}

# Пример профиля канала вместо настоящего channels.json: там темы, счётчики
# серий и заметки про конкурентов — это рабочие данные владельца, не софт.
#
# palette здесь появилась не для полноты. Это единственное поле, которого НЕТ
# в форме канала (проверено поиском по ui\): задать его можно только правкой
# JSON. А по нему разведены склейки и движение кадра (render.PALETTES), воздух
# кадра (core.ATMOSPHERE), звук (core.SOUND_PALETTES) и почерк плашек
# (remotion/src/variants/_look.ts). Без него канал покупателя идёт общим пулом
# с общими весами — ровно то, на что владелец жаловался словами «монтаж трёх
# каналов очень похож». Пустой пример этому не учил никак.
$example = @'
[
  {
    "id": "my-channel",
    "name": "Мой канал",
    "lang": "английский",
    "tone": "документальный",
    "minutes": 10,
    "palette": "harsh",
    "accent": "#b83a2b",
    "visual_style": "кинематографичный",
    "ai_ratio": 0.5,
    "voice": "",
    "sub_style": "bold_box",
    "topic_formula": "Опиши здесь, о чём канал: язык, тема, формат выпуска.",
    "script_extra": "Кто ведёт рассказ и каким голосом — это делает каналы разными по содержанию.",
    "avoid": "Что на канале не показываем и не рассказываем.",
    "used_topics": []
  }
]
'@
# БЕЗ BOM. Set-Content -Encoding UTF8 в Windows PowerShell 5.1 дописывает в
# начало файла три байта EF BB BF, и json.loads в channels.py отвечал на них
# «Unexpected UTF-8 BOM ... (char 0)». Покупатель делал ровно то, что велит
# README — копировал этот файл в channels.json — и получал ноль каналов в
# окне и отказ завести канал через интерфейс. Читатель теперь терпит BOM
# (channels.py, utf-8-sig), но и писать его незачем.
[IO.File]::WriteAllText((Join-Path $Dist 'channels.example.json'),
                        $example, (New-Object Text.UTF8Encoding $false))
Ok 'channels.example.json (шаблон вместо рабочих профилей)'

# ---------------------------------------------------------------------
# 3. Проверка по именам
# ---------------------------------------------------------------------
Step 'Проверка 1: запрещённые имена'
$hits = @()
Get-ChildItem $Dist -Recurse -Force | ForEach-Object {
    if ($_.PSIsContainer) {
        if ($ForbiddenDirs -contains $_.Name) { $hits += $_.FullName }
    } else {
        if ($ForbiddenNames -contains $_.Name) { $hits += $_.FullName }
    }
}
if ($hits.Count -gt 0) {
    foreach ($h in $hits) { Bad $h }
    Remove-Item $Dist -Recurse -Force
    Bad 'Найдено запрещённое. Папка удалена.'
    exit 1
}
Ok 'Ничего запрещённого по именам'

# ---------------------------------------------------------------------
# 4. Проверка по содержимому — сверка с реальными секретами этой машины
# ---------------------------------------------------------------------
Step 'Проверка 2: настоящие ключи в собранных файлах'

# Собираем значения из .env и settings.json. Держим только в памяти.
#
# Сверяем не всё подряд: в .env рядом с ключами лежат имена моделей
# (GEMINI_TEXT_MODEL=gemini-2.5-flash) и адреса (VEO_BASE_URL). Они по
# определению встречаются в коде, и без фильтра проверка ругалась на
# core.py при каждом запуске — то есть быстро стала бы шумом, который
# приучаются пролистывать. Берём только имена, которые обещают секрет.
$secretish    = '(KEY|SECRET|TOKEN|CLIENT_ID|PASSWORD)'
$notSecretish = '(MODEL|URL|_DIR|VOICE|ENGINE|REGION|WORKERS|RATIO)'
function Is-SecretName ($n) {
    $u = $n.ToUpper()
    if ($u -notmatch $secretish) { return $false }
    if ($u -match $notSecretish) { return $false }
    return $true
}

$secrets = @{}
$envReal = Join-Path $Root '.env'
if (Test-Path $envReal) {
    foreach ($line in (Get-Content $envReal -Encoding UTF8)) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$') {
            $n = $Matches[1]; $v = $Matches[2].Trim().Trim('"').Trim("'")
            # короткие и служебные значения (0/1/имена моделей) не ищем:
            # они дают ложные срабатывания на обычном коде
            if ($v.Length -ge 12 -and $v -notmatch 'your_.*_here' -and (Is-SecretName $n)) {
                $secrets[$n] = $v
            }
        }
    }
}
$setReal = Join-Path $Root 'settings.json'
if (Test-Path $setReal) {
    try {
        $sj = Get-Content $setReal -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($prop in $sj.PSObject.Properties) {
            if (($prop.Value -is [string]) -and (Is-SecretName $prop.Name)) {
                # в settings.json ключи лежат пачкой через перевод строки
                $i = 0
                foreach ($piece in ($prop.Value -split '\s+')) {
                    $p = $piece.Trim()
                    if ($p.Length -ge 12) {
                        $secrets["settings.$($prop.Name)[$i]"] = $p
                        $i++
                    }
                }
            }
        }
    } catch { Warn 'settings.json не разобрался как JSON — пропускаю' }
}

Say "  Значений для сверки: $($secrets.Count)"
if ($secrets.Count -eq 0) { Warn 'Секретов не нашлось — сверять не с чем (проверь вручную).' }

$leaks = @()
$files = Get-ChildItem $Dist -Recurse -File -Force
foreach ($f in $files) {
    # бинарники пропускаем: ключ в .ico/.png искать смысла нет
    if ($f.Extension -in @('.ico', '.png', '.jpg', '.jpeg', '.mp4', '.wav', '.mp3', '.woff', '.woff2', '.ttf')) { continue }
    $content = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
    if ($null -eq $content) { continue }
    foreach ($name in $secrets.Keys) {
        if ($content.Contains($secrets[$name])) {
            # печатаем ИМЯ переменной и файл — но не значение
            $leaks += "$($f.FullName)  <- значение из $name"
        }
    }
}
if ($leaks.Count -gt 0) {
    foreach ($l in $leaks) { Bad $l }
    Remove-Item $Dist -Recurse -Force
    Bad 'В сборке найдены настоящие ключи. Папка удалена.'
    exit 1
}
Ok 'Ни одного настоящего ключа в сборке'

# Дополнительно — поиск по форме ключа, на случай чужого секрета,
# которого нет ни в .env, ни в settings.json этой машины.
Step 'Проверка 3: строки, похожие на ключи'
$patterns = @(
    'AIza[0-9A-Za-z_\-]{30,}',
    'AKIA[0-9A-Z]{16}',
    'sk-[A-Za-z0-9]{20,}',
    '\b[0-9]{8}-[0-9a-f]{25,}\b'
)
$shaped = @()
foreach ($f in $files) {
    if ($f.Extension -in @('.ico', '.png', '.jpg', '.jpeg', '.mp4', '.wav', '.mp3', '.woff', '.woff2', '.ttf')) { continue }
    $content = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
    if ($null -eq $content) { continue }
    foreach ($p in $patterns) {
        if ($content -match $p) { $shaped += "$($f.FullName)  (шаблон: $p)" }
    }
}
if ($shaped.Count -gt 0) {
    foreach ($s in $shaped) { Bad $s }
    Warn 'Похоже на ключ. Разберись вручную, прежде чем раздавать.'
    Remove-Item $Dist -Recurse -Force
    exit 1
}
Ok 'Строк, похожих на ключи, нет'

# ---------------------------------------------------------------------
# 4б. Данные владельца, которые не ключи
#
# Ключи мы ловим и валим сборку. Здесь другое: имена каналов, ниши и
# каналы-образцы. Утечки безопасности в них нет, поэтому сборка НЕ падает —
# но владелец должен видеть, сколько его бизнеса уезжает вместе с софтом, и
# решать сам. Печатаем файлы и число попаданий, без строк целиком.
# ---------------------------------------------------------------------
Step 'Проверка 4: данные владельца (имена каналов, ниши, конкуренты)'
$bizHits = @()
foreach ($f in $files) {
    if ($f.Extension -in @('.ico', '.png', '.jpg', '.jpeg', '.mp4', '.wav', '.mp3', '.woff', '.woff2', '.ttf')) { continue }
    $content = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
    if ($null -eq $content) { continue }
    $n = 0
    $whichWords = @()
    foreach ($w in $OwnerBusinessWords) {
        $c = ([regex]::Matches($content, [regex]::Escape($w), 'IgnoreCase')).Count
        if ($c -gt 0) { $n += $c; $whichWords += $w }
    }
    if ($n -gt 0) {
        $rel = $f.FullName.Substring($Dist.Length).TrimStart('\')
        $bizHits += [PSCustomObject]@{ File = $rel; Count = $n; Words = ($whichWords -join ', ') }
    }
}
if ($bizHits.Count -gt 0) {
    $totalBiz = ($bizHits | Measure-Object -Property Count -Sum).Sum
    Warn "Упоминаний в $($bizHits.Count) файлах, всего ${totalBiz}:"
    foreach ($h in ($bizHits | Sort-Object Count -Descending)) {
        Say ("    {0,4}  {1}  [{2}]" -f $h.Count, $h.File, $h.Words)
    }
    Say ''
    Warn 'Это не ключи — сборку не останавливаю. Но вместе с софтом уезжают'
    Warn 'имена каналов и ниши: в основном инженерные комментарии вида'
    Warn '«замер по abyss/2026-08-05». Решай сам, приемлемо ли это.'
} else {
    Ok 'Имён каналов и ниш в сборке не нашлось'
}

# ---------------------------------------------------------------------
# 5. Полный список того, что уедет
# ---------------------------------------------------------------------
Step 'Что попадёт в раздачу'
$all = Get-ChildItem $Dist -Recurse -File -Force | Sort-Object FullName
foreach ($f in $all) {
    $rel = $f.FullName.Substring($Dist.Length).TrimStart('\')
    $kb = [Math]::Round($f.Length / 1KB, 1)
    Say ("    {0,10} КБ  {1}" -f $kb, $rel)
}
$total = ($all | Measure-Object -Property Length -Sum).Sum
Say ''
Ok ("Всего файлов: {0}, объём: {1} МБ" -f $all.Count, [Math]::Round($total / 1MB, 1))

if ($Zip) {
    Step 'Упаковываю в zip'
    $zipPath = Join-Path $OutDir 'kontent-fabrika.zip'
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path $Dist -DestinationPath $zipPath
    Ok $zipPath
}

Say ''
Ok 'Готово. Ничего никуда не отправлено — раздачей занимается владелец.'
exit 0
