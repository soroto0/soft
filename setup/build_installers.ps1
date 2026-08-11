# =====================================================================
#  Пересборка обоих установщиков одной командой.
#
#      powershell -ExecutionPolicy Bypass -File setup\build_installers.ps1
#
#  ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. Сборка состояла из трёх шагов, и записан был только
#  первый: dist_pack.ps1 собирает раздаваемую копию, installer.iss её
#  упаковывает — а откуда берётся ВТОРОЙ .exe, «ДЕМО», не было написано
#  нигде. Отличие наводили руками между двумя запусками компилятора, и
#  повторить сборку мог только тот, кто помнит порядок. Замер 2026-08-11:
#  установщики на рабочем столе от 07.08 15:11, код внутри — от 08.08 23:29,
#  а живой core.py — от 11.08 10:31. Четыре дня правок покупателю не достались
#  просто потому, что пересборка была устным знанием.
#
#  ПОРЯДОК ШАГОВ И ПОЧЕМУ ИМЕННО ТАКОЙ:
#    1. dist_pack.ps1  — собирает белым списком раздаваемую копию и валится,
#                        если внутрь попал настоящий ключ или запрещённое имя.
#    2. ISCC           — полная версия. Собирается ПЕРВОЙ, пока demo.json ещё
#                        не заведён: так полная физически не может унести
#                        метку демо, даже если следующий шаг оборвётся.
#    3. demo.json      — метка демо-режима кладётся в раздаваемую копию ПОСЛЕ
#                        проверок. Раньше её туда положить нельзя: она стоит в
#                        чёрном списке dist_pack.ps1 и уронила бы сборку —
#                        и правильно, в платную раздачу ей нельзя.
#    4. ISCC /DDemo    — демоверсия.
#    5. метка убирается из раздаваемой копии, чтобы следующий запуск любого
#       шага не начинался с грязного дерева.
#
#  Ничего никуда не выкладывается. На выходе два файла в setup\Output\;
#  с -CopyTo <папка> они дополнительно кладутся рядом друг с другом с датой
#  в имени — чтобы старую раздачу не пришлось затирать вслепую.
# =====================================================================
[CmdletBinding()]
param(
    # Куда дополнительно положить готовые .exe (например рабочий стол).
    [string]$CopyTo = '',
    # Пропустить пересборку раздаваемой копии — если dist\ уже собран
    # текущим кодом и нужно только перекомпилировать установщики.
    [switch]$SkipPack
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch { }

$Root   = Split-Path -Parent $PSScriptRoot
$Dist   = Join-Path $Root 'dist\kontent-fabrika'
$Iss    = Join-Path $PSScriptRoot 'installer.iss'
$OutDir = Join-Path $PSScriptRoot 'Output'
$Marker = Join-Path $Dist 'demo.json'

function Say  ($m) { Write-Host $m }
function Ok   ($m) { Write-Host "  [OK]   $m" -ForegroundColor Green }
function Bad  ($m) { Write-Host "  [X]    $m" -ForegroundColor Red }
function Step ($m) { Write-Host ''; Write-Host "== $m" -ForegroundColor Cyan }

# ---------------------------------------------------------------------
# Компилятор. winget ставит Inno Setup в LOCALAPPDATA, а не в Program Files —
# проверено 2026-08-07: поиск по Program Files не находит ничего. Оба места
# всё равно перебираем: на другой машине компилятор мог ставиться из .exe.
# ---------------------------------------------------------------------
$IsccCandidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'),
    (Join-Path $env:ProgramFiles 'Inno Setup 6\ISCC.exe')
)
$Iscc = $IsccCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $Iscc) {
    Bad 'Не найден ISCC.exe (компилятор Inno Setup).'
    Say '       Поставь его:  winget install JRSoftware.InnoSetup'
    exit 1
}

Say ''
Say '+---------------------------------------------+'
Say '|   Пересборка установщиков (ПОЛНАЯ и ДЕМО)   |'
Say '+---------------------------------------------+'
Say "  компилятор: $Iscc"

