# Готовит логотип бренда для сайта.
#
# ЗАПУСКАТЬ НЕ ЭТОТ ФАЙЛ, а «Подготовить логотип.bat» рядом с ним:
# Windows не умеет запускать .ps1 двойным щелчком — открывает их
# в Блокноте.
#
# Два способа:
#   - перетащить файлы логотипов прямо на .bat;
#   - или просто открыть .bat двойным щелчком — появится окно выбора
#     файлов.
#
# Рядом с исходником появится готовый PNG — его и загружайте в админке,
# в карточку бренда.
#
# ЧТО ДЕЛАЕТ И ЗАЧЕМ
#
# Плитки брендов на сайте тёмные, а логотипы приходят цветными на белом
# фоне и очень разных пропорций — от почти квадратных до вытянутых 6:1.
# Если грузить их как есть, плитки получатся разнокалиберными, а белый
# фон будет светиться прямоугольником.
#
# Поэтому каждый логотип приводится к одному виду:
#   - графика перекрашивается в белое, фон становится прозрачным;
#   - прозрачность считается по «удалённости от белого»: чем темнее или
#     насыщеннее пиксель исходника, тем плотнее он в результате. За счёт
#     этого светлые и жёлтые логотипы не выцветают;
#   - результат вписывается в 300x110 и центрируется на холсте 360x140.
#     Один размер холста у всех = одинаковый визуальный размер в любой
#     плитке.
#
# ЕСЛИ РЕЗУЛЬТАТ БЛЕДНЫЙ ИЛИ НАОБОРОТ ПЯТНО
#
# Поменяйте $Gain ниже. Больше — плотнее и ярче, меньше — прозрачнее.
# Разумный диапазон 1.0–2.0.
#
# ЕСЛИ ЛОГОТИП ПРИШЁЛ ГОТОВЫМ SVG на прозрачном фоне — обрабатывать не
# нужно, грузите как есть. Только проверьте, что графика занимает
# примерно 300x110 внутри viewBox 360x140.

param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Files)

$Gain = 1.3

# Имя готового файла переводим в латиницу.
#
# Это не украшательство: файл попадёт в адрес картинки на сайте, а имена
# с кириллицей веб-серверы отдают неровно — у нас на этом логотип
# «Совплим» перестал показываться, хотя в медиатеке лежал. Все остальные
# логотипы на сайте названы латиницей, приводим к тому же виду.
function Convert-ToLatin([string]$text) {
    $map = @{
        'а'='a'; 'б'='b'; 'в'='v'; 'г'='g'; 'д'='d'; 'е'='e'; 'ё'='e';
        'ж'='zh'; 'з'='z'; 'и'='i'; 'й'='y'; 'к'='k'; 'л'='l'; 'м'='m';
        'н'='n'; 'о'='o'; 'п'='p'; 'р'='r'; 'с'='s'; 'т'='t'; 'у'='u';
        'ф'='f'; 'х'='h'; 'ц'='c'; 'ч'='ch'; 'ш'='sh'; 'щ'='sch';
        'ъ'=''; 'ы'='y'; 'ь'=''; 'э'='e'; 'ю'='yu'; 'я'='ya'
    }

    $sb = New-Object Text.StringBuilder
    foreach ($ch in $text.ToLower().ToCharArray()) {
        $s = [string]$ch
        if ($map.ContainsKey($s)) {
            [void]$sb.Append($map[$s])
        } elseif ($s -match '[a-z0-9]') {
            [void]$sb.Append($s)
        } else {
            [void]$sb.Append('-')
        }
    }

    $out = $sb.ToString() -replace '-+', '-'
    return $out.Trim('-')
}

$ffmpeg = 'C:\Program Files\GNU Octave\Octave-9.2.0\mingw64\bin\ffmpeg.exe'

if (-not (Test-Path $ffmpeg)) {
    Write-Host 'Не найден ffmpeg по адресу:' -ForegroundColor Red
    Write-Host "  $ffmpeg"
    Write-Host 'Если он переехал — поправьте путь в начале этого файла.'
    Read-Host 'Enter чтобы закрыть'
    exit 1
}

