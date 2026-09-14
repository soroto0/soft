# =====================================================================
#  Контент-фабрика — первый запуск и последующие.
#
#  Что делает:
#    1. проверяет Python, Node.js и FFmpeg (и подсказывает, как поставить);
#    2. создаёт своё окружение .venv и ставит туда зависимости;
#    3. ставит node_modules для Remotion (моушн-графика оверлеев);
#    4. создаёт .env из шаблона и спрашивает ключи по одному;
#    5. запускает приложение.
#
#  Повторный запуск проходит быстро: всё уже сделанное пропускается.
#  Полная перенастройка — «Запустить.bat -Reconfigure».
#
#  Писано под Windows PowerShell 5.1 (он есть на любой Windows из коробки),
#  поэтому здесь нет «&&», тернарника и «??» — они в 5.1 не парсятся.
# =====================================================================
[CmdletBinding()]
param(
    # Только настроить окружение, не открывать окно приложения.
    [switch]$SkipLaunch,
    # Пройти мастер ключей заново, даже если .env уже есть.
    [switch]$Reconfigure,
    # Не спрашивать ключи вообще (для автоматических проверок).
    [switch]$NonInteractive
)

$ErrorActionPreference = 'Stop'

# Корень проекта — на уровень выше папки setup\.
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

# Кириллица в консоли cmd.exe без этого превращается в кракозябры.
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch { }

$MinPython = [Version]'3.10'
$MinNode   = 18

# ---------------------------------------------------------------------
# Вывод
# ---------------------------------------------------------------------
function Say  ($m) { Write-Host $m }
function Ok   ($m) { Write-Host "  [OK]   $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  [~]    $m" -ForegroundColor Yellow }
function Bad  ($m) { Write-Host "  [X]    $m" -ForegroundColor Red }
function Step ($m) {
    Write-Host ''
    Write-Host "== $m" -ForegroundColor Cyan
}

function Fail ($m) {
    Write-Host ''
    Bad $m
    Write-Host ''
    exit 1
}

# Есть ли команда в PATH.
function Have ($name) {
    $c = Get-Command $name -ErrorAction SilentlyContinue
    return ($null -ne $c)
}

# Выполнить внешний .exe, чья stderr перенаправляется (в $null или в
# конвейер) и должна разбираться самим кодом ошибки, а не PowerShell.
#
# ПОЧЕМУ ЭТО НУЖНО. При глобальном $ErrorActionPreference = 'Stop' (см.
# верх файла) ЛЮБАЯ перенаправлённая строка stderr от native-команды —
# даже от команды, которая просто вернула ожидаемый ненулевой код, —
# PowerShell 5.1 превращает в завершающее исключение NativeCommandError
# раньше, чем управление дойдёт до `return ($LASTEXITCODE -eq 0)`.
# Поймано запуском: `& $VenvPy -m pip --version *> $null` на venv без pip
# (питон создаёт такой на некоторых сборках) не возвращал $false, а
# ронял весь setup.ps1 необработанной ошибкой — ровно в том сценарии,
# ради которого Test-VenvPip и написана. Тот же перенос `2>&1 | ...`
# держит и на шаге pip install: одна строка-предупреждение в stderr
# обрывала бы получасовую установку зависимостей вместо того, чтобы
# просто попасть в setup-install.log.
function Invoke-Quiet ([ScriptBlock]$Cmd) {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Cmd } finally { $ErrorActionPreference = $prevEap }
}

Say ''
Say '+---------------------------------------------+'
Say '|            КОНТЕНТ-ФАБРИКА                  |'
Say '|   сценарий -> озвучка -> монтаж -> ролик     |'
Say '+---------------------------------------------+'

# ---------------------------------------------------------------------
# 0. Не мешать идущей работе
#
# Приложение может прямо сейчас гнать ночной прогон. Установка зависимостей
# в это время переписывает файлы под работающим процессом — так можно
# оборвать генерацию на середине. Спрашиваем у самого проекта.
# ---------------------------------------------------------------------
$VenvPy  = Join-Path $Root '.venv\Scripts\python.exe'
$VenvPyw = Join-Path $Root '.venv\Scripts\pythonw.exe'

