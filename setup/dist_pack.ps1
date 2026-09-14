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
    # disk.py — ГОЛЫЙ импорт в webapp.py (строка 38, рядом с core и render) и
    # в autopilot.py. Не try/except: без файла приложение падает на импорте и
    # НЕ ЗАПУСКАЕТСЯ ВООБЩЕ — ModuleNotFoundError у каждого покупателя на
    # первом же старте. Сам модуль убирает диск, чтобы ночной прогон не умер
    # от нехватки места.
    # priemka.py — приёмка готового ролика замером (webapp.py:4023, обёрнут в
    # try, поэтому пропажа не роняет запуск, а молча выключает проверку).
    'disk.py', 'priemka.py',
    # mediakit.py — «Набор материала»: вкладка отдаёт человеку папку с
    # найденным и сгенерированным материалом под ручной монтаж. webapp.py
    # импортирует его ВНУТРИ метода, поэтому без файла приложение
    # запускается, а кнопка молча падает в журнал.
    'mediakit.py',
    # google_veo.py — ВТОРОЙ поставщик генерации: официальный Gemini API
    # вместо посредника VeoNonStop. veo_client переключается на него
    # переменной среды VEO_PROVIDER=google и тянет модуль ЛЕНИВО, внутри
    # veo_client._google() (строка 31), — поэтому список его и не заметил:
    # приложение стартует, вкладки открываются, а первый же вызов генерации
    # при VEO_PROVIDER=google падает с ModuleNotFoundError.
    # Цена пропажи выросла 24.08.2026: подписка VeoNonStop истекла (сервис
    # отвечает 401 «API key has expired»), и путь через собственный ключ
    # Google — единственный, которым покупатель может включить Veo вообще.
    # Сверено обходом импортов от всех точек входа раздачи: это был
    # ЕДИНСТВЕННЫЙ свой модуль, достижимый по импортам и отсутствующий здесь.
    'google_veo.py',
    # Лицензия. webapp.main() зовёт license_gate ПЕРВОЙ строкой и без него
    # падает на импорте — то есть забытый здесь файл роняет не возможность,
    # а весь запуск. license_verify держит формат бессрочного ключа и его
    # проверку, license_pubkey.txt — публичный ключ, которым эта проверка
    # сходится. Публичный уезжать обязан; секретный (licensing\owner_key.pem)
    # не уезжает никогда — папки licensing нет в $Dirs, и она же перечислена
    # в $ForbiddenDirs страховкой.
    'license_client.py', 'license_gate.py', 'license_verify.py',
    'license_pubkey.txt',
    # вспомогательное и CLI
    'pipeline.py', 'make_video.py', 'is_busy.py', 'add_lottie.py',
    'fill_variants.py', 'register_new_variants.py',
    # установка и документация
    'requirements.txt', '.env.example', 'README.md', '.gitignore',
    'Запустить.bat',
    # Пусковой файл: на него смотрит ярлык из установщика. launcher.py —
    # его исходник, кладём рядом, чтобы покупатель мог убедиться, что .exe
    # не делает ничего сверх запуска мастера и приложения.
    'КонтентФабрика.exe', 'launcher.py',
    # Юридическое. LICENSE.txt отвечает на вопрос «что я купил», а
    # THIRD-PARTY-NOTICES.txt закрывает обязательства перед чужими
    # лицензиями — у ffmpeg (LGPL/GPL) это прямое требование, а про
    # платную лицензию Remotion для компаний покупателя надо
    # предупредить до того, как он ею воспользуется, а не после.
    'LICENSE.txt', 'THIRD-PARTY-NOTICES.txt'
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
    @{ Src='hyperframes'; Skip=@('renders', '.hyperframes', 'hf_*', 'node_modules', 'build') }
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
    # Лицензия ВЛАДЕЛЬЦА и его же машины. Попасть в раздачу им неоткуда —
    # в белом списке их нет, — но цена ошибки здесь особенная: owner_key.pem
    # это секретный ключ подписи, и с ним покупатель выпишет себе и другим
    # сколько угодно бессрочных лицензий, а отозвать их будет нечем.
    'owner_key.pem', 'license.json', '.license_cache.json', '.pack_version',
    # Метка демо-режима. Сама по себе не секрет, но попади она в платную
    # раздачу — покупатель получит три ролика с надписью «ДЕМО» поперёк кадра
    # и упрётся в лимит. Демо-копия заводит этот файл руками, после сборки.
    'demo.json'
)
$ForbiddenDirs = @(
    # licensing\ — серверная половина: сервер лицензий, база проданных ключей
    # с контактами и суммами, собранные паки и секретный ключ подписи. В $Dirs
    # её нет, значит попасть в раздачу неоткуда; список — страховка на случай,
    # если белый список когда-нибудь расширят не глядя.
    'licensing', 'issued', 'packs',
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
    # Сверка со списком папок в корне, 30.08.2026: этих шести здесь не было,
    # а лежат они рядом с теми, что перечислены. channel\ — новое место готовых
    # роликов (внутри channel\2026-08-18\), shorts_proba и fisura-critica —
    # каналы владельца (fisura-critica уже была в $OwnerRenames, но не тут),
    # ai_studio\ — выгрузки из AI Studio с промптами, test_bez_veo\ и Наборы\ —
    # рабочие прогоны. Страховка, которую четыре раза подряд чинили задним
    # числом, снова отстала от диска — теперь сверено списком, а не памятью.
    'channel', 'shorts_proba', 'fisura-critica',
    'ai_studio', 'test_bez_veo', 'Наборы',
    # Личное и рабочее, не имеющее отношения к продукту. brand\ — это те же
    # «брендинг», только латиницей: папку завели заново 2026-08-09, старое имя
    # осталось в списке и новое не закрывало.
    'брендинг', 'brand', 'analytics', 'subs2', 'project_veo_test', 'dist',
    '_архив_из_корней', '_битые_схемы', '_проверка_обложек'
)

