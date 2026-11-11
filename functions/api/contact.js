// Cloudflare Pages Function: POST /api/contact -> Telegram bot
// Env (Settings > Variables and Secrets): TELEGRAM_BOT_TOKEN (secret), TELEGRAM_CHAT_ID
const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export async function onRequestPost({ request, env }) {
  let data;
  try { data = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  if (data.website) return json({ ok: true }); // honeypot

  const name = String(data.name ?? "").trim().slice(0, 100);
  const contact = String(data.contact ?? "").trim().slice(0, 120);
  const message = String(data.message ?? "").trim().slice(0, 2000);
  const lang = ["uz", "ru", "en"].includes(data.lang) ? data.lang : "uz";
  if (!name || !contact) return json({ ok: false, error: "missing_fields" }, 400);

  const token = env.TELEGRAM_BOT_TOKEN, chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return json({ ok: false, error: "not_configured" }, 500);

  const cf = request.cf || {};
  const city = cf.city ? `${cf.city}, ${cf.country ?? ""}` : "";
  const time = new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" });
  const text =
    `📩 <b>Portfolio saytidan yangi xabar</b>\n\n` +
    `👤 <b>Ism:</b> ${esc(name)}\n` +
    `📞 <b>Aloqa:</b> ${esc(contact)}\n` +
    (message ? `💬 <b>Xabar:</b>\n${esc(message)}\n` : "") +
    `\n🌐 Til: ${lang.toUpperCase()}` + (city ? ` · 📍 ${esc(city)}` : "") + `\n🕒 ${time}`;

  const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (!tg.ok) {
    let detail = ""; try { detail = (await tg.json()).description || ""; } catch {}
    return json({ ok: false, error: "telegram", status: tg.status, detail }, 502);
  }
  return json({ ok: true });
}