if ((Test-Path $VenvPy) -and (Test-Path (Join-Path $Root 'is_busy.py'))) {
    $busyOut = & $VenvPy (Join-Path $Root 'is_busy.py')
    if ($LASTEXITCODE -eq 1) {
        Step 'Приложение сейчас занято'
        Warn ($busyOut -join ' ')
        Warn 'Идёт задача. Установка сейчас может оборвать её на середине.'
        if ($NonInteractive) { Fail 'Прерываю: занято, а спрашивать нельзя (-NonInteractive).' }
        $a = Read-Host 'Всё равно продолжить? (напиши "да")'
        if ($a -ne 'да') { Say 'Отменено. Запусти снова, когда задача закончится.'; exit 0 }
    }
}

# ---------------------------------------------------------------------
# 1. Python
# ---------------------------------------------------------------------
Step 'Проверяю Python'

$PyLauncher = $null
if (Have 'py')     { $PyLauncher = 'py' }
elseif (Have 'python') { $PyLauncher = 'python' }

if (-not $PyLauncher) {
    Bad 'Python не найден.'
    Say ''
    Say '  Поставь Python 3.10 или новее одним из способов:'
    Say '    winget install Python.Python.3.12'
    Say '    либо скачай с https://www.python.org/downloads/'
    Say ''
    Say '  ВАЖНО: при установке отметь галочку "Add python.exe to PATH".'
    Say ''
    # Предложение поставить прямо сейчас — такое же, как для FFmpeg ниже.
    # Без него человек, купивший программу, упирается в инструкцию и должен
    # сам идти на сайт, выбирать версию и не забыть галочку про PATH. Это
    # самый частый способ потерять покупателя на первом же экране: у
    # владельца YouTube-канала никакого Python отродясь не стояло.
    if (-not $NonInteractive) {
        $a = Read-Host 'Поставить Python прямо сейчас через winget? (да/нет)'
        if ($a -eq 'да') {
            if (Have 'winget') {
                winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements
                # winget о неудаче (пакет не найден, нет сети, отказ в UAC)
                # сообщает только кодом возврата — сам процесс не бросает
                # исключение и ничего не пишет туда, откуда это было бы видно
                # само по себе. Без проверки человек читал бы «Готово» и после
                # провалившейся установки, перезапускал бы setup.ps1 и упирался
                # в тот же вопрос без объяснения, что в прошлый раз не вышло.
                if ($LASTEXITCODE -eq 0) {
                    Warn 'Готово. Закрой это окно и запусти снова — PATH обновляется только в новых окнах.'
                } else {
                    Warn "winget вернул ошибку (код $LASTEXITCODE) — похоже, установка не прошла. Поставь вручную по ссылке выше."
                }
            } else {
                Warn 'winget недоступен, поставь вручную по ссылке выше.'
            }
        }
    }
    Fail 'Без Python дальше нельзя.'
}

if ($PyLauncher -eq 'py') { $verRaw = & py -3 -c "import sys; print('%d.%d' % sys.version_info[:2])" }
else                      { $verRaw = & python -c "import sys; print('%d.%d' % sys.version_info[:2])" }

$pyVer = [Version]$verRaw
if ($pyVer -lt $MinPython) {
    Fail "Python $pyVer слишком старый, нужен $MinPython или новее."
}
Ok "Python $pyVer"

# ---------------------------------------------------------------------
# 2. FFmpeg — без него не будет ни склейки, ни звука
# ---------------------------------------------------------------------
Step 'Проверяю FFmpeg'

if (Have 'ffmpeg') {
    Ok 'FFmpeg на месте'
} else {
    Bad 'FFmpeg не найден — без него ролик не соберётся.'
    Say ''
    Say '    winget install Gyan.FFmpeg'
    Say '    либо https://ffmpeg.org/download.html и добавь папку bin в PATH'
    Say ''
    if (-not $NonInteractive) {
        $a = Read-Host 'Попробовать поставить через winget прямо сейчас? (да/нет)'
        if ($a -eq 'да') {
            if (Have 'winget') {
                winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements
                # Тот же случай, что и с Python выше: неудачу winget сообщает
                # только кодом возврата, и без проверки «После установки…»
                # печаталось бы и тогда, когда установки не случилось.
                if ($LASTEXITCODE -eq 0) {
                    Warn 'После установки закрой это окно и запусти заново — PATH обновляется только в новых окнах.'
                } else {
                    Warn "winget вернул ошибку (код $LASTEXITCODE) — похоже, установка не прошла. Поставь вручную по ссылке выше."
                }
            } else {
                Warn 'winget недоступен, поставь вручную по ссылке выше.'
            }
        }
    }
    Fail 'Поставь FFmpeg и запусти снова.'
}