# ---------------------------------------------------------------------
# Данные владельца, которые не являются секретом, но являются его бизнесом:
# имена каналов, ниши, каналы-образцы из разбора конкурентов.
#
# ДВА СПИСКА ЖИЛИ ПОРОЗНЬ, И ИМЕННО ЭТО УБИЛО ПРОВЕРКУ 4.
# Раньше здесь был отдельный $OwnerBusinessWords, а $OwnerRenames — на 200
# строк ниже, у шага обезличивания. Слова в них совпадали почти дословно, а
# порядок шагов такой: сначала обезличивание (abyss -> «канал А»), потом
# проверка. То есть проверка искала ровно то, что сама же сборка за пять
# шагов до этого стёрла, и печатала «Имён каналов и ниш в сборке не нашлось»
# при любом содержимом раздачи. Предупреждение, ради которого её писали, не
# могло сработать никогда.
#
# Теперь наоборот: список слов для проверки СОБИРАЕТСЯ ИЗ ТАБЛИЦЫ ЗАМЕН плюс
# то, что заменять нельзя. Разъехаться им больше негде, а проверка стала
# осмысленной: она считает упоминания ДО обезличивания и ПОСЛЕ него и ругается
# на остаток. Остаток бывает настоящий — обезличивание работает по границе
# слова (\b) и в текстовых файлах, поэтому мимо него проходят формы вроде
# shorts_proba_2026 (подчёркивание — символ слова, границы нет), имена внутри
# .exe и файлы из $RenameSkip.
# ---------------------------------------------------------------------
$OwnerRenames = [ordered]@{
    'Philosophy Origins Español' = 'эталон ниши'
    'Philosophy Origins Espanol' = 'эталон ниши'
    'Fascinating Horror'         = 'эталон ниши'
    'Pensamiento Estoico'        = 'эталон ниши'
    'Elias Yoder'                = 'эталон ниши'
    'einsturzpunkt'              = 'канал Г'
    'fisura-critica'             = 'канал Д'
    'home-vault'                 = 'канал Б'
    'estoico-es'                 = 'канал В'
    'проба-es'                   = 'канал Е'
    'проба_es'                   = 'канал Е'
    'abyss'                      = 'канал А'
    # Седьмой канал владельца. В таблице замен его не было вовсе, поэтому имя
    # уезжало покупателю как есть — четыре инженерных комментария в core.py,
    # render.py и webapp.py («Замер на собранном shorts_proba/2026-08-14»).
    # Проверить, что это только комментарии, обязательно: заменить имя, которое
    # где-то является идентификатором в коде, значит сломать раздачу молча.
    'shorts_proba'               = 'канал Ж'
}

