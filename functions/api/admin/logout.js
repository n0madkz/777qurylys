export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "Set-Cookie": "admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict"
    }
  });
}