# ---------------------------------------------------------------------
# 3. Node.js — нужен для Remotion (моушн-графика оверлеев)
#
# Не критичен: без Node оверлеи рисует встроенный Pillow. Качество ниже,
# но ролик собирается целиком. Поэтому здесь предупреждение, а не выход.
# ---------------------------------------------------------------------
Step 'Проверяю Node.js'

$HasNode = $false
if (Have 'node') {
    $nodeRaw = & node --version          # вида v24.18.0
    $nodeMajor = [int]($nodeRaw.TrimStart('v').Split('.')[0])
    if ($nodeMajor -ge $MinNode) {
        Ok "Node.js $nodeRaw"
        $HasNode = $true
    } else {
        Warn "Node.js $nodeRaw старее $MinNode — Remotion может не собраться."
    }
} else {
    Warn 'Node.js не найден.'
    Say '    Оверлеи будут рисоваться встроенным движком (проще, но менее эффектно).'
    Say '    Для кинокачества: winget install OpenJS.NodeJS.LTS'
}

# ---------------------------------------------------------------------
# 4. Своё окружение .venv
#
# Отдельное окружение, а не общесистемный pip: у проекта тяжёлые и
# капризные зависимости (torch тянет за собой пол-гигабайта), мешать их
# с системным Python — верный способ сломать что-то ещё.
# ---------------------------------------------------------------------
Step 'Готовлю окружение Python (.venv)'

$VenvDir = Join-Path $Root '.venv'

function New-Venv {
    if ($PyLauncher -eq 'py') { & py -3 -m venv $VenvDir }
    else                      { & python -m venv $VenvDir }
}

# Работает ли pip в окружении.
#
# ПОЧЕМУ ЭТОГО НЕ ХВАТАЛО РАНЬШЕ. Проверялось только наличие python.exe — а
# окружение, у которого не отработал ensurepip, выглядит совершенно готовым:
# папка есть, python.exe на месте. Падает оно на первой же команде pip
# («No module named pip»), и падает при КАЖДОМ следующем запуске, потому что
# ветка «создаю .venv» больше не срабатывает — папка-то есть. Человек
# оказывается в тупике, из которого нет выхода без ручного удаления папки.
# Поймано на первом запуске раздаваемой копии: Python 3.12 создал venv без
# pip. Так бывает на минимальных сборках и на версии из Microsoft Store.
function Test-VenvPip {
    if (-not (Test-Path $VenvPy)) { return $false }
    Invoke-Quiet { & $VenvPy -m pip --version *> $null }
    return ($LASTEXITCODE -eq 0)
}

if (-not (Test-Path $VenvPy)) {
    Say '  Создаю .venv (это разово, около минуты)...'
    New-Venv
    if (-not (Test-Path $VenvPy)) { Fail 'Не удалось создать .venv.' }
    Ok 'Окружение создано'
} else {
    Ok 'Окружение уже есть'
}

if (-not (Test-VenvPip)) {
    Warn 'В окружении нет pip — чиню.'
    Invoke-Quiet { & $VenvPy -m ensurepip --upgrade --default-pip *> $null }
    if (-not (Test-VenvPip)) {
        Warn 'Не помогло — пересоздаю окружение с нуля.'
        Remove-Item $VenvDir -Recurse -Force -ErrorAction SilentlyContinue
        New-Venv
    }
    if (-not (Test-VenvPip)) {
        Fail ('В окружении не работает pip, и починить его не удалось. Обычно ' +
              'это значит, что установленный Python собран без модуля ensurepip ' +
              '— так бывает у версии из Microsoft Store. Поставь Python с ' +
              'python.org, при установке отметь "Add python.exe to PATH", ' +
              'и запусти снова.')
    }
    Ok 'pip в окружении починен'
}

