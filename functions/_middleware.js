const encoder = new TextEncoder();
const encode = value => btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

async function sign(secret, value) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return encode(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function valid(cookie, env) {
  if (!cookie || !env.ADMIN_SESSION_SECRET || !env.ADMIN_USER) return false;
  const parts = cookie.split(".");
  if (parts.length !== 3) return false;
  const [user, expires, signature] = parts;
  if (user !== env.ADMIN_USER || Number(expires) < Date.now()) return false;
  return signature === await sign(env.ADMIN_SESSION_SECRET, `${user}.${expires}`);
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  // Only the admin document and API need an authenticated session.  Keep the
  // static assets public so that the browser can load styles and scripts
  // normally, rather than being redirected to the login page for a .js/.css
  // request.
  const publicPaths = [
    "/admin-login", "/admin-login.html", "/admin-login.js", "/admin.css",
    "/admin.js", "/admin-requests.css", "/admin-categories.css", "/primary-logo.css",
    "/api/admin/login"
  ];
  const protectedPath = url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/admin");
  if (publicPaths.includes(url.pathname) || !protectedPath) return context.next();
  const cookies = context.request.headers.get("Cookie") || "";
  const session = cookies.split(";").map(x => x.trim()).find(x => x.startsWith("admin_session="))?.split("=")[1];
  if (await valid(session, context.env)) return context.next();
  if (url.pathname.startsWith("/api/")) return new Response("Unauthorized", { status: 401 });
  return Response.redirect(new URL("/admin-login", url), 302);
}
