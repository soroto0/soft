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
;  СБОРКА — ОДНОЙ КОМАНДОЙ:
;         powershell -ExecutionPolicy Bypass -File setup\build_installers.ps1
;  Он делает всё: раздаваемую копию, полный установщик, демо-установщик.
;  Раньше эти три шага жили только в голове владельца, и раздача на рабочем
;  столе отстала от кода на четыре дня — замер 2026-08-11.
;
;  ВРУЧНУЮ, если нужен только один вариант:
;    1. установить компилятор:  winget install JRSoftware.InnoSetup
;    2. собрать раздаваемую копию:
;         powershell -ExecutionPolicy Bypass -File setup\dist_pack.ps1 -OutDir dist
;       (он же проверит, что ни один ключ не просочился)
;    3. скомпилировать:
;         "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" setup\installer.iss
;         "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" /DDemo setup\installer.iss
;       (winget ставит компилятор именно туда, а не в Program Files —
;        проверено 2026-08-07, поиск по Program Files ничего не находит)
;
;  На выходе:  setup\Output\КонтентФабрика — ПОЛНАЯ.exe
;              setup\Output\КонтентФабрика — ДЕМО.exe
; =====================================================================

#define AppName      "Контент-фабрика"
#define AppVersion   "3.0"
#define AppPublisher "Контент-фабрика"
#define AppExe       "Запустить.bat"

; ИЗДАНИЕ. Единственное отличие демо от полной — файл demo.json рядом с
; программой: demo.включён() проверяет именно его наличие, отдельного «ключа
; активации» нет. Раньше это отличие наводили руками между двумя запусками
; компилятора, и повторить сборку мог только тот, кто помнит порядок.
; Теперь оно выражено ключом /DDemo, а порядок — в build_installers.ps1.
#ifdef Demo
  #define Edition   " — ДЕМО"
  #define AppTitle  AppName + " (демоверсия)"
#else
  #define Edition   " — ПОЛНАЯ"
  #define AppTitle  AppName
#endif

[Setup]
; AppId у обоих изданий ОДИН И ТОТ ЖЕ — намеренно. Покупатель сначала ставит
; демо, потом полную; при разных AppId Windows считала бы их двумя разными
; программами, и в «Установке и удалении» осталось бы две записи на одну папку,
; а полная версия встала бы поверх демо, не убрав за ней ничего.
AppId={{8F2C4A19-7B3D-4E56-9C81-2D5F6A8B0E31}
AppName={#AppTitle}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\KontentFabrika
DefaultGroupName={#AppName}
; Программа ставится в Program Files, но РАБОТАЕТ с файлами рядом с собой:
; проекты, ключи и библиотеки лежат в её папке. Поэтому нужны права
; администратора — иначе она не сможет писать в собственную папку.
;
; ОДНИХ ПРАВ У УСТАНОВЩИКА НЕ ХВАТАЛО. PrivilegesRequired поднимает только
; САМ мастер; ярлык на рабочем столе запускает .bat обычным процессом, а у
; группы «Пользователи» на Program Files стоит ReadAndExecute — замерено на
; этой машине: Get-Acl 'C:\Program Files' отдаёт ровно ReadAndExecute, а
; попытка записи без повышения прав отвечает «Access to the path ... is
; denied». Программа же пишет рядом с собой ВСЁ: .venv, .env, settings.json,
; app.log, папки каналов с готовыми роликами, music_library, assets\sfx,
; remotion\public\ovl_*.png. То есть после установки первый же обычный
; запуск упирался в отказ на записи. Строка ниже выдаёт «Пользователям»
; право изменять содержимое папки программы — тогда обещание комментария
; выше становится правдой.
[Dirs]
Name: "{app}"; Permissions: users-modify

[Setup]
PrivilegesRequired=admin
OutputDir=Output
OutputBaseFilename=КонтентФабрика{#Edition}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
; Русский интерфейс мастера — покупатель русскоязычный.
ShowLanguageDialog=no
DisableProgramGroupPage=yes
UninstallDisplayName={#AppTitle}

[Languages]
Name: "ru"; MessagesFile: "compiler:Languages\Russian.isl"

[Files]
; Источник — папка, собранная dist_pack.ps1: в ней уже НЕТ ключей,
; папок каналов и прочего личного. Собирать установщик из рабочей
; папки напрямую нельзя — туда уедет .env со всеми ключами.
;
; Путь — до САМОЙ папки kontent-fabrika, а не до dist\. Инструкция выше велит
; собирать `dist_pack.ps1 -OutDir dist`, а он всегда кладёт результат в
; подпапку с именем kontent-fabrika (см. $Dist в dist_pack.ps1). С маской
; ..\dist\* и recursesubdirs Inno сохраняет эту подпапку, и программа
; оказывалась в {app}\kontent-fabrika\ — то есть {app}\Запустить.bat, на
; который смотрят оба ярлыка и постустановочный запуск, просто не
; существовал. Проверено по дереву: в dist\ лежит ровно один элемент, папка.
;
; demo.json вынут из общей маски намеренно: с ignoreversion переустановка демо
; затирала бы счётчик собранных роликов нулём, то есть выдавала бы ещё три
; ролика за одно нажатие «Установить». Ниже он ставится отдельной строкой с
; onlyifdoesntexist — счётчик переживает переустановку.
Source: "..\dist\kontent-fabrika\*"; DestDir: "{app}"; Excludes: "demo.json"; Flags: recursesubdirs createallsubdirs ignoreversion
#ifdef Demo
Source: "..\dist\kontent-fabrika\demo.json"; DestDir: "{app}"; Flags: onlyifdoesntexist
#endif

#ifndef Demo
; Полная версия ставится ПОВЕРХ демо (AppId общий), а Inno не удаляет файлы,
; которых нет в новой сборке. Без этой строки demo.json оставался бы лежать в
; папке — и купленная копия продолжала бы печатать «ДЕМО» поперёк кадра и
; упиралась бы в лимит трёх роликов. То есть покупатель заплатил и не увидел
; разницы. Проверять нечего: demo.включён() смотрит ровно на наличие файла.
[InstallDelete]
Type: files; Name: "{app}\demo.json"
#endif

[Icons]
; Иконка — из ui\icon. В assets\ она тоже есть, но папку assets целиком не
; раздают (в ней звуки под чужой лицензией — так и написано в README), и
; путь {app}\assets\icon.ico вёл в пустоту: оба ярлыка получали безликий
; значок .bat-файла. Это первое, что покупатель видит после установки.
Name: "{group}\{#AppName}";        Filename: "{app}\{#AppExe}"; WorkingDir: "{app}"; IconFilename: "{app}\ui\icon\icon.ico"
Name: "{autodesktop}\{#AppName}";  Filename: "{app}\{#AppExe}"; WorkingDir: "{app}"; IconFilename: "{app}\ui\icon\icon.ico"
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