# Файлы, где слово встречается НЕ как имя канала. В сцене про провал
# abyss — английское «бездна» и часть имён переменных (abyssCut, abyssGrad,
# abyssWidth): замена сломала бы рендер, а скрывать там нечего.
$RenameSkip = @('spatial_hallucination.tsx')

# Слова, которые НЕ заменяются, но за которыми надо следить: ниши и каналы
# владельца в тех написаниях, где механическая замена сделает текст хуже.
# Сейчас пусто — всё, что нашлось, попало в таблицу замен выше. Список
# оставлен потому, что следующее такое слово придёт именно сюда.
$OwnerBusinessExtra = @('проба_минута')

$OwnerBusinessWords = @($OwnerRenames.Keys) + $OwnerBusinessExtra

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

# ---------------------------------------------------------------------
# Пусковой файл — не «пропущено», а стоп.
#
# КонтентФабрика.exe не отслеживается git (он в .gitignore, его собирает
# PyInstaller), поэтому в чистом чекауте его просто нет. А на него смотрят ОБА
# ярлыка из installer.iss ({group} и {autodesktop}) и постустановочный запуск.
# Раньше отсутствие exe попадало в общий $missing и печаталось жёлтым «Нет в
# проекте (пропущено)» — сборка шла дальше, установщик собирался, покупатель
# ставил программу и получал на рабочем столе ярлык, который не делает ничего.
# Такую поломку нельзя оставлять предупреждением: жёлтую строку в списке из
# сорока строк не замечают, а покупатель замечает сразу.
# ---------------------------------------------------------------------
$LauncherExe = 'КонтентФабрика.exe'
$exeDist = Join-Path $Dist $LauncherExe
$exeBad = ''
if ($missing -contains $LauncherExe) {
    $exeBad = 'его нет в корне проекта'
} elseif ((Get-Item $exeDist).Length -lt 100KB) {
    # PyInstaller кладёт ~10 МБ. Файл в сотню байт — это оборванная сборка
    # или заглушка, и ярлык на неё ведёт так же в никуда.
    $exeBad = ("он размером {0} байт — это не собранный exe" -f (Get-Item $exeDist).Length)
}
if ($exeBad -ne '') {
    Bad "Пусковой файл $LauncherExe : $exeBad."
    Bad 'На него смотрят оба ярлыка установщика — без него покупатель получит'
    Bad 'ярлык, который молча ничего не делает. Собери его и повтори:'
    Bad '    powershell -ExecutionPolicy Bypass -File setup\build_installer_exe.ps1'
    Remove-Item $Dist -Recurse -Force
    exit 1
}
Ok ("{0} на месте — {1:N1} МБ" -f $LauncherExe, ((Get-Item $exeDist).Length / 1MB))

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
# 2б. Проверка: собранная копия импортирует только то, что в ней есть
#
# ПОЧЕМУ ЭТО ОТДЕЛЬНЫЙ ШАГ, А НЕ ВНИМАТЕЛЬНОСТЬ ПРИ ПРАВКЕ СПИСКА.
# Белый список пополнялся четыре раза подряд одним и тем же способом: у
# покупателя молча отваливалась возможность, это замечали, файл дописывали.
# variant_factory, yt_stats, demo, disk, priemka, mediakit — каждый попал
# сюда ПОСЛЕ того, как его отсутствие стоило работы. Ловить это глазами
# нельзя: половина импортов в webapp.py и core.py лежит ВНУТРИ функций и
# внутри try/except, то есть не видна ни в шапке файла, ни при запуске.
#
# Проверка механическая: разбираем каждый .py в собранной папке, берём все
# его импорты (включая те, что внутри функций) и спрашиваем — если такой
# модуль есть в проекте, лежит ли он и в раздаче. Замер 24.08.2026 на этом
# самом списке: нашёлся google_veo.py (его лениво тянет veo_client._google
# при VEO_PROVIDER=google), больше ни одного.
#
# Смотрим только корень раздачи: свои модули лежат там, а в setup\, ui\,
# remotion\ и hyperframes\ питона либо нет вовсе, либо он ничего из проекта
# не импортирует (setup\installer_gui.py — только стандартная библиотека).
# ---------------------------------------------------------------------
Step 'Проверка: не потерялся ли свой модуль'

