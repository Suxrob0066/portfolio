// Cloudflare Pages Function: GET/POST /api/eye -> page view counter
// Needs a KV namespace bound as VIEWS (Settings > Bindings > KV namespace).
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

async function read(env) { return parseInt((await env.VIEWS.get("total")) || "0", 10) || 0; }

export async function onRequestGet({ env }) {
  if (!env.VIEWS) return json({ views: null }, 500);
  return json({ views: await read(env) });
}

export async function onRequestPost({ env }) {
  if (!env.VIEWS) return json({ views: null }, 500);
  const n = (await read(env)) + 1;
  await env.VIEWS.put("total", String(n));
  return json({ views: n });
}