# Маркер: какой requirements.txt уже установлен. Пересобираем только если
# файл изменился — иначе каждый запуск ждал бы pip вхолостую.
$ReqFile   = Join-Path $Root 'requirements.txt'
$StampFile = Join-Path $Root '.venv\.requirements.sha'
$reqHash   = (Get-FileHash $ReqFile -Algorithm SHA256).Hash
$needInstall = $true
if (Test-Path $StampFile) {
    if ((Get-Content $StampFile -Raw).Trim() -eq $reqHash) { $needInstall = $false }
}

if ($needInstall) {
    # Раньше сюда лился сырой вывод pip: сотни строк «Collecting…»,
    # «Downloading… 2.1/2.5 GB», и человек пятнадцать минут смотрел на
    # поток, в котором не видно ни одного понятного шага. Первое, что он
    # видит после покупки, не должно выглядеть как консоль сборки.
    #
    # Поэтому вывод pip уходит в журнал, а на экран идёт полоса с именем
    # текущего пакета. Журнал остаётся на диске — если что-то упало,
    # разбираться всё равно нужно по нему.
    $pipLog = Join-Path $Root 'setup-install.log'
    $total  = @(Get-Content $ReqFile | Where-Object {
        $_.Trim() -and -not $_.Trim().StartsWith('#') }).Count

    Say '  Ставлю зависимости: около 2 ГБ, 5-15 минут.'
    Say '  Качается один раз — при следующих запусках окно не появится.'
    Say ''

    Invoke-Quiet {
        & $VenvPy -m pip install --upgrade pip --quiet --disable-pip-version-check 2>&1 |
            Out-File -FilePath $pipLog -Encoding utf8
    }

    $done = 0
    $current = ''
    Invoke-Quiet {
        & $VenvPy -m pip install -r $ReqFile --disable-pip-version-check 2>&1 | ForEach-Object {
            $line = $_.ToString()
            Add-Content -Path $pipLog -Value $line -Encoding utf8

            # «Collecting torch» / «Installing collected packages: a, b, c» —
            # единственные строки pip, по которым видно движение.
            if ($line -match '^\s*Collecting\s+([A-Za-z0-9._-]+)') {
                $current = $Matches[1]
                $done = [Math]::Min($done + 1, $total)
            } elseif ($line -match '^\s*Installing collected packages') {
                $current = 'записываю на диск'
                $done = $total
            } else {
                return
            }

            $pct = if ($total) { [int](100 * $done / $total) } else { 0 }
            Write-Progress -Activity 'Готовлю окружение' `
                           -Status "$current  ($done из $total)" -PercentComplete $pct
        }
    }
    $rc = $LASTEXITCODE
    Write-Progress -Activity 'Готовлю окружение' -Completed

    if ($rc -ne 0) {
        Fail "Не удалось поставить зависимости.`n  Подробности: $pipLog"
    }
    Set-Content -Path $StampFile -Value $reqHash -Encoding ascii
    Ok "Зависимости установлены (журнал: $pipLog)"
} else {
    Ok 'Зависимости уже на месте'
}

# ---------------------------------------------------------------------
# 5. Remotion
# ---------------------------------------------------------------------
if ($HasNode) {
    Step 'Готовлю Remotion (моушн-графика)'
    $RemDir = Join-Path $Root 'remotion'
    $RemMods = Join-Path $RemDir 'node_modules'
    if (-not (Test-Path $RemDir)) {
        # Папки может не быть при неполной распаковке архива. Это не повод
        # ронять установку: оверлеи умеют рисоваться встроенным движком.
        Warn 'Папка remotion\ не найдена — оверлеи пойдут через встроенный движок.'
    } elseif (Test-Path $RemMods) {
        Ok 'node_modules уже на месте'
    } else {
        Say '  Ставлю пакеты Remotion (разово, 3-10 минут, около 700 МБ)...'
        Push-Location $RemDir
        # npm ci строго по package-lock.json — воспроизводимо. Если lock
        # рассинхронизирован с package.json, ci падает; тогда npm install.
        & npm ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) {
            Warn 'npm ci не прошёл, пробую npm install...'
            & npm install --no-audit --no-fund
        }
        Pop-Location
        if (Test-Path $RemMods) {
            Ok 'Remotion готов'
        } else {
            Warn 'Remotion не установился — оверлеи пойдут через встроенный движок.'
        }
    }
}