$PyExe = Join-Path $Root '.venv\Scripts\python.exe'
if (-not (Test-Path $PyExe)) {
    $pyCmd = Get-Command python -ErrorAction SilentlyContinue
    if ($pyCmd) { $PyExe = $pyCmd.Source } else { $PyExe = '' }
}

if ($PyExe -eq '') {
    Warn 'Python не найден — проверку импортов пропускаю. Сверь список вручную.'
} else {
    $checkerCode = @'
import ast, os, sys

root, dist = sys.argv[1], sys.argv[2]


def modules(folder):
    """Имена модулей, которые импортируются из этой папки: и файлы .py,
    и папки-пакеты с __init__.py."""
    out = set()
    for name in os.listdir(folder):
        p = os.path.join(folder, name)
        if name.endswith(".py"):
            out.add(name[:-3])
        elif os.path.isdir(p) and os.path.isfile(os.path.join(p, "__init__.py")):
            out.add(name)
    return out


root_mods = modules(root)
dist_mods = modules(dist)

missing = {}
checked = 0
for name in sorted(dist_mods):
    path = os.path.join(dist, name + ".py")
    if not os.path.isfile(path):
        continue
    checked += 1
    try:
        tree = ast.parse(open(path, encoding="utf-8", errors="replace").read())
    except SyntaxError as e:
        print("не разобрался: %s.py - %s" % (name, e))
        continue
    for node in ast.walk(tree):
        got = []
        if isinstance(node, ast.Import):
            got = [a.name.split(".")[0] for a in node.names]
        elif isinstance(node, ast.ImportFrom) and not node.level and node.module:
            got = [node.module.split(".")[0]]
        for g in got:
            # Чужие пакеты (requests, PIL) здесь не наша забота: их ставит
            # pip по requirements.txt. Ругаемся только на СВОЙ модуль -
            # тот, что лежит в проекте, но не доехал до раздачи.
            if g in root_mods and g not in dist_mods:
                missing.setdefault(g, set()).add("%s.py:%d" % (name, node.lineno))

for g in sorted(missing):
    print("НЕТ В РАЗДАЧЕ: %s.py - его импортируют: %s"
          % (g, ", ".join(sorted(missing[g]))))
print("разобрано файлов: %d, своих модулей в раздаче: %d" % (checked, len(dist_mods)))
sys.exit(1 if missing else 0)
'@
    $checker = Join-Path ([IO.Path]::GetTempPath()) 'kf_dist_imports.py'
    [IO.File]::WriteAllText($checker, $checkerCode, (New-Object Text.UTF8Encoding $false))
    # Без этого вывод с русскими буквами падает на UnicodeEncodeError в
    # консоли с кодовой страницей 866 — и проверка «ломается» на пустом месте.
    $env:PYTHONIOENCODING = 'utf-8'
    $checkOut = & $PyExe $checker $Root $Dist
    $checkRc = $LASTEXITCODE
    Remove-Item $checker -Force -ErrorAction SilentlyContinue
    foreach ($line in $checkOut) { Say "    $line" }
    if ($checkRc -ne 0) {
        Remove-Item $Dist -Recurse -Force
        Bad 'В раздаче не хватает своих модулей (список выше). Папка удалена.'
        Bad 'Допиши недостающее в $RootFiles и собери заново.'
        exit 1
    }
    Ok 'Все свои модули на месте'
}