# Файлы не перетащили — показываем обычное окно выбора.
if (-not $Files -or $Files.Count -eq 0) {
    Add-Type -AssemblyName System.Windows.Forms
    $dlg = New-Object Windows.Forms.OpenFileDialog
    $dlg.Title = 'Выберите логотипы брендов'
    $dlg.Filter = 'Изображения (*.jpg;*.jpeg;*.png;*.webp)|*.jpg;*.jpeg;*.png;*.webp|Все файлы (*.*)|*.*'
    $dlg.Multiselect = $true

    $start = Join-Path $PSScriptRoot ([char]0x041B + [char]0x043E + [char]0x0433 + [char]0x043E + [char]0x0442 + [char]0x0438 + [char]0x043F + [char]0x044B)
    if (Test-Path $start) { $dlg.InitialDirectory = $start }

    if ($dlg.ShowDialog() -eq [Windows.Forms.DialogResult]::OK) {
        $Files = $dlg.FileNames
    } else {
        exit 0
    }
}

# ffmpeg спотыкается о кириллицу в путях, поэтому работаем через
# временную папку с латинским именем, а результат копируем обратно.
$work = Join-Path $env:TEMP ('linma-logo-' + [Guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $work | Out-Null

$filter = "format=rgba," +
          "geq=r=255:g=255:b=255:a='min(255,(alpha(X,Y)/255)*max(max(255-r(X,Y),255-g(X,Y)),255-b(X,Y))*$Gain)'," +
          "scale=300:110:force_original_aspect_ratio=decrease," +
          "pad=360:140:(ow-iw)/2:(oh-ih)/2:color=0x00000000"

$done = 0
$fail = 0

foreach ($f in $Files) {
    $src = $f.Trim('"')
    if (-not (Test-Path -LiteralPath $src)) {
        Write-Host "Не найден: $src" -ForegroundColor Red
        $fail++
        continue
    }

    $item = Get-Item -LiteralPath $src
    $base = [IO.Path]::GetFileNameWithoutExtension($item.Name)

    $tmpIn  = Join-Path $work ('in' + $item.Extension)
    $tmpOut = Join-Path $work 'out.png'

    Copy-Item -LiteralPath $src -Destination $tmpIn -Force
    if (Test-Path $tmpOut) { Remove-Item $tmpOut -Force }

    & $ffmpeg -y -loglevel error -i $tmpIn -vf $filter $tmpOut 2>&1 | Out-Null

    if (Test-Path $tmpOut) {
        $latin = Convert-ToLatin $base
        if (-not $latin) { $latin = 'logo' }

        $dest = Join-Path $item.DirectoryName ($latin + '-web.png')
        Copy-Item -LiteralPath $tmpOut -Destination $dest -Force

        if ($latin -ne $base.ToLower()) {
            Write-Host ("Готово: " + (Split-Path $dest -Leaf) + "   (из «" + $item.Name + "»)") -ForegroundColor Green
        } else {
            Write-Host ("Готово: " + (Split-Path $dest -Leaf)) -ForegroundColor Green
        }
        $done++
    } else {
        Write-Host ("Не получилось: " + $item.Name) -ForegroundColor Red
        $fail++
    }

    Remove-Item $tmpIn -Force -ErrorAction SilentlyContinue
}

Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ''
Write-Host "Обработано: $done" -ForegroundColor Green
if ($fail -gt 0) { Write-Host "С ошибкой: $fail" -ForegroundColor Red }
Write-Host ''
Write-Host 'Файлы с пометкой «-web» лежат рядом с исходниками.'
Write-Host 'Имя переведено в латиницу — с кириллицей в имени картинка'
Write-Host 'на сайте не показывается.'
Write-Host ''
Write-Host 'Откройте результат на тёмном фоне: графика белая, и на белом'
Write-Host 'фоне файл выглядит пустым. Если бледно или наоборот сплошное'
Write-Host 'пятно — поменяйте $Gain в начале prepare-logo.ps1.'
Write-Host ''
Read-Host 'Enter чтобы закрыть'
