// Portfolio contact form -> Telegram bot.
// Needs two environment variables in Netlify (scope: Functions):
//   TELEGRAM_BOT_TOKEN  — token from @BotFather
//   TELEGRAM_CHAT_ID    — your Telegram user id (who receives the messages)

const esc = (s) =>
  String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export default async (req, context) => {
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);

  let data;
  try {
    data = await req.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  // Honeypot: real visitors never fill this hidden field.
  if (data.website) return json({ ok: true });

  const name = String(data.name ?? "").trim().slice(0, 100);
  const contact = String(data.contact ?? "").trim().slice(0, 120);
  const message = String(data.message ?? "").trim().slice(0, 2000);
  const lang = ["uz", "ru", "en"].includes(data.lang) ? data.lang : "uz";

  if (!name || !contact) return json({ ok: false, error: "missing_fields" }, 400);

  const token = Netlify.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Netlify.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) return json({ ok: false, error: "not_configured" }, 500);

  const city = context.geo?.city ? `${context.geo.city}, ${context.geo.country?.name ?? ""}` : "";
  const time = new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" });

  const text =
    `📩 <b>Portfolio saytidan yangi xabar</b>\n\n` +
    `👤 <b>Ism:</b> ${esc(name)}\n` +
    `📞 <b>Aloqa:</b> ${esc(contact)}\n` +
    (message ? `💬 <b>Xabar:</b>\n${esc(message)}\n` : "") +
    `\n🌐 Til: ${lang.toUpperCase()}` +
    (city ? ` · 📍 ${esc(city)}` : "") +
    `\n🕒 ${time}`;

  const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });

  if (!tg.ok) {
    let detail = "";
    try { detail = (await tg.json()).description || ""; } catch {}
    console.error("Telegram error", tg.status, detail);
    return json({ ok: false, error: "telegram", status: tg.status, detail }, 502);
  }
  return json({ ok: true });
};

export const config = {
  path: "/api/contact",
  method: "POST",
  rateLimit: { action: "rate_limit", aggregateBy: ["ip", "domain"], windowSize: 60, windowLimit: 5 },
};
