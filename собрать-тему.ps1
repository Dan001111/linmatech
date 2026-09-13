# Собирает linma-theme.zip для загрузки в WordPress.
#
# Запуск: правой кнопкой по файлу -> «Выполнить с помощью PowerShell».
# Готовый архив появится рядом, в папке сайта.
#
# Почему нельзя просто «Отправить -> Сжатая ZIP-папка» и почему здесь
# не используется стандартный CreateFromDirectory:
#
# 1) Внутри ZIP пути должны разделяться прямым слешем — так написано
#    в спецификации формата. .NET на Windows пишет обратный: получается
#    «linma-theme\style.css». Проводник такой архив открывает нормально,
#    а WordPress — нет.
#
# 2) Имена файлов должны быть записаны в UTF-8. По умолчанию .NET берёт
#    системную кодировку Windows, и русские названия («УСТАНОВКА.md»)
#    превращаются в набор байтов, который PHP прочитать не может. При
#    распаковке такие файлы раскладываются не туда, папка темы теряется,
#    и установка обрывается сообщением «В теме отсутствует таблица
#    стилей style.css» — хотя сам файл в архиве есть.
#
# Поэтому имена записей здесь собираются вручную, а кодировка задаётся
# явно при создании архива.

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$theme = Join-Path $PSScriptRoot 'linma-theme'
# Имя архива каждый раз новое — с датой и временем сборки.
#
# Это не украшение. WordPress распаковывает загруженную тему во временную
# папку wp-content/upgrade/<имя архива> и после установки обязан её удалить.
# На хостинге это удаление однажды не сработало: там застряла папка
# upgrade/linma-theme-1, и с тех пор каждая новая загрузка файла с тем же
# именем натыкалась на старый остаток — WordPress сообщал «в теме
# отсутствует таблица стилей style.css», хотя архив был исправен.
# С новым именем архив распаковывается в чистую папку.
#
# Старые сборки из папки сайта удаляем, чтобы не загрузить случайно их.
Get-ChildItem $PSScriptRoot -Filter 'linma-theme*.zip' -File -ErrorAction SilentlyContinue | Remove-Item -Force
$zip   = Join-Path $PSScriptRoot ('linma-theme-' + (Get-Date -Format 'yyyy-MM-dd-HHmm') + '.zip')

if (-not (Test-Path $theme)) {
    Write-Host 'Папка linma-theme не найдена. Положите этот файл рядом с ней.' -ForegroundColor Red
    Read-Host 'Enter чтобы закрыть'
    exit 1
}

if (Test-Path $zip) { Remove-Item $zip -Force }

$fs      = [IO.File]::Open($zip, [IO.FileMode]::CreateNew)
$archive = New-Object IO.Compression.ZipArchive(
    $fs,
    [IO.Compression.ZipArchiveMode]::Create,
    $false,
    [Text.Encoding]::UTF8
)

# Сначала записи о папках — с косой чертой на конце и нулевой длиной.
# Обычные архиваторы их создают, и некоторые распаковщики по ним
# определяют структуру. Без них архив формально верен, но выглядит
# непривычно, а WordPress на одном из хостингов такую тему не принял.
$dirs = New-Object 'System.Collections.Generic.List[string]'
$dirs.Add('linma-theme/')
Get-ChildItem $theme -Recurse -Directory | ForEach-Object {
    $rel = $_.FullName.Substring($theme.Length).TrimStart('\')
    $dirs.Add('linma-theme/' + ($rel -replace '\\', '/') + '/')
}
foreach ($d in ($dirs | Sort-Object -Unique)) {
    [void]$archive.CreateEntry($d)
}

# Что в архив не кладём.
#
# Сканы и PDF сертификатов занимали 17 МБ из 27 и нужны были ровно один
# раз — для переноса сертификатов в админку. После переноса они лежат
# в медиатеке сайта, а копии в теме только раздували архив: на 25 МБ
# загрузка срывалась через раз, и WordPress сообщал, что в теме нет
# style.css — на самом деле просто не долетала часть файла.
#
# Оригиналы никуда не делись: они в папке сайта на компьютере и в
# репозитории. Если перенос когда-нибудь понадобится повторить (например,
# после переустановки WordPress на боевом домене) — скопируйте эти две
# папки в тему через файловый менеджер, нажмите кнопку переноса, потом
# удалите.
#
# Логотипы брендов оставлены: они весят 0,2 МБ, а перенос брендов может
# ещё не быть сделан.
$skip = @(
    'assets\docs\certificates',
    'assets\img\certificates'
)

$count = 0
$skipped = 0
Get-ChildItem $theme -Recurse -File | Where-Object {
    $rel = $_.FullName.Substring($theme.Length).TrimStart('\')
    $hit = $false
    foreach ($s in $skip) { if ($rel.StartsWith($s + '\')) { $hit = $true; break } }
    if ($hit) { $script:skipped++ }
    -not $hit
} | ForEach-Object {
    $rel  = $_.FullName.Substring($theme.Length).TrimStart('\')
    $name = 'linma-theme/' + ($rel -replace '\\', '/')

    $entry  = $archive.CreateEntry($name, [IO.Compression.CompressionLevel]::Optimal)
    $dest   = $entry.Open()
    $source = [IO.File]::OpenRead($_.FullName)
    $source.CopyTo($dest)
    $source.Close()
    $dest.Close()
    $count++
}

$archive.Dispose()
$fs.Close()

# Проверяем ровно то, на что смотрит WordPress при установке.
$check = [IO.Compression.ZipFile]::OpenRead($zip)
$names = $check.Entries | ForEach-Object { $_.FullName }
$check.Dispose()

$bad  = ($names | Where-Object { $_ -match '\\' }).Count
$ok   = $names -contains 'linma-theme/style.css'
$size = [math]::Round((Get-Item $zip).Length / 1MB, 1)

# Все ли записи лежат внутри одной папки. Если хоть одна окажется рядом
# с ней, WordPress сочтёт, что темы в архиве нет. Сама запись о корневой
# папке «linma-theme/» при этом законна.
$stray = ($names | Where-Object { $_ -notlike 'linma-theme/*' -and $_ -ne 'linma-theme/' }).Count

Write-Host ''
if ($stray -gt 0) {
    Write-Host "Архив собран неправильно: $stray записей вне папки темы." -ForegroundColor Red
    Read-Host 'Enter чтобы закрыть'
    exit 1
}
if ($ok -and $bad -eq 0) {
    Write-Host "Готово: $count файлов, $size МБ." -ForegroundColor Green
    if ($skipped -gt 0) {
        Write-Host "Не вошли сканы и PDF сертификатов ($skipped файлов) — они уже в медиатеке сайта." -ForegroundColor DarkGray
    }
    Write-Host 'Архив можно загружать: Внешний вид -> Темы -> Добавить новую -> Загрузить тему.'
} else {
    Write-Host 'Архив собран неправильно:' -ForegroundColor Red
    if (-not $ok)    { Write-Host '  style.css не на своём месте' }
    if ($bad -gt 0)  { Write-Host "  записей с обратным слешем: $bad" }
}

Write-Host ''
Read-Host 'Enter чтобы закрыть'
