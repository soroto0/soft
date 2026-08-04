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
                Warn 'После установки закрой это окно и запусти заново — PATH обновляется только в новых окнах.'
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

if (-not (Test-Path $VenvPy)) {
    Say '  Создаю .venv (это разово, около минуты)...'
    if ($PyLauncher -eq 'py') { & py -3 -m venv (Join-Path $Root '.venv') }
    else                      { & python -m venv (Join-Path $Root '.venv') }
    if (-not (Test-Path $VenvPy)) { Fail 'Не удалось создать .venv.' }
    Ok 'Окружение создано'
} else {
    Ok 'Окружение уже есть'
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
    Say '  Ставлю зависимости. Первый раз это долго: 5-15 минут,'
    Say '  качается около 2 ГБ (распознавание речи тянет torch).'
    Say ''
    & $VenvPy -m pip install --upgrade pip --quiet --disable-pip-version-check
    & $VenvPy -m pip install -r $ReqFile --disable-pip-version-check
    if ($LASTEXITCODE -ne 0) { Fail 'pip install не прошёл. Смотри ошибку выше.' }
    Set-Content -Path $StampFile -Value $reqHash -Encoding ascii
    Ok 'Зависимости установлены'
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

    @{ Name='VEO_API_KEY';      Level='good';
       Title='VeoNonStop — ИИ-видео (Veo) и ИИ-картинки';
       Where='https://veononstop.org  (платно, по подписке)';
       Without='Без него ИИ-видео не будет: только сток и оживление фото Ken Burns.' },

    @{ Name='AGNES_API_KEY';    Level='good';
       Title='Agnes AI — ИИ-картинки, запасной провайдер для текстов';
       Where='https://apihub.agnes-ai.com  (платно)';
       Without='Картинки type: gen уйдут на Gemini; запасного канала для текстов не будет.' },

    @{ Name='YOUTUBE_API_KEY';  Level='good';
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

$askKeys = $Reconfigure -or $firstTime
if ($NonInteractive) { $askKeys = $false }

if ($askKeys) {
    Say ''
    Say '  Сейчас пройдёмся по ключам. Пустой ответ = пропустить.'
    Say '  Любой можно вписать потом: файл .env в папке проекта.'
    Say ''
    Say '  Минимум, чтобы собрать первый ролик: Gemini + Pexels.'
    Say ''

    foreach ($k in $KeyCatalog) {
        $cur = Get-EnvValue $EnvFile $k.Name
        switch ($k.Level) {
            'must'     { $tag = '[ОБЯЗАТЕЛЬНЫЙ]'; $col = 'Red' }
            'good'     { $tag = '[желательный]';  $col = 'Yellow' }
            default    { $tag = '[по желанию]';   $col = 'Gray' }
        }
        Say ''
        Write-Host "  $tag $($k.Name)" -ForegroundColor $col
        Say "     $($k.Title)"
        Say "     где взять: $($k.Where)"
        Say "     без него:  $($k.Without)"
        if ($cur -ne '') {
            $masked = $cur.Substring(0, [Math]::Min(4, $cur.Length)) + '...'
            Say "     сейчас задан: $masked  (Enter — оставить как есть)"
        }
        $ans = Read-Host '     значение'
        if ($ans.Trim() -ne '') {
            Set-EnvValue $EnvFile $k.Name $ans.Trim()
            Ok "$($k.Name) записан"
        }
    }
}

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
    Warn "Не заданы обязательные ключи: $($missingMust -join ', ')"
    Warn 'Приложение откроется, но генерация будет падать с понятной ошибкой.'
    Warn 'Впиши ключи в .env или запусти: Запустить.bat -Reconfigure'
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