# ---------------------------------------------------------------------
# 3. Проверка по именам
# ---------------------------------------------------------------------
# ---------------------------------------------------------------------
# Обезличивание: имена каналов и конкурентов
#
# Почему чистим ЗДЕСЬ, а не в исходниках. В коде эти имена стоят в
# инженерных комментариях как источник замера («темп -15% — замер по
# одиннадцати роликам einsturzpunkt»). Владельцу они нужны: без них
# непонятно, откуда взялось число и можно ли ему верить. Покупателю они не
# нужны вовсе, а вместе с ними уезжают ниши, конкуренты и — в
# Thumbnail.tsx — целиком разбор чужих каналов с медианами просмотров и
# названиями выстреливших роликов. Поэтому исходник остаётся как есть, а
# подменяется только раздаваемая копия.
#
# Замена идёт ПО ГРАНИЦЕ СЛОВА и только в текстовых файлах.
# ---------------------------------------------------------------------
Step 'Обезличиваю: имена каналов и конкурентов'

# Поиск слов владельца по собранной папке. Зовётся дважды — до обезличивания
# и после (проверка 4), — чтобы владелец видел не «нашлось/не нашлось», а две
# цифры: сколько было и сколько осталось. Ищем ПОДСТРОКОЙ, без \b: остаток
# после обезличивания — это как раз формы, до которых замена по границе слова
# не дотянулась (shorts_proba_2026, имя внутри .exe).
$ScanSkipExt = @('.ico', '.png', '.jpg', '.jpeg', '.mp4', '.wav', '.mp3',
                 '.woff', '.woff2', '.ttf', '.zip')