# ---------------------------------------------------------------------
# 6. Ключи (.env)
# ---------------------------------------------------------------------
$EnvFile = Join-Path $Root '.env'
$EnvTpl  = Join-Path $Root '.env.example'

# Каталог ключей. Держится здесь, а не в коде приложения, чтобы мастер
# и README говорили об одном и том же. Уровни:
#   must     — без него ролик не сделать;
#   good     — сильно расширяет возможности;
#   optional — можно прожить без него.
# Уровни здесь обязаны совпадать с реестром core.KEY_SPECS: это тот же
# список для человека, только на другом языке. Разойдясь однажды, они уже
# соврали покупателю — платный VeoNonStop был подписан как нужный, а
# бесплатный Gemini как запасной. Меняешь тут — меняй и там.
$KeyCatalog = @(
    @{ Name='GEMINI_API_KEY';   Level='must';
       Title='Google Gemini — тексты: сценарий, разбивка на сцены, SEO';
       Where='https://aistudio.google.com/apikey  (бесплатно)';
       Without='Без него (и без Agnes) текст писать нечем — конвейер не стартует.' },

    @{ Name='PEXELS_API_KEY';   Level='must';
       Title='Pexels — бесплатные фото и видео для сцен';
       Where='https://www.pexels.com/api/  (бесплатно)';
       Without='Без стоков и без ИИ-видео сцены заполнить нечем.' },

    @{ Name='PIXABAY_API_KEY';  Level='good';
       Title='Pixabay — второй сток, больше выбора и меньше повторов';
       Where='https://pixabay.com/api/docs/  (бесплатно)';
       Without='Работает и без него, но материал однообразнее.' },

    @{ Name='VEO_API_KEY';      Level='optional';
       Title='VeoNonStop — ИИ-видео (Veo) и ИИ-картинки';
       Where='https://veononstop.org  (платно, по подписке)';
       Without='Без него ИИ-видео не будет: только сток и оживление фото Ken Burns.' },

    @{ Name='AGNES_API_KEY';    Level='optional';
       Title='Agnes AI — ИИ-картинки, запасной провайдер для текстов';
       Where='https://apihub.agnes-ai.com  (платно)';
       Without='Картинки type: gen уйдут на Gemini; запасного канала для текстов не будет.' },

    @{ Name='YOUTUBE_API_KEY';  Level='optional';
       Title='YouTube Data API — разбор ниши перед роликом (что уже заходит)';
       Where='https://console.cloud.google.com/apis/credentials -> API key (бесплатно)';
       Without='Темы придётся придумывать вручную, без опоры на свежие данные.' },

    @{ Name='JAMENDO_CLIENT_ID'; Level='optional';
       Title='Jamendo — фоновая музыка под лицензией';
       Where='https://devportal.jamendo.com  (бесплатно)';
       Without='Подбор музыки пропускается; можно указать свою папку в настройках.' },

    @{ Name='AWS_ACCESS_KEY_ID'; Level='optional';
       Title='Amazon Polly — платная озвучка (по умолчанию берётся бесплатный Edge TTS)';
       Where='https://console.aws.amazon.com/iam/  политика AmazonPollyFullAccess';
       Without='Озвучка идёт через бесплатный Edge TTS. Для большинства этого хватает.' },

    @{ Name='AWS_SECRET_ACCESS_KEY'; Level='optional';
       Title='Amazon Polly — секретная часть ключа (нужна вместе с предыдущим)';
       Where='выдаётся там же, где AWS_ACCESS_KEY_ID';
       Without='См. выше.' }
)

