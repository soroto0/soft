# =====================================================================
#  Собрать Установить-КонтентФабрику.exe — установщик одним файлом
#
#  Что делает: берёт свежую раздаваемую копию (dist_pack.ps1), вшивает её
#  архив внутрь exe и собирает PyInstaller'ом. На выходе ОДИН файл, который
#  покупатель скачивает и запускает — без распаковки, без прав
#  администратора, без установки чего-либо ещё.
#
#  Почему PyInstaller, а не Inno Setup: Inno на машине не установлен, а
#  PyInstaller уже лежит в .venv (им собран КонтентФабрика.exe). Меньше
#  зависимостей — меньше поводов, чтобы сборка однажды не завелась.
#
#      powershell -ExecutionPolicy Bypass -File setup\build_installer_exe.ps1
#      ... -OutDir D:\раздача        куда положить готовое
#      ... -SkipPack                 не пересобирать архив, взять готовый
# =====================================================================
param(
    [string]$OutDir = "$env:USERPROFILE\Desktop\софт",
    [switch]$SkipPack,
    [switch]$Demo
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Venv = Join-Path $Root '.venv\Scripts\python.exe'
$Icon = Join-Path $Root 'ui\icon\icon.ico'
# Промежуточное (архив и распакованная копия) держим в подпапке: наверху
# у владельца должны лежать только два exe, иначе он снова запутается,
# который из файлов отдавать покупателю.
$Bench = Join-Path $OutDir 'рабочее (не для покупателя)'
$Zip   = Join-Path $Bench 'kontent-fabrika.zip'
$Work = Join-Path ([IO.Path]::GetTempPath()) 'kf-installer-build'
$Log  = Join-Path ([IO.Path]::GetTempPath()) 'kf-installer-build.log'
$Stage = Join-Path ([IO.Path]::GetTempPath()) 'kf-installer-out'

function Say ($m) { Write-Host $m }
function Ok  ($m) { Write-Host "  [OK]   $m" -ForegroundColor Green }
function Die ($m) { Write-Host "  [!]    $m" -ForegroundColor Red; exit 1 }

Say ''
Say '+---------------------------------------------+'
Say '|   Сборка установщика одним файлом            |'
Say '+---------------------------------------------+'
Say ''

if (-not (Test-Path $Venv)) { Die "Нет .venv — сначала setup\setup.ps1" }
# ErrorActionPreference=Stop + нативная программа = беда: PowerShell 5.1
# заворачивает КАЖДУЮ строку stderr в ошибку и роняет скрипт, хотя команда
# отработала с кодом 0. PyInstaller пишет в stderr всегда. Поэтому вокруг
# всех его вызовов режим временно смягчаем и смотрим на код возврата.
$ErrorActionPreference = 'Continue'
& $Venv -m PyInstaller --version | Out-Null
if ($LASTEXITCODE -ne 0) {
    $ErrorActionPreference = 'Stop'
    Die 'В .venv нет PyInstaller: python -m pip install pyinstaller'
}
$ErrorActionPreference = 'Stop'
Ok 'PyInstaller на месте'

if (-not $SkipPack) {
    Say ''
    Say '== Пересобираю раздаваемую копию'
    New-Item -ItemType Directory -Force $Bench | Out-Null
    & (Join-Path $PSScriptRoot 'dist_pack.ps1') -OutDir $Bench -Zip | Out-Null
    if ($LASTEXITCODE -ne 0) { Die 'dist_pack.ps1 не отработал' }
}
if (-not (Test-Path $Zip)) { Die "Нет архива $Zip (запусти без -SkipPack)" }
Ok ("Архив: {0:N1} МБ" -f ((Get-Item $Zip).Length / 1MB))

# Пробная сборка отличается от продажной РОВНО одним файлом: demo.json.
# Его наличие включает демо-режим (три ролика с надписью «ДЕМО», без
# ключа — см. demo.py). Так потенциальный покупатель видит работу до
# оплаты, а не окно активации, в которое ему нечего вписать.
$Name = 'Установить-КонтентФабрику'
if ($Demo) {
    $Name = 'Пробная-КонтентФабрика'
    # Имя файла обязано остаться kontent-fabrika.zip: PyInstaller кладёт
    # вложенное как есть, а installer_gui ищет архив по этому имени. Пробная
    # сборка с именем ...-demo.zip собиралась и запускалась, но НИЧЕГО не
    # устанавливала — «архив не вшит». Поэтому различаем папкой, не именем.
    $BenchDemo = Join-Path $Bench 'демо'
    New-Item -ItemType Directory -Force $BenchDemo | Out-Null
    $ZipDemo = Join-Path $BenchDemo 'kontent-fabrika.zip'
    Copy-Item $Zip $ZipDemo -Force
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $za = [IO.Compression.ZipFile]::Open($ZipDemo, 'Update')
    try {
        $old = $za.GetEntry('kontent-fabrika/demo.json')
        if ($old) { $old.Delete() }
        $entry = $za.CreateEntry('kontent-fabrika/demo.json')
        $sw = New-Object IO.StreamWriter($entry.Open())
        $sw.Write('{ "videos": 0 }')
        $sw.Dispose()
    } finally { $za.Dispose() }
    $Zip = $ZipDemo
    Ok 'Метка demo.json вложена — это ПРОБНАЯ сборка'
}

Say ''
Say '== Собираю exe (около минуты)'
# Пути ТОЛЬКО абсолютные: --specpath уводит рабочую папку, и относительный
# путь к значку молча теряется — exe выходит без иконки.
$ErrorActionPreference = 'Continue'
& $Venv -m PyInstaller --onefile --windowed --clean --noconfirm `
    --name $Name `
    --icon $Icon `
    --add-data "$Zip;." `
    --add-data "$Icon;." `
    --distpath $Stage `
    --workpath $Work --specpath $Work `
    (Join-Path $PSScriptRoot 'installer_gui.py') | Out-File -FilePath $Log -Encoding utf8
$code = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($code -ne 0) { Die "PyInstaller упал (код $code). Подробности: $Log" }

# Собираем во временную папку и переносим готовое. Прямая сборка в папку
# раздачи спотыкалась о «Отказано в доступе»: антивирус берёт свежий exe на
# проверку и держит его, пока PyInstaller пытается перезаписать прошлый.
$built = Join-Path $Stage "$Name.exe"
if (-not (Test-Path $built)) { Die 'exe не появился' }
$exe = Join-Path $OutDir "$Name.exe"
foreach ($try in 1..5) {
    try { Copy-Item $built $exe -Force; break }
    catch { if ($try -eq 5) { Die "Не удалось положить exe в $OutDir : $_" }
            Start-Sleep -Seconds 2 }
}
Ok ("{0}  —  {1:N1} МБ" -f $exe, ((Get-Item $exe).Length / 1MB))

Remove-Item $Work, $Stage -Recurse -Force -ErrorAction SilentlyContinue
Say ''
Ok 'Готово. Этот один файл и отдаётся покупателю.'
Say ''