# ---------------------------------------------------------------------
# 1. Раздаваемая копия
# ---------------------------------------------------------------------
if ($SkipPack) {
    Step 'Раздаваемая копия: пропущена по ключу -SkipPack'
    if (-not (Test-Path $Dist)) { Bad "Нечего пропускать: нет $Dist"; exit 1 }
} else {
    Step 'Собираю раздаваемую копию (dist_pack.ps1)'
    $packLog = Join-Path $OutDir 'pack.log'
    if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
    # Без 2>&1: в Windows PowerShell 5.1 перенаправление stderr нативной
    # программы заворачивает каждую строку в ErrorRecord, а при
    # ErrorActionPreference='Stop' это роняет сам сборочный скрипт — даже
    # когда программа отработала успешно. Судим по коду возврата.
    & powershell -NoProfile -ExecutionPolicy Bypass `
        -File (Join-Path $PSScriptRoot 'dist_pack.ps1') `
        -OutDir (Join-Path $Root 'dist') | Tee-Object -FilePath $packLog
    if ($LASTEXITCODE -ne 0) {
        Bad "dist_pack.ps1 отказался собирать (код $LASTEXITCODE). Установщики не трогал."
        exit 1
    }
    Ok "Раздаваемая копия готова, полный список — в $packLog"
}

# Страховка от грязного дерева: если прошлый запуск оборвался между шагами 3
# и 5, метка демо осталась бы лежать — и полная версия унесла бы её покупателю.
if (Test-Path $Marker) { Remove-Item $Marker -Force }

# ---------------------------------------------------------------------
# 2. Полная версия
# ---------------------------------------------------------------------
Step 'Компилирую ПОЛНУЮ'
$fullLog = Join-Path $OutDir 'build_full.log'
& $Iscc $Iss | Tee-Object -FilePath $fullLog | Select-String -Pattern 'Successful compile|^Error|^Warning'
if ($LASTEXITCODE -ne 0) { Bad "ISCC вернул $LASTEXITCODE. Смотри $fullLog"; exit 1 }
Ok "ПОЛНАЯ собрана, что упаковано — в $fullLog"

# ---------------------------------------------------------------------
# 3. Метка демо-режима
#
# Ноль в videos, а не пустой объект: demo.сделано() читает поле и без него,
# но файл, который человек может открыть и понять, лучше пустых скобок.
# ---------------------------------------------------------------------
Step 'Кладу метку демо-режима'
$demoJson = @'
{
  "videos": 0
}
'@
[IO.File]::WriteAllText($Marker, $demoJson, (New-Object Text.UTF8Encoding $false))
Ok 'demo.json (только для демо-сборки, будет убран следом)'

# ---------------------------------------------------------------------
# 4. Демоверсия
# ---------------------------------------------------------------------
Step 'Компилирую ДЕМО'
$demoLog = Join-Path $OutDir 'build_demo.log'
try {
    & $Iscc '/DDemo' $Iss | Tee-Object -FilePath $demoLog | Select-String -Pattern 'Successful compile|^Error|^Warning'
    $rc = $LASTEXITCODE
} finally {
    # 5. Убрать метку в любом случае — даже если компилятор упал. Иначе
    # следующая ПОЛНАЯ сборка началась бы с demo.json в дереве.
    if (Test-Path $Marker) { Remove-Item $Marker -Force }
}
if ($rc -ne 0) { Bad "ISCC вернул $rc. Смотри $demoLog"; exit 1 }
Ok "ДЕМО собрана, что упаковано — в $demoLog"
Ok 'Метка demo.json убрана из раздаваемой копии'

# ---------------------------------------------------------------------
# 6. Что получилось
# ---------------------------------------------------------------------
Step 'Готовые установщики'
$made = @(
    (Join-Path $OutDir 'КонтентФабрика — ПОЛНАЯ.exe'),
    (Join-Path $OutDir 'КонтентФабрика — ДЕМО.exe')
)
foreach ($m in $made) {
    if (-not (Test-Path $m)) { Bad "Нет файла: $m"; exit 1 }
    $f = Get-Item $m
    Say ("    {0,8:N1} МБ  {1}  ({2:yyyy-MM-dd HH:mm})" -f ($f.Length / 1MB), $f.Name, $f.LastWriteTime)
}

if ($CopyTo -ne '') {
    Step "Копирую в $CopyTo"
    if (-not (Test-Path $CopyTo)) { New-Item -ItemType Directory -Path $CopyTo -Force | Out-Null }
    $stamp = Get-Date -Format 'yyyy-MM-dd'
    foreach ($m in $made) {
        $f = Get-Item $m
        $name = "{0} {1}{2}" -f [IO.Path]::GetFileNameWithoutExtension($f.Name), $stamp, $f.Extension
        Copy-Item $f.FullName (Join-Path $CopyTo $name) -Force
        Ok $name
    }
}

Say ''
Ok 'Готово. Ничего никуда не отправлено — раздачей занимается владелец.'
exit 0