# Прочитать текущее значение ключа из .env (пустое, если нет или заглушка).
function Get-EnvValue ($file, $name) {
    if (-not (Test-Path $file)) { return '' }
    foreach ($line in (Get-Content $file -Encoding UTF8)) {
        if ($line -match "^\s*$([regex]::Escape($name))\s*=\s*(.*)$") {
            $v = $Matches[1].Trim()
            # Заглушки из шаблона за настоящее значение не считаем.
            if ($v -match 'your_.*_here') { return '' }
            return $v
        }
    }
    return ''
}

# Записать/заменить ключ в .env, не трогая остальные строки.
function Set-EnvValue ($file, $name, $value) {
    $lines = @()
    if (Test-Path $file) { $lines = @(Get-Content $file -Encoding UTF8) }
    $done = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^\s*$([regex]::Escape($name))\s*=") {
            $lines[$i] = "$name=$value"
            $done = $true
            break
        }
    }
    if (-not $done) { $lines += "$name=$value" }
    Set-Content -Path $file -Value $lines -Encoding UTF8
}

Step 'Ключи доступа'

if (-not (Test-Path $EnvFile)) {
    if (-not (Test-Path $EnvTpl)) { Fail 'Нет ни .env, ни .env.example — проект неполный.' }
    Copy-Item $EnvTpl $EnvFile
    Ok 'Создал .env из шаблона .env.example'
    $firstTime = $true
} else {
    Ok '.env уже есть'
    $firstTime = $false
}

# КЛЮЧИ ЗДЕСЬ БОЛЬШЕ НЕ СПРАШИВАЮТСЯ.
#
# Раньше установщик проводил человека по всем семи ключам подряд через
# Read-Host. Два повода это убрать.
#
#   По делу: опрос требовал и платные ключи наравне с бесплатными, а
#   первый ролик собирается на двух бесплатных. Человек, впервые открывший
#   программу, читал этот список как «сначала заведи семь учёток».
#   Теперь ключи спрашивает мастер «С чего начать» внутри самой программы:
#   там их два, оба помечены как бесплатные, и каждый проверяется на месте
#   кнопкой, а не «запишем и посмотрим, что будет».
#
#   По технике: Read-Host в окне без ввода (запуск из другого процесса,
#   свёрнутое окно, автоматизация) не ждёт человека, а возвращает мусор —
#   и он молча уезжал в .env. Поймано замером: после такого прогона в
#   файле стояло GEMINI_API_KEY=2 и VEO_API_KEY=0. Дальше программа
#   считала ключи заданными, мастер не открывался, а генерация падала на
#   отказе сервиса — то есть худший из возможных исходов.
#
# Файл .env создаётся из шаблона выше, и этого достаточно.

# Итоговая сводка по ключам — показывается всегда.
Say ''
Say '  Состояние ключей:'
$missingMust = @()
foreach ($k in $KeyCatalog) {
    $cur = Get-EnvValue $EnvFile $k.Name
    if ($cur -ne '') {
        Ok "$($k.Name)"
    } else {
        if ($k.Level -eq 'must') {
            Bad "$($k.Name) — не задан"
            $missingMust += $k.Name
        } else {
            Warn "$($k.Name) — не задан ($($k.Level))"
        }
    }
}

if ($missingMust.Count -gt 0) {
    Say ''
    Say "  Обязательные ключи ещё не вписаны: $($missingMust -join ', ')"

    Warn 'Это нормально: программа спросит их сама при первом открытии'
    Warn 'в окне «С чего начать» — там их всего два и оба бесплатные.'
}

# ---------------------------------------------------------------------
# 7. Запуск
# ---------------------------------------------------------------------
if ($SkipLaunch) {
    Say ''
    Ok 'Настройка закончена (запуск пропущен по флагу -SkipLaunch).'
    exit 0
}

Step 'Запускаю приложение'
Say '  Окно откроется через несколько секунд. Это окно можно закрыть.'
Say ''

# pythonw — без чёрной консоли за окном приложения.
$exe = $VenvPyw
if (-not (Test-Path $exe)) { $exe = $VenvPy }
Start-Process -FilePath $exe -ArgumentList (Join-Path $Root 'webapp.py') -WorkingDirectory $Root

Start-Sleep -Seconds 2
Ok 'Готово.'
exit 0