function Find-OwnerWords ($words) {
    $found = @()
    foreach ($f in (Get-ChildItem $Dist -Recurse -File -Force)) {
        if ($f.Extension -in $ScanSkipExt) { continue }
        # .exe читаем намеренно: обезличивание его не трогает (двоичный),
        # значит имя канала внутри пускового файла ловить больше нечем.
        $content = Get-Content $f.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
        if ($null -eq $content) { continue }
        $n = 0
        $which = @()
        foreach ($w in $words) {
            $c = ([regex]::Matches($content, [regex]::Escape($w), 'IgnoreCase')).Count
            if ($c -gt 0) { $n += $c; $which += $w }
        }
        if ($n -gt 0) {
            $found += [PSCustomObject]@{
                File  = $f.FullName.Substring($Dist.Length).TrimStart('\')
                Name  = $f.Name
                Count = $n
                Words = ($which -join ', ')
            }
        }
    }
    ,$found
}

$bizBefore = Find-OwnerWords $OwnerBusinessWords
$bizBeforeTotal = 0
if ($bizBefore.Count -gt 0) {
    $bizBeforeTotal = ($bizBefore | Measure-Object -Property Count -Sum).Sum
}
Say "  Упоминаний до обезличивания: $bizBeforeTotal в $($bizBefore.Count) файлах"

$renamedFiles = 0
$renamedHits = 0
foreach ($f in (Get-ChildItem $Dist -Recurse -File)) {
    # Двоичные — мимо. Сейчас совпадений в них нет (проверено на
    # КонтентФабрика.exe: ноль), но переписывать exe через Get-Content
    # нельзя в принципе: одно случайное совпадение слова внутри бинарника
    # превратило бы файл в мусор, и заметили бы это только у покупателя.
    if ($f.Extension -in @('.ico', '.png', '.jpg', '.jpeg', '.mp4', '.wav',
                           '.mp3', '.woff', '.woff2', '.ttf', '.zip',
                           '.exe', '.dll', '.pyd', '.so', '.bin', '.node')) { continue }
    if ($RenameSkip -contains $f.Name) { continue }
    # -Encoding UTF8 обязателен: Get-Content без него читает файл в кодировке
    # системы (CP1251), и переписанный файл получает вместо русских
    # комментариев «РџР РћРЁР›РћР“Рћ». Поймано на первой же сборке.
    $c = Get-Content $f.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
    if ($null -eq $c) { continue }
    $orig = $c
    $hits = 0
    foreach ($k in $OwnerRenames.Keys) {
        $pat = "\b" + [regex]::Escape($k) + "\b"
        $hits += ([regex]::Matches($c, $pat, 'IgnoreCase')).Count
        $c = [regex]::Replace($c, $pat, $OwnerRenames[$k], 'IgnoreCase')
    }
    # «в настройках стоял канал abyss» -> «канал канал А». Схлопываем:
    # покупатель читает эти комментарии, и заикание в них выглядит небрежно.
    $c = [regex]::Replace($c, 'канал\s+канал\s+([А-Е])', 'канал $1')
    if ($c -ne $orig) {
        # Пишем БЕЗ BOM: Set-Content -Encoding utf8 в Windows PowerShell 5.1
        # ставит метку в начало файла, а она ломает часть сборщиков JS.
        [IO.File]::WriteAllText($f.FullName, $c, (New-Object Text.UTF8Encoding($false)))
        $renamedFiles++
        $renamedHits += $hits
    }
}
if ($renamedFiles -gt 0) {
    Ok "Обезличено упоминаний: $renamedHits в $renamedFiles файлах"
} else {
    Ok 'Обезличивать нечего'
}

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
#
# Что здесь проверяется на самом деле: пережило ли имя канала обезличивание.
# Раньше проверка искала те же слова, которые обезличивание стирало пятью
# шагами раньше, — то есть отвечала «не нашлось» всегда. Теперь она сверяет
# две цифры (было / осталось) и ругается только на остаток. Ноль в остатке
# при ненулевом «было» — это доказательство, что обезличивание отработало,
# а не молчание пустой проверки.
# ---------------------------------------------------------------------
Step 'Проверка 4: данные владельца (имена каналов, ниши, конкуренты)'
$bizAfter = Find-OwnerWords $OwnerBusinessWords
$bizAfterTotal = 0
if ($bizAfter.Count -gt 0) {
    $bizAfterTotal = ($bizAfter | Measure-Object -Property Count -Sum).Sum
}
# Файлы из $RenameSkip обезличивание не трогает намеренно (там abyss —
# английское слово и часть имён переменных). Их остаток — не тревога,
# но показать его надо: иначе через год никто не вспомнит, почему цифры
# «было» и «осталось» не сходятся.
$bizAlarm = @($bizAfter | Where-Object { $RenameSkip -notcontains $_.Name })
$bizKnown = @($bizAfter | Where-Object { $RenameSkip -contains $_.Name })

Say "  Было до обезличивания: $bizBeforeTotal;  осталось: $bizAfterTotal"
if ($bizAlarm.Count -gt 0) {
    $alarmTotal = ($bizAlarm | Measure-Object -Property Count -Sum).Sum
    Warn "Имена каналов ПЕРЕЖИЛИ обезличивание: $alarmTotal в $($bizAlarm.Count) файлах:"
    foreach ($h in ($bizAlarm | Sort-Object Count -Descending)) {
        Say ("    {0,4}  {1}  [{2}]" -f $h.Count, $h.File, $h.Words)
    }
    Say ''
    Warn 'Это не ключи — сборку не останавливаю. Но покупателю уезжают имена'
    Warn 'каналов владельца. Причина всегда одна из трёх: слова нет в'
    Warn '$OwnerRenames; оно стоит в форме без границы слова (shorts_proba_2026);'
    Warn 'или файл двоичный и заменой не правится. Разберись до раздачи.'
} elseif ($bizBeforeTotal -gt 0) {
    Ok "Обезличивание отработало: было $bizBeforeTotal упоминаний, осталось 0"
} else {
    Warn 'В сборке НЕ НАШЛОСЬ ни одного имени канала даже ДО обезличивания.'
    Warn 'Так не бывает: этими словами подписаны замеры в комментариях core.py'
    Warn 'и render.py. Скорее всего, проверка ищет не то — сверь $OwnerRenames.'
}
if ($bizKnown.Count -gt 0) {
    foreach ($h in $bizKnown) {
        Say ("    осознанное исключение: {0,4}  {1}  [{2}]" -f $h.Count, $h.File, $h.Words)
    }
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
