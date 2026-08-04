@echo off
rem ---------------------------------------------------------------
rem  Kontent-fabrika - tochka vhoda v odin klik.
rem  Ves' tekst i logika - v setup\setup.ps1 (tam UTF-8 i russkiy).
rem  Etot fayl namerenno ASCII: cmd.exe lomaet kirillicu v .bat
rem  na mashinah s drugoy kodovoy stranicey.
rem ---------------------------------------------------------------
setlocal
cd /d "%~dp0"

where powershell >nul 2>nul
if errorlevel 1 (
  echo [!] Windows PowerShell ne nayden. Nuzhna Windows 7 SP1 ili novee.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\setup.ps1" %*
set RC=%ERRORLEVEL%

if not "%RC%"=="0" (
  echo.
  echo [!] Zapusk zavershilsya s oshibkoy. Kod: %RC%
  pause
)
exit /b %RC%
