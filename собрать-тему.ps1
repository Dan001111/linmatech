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
$zip   = Join-Path $PSScriptRoot 'linma-theme.zip'

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

$count = 0
Get-ChildItem $theme -Recurse -File | ForEach-Object {
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
# с ней, WordPress сочтёт, что темы в архиве нет.
$stray = ($names | Where-Object { $_ -notlike 'linma-theme/*' }).Count

Write-Host ''
if ($stray -gt 0) {
    Write-Host "Архив собран неправильно: $stray записей вне папки темы." -ForegroundColor Red
    Read-Host 'Enter чтобы закрыть'
    exit 1
}
if ($ok -and $bad -eq 0) {
    Write-Host "Готово: $count файлов, $size МБ." -ForegroundColor Green
    Write-Host 'Архив можно загружать: Внешний вид -> Темы -> Добавить новую -> Загрузить тему.'
} else {
    Write-Host 'Архив собран неправильно:' -ForegroundColor Red
    if (-not $ok)    { Write-Host '  style.css не на своём месте' }
    if ($bad -gt 0)  { Write-Host "  записей с обратным слешем: $bad" }
}

Write-Host ''
Read-Host 'Enter чтобы закрыть'
