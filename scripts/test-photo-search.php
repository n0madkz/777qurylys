<?php
require __DIR__ . '/../api/_bootstrap.php';
require __DIR__ . '/../api/photo-search.php';
foreach (['http://example.com/a.jpg', 'file:///tmp/a', 'https://u:p@example.com/a', 'https://example.com:8443/a', "https://example.com/\n"] as $url) {
    if (photo_public_url($url)) throw new Exception('Unsafe URL accepted');
}
if (!photo_public_url('https://example.com/photo.jpg?a=1')) throw new Exception('Valid HTTPS rejected');
putenv('BRAVE_SEARCH_API_KEY=');
try { photo_search('Test product'); throw new Exception('Missing configuration accepted'); }
catch (ApiError $error) { if ($error->httpStatus !== 503) throw $error; }
try { photo_download(['url'=>'http://127.0.0.1/a']); throw new Exception('Unsigned URL accepted'); }
catch (ApiError $error) { if ($error->httpStatus !== 400) throw $error; }
putenv('SUPABASE_SERVICE_ROLE_KEY=test-signing-key');
$expires = time() + 60;
$signature = photo_signature('https://example.com/photo.jpg', $expires);
if (hash_equals($signature, photo_signature('https://example.com/other.jpg', $expires))) throw new Exception('Signature not bound to image');
try { photo_download(['url'=>'https://example.com/photo.jpg','expires'=>$expires,'signature'=>'invalid']); throw new Exception('Invalid signature accepted'); }
catch (ApiError $error) { if ($error->httpStatus !== 400) throw $error; }
echo "PASS: URL scheme, credentials and port restrictions; missing API key; signed image selection\n";
