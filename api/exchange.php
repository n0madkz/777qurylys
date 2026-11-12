<?php
declare(strict_types=1);

// Dedicated CommerceML transport. No admin session or admin password is used.
function exchange_reply(string $text, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    echo $text . "\n"; exit;
}
function exchange_cookie_valid(string $cookie, string $secret): bool {
    $parts = explode('.', $cookie);
    return count($parts) === 3 && ctype_digit($parts[0]) && (int)$parts[0] >= time()
        && (int)$parts[0] <= time() + 7200 && preg_match('/^[a-f0-9]{32}$/D', $parts[1])
        && hash_equals(hash_hmac('sha256', $parts[0] . '.' . $parts[1], $secret), $parts[2]);
}
function exchange_filename(string $name): string {
    if (!in_array($name, ['import.xml', 'offers.xml'], true)) throw new ApiError('Поддерживаются только import.xml и offers.xml. Отключите фото и разбиение по каталогам.', 400);
    return $name;
}
function exchange_run(): never {
    try {
        if (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] === 'off') throw new ApiError('Требуется HTTPS', 400);
        $user = config_value('ONEC_EXCHANGE_USER'); $secret = config_value('ONEC_EXCHANGE_PASSWORD');
        if ($user === '' || strlen($secret) < 24) throw new ApiError('Обмен 1С ещё не настроен на сервере', 503);
        if (($_GET['type'] ?? '') !== 'catalog') throw new ApiError('Разрешён только обмен каталогом. Отключите заказы.', 400);
        $mode = (string)($_GET['mode'] ?? '');
        if ($mode === 'checkauth') {
            $login = (string)($_SERVER['PHP_AUTH_USER'] ?? ''); $password = (string)($_SERVER['PHP_AUTH_PW'] ?? '');
            $authorization = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
            if (str_starts_with($authorization, 'Basic ')) {
                $pair = explode(':', base64_decode(substr($authorization, 6), true) ?: '', 2);
                $login = $pair[0]; $password = $pair[1] ?? '';
            }
            if (!hash_equals($user, $login) || !hash_equals($secret, $password)) {
                header('WWW-Authenticate: Basic realm="1C catalog exchange"');
                throw new ApiError('Неверный логин или пароль обмена', 401);
            }
            $payload = (time() + 7200) . '.' . bin2hex(random_bytes(16));
            $cookie = $payload . '.' . hash_hmac('sha256', $payload, $secret);
            setcookie('qurylys_exchange', $cookie, ['path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
            exchange_reply("success\nqurylys_exchange\n" . $cookie . "\nsessid=" . hash('sha256', $cookie) . "\n" . time());
        }
        $cookie = (string)($_COOKIE['qurylys_exchange'] ?? '');
        if (!exchange_cookie_valid($cookie, $secret)) throw new ApiError('Повторите авторизацию обмена', 401);
        // One private staging directory per authorized exchange. XML is temporary,
        // never publicly served, and removed after successful completion.
        $base = rtrim(sys_get_temp_dir(), '/\\') . '/777-onec-exchange';
        if (!is_dir($base) && !mkdir($base, 0700, true) && !is_dir($base)) throw new ApiError('Недоступна временная папка обмена', 503);
        // Bounded cleanup of expired sessions; filenames are fixed and never user paths.
        foreach (array_slice(glob($base . '/*', GLOB_ONLYDIR) ?: [], 0, 100) as $old) {
            if (filemtime($old) >= time() - 10800) continue;
            foreach (['import.xml', 'offers.xml', 'state.json', 'lock'] as $file) if (is_file($old . '/' . $file)) @unlink($old . '/' . $file);
            @rmdir($old);
        }
        $dir = $base . '/' . hash('sha256', $cookie);
        if (!is_dir($dir) && !mkdir($dir, 0700) && !is_dir($dir)) throw new ApiError('Не удалось создать папку обмена', 503);
        $lock = fopen($dir . '/lock', 'c');
        if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) throw new ApiError('Предыдущий шаг ещё выполняется', 409);
        if ($mode === 'init') {
            foreach (['import.xml', 'offers.xml', 'state.json'] as $file) if (is_file($dir . '/' . $file)) unlink($dir . '/' . $file);
            exchange_reply("zip=no\nfile_limit=524288\nsessid=" . hash('sha256', $cookie) . "\nversion=2.08");
        }
        // Website publication is curated manually; never deactivate products
        // simply because they were absent from a filtered 1C export.
        if ($mode === 'deactivate' || $mode === 'complete') exchange_reply('success');
        $filename = exchange_filename((string)($_GET['filename'] ?? ''));
        $path = $dir . '/' . $filename;
        if ($mode === 'file') {
            require_method('POST');
            $bytes = file_get_contents('php://input', false, null, 0, 524289);
            clearstatcache(true, $path);
            if ($bytes === false || strlen($bytes) > 524288 || (is_file($path) ? filesize($path) : 0) + strlen($bytes) > 20 * 1024 * 1024) throw new ApiError('Превышен размер XML', 413);
            if (file_put_contents($path, $bytes, FILE_APPEND | LOCK_EX) !== strlen($bytes)) throw new ApiError('Не удалось записать файл', 503);
            chmod($path, 0600);
            exchange_reply('success');
        }
        if ($mode !== 'import') throw new ApiError('Неизвестный режим обмена', 400);
        $stateFile = $dir . '/state.json';
        $state = is_file($stateFile) ? json_decode(file_get_contents($stateFile), true) : [];
        if (!is_array($state)) throw new ApiError('Повторите обмен: повреждён прогресс', 500);
        if ($filename === 'import.xml') {
            if (!is_file($path)) throw new ApiError('Каталог не передан', 400);
            commerce_xml(file_get_contents($path));
            exchange_reply("success\nКаталог принят. Ожидаются остатки.");
        }
        if (!empty($state['done'])) exchange_reply('success');
        if (!is_file($dir . '/import.xml') || !is_file($dir . '/offers.xml')) throw new ApiError('Нужна полная выгрузка товаров и предложений в одном обмене', 400);
        $result = commerce_import(['catalogXml' => file_get_contents($dir . '/import.xml'), 'offersXml' => file_get_contents($dir . '/offers.xml')], (int)($state['next'] ?? 0), 25);
        $done = $result['next'] >= $result['total'];
        $nextState = ['next' => $result['next'], 'total' => $result['total'], 'done' => $done];
        if (file_put_contents($stateFile, json_encode($nextState), LOCK_EX) === false) throw new ApiError('Не удалось сохранить прогресс', 503);
        chmod($stateFile, 0600);
        if ($done) {
            unlink($dir . '/import.xml'); unlink($dir . '/offers.xml');
            exchange_reply("success\nОбновлено товаров: " . $result['total']);
        }
        exchange_reply("progress\nОбработано " . $result['next'] . ' из ' . $result['total']);
    } catch (ApiError $error) {
        exchange_reply("failure\n" . $error->getMessage(), $error->httpStatus);
    } catch (Throwable $error) {
        // Do not echo/log credentials, uploaded XML, or raw database errors.
        exchange_reply("failure\nОшибка обработки обмена. Повторите полную выгрузку.", 500);
    }
}
