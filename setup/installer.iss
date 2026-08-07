; =====================================================================
;  Установщик «Контент-фабрики» для покупателя.
;
;  ЧТО ОН НЕ ДЕЛАЕТ И ПОЧЕМУ. Он не кладёт внутрь node_modules (2.6 ГБ),
;  Python и FFmpeg. Дистрибутив с ними весил бы гигабайты, устаревал бы
;  на следующий день и всё равно не заменил бы системный Python. Вместо
;  этого установщик копирует программу и зовёт setup.ps1 — тот проверяет
;  Python, Node и FFmpeg, создаёт своё окружение .venv, ставит
;  зависимости и спрашивает ключи по одному.
;
;  Итог для покупателя: один файл, двойной щелчок, мастер, ярлык на
;  рабочем столе. Всё тяжёлое подтягивается при первом запуске.
;
;  СБОРКА:
;    1. установить компилятор:  winget install JRSoftware.InnoSetup
;    2. собрать раздаваемую копию:
;         powershell -ExecutionPolicy Bypass -File setup\dist_pack.ps1 -OutDir dist
;       (он же проверит, что ни один ключ не просочился)
;    3. скомпилировать:
;         "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" setup\installer.iss
;
;  На выходе:  setup\Output\КонтентФабрика-Установка.exe
; =====================================================================

#define AppName      "Контент-фабрика"
#define AppVersion   "3.0"
#define AppPublisher "Контент-фабрика"
#define AppExe       "Запустить.bat"

[Setup]
AppId={{8F2C4A19-7B3D-4E56-9C81-2D5F6A8B0E31}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\KontentFabrika
DefaultGroupName={#AppName}
; Программа ставится в Program Files, но РАБОТАЕТ с файлами рядом с собой:
; проекты, ключи и библиотеки лежат в её папке. Поэтому нужны права
; администратора — иначе она не сможет писать в собственную папку.
PrivilegesRequired=admin
OutputDir=Output
OutputBaseFilename=КонтентФабрика-Установка
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
; Русский интерфейс мастера — покупатель русскоязычный.
ShowLanguageDialog=no
DisableProgramGroupPage=yes
UninstallDisplayName={#AppName}

[Languages]
Name: "ru"; MessagesFile: "compiler:Languages\Russian.isl"

[Files]
; Источник — папка, собранная dist_pack.ps1: в ней уже НЕТ ключей,
; папок каналов и прочего личного. Собирать установщик из рабочей
; папки напрямую нельзя — туда уедет .env со всеми ключами.
Source: "..\dist\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{group}\{#AppName}";        Filename: "{app}\{#AppExe}"; WorkingDir: "{app}"; IconFilename: "{app}\assets\icon.ico"
Name: "{autodesktop}\{#AppName}";  Filename: "{app}\{#AppExe}"; WorkingDir: "{app}"; IconFilename: "{app}\assets\icon.ico"
Name: "{group}\Удалить {#AppName}"; Filename: "{uninstallexe}"

[Run]
; Первый запуск — сразу мастер настройки: проверка Python/Node/FFmpeg,
; окружение, зависимости, ключи. Без него программа не заработает, и
; лучше провести человека через это сразу, чем оставить его наедине с
; окном, которое молча не открывается.
Filename: "{app}\{#AppExe}"; Description: "Настроить и запустить"; \
  Flags: postinstall nowait skipifsilent

[Messages]
ru.WelcomeLabel2=Программа соберёт документальный ролик от темы до готового файла: сценарий, озвучка, кадры, графика, музыка, монтаж, обложка и описание.%n%nПосле установки откроется мастер: он проверит, что нужно доставить, и спросит ключи доступа.%n%nПонадобится Python, Node.js и FFmpeg — мастер подскажет, как их поставить, если их ещё нет.

; Место на диске проверяем ЗАЯВЛЕННЫМ размером, а не кодом: сам
; установщик мал, но при первом запуске мастер докачает окружение Python
; и зависимости Remotion — вместе почти 4 ГБ. Windows покажет
; предупреждение сам, если места не хватает, и сделает это до начала
; установки. Своя проверка тут только добавила бы точку отказа.
[Setup]
ExtraDiskSpaceRequired=4200000000
