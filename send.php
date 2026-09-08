<?php
/* ==========================================================================
   Обработчик формы заявки.

   ЧТО НАСТРОИТЬ ПЕРЕД ЗАПУСКОМ — три строки ниже:
     $RECIPIENTS — на какие адреса приходят заявки (можно несколько).
     $FROM       — адрес отправителя. Домен должен совпадать с доменом сайта,
                   иначе письма будут уходить в спам.
     $SITE_NAME  — как подписывается отправитель в почтовом клиенте.

   Файл кладётся в корень сайта рядом с index.html. Требуется PHP 7.0+
   и работающая функция mail() на хостинге.

   Если письма не доходят, самая частая причина — хостинг не отдаёт почту
   через mail(). В этом случае надёжнее подключить SMTP (PHPMailer) или
   внешний сервис форм: в assets/js/main.js достаточно поменять
   константу FORM_ENDPOINT на его URL.
   ========================================================================== */

$RECIPIENTS = ['info@linmatech.ru'];
$FROM       = 'noreply@linmatech.ru';
$SITE_NAME  = 'Linma Electronics';

/* ------------------------------------------------------------------------ */

header('Content-Type: application/json; charset=utf-8');

function fail(string $message, int $code = 400): void
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('Метод не поддерживается', 405);
}

function field(string $key, int $max = 500): string
{
    $value = $_POST[$key] ?? '';
    if (!is_string($value)) {
        return '';
    }
    $value = trim($value);
    // Переводы строк в заголовках письма — вектор для инъекции, вырезаем.
    $value = str_replace(["\r", "\n", "%0a", "%0d"], ' ', $value);
    return mb_substr($value, 0, $max);
}

// Ловушка для ботов: поле скрыто от людей, заполнено — значит это бот.
if (field('website') !== '') {
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

$name    = field('name', 200);
$company = field('company', 200);
$phone   = field('phone', 60);
$email   = field('email', 200);
$topic   = field('topic', 120);
$page    = field('page', 200);
$message = mb_substr(trim((string)($_POST['message'] ?? '')), 0, 5000);
$consent = isset($_POST['consent']);

if ($name === '') {
    fail('Укажите имя');
}
if ($phone === '' && $email === '') {
    fail('Оставьте телефон или e-mail');
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail('Некорректный адрес электронной почты');
}
if (!$consent) {
    fail('Требуется согласие на обработку персональных данных');
}

$lines = [
    'Имя:        ' . $name,
    'Компания:   ' . ($company !== '' ? $company : '—'),
    'Телефон:    ' . ($phone !== '' ? $phone : '—'),
    'E-mail:     ' . ($email !== '' ? $email : '—'),
    'Направление:' . ' ' . ($topic !== '' ? $topic : '—'),
    '',
    'Сообщение:',
    $message !== '' ? $message : '—',
    '',
    str_repeat('-', 48),
    'Страница:   ' . ($page !== '' ? $page : '—'),
    'Отправлено: ' . date('d.m.Y H:i:s'),
    'IP:         ' . ($_SERVER['REMOTE_ADDR'] ?? '—'),
];

$body    = implode("\n", $lines);
$subject = 'Заявка с сайта' . ($topic !== '' ? ' — ' . $topic : '');

$headers = [
    'From: ' . sprintf('=?UTF-8?B?%s?=', base64_encode($SITE_NAME)) . ' <' . $FROM . '>',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'MIME-Version: 1.0',
];

if ($email !== '') {
    $headers[] = 'Reply-To: ' . $email;
}

$encodedSubject = sprintf('=?UTF-8?B?%s?=', base64_encode($subject));

$sent = false;
foreach ($RECIPIENTS as $to) {
    if (mail($to, $encodedSubject, $body, implode("\r\n", $headers))) {
        $sent = true;
    }
}

if (!$sent) {
    fail('Не удалось отправить письмо', 500);
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
