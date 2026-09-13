# Готовит логотип бренда для сайта.
#
# Как пользоваться: перетащите файл логотипа (JPG или PNG) прямо на этот
# скрипт. Рядом с исходником появится готовый PNG — его и загружайте
# в админке, в карточку бренда.
#
# Можно перетащить сразу несколько файлов.
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

$ffmpeg = 'C:\Program Files\GNU Octave\Octave-9.2.0\mingw64\bin\ffmpeg.exe'

if (-not (Test-Path $ffmpeg)) {
    Write-Host 'Не найден ffmpeg по адресу:' -ForegroundColor Red
    Write-Host "  $ffmpeg"
    Write-Host 'Если он переехал — поправьте путь в начале этого файла.'
    Read-Host 'Enter чтобы закрыть'
    exit 1
}

if (-not $Files -or $Files.Count -eq 0) {
    Write-Host 'Перетащите файл логотипа на этот скрипт.' -ForegroundColor Yellow
    Write-Host 'Либо укажите путь:'
    $p = Read-Host '  файл'
    if ($p) { $Files = @($p.Trim('"')) } else { exit 0 }
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
        $dest = Join-Path $item.DirectoryName ($base + '-для-сайта.png')
        Copy-Item -LiteralPath $tmpOut -Destination $dest -Force
        Write-Host ("Готово: " + (Split-Path $dest -Leaf)) -ForegroundColor Green
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
Write-Host 'Файлы с пометкой «-для-сайта» лежат рядом с исходниками.'
Write-Host 'Откройте их и посмотрите на тёмном фоне — если бледно или'
Write-Host 'наоборот сплошное пятно, поменяйте $Gain в начале скрипта.'
Write-Host ''
Read-Host 'Enter чтобы закрыть'
